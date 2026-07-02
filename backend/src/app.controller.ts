import { Controller, Get } from '@nestjs/common';
import { Public } from './modules/identity/api/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get()
  root() {
    return { service: 'velo-crm-backend', status: 'ok' };
  }

  @Public()
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
