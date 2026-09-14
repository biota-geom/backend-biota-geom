import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOkResponse({
    description: 'Application health status.',
    schema: {
      example: {
        status: 'ok',
        service: 'backend-biota-geom',
      },
    },
  })
  getHealth() {
    return this.appService.getHealth();
  }
}
