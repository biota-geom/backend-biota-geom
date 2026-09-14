import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { EnvVars } from '../config/env.validation';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configService: ConfigService<EnvVars, true>) {
    // Stryker disable next-line all: `infer` is a compile-time-only hint for
    // ConfigService's generics; mutating it (or dropping it, below) doesn't
    // change the runtime value, since DATABASE_URL is always resolved from
    // the already-validated env before this option object is even inspected.
    const connectionString = configService.get('DATABASE_URL', {
      // Stryker disable next-line all: see comment above
      infer: true,
    });

    super({
      adapter: new PrismaPg({ connectionString }),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
