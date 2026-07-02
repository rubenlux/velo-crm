import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/modules/identity/infrastructure/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Password reset & change (US2)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  async function registerUser(email: string, password: string) {
    return request(app.getHttpServer()).post('/api/v1/auth/register').send({ email, password }).expect(201);
  }

  it('resets the password with a single-use token and revokes existing sessions', async () => {
    const server = app.getHttpServer();
    await registerUser('reset-flow@example.com', 'OldPassword1!');

    const loginBefore = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'reset-flow@example.com', password: 'OldPassword1!' })
      .expect(200);

    const resetRequest = await request(server)
      .post('/api/v1/auth/password/reset-request')
      .send({ email: 'reset-flow@example.com' })
      .expect(200);
    const resetToken = resetRequest.body.passwordResetToken as string;

    await request(server)
      .post('/api/v1/auth/password/reset-confirm')
      .send({ token: resetToken, newPassword: 'NewPassword1!' })
      .expect(200);

    // Old password no longer works.
    await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'reset-flow@example.com', password: 'OldPassword1!' })
      .expect(401);

    // New password works.
    await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'reset-flow@example.com', password: 'NewPassword1!' })
      .expect(200);

    // The session that existed before the reset is now revoked.
    await request(server)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: loginBefore.body.refreshToken })
      .expect(401);
  });

  it('invalidates a reset token after it is used once', async () => {
    const server = app.getHttpServer();
    await registerUser('reset-once@example.com', 'OldPassword1!');

    const resetRequest = await request(server)
      .post('/api/v1/auth/password/reset-request')
      .send({ email: 'reset-once@example.com' })
      .expect(200);
    const resetToken = resetRequest.body.passwordResetToken as string;

    await request(server)
      .post('/api/v1/auth/password/reset-confirm')
      .send({ token: resetToken, newPassword: 'NewPassword1!' })
      .expect(200);

    await request(server)
      .post('/api/v1/auth/password/reset-confirm')
      .send({ token: resetToken, newPassword: 'AnotherPassword1!' })
      .expect(400);
  });

  it('only the most recently requested reset token is valid', async () => {
    const server = app.getHttpServer();
    await registerUser('reset-latest@example.com', 'OldPassword1!');

    const first = await request(server)
      .post('/api/v1/auth/password/reset-request')
      .send({ email: 'reset-latest@example.com' })
      .expect(200);

    const second = await request(server)
      .post('/api/v1/auth/password/reset-request')
      .send({ email: 'reset-latest@example.com' })
      .expect(200);

    await request(server)
      .post('/api/v1/auth/password/reset-confirm')
      .send({ token: first.body.passwordResetToken, newPassword: 'NewPassword1!' })
      .expect(400);

    await request(server)
      .post('/api/v1/auth/password/reset-confirm')
      .send({ token: second.body.passwordResetToken, newPassword: 'NewPassword1!' })
      .expect(200);
  });

  it('does not reveal whether an email exists', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/password/reset-request')
      .send({ email: 'unknown@example.com' })
      .expect(200);

    expect(response.body).toEqual({ requested: true });
  });

  it('changes the password for an authenticated user given the correct current password', async () => {
    const server = app.getHttpServer();
    await registerUser('change-password@example.com', 'OldPassword1!');
    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'change-password@example.com', password: 'OldPassword1!' })
      .expect(200);

    await request(server)
      .post('/api/v1/auth/password/change')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ currentPassword: 'OldPassword1!', newPassword: 'NewPassword1!' })
      .expect(200);

    await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'change-password@example.com', password: 'NewPassword1!' })
      .expect(200);
  });

  it('rejects changing the password with an incorrect current password', async () => {
    const server = app.getHttpServer();
    await registerUser('change-password-wrong@example.com', 'OldPassword1!');
    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'change-password-wrong@example.com', password: 'OldPassword1!' })
      .expect(200);

    await request(server)
      .post('/api/v1/auth/password/change')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ currentPassword: 'WrongPassword!', newPassword: 'NewPassword1!' })
      .expect(401);
  });
});
