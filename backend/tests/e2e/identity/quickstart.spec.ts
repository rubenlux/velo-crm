import { INestApplication } from '@nestjs/common';
import { authenticator } from 'otplib';
import request from 'supertest';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';
import { MfaSecretCipher } from '../../../src/modules/identity/infrastructure/mfa-secret-cipher';
import { createTestApp, resetDatabase } from '../../test-app';

/**
 * End-to-end walk of the full spec 004 quickstart across all five user stories:
 * register -> verify email -> login -> password reset -> multi-device sessions ->
 * enable MFA -> login requires MFA -> logout/refresh revocation.
 */
describe('E2E: Authentication & Identity quickstart (all user stories)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cipher: MfaSecretCipher;
  const email = 'e2e-quickstart@example.com';

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    cipher = app.get(MfaSecretCipher);
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  it('walks register -> verify -> reset password -> multi-device sessions -> MFA -> logout', async () => {
    const server = app.getHttpServer();

    // US1: register + verify email
    const registerResponse = await request(server)
      .post('/api/v1/auth/register')
      .send({ email, password: 'InitialPass1!' })
      .expect(201);

    await request(server)
      .post('/api/v1/auth/verify-email')
      .send({ token: registerResponse.body.emailVerificationToken })
      .expect(200);

    const firstLogin = await request(server)
      .post('/api/v1/auth/login')
      .set('User-Agent', 'device-laptop')
      .send({ email, password: 'InitialPass1!' })
      .expect(200);
    expect(firstLogin.body.user.emailVerified).toBe(true);

    // US2: forgot password -> reset -> old session revoked -> new password works
    const resetRequest = await request(server)
      .post('/api/v1/auth/password/reset-request')
      .send({ email })
      .expect(200);

    await request(server)
      .post('/api/v1/auth/password/reset-confirm')
      .send({ token: resetRequest.body.passwordResetToken, newPassword: 'ResetPass1!' })
      .expect(200);

    await request(server)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: firstLogin.body.refreshToken })
      .expect(401);

    // US4: log in from two devices, list sessions, revoke one remotely
    const laptopLogin = await request(server)
      .post('/api/v1/auth/login')
      .set('User-Agent', 'device-laptop')
      .send({ email, password: 'ResetPass1!' })
      .expect(200);

    const phoneLogin = await request(server)
      .post('/api/v1/auth/login')
      .set('User-Agent', 'device-phone')
      .send({ email, password: 'ResetPass1!' })
      .expect(200);

    const sessions = await request(server)
      .get('/api/v1/auth/sessions')
      .set('Authorization', `Bearer ${laptopLogin.body.accessToken}`)
      .expect(200);
    expect(sessions.body).toHaveLength(2);

    const phoneSession = sessions.body.find((s: { device: { userAgent: string } }) => s.device.userAgent === 'device-phone');
    await request(server)
      .delete(`/api/v1/auth/sessions/${phoneSession.id}`)
      .set('Authorization', `Bearer ${laptopLogin.body.accessToken}`)
      .expect(204);

    await request(server)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: phoneLogin.body.refreshToken })
      .expect(401);

    // US5: enable MFA, next login is paused pending a TOTP code
    await request(server)
      .post('/api/v1/auth/mfa/enroll')
      .set('Authorization', `Bearer ${laptopLogin.body.accessToken}`)
      .expect(200);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const secret = cipher.decrypt(user.mfaSecret!);

    await request(server)
      .post('/api/v1/auth/mfa/enable')
      .set('Authorization', `Bearer ${laptopLogin.body.accessToken}`)
      .send({ code: authenticator.generate(secret) })
      .expect(200);

    const mfaLogin = await request(server)
      .post('/api/v1/auth/login')
      .set('User-Agent', 'device-laptop')
      .send({ email, password: 'ResetPass1!' })
      .expect(200);
    expect(mfaLogin.body.mfaRequired).toBe(true);

    const verified = await request(server)
      .post('/api/v1/auth/mfa/verify')
      .send({ mfaChallengeToken: mfaLogin.body.mfaChallengeToken, code: authenticator.generate(secret) })
      .expect(200);

    // Final: logout revokes the session that MFA just issued.
    await request(server)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${verified.body.accessToken}`)
      .send({ refreshToken: verified.body.refreshToken })
      .expect(204);

    await request(server)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: verified.body.refreshToken })
      .expect(401);
  });
});
