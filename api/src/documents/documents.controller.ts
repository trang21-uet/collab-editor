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
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { RestoreDocumentDto } from './dto/restore-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentRoleGuard } from '../common/guards/document-role.guard';
import { RequireRole } from '../common/decorators/require-role.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDocumentDto,
  ) {
    return this.documentsService.create(user.id, dto.title);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.findAllForUser(user.id);
  }

  @UseGuards(DocumentRoleGuard)
  @RequireRole(Role.viewer)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @UseGuards(DocumentRoleGuard)
  @RequireRole(Role.editor)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    return this.documentsService.update(id, dto);
  }

  @UseGuards(DocumentRoleGuard)
  @RequireRole(Role.owner)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }

  @UseGuards(DocumentRoleGuard)
  @RequireRole(Role.viewer)
  @Get(':id/versions')
  listVersions(@Param('id') id: string) {
    return this.documentsService.listVersions(id);
  }

  @UseGuards(DocumentRoleGuard)
  @RequireRole(Role.editor)
  @Post(':id/restore')
  restore(@Param('id') id: string, @Body() dto: RestoreDocumentDto) {
    return this.documentsService.restore(id, dto.version);
  }
}
