import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        PORT: Joi.number().port().default(3001),
        FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),
        DATABASE_URL: Joi.string().required(),
      }),
    }),
    PrismaModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
