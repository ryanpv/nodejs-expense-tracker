import cors from 'cors';
import 'dotenv/config.js';
import express from 'express';
import { db_conn, getDb, mockUri } from './db/db_connect.js';
import { ObjectId } from 'mongodb';
import NodeCache from 'node-cache';

// process.env.NODE_ENV = 'prod'
console.log('current ENV: ', process.env.NODE_ENV);
const PORT = 3001
const app = express();
const dbUri = process.env.NODE_ENV === 'test' ? mockUri : process.env.DB_URI;
const cache = new NodeCache()
const dbName = process.env.NODE_ENV === 'test' ? 'test_db' : 'Expenses_list';

app.use(cors({ origin: true }));
app.use(express.urlencoded({ extended: true }))
app.use(express.json());
app.set('view engine', 'ejs');


// RENDER HOME PAGE
app.get('/', function (req, res) {
  cache.del('testKey')
  cache.del('filterKey')
  res.render('pages/homePage.ejs');
});

// RENDER FORM TO POST NEW EXPENSE
app.get('/add-expense', (req, res) => {
  res.render('pages/postForm.ejs');
});

// GET LIST OF ALL EXPENSES
app.get('/get-expenses', async (req, res) => {
  let db_connect = await getDb();

  let paginator = req.query.paginator === undefined ? 0 : parseInt(req.query.paginator) + 20

  const findData = await db_connect.db(dbName)
  .collection("spending_list")
  .find({})
  .skip(paginator)
  .limit(20)
  .toArray();
  
  let concatArr = []
  const key = 'testKey'
  const cacheData = cache.get(key);
  

  if (cacheData === undefined) {
    console.log('cacheData n/a true');
    cache.set(key, findData)
  } else {
    console.log('false');
    cache.set(key, cacheData.concat(findData))
    // concatArr = concatArr.concat(cache.get(key))
    concatArr = cache.get(key)
  }

  res.render('pages/expensePage.ejs', {
    names: findData,
    tableData: concatArr.length > 0 ? concatArr : findData,
    // tableData: cacheData === undefined ? findData : cacheData,
    paginator: parseInt(paginator),
    resLength: findData.length,
  });
  // res.send(findData)
});

// POST NEW EXPENSE
app.post('/form-post', async (req, res) => {
  cache.del('testKey')
  cache.del('filterKey')
  try {
    let db_connect = await getDb(dbUri);      
    const newExpenseObj = {
      item: req.body.purchaseInputName,
      price: parseFloat(req.body.priceInputName),
      purchaseMonth: req.body.monthInputName,
      purchaseYear: parseInt(req.body.yearInputName),
      category: req.body.categoryInputName
    };
    const postFunc = db_connect.db(dbName).collection('spending_list').insertOne(newExpenseObj);
    const postResult = await postFunc
      console.log(postResult);

    if (Object.keys(req.body).length === 0) {
      console.log('empty body POSt');
      res.status(400).send({ message: "empty request" })
    } else if (postResult.acknowledged === true && process.env.NODE_ENV === 'test') {
      console.log('post true: test ENV');
      res.status(200).send({message: 'test post successful'})
    } else if (postResult.acknowledged === true && process.env.NODE_ENV === 'prod') {
      console.log('post successful for render');
      res.redirect('/add-expense');
    } else { 
      res.status(400).send({ message: 'unsuccessful post' })
    }
  } catch (err) {
    console.log('post error', err);
    res.status(500)
  }
});

// DELETE SPECIFIC EXPENSE
app.get('/delete-expense/:id', async (req, res) => {
  cache.del('testKey')
  cache.del('filterKey')
  try {
    let db_connect = await getDb(dbUri);
    const query = { _id: new ObjectId(req.params.id) };
    console.log('req params item ID: ', req.params.id);
    const deletion = await db_connect.db(dbName)
      .collection('spending_list')
      .deleteOne(query);

    if (process.env.NODE_ENV === 'test' && deletion.deletedCount > 0) {
    // if (deletion.deletedCount > 0) {
      console.log('test delete success', deletion);
      res.status(200).send({ message: 'successful delete on test' })
    } else if (process.env.NODE_ENV === 'prod' && deletion.deletedCount > 0) {
      console.log('prod delete success');
      // res.status(200).send({ message: 'successful delete on prod' })
      res.redirect('/get-expenses');
    } else {
      console.log('404 bad requesttt');
      res.status(404)
    }
  } catch (err) {
    console.log('error', err);
  }

  });

// UPDATE SPECIFIC EXPENSE 1/2 (first routes to form page)
app.get('/update-item-form/:id', async (req, res) => {
  cache.del('testKey')
  cache.del('filterKey')
  let db_connect = await getDb(dbUri);
  const query = { _id: new ObjectId(req.params.id) };

  const singleDoc = await db_connect.db(dbName)
    .collection('spending_list')
    .find(query)
    .toArray()
    // console.log('doc to be updated: ', singleDoc.length);

    if (process.env.NODE_ENV === 'test' && singleDoc.length > 0) {
      console.log('item to be updated retrieved', singleDoc);
      res.status(200).send(singleDoc)
    } else if (process.env.NODE_ENV === 'prod' && singleDoc.length > 0) {
      console.log('item to be updated retrieved', singleDoc);
      res.render('pages/updateForm.ejs', {
        itemData: singleDoc[0]
      });
    } else {
      console.log('some error');
    }

});

