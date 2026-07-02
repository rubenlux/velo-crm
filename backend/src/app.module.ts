import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IdentityModule } from './modules/identity/identity.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    IdentityModule,
  ],
})
export class AppModule {}
