import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server';

const { app } = createApp();

describe('Server HTTP routes', () => {
  describe('Homepage', () => {
    it('GET / returns 200 with HTML', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
      expect(res.text).toContain('VOID TRANSIT');
      expect(res.text).toContain('<div id="terminal">');
    });

    it('serves style.css', async () => {
      const res = await request(app).get('/style.css');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/css/);
    });

    it('serves app.js', async () => {
      const res = await request(app).get('/app.js');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/javascript/);
    });
  });

  describe('Debug console', () => {
    it('GET /debug/console returns 200 with debug HTML', async () => {
      const res = await request(app).get('/debug/console');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
      expect(res.text).toContain('VOID TRANSIT');
      expect(res.text).toContain('DEBUG CONSOLE');
    });

    it('GET /debug/sessions returns empty array initially', async () => {
      const res = await request(app).get('/debug/sessions');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('Game API', () => {
    it('POST /api/new creates a game session', async () => {
      const res = await request(app)
        .post('/api/new')
        .send({ sessionId: 'test-http' });
      expect(res.status).toBe(200);
      expect(res.body.sessionId).toBe('test-http');
    });

    it('POST /api/command returns prose', async () => {
      // Ensure session exists
      await request(app).post('/api/new').send({ sessionId: 'test-cmd' });

      const res = await request(app)
        .post('/api/command')
        .send({ sessionId: 'test-cmd', input: 'look' });
      expect(res.status).toBe(200);
      expect(res.body.prose).toBeTruthy();
      expect(res.body.type).toBe('look');
    });

    it('POST /api/command without session returns 404', async () => {
      const res = await request(app)
        .post('/api/command')
        .send({ sessionId: 'nonexistent', input: 'look' });
      expect(res.status).toBe(404);
    });

    it('POST /api/command without input returns 400', async () => {
      const res = await request(app)
        .post('/api/command')
        .send({ sessionId: 'test-http' });
      expect(res.status).toBe(400);
    });
  });
});
