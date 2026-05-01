import { connectToDatabase } from '../src/mongodb.js';
import { ObjectId } from 'mongodb';

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
      if (!id) return res.status(400).json({ success: false, error: 'ID não informado' });
      await collection.deleteOne({ _id: new ObjectId(id) });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}