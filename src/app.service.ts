import { Injectable } from '@nestjs/common';

export interface HealthResponse {
  status: 'ok';
  service: string;
}

@Injectable()
export class AppService {
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'Proyecto-Software-I/backend',
    };
  }
}
