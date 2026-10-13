import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Sécurité des en-têtes HTTP
  app.use(helmet());

  // CORS sécurisé
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Préfixe de versioning d'API
  app.setGlobalPrefix('api/v1');

  // Validation globale des DTOs avec class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Filtre d'exceptions unifié
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT || 3009;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 FertiliteApp Backend API opérationnel sur : http://localhost:${port}/api/v1`);
}
bootstrap();
