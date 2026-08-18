import { axiosInstance } from './axios';

export interface CreateDocumentDto {
  title: string;
  type: string;
  direction: 'IN' | 'OUT';
  classification: 'INTERNAL' | 'EXTERNAL';
  channel?: string;
  origin?: string;
  entityId: string;
  responsibleId: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  content?: string;
  expedienteId?: string;
  isDraft?: boolean;
  tags?: string[];
  receivedAt?: Date;
  sentAt?: Date;
  // Official PDF header fields
  subDepartment?: string;
  referenceCode?: string;
  signerTitle?: string;
  recipientTitle?: string;
}

export interface UpdateDocumentDto extends Partial<CreateDocumentDto> {
  status?: 'DRAFT' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED' | 'REJECTED';
  aiSummary?: string;
  aiProposedResponse?: string;
  aiKeyPoints?: string[];
  qrCode?: string;
  subDepartment?: string;
  referenceCode?: string;
  signerTitle?: string;
  recipientTitle?: string;
}

export interface QueryDocumentDto {
  page?: number;
  limit?: number;
  search?: string;
  direction?: 'IN' | 'OUT';
  status?: string;
  classification?: 'INTERNAL' | 'EXTERNAL';
  entityId?: string;
  responsibleId?: string;
  priority?: string;
  hasAiSummary?: boolean;
  expedienteId?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
  isDraft?: boolean;
  createdById?: string;
}

export interface DecreeDocumentDto {
  departmentIds: string[];
  sendNotification: boolean;
  notificationMethod: 'EMAIL' | 'WHATSAPP' | 'BOTH';
  message?: string;
  decreeNote?: string;
}

export interface AssignDocumentDto {
  userId: string;
  note?: string;
}

export interface CreateDocumentFromTemplateDto {
  templateId: string;
  variables: Record<string, string>;
  title?: string;
  entityId?: string;
  responsibleId?: string;
  direction?: 'INCOMING' | 'OUTGOING';
}

