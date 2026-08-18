import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      include: {
        department: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        department: true,
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Check if email is being changed and if it's already in use
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('El correo electrónico ya está en uso');
      }
    }

    // Hash password if it's being updated
    const data: any = { ...updateUserDto };
    if (updateUserDto.password) {
      data.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
      include: {
        department: true,
      },
    });

    // Remove password from response
    const { password, ...result } = updatedUser;
    return result;
  }

  async create(createUserDto: CreateUserDto) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está en uso');
    }

    // Verify department exists
    const department = await this.prisma.department.findUnique({
      where: { id: createUserDto.departmentId },
    });

    if (!department) {
      throw new NotFoundException('Departamento no encontrado');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        password: hashedPassword,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        position: createUserDto.position,
        phone: createUserDto.phone,
        whatsapp: createUserDto.whatsapp,
        role: createUserDto.role as any,
        departmentId: createUserDto.departmentId,
        isActive: true,
      },
      include: {
        department: true,
      },
    });

    // Remove password from response
    const { password, ...result } = user;
    return result;
  }

  async deactivate(id: string) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!user.isActive) {
      throw new BadRequestException('El usuario ya está desactivado');
    }

    // Deactivate user (soft delete)
    const deactivatedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      include: {
        department: true,
      },
    });

    // Remove password from response
    const { password, ...result } = deactivatedUser;
    return {
      ...result,
      message: 'Usuario desactivado exitosamente',
    };
  }

  async activate(id: string) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.isActive) {
      throw new BadRequestException('El usuario ya está activo');
    }

    // Activate user
    const activatedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: true },
      include: {
        department: true,
      },
    });

    // Remove password from response
    const { password, ...result } = activatedUser;
    return {
      ...result,
      message: 'Usuario reactivado exitosamente',
    };
  }
}
