import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import type { HealthResponse } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Comprobar el estado del backend' })
  @ApiResponse({
    status: 200,
    description: 'El backend está funcionando correctamente',
  })
  getHealth(): HealthResponse {
    return this.appService.getHealth();
  }
}
