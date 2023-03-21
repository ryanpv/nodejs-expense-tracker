import cors from 'cors';
import 'dotenv/config.js';
import express from 'express';
import { db_conn, getDb } from './db/db_connect.js';
import { ObjectId } from 'mongodb';
import NodeCache from 'node-cache';


const PORT = 3001
const app = express();
const dbUri = process.env.DB_URI;
const cache = new NodeCache()

app.use(cors({ origin: true }));
app.use(express.urlencoded({ extended: true }))
app.use(express.json());
app.set('view engine', 'ejs');


// RENDER HOME PAGE
app.get('/', function (req, res) {
  console.log('ENV: ', process.env.NODE_ENV);
  console.log(dbUri);
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

  const findData = await db_connect.db("Expenses_list")
  .collection("spending_list")
  .find({})
  .skip(paginator)
  .limit(20)
  .toArray();
  
  let concatArr = []
  const key = 'testKey'
  const cacheData = cache.get(key);
  

  if (cacheData === undefined) {
    console.log('true');
    cache.set(key, findData)
  } else {
    console.log('false');
    cache.set(key, cacheData.concat(findData))
    // concatArr = concatArr.concat(cache.get(key))
    concatArr = cache.get(key)
  }


  console.log('concatArr: ', concatArr);  
  console.log('cache array test (length): ', typeof cacheData === 'object' ? cacheData.length : null);
  // console.log('paginator var value: ', paginator);
  // console.log('req query value: ', req.query.paginator);
  // console.log('paginator: ', paginator);
  console.log('data response length: ', findData.length);
  console.log('data : ', findData);
  console.log('cache data: ', cacheData)
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
  let db_connect = await getDb(dbUri);
  const newExpenseObj = {
    item: req.body.purchaseInputName,
    price: parseFloat(req.body.priceInputName),
    purchaseMonth: req.body.monthInputName,
    purchaseYear: req.body.yearInputName,
    category: req.body.categoryInputName
  };

  db_connect.db('Expenses_list').collection('spending_list').insertOne(newExpenseObj);
  res.redirect('/add-expense');
});

// DELETE SPECIFIC EXPENSE
app.get('/delete-expense/:id', async (req, res) => {
  cache.del('testKey')
  cache.del('filterKey')
  let db_connect = await getDb(dbUri);
  const query = { _id: new ObjectId(req.params.id) };
  console.log('req params item ID: ', req.params.id);

  await db_connect.db('Expenses_list')
    .collection('spending_list')
    .deleteOne(query, function (request, response) {
      console.log('deleted: ', response);
    });

  res.redirect('/get-expenses');
});

// UPDATE SPECIFIC EXPENSE 1/2 (first routes to form page)
app.get('/update-item-form/:id', async (req, res) => {
  cache.del('testKey')
  cache.del('filterKey')
  let db_connect = await getDb(dbUri);
  const query = { _id: new ObjectId(req.params.id) };

  const singleDoc = await db_connect.db('Expenses_list')
    .collection('spending_list')
    .find(query)
    .toArray()
    console.log(singleDoc);

    res.render('pages/updateForm.ejs', {
      itemData: singleDoc[0]
    });
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
      purchaseYear: req.body.yearInputName,
      category: req.body.categoryInputName
    }
  };

  db_connect.db('Expenses_list')
    .collection('spending_list')
    .updateOne(query, updatedValues);

  res.redirect('/get-expenses');
});

// FILTER EXPENSE LIST BY MONTH
app.get('/filter-list', async (req, res) => {
  const key = 'testKey'
  cache.del(key)
  let db_connect = getDb(dbUri);
  const query = req.query.month ? { purchaseMonth: req.query.month } : { category: req.query.category }
  console.log('query: ', query);

  const filteredResults = await db_connect.db('Expenses_list')
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

app.get('/monthly-expenses', async (req, res) => {
  cache.del('filterKey')
  cache.del('testKey')
  let db_connect = await getDb(dbUri);
  const query = req.query.month && req.query.category === 'select' ? { purchaseMonth: req.query.month } 
    : req.query.category && req.query.month === 'select' ? { category: req.query.category }
    : { purchaseMonth: req.query.month, category: req.query.category }
  
  let paginator = req.query.paginator === undefined ? 0 : parseInt(req.query.paginator) + 5
  const filteredResults = await db_connect.db('Expenses_list')
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
    
    console.log('filter results', filteredResults);
    console.log('result length: ', filteredResults.length);
    res.render('pages/filterPage.ejs', {
      tableData: concatArr.length > 0 ? concatArr : filteredResults,
      expenseTotal: totalSpend,
      monthQuery: req.query.month,
      categoryQuery: req.query.category,
      paginator: parseInt(paginator),
      resLength: filteredResults.length,
    });
});



app.get('/test-query', function (req, res) {
  return res.send("Hello World")
});

app.listen(PORT, () => {
  db_conn(dbUri);
  console.log(`Server connected to port ${ PORT }`);
});

export default app