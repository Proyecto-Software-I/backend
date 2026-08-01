import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const port = configService.get<number>('PORT') ?? 3000;
  const frontendUrl =
    configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';

  // Middleware de cabeceras de seguridad
  app.use(helmet());

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Proyecto Software I API')
    .setDescription(
      'Documentación de la API del backend de Proyecto-Software-I',
    )
    .setVersion('1.0')
    .build();

  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('docs', app, documentFactory);

  await app.listen(port);

  console.log(`API disponible en http://localhost:${port}/api`);
  console.log(`Swagger disponible en http://localhost:${port}/docs`);
}

void bootstrap();
