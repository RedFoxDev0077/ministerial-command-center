import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WebSocketService } from './websocket.service';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: '*', // In production, set this to your frontend URL
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly websocketService: WebSocketService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.websocketService.setServer(server);
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake auth or query
      const token = client.handshake.auth.token || client.handshake.query.token;

      if (!token) {
        this.logger.warn(`Client ${client.id} attempted connection without token`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = await this.jwtService.verifyAsync(token, { secret });

      if (!payload || !payload.sub) {
        this.logger.warn(`Client ${client.id} provided invalid token`);
        client.disconnect();
        return;
      }

      // Store user info in socket data
      client.data.userId = payload.sub;
      client.data.email = payload.email;
      client.data.role = payload.role;

      // Register socket with user
      this.websocketService.registerUserSocket(payload.sub, client.id);

      // Join user-specific room
      client.join(`user:${payload.sub}`);

      this.logger.log(`Client ${client.id} connected as user ${payload.sub}`);

      // Send connection confirmation
      client.emit('connected', {
        message: 'Successfully connected to notification service',
        userId: payload.sub,
      });
    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.websocketService.unregisterUserSocket(userId, client.id);
      this.logger.log(`Client ${client.id} (user ${userId}) disconnected`);
    } else {
      this.logger.log(`Client ${client.id} disconnected`);
    }
  }

  // Allow clients to subscribe to specific document updates
  @SubscribeMessage('subscribe:document')
  handleSubscribeDocument(
    @MessageBody() data: { documentId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `document:${data.documentId}`;
    client.join(room);
    this.logger.debug(`Client ${client.id} subscribed to ${room}`);
    return { success: true, room };
  }

  // Allow clients to unsubscribe from document updates
  @SubscribeMessage('unsubscribe:document')
  handleUnsubscribeDocument(
    @MessageBody() data: { documentId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `document:${data.documentId}`;
    client.leave(room);
    this.logger.debug(`Client ${client.id} unsubscribed from ${room}`);
    return { success: true, room };
  }

  // Ping/pong for connection health check
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    return { event: 'pong', data: { timestamp: new Date() } };
  }

  // Get connection stats (admin only)
  @SubscribeMessage('stats')
  handleStats(@ConnectedSocket() client: Socket) {
    if (client.data.role !== 'ADMIN') {
      return { error: 'Unauthorized' };
    }

    return {
      connectedUsers: this.websocketService.getConnectedUsersCount(),
      userIds: this.websocketService.getConnectedUserIds(),
    };
  }
}
