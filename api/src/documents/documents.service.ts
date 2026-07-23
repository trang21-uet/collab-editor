import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  create(ownerId: string, title: string) {
    return this.prisma.document.create({
      data: {
        title,
        ownerId,
        permissions: {
          create: { userId: ownerId, role: Role.owner },
        },
      },
    });
  }

  findAllForUser(userId: string) {
    return this.prisma.document.findMany({
      where: { permissions: { some: { userId } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const document = await this.prisma.document.findUnique({ where: { id } });
    if (!document) throw new NotFoundException('Document not found');
    return document;
  }

  update(id: string, data: { title?: string }) {
    return this.prisma.document.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.document.delete({ where: { id } });
  }
}
