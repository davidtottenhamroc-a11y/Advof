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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false });
  }

  try {
    const { db } = await connectToDatabase();
    
    const totalProcessos = await db.collection('processos').countDocuments();
    const processosAtivos = await db.collection('processos').countDocuments({ status: { $ne: 'concluido' } });
    
    const totalHonorariosAgg = await db.collection('processos').aggregate([
      { $group: { _id: null, total: { $sum: '$honorarios' } } }
    ]).toArray();
    const totalHonorarios = totalHonorariosAgg[0]?.total || 0;
    
    const processosGanhos = await db.collection('processos').countDocuments({ resultado: 'ganho' });
    const totalConcluidos = await db.collection('processos').countDocuments({ status: 'concluido' });
    const taxaExito = totalConcluidos > 0 ? (processosGanhos / totalConcluidos * 100).toFixed(1) : 0;
    
    const valorCausaAgg = await db.collection('processos').aggregate([
      { $group: { _id: null, total: { $sum: '$valorCausa' } } }
    ]).toArray();
    const valorCausaTotal = valorCausaAgg[0]?.total || 0;

    return res.status(200).json({
      success: true,
      data: {
        totalProcessos,
        processosAtivos,
        totalHonorarios,
        taxaExito: parseFloat(taxaExito),
        valorCausaTotal
      }
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}