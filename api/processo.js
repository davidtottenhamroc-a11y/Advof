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
    const collection = db.collection('processos');

    // GET - Listar processos
    if (req.method === 'GET') {
      const { status, busca } = req.query;
      let filter = {};
      
      if (status && status !== 'todos') {
        filter.status = status;
      }
      if (busca) {
        filter.$or = [
          { numero: { $regex: busca, $options: 'i' } },
          { cliente: { $regex: busca, $options: 'i' } },
          { parteContraria: { $regex: busca, $options: 'i' } }
        ];
      }
      
      const processos = await collection.find(filter).sort({ createdAt: -1 }).toArray();
      return res.status(200).json({ success: true, data: processos });
    }

    // POST - Criar processo
    if (req.method === 'POST') {
      const processo = {
        ...req.body,
        valorRecebido: req.body.valorRecebido || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const result = await collection.insertOne(processo);
      const novoProcesso = { ...processo, _id: result.insertedId };
      return res.status(201).json({ success: true, data: novoProcesso });
    }

    // PUT - Atualizar processo
    if (req.method === 'PUT') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ success: false, error: 'ID não informado' });
      
      const updateData = { ...req.body, updatedAt: new Date().toISOString() };
      delete updateData._id;
      
      await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );
      
      return res.status(200).json({ success: true });
    }

    // DELETE - Remover processo
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ success: false, error: 'ID não informado' });
      
      await collection.deleteOne({ _id: new ObjectId(id) });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Método não permitido' });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}