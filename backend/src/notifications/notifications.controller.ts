import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for current user' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  findAll(@Request() req, @Query() queryDto: QueryNotificationDto) {
    return this.notificationsService.findAll(req.user.id, queryDto);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
  getUnreadCount(@Request() req) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  markAsRead(@Param('id') id: string, @Request() req) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  markAllAsRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Patch(':id/mute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mute a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification muted' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  muteNotification(@Param('id') id: string, @Request() req) {
    return this.notificationsService.muteNotification(id, req.user.id);
  }

  @Patch(':id/unmute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unmute a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification unmuted' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  unmuteNotification(@Param('id') id: string, @Request() req) {
    return this.notificationsService.unmuteNotification(id, req.user.id);
  }

  @Patch('mute-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mute all notifications' })
  @ApiResponse({ status: 200, description: 'All notifications muted' })
  muteAllNotifications(@Request() req) {
    return this.notificationsService.muteAllNotifications(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  remove(@Param('id') id: string, @Request() req) {
    return this.notificationsService.remove(id, req.user.id);
  }

  @Delete('read/all')
  @ApiOperation({ summary: 'Delete all read notifications' })
  @ApiResponse({ status: 200, description: 'Read notifications deleted successfully' })
  removeAllRead(@Request() req) {
    return this.notificationsService.removeAllRead(req.user.id);
  }
}
