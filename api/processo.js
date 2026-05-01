import { MongoClient } from 'mongodb';

const uri = 'mongodb+srv://lucasvianaabrantes23_db_user:proJectpsswd%21@cluster0.bq02dgw.mongodb.net/advflow_db?retryWrites=true&w=majority';

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
  // CORS
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
      const processos = await collection.find({}).sort({ createdAt: -1 }).toArray();
      return res.status(200).json({ success: true, data: processos });
    }

    // POST - Criar processo
    if (req.method === 'POST') {
      const processo = {
        numero: req.body.numero,
        cliente: req.body.cliente,
        parteContraria: req.body.parteContraria || '',
        advogadoAdverso: req.body.advogadoAdverso || '',
        valorCausa: req.body.valorCausa || 0,
        honorarios: req.body.honorarios || 0,
        valorRecebido: req.body.valorRecebido || 0,
        vara: req.body.vara || '',
        status: req.body.status || 'aguardando',
        proximoPrazo: req.body.proximoPrazo || null,
        dataDistribuicao: req.body.dataDistribuicao || null,
        observacoes: req.body.observacoes || '',
        resultado: req.body.resultado || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const result = await collection.insertOne(processo);
      return res.status(201).json({ success: true, data: { ...processo, _id: result.insertedId } });
    }

    // PUT - Atualizar processo
    if (req.method === 'PUT') {
      const { ObjectId } = await import('mongodb');
      const { id } = req.query;
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
      const { ObjectId } = await import('mongodb');
      const { id } = req.query;
      await collection.deleteOne({ _id: new ObjectId(id) });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Método não permitido' });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}