import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('status')
  getStatus() {
    return {
      status: this.whatsappService.getStatus(),
      qr: this.whatsappService.getQrDataUrl(),
      connectedPhone: this.whatsappService.getConnectedPhone(),
    };
  }

  @Get('activity')
  getActivity() {
    return { activity: this.whatsappService.getActivityLog() };
  }

  @Get('users')
  async getRegisteredUsers() {
    return { users: await this.whatsappService.getRegisteredUsers() };
  }

  @Post('broadcast')
  async broadcast(@Body() body: { message: string; roles?: string[] }) {
    const sent = await this.whatsappService.broadcast(body.message, body.roles);
    return { success: true, sent };
  }

  @Post('disconnect')
  async disconnect() {
    await this.whatsappService.disconnect();
    return { success: true };
  }

  @Post('reconnect')
  async reconnect() {
    await this.whatsappService.reconnect();
    return { success: true, message: 'Reconnecting...' };
  }
}
