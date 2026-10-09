import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../dist/app.js';
import { ApiError } from '../dist/utils/ApiError.js';
import { ApiResponse } from '../dist/utils/ApiResponse.js';

describe('LIBFLOW Backend API Foundation Tests', () => {
  describe('Root and Health Endpoints', () => {
    it('GET / — returns service welcome envelope compliant with API standards', async () => {
      const res = await request(app).get('/');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.message, 'LIBFLOW Smart Library Management Platform API');
      assert.equal(res.body.data.apiPrefix, '/api/v1');
      assert.equal(res.body.data.healthEndpoint, '/api/v1/health');
    });

    it('GET /api/v1/health — returns 200 with UP status, ISO timestamp, and memory telemetry', async () => {
      const res = await request(app).get('/api/v1/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.message, 'LIBFLOW Backend Service is healthy');
      
      const { data } = res.body;
      assert.equal(data.status, 'UP');
      assert.equal(data.service, 'libflow-api');
      assert.equal(data.version, '1.0.0');
      assert.ok(data.environment);
      assert.ok(!Number.isNaN(Date.parse(data.timestamp)), 'timestamp must be a valid ISO date');
      assert.ok(typeof data.uptimeSeconds === 'number' && data.uptimeSeconds >= 0);
      assert.ok(typeof data.nodeVersion === 'string' && data.nodeVersion.startsWith('v'));
      
      assert.ok(data.memory, 'memory object must be present');
      assert.ok(typeof data.memory.rssMb === 'number');
      assert.ok(typeof data.memory.heapTotalMb === 'number');
      assert.ok(typeof data.memory.heapUsedMb === 'number');
    });
  });

  describe('Security & Middleware Headers', () => {
    it('Helmet sets standard security headers', async () => {
      const res = await request(app).get('/api/v1/health');
      assert.equal(res.headers['x-content-type-options'], 'nosniff');
      assert.equal(res.headers['x-frame-options'], 'SAMEORIGIN');
    });

    it('CORS origin is reflected when matching allowed origin', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .set('Origin', 'http://localhost:5173');
      assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:5173');
      assert.equal(res.headers['access-control-allow-credentials'], 'true');
    });
  });

  describe('Error Handling and Routing Guards', () => {
    it('GET /unknown-route — returns 404 with standard ROUTE_NOT_FOUND error envelope', async () => {
      const res = await request(app).get('/api/v1/unknown-endpoint');
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /route not found/i);
      assert.equal(res.body.error.code, 'ROUTE_NOT_FOUND');
      assert.deepEqual(res.body.error.details, {
        method: 'GET',
        path: '/api/v1/unknown-endpoint',
      });
    });

    it('POST with malformed JSON body — returns 400 with MALFORMED_JSON code', async () => {
      const res = await request(app)
        .post('/api/v1/health')
        .set('Content-Type', 'application/json')
        .send('{"invalidJson": unquotedString}');
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'MALFORMED_JSON');
      assert.match(res.body.message, /malformed json/i);
    });
  });

  describe('Utility Classes (ApiError & ApiResponse)', () => {
    it('ApiError constructs appropriate error instances', () => {
      const badReq = ApiError.badRequest('Invalid parameter', 'INVALID_PARAM', { field: 'email' });
      assert.equal(badReq.statusCode, 400);
      assert.equal(badReq.errorCode, 'INVALID_PARAM');
      assert.equal(badReq.message, 'Invalid parameter');
      assert.deepEqual(badReq.details, { field: 'email' });
      assert.equal(badReq.isOperational, true);

      const notFound = ApiError.notFound('User not found');
      assert.equal(notFound.statusCode, 404);
      assert.equal(notFound.errorCode, 'NOT_FOUND');

      const unauthorized = ApiError.unauthorized('Token expired');
      assert.equal(unauthorized.statusCode, 401);
      assert.equal(unauthorized.errorCode, 'UNAUTHORIZED');

      const forbidden = ApiError.forbidden();
      assert.equal(forbidden.statusCode, 403);
      assert.equal(forbidden.errorCode, 'FORBIDDEN');

      const conflict = ApiError.conflict('Email exists');
      assert.equal(conflict.statusCode, 409);
      assert.equal(conflict.errorCode, 'CONFLICT');

      const internal = ApiError.internal();
      assert.equal(internal.statusCode, 500);
      assert.equal(internal.errorCode, 'INTERNAL_SERVER_ERROR');
      assert.equal(internal.isOperational, false);
    });

    it('ApiResponse constructs valid envelopes with optional meta', () => {
      const res = ApiResponse.success('Fetched', [{ id: 1 }], { total: 1, page: 1, limit: 10, totalPages: 1 });
      assert.equal(res.success, true);
      assert.equal(res.message, 'Fetched');
      assert.deepEqual(res.data, [{ id: 1 }]);
      assert.equal(res.meta?.total, 1);
      assert.equal(res.meta?.page, 1);
    });
  });
});