// UPDATE SPECIFIC EXPENSE 2/2 (form post request)

app.post('/update-item/:id', async (req, res) => {
  let db_connect = await getDb(dbUri);
  const query = { _id: new ObjectId(req.params.id)};
  const updatedValues = {
    $set: {
      item: req.body.purchaseInputName,
      price: parseFloat(req.body.priceInputName),
      purchaseMonth: req.body.monthInputName,
      purchaseYear: parseInt(req.body.yearInputName),
      category: req.body.categoryInputName
    }
  };

  const itemUpdate = await db_connect.db(dbName)
    .collection('spending_list')
    .updateOne(query, updatedValues);
    // console.log('item successfully updated: ', itemUpdate);

    if (process.env.NODE_ENV === 'test' && itemUpdate.modifiedCount > 0) {
      console.log('successful item update in test env', itemUpdate);
      res.status(200).send(itemUpdate)
    } else if (process.env.NODE_ENV === 'prod' && itemUpdate.modifiedCount > 0) {
      console.log('successful item in PROD env', itemUpdate);
      res.redirect('/get-expenses');
    } else {
      console.log('some error');
    }

});

// FILTER EXPENSE LIST BY MONTH
app.get('/filter-list', async (req, res) => {
  const key = 'testKey'
  cache.del(key)
  let db_connect = getDb(dbUri);
  const query = req.query.month ? { purchaseMonth: req.query.month } : { category: req.query.category }
  console.log('query: ', query);

  const filteredResults = await db_connect.db(dbName)
    .collection('spending_list')
    .find(query)
    .toArray()

    const totalSpend = filteredResults.reduce((prev, curr) => {
      return prev + curr.price
    }, 0)

    console.log('total expenditure: ', totalSpend);
    console.log('query: ', req.query);
    res.render('pages/expensePage.ejs', {
      tableData: filteredResults,
      expenseTotal: totalSpend,
      query: req.query.month || req.query.category
    });

});

// MONTH-CATEGORY FILTER
app.get('/monthly-expenses', async (req, res) => {
  cache.del('filterKey')
  cache.del('testKey')
  let db_connect = await getDb(dbUri);
  const query = req.query.month && req.query.category === 'select' ? { purchaseMonth: req.query.month } 
    : req.query.category && req.query.month === 'select' ? { category: req.query.category }
    : { purchaseMonth: req.query.month, category: req.query.category }
    console.log('query: ', query);
  
  let paginator = req.query.paginator === undefined ? 0 : parseInt(req.query.paginator) + 5
  const filteredResults = await db_connect.db(dbName)
    .collection('spending_list')
    .find(query)
    // .skip(paginator)
    // .limit(5)
    .toArray()


  const totalSpend = filteredResults.reduce((prev, curr) => {
    return prev + curr.price
  }, 0)

  let concatArr = []
  const key = 'filterKey'
  const cacheData = cache.get(key);

  if (cacheData === undefined) {
    console.log('true');
    cache.set(key, filteredResults)
  } else {
    console.log('false');
    cache.set(key, cacheData.concat(filteredResults))
    // concatArr = concatArr.concat(cache.get(key))
    concatArr = cache.get(key)
  }

  if (process.env.NODE_ENV === 'test' && filteredResults.length === 0) {
    console.log('test result for no results: ', filteredResults);
    res.status(200).send({ message: 'no items matching query', filteredResults})
  } else if (process.env.NODE_ENV === 'test' && filteredResults.length > 0) {
    console.log('test response WITH results: ', filteredResults);
    res.status(200).send(filteredResults)
  } else if (process.env.NODE_ENV === 'prod') {
    res.render('pages/filterPage.ejs', {
      tableData: concatArr.length > 0 ? concatArr : filteredResults,
      expenseTotal: totalSpend,
      monthQuery: req.query.month,
      categoryQuery: req.query.category,
      paginator: parseInt(paginator),
      resLength: filteredResults.length,
    });
  } else {
    console.log('some error with monthly filter query');
  }
    
});



app.get('/test-query', function (req, res) {
  return res.send("Hello World")
});

// connect().then(() => {
//   try {
//     app.listen(3002, () => {
//       console.log('connected to mock server');
//     })
//   } catch (err) {
//     console.log('cannot connect to server');
//   }

// }).catch((error) => {
//   console.log('invalid db connection', error);
// })

app.listen(PORT, () => {
  db_conn(dbUri);
  console.log(' db uri: ', dbUri);
  console.log(`Server connected to port ${ PORT }`);
});

export default app