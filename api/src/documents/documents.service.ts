import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
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

  // Metadata only (version, savedAt) — the raw ydocState bytes stay internal to
  // sync-server, nothing outside it needs the actual CRDT state.
  listVersions(documentId: string) {
    return this.prisma.documentSnapshot.findMany({
      where: { documentId },
      orderBy: { version: 'desc' },
      select: { version: true, savedAt: true },
    });
  }

  // The actual revert has to happen against the live Y.Doc, which only sync-server
  // holds in memory — this just relays the request there over a trusted internal
  // channel (shared secret) once the role guard above has already confirmed the
  // caller is at least an editor. See sync-server/src/internalApi.ts for the other end.
  async restore(documentId: string, version: number): Promise<void> {
    const internalUrl = process.env.SYNC_SERVER_INTERNAL_URL;
    const internalSecret = process.env.SYNC_SERVER_INTERNAL_SECRET;
    if (!internalUrl || !internalSecret) {
      throw new InternalServerErrorException(
        'SYNC_SERVER_INTERNAL_URL/SYNC_SERVER_INTERNAL_SECRET is not configured',
      );
    }

    const response = await fetch(
      `${internalUrl}/internal/documents/${documentId}/restore`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret,
        },
        body: JSON.stringify({ version }),
      },
    );

    if (!response.ok) {
      const data: unknown = await response.json().catch(() => null);
      const message =
        (data as { message?: string } | null)?.message ??
        'Failed to restore version';
      if (response.status === 404) throw new NotFoundException(message);
      throw new BadRequestException(message);
    }
  }
}
