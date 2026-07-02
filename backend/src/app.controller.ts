import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root() {
    return { service: 'velo-crm-backend', status: 'ok' };
  }

  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
