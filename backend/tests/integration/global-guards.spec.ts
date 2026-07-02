import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

/**
 * Locks in the deny-by-default wiring itself (AuthGuard as APP_GUARD, TenantContextGuard
 * class-wide on OrganizationsController): a route with no guard-related decorator must
 * reject, and only @Public()/@SkipTenantContext() routes may bypass it. This protects
 * against a future endpoint being added without remembering to secure it.
 */
describe('Global guards (deny-by-default)', () => {
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

  it('rejects an authenticated-by-default route with no Authorization header', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/sessions').expect(401);
  });

  it('rejects a tenant-scoped route with a valid token but no X-Organization-Id header', async () => {
    const email = 'deny-default@example.com';
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(200);

    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ name: 'Deny Default Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${org.body.id}`)
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(403);
  });

  it('allows @Public() routes without any Authorization header', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'public-route-check@example.com', password: 'Sup3rSecret!' })
      .expect(201);
  });

  it('allows @SkipTenantContext() authenticated routes without an X-Organization-Id header', async () => {
    const email = 'skip-tenant-context@example.com';
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(200);

    // POST /organizations is @SkipTenantContext() (creating the first Organization).
    await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ name: 'Skip Tenant Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
  });
});
