import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  // O emit do `emitDecoratorMetadata` gera um ternário aqui
  // (`typeof AppService !== 'undefined' ? AppService : Object`) cujo ramo
  // `Object` é inalcançável em runtime. Sem este ignore o arquivo fica em
  // 75% de branches e reprova no gate de cobertura — ver README.
  /* c8 ignore next */
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
