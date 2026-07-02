import 'reflect-metadata';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { IdentityExceptionsFilter } from './modules/identity/api/identity-exceptions.filter';
import { OrganizationsExceptionsFilter } from './modules/organizations/api/organizations-exceptions.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.useGlobalFilters(
    new IdentityExceptionsFilter(app.get(HttpAdapterHost)),
    new OrganizationsExceptionsFilter(app.get(HttpAdapterHost)),
  );
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
