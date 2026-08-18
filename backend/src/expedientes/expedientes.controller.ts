import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ExpedientesService } from './expedientes.service';
import { CreateExpedienteDto } from './dto/create-expediente.dto';
import { UpdateExpedienteDto } from './dto/update-expediente.dto';
import { QueryExpedienteDto } from './dto/query-expediente.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Expedientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('expedientes')
export class ExpedientesController {
  constructor(private readonly expedientesService: ExpedientesService) {}

  @Post()
  @Roles('ADMIN', 'GABINETE', 'REVISOR')
  @ApiOperation({ summary: 'Create a new expediente' })
  @ApiResponse({ status: 201, description: 'Expediente created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createExpedienteDto: CreateExpedienteDto) {
    return this.expedientesService.create(createExpedienteDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all expedientes with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Return all expedientes' })
  findAll(@Query() query: QueryExpedienteDto) {
    return this.expedientesService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get expedientes statistics' })
  @ApiResponse({ status: 200, description: 'Return expedientes stats' })
  getStats() {
    return this.expedientesService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get expediente by ID' })
  @ApiResponse({ status: 200, description: 'Return expediente details' })
  @ApiResponse({ status: 404, description: 'Expediente not found' })
  findOne(@Param('id') id: string) {
    return this.expedientesService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'GABINETE', 'REVISOR')
  @ApiOperation({ summary: 'Update expediente' })
  @ApiResponse({ status: 200, description: 'Expediente updated successfully' })
  @ApiResponse({ status: 404, description: 'Expediente not found' })
  update(
    @Param('id') id: string,
    @Body() updateExpedienteDto: UpdateExpedienteDto,
  ) {
    return this.expedientesService.update(id, updateExpedienteDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'GABINETE')
  @ApiOperation({ summary: 'Archive expediente (soft delete)' })
  @ApiResponse({ status: 200, description: 'Expediente archived successfully' })
  @ApiResponse({ status: 404, description: 'Expediente not found' })
  remove(@Param('id') id: string) {
    return this.expedientesService.remove(id);
  }
}
