import 'reflect-metadata';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { IdentityExceptionsFilter } from './modules/identity/api/identity-exceptions.filter';
import { OrganizationsExceptionsFilter } from './modules/organizations/api/organizations-exceptions.filter';
import { UsersExceptionsFilter } from './modules/users/api/users-exceptions.filter';
import { RolesExceptionsFilter } from './modules/roles/api/roles-exceptions.filter';
import { CustomersExceptionsFilter } from './modules/customers/api/customers-exceptions.filter';
import { ContactsExceptionsFilter } from './modules/contacts/api/contacts-exceptions.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.useGlobalFilters(
    new IdentityExceptionsFilter(app.get(HttpAdapterHost)),
    new OrganizationsExceptionsFilter(app.get(HttpAdapterHost)),
    new UsersExceptionsFilter(app.get(HttpAdapterHost)),
    new RolesExceptionsFilter(app.get(HttpAdapterHost)),
    new CustomersExceptionsFilter(app.get(HttpAdapterHost)),
    new ContactsExceptionsFilter(app.get(HttpAdapterHost)),
  );
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
