// api/financeiro.js
import { connectToDatabase } from '../src/mongodb.js';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { db } = await connectToDatabase();
        const collection = db.collection('financeiro');

        // GET - Buscar recebimentos
        if (req.method === 'GET') {
            const { processoId, dataInicio, dataFim, limit = 100 } = req.query;
            let filter = {};
            
            if (processoId) filter.processoId = processoId;
            if (dataInicio && dataFim) {
                filter.data = {
                    $gte: new Date(dataInicio).toISOString(),
                    $lte: new Date(dataFim).toISOString()
                };
            }
            
            const recebimentos = await collection.find(filter).sort({ data: -1 }).limit(parseInt(limit)).toArray();
            
            // Buscar dados dos processos relacionados
            const processosCollection = db.collection('processos');
            const processosIds = [...new Set(recebimentos.map(r => r.processoId))];
            const processos = await processosCollection.find({ _id: { $in: processosIds.map(id => new ObjectId(id)) } }).toArray();
            
            const processosMap = {};
            processos.forEach(p => { processosMap[p._id.toString()] = p; });
            
            const recebimentosComProcesso = recebimentos.map(r => ({
                ...r,
                processo: processosMap[r.processoId] || null
            }));
            
            res.status(200).json({ success: true, data: recebimentosComProcesso });
        }
        
        // GET resumo - Resumo financeiro
        else if (req.method === 'GET' && req.query.resumo === 'true') {
            const totalHonorarios = await db.collection('processos').aggregate([
                { $group: { _id: null, total: { $sum: '$honorarios' } } }
            ]).toArray();
            
            const totalRecebido = await collection.aggregate([
                { $group: { _id: null, total: { $sum: '$valor' } } }
            ]).toArray();
            
            const recebimentosPorMes = await collection.aggregate([
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m', date: { $toDate: '$data' } } },
                        total: { $sum: '$valor' }
                    }
                },
                { $sort: { _id: 1 } }
            ]).toArray();
            
            res.status(200).json({ 
                success: true, 
                data: {
                    totalHonorarios: totalHonorarios[0]?.total || 0,
                    totalRecebido: totalRecebido[0]?.total || 0,
                    saldoPendente: (totalHonorarios[0]?.total || 0) - (totalRecebido[0]?.total || 0),
                    recebimentosPorMes
                }
            });
        }
        
        // POST - Registrar recebimento
        else if (req.method === 'POST') {
            const recebimento = {
                ...req.body,
                data: new Date().toISOString(),
                createdAt: new Date().toISOString()
            };
            
            const result = await collection.insertOne(recebimento);
            
            // Atualizar valorRecebido do processo
            const processosCollection = db.collection('processos');
            const processo = await processosCollection.findOne({ _id: new ObjectId(recebimento.processoId) });
            const novoValorRecebido = (processo.valorRecebido || 0) + recebimento.valor;
            
            await processosCollection.updateOne(
                { _id: new ObjectId(recebimento.processoId) },
                { $set: { valorRecebido: novoValorRecebido, updatedAt: new Date().toISOString() } }
            );
            
            res.status(201).json({ 
                success: true, 
                data: { ...recebimento, _id: result.insertedId },
                message: 'Recebimento registrado com sucesso'
            });
        }
        
        // DELETE - Remover recebimento
        else if (req.method === 'DELETE') {
            const { id } = req.query;
            const recebimento = await collection.findOne({ _id: new ObjectId(id) });
            
            if (!recebimento) {
                return res.status(404).json({ success: false, error: 'Recebimento não encontrado' });
            }
            
            // Atualizar valorRecebido do processo
            const processosCollection = db.collection('processos');
            const processo = await processosCollection.findOne({ _id: new ObjectId(recebimento.processoId) });
            const novoValorRecebido = (processo.valorRecebido || 0) - recebimento.valor;
            
            await processosCollection.updateOne(
                { _id: new ObjectId(recebimento.processoId) },
                { $set: { valorRecebido: Math.max(0, novoValorRecebido), updatedAt: new Date().toISOString() } }
            );
            
            const result = await collection.deleteOne({ _id: new ObjectId(id) });
            
            res.status(200).json({ 
                success: true, 
                message: 'Recebimento removido com sucesso' 
            });
        }
        
        else {
            res.status(405).json({ success: false, error: 'Método não permitido' });
        }
    } catch (error) {
        console.error('Erro na API financeira:', error);
        res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
}