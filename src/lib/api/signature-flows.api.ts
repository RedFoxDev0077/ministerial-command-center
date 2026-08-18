import { axiosInstance } from './axios';

export enum SignatureStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  SIGNED = 'SIGNED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum ParticipantStatus {
  PENDING = 'PENDING',
  SIGNED = 'SIGNED',
  REJECTED = 'REJECTED',
}

export interface SignatureParticipant {
  id: string;
  flowId: string;
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  order: number;
  role: string;
  status: ParticipantStatus;
  signedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  signatureData: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SignatureFlow {
  id: string;
  documentId: string;
  document: {
    id: string;
    title: string;
    correlativeNumber: string;
    type: string;
    stage: string;
    expedienteId?: string;
    expediente?: {
      id: string;
      code: string;
      title: string;
    };
  };
  title: string;
  description: string | null;
  status: SignatureStatus;
  createdById: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  signedPdfPath: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  participants: SignatureParticipant[];
}

export interface CreateSignatureFlowDto {
  documentId: string;
  title?: string;
  description?: string;
  userIds: string[];
  sendNotification?: boolean;
  notificationMethod?: 'EMAIL' | 'WHATSAPP' | 'BOTH';
  message?: string;
}

export interface SignDocumentDto {
  signatureData?: string;
  comment?: string;
}

export interface RejectDocumentDto {
  rejectionReason: string;
}

export interface GetSignatureFlowsParams {
  status?: SignatureStatus;
  participantId?: string;
}

/**
 * Create a new signature flow
 */
export async function createSignatureFlow(dto: CreateSignatureFlowDto): Promise<SignatureFlow> {
  const response = await axiosInstance.post('/signature-flows', dto);
  return response.data;
}

/**
 * Get all signature flows with optional filters
 */
export async function getSignatureFlows(params?: GetSignatureFlowsParams): Promise<SignatureFlow[]> {
  const response = await axiosInstance.get('/signature-flows', { params });
  return response.data;
}

/**
 * Get signature flow by ID
 */
export async function getSignatureFlowById(id: string): Promise<SignatureFlow> {
  const response = await axiosInstance.get(`/signature-flows/${id}`);
  return response.data;
}

/**
 * Sign a document in a signature flow
 */
export async function signDocument(flowId: string, dto: SignDocumentDto): Promise<SignatureFlow> {
  const response = await axiosInstance.post(`/signature-flows/${flowId}/sign`, dto);
  return response.data;
}

/**
 * Reject a document in a signature flow
 */
export async function rejectDocument(flowId: string, dto: RejectDocumentDto): Promise<SignatureFlow> {
  const response = await axiosInstance.post(`/signature-flows/${flowId}/reject`, dto);
  return response.data;
}

/**
 * Cancel a signature flow (creator only)
 */
export async function cancelSignatureFlow(flowId: string): Promise<SignatureFlow> {
  const response = await axiosInstance.delete(`/signature-flows/${flowId}`);
  return response.data;
}
