import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';

export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[]; // ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']
  maxFiles?: number;
}

/**
 * File filter for multer to validate file types
 */
export const fileFilter = (options: FileValidationOptions = {}) => {
  const allowedTypes = options.allowedTypes || [
    'pdf',
    'doc',
    'docx',
    'jpg',
    'jpeg',
    'png',
    'txt',
  ];

  return (req: any, file: Express.Multer.File, callback: any) => {
    // Get file extension
    const ext = extname(file.originalname).toLowerCase().replace('.', '');

    // Check if extension is allowed
    if (!allowedTypes.includes(ext)) {
      return callback(
        new BadRequestException(
          `Tipo de archivo no permitido: ${ext}. Tipos permitidos: ${allowedTypes.join(', ')}`,
        ),
        false,
      );
    }

    // Validate mime type matches extension
    const mimeType = file.mimetype.toLowerCase();
    const validMimeTypes = {
      pdf: ['application/pdf'],
      doc: ['application/msword'],
      docx: [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      jpg: ['image/jpeg'],
      jpeg: ['image/jpeg'],
      png: ['image/png'],
      txt: ['text/plain'],
    };

    const expectedMimeTypes = validMimeTypes[ext] || [];
    if (expectedMimeTypes.length > 0 && !expectedMimeTypes.includes(mimeType)) {
      return callback(
        new BadRequestException(
          `El tipo MIME del archivo (${mimeType}) no coincide con su extensión (${ext})`,
        ),
        false,
      );
    }

    // Check for potentially malicious file names
    if (file.originalname.includes('..') || file.originalname.includes('/')) {
      return callback(
        new BadRequestException('Nombre de archivo no válido'),
        false,
      );
    }

    callback(null, true);
  };
};

/**
 * Validate file size
 */
export const validateFileSize = (
  file: Express.Multer.File,
  maxSize: number,
): void => {
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    throw new BadRequestException(
      `El archivo ${file.originalname} es demasiado grande (${fileSizeMB}MB). Tamaño máximo permitido: ${maxSizeMB}MB`,
    );
  }
};

/**
 * Validate files array
 */
export const validateFiles = (
  files: Express.Multer.File[],
  options: FileValidationOptions = {},
): void => {
  const maxFiles = options.maxFiles || 10;
  const maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB default

  // Check number of files
  if (files.length > maxFiles) {
    throw new BadRequestException(
      `Demasiados archivos. Máximo permitido: ${maxFiles}`,
    );
  }

  // Validate each file
  files.forEach((file) => {
    validateFileSize(file, maxSize);
  });

  // Check total size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const maxTotalSize = maxSize * maxFiles;

  if (totalSize > maxTotalSize) {
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    const maxTotalSizeMB = (maxTotalSize / (1024 * 1024)).toFixed(2);
    throw new BadRequestException(
      `El tamaño total de los archivos (${totalSizeMB}MB) excede el límite (${maxTotalSizeMB}MB)`,
    );
  }
};

/**
 * Check for potentially malicious file content (basic security check)
 */
export const scanFileContent = (file: Express.Multer.File): boolean => {
  const buffer = file.buffer;

  // Check for suspicious patterns
  const suspiciousPatterns = [
    Buffer.from('<?php'), // PHP code
    Buffer.from('<script'), // JavaScript in non-HTML files
    Buffer.from('eval('), // Eval functions
    Buffer.from('base64_decode'), // Base64 decode (often used in malware)
  ];

  // Only check if not a known safe format
  if (!file.mimetype.startsWith('image/') && file.mimetype !== 'application/pdf') {
    for (const pattern of suspiciousPatterns) {
      if (buffer.includes(pattern)) {
        throw new BadRequestException(
          `El archivo contiene contenido potencialmente peligroso y ha sido rechazado`,
        );
      }
    }
  }

  return true;
};
