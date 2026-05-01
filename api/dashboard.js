import { connectToDatabase } from '../src/mongodb.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    const { db } = await connectToDatabase();
    
    // Métricas principais
    const totalProcessos = await db.collection('processos').countDocuments();
    const processosAtivos = await db.collection('processos').countDocuments({ status: { $ne: 'concluido' } });
    
    const hoje = new Date();
    const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();
    const fimDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1).toISOString();
    
    const audienciasHoje = await db.collection('audiencias').countDocuments({
      data: { $gte: inicioDia, $lt: fimDia }
    });
    
    const honorariosMes = await db.collection('processos').aggregate([
      {
        $match: {
          dataDistribuicao: {
            $regex: `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
          }
        }
      },
      { $group: { _id: null, total: { $sum: '$honorarios' } } }
    ]).toArray();
    
    const processosGanhos = await db.collection('processos').countDocuments({ resultado: 'ganho' });
    const totalConcluidos = await db.collection('processos').countDocuments({ status: 'concluido' });
    const taxaExito = totalConcluidos > 0 ? (processosGanhos / totalConcluidos * 100).toFixed(1) : 0;
    
    const valorCausaTotal = await db.collection('processos').aggregate([
      { $group: { _id: null, total: { $sum: '$valorCausa' } } }
    ]).toArray();
    
    const tarefasPendentes = await db.collection('tarefas').countDocuments({ concluida: false });
    
    // Processos por status
    const processosPorStatus = await db.collection('processos').aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray();
    
    // Próximas audiências
    const proximasAudiencias = await db.collection('audiencias').find({
      data: { $gt: new Date().toISOString() }
    }).sort({ data: 1 }).limit(5).toArray();
    
    // Tarefas pendentes
    const tarefasList = await db.collection('tarefas').find({ concluida: false }).sort({ prazo: 1 }).limit(5).toArray();
    
    return res.status(200).json({
      success: true,
      data: {
        metricas: {
          totalProcessos,
          processosAtivos,
          audienciasHoje,
          honorariosMes: honorariosMes[0]?.total || 0,
          processosGanhos,
          taxaExito: parseFloat(taxaExito),
          valorCausaTotal: valorCausaTotal[0]?.total || 0,
          tarefasPendentes
        },
        processosPorStatus,
        proximasAudiencias,
        tarefas: tarefasList
      }
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}