export const documentsApi = {
  // Create document
  create: async (data: CreateDocumentDto) => {
    const response = await axiosInstance.post('/documents', data);
    return response.data;
  },

  // Get all documents with filters
  findAll: async (params?: QueryDocumentDto) => {
    const response = await axiosInstance.get('/documents', { params });
    return response.data;
  },

  // Get document by ID
  findOne: async (id: string) => {
    const response = await axiosInstance.get(`/documents/${id}`);
    return response.data;
  },

  // Update document
  update: async (id: string, data: UpdateDocumentDto) => {
    const response = await axiosInstance.patch(`/documents/${id}`, data);
    return response.data;
  },

  // Update document status
  updateStatus: async (id: string, status: string) => {
    const response = await axiosInstance.patch(`/documents/${id}/status`, { status });
    return response.data;
  },

  // Archive document (soft delete)
  remove: async (id: string) => {
    const response = await axiosInstance.delete(`/documents/${id}`);
    return response.data;
  },

  // Permanently delete document (hard delete)
  permanentDelete: async (id: string) => {
    const response = await axiosInstance.delete(`/documents/${id}/permanent`);
    return response.data;
  },

  // Decree document
  decree: async (id: string, data: DecreeDocumentDto) => {
    const response = await axiosInstance.post(`/documents/${id}/decree`, data);
    return response.data;
  },

  // Assign document
  assign: async (id: string, data: AssignDocumentDto) => {
    const response = await axiosInstance.post(`/documents/${id}/assign`, data);
    return response.data;
  },

  // Get inbox documents
  getInbox: async (params?: QueryDocumentDto) => {
    const response = await axiosInstance.get('/documents/inbox', { params });
    return response.data;
  },

  // Get outbox documents
  getOutbox: async (params?: QueryDocumentDto) => {
    const response = await axiosInstance.get('/documents/outbox', { params });
    return response.data;
  },

  // Get my documents
  getMyDocuments: async (params?: QueryDocumentDto) => {
    const response = await axiosInstance.get('/documents/my', { params });
    return response.data;
  },

  // Get pending documents
  getPending: async (params?: QueryDocumentDto) => {
    const response = await axiosInstance.get('/documents/pending', { params });
    return response.data;
  },

  // Get documents by entity
  getByEntity: async (entityId: string, params?: QueryDocumentDto) => {
    const response = await axiosInstance.get(`/documents/by-entity/${entityId}`, { params });
    return response.data;
  },

  // Get dashboard statistics
  getStats: async () => {
    const response = await axiosInstance.get('/documents/stats');
    return response.data;
  },

  // Full-text search documents (Spanish language support)
  search: async (query: string, params?: Omit<QueryDocumentDto, 'search'>) => {
    const response = await axiosInstance.get('/documents/search', {
      params: { q: query, ...params }
    });
    return response.data;
  },

  // Download document as PDF
  downloadPdf: async (id: string): Promise<Blob> => {
    const response = await axiosInstance.get(`/documents/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Download document as Word (.docx)
  downloadWord: async (id: string): Promise<Blob> => {
    const response = await axiosInstance.get(`/documents/${id}/word`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Move document to other tray (change direction IN↔OUT)
  moveDirection: async (id: string, direction: 'IN' | 'OUT') => {
    const response = await axiosInstance.patch(`/documents/${id}`, { direction });
    return response.data;
  },

  // Upload files to document with OCR processing
  uploadFiles: async (
    documentId: string,
    files: File[],
    onProgress?: (progress: number) => void
  ) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await axiosInstance.post(
      `/documents/${documentId}/files`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minutes: allows for slow connections + OCR processing
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentCompleted);
          }
        },
      }
    );
    return response.data;
  },

  // Delete file from document
  deleteFile: async (documentId: string, fileId: string) => {
    const response = await axiosInstance.delete(
      `/documents/${documentId}/files/${fileId}`
    );
    return response.data;
  },

  // Replace file with new version (Phase 3: Versioning)
  replaceFile: async (
    documentId: string,
    fileId: string,
    file: File,
    comment?: string,
    onProgress?: (progress: number) => void
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    if (comment) {
      formData.append('comment', comment);
    }

    const response = await axiosInstance.patch(
      `/documents/${documentId}/files/${fileId}/replace`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentCompleted);
          }
        },
      }
    );
    return response.data;
  },

  // Get file version history (Phase 3: Versioning)
  getVersionHistory: async (fileId: string) => {
    const response = await axiosInstance.get(`/files/${fileId}/versions`);
    return response.data;
  },

  // Restore previous version (Phase 3: Versioning)
  restoreVersion: async (fileId: string, versionNumber: number, comment?: string) => {
    const response = await axiosInstance.post(
      `/files/${fileId}/versions/${versionNumber}/restore`,
      { comment }
    );
    return response.data;
  },

  // Download specific version (Phase 3: Versioning)
  downloadVersion: async (fileId: string, versionNumber: number): Promise<Blob> => {
    const response = await axiosInstance.get(
      `/files/${fileId}/versions/${versionNumber}/download`,
      { responseType: 'blob' }
    );
    return response.data;
  },

  // Cleanup old versions (Phase 3: Versioning - Admin only)
  cleanupVersions: async (fileId: string) => {
    const response = await axiosInstance.post(`/files/${fileId}/versions/cleanup`);
    return response.data;
  },

  // Download file directly (Phase 1: Download)
  downloadFile: async (fileId: string) => {
    const response = await axiosInstance.get(`/files/${fileId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },


  // Generate or regenerate AI content
  generateAI: async (documentId: string, force: boolean = false) => {
    const response = await axiosInstance.post(`/documents/${documentId}/generate-ai`, {
      force,
    });
    return response.data;
  },

  // Generate new document from AI prompt
  generateFromPrompt: async (data: {
    documentType: string;
    prompt: string;
    tone?: string;
    language?: string;
  }): Promise<{ content: string; title: string; metadata: any }> => {
    const response = await axiosInstance.post('/documents/generate-from-prompt', data);
    return response.data;
  },

  // Analyze document with AI
  analyzeDocument: async (
    documentId: string,
    analysisType: string = 'executive_summary'
  ): Promise<{
    summary: string;
    keyTopics: string[];
    requiredActions: string[];
    urgencyLevel: string;
    stakeholders: string[];
    metadata: any;
  }> => {
    const response = await axiosInstance.post(`/documents/${documentId}/analyze`, {
      analysisType,
    });
    return response.data;
  },

  // Phase 3: Manual Entry Stamp
  applyManualEntryStamp: async (
    documentId: string,
    data: {
      entryDate: Date;
      entryTime: string;
      stampImage?: File;
      notes?: string;
    }
  ) => {
    const formData = new FormData();
    formData.append('entryDate', data.entryDate.toISOString());
    formData.append('entryTime', data.entryTime);
    if (data.stampImage) {
      formData.append('stampImage', data.stampImage);
    }
    if (data.notes) {
      formData.append('notes', data.notes);
    }

    const response = await axiosInstance.post(
      `/documents/${documentId}/manual-entry-stamp`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  getManualEntryStamp: async (documentId: string) => {
    const response = await axiosInstance.get(`/documents/${documentId}/manual-entry-stamp`);
    return response.data;
  },

  getManualEntryStats: async () => {
    const response = await axiosInstance.get('/documents/manual-entry-stamp/stats');
    return response.data;
  },

  // Phase 3: Acknowledgment
  recordAcknowledgment: async (
    documentId: string,
    data: {
      acknowledgmentType: 'MANUAL' | 'STAMP' | 'DIGITAL';
      acknowledgmentDate: Date;
      acknowledgedBy: string;
      acknowledgmentFile?: File;
      notes?: string;
    }
  ) => {
    const formData = new FormData();
    formData.append('acknowledgmentType', data.acknowledgmentType);
    formData.append('acknowledgmentDate', data.acknowledgmentDate.toISOString());
    formData.append('acknowledgedBy', data.acknowledgedBy);
    if (data.acknowledgmentFile) {
      formData.append('acknowledgmentFile', data.acknowledgmentFile);
    }
    if (data.notes) {
      formData.append('notes', data.notes);
    }

    const response = await axiosInstance.post(
      `/documents/${documentId}/acknowledgment`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  getAcknowledgment: async (documentId: string) => {
    const response = await axiosInstance.get(`/documents/${documentId}/acknowledgment`);
    return response.data;
  },

  getAcknowledgmentStats: async () => {
    const response = await axiosInstance.get('/documents/acknowledgment/stats');
    return response.data;
  },

  // Phase 3: Signature Protocol
  signDocument: async (
    documentId: string,
    data: {
      signatureType: 'DIGITAL' | 'PHYSICAL' | 'BOTH';
      signatureDate: Date;
      digitalSignature?: File;
      physicalSignatureScan?: File;
      notes?: string;
    }
  ) => {
    const formData = new FormData();
    formData.append('signatureType', data.signatureType);
    formData.append('signatureDate', data.signatureDate.toISOString());
    if (data.digitalSignature) {
      formData.append('digitalSignature', data.digitalSignature);
    }
    if (data.physicalSignatureScan) {
      formData.append('physicalSignatureScan', data.physicalSignatureScan);
    }
    if (data.notes) {
      formData.append('notes', data.notes);
    }

    const response = await axiosInstance.post(
      `/documents/${documentId}/sign`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  applySeal: async (
    documentId: string,
    data: {
      sealDate: Date;
      sealScan?: File;
      appliedBy: string;
      notes?: string;
    }
  ) => {
    const formData = new FormData();
    formData.append('sealDate', data.sealDate.toISOString());
    formData.append('appliedBy', data.appliedBy);
    if (data.sealScan) {
      formData.append('sealScan', data.sealScan);
    }
    if (data.notes) {
      formData.append('notes', data.notes);
    }

    const response = await axiosInstance.post(
      `/documents/${documentId}/seal`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  completeSignatureProtocol: async (documentId: string) => {
    const response = await axiosInstance.post(`/documents/${documentId}/signature-protocol/complete`);
    return response.data;
  },

  getSignatureInfo: async (documentId: string) => {
    const response = await axiosInstance.get(`/documents/${documentId}/signature`);
    return response.data;
  },

  isReadyForSignature: async (documentId: string) => {
    const response = await axiosInstance.get(`/documents/${documentId}/signature/ready`);
    return response.data;
  },

  getSignatureStats: async () => {
    const response = await axiosInstance.get('/documents/signature/stats');
    return response.data;
  },

  // Create document from template
  createFromTemplate: async (data: CreateDocumentFromTemplateDto) => {
    const response = await axiosInstance.post('/documents/from-template', data);
    return response.data;
  },

  // Translate document content
  translateDocument: async (documentId: string, targetLanguage: string) => {
    const response = await axiosInstance.post(`/documents/${documentId}/translate`, { targetLanguage });
    return response.data;
  },

  // Get workflow statistics for the dashboard statistics card
  getWorkflowStats: async () => {
    const response = await axiosInstance.get('/documents/workflow-stats');
    return response.data;
  },

  // Security: Get flagged files (admin/gabinete only)
  getFlaggedFiles: async () => {
    const response = await axiosInstance.get('/files/security/flagged');
    return response.data;
  },

  // Security: Get security statistics (admin/gabinete only)
  getSecurityStats: async () => {
    const response = await axiosInstance.get('/files/security/stats');
    return response.data;
  },

  // Security: Review and approve/reject a flagged file
  reviewFileSecurity: async (fileId: string, approved: boolean) => {
    const response = await axiosInstance.post(`/files/${fileId}/security/review`, { approved });
    return response.data;
  },
};
