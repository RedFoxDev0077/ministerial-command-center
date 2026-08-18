import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';

@Injectable()
export class EntitiesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.entity.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.entity.findUnique({
      where: { id },
      include: {
        _count: {
          select: { documents: true },
        },
      },
    });
  }

  async create(createEntityDto: CreateEntityDto) {
    // Create entity
    const entity = await this.prisma.entity.create({
      data: {
        name: createEntityDto.name,
        shortName: createEntityDto.shortName,
        type: createEntityDto.type as any,
        classification: createEntityDto.classification as any,
        address: createEntityDto.address,
        phone: createEntityDto.phone,
        email: createEntityDto.email,
        website: createEntityDto.website,
        description: createEntityDto.description,
        isActive: true,
      },
    });

    return entity;
  }

  async update(id: string, updateEntityDto: UpdateEntityDto) {
    // Check if entity exists
    const entity = await this.prisma.entity.findUnique({
      where: { id },
    });

    if (!entity) {
      throw new NotFoundException('Entidad no encontrada');
    }

    // Update entity
    const updatedEntity = await this.prisma.entity.update({
      where: { id },
      data: {
        name: updateEntityDto.name,
        shortName: updateEntityDto.shortName,
        type: updateEntityDto.type as any,
        classification: updateEntityDto.classification as any,
        address: updateEntityDto.address,
        phone: updateEntityDto.phone,
        email: updateEntityDto.email,
        website: updateEntityDto.website,
        description: updateEntityDto.description,
      },
    });

    return updatedEntity;
  }

  async remove(id: string) {
    // Check if entity exists
    const entity = await this.prisma.entity.findUnique({
      where: { id },
      include: {
        _count: {
          select: { documents: true },
        },
      },
    });

    if (!entity) {
      throw new NotFoundException('Entidad no encontrada');
    }

    // Check if entity has documents
    if (entity._count.documents > 0) {
      throw new BadRequestException(
        `No se puede eliminar la entidad porque tiene ${entity._count.documents} documentos asociados. Desactívela en su lugar.`
      );
    }

    // Soft delete (deactivate)
    const deactivatedEntity = await this.prisma.entity.update({
      where: { id },
      data: { isActive: false },
    });

    return {
      ...deactivatedEntity,
      message: 'Entidad desactivada exitosamente',
    };
  }
}
