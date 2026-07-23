import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { Role } from '@prisma/client';

@Injectable()
export class PermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async assign(documentId: string, email: string, role: Role) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('No user with that email');

    return this.prisma.documentPermission.upsert({
      where: { documentId_userId: { documentId, userId: user.id } },
      create: { documentId, userId: user.id, role },
      update: { role },
    });
  }

  list(documentId: string) {
    return this.prisma.documentPermission.findMany({
      where: { documentId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  async updateRole(documentId: string, userId: string, role: Role) {
    await this.assertNotLastOwner(documentId, userId, role);
    return this.prisma.documentPermission.update({
      where: { documentId_userId: { documentId, userId } },
      data: { role },
    });
  }

  async revoke(documentId: string, userId: string) {
    await this.assertNotLastOwner(documentId, userId, Role.viewer); // any non-owner role signals "removing owner status"
    return this.prisma.documentPermission.delete({
      where: { documentId_userId: { documentId, userId } },
    });
  }

  // A document must always keep at least one owner, otherwise nobody could ever manage
  // its permissions again. Reject demoting/revoking the sole remaining owner.
  private async assertNotLastOwner(
    documentId: string,
    userId: string,
    newRole: Role,
  ) {
    if (newRole === Role.owner) return;

    const current = await this.prisma.documentPermission.findUnique({
      where: { documentId_userId: { documentId, userId } },
    });
    if (!current || current.role !== Role.owner) return;

    const ownerCount = await this.prisma.documentPermission.count({
      where: { documentId, role: Role.owner },
    });
    if (ownerCount <= 1) {
      throw new BadRequestException("Cannot remove the document's only owner");
    }
  }
}
