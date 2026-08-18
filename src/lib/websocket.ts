import { io, Socket } from 'socket.io-client';

export interface WebSocketNotification {
  type: 'DOCUMENT_DECREED' | 'DOCUMENT_ASSIGNED' | 'STATUS_CHANGED' | 'COMMENT_ADDED' | 'SIGNATURE_REQUIRED' | 'DEADLINE_REMINDER';
  documentId: number;
  title: string;
  message: string;
  timestamp: Date;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  metadata?: Record<string, any>;
}

class WebSocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<Function>> = new Map();

  /**
   * Connect to WebSocket server
   */
  connect(token: string) {
    if (this.socket?.connected) {
      console.log('[WebSocket] Already connected');
      return;
    }

    // Get base URL from VITE_API_URL, removing /api suffix if present
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const wsUrl = apiUrl.replace(/\/api$/, '');

    console.log('[WebSocket] Connecting to:', `${wsUrl}/notifications`);

    this.socket = io(`${wsUrl}/notifications`, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    });

    this.setupEventListeners();
    console.log('[WebSocket] Connecting...');
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('[WebSocket] Disconnected');
    }
    this.listeners.clear();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Subscribe to notifications
   */
  onNotification(callback: (notification: WebSocketNotification) => void) {
    this.addEventListener('notification', callback);
    return () => this.removeEventListener('notification', callback);
  }

  /**
   * Subscribe to connection events
   */
  onConnect(callback: () => void) {
    this.addEventListener('connected', callback);
    return () => this.removeEventListener('connected', callback);
  }

  /**
   * Subscribe to disconnection events
   */
  onDisconnect(callback: () => void) {
    this.addEventListener('disconnect', callback);
    return () => this.removeEventListener('disconnect', callback);
  }

  /**
   * Subscribe to error events
   */
  onError(callback: (error: any) => void) {
    this.addEventListener('connect_error', callback);
    return () => this.removeEventListener('connect_error', callback);
  }

  /**
   * Subscribe to specific document updates
   */
  subscribeToDocument(documentId: number) {
    if (!this.socket?.connected) {
      console.warn('[WebSocket] Cannot subscribe - not connected');
      return;
    }

    this.socket.emit('subscribe:document', { documentId });
    console.log(`[WebSocket] Subscribed to document ${documentId}`);
  }

  /**
   * Unsubscribe from specific document updates
   */
  unsubscribeFromDocument(documentId: number) {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit('unsubscribe:document', { documentId });
    console.log(`[WebSocket] Unsubscribed from document ${documentId}`);
  }

  /**
   * Send ping to check connection
   */
  ping() {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit('ping');
  }

  /**
   * Setup internal event listeners
   */
  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connected', (data) => {
      console.log('[WebSocket] Connected:', data);
      this.reconnectAttempts = 0;
      this.emit('connected', data);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      this.emit('disconnect', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
      this.reconnectAttempts++;
      this.emit('connect_error', error);

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[WebSocket] Max reconnection attempts reached');
        this.disconnect();
      }
    });

    this.socket.on('notification', (notification: WebSocketNotification) => {
      console.log('[WebSocket] Notification received:', notification);
      this.emit('notification', notification);
    });

    this.socket.on('pong', (data) => {
      console.log('[WebSocket] Pong received:', data);
    });
  }

  /**
   * Add event listener
   */
  private addEventListener(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  private removeEventListener(event: string, callback: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: string, data?: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => callback(data));
    }
  }
}

// Singleton instance
export const websocketClient = new WebSocketClient();
