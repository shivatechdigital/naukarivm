import {
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import {
  AppModule,
  ObserveInstrument,
} from './app.module';

async function bootstrap() {
  const app =
    await NestFactory.create(
      AppModule,
      {
        instrument:
          ObserveInstrument,
      },
    );

  app.enableCors({
    origin: [
      'http://20.83.162.90:5173',
      'http://localhost:5173',
      'http://localhost:5174',
    ],
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port =
    Number(process.env.PORT) || 3001;

  await app.listen(
    port,
    '0.0.0.0',
  );

  console.log(
    `🚀 Backend running on http://localhost:${port}`,
  );
}

bootstrap();
