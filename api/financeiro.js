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
    const collection = db.collection('financeiro');

    if (req.method === 'GET') {
      const { processoId } = req.query;
      let filter = {};
      if (processoId) filter.processoId = processoId;
      
      const recebimentos = await collection.find(filter).sort({ data: -1 }).toArray();
      
      // Calcular resumo
      const totalHonorarios = await db.collection('processos').aggregate([
        { $group: { _id: null, total: { $sum: '$honorarios' } } }
      ]).toArray();
      
      const totalRecebido = await collection.aggregate([
        { $group: { _id: null, total: { $sum: '$valor' } } }
      ]).toArray();
      
      return res.status(200).json({ 
        success: true, 
        data: {
          recebimentos,
          totalHonorarios: totalHonorarios[0]?.total || 0,
          totalRecebido: totalRecebido[0]?.total || 0
        }
      });
    }

    if (req.method === 'POST') {
      const recebimento = {
        ...req.body,
        data: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      
      const result = await collection.insertOne(recebimento);
      
      // Atualizar valorRecebido do processo
      await db.collection('processos').updateOne(
        { _id: new ObjectId(recebimento.processoId) },
        { $inc: { valorRecebido: recebimento.valor } }
      );
      
      return res.status(201).json({ 
        success: true, 
        data: { ...recebimento, _id: result.insertedId },
        message: 'Recebimento registrado'
      });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      const recebimento = await collection.findOne({ _id: new ObjectId(id) });
      
      if (recebimento) {
        await db.collection('processos').updateOne(
          { _id: new ObjectId(recebimento.processoId) },
          { $inc: { valorRecebido: -recebimento.valor } }
        );
      }
      
      await collection.deleteOne({ _id: new ObjectId(id) });
      return res.status(200).json({ success: true, message: 'Recebimento removido' });
    }

    return res.status(405).json({ success: false, error: 'Método não permitido' });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}