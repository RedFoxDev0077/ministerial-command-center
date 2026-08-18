import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { DeadlinesService } from './deadlines.service';
import { DeadlineSchedulerService } from './deadline-scheduler.service';
import { CreateDeadlineDto } from './dto/create-deadline.dto';
import { UpdateDeadlineDto } from './dto/update-deadline.dto';
import { QueryDeadlineDto } from './dto/query-deadline.dto';
import { CalculateDeadlineDto } from './dto/calculate-deadline.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { BusinessHoursService } from '../common/utils/business-hours.util';
import { addDays } from 'date-fns';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Deadlines')
@ApiBearerAuth()
@Controller('deadlines')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeadlinesController {
  constructor(
    private readonly deadlinesService: DeadlinesService,
    private readonly deadlineSchedulerService: DeadlineSchedulerService,
    private readonly businessHoursService: BusinessHoursService,
  ) {}

  @Post()
  @Roles('ADMIN', 'GABINETE', 'REVISOR')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new deadline' })
  @ApiResponse({ status: 201, description: 'Deadline created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Related document or expediente not found' })
  create(@Body() createDeadlineDto: CreateDeadlineDto) {
    return this.deadlinesService.create(createDeadlineDto);
  }

  @Get()
  @Roles('ADMIN', 'GABINETE', 'REVISOR', 'LECTOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all deadlines with optional filters' })
  @ApiResponse({ status: 200, description: 'List of deadlines retrieved successfully' })
  findAll(@Query() queryDto: QueryDeadlineDto) {
    return this.deadlinesService.findAll(queryDto);
  }

  @Get(':id')
  @Roles('ADMIN', 'GABINETE', 'REVISOR', 'LECTOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a deadline by ID' })
  @ApiResponse({ status: 200, description: 'Deadline retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Deadline not found' })
  findOne(@Param('id') id: string) {
    return this.deadlinesService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'GABINETE', 'REVISOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a deadline' })
  @ApiResponse({ status: 200, description: 'Deadline updated successfully' })
  @ApiResponse({ status: 404, description: 'Deadline not found' })
  update(@Param('id') id: string, @Body() updateDeadlineDto: UpdateDeadlineDto) {
    return this.deadlinesService.update(id, updateDeadlineDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'GABINETE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a deadline' })
  @ApiResponse({ status: 200, description: 'Deadline deleted successfully' })
  @ApiResponse({ status: 404, description: 'Deadline not found' })
  remove(@Param('id') id: string) {
    return this.deadlinesService.remove(id);
  }

  @Post(':id/complete')
  @Roles('ADMIN', 'GABINETE', 'REVISOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a deadline as completed' })
  @ApiResponse({ status: 200, description: 'Deadline marked as completed' })
  @ApiResponse({ status: 404, description: 'Deadline not found' })
  complete(@Param('id') id: string) {
    return this.deadlinesService.complete(id);
  }

  @Post('update-overdue')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update overdue deadlines status (admin only)' })
  @ApiResponse({ status: 200, description: 'Overdue deadlines updated successfully' })
  updateOverdue() {
    return this.deadlinesService.updateOverdueDeadlines();
  }

  @Post('check-notifications')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger deadline notification check (admin only)' })
  @ApiResponse({ status: 200, description: 'Deadline notifications checked successfully' })
  checkNotifications() {
    return this.deadlineSchedulerService.manualDeadlineCheck();
  }

  @Post('calculate')
  @Roles('ADMIN', 'GABINETE', 'REVISOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate deadline date based on business hours or calendar days' })
  @ApiResponse({ status: 200, description: 'Deadline calculated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid calculation type or quantity' })
  calculateDeadline(@Body() calculateDeadlineDto: CalculateDeadlineDto) {
    const { deadlineType, quantity } = calculateDeadlineDto;
    const now = new Date();
    let dueDate: Date;

    if (deadlineType === 'BUSINESS_HOURS') {
      // Calculate based on business hours (8 AM - 6 PM, Mon-Fri, excluding holidays)
      dueDate = this.businessHoursService.addBusinessHours(now, quantity);
    } else if (deadlineType === 'CALENDAR_DAYS') {
      // Calculate based on calendar days (simply add days)
      dueDate = addDays(now, quantity);
    } else {
      throw new Error('Invalid deadline type. Must be BUSINESS_HOURS or CALENDAR_DAYS');
    }

    return {
      deadlineType,
      quantity,
      startDate: now.toISOString(),
      dueDate: dueDate.toISOString(),
      calculatedAt: new Date().toISOString(),
    };
  }
}
