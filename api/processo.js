import { connectToDatabase } from '../src/mongodb.js';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  // CORS headers
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
      return res.status(201).json({ 
        success: true, 
        data: { ...processo, _id: result.insertedId },
        message: 'Processo criado com sucesso'
      });
    }

    // PUT - Atualizar processo
    if (req.method === 'PUT') {
      const { id } = req.query;
      const updateData = {
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      delete updateData._id;
      
      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );
      
      if (result.matchedCount === 0) {
        return res.status(404).json({ success: false, error: 'Processo não encontrado' });
      }
      
      return res.status(200).json({ success: true, message: 'Processo atualizado' });
    }

    // DELETE - Remover processo
    if (req.method === 'DELETE') {
      const { id } = req.query;
      
      // Remover dados relacionados
      await db.collection('audiencias').deleteMany({ processoId: id });
      await db.collection('tarefas').deleteMany({ processoId: id });
      await db.collection('financeiro').deleteMany({ processoId: id });
      
      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, error: 'Processo não encontrado' });
      }
      
      return res.status(200).json({ success: true, message: 'Processo removido' });
    }

    return res.status(405).json({ success: false, error: 'Método não permitido' });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}