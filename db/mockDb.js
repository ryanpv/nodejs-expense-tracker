import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb"


export default async function connect() {
  const mongoServer = await MongoMemoryServer.create()
  const mongoUri = mongoServer.getUri();
  console.log('mock URI: ', mongoUri);

  const mongoClient = new MongoClient(mongoUri)
  const _db = await mongoClient.connect()

  return _db.db('testDb')
}