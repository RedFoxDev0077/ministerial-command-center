import { Module } from '@nestjs/common';
import { DeadlinesService } from './deadlines.service';
import { DeadlinesController } from './deadlines.controller';
import { DeadlineSchedulerService } from './deadline-scheduler.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BusinessHoursService } from '../common/utils/business-hours.util';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [DeadlinesController],
  providers: [DeadlinesService, DeadlineSchedulerService, BusinessHoursService],
  exports: [DeadlinesService, DeadlineSchedulerService],
})
export class DeadlinesModule {}
