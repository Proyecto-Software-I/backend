import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

export interface HealthResponse {
  status: 'ok';
  service: 'legacylift-backend';
}

@ApiTags('health')
@Controller()
export class AppController {
  @Get('health')
  @ApiOperation({ summary: 'Comprobar el estado del backend' })
  @ApiResponse({
    status: 200,
    description: 'El backend está funcionando correctamente',
  })
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'legacylift-backend',
    };
  }
}
