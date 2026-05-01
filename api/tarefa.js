import { connectToDatabase } from '../src/mongodb.js';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('tarefas');

    if (req.method === 'GET') {
      const { processoId, concluida } = req.query;
      let filter = {};
      if (processoId) filter.processoId = processoId;
      if (concluida !== undefined) filter.concluida = concluida === 'true';
      
      const tarefas = await collection.find(filter).sort({ prazo: 1 }).toArray();
      return res.status(200).json({ success: true, data: tarefas });
    }

    if (req.method === 'POST') {
      const tarefa = {
        ...req.body,
        concluida: false,
        createdAt: new Date().toISOString()
      };
      
      const result = await collection.insertOne(tarefa);
      return res.status(201).json({ 
        success: true, 
        data: { ...tarefa, _id: result.insertedId },
        message: 'Tarefa criada'
      });
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...req.body, updatedAt: new Date().toISOString() } }
      );
      return res.status(200).json({ success: true, message: 'Tarefa atualizada' });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      await collection.deleteOne({ _id: new ObjectId(id) });
      return res.status(200).json({ success: true, message: 'Tarefa removida' });
    }

    return res.status(405).json({ success: false, error: 'Método não permitido' });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}