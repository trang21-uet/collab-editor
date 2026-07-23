import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { AssignPermissionDto } from './dto/assign-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentRoleGuard } from '../common/guards/document-role.guard';
import { RequireRole } from '../common/decorators/require-role.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, DocumentRoleGuard)
@Controller('documents/:documentId/permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @RequireRole(Role.owner)
  @Post()
  assign(
    @Param('documentId') documentId: string,
    @Body() dto: AssignPermissionDto,
  ) {
    return this.permissionsService.assign(documentId, dto.email, dto.role);
  }

  @RequireRole(Role.viewer)
  @Get()
  list(@Param('documentId') documentId: string) {
    return this.permissionsService.list(documentId);
  }

  @RequireRole(Role.owner)
  @Patch(':userId')
  updateRole(
    @Param('documentId') documentId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdatePermissionDto,
  ) {
    return this.permissionsService.updateRole(documentId, userId, dto.role);
  }

  @RequireRole(Role.owner)
  @Delete(':userId')
  revoke(
    @Param('documentId') documentId: string,
    @Param('userId') userId: string,
  ) {
    return this.permissionsService.revoke(documentId, userId);
  }
}
