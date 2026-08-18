import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.department.findMany({
      where: { isActive: true },
      orderBy: [{ level: 'asc' }, { order: 'asc' }],
      include: {
        parent: true,
        _count: {
          select: { users: true },
        },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.department.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            position: true,
          },
        },
      },
    });
  }

  async getHierarchy() {
    // Get root departments (level 1)
    const rootDepts = await this.prisma.department.findMany({
      where: {
        level: 1,
        isActive: true,
      },
      include: {
        children: {
          include: {
            children: {
              include: {
                children: true,
              },
            },
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    return rootDepts;
  }

  async getUsersByDepartment(id: string) {
    // Check if department exists
    const department = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      throw new NotFoundException('Departamento no encontrado');
    }

    // Get all active users in the department
    const users = await this.prisma.user.findMany({
      where: {
        departmentId: id,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        position: true,
        role: true,
        phone: true,
        whatsapp: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: [
        { role: 'asc' }, // Admin first, then others
        { lastName: 'asc' },
      ],
    });

    return {
      department: {
        id: department.id,
        name: department.name,
        shortName: department.shortName,
        level: department.level,
      },
      users,
      totalUsers: users.length,
    };
  }

  async getDepartmentTree(id: string) {
    // Check if department exists
    const department = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      throw new NotFoundException('Departamento no encontrado');
    }

    // Recursively fetch the department tree
    const buildTree = async (deptId: string): Promise<any> => {
      const dept = await this.prisma.department.findUnique({
        where: { id: deptId },
        include: {
          children: {
            where: { isActive: true },
            orderBy: { order: 'asc' },
          },
          _count: {
            select: { users: true },
          },
        },
      });

      if (!dept) return null;

      // Recursively build children
      const childrenWithTree = await Promise.all(
        dept.children.map(async (child) => await buildTree(child.id))
      );

      return {
        id: dept.id,
        name: dept.name,
        shortName: dept.shortName,
        level: dept.level,
        description: dept.description,
        userCount: dept._count.users,
        children: childrenWithTree.filter((c) => c !== null),
      };
    };

    return await buildTree(id);
  }
}
