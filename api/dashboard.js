import { connectToDatabase } from '../src/mongodb.js';

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
    
    const hoje = new Date();
    const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const fimDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
    
    const audienciasHoje = await db.collection('audiencias').countDocuments({
      data: { $gte: inicioDia.toISOString(), $lt: fimDia.toISOString() }
    });
    
    const prazoFim = new Date();
    prazoFim.setDate(prazoFim.getDate() + 2);
    const prazosFatais = await db.collection('processos').countDocuments({
      proximoPrazo: { $gte: new Date().toISOString(), $lte: prazoFim.toISOString() }
    });
    
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
    
    const tarefasPendentes = await db.collection('tarefas').countDocuments({ concluida: false });
    
    return res.status(200).json({
      success: true,
      data: {
        metricas: {
          totalProcessos,
          processosAtivos,
          prazosFatais,
          audienciasHoje,
          totalHonorarios,
          processosGanhos,
          taxaExito: parseFloat(taxaExito),
          valorCausaTotal,
          tarefasPendentes
        }
      }
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}