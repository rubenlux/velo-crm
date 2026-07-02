import { INestApplication } from '@nestjs/common';
import { authenticator } from 'otplib';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { MfaSecretCipher } from '../../src/modules/identity/infrastructure/mfa-secret-cipher';
import { createTestApp, resetDatabase } from '../test-app';

describe('MFA enrollment and login (US5)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cipher: MfaSecretCipher;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    cipher = app.get(MfaSecretCipher);
  });

  afterEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  async function registerAndLogin(email: string) {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(201);

    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(200);
  }

  async function currentTotp(userEmail: string): Promise<string> {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: userEmail } });
    const secret = cipher.decrypt(user.mfaSecret!);
    return authenticator.generate(secret);
  }

  it('requires a TOTP code on login once MFA is enabled', async () => {
    const server = app.getHttpServer();
    const email = 'mfa-user@example.com';
    const login = await registerAndLogin(email);

    const enroll = await request(server)
      .post('/api/v1/auth/mfa/enroll')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(enroll.body.recoveryCodes).toHaveLength(8);
    expect(typeof enroll.body.otpauthUrl).toBe('string');

    const firstCode = await currentTotp(email);
    await request(server)
      .post('/api/v1/auth/mfa/enable')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ code: firstCode })
      .expect(200);

    // Next login is paused pending MFA.
    const secondLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(200);
    expect(secondLogin.body.mfaRequired).toBe(true);
    expect(typeof secondLogin.body.mfaChallengeToken).toBe('string');
    expect(secondLogin.body.accessToken).toBeUndefined();

    const codeForVerify = await currentTotp(email);
    const verified = await request(server)
      .post('/api/v1/auth/mfa/verify')
      .send({ mfaChallengeToken: secondLogin.body.mfaChallengeToken, code: codeForVerify })
      .expect(200);

    expect(typeof verified.body.accessToken).toBe('string');
    expect(typeof verified.body.refreshToken).toBe('string');
  });

  it('rejects an incorrect TOTP code during mfa/verify', async () => {
    const server = app.getHttpServer();
    const email = 'mfa-wrong-code@example.com';
    const login = await registerAndLogin(email);

    await request(server)
      .post('/api/v1/auth/mfa/enroll')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    const code = await currentTotp(email);
    await request(server)
      .post('/api/v1/auth/mfa/enable')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ code })
      .expect(200);

    const secondLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(200);

    await request(server)
      .post('/api/v1/auth/mfa/verify')
      .send({ mfaChallengeToken: secondLogin.body.mfaChallengeToken, code: '000000' })
      .expect(401);
  });

  it('accepts a one-time recovery code instead of a TOTP code', async () => {
    const server = app.getHttpServer();
    const email = 'mfa-recovery@example.com';
    const login = await registerAndLogin(email);

    const enroll = await request(server)
      .post('/api/v1/auth/mfa/enroll')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    const recoveryCode = enroll.body.recoveryCodes[0] as string;

    const code = await currentTotp(email);
    await request(server)
      .post('/api/v1/auth/mfa/enable')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ code })
      .expect(200);

    const secondLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(200);

    await request(server)
      .post('/api/v1/auth/mfa/verify')
      .send({ mfaChallengeToken: secondLogin.body.mfaChallengeToken, code: recoveryCode })
      .expect(200);

    // The same recovery code cannot be used twice.
    const thirdLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(200);

    await request(server)
      .post('/api/v1/auth/mfa/verify')
      .send({ mfaChallengeToken: thirdLogin.body.mfaChallengeToken, code: recoveryCode })
      .expect(401);
  });

  it('requires reauthentication (current password) to disable MFA', async () => {
    const server = app.getHttpServer();
    const email = 'mfa-disable@example.com';
    const login = await registerAndLogin(email);

    await request(server)
      .post('/api/v1/auth/mfa/enroll')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    const code = await currentTotp(email);
    await request(server)
      .post('/api/v1/auth/mfa/enable')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ code })
      .expect(200);

    await request(server)
      .post('/api/v1/auth/mfa/disable')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ currentPassword: 'WrongPassword!' })
      .expect(401);

    await request(server)
      .post('/api/v1/auth/mfa/disable')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ currentPassword: 'Sup3rSecret!' })
      .expect(200);

    // Login no longer requires MFA.
    const loginAfterDisable = await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(200);
    expect(loginAfterDisable.body.mfaRequired).toBeUndefined();
    expect(typeof loginAfterDisable.body.accessToken).toBe('string');
  });
});
