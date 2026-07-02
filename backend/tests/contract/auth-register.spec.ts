import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/modules/identity/infrastructure/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('POST /api/v1/auth/register (contract)', () => {
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

  it('creates a User and returns 201 with a verification token', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'new-user@example.com', password: 'Sup3rSecret!' })
      .expect(201);

    expect(response.body).toMatchObject({
      email: 'new-user@example.com',
      emailVerified: false,
    });
    expect(typeof response.body.emailVerificationToken).toBe('string');
  });

  it('rejects a request missing required fields', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'missing-password@example.com' })
      .expect(400);
  });

  it('rejects a duplicate email (FR-001 uniqueness)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'dup@example.com', password: 'Sup3rSecret!' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'dup@example.com', password: 'AnotherSecret1!' })
      .expect(409);
  });
});
