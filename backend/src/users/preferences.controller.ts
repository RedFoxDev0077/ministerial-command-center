import { Controller, Get, Patch, Body, UseGuards, Request, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PreferencesService } from './preferences.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('User Preferences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('preferences')
export class PreferencesController {
  constructor(private preferencesService: PreferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user preferences' })
  @ApiResponse({ status: 200, description: 'Preferences retrieved successfully' })
  getPreferences(@Request() req) {
    return this.preferencesService.getPreferences(req.user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update current user preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  updatePreferences(@Request() req, @Body() dto: UpdatePreferencesDto) {
    return this.preferencesService.updatePreferences(req.user.id, dto);
  }

  @Post('reset')
  @ApiOperation({ summary: 'Reset preferences to default' })
  @ApiResponse({ status: 200, description: 'Preferences reset successfully' })
  resetPreferences(@Request() req) {
    return this.preferencesService.resetPreferences(req.user.id);
  }
}
