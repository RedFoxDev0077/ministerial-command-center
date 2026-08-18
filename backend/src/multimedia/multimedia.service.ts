import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MultimediaService {
  private readonly logger = new Logger(MultimediaService.name);
  private openai: OpenAI;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async findAll(userId?: string) {
    return this.prisma.mediaTranscription.findMany({
      include: { createdBy: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.mediaTranscription.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
    if (!record) throw new NotFoundException('Transcripción no encontrada');
    return record;
  }

  async transcribe(file: Express.Multer.File, userId: string) {
    const isAudio = file.mimetype.startsWith('audio/');
    const isVideo = file.mimetype.startsWith('video/');
    const fileType = isAudio ? 'audio' : isVideo ? 'video' : 'unknown';

    const record = await this.prisma.mediaTranscription.create({
      data: {
        fileName: file.originalname,
        fileType,
        mimeType: file.mimetype,
        filePath: file.path,
        fileSize: file.size,
        status: 'PROCESSING',
        createdById: userId,
      },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    this.processTranscription(record.id, file.path, fileType).catch(err => {
      this.logger.error(`Transcription failed for ${record.id}: ${err.message}`);
    });

    return record;
  }

  private getFfmpegPath(): string {
    // Prefer system FFmpeg, fall back to ffmpeg-static npm binary
    try {
      const { execSync } = require('child_process');
      const sysPath = execSync('which ffmpeg 2>/dev/null || where ffmpeg 2>nul', { encoding: 'utf8' }).trim().split('\n')[0].trim();
      if (sysPath && fs.existsSync(sysPath)) return sysPath;
    } catch {}
    try {
      return require('ffmpeg-static');
    } catch {}
    return 'ffmpeg'; // last resort — PATH lookup
  }

  private async extractAudioForWhisper(videoPath: string): Promise<string> {
    const audioPath = videoPath.replace(/\.[^/.]+$/, '_whisper.m4a');
    if (fs.existsSync(audioPath)) return audioPath;

    return new Promise((resolve, reject) => {
      const ffmpegBin = this.getFfmpegPath();
      const ffmpeg = require('fluent-ffmpeg');
      ffmpeg.setFfmpegPath(ffmpegBin);

      ffmpeg(videoPath)
        .outputOptions(['-vn', '-acodec aac', '-b:a 64k', '-ac 1'])
        .output(audioPath)
        .on('end', () => resolve(audioPath))
        .on('error', (err) => reject(new Error(`Audio extraction failed: ${err.message}`)))
        .run();
    });
  }

  private async processTranscription(recordId: string, filePath: string, fileType: string) {
    let audioPath: string | null = null;
    try {
      // For large videos, extract audio first so we stay within Whisper's 25MB limit
      const fileSize = fs.statSync(filePath).size;
      let whisperInput = filePath;

      if (fileType === 'video' && fileSize > 24 * 1024 * 1024) {
        this.logger.log(`Video > 24MB — extracting audio for Whisper...`);
        audioPath = await this.extractAudioForWhisper(filePath);
        whisperInput = audioPath;
      }

      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(whisperInput),
        model: 'whisper-1',
        response_format: 'text',
      }) as any as string;

      let summary = '';
      if (transcription && transcription.length > 100) {
        const summaryResponse = await this.openai.chat.completions.create({
          model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'Genera un resumen ejecutivo conciso (3-5 oraciones) del siguiente texto transcrito. Usa tono formal institucional en español. NO uses Markdown ni símbolos ** o ##. Solo texto plano con párrafos.',
            },
            { role: 'user', content: transcription.substring(0, 4000) },
          ],
          max_tokens: 500,
        });
        summary = summaryResponse.choices[0]?.message?.content || '';
      }

      await this.prisma.mediaTranscription.update({
        where: { id: recordId },
        data: { transcription, summary, language: 'es', status: 'COMPLETED' },
      });

      this.logger.log(`Transcription completed for ${recordId}`);
    } catch (error) {
      await this.prisma.mediaTranscription.update({
        where: { id: recordId },
        data: { status: 'FAILED', errorMessage: error.message },
      });
      throw error;
    } finally {
      if (audioPath && fs.existsSync(audioPath)) {
        try { fs.unlinkSync(audioPath); } catch {}
      }
    }
  }

  async generateSummary(id: string) {
    const record = await this.findOne(id);
    if (!record.transcription) throw new NotFoundException('No hay transcripción disponible');

    const response = await this.openai.chat.completions.create({
      model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Genera un resumen ejecutivo detallado del siguiente texto transcrito. Incluye: puntos clave, decisiones tomadas y acciones pendientes. Usa tono formal institucional en español. NO uses Markdown ni símbolos como ** o ##. Usa números (1. 2. 3.) para listas y párrafos separados por línea en blanco.',
        },
        { role: 'user', content: record.transcription.substring(0, 8000) },
      ],
      max_tokens: 1000,
    });

    const summary = response.choices[0]?.message?.content || '';
    return this.prisma.mediaTranscription.update({
      where: { id },
      data: { summary },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  }

  async generateSocialPost(id: string) {
    const record = await this.findOne(id);
    if (!record.transcription) throw new NotFoundException('No hay transcripción disponible');

    const response = await this.openai.chat.completions.create({
      model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'Eres el comunicador oficial del Ministerio de Transportes, Telecomunicaciones y Correos de Guinea Ecuatorial. ' +
            'Redacta una publicación profesional para redes sociales (Facebook/Instagram) basada en la transcripción de video/entrevista del Ministro. ' +
            'La publicación debe: 1) Ser atractiva y de tono institucional, 2) Resumir los mensajes clave en 2-3 párrafos cortos, ' +
            '3) Terminar con 4-6 hashtags relevantes en español, 4) No superar las 280 palabras. ' +
            'NO uses Markdown ni símbolos ** o ##. Solo texto plano listo para copiar y pegar en Facebook o Instagram. Sin instrucciones ni explicaciones.',
        },
        { role: 'user', content: record.transcription.substring(0, 6000) },
      ],
      max_tokens: 600,
    });

    const socialPost = response.choices[0]?.message?.content || '';
    return this.prisma.mediaTranscription.update({
      where: { id },
      data: { socialPost },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  }

  async translate(id: string, targetLang: string) {
    const record = await this.findOne(id);
    if (!record.transcription) throw new NotFoundException('No hay transcripción disponible para traducir');

    const langNames: Record<string, string> = {
      fr: 'francés', en: 'inglés', ru: 'ruso', zh: 'chino mandarín', pt: 'portugués',
    };
    const langName = langNames[targetLang] || targetLang;

    const response = await this.openai.chat.completions.create({
      model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Eres un traductor profesional. Traduce el siguiente texto al ${langName}. Mantén el tono formal y la estructura del texto original. Devuelve únicamente la traducción, sin explicaciones.`,
        },
        { role: 'user', content: record.transcription.substring(0, 8000) },
      ],
      max_tokens: 2000,
    });

    const translation = response.choices[0]?.message?.content || '';
    return this.prisma.mediaTranscription.update({
      where: { id },
      data: { translation, translationLang: targetLang },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  }

  async generateTechnicalOpinion(id: string) {
    const record = await this.findOne(id);
    if (!record.transcription) throw new NotFoundException('No hay transcripción disponible');

    const response = await this.openai.chat.completions.create({
      model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'Eres un experto técnico del Ministerio de Transportes, Telecomunicaciones y Correos de Guinea Ecuatorial. ' +
            'Analiza el contenido del audio/video transcrito y emite un dictamen técnico institucional que incluya: ' +
            '1) Resumen ejecutivo, 2) Análisis técnico de los temas tratados, 3) Implicaciones para el ministerio, ' +
            '4) Recomendaciones técnicas, 5) Conclusión. Usa tono formal y lenguaje técnico apropiado. NO uses Markdown ni símbolos ** o ##. Usa números y letras para las listas. Texto plano con secciones bien separadas.',
        },
        { role: 'user', content: `Transcripción:\n\n${record.transcription.substring(0, 8000)}` },
      ],
      max_tokens: 1500,
    });

    const technicalOpinion = response.choices[0]?.message?.content || '';
    return this.prisma.mediaTranscription.update({
      where: { id },
      data: { technicalOpinion },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  }

  // ─── Frame Extraction ─────────────────────────────────────────────────────────

  async extractBestFrames(id: string) {
    const record = await this.findOne(id);
    if (!record.filePath) throw new NotFoundException('Archivo de video no encontrado');
    if (record.fileType !== 'video') throw new NotFoundException('Solo se pueden extraer fotogramas de archivos de video');

    await this.prisma.mediaTranscription.update({
      where: { id },
      data: { framesStatus: 'PROCESSING' },
    });

    // Process async — returns immediately, client polls via 5-second interval
    this.processFrameExtraction(id, record.filePath).catch(err => {
      this.logger.error(`Frame extraction failed for ${id}: ${err.message}`);
    });

    return this.findOne(id);
  }

  getFrameFilePath(recordId: string, filename: string): string {
    return path.join(process.cwd(), 'uploads', 'multimedia', 'frames', recordId, filename);
  }

  private async extractFrames(videoPath: string, outputDir: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const ffmpegBin = this.getFfmpegPath();
      const ffmpeg = require('fluent-ffmpeg');
      ffmpeg.setFfmpegPath(ffmpegBin);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputPattern = path.join(outputDir, 'frame-%03d.jpg');

      ffmpeg(videoPath)
        .outputOptions([
          '-vf', 'fps=1/8,scale=640:-1',  // 1 frame every 8s, resize to 640px wide
          '-frames:v', '12',               // cap at 12 frames max
          '-q:v', '3',
        ])
        .output(outputPattern)
        .on('end', () => {
          const files = fs.existsSync(outputDir)
            ? fs.readdirSync(outputDir)
                .filter(f => f.endsWith('.jpg'))
                .sort()
                .map(f => path.join(outputDir, f))
            : [];
          resolve(files);
        })
        .on('error', (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
        .run();
    });
  }

  private async selectBestFramesWithVision(framePaths: string[], count: number): Promise<string[]> {
    if (framePaths.length === 0) return [];
    if (framePaths.length <= count) return framePaths;

    const imageContent = framePaths.map((fp) => ({
      type: 'image_url' as const,
      image_url: {
        url: `data:image/jpeg;base64,${fs.readFileSync(fp).toString('base64')}`,
        detail: 'low' as const,
      },
    }));

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              `These are ${framePaths.length} frames (numbered 1 to ${framePaths.length}) from a ministerial interview video. ` +
              `Select the best ${count} frames for social media. Choose frames where: ` +
              `the person is clearly visible, facing the camera, eyes open, not blurry, good lighting, dignified expression. ` +
              `Respond ONLY with a JSON array of the selected frame numbers (1-based), e.g. [1, 4, 8]`,
          },
          ...imageContent,
        ],
      }],
      max_tokens: 80,
    });

    try {
      const text = response.choices[0]?.message?.content || '';
      const match = text.match(/\[[\d,\s]+\]/);
      if (!match) return framePaths.slice(0, count);
      const indices: number[] = JSON.parse(match[0]);
      return indices
        .filter(i => i >= 1 && i <= framePaths.length)
        .slice(0, count)
        .map(i => framePaths[i - 1]);
    } catch {
      return framePaths.slice(0, count);
    }
  }

  private async processFrameExtraction(recordId: string, videoPath: string) {
    const outputDir = path.join(process.cwd(), 'uploads', 'multimedia', 'frames', recordId);

    try {
      this.logger.log(`Extracting frames from ${videoPath}...`);
      const allFrames = await this.extractFrames(videoPath, outputDir);

      if (allFrames.length === 0) {
        throw new Error('No se pudieron extraer fotogramas del video');
      }

      this.logger.log(`Extracted ${allFrames.length} frames, selecting best with GPT-4o Vision...`);
      const bestFramePaths = await this.selectBestFramesWithVision(allFrames, 5);

      // Delete non-selected frames to save disk space
      for (const fp of allFrames) {
        if (!bestFramePaths.includes(fp)) {
          try { fs.unlinkSync(fp); } catch {}
        }
      }

      const bestFrames = bestFramePaths.map(fp => ({ filename: path.basename(fp) }));

      await this.prisma.mediaTranscription.update({
        where: { id: recordId },
        data: { bestFrames: bestFrames as any, framesStatus: 'COMPLETED' },
      });

      this.logger.log(`Frame extraction completed for ${recordId}: ${bestFrames.length} best frames selected`);
    } catch (error) {
      this.logger.error(`Frame extraction failed for ${recordId}: ${error.message}`);
      try { fs.rmSync(outputDir, { recursive: true, force: true }); } catch {}
      await this.prisma.mediaTranscription.update({
        where: { id: recordId },
        data: { framesStatus: 'FAILED' },
      });
      throw error;
    }
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────────

  async remove(id: string) {
    const record = await this.findOne(id);
    if (record.filePath) {
      try { fs.unlinkSync(record.filePath); } catch {}
    }
    // Delete extracted frames folder
    const framesDir = path.join(process.cwd(), 'uploads', 'multimedia', 'frames', id);
    if (fs.existsSync(framesDir)) {
      try { fs.rmSync(framesDir, { recursive: true, force: true }); } catch {}
    }
    return this.prisma.mediaTranscription.delete({ where: { id } });
  }
}
