import { axiosInstance } from './axios';

export interface BestFrame {
  filename: string;
}

export interface MediaTranscription {
  id: string;
  fileName: string;
  fileType: string;
  mimeType: string;
  fileSize?: number;
  duration?: number;
  transcription?: string;
  summary?: string;
  language?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  errorMessage?: string;
  translation?: string | null;
  translationLang?: string | null;
  technicalOpinion?: string | null;
  socialPost?: string | null;
  bestFrames?: BestFrame[] | null;
  framesStatus?: string | null;
  createdBy: { id: string; firstName: string; lastName: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export const multimediaApi = {
  getAll: async () => {
    const response = await axiosInstance.get('/multimedia');
    return response.data as MediaTranscription[];
  },
  getOne: async (id: string) => {
    const response = await axiosInstance.get(`/multimedia/${id}`);
    return response.data as MediaTranscription;
  },
  transcribe: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post('/multimedia/transcribe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 600000, // 10 min for large videos
    });
    return response.data as MediaTranscription;
  },
  generateSummary: async (id: string) => {
    const response = await axiosInstance.post(`/multimedia/${id}/summary`);
    return response.data as MediaTranscription;
  },
  generateSocialPost: async (id: string) => {
    const response = await axiosInstance.post(`/multimedia/${id}/social-post`, {}, { timeout: 120000 });
    return response.data as MediaTranscription;
  },
  translate: async (id: string, language: string) => {
    const response = await axiosInstance.post(`/multimedia/${id}/translate`, { language }, { timeout: 120000 });
    return response.data as MediaTranscription;
  },
  generateTechnicalOpinion: async (id: string) => {
    const response = await axiosInstance.post(`/multimedia/${id}/technical-opinion`, {}, { timeout: 120000 });
    return response.data as MediaTranscription;
  },
  extractFrames: async (id: string) => {
    const response = await axiosInstance.post(`/multimedia/${id}/extract-frames`, {}, { timeout: 300000 });
    return response.data as MediaTranscription;
  },
  getFrameUrl: (id: string, filename: string) => {
    // Nginx serves /uploads/* statically — no auth token needed for <img> tags
    const apiBase = axiosInstance.defaults.baseURL || 'http://localhost:3000/api';
    const serverBase = apiBase.replace(/\/api$/, '');
    return `${serverBase}/uploads/multimedia/frames/${id}/${filename}`;
  },
  remove: async (id: string) => {
    const response = await axiosInstance.delete(`/multimedia/${id}`);
    return response.data;
  },
};
