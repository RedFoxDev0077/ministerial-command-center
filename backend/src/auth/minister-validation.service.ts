import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

/**
 * Service to validate Minister-only operations
 *
 * According to client requirements:
 * - "Solo puedo firmar yo" (Only I can sign)
 * - Only the Minister can sign documents
 * - This is a critical security requirement
 */
@Injectable()
export class MinisterValidationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check if user is the Minister
   * Minister is identified by ADMIN role (highest authority)
   */
  async isMinister(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return user?.role === Role.ADMIN;
  }

  /**
   * Validate that user can sign documents
   * Throws UnauthorizedException if user is not Minister
   */
  async validateCanSign(userId: string): Promise<void> {
    const canSign = await this.isMinister(userId);

    if (!canSign) {
      throw new UnauthorizedException(
        'Solo el Ministro puede firmar documentos. Only the Minister can sign documents.',
      );
    }
  }

  /**
   * Get the Minister user
   * Returns the Minister user or null if not found
   */
  async getMinister(): Promise<any> {
    const minister = await this.prisma.user.findFirst({
      where: { role: Role.ADMIN },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    return minister;
  }

  /**
   * Check if signature is required for current document stage
   * Signature is required for SIGNATURE_PROTOCOL stage
   */
  async isSignatureRequired(documentId: string): Promise<boolean> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { currentStage: true },
    });

    return document?.currentStage === 'SIGNATURE_PROTOCOL';
  }

  /**
   * Validate Minister and signature requirement
   * Combined validation for signing operations
   */
  async validateSignatureOperation(
    userId: string,
    documentId: string,
  ): Promise<void> {
    // Check if user is Minister
    await this.validateCanSign(userId);

    // Check if signature is required at current stage
    const signatureRequired = await this.isSignatureRequired(documentId);

    if (!signatureRequired) {
      throw new UnauthorizedException(
        'El documento no está en la etapa de protocolo de firma. Document is not in signature protocol stage.',
      );
    }
  }
}
