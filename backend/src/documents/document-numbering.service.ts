import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Document Numbering Service
 *
 * Generates official document numbers in the format: 025-MT-038-051
 *
 * Format breakdown:
 * - 025: Sequential document number (3 digits)
 * - MT: Ministry abbreviation (Ministerio de Transporte)
 * - 038: Month/Year combination (MMY format)
 * - 051: Sub-sequence number (3 digits)
 *
 * Client requirement: "Formato exacto y automático de colocación del número"
 * Number placement: Top-left corner of document
 */
@Injectable()
export class DocumentNumberingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate next document number
   * Format: XXX-MT-MMY-SSS
   */
  async generateDocumentNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 0-indexed

    // Get sequential number for this year
    const currentYearStart = new Date(year, 0, 1);
    const currentYearEnd = new Date(year, 11, 31, 23, 59, 59);

    const documentsThisYear = await this.prisma.document.count({
      where: {
        createdAt: {
          gte: currentYearStart,
          lte: currentYearEnd,
        },
        documentNumber: {
          not: null,
        },
      },
    });

    // Sequential number (001, 002, 003, ...)
    const sequential = (documentsThisYear + 1).toString().padStart(3, '0');

    // Ministry abbreviation
    const ministry = 'MT'; // MTTSIA

    // Month/Year format: MMY (e.g., 031 for March 2031, 122 for Dec 2022)
    // Using last digit of year + month
    const monthYear = `${month.toString().padStart(2, '0')}${year.toString().slice(-1)}`;

    // Sub-sequence (for now, same as sequential, but can be customized)
    const subSequence = sequential;

    // Final format: 025-MT-038-051
    return `${sequential}-${ministry}-${monthYear}-${subSequence}`;
  }

  /**
   * Validate document number format
   */
  isValidDocumentNumber(number: string): boolean {
    // Format: XXX-MT-MMY-SSS
    const pattern = /^\d{3}-MT-\d{3}-\d{3}$/;
    return pattern.test(number);
  }

  /**
   * Parse document number into components
   */
  parseDocumentNumber(number: string): {
    sequential: number;
    ministry: string;
    monthYear: string;
    subSequence: number;
  } | null {
    if (!this.isValidDocumentNumber(number)) {
      return null;
    }

    const parts = number.split('-');

    return {
      sequential: parseInt(parts[0], 10),
      ministry: parts[1],
      monthYear: parts[2],
      subSequence: parseInt(parts[3], 10),
    };
  }

  /**
   * Assign document number to a document
   */
  async assignDocumentNumber(documentId: string): Promise<string> {
    // Check if document already has a number
    const existingDoc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { documentNumber: true },
    });

    if (existingDoc?.documentNumber) {
      return existingDoc.documentNumber;
    }

    // Generate new number
    const documentNumber = await this.generateDocumentNumber();

    // Assign to document
    await this.prisma.document.update({
      where: { id: documentId },
      data: { documentNumber },
    });

    return documentNumber;
  }

  /**
   * Get next available number preview (without assigning)
   */
  async getNextNumberPreview(): Promise<string> {
    return this.generateDocumentNumber();
  }

  /**
   * Get statistics about document numbering
   */
  async getNumberingStats() {
    const currentYear = new Date().getFullYear();
    const currentYearStart = new Date(currentYear, 0, 1);

    const totalNumbered = await this.prisma.document.count({
      where: {
        documentNumber: {
          not: null,
        },
      },
    });

    const numberedThisYear = await this.prisma.document.count({
      where: {
        documentNumber: {
          not: null,
        },
        createdAt: {
          gte: currentYearStart,
        },
      },
    });

    const unnumbered = await this.prisma.document.count({
      where: {
        documentNumber: null,
      },
    });

    return {
      totalNumbered,
      numberedThisYear,
      unnumbered,
      currentYear,
      nextNumber: await this.getNextNumberPreview(),
    };
  }
}
