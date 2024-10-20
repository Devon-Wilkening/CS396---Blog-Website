const request = require('supertest');
const app = require('../src/app'); // Your Express app
const db = require('../config/test-db');

// Create a test table and insert sample data before running tests
beforeAll((done) => {
  db.serialize(() => {
    db.run('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
    db.run('INSERT INTO users (name) VALUES (?)', ['Alice']);
    db.run('INSERT INTO users (name) VALUES (?)', ['Bob']);
    done();
  });
});

// Close the database after tests complete
afterAll((done) => {
  db.close(done);
});

// Integration test: Check if /users endpoint returns correct data
describe('GET /users', () => {
  it('should return a list of users', async () => {
    const res = await request(app).get('/users');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ]);
  });
});
