import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Injectable()
export class PreferencesService {
  private readonly logger = new Logger(PreferencesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get user preferences (create default if not exists)
   */
  async getPreferences(userId: string) {
    let preferences = await this.prisma.userPreferences.findUnique({
      where: { userId },
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await this.prisma.userPreferences.create({
        data: {
          userId,
          language: 'es',
          timezone: 'Africa/Malabo',
          reminder48hBefore: true,
          escalateOverdue: true,
          emailNotifications: true,
          dailySummary: false,
        },
      });
      this.logger.log(`Created default preferences for user ${userId}`);
    }

    return preferences;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    // Ensure preferences exist
    await this.getPreferences(userId);

    const updated = await this.prisma.userPreferences.update({
      where: { userId },
      data: dto,
    });

    this.logger.log(`Updated preferences for user ${userId}`);
    return updated;
  }

  /**
   * Reset preferences to default
   */
  async resetPreferences(userId: string) {
    return this.prisma.userPreferences.upsert({
      where: { userId },
      update: {
        language: 'es',
        timezone: 'Africa/Malabo',
        reminder48hBefore: true,
        escalateOverdue: true,
        emailNotifications: true,
        dailySummary: false,
      },
      create: {
        userId,
        language: 'es',
        timezone: 'Africa/Malabo',
        reminder48hBefore: true,
        escalateOverdue: true,
        emailNotifications: true,
        dailySummary: false,
      },
    });
  }
}
