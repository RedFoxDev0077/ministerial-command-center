/**
 * OcrService — Ministerial Command Center
 * =========================================
 * Multi-layer OCR pipeline for extracting text from uploaded documents.
 *
 * SUPPORTED FORMATS:
 *   PDF  → pdf-parse (text layer) → OpenAI Vision via pdftoppm (scanned) → Tesseract.js (offline fallback)
 *   Image→ Tesseract.js → OpenAI Vision fallback
 *   DOCX → mammoth (raw text extraction)
 *   TXT  → direct UTF-8 read
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ROOT CAUSE ANALYSIS — THE "-- 1 of 2 --" BUG
 * ─────────────────────────────────────────────────────────────────────────────
 * pdf-parse inserts page separator markers like "-- 1 of 2 --" between pages.
 * For SCANNED PDFs (image-only, no embedded text layer) these markers are the
 * ONLY output because there is no text to extract.
 *
 * Bug scenario 1 — Old code stored raw output (pre-fix):
 *   The original code stored raw pdf-parse output directly without checking
 *   for page markers. Stored result: "<p>-- 1 of 2 --</p><p>-- 2 of 2 --</p>"
 *
 * Bug scenario 2 — Mixed-content PDFs (embedded image + thin text layer):
 *   PDFs with minimal embedded text alongside scanned pages would fail
 *   isPageSeparatorOnly() (returns false because there IS some text beyond
 *   markers). The page markers then leaked into the stored content.
 *   Fix: cleanExtractedText() now strips ALL page marker lines via regex.
 *
 * Bug scenario 3 — Low text density:
 *   Some PDFs have metadata/title text only (a few hundred chars) in a very
 *   large file. isPageSeparatorOnly() returns false, but the "text" is garbage.
 *   Fix: Added text density check (textDensity < 0.008 = 0.8%) to force the
 *   OpenAI Vision path for suspiciously sparse text in large files.
 *
 * NETWORK / API CONSIDERATIONS:
 *   - OpenAI Vision API: POST https://api.openai.com/v1/chat/completions
 *     Each page image is sent as base64-encoded PNG (data URI).
 *     Timeout risk: Large/complex pages may take 10–30 seconds per page.
 *     Rate limit risk: 429 errors on concurrent uploads. Handled with retry.
 *     Token limit: max_tokens=4000 per page; increase if documents are dense.
 *   - pdftoppm: Local process, spawned as child_process. No network call.
 *     Resolution 200 DPI is optimal for OCR (150=fast/lower accuracy, 300=slow).
 *   - Tesseract.js: Local WASM worker, no network call.
 *     Language pack: 'spa+fra+eng' covers Equatorial Guinea's official languages.
 *   - All temp files are cleaned up in finally blocks to prevent disk leaks.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createWorker } from 'tesseract.js';
import OpenAI from 'openai';
import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';
import { TextFormatterService } from './text-formatter.service';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ─── Return type ─────────────────────────────────────────────────────────────
export interface OcrResult {
  text: string;
  /** Which engine ultimately produced the text */
  method: 'pdf-parse' | 'tesseract' | 'openai-vision' | 'mammoth';
  /** 0-100 confidence score (available from Tesseract; estimated for other engines) */
  confidence?: number;
  /** Detected/assumed language of the document */
  language?: string;
  /** Number of pages processed (PDF only) */
  pageCount?: number;
  /** True when OCR fell back from the primary engine */
  usedFallback?: boolean;
}

// ─── Internal text quality report ────────────────────────────────────────────
interface TextQualityReport {
  /** 0-100 quality score */
  score: number;
  /** True when the text looks like garbled OCR output */
  isGarbled: boolean;
  /** True when text is suspiciously short in absolute characters (<30) */
  tooShort: boolean;
  /** True when text density is < 0.8% of file size (likely scanned) */
  tooSparse: boolean;
  /** Character-level text density: text.length / file.size */
  density: number;
  reasons: string[];
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private openai: OpenAI | null = null;
  private enableAI: boolean;

