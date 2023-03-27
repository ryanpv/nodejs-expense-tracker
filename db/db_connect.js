import { MongoClient, ServerApiVersion } from 'mongodb';
import { MongoMemoryServer } from "mongodb-memory-server";
const dbUri = process.env.DB_URI;
// const client = new MongoClient(dbUri, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
//   serverApi: ServerApiVersion.v1
// });

// var _db

// export const db_conn = {
//   connectToServer: async function (callback) {
//     await client.connect(function (err, db) {
//       console.log('db: ', db);
//       if (db) {
//         _db = db.db("Expenses_List");
//         console.log("Successfully connected to MongoDB");
//       }
//       return callback(err);
//     });
//   },
//   getDb: function () {
//     return _db
//   },
// };

export const mockServer = await MongoMemoryServer.create();
export const mockUri = mockServer.getUri();

let mongoClient;

export const db_conn = async (uri) => {
// export async function connectToCluster(uri) {
  try {
    mongoClient = new MongoClient(uri);
    console.log('Connecting to MongoDB cluster');
    await mongoClient.connect();
    console.log('Successfully connected to MongoDB!');

    return mongoClient;
  } catch (error) {
    console.log('MongoDB connection failure...', error);
    process.exit()
  }
};

export const getDb = () => {
  return mongoClient;
};