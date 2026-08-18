import { useEffect, useCallback, useState } from 'react';
import { websocketClient, WebSocketNotification } from '@/lib/websocket';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  showToastNotifications?: boolean;
  onNotification?: (notification: WebSocketNotification) => void;
}

/**
 * React hook for WebSocket notifications
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    autoConnect = true,
    showToastNotifications = true,
    onNotification,
  } = options;

  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState<WebSocketNotification | null>(null);

  // Connect to WebSocket
  const connect = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.warn('[useWebSocket] No access token found');
      return;
    }

    websocketClient.connect(token);
  }, []);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    websocketClient.disconnect();
  }, []);

  // Subscribe to a document
  const subscribeToDocument = useCallback((documentId: number) => {
    websocketClient.subscribeToDocument(documentId);
  }, []);

  // Unsubscribe from a document
  const unsubscribeFromDocument = useCallback((documentId: number) => {
    websocketClient.unsubscribeFromDocument(documentId);
  }, []);

  // Handle notifications
  const handleNotification = useCallback(
    (notification: WebSocketNotification) => {
      setLastNotification(notification);

      // Show toast notification if enabled
      if (showToastNotifications) {
        const priorityEmoji = {
          URGENT: '🚨',
          HIGH: '⚠️',
          MEDIUM: 'ℹ️',
          LOW: '📄',
        };

        const emoji = priorityEmoji[notification.priority || 'MEDIUM'];

        toast.info(`${emoji} ${notification.title}`, {
          description: notification.message,
          duration: 5000,
          action: notification.documentId ? {
            label: 'Ver',
            onClick: () => {
              window.location.href = `/documents/${notification.documentId}`;
            },
          } : undefined,
        });
      }

      // Call custom callback if provided
      if (onNotification) {
        onNotification(notification);
      }
    },
    [showToastNotifications, onNotification]
  );

  // Setup WebSocket connection and event listeners
  useEffect(() => {
    if (!user || !autoConnect) {
      return;
    }

    // Connect
    connect();

    // Setup event listeners
    const unsubscribeNotification = websocketClient.onNotification(handleNotification);
    const unsubscribeConnect = websocketClient.onConnect(() => {
      console.log('[useWebSocket] Connected');
      setIsConnected(true);
    });
    const unsubscribeDisconnect = websocketClient.onDisconnect(() => {
      console.log('[useWebSocket] Disconnected');
      setIsConnected(false);
    });
    const unsubscribeError = websocketClient.onError((error) => {
      console.error('[useWebSocket] Error:', error);
      setIsConnected(false);
    });

    // Cleanup
    return () => {
      unsubscribeNotification();
      unsubscribeConnect();
      unsubscribeDisconnect();
      unsubscribeError();
      disconnect();
    };
  }, [user, autoConnect, connect, disconnect, handleNotification]);

  return {
    isConnected,
    lastNotification,
    connect,
    disconnect,
    subscribeToDocument,
    unsubscribeFromDocument,
  };
}
