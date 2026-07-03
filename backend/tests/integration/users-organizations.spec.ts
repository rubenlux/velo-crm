import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('List my organizations (US2, Acceptance Scenario 1)', () => {
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

  it('lists only the Organizations where the User has an active Membership, with the correct Role in each', async () => {
    const owner = await registerAndLogin('multi-org-owner@example.com');

    await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Org A', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Org B', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    // A third Organization the owner is NOT a member of must not appear.
    const otherOwner = await registerAndLogin('other-owner@example.com');
    await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${otherOwner.body.accessToken}`)
      .send({ name: 'Org C (not mine)', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/api/v1/users/me/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .expect(200);

    expect(response.body).toHaveLength(2);
    const names = response.body.map((org: { name: string }) => org.name).sort();
    expect(names).toEqual(['Org A', 'Org B']);
    expect(response.body.every((org: { role: string }) => org.role === 'Propietario')).toBe(true);
  });
});
