import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const REQUIRE_ROLE_KEY = 'requireRole';

export const RequireRole = (role: Role) => SetMetadata(REQUIRE_ROLE_KEY, role);
