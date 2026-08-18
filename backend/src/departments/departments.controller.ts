import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('departments')
@Controller('departments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DepartmentsController {
  constructor(private departmentsService: DepartmentsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all departments (public for registration)' })
  findAll() {
    return this.departmentsService.findAll();
  }

  @Get('hierarchy')
  @ApiOperation({ summary: 'Get department hierarchy tree' })
  getHierarchy() {
    return this.departmentsService.getHierarchy();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get department by ID' })
  @ApiParam({ name: 'id', description: 'Department ID' })
  @ApiResponse({ status: 200, description: 'Department retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Get(':id/users')
  @ApiOperation({ summary: 'Get all users in a department' })
  @ApiParam({ name: 'id', description: 'Department ID' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  getUsersByDepartment(@Param('id') id: string) {
    return this.departmentsService.getUsersByDepartment(id);
  }

  @Get(':id/tree')
  @ApiOperation({ summary: 'Get department subtree (all children recursively)' })
  @ApiParam({ name: 'id', description: 'Department ID' })
  @ApiResponse({ status: 200, description: 'Department tree retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  getDepartmentTree(@Param('id') id: string) {
    return this.departmentsService.getDepartmentTree(id);
  }
}
