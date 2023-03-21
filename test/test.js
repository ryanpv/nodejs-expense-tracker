import request from 'supertest';
import app from '../server.js';

describe("GET /test-query", () => {
  it("respond wtih Hello World", (done) => {
    request(app).get("/test-query").expect("Hello World", done);
  })
});