  constructor(
    private configService: ConfigService,
    private textFormatterService: TextFormatterService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.enableAI = this.configService.get<boolean>('ENABLE_AI_FEATURES', false);

    if (apiKey && this.enableAI) {
      this.openai = new OpenAI({
        apiKey,
        // Network: increase default timeout for large government documents (default 10s is too short)
        timeout: 60_000, // 60 seconds per API request
        maxRetries: 2,   // Built-in retry for transient 500/503 errors
      });
      this.logger.log('OpenAI integration enabled for advanced OCR (timeout: 60s, maxRetries: 2)');
    } else {
      this.logger.log('OpenAI not configured — using offline OCR only (pdf-parse + Tesseract.js)');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC ENTRY POINT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Main extraction entry point. Dispatches to the correct engine based on MIME type.
   * Logs total wall-clock time for every extraction attempt.
   */
  async extractText(file: Express.Multer.File): Promise<OcrResult> {
    const mimeType = file.mimetype.toLowerCase();
    const startTime = Date.now();

    this.logger.log(
      `[OCR START] file="${file.originalname}" size=${file.size}B mime="${mimeType}"`,
    );

    try {
      let result: OcrResult;

      if (mimeType === 'application/pdf') {
        result = await this.extractFromPdf(file);
      } else if (mimeType.startsWith('image/')) {
        result = await this.extractFromImage(file);
      } else if (mimeType === 'text/plain') {
        result = this.extractFromPlainText(file);
      } else if (
        mimeType.includes('word') ||
        mimeType.includes('document') ||
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/msword'
      ) {
        result = await this.extractFromDocx(file);
      } else {
        this.logger.warn(`[OCR SKIP] Unsupported MIME type: ${mimeType}`);
        result = { text: '', method: 'pdf-parse' };
      }

      const elapsed = Date.now() - startTime;
      this.logger.log(
        `[OCR DONE] method="${result.method}" chars=${result.text.length} ` +
        `pages=${result.pageCount ?? '-'} fallback=${result.usedFallback ?? false} ` +
        `elapsed=${elapsed}ms`,
      );
      return result;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      this.logger.error(`[OCR FAIL] ${error.message} (elapsed: ${elapsed}ms)`);
      throw new Error(`Failed to extract text: ${error.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEXT CLEANING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Normalise raw OCR/parsed text into clean plain text.
   *
   * Cleaning steps (in order):
   *  1. Strip HTML tags inserted by some OCR engines (mammoth, older openai responses)
   *  2. Decode HTML entities (&nbsp; &lt; etc.)
   *  3. Convert form-feed \f characters to newlines (PDF page breaks)
   *  4. *** STRIP pdf-parse page markers ("-- 1 of 2 --") ***
   *     This was the primary source of the content pollution bug.
   *     These markers appear in EVERY pdf-parse output between pages.
   *     For scanned PDFs they are the ONLY output.
   *  5. Collapse excessive horizontal whitespace
   *  6. Trim trailing spaces from each line
   *  7. Collapse 3+ consecutive blank lines to 2
   *  8. Normalise line endings to \n
   */
  private cleanExtractedText(text: string): string {
    if (!text) return '';

    // Step 1 — Strip HTML tags
    let cleaned = text
      .replace(/<br\s*\/?>/gi, '\n')   // <br> → newline
      .replace(/<\/p>/gi, '\n')         // </p> → newline
      .replace(/<[^>]+>/g, '');         // remove all remaining tags

    // Step 2 — Decode HTML entities
    cleaned = cleaned
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Step 3 — Form-feed (PDF page break character) → newline
    cleaned = cleaned.replace(/\f/g, '\n');

    // Step 4 — CRITICAL FIX: Remove pdf-parse page separator markers.
    //   Pattern: "-- 1 of 2 --", "--- 3 de 5 ---" (Spanish/English, 1-3 dashes each side)
    //   Flag 'gm' = global + multiline so ^ and $ match each line start/end.
    //   Without this fix, markers appear verbatim in the stored document content.
    cleaned = cleaned.replace(/^-{1,3}\s*\d+\s*(of|de)\s*\d+\s*-{1,3}\s*$/gm, '');

    // Step 5 — Collapse excessive horizontal whitespace (3+ spaces/tabs → 2 spaces)
    cleaned = cleaned.replace(/[ \t]{3,}/g, '  ');

    // Step 6 — Trim trailing whitespace from every line
    cleaned = cleaned.split('\n').map(line => line.trimEnd()).join('\n');

    // Step 7 — Collapse 3+ consecutive blank lines to 2
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // Step 8 — Normalise line endings and trim overall
    cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

    return cleaned;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEXT QUALITY ASSESSMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Assess the quality of extracted text to decide whether to fall back to
   * a more powerful OCR engine.
   *
   * Heuristics:
   *  - density < 0.8% of file size → suspiciously sparse (likely scanned)
   *  - high ratio of non-printable / non-Latin chars → likely garbled
   *  - very short absolute length → not useful
   *  - presence of repeated garbage patterns (common in bad OCR)
   */
  private assessTextQuality(text: string, fileSize: number): TextQualityReport {
    const reasons: string[] = [];
    const density = text.length / fileSize;

    // Density check: a real text PDF has at minimum ~100 chars/KB
    const tooSparse = fileSize > 30_000 && density < 0.008;
    if (tooSparse) reasons.push(`low density (${(density * 100).toFixed(3)}%)`);

    // Absolute length check
    const tooShort = text.length < 30;
    if (tooShort) reasons.push(`very short (${text.length} chars)`);

    // Garbled text heuristic: high proportion of replacement chars or control chars
    const nonPrintable = (text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFD]/g) || []).length;
    const garbledRatio = nonPrintable / Math.max(text.length, 1);
    const isGarbled = garbledRatio > 0.05; // >5% replacement / control chars
    if (isGarbled) reasons.push(`garbled chars (${(garbledRatio * 100).toFixed(1)}%)`);

    // Score: start at 100, deduct for each issue
    let score = 100;
    if (tooSparse) score -= 40;
    if (tooShort)  score -= 30;
    if (isGarbled) score -= 30;

    return {
      score: Math.max(0, score),
      isGarbled,
      tooShort,
      tooSparse: tooSparse,
      density,
      reasons,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCANNED PDF DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Returns true when all non-empty lines in the text are pdf-parse page markers.
   *
   * pdf-parse outputs "-- N of M --" (English) or "-- N de M --" (Spanish) as
   * the SOLE content for scanned PDFs that have no embedded text layer.
   *
   * Examples that return true:
   *   "\n\n-- 1 of 2 --\n\n\n-- 2 of 2 --\n\n"  → true  (pure scanned)
   *   "-- 1 of 1 --"                              → true  (single page scanned)
   *   ""                                          → true  (empty)
   *
   * Examples that return false:
   *   "Ministerio de...\n-- 1 of 3 --\n..."       → false (has real text too)
   *
   * NOTE: The false case is handled by the text-density check + marker stripping.
   */
  private isPageSeparatorOnly(text: string): boolean {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return true;
    // Pattern allows 1-3 dashes, optional spaces, page number, "of"/"de", total pages
    return lines.every(line => /^-{1,3}\s*\d+\s*(of|de)\s*\d+\s*-{1,3}$/.test(line));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PDF EXTRACTION (primary pipeline)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * PDF extraction pipeline — 3-level cascade:
   *
   *  LEVEL 1 — pdf-parse (fast, local, works only for text-layer PDFs)
   *    → If raw text passes quality checks: return immediately.
   *    → Decision gates:
   *        a) isPageSeparatorOnly() — pure scanned PDF, skip to Level 2.
   *        b) text density < 0.8% — thin/mixed scanned PDF, skip to Level 2.
   *        c) quality score too low — garbled text, skip to Level 2.
   *
   *  LEVEL 2 — OpenAI Vision via pdftoppm (network call, handles scanned PDFs)
   *    → pdftoppm converts each PDF page to a 200-DPI PNG image (local process).
   *    → Each PNG is sent to OpenAI GPT-4o Vision API as base64 data URI.
   *    → Network: POST api.openai.com/v1/chat/completions (~5-20s per page)
   *    → If a page fails OpenAI Vision → falls back to Tesseract (Level 3).
   *    → If ALL pages fail → throws error, caught by outer try-catch.
   *
   *  LEVEL 3 — Tesseract.js (offline WASM, per-page fallback inside Level 2)
   *    → Used per page when OpenAI Vision fails (rate limit, network error, etc.)
   *    → Languages: Spanish (spa) + French (fra) + English (eng)
   *      (Equatorial Guinea uses Spanish officially; French is widely spoken)
   *    → Min confidence threshold: 30% (lower than image OCR because page
   *      images from pdftoppm are generally higher quality than raw uploads)
   */
  private async extractFromPdf(file: Express.Multer.File): Promise<OcrResult> {
    const stepTag = `[PDF "${file.originalname}"]`;
    const t0 = Date.now();

    try {
      // ── STEP 1: pdf-parse ────────────────────────────────────────────────
      this.logger.log(`${stepTag} STEP 1: pdf-parse — file size ${file.size}B`);

      // pdf-parse v2 uses class-based API. The 'data' option takes a Buffer.
      // This is an in-process operation (no network). Typical time: <500ms.
      const parser = new PDFParse({ data: file.buffer });
      const parseResult = await parser.getText();
      await parser.destroy(); // release internal resources
      const rawText: string = parseResult.text || '';

      this.logger.log(
        `${stepTag} STEP 1 result: raw=${rawText.length}B ` +
        `elapsed=${Date.now() - t0}ms`,
      );
      this.logger.debug(
        `${stepTag} STEP 1 sample: ${JSON.stringify(rawText.substring(0, 120))}`,
      );

      // ── STEP 2: Scanned PDF detection ───────────────────────────────────
      const pageSepOnly = this.isPageSeparatorOnly(rawText);
      this.logger.log(`${stepTag} STEP 2: isPageSeparatorOnly=${pageSepOnly}`);

      if (rawText.trim().length > 0 && !pageSepOnly) {
        // There is some text beyond page markers — clean it and assess quality
        const cleanedText = this.cleanExtractedText(rawText);
        const quality = this.assessTextQuality(cleanedText, file.size);

        this.logger.log(
          `${stepTag} STEP 2: cleanedText=${cleanedText.length}B ` +
          `quality.score=${quality.score} density=${(quality.density * 100).toFixed(3)}%` +
          (quality.reasons.length ? ` issues=[${quality.reasons.join(', ')}]` : ''),
        );

        if (cleanedText.length > 10 && !quality.tooShort && !quality.tooSparse && !quality.isGarbled) {
          // Text passes all quality gates — use it directly
          this.logger.log(
            `${stepTag} STEP 2: ACCEPTED by pdf-parse (score=${quality.score}, ` +
            `density=${(quality.density * 100).toFixed(2)}%)`,
          );
          return {
            text: cleanedText,
            method: 'pdf-parse',
            confidence: quality.score,
            pageCount: (rawText.match(/-- \d+ of (\d+) --/)?.[1] as any) | 0 || undefined,
          };
        }

        // Quality check failed — log why and fall through to OCR
        this.logger.warn(
          `${stepTag} STEP 2: pdf-parse text REJECTED — ${quality.reasons.join('; ')}. ` +
          `Escalating to OpenAI Vision...`,
        );
      } else if (pageSepOnly) {
        this.logger.warn(
          `${stepTag} STEP 2: Pure scanned PDF detected (raw text = page markers only). ` +
          `Escalating to OpenAI Vision...`,
        );
      } else {
        this.logger.warn(`${stepTag} STEP 2: pdf-parse returned empty text. Escalating...`);
      }

      // ── STEP 3: OpenAI Vision (+ Tesseract fallback) ────────────────────
      this.logger.log(`${stepTag} STEP 3: Starting scanned PDF OCR via pdftoppm + OpenAI Vision`);

      if (this.openai && this.enableAI) {
        return await this.extractScannedPdfWithOpenAI(file);
      }

      // OpenAI not available — try Tesseract directly on the original buffer
      // This only works if the PDF can be rendered by pdftoppm even without OpenAI
      this.logger.warn(
        `${stepTag} STEP 3: OpenAI not available. Attempting Tesseract-only fallback via pdftoppm...`,
      );
      return await this.extractScannedPdfWithTesseractOnly(file);

    } catch (error) {
      // Outer catch: pdf-parse itself threw (corrupted PDF, encryption, etc.)
      this.logger.error(`${stepTag} pdf-parse threw: ${error.message}`);
      this.logger.error(`${stepTag} Stack: ${error.stack}`);

      // Still attempt OpenAI Vision as last resort
      if (this.openai && this.enableAI) {
        this.logger.log(`${stepTag} Attempting OpenAI Vision as error recovery fallback...`);
        try {
          const result = await this.extractScannedPdfWithOpenAI(file);
          return { ...result, usedFallback: true };
        } catch (fallbackErr) {
          this.logger.error(`${stepTag} OpenAI Vision fallback also failed: ${fallbackErr.message}`);
        }
      }

      this.logger.error(`${stepTag} All OCR methods exhausted. Returning empty result.`);
      return { text: '', method: 'pdf-parse', confidence: 0, usedFallback: true };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCANNED PDF → OPENAI VISION (+ PER-PAGE TESSERACT FALLBACK)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Convert a scanned PDF to page images with pdftoppm, then OCR each page
   * using OpenAI Vision. If a page fails OpenAI, falls back to Tesseract.js.
   *
   * NETWORK NOTES:
   *   - pdftoppm: local child process, no network. Spawned via Node child_process.spawn().
   *   - OpenAI API call per page: POST https://api.openai.com/v1/chat/completions
   *       Headers: Authorization: Bearer <key>
   *       Body: { model, messages[{ image_url: { url: "data:image/png;base64,..." } }] }
   *       Average latency: 5–25s depending on page complexity and model load.
   *       Rate limit: RPM (requests per minute) and TPM (tokens per minute).
   *       Error 429 = rate limit exceeded — wait and retry (handled by OpenAI SDK maxRetries).
   *       Error 400 = bad request (e.g. image too large) — logged and page skipped.
   *   - Tesseract.js: WASM worker, no network after initial language pack load.
   *       Language packs are cached in-process on first use.
   */
  private async extractScannedPdfWithOpenAI(file: Express.Multer.File): Promise<OcrResult> {
    const timestamp = Date.now();
    const tmpPdf = `/tmp/ocr_${timestamp}.pdf`;
    const tmpPrefix = `/tmp/ocr_page_${timestamp}`;
    const stepTag = `[ScannedPDF "${file.originalname}"]`;

    try {
      // ── Write PDF to disk (pdftoppm needs a file path, not a buffer) ────
      fs.writeFileSync(tmpPdf, file.buffer);
      this.logger.log(`${stepTag} Wrote temp PDF ${tmpPdf} (${file.size}B)`);

      // ── Run pdftoppm to render each PDF page as a PNG ───────────────────
      // -png : output format
      // -r 200 : 200 DPI resolution (good balance of quality vs. API payload size)
      // At 200 DPI a typical A4 page → ~1654×2339 px PNG ≈ 500KB–2MB base64
      const pdftoppmStart = Date.now();
      await new Promise<void>((resolve, reject) => {
        const proc = spawn('pdftoppm', ['-png', '-r', '200', tmpPdf, tmpPrefix]);
        let stderr = '';
        proc.stderr.on('data', (d) => { stderr += d.toString(); });
        proc.on('close', (code) => {
          const elapsed = Date.now() - pdftoppmStart;
          if (code === 0) {
            this.logger.log(`${stepTag} pdftoppm OK (${elapsed}ms)`);
            resolve();
          } else {
            reject(new Error(`pdftoppm exit ${code}: ${stderr}`));
          }
        });
        proc.on('error', (err) => {
          // This fires when pdftoppm binary is not installed on the system
          reject(new Error(
            `pdftoppm not found on this server. Install with: apt-get install poppler-utils. Error: ${err.message}`
          ));
        });
      });

      // ── Discover generated PNG files ─────────────────────────────────────
      const tmpDir = '/tmp';
      const prefix = path.basename(tmpPrefix);
      const pngFiles = fs.readdirSync(tmpDir)
        .filter(f => f.startsWith(prefix) && f.endsWith('.png'))
        .sort()
        .map(f => path.join(tmpDir, f));

      this.logger.log(`${stepTag} pdftoppm generated ${pngFiles.length} page image(s)`);

      if (pngFiles.length === 0) {
        throw new Error('pdftoppm produced no page images — PDF may be encrypted or corrupt');
      }

      // ── Process each page ────────────────────────────────────────────────
      const pageTexts: string[] = [];

      // Retry config: if OpenAI returns < MIN_PAGE_CHARS, retry with stronger prompt
      const MIN_PAGE_CHARS = 100;
      const MAX_OPENAI_RETRIES = 2;

      for (let i = 0; i < pngFiles.length; i++) {
        const pngPath = pngFiles[i];
        const pageNum = i + 1;
        const pageTag = `${stepTag} [Page ${pageNum}/${pngFiles.length}]`;
        const pageStart = Date.now();

        const imageBuffer = fs.readFileSync(pngPath);
        const imageSizeKB = Math.round(imageBuffer.length / 1024);
        this.logger.log(`${pageTag} Image size: ${imageSizeKB}KB, sending to OpenAI Vision...`);

        // Convert image to base64 data URI for OpenAI API
        // NOTE: OpenAI Vision accepts image_url as a data URI or HTTPS URL.
        // We use data URI (data:image/png;base64,...) to avoid storing images externally.
        const base64Image = imageBuffer.toString('base64');
        const dataUri = `data:image/png;base64,${base64Image}`;

        let pageText = '';
        let pageSource = 'none';

        // ── Attempt OpenAI Vision (with retry) ──────────────────────────
        for (let attempt = 0; attempt <= MAX_OPENAI_RETRIES; attempt++) {
          // Use a more forceful prompt on retries to prevent lazy/summarising responses
          const promptText =
            attempt === 0
              ? 'Extract ALL text from this scanned official government document image. ' +
                'Return ONLY the extracted text, preserving the original structure, ' +
                'paragraph breaks, numbered lists, dates, and reference numbers. ' +
                'This is an official document from the Republic of Equatorial Guinea ' +
                'written in Spanish. Preserve all names, dates, codes, and official ' +
                'language exactly as shown. Do NOT summarise or paraphrase.'
              : 'MANDATORY VERBATIM TRANSCRIPTION: Copy EVERY word visible in this image ' +
                'exactly as it appears, line by line, word by word. Do NOT skip, summarise, ' +
                'or describe. Include ALL names, dates, numbers, headings, and body text. ' +
                'This is a critical official document — completeness is required.';

          try {
            const openAiStart = Date.now();
            const response = await this.openai!.chat.completions.create({
              model: this.configService.get<string>('OPENAI_VISION_MODEL', 'gpt-4o'),
              messages: [{
                role: 'user',
                content: [
                  { type: 'text', text: promptText },
                  // Network: image_url with data URI — image is embedded in the request body
                  { type: 'image_url', image_url: { url: dataUri, detail: 'high' } },
                ],
              }],
              // max_tokens: 4000 covers ~3000 words of Spanish text per page
              // Increase to 8000 if dense pages are truncated
              max_tokens: 4000,
            });

            const openAiElapsed = Date.now() - openAiStart;
            const candidate = response.choices[0]?.message?.content?.trim() || '';
            const tokensUsed = response.usage?.total_tokens ?? 0;

            this.logger.log(
              `${pageTag} OpenAI Vision attempt ${attempt + 1}: ` +
              `${candidate.length} chars, ${tokensUsed} tokens, ${openAiElapsed}ms`,
            );

            if (candidate.length >= MIN_PAGE_CHARS || attempt === MAX_OPENAI_RETRIES) {
              pageText = candidate;
              pageSource = 'openai-vision';
              if (attempt > 0) {
                this.logger.log(`${pageTag} Accepted after retry ${attempt}`);
              }
              break;
            }

            this.logger.warn(
              `${pageTag} OpenAI returned only ${candidate.length} chars ` +
              `(min ${MIN_PAGE_CHARS}) — retrying with stronger prompt...`,
            );
          } catch (openAiErr) {
            // OpenAI-specific error handling
            const errMsg: string = openAiErr.message || String(openAiErr);

            if (errMsg.includes('429') || errMsg.toLowerCase().includes('rate limit')) {
              // Rate limit hit — OpenAI SDK will retry automatically (maxRetries: 2)
              // If we're here it means retries were exhausted
              this.logger.error(`${pageTag} OpenAI rate limit exhausted. Falling back to Tesseract.`);
            } else if (errMsg.includes('400') || errMsg.toLowerCase().includes('invalid')) {
              // Bad request — image may be too large or malformed
              this.logger.error(`${pageTag} OpenAI bad request (image issue?): ${errMsg}`);
            } else {
              this.logger.error(`${pageTag} OpenAI Vision error: ${errMsg}`);
            }

            if (attempt === MAX_OPENAI_RETRIES) {
              this.logger.warn(`${pageTag} OpenAI exhausted — falling back to Tesseract.js`);
            }
          }
        }

        // ── Tesseract.js fallback (if OpenAI failed or returned too little) ──
        if (pageText.length < MIN_PAGE_CHARS) {
          this.logger.log(`${pageTag} Attempting Tesseract.js fallback on page image...`);
          try {
            const tessStart = Date.now();
            // Use Spanish + French + English for Guinea Ecuatorial documents
            // Language packs: 'spa' = Spanish, 'fra' = French, 'eng' = English
            const worker = await createWorker('spa+fra+eng');
            const { data: tessData } = await worker.recognize(imageBuffer);
            await worker.terminate();

            const tessElapsed = Date.now() - tessStart;
            this.logger.log(
              `${pageTag} Tesseract result: ${tessData.text.length} chars, ` +
              `confidence ${tessData.confidence.toFixed(1)}%, ${tessElapsed}ms`,
            );

            // Accept Tesseract result with lower threshold than image OCR
            // because page images from pdftoppm are higher quality than direct uploads
            if (tessData.confidence > 25 && tessData.text.trim().length > 20) {
              pageText = tessData.text;
              pageSource = 'tesseract';
              this.logger.log(
                `${pageTag} Tesseract fallback ACCEPTED ` +
                `(confidence ${tessData.confidence.toFixed(1)}%)`,
              );
            } else {
              this.logger.warn(
                `${pageTag} Tesseract confidence too low (${tessData.confidence.toFixed(1)}%) ` +
                `or text too short (${tessData.text.trim().length} chars). Page skipped.`,
              );
            }
          } catch (tessErr) {
            this.logger.error(`${pageTag} Tesseract.js fallback failed: ${tessErr.message}`);
          }
        }

        // ── Collect page result ─────────────────────────────────────────
        const pageElapsed = Date.now() - pageStart;
        if (pageText.trim()) {
          pageTexts.push(pageText.trim());
          this.logger.log(
            `${pageTag} ACCEPTED via ${pageSource}: ${pageText.trim().length} chars, ${pageElapsed}ms`,
          );
        } else {
          this.logger.warn(`${pageTag} SKIPPED — no usable text extracted (${pageElapsed}ms)`);
        }

        // Cleanup page PNG immediately to free disk space
        try { fs.unlinkSync(pngPath); } catch (_) { /* ignore */ }
      }

      // Cleanup temp PDF
      try { fs.unlinkSync(tmpPdf); } catch (_) { /* ignore */ }

      // Join pages with a separator that will NOT be shown as document content
      // (This is different from pdf-parse's "--N of M--" markers which we strip above)
      const fullText = pageTexts.join('\n\n');
      const totalElapsed = Date.now() - timestamp;

      this.logger.log(
        `${stepTag} Scanned PDF OCR complete: ` +
        `${fullText.length} chars from ${pageTexts.length}/${pngFiles.length} pages, ` +
        `${totalElapsed}ms total`,
      );

      if (pageTexts.length === 0) {
        this.logger.error(`${stepTag} No pages produced text. Document content will be empty.`);
        return {
          text: '',
          method: 'openai-vision',
          confidence: 0,
          pageCount: pngFiles.length,
          usedFallback: true,
        };
      }

      return {
        text: this.cleanExtractedText(fullText),
        method: 'openai-vision',
        confidence: 80, // estimated — OpenAI Vision generally high quality
        pageCount: pngFiles.length,
      };

    } catch (error) {
      // Clean up temp files even on failure
      try { fs.unlinkSync(tmpPdf); } catch (_) { /* ignore */ }
      const tmpDir = '/tmp';
      const prefix = path.basename(tmpPrefix);
      try {
        fs.readdirSync(tmpDir)
          .filter(f => f.startsWith(prefix) && f.endsWith('.png'))
          .forEach(f => { try { fs.unlinkSync(path.join(tmpDir, f)); } catch (_) { /* ignore */ } });
      } catch (_) { /* ignore */ }

      this.logger.error(`${stepTag} Scanned PDF OCR pipeline failed: ${error.message}`);
      this.logger.error(`${stepTag} Stack: ${error.stack}`);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TESSERACT-ONLY FALLBACK (when OpenAI is not configured)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Run pdftoppm to get page images, then OCR all pages with Tesseract.js.
   * Used when OpenAI is not available (ENABLE_AI_FEATURES=false or no API key).
   */
  private async extractScannedPdfWithTesseractOnly(file: Express.Multer.File): Promise<OcrResult> {
    const timestamp = Date.now();
    const tmpPdf = `/tmp/ocr_tess_${timestamp}.pdf`;
    const tmpPrefix = `/tmp/ocr_tess_page_${timestamp}`;
    const stepTag = `[TesseractPDF "${file.originalname}"]`;

    try {
      fs.writeFileSync(tmpPdf, file.buffer);

      await new Promise<void>((resolve, reject) => {
        const proc = spawn('pdftoppm', ['-png', '-r', '200', tmpPdf, tmpPrefix]);
        let stderr = '';
        proc.stderr.on('data', d => { stderr += d.toString(); });
        proc.on('close', code => {
          if (code === 0) resolve();
          else reject(new Error(`pdftoppm exit ${code}: ${stderr}`));
        });
        proc.on('error', err => reject(new Error(`pdftoppm not found: ${err.message}`)));
      });

      const tmpDir = '/tmp';
      const prefix = path.basename(tmpPrefix);
      const pngFiles = fs.readdirSync(tmpDir)
        .filter(f => f.startsWith(prefix) && f.endsWith('.png'))
        .sort()
        .map(f => path.join(tmpDir, f));

      this.logger.log(`${stepTag} pdftoppm generated ${pngFiles.length} page images (Tesseract mode)`);

      const pageTexts: string[] = [];
      for (let i = 0; i < pngFiles.length; i++) {
        const pngPath = pngFiles[i];
        const imageBuffer = fs.readFileSync(pngPath);
        try {
          const worker = await createWorker('spa+fra+eng');
          const { data } = await worker.recognize(imageBuffer);
          await worker.terminate();
          this.logger.log(
            `[TessPDF page ${i+1}/${pngFiles.length}] ` +
            `confidence=${data.confidence.toFixed(1)}% chars=${data.text.trim().length}`,
          );
          if (data.text.trim().length > 10) {
            pageTexts.push(data.text.trim());
          }
        } catch (tessErr) {
          this.logger.error(`[TessPDF page ${i+1}] Tesseract error: ${tessErr.message}`);
        }
        try { fs.unlinkSync(pngPath); } catch (_) { /* ignore */ }
      }

      try { fs.unlinkSync(tmpPdf); } catch (_) { /* ignore */ }

      const fullText = pageTexts.join('\n\n');
      this.logger.log(`${stepTag} Tesseract-only OCR: ${fullText.length} chars from ${pageTexts.length} pages`);

      return {
        text: this.cleanExtractedText(fullText),
        method: 'tesseract',
        pageCount: pngFiles.length,
        usedFallback: true,
      };
    } catch (error) {
      try { fs.unlinkSync(tmpPdf); } catch (_) { /* ignore */ }
      this.logger.error(`${stepTag} Tesseract-only pipeline failed: ${error.message}`);
      return { text: '', method: 'tesseract', confidence: 0, usedFallback: true };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PLAIN TEXT
  // ═══════════════════════════════════════════════════════════════════════════

  private extractFromPlainText(file: Express.Multer.File): OcrResult {
    this.logger.log(`[TXT] Reading plain text file: ${file.originalname}`);
    const raw = file.buffer.toString('utf-8');
    return { text: this.cleanExtractedText(raw), method: 'pdf-parse', confidence: 100 };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOCX / DOC EXTRACTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Extract raw text from Word documents using mammoth.
   * mammoth handles .docx (OOXML) natively. For legacy .doc files it may
   * produce partial output or fail — fallback returns empty string (no throw).
   */
  private async extractFromDocx(file: Express.Multer.File): Promise<OcrResult> {
    this.logger.log(`[DOCX] Extracting: ${file.originalname} (${file.size}B)`);
    try {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      this.logger.log(`[DOCX] Raw text: ${result.value?.length ?? 0} chars`);

      if (result.messages?.length) {
        this.logger.warn(`[DOCX] Mammoth messages: ${result.messages.map(m => m.message).join('; ')}`);
      }

      if (result.value?.trim().length > 0) {
        const cleanedText = this.cleanExtractedText(result.value);
        this.logger.log(`[DOCX] Extraction OK: ${cleanedText.length} chars`);
        return { text: cleanedText, method: 'mammoth', confidence: 95 };
      }

      this.logger.warn('[DOCX] No text extracted from Word document.');
      return { text: '', method: 'mammoth', confidence: 0 };
    } catch (error) {
      this.logger.error(`[DOCX] Mammoth failed: ${error.message}`);
      this.logger.error(`[DOCX] Stack: ${error.stack}`);
      return { text: '', method: 'mammoth', confidence: 0, usedFallback: true };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // IMAGE OCR (direct image uploads)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Extract text from image files (PNG, JPG, TIFF, etc.).
   *
   * Pipeline:
   *  1. Tesseract.js (offline, Spanish+French+English)
   *     → Accept if confidence > 60%
   *  2. OpenAI Vision fallback (if Tesseract confidence < 60% or throws)
   *
   * NOTE: Image files uploaded directly (not converted from PDF pages) tend to
   * have lower quality (skew, low resolution, JPEG artifacts) compared to
   * pdftoppm-generated pages. Hence the higher confidence threshold (60% vs 25%).
   */
  private async extractFromImage(file: Express.Multer.File): Promise<OcrResult> {
    const stepTag = `[IMG "${file.originalname}"]`;
    this.logger.log(`${stepTag} Starting image OCR (${file.size}B, ${file.mimetype})`);

    try {
      // ── Tesseract.js (primary, offline) ──────────────────────────────────
      const tessStart = Date.now();
      const worker = await createWorker('spa+fra+eng');
      const { data } = await worker.recognize(file.buffer);
      await worker.terminate();
      const tessElapsed = Date.now() - tessStart;

      this.logger.log(
        `${stepTag} Tesseract: confidence=${data.confidence.toFixed(1)}% ` +
        `chars=${data.text?.length ?? 0} elapsed=${tessElapsed}ms`,
      );

      if (data.confidence > 60 && data.text.trim().length > 0) {
        const cleanedText = this.cleanExtractedText(data.text);
        this.logger.log(`${stepTag} Tesseract ACCEPTED (confidence > 60%)`);
        return { text: cleanedText, method: 'tesseract', confidence: data.confidence };
      }

      // ── OpenAI Vision fallback ────────────────────────────────────────────
      if (this.openai && this.enableAI) {
        this.logger.log(
          `${stepTag} Tesseract confidence too low (${data.confidence.toFixed(1)}%). ` +
          `Trying OpenAI Vision...`,
        );
        return await this.extractImageWithOpenAI(file);
      }

      // Return low-confidence Tesseract result as last resort
      const cleanedText = this.cleanExtractedText(data.text);
      this.logger.warn(`${stepTag} Returning low-confidence Tesseract result (no OpenAI available)`);
      return { text: cleanedText, method: 'tesseract', confidence: data.confidence, usedFallback: true };

    } catch (error) {
      this.logger.error(`${stepTag} Tesseract threw: ${error.message}`);
      if (this.openai && this.enableAI) {
        this.logger.log(`${stepTag} Falling back to OpenAI Vision after Tesseract error...`);
        return await this.extractImageWithOpenAI(file);
      }
      throw error;
    }
  }

  /**
   * Send an image file directly to OpenAI Vision API.
   * Used for direct image uploads (not PDF page images).
   *
   * NETWORK: POST https://api.openai.com/v1/chat/completions
   *   Image is sent as base64 data URI embedded in the request JSON body.
   *   Typical image size: 50KB–5MB → base64 inflates by ~33%.
   *   Timeout: 60s (set in constructor). Large images may be slow.
   */
  private async extractImageWithOpenAI(file: Express.Multer.File): Promise<OcrResult> {
    if (!this.openai) throw new Error('OpenAI not configured');

    this.logger.log(`[OpenAI-IMG] Sending ${file.originalname} to OpenAI Vision API...`);
    const apiStart = Date.now();

    try {
      const base64Image = file.buffer.toString('base64');
      const dataUri = `data:${file.mimetype};base64,${base64Image}`;

      const response = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_VISION_MODEL', 'gpt-4o'),
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all text from this document image. Return ONLY the extracted text, ' +
                    'maintaining the original formatting and structure. If this is a government ' +
                    'document in Spanish, preserve all formal language, dates, reference numbers, ' +
                    'and official information exactly as shown.',
            },
            { type: 'image_url', image_url: { url: dataUri, detail: 'high' } },
          ],
        }],
        max_tokens: 4000,
      });

      const elapsed = Date.now() - apiStart;
      const extractedText = response.choices[0]?.message?.content || '';
      const tokensUsed = response.usage?.total_tokens ?? 0;

      this.logger.log(
        `[OpenAI-IMG] Response: ${extractedText.length} chars, ` +
        `${tokensUsed} tokens, ${elapsed}ms`,
      );

      return {
        text: this.cleanExtractedText(extractedText),
        method: 'openai-vision',
        confidence: 85,
      };
    } catch (error) {
      this.logger.error(`[OpenAI-IMG] API error: ${error.message}`);
      throw new Error(`OpenAI OCR failed: ${error.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AI ANALYSIS METHODS (unchanged business logic, enhanced logging)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate a 2-3 paragraph summary of a document using GPT-4o.
   * Network: POST https://api.openai.com/v1/chat/completions (~2-8s)
   */
  async generateSummary(text: string): Promise<string> {
    if (!this.openai || !this.enableAI) {
      this.logger.warn('[Summary] AI not enabled — skipping summary generation');
      return '';
    }

    this.logger.log(`[Summary] Generating summary for ${text.length}-char document...`);
    try {
      const response = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL', 'gpt-4o'),
        messages: [
          {
            role: 'system',
            content:
              'Eres un asistente experto en análisis de documentos gubernamentales de Guinea Ecuatorial. ' +
              'Tu tarea es generar resúmenes concisos y precisos de documentos oficiales.',
          },
          {
            role: 'user',
            content:
              `Resume el siguiente documento oficial en 2-3 párrafos, destacando los puntos clave, ` +
              `acciones requeridas, y cualquier información importante:\n\n${text}`,
          },
        ],
        max_tokens: 500,
      });

      const summary = response.choices[0]?.message?.content?.trim() || '';
      this.logger.log(`[Summary] Generated ${summary.length} chars`);
      return summary;
    } catch (error) {
      this.logger.error(`[Summary] Failed: ${error.message}`);
      return '';
    }
  }

  /**
   * Extract 3-5 key action points from a document using GPT-4o.
   * Network: POST https://api.openai.com/v1/chat/completions (~2-5s)
   */
  async extractKeyPoints(text: string): Promise<string[]> {
    if (!this.openai || !this.enableAI) {
      this.logger.warn('[KeyPoints] AI not enabled — skipping key points extraction');
      return [];
    }

    this.logger.log(`[KeyPoints] Extracting key points from ${text.length}-char document...`);
    try {
      const response = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL', 'gpt-4o'),
        messages: [
          {
            role: 'system',
            content:
              'Eres un asistente experto en análisis de documentos. ' +
              'Extrae los puntos clave de documentos oficiales en formato de lista.',
          },
          {
            role: 'user',
            content:
              `Extrae los 3-5 puntos más importantes de este documento. ` +
              `Devuelve solo una lista de puntos clave, uno por línea, comenzando cada uno con un guión:\n\n${text}`,
          },
        ],
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content?.trim() || '';
      const points = content
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(/^[-•*]\s*/, '').trim())
        .filter(point => point.length > 0);

      this.logger.log(`[KeyPoints] Extracted ${points.length} points`);
      return points;
    } catch (error) {
      this.logger.error(`[KeyPoints] Failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate a formal proposed response to a document using GPT-4o.
   * Network: POST https://api.openai.com/v1/chat/completions (~3-10s)
   */
  async generateProposedResponse(text: string, documentType: string): Promise<string> {
    if (!this.openai || !this.enableAI) {
      this.logger.warn('[Response] AI not enabled — skipping response generation');
      return '';
    }

    this.logger.log(`[Response] Generating proposed response for ${documentType}...`);
    try {
      const response = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL', 'gpt-4o'),
        messages: [
          {
            role: 'system',
            content:
              'Eres un asistente de redacción de documentos oficiales del gobierno de Guinea Ecuatorial. ' +
              'Generas respuestas profesionales y formales a documentos gubernamentales.',
          },
          {
            role: 'user',
            content:
              `Genera una respuesta oficial propuesta para este ${documentType}. ` +
              `La respuesta debe ser formal, profesional, y apropiada para un contexto gubernamental:\n\n${text}`,
          },
        ],
        max_tokens: 1000,
      });

      const proposedResponse = response.choices[0]?.message?.content?.trim() || '';
      this.logger.log(`[Response] Generated ${proposedResponse.length} chars`);
      return proposedResponse;
    } catch (error) {
      this.logger.error(`[Response] Failed: ${error.message}`);
      return '';
    }
  }
}
