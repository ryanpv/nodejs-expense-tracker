import app from '../server.js';
import supertest from 'supertest';
import assert from 'assert';
import { getDb, mockUri, mockServer } from '../db/db_connect.js'
import { expect } from 'chai'



describe("GET /test-query", () => {
  it("respond wtih Hello World", (done) => {
    supertest(app).get("/test-query").expect(200).expect("Hello World", done);
  })
});

describe("GET /get-expenses", () => {
  it("should get status 200", function(done) {

    supertest(app)
      .get("/get-expenses")
      .expect(300)
      .end(function(err, res) {
        if (err) done(err);
        done()
      });
  });
});

describe("POST request to /form-post", () => {
  it("should return status 200 after successful post", async function() {
    const mockObj = {
      item: 'Mock Item',
      price: parseFloat(2.99),
      purchaseMonth: "January",
      purchaseYear: parseInt(2023),
      category: "Mock Category"
    };

    const test = await supertest(app)
      .post('/form-post')
      .send(mockObj)
      .expect(200)
  });

  it("should return 400 status if empty object sent", function(done) {
    supertest(app)
      .post('/form-post')
      .send() // can pass {} or nothing at all
      .expect(400)
      .end(function(err, res) {
        if (err) done(err);
        done();
      });
  });
});

describe("DELETE /delete-expenses/:id", () => {
  it("should receive 200 response if true delete with count > 0", async () => {
    let db_connect = await getDb(mockUri)
    const mockObj = {
      item: 'Mock Item',
      price: parseFloat(2.99),
      purchaseMonth: "January",
      purchaseYear: parseInt(2023),
      category: "Mock Category"
    };

    const mockPost = await db_connect.db('test_db').collection('spending_list').insertOne(mockObj)
    const mockPostResult = mockPost.insertedId.toString()

    await supertest(app)
      .get('/delete-expense/' + mockPostResult)
      .expect(200)
      .expect({ message: 'successful delete on test' })

  });
});

describe("UPDATE request, two route test /update-item-form/:id , then '/update-item/:id", () => {
  const mockOutdatedObj = {
    item: 'Mock Item to update',
    price: parseFloat(2.99),
    purchaseMonth: "January",
    purchaseYear: parseInt(2023),
    category: "Mock Category"
  };
  
  it("GET req that returns array with obj data to be updated", async () => {
    let db_connect = await getDb(mockUri)
    const mockItem = await db_connect.db('test_db').collection('spending_list').insertOne(mockOutdatedObj);
    const mockItemId = mockItem.insertedId.toString();

    const res = await supertest(app)
      .get('/update-item-form/' + mockItemId)
      
      expect(res.body.length).to.equal(1)
      expect(res.body[0]).to.have.property("_id")
      expect(res.status).to.equal(200)
  });

  it("POST req for UPDATED DATA , final route for update process - submits form with updated data, ", async () => {
    let db_connect = await getDb(mockUri)
    const mockOutdatedObj = {
      item: 'Mock Item',
      price: parseFloat(2.99),
      purchaseMonth: "January",
      purchaseYear: parseInt(2023),
      category: "Mock Category"
    };

    const mockUpdatedItem = await db_connect.db('test_db').collection('spending_list').insertOne(mockOutdatedObj);
    const mockItemId = mockUpdatedItem.insertedId.toString();

    const res = await supertest(app)
      .post('/update-item/' + mockItemId)
      .send({
        item: 'Updated Mock Item',
        price: parseFloat(3.99),
        purchaseMonth: "January",
        purchaseYear: parseInt(2023),
        category: "Mock Category"
      })

      expect(res.body).to.have.property('acknowledged', true)
      expect(res.body).to.have.property('modifiedCount', 1)
      expect(res.body).to.have.property('matchedCount', 1)
      expect(res.status).to.equal(200)

  });
})

describe("GET req for month/category filter", () => {
  it("GET req /monthly-expenses, query response WITH results", async () => {
    let db_connect = await getDb(mockUri)
    const mockItem = {
      item: 'Mock Item',
      price: parseFloat(2.99),
      purchaseMonth: "January",
      purchaseYear: parseInt(2023),
      category: "Mock Category"
    };

    const mockItemPost = db_connect.db('test_db').collection('spending_list').insertOne(mockItem);

    const res = await supertest(app)
      .get('/monthly-expenses')
      .query({ month: 'January', category: 'Mock Category' })

      expect(res.status).to.be.equal(200)
      expect(res.body.length).to.be.greaterThan(0)
      expect(res.body).to.be.a('array')

  });

  it("GET req /monthly-expenses, query response W/O results", async () => {
    const res = await supertest(app)
      .get('/monthly-expenses')
      .query({ month: '', category: '' })

      expect(res.status).to.be.equal(200)
      expect(res.body.filteredResults.length).to.equal(0)
      expect(res.body).to.have.property('message', 'no items matching query')
  });
});

      // await mockServer.stop()

  // Testing resources
  // https://mherman.org/blog/testing-node-js-with-mocha-and-chai/#test---delete
  // https://girlsincode.com/javascript/testing-express-js-api-using-mocha-chai/
  // https://www.npmjs.com/package/chai