import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { REQUIRE_ROLE_KEY } from '../decorators/require-role.decorator';
import { Role } from '@prisma/client';

interface RequestWithParams {
  user?: { id: string };
  params: Record<string, string>;
}

const ROLE_RANK: Record<Role, number> = { viewer: 0, editor: 1, owner: 2 };

@Injectable()
export class DocumentRoleGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRole = this.reflector.get<Role>(
      REQUIRE_ROLE_KEY,
      context.getHandler(),
    );
    if (!requiredRole) return true;

    const request = context.switchToHttp().getRequest<RequestWithParams>();
    const userId = request.user?.id;
    const documentId = request.params.documentId ?? request.params.id;
    if (!userId || !documentId) throw new ForbiddenException();

    // Checked separately from the permission lookup below: DocumentPermission rows
    // cascade-delete with their Document, so "no permission row" is ambiguous between
    // "document doesn't exist" (404) and "you never had access" (403) unless we know
    // up front whether the document itself is still there.
    const documentExists = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true },
    });
    if (!documentExists) throw new NotFoundException('Document not found');

    const permission = await this.prisma.documentPermission.findUnique({
      where: { documentId_userId: { documentId, userId } },
    });
    if (!permission || ROLE_RANK[permission.role] < ROLE_RANK[requiredRole]) {
      throw new ForbiddenException('Insufficient role for this document');
    }
    return true;
  }
}
