import { IsEmail, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class AssignPermissionDto {
  @IsEmail()
  email: string;

  @IsEnum(Role)
  role: Role;
}
