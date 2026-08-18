import { axiosInstance } from './axios';

export interface ChatRequest {
  message: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export interface ChatResponse {
  response: string;
}

export const assistantApi = {
  /**
   * Send a message to the virtual assistant
   */
  chat: async (data: ChatRequest): Promise<ChatResponse> => {
    const response = await axiosInstance.post<ChatResponse>(
      '/assistant/chat',
      data
    );
    return response.data;
  },
};
