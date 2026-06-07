const request = require('supertest');
const express = require('express');
// We need to import the app, but since app.js starts the server on import, 
// strictly speaking we should export the app instance. 
// For now, let's assume we can require it or we might need to refactor app.js slightly 
// to separate app definition from app.listen.
// However, to avoid refactoring right now, we can try to require it. 
// If app.js connects to DB and listens, it might be tricky.

// A common pattern is to verify routes independently or mock the app.
// Let's assume we can just test the public routes if the server is running, 
// OR we refactor app.js to export 'app'.

// Let's try to require app.js. 
// Ideally app.js should have: if (require.main === module) { app.listen(...) }
// I will check app.js content again.

const baseURL = "http://localhost:8080";

describe('Smoke Tests', () => {
    it('GET /home should return 200', async () => {
        const response = await request(baseURL).get('/home');
        expect(response.status).toBe(200);
    });

    it('GET /signup should return 200', async () => {
        const response = await request(baseURL).get('/signup');
        expect(response.status).toBe(200);
    });
});
