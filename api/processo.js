import { MongoClient } from 'mongodb';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('processos');

    if (req.method === 'GET') {
      const processos = await collection.find({}).sort({ createdAt: -1 }).toArray();
      return res.status(200).json({ success: true, data: processos });
    }

    if (req.method === 'POST') {
      const processo = {
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const result = await collection.insertOne(processo);
      const novoProcesso = { ...processo, _id: result.insertedId };
      return res.status(201).json({ success: true, data: novoProcesso });
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      const { ObjectId } = await import('mongodb');
      const updateData = { ...req.body, updatedAt: new Date().toISOString() };
      delete updateData._id;
      await collection.updateOne({ _id: new ObjectId(id) }, { $set: updateData });
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      const { ObjectId } = await import('mongodb');
      await collection.deleteOne({ _id: new ObjectId(id) });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}