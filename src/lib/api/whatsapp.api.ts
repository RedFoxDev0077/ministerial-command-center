import { axiosInstance } from './axios';

export interface WaStatus {
  status: 'DISCONNECTED' | 'QR_READY' | 'INITIALIZING' | 'CONNECTED';
  qr: string | null;
  connectedPhone: string | null;
}

export interface WaActivity {
  timestamp: string;
  phone: string;
  userName?: string;
  message: string;
  response: string;
}

export interface WaUser {
  id: string;
  firstName: string;
  lastName: string;
  whatsapp: string | null;
  phone: string | null;
  role: string;
}

export const whatsappApi = {
  getStatus: (): Promise<WaStatus> =>
    axiosInstance.get('/whatsapp/status').then((r) => r.data),

  getActivity: (): Promise<{ activity: WaActivity[] }> =>
    axiosInstance.get('/whatsapp/activity').then((r) => r.data),

  getUsers: (): Promise<{ users: WaUser[] }> =>
    axiosInstance.get('/whatsapp/users').then((r) => r.data),

  disconnect: (): Promise<{ success: boolean }> =>
    axiosInstance.post('/whatsapp/disconnect').then((r) => r.data),

  reconnect: (): Promise<{ success: boolean }> =>
    axiosInstance.post('/whatsapp/reconnect').then((r) => r.data),
};
