import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { CreateAgendaEventDto, UpdateAgendaEventDto } from './dto/create-agenda-event.dto';

@Injectable()
export class AgendaService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => WhatsappService))
    private whatsapp: WhatsappService,
  ) {}

  private readonly creatorSelect = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
  };

  async findAll(filters?: { type?: string; status?: string; startDate?: string; endDate?: string }) {
    const where: any = {};
    if (filters?.type) where.type = filters.type;
    if (filters?.status) where.status = filters.status;
    if (filters?.startDate || filters?.endDate) {
      where.startDate = {};
      if (filters.startDate) where.startDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.startDate.lte = new Date(filters.endDate);
    }

    return this.prisma.agendaEvent.findMany({
      where,
      include: { createdBy: { select: this.creatorSelect } },
      orderBy: { startDate: 'asc' },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.agendaEvent.findUnique({
      where: { id },
      include: { createdBy: { select: this.creatorSelect } },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');
    return event;
  }

  async getUpcoming() {
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return this.prisma.agendaEvent.findMany({
      where: {
        startDate: { gte: now, lte: thirtyDays },
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      },
      include: { createdBy: { select: this.creatorSelect } },
      orderBy: { startDate: 'asc' },
    });
  }

  async create(dto: CreateAgendaEventDto, userId: string) {
    const created = await this.prisma.agendaEvent.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type as any,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        location: dto.location,
        organizer: dto.organizer,
        participants: dto.participants,
        priority: (dto.priority as any) || 'MEDIUM',
        notes: dto.notes,
        createdById: userId,
      },
      include: { createdBy: { select: this.creatorSelect } },
    });

    // Push WhatsApp notification to all staff (non-blocking)
    this.whatsapp.notifyNewAgendaEvent({
      title: created.title,
      startDate: created.startDate,
      type: created.type,
      location: created.location ?? undefined,
      description: created.description ?? undefined,
    }).catch(() => {});

    return created;
  }

  async update(id: string, dto: UpdateAgendaEventDto) {
    await this.findOne(id);
    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.organizer !== undefined) data.organizer = dto.organizer;
    if (dto.participants !== undefined) data.participants = dto.participants;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.notes !== undefined) data.notes = dto.notes;

    return this.prisma.agendaEvent.update({
      where: { id },
      data,
      include: { createdBy: { select: this.creatorSelect } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.agendaEvent.delete({ where: { id } });
  }
}
