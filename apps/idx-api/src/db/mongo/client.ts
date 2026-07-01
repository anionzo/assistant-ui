import { MongoClient, type Db } from "mongodb";
import { DB_NAME } from "./collections";

let clientInstance: MongoClient | null = null;
let dbInstance: Db | null = null;

export function getMongoUri(): string {
  const uri = process.env.MONGODB_URI ?? process.env.DATABASE_URL;
  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }
  return uri;
}

export async function getMongoDb(): Promise<Db> {
  if (dbInstance) return dbInstance;

  const client = new MongoClient(getMongoUri());
  await client.connect();
  clientInstance = client;
  dbInstance = client.db(DB_NAME);
  return dbInstance;
}

export async function closeMongo(): Promise<void> {
  if (clientInstance) {
    await clientInstance.close();
    clientInstance = null;
    dbInstance = null;
  }
}