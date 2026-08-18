import { Injectable } from '@nestjs/common';

@Injectable()
export class TextFormatterService {
  /**
   * Convert plain OCR text to formatted HTML
   */
  formatOCRText(plainText: string): string {
    if (!plainText || plainText.trim() === '') {
      return '';
    }

    // Clean up the text
    let text = plainText.trim();

    // Split into lines
    const lines = text.split('\n');
    const formattedLines: string[] = [];
    let currentParagraph: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Empty line - end of paragraph
      if (line === '') {
        if (currentParagraph.length > 0) {
          formattedLines.push(this.wrapParagraph(currentParagraph.join('<br>')));
          currentParagraph = [];
        }
        continue;
      }

      // Detect heading (all caps and short)
      if (this.isHeading(line)) {
        if (currentParagraph.length > 0) {
          formattedLines.push(this.wrapParagraph(currentParagraph.join('<br>')));
          currentParagraph = [];
        }
        formattedLines.push(`<h2>${this.escapeHtml(line)}</h2>`);
        continue;
      }

      // Detect list item
      if (this.isListItem(line)) {
        if (currentParagraph.length > 0) {
          formattedLines.push(this.wrapParagraph(currentParagraph.join('<br>')));
          currentParagraph = [];
        }
        const listItem = this.formatListItem(line);
        formattedLines.push(listItem);
        continue;
      }

      // Regular line - add to current paragraph
      currentParagraph.push(this.escapeHtml(line));
    }

    // Add any remaining paragraph
    if (currentParagraph.length > 0) {
      formattedLines.push(this.wrapParagraph(currentParagraph.join('<br>')));
    }

    // Group consecutive list items into ul/ol tags
    return this.groupListItems(formattedLines.join('\n'));
  }

  /**
   * Check if line is a heading (all caps, relatively short)
   */
  private isHeading(line: string): boolean {
    if (line.length > 80) return false;
    if (line.length < 3) return false;

    // Check if most characters are uppercase
    const upperCount = (line.match(/[A-ZÁÉÍÓÚÑ]/g) || []).length;
    const letterCount = (line.match(/[A-ZÁÉÍÓÚÑa-záéíóúñ]/g) || []).length;

    return letterCount > 0 && (upperCount / letterCount) > 0.7;
  }

  /**
   * Check if line is a list item
   */
  private isListItem(line: string): boolean {
    // Bulleted list patterns
    const bulletPatterns = /^[•\-\*\→\►]\s+/;
    if (bulletPatterns.test(line)) return true;

    // Numbered list patterns
    const numberedPatterns = /^(\d+[\.\)]\s+|[a-z][\.\)]\s+|[ivxlcdm]+[\.\)]\s+)/i;
    if (numberedPatterns.test(line)) return true;

    return false;
  }

  /**
   * Format a list item
   */
  private formatListItem(line: string): string {
    // Remove bullet/number from the start
    const content = line.replace(/^[•\-\*\→\►]\s+/, '')
                       .replace(/^(\d+[\.\)]\s+|[a-z][\.\)]\s+|[ivxlcdm]+[\.\)]\s+)/i, '');

    // Determine if it's numbered or bulleted
    const isNumbered = /^(\d+[\.\)]\s+|[a-z][\.\)]\s+|[ivxlcdm]+[\.\)]\s+)/i.test(line);
    const tag = isNumbered ? 'ol-item' : 'ul-item';

    return `<li class="${tag}">${this.escapeHtml(content)}</li>`;
  }

  /**
   * Wrap text in paragraph tags
   */
  private wrapParagraph(text: string): string {
    return `<p>${text}</p>`;
  }

  /**
   * Group consecutive list items into ul/ol tags
   */
  private groupListItems(html: string): string {
    const lines = html.split('\n');
    const result: string[] = [];
    let inUl = false;
    let inOl = false;

    for (const line of lines) {
      if (line.includes('<li class="ul-item">')) {
        if (inOl) {
          result.push('</ol>');
          inOl = false;
        }
        if (!inUl) {
          result.push('<ul>');
          inUl = true;
        }
        result.push(line.replace(' class="ul-item"', ''));
      } else if (line.includes('<li class="ol-item">')) {
        if (inUl) {
          result.push('</ul>');
          inUl = false;
        }
        if (!inOl) {
          result.push('<ol>');
          inOl = true;
        }
        result.push(line.replace(' class="ol-item"', ''));
      } else {
        if (inUl) {
          result.push('</ul>');
          inUl = false;
        }
        if (inOl) {
          result.push('</ol>');
          inOl = false;
        }
        result.push(line);
      }
    }

    // Close any open lists
    if (inUl) result.push('</ul>');
    if (inOl) result.push('</ol>');

    return result.join('\n');
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const htmlMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => htmlMap[m]);
  }
}
