import { MongoClient } from 'mongodb';
import { ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb+srv://lucasvianaabrantes23_db_user:proJectpsswd!@cluster0.bq02dgw.mongodb.net/advflow_db?retryWrites=true&w=majority';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('advflow_db');

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('audiencias');

    if (req.method === 'GET') {
      const audiencias = await collection.find({}).sort({ data: 1 }).toArray();
      return res.status(200).json({ success: true, data: audiencias });
    }

    if (req.method === 'POST') {
      const audiencia = {
        ...req.body,
        createdAt: new Date().toISOString()
      };
      const result = await collection.insertOne(audiencia);
      return res.status(201).json({ success: true, data: { ...audiencia, _id: result.insertedId } });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      await collection.deleteOne({ _id: new ObjectId(id) });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}