// api/audiencia.js
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
        const collection = db.collection('audiencias');

        // GET - Buscar audiências
        if (req.method === 'GET') {
            const { processoId, dataInicio, dataFim } = req.query;
            let filter = {};
            
            if (processoId) filter.processoId = processoId;
            if (dataInicio && dataFim) {
                filter.data = {
                    $gte: new Date(dataInicio).toISOString(),
                    $lte: new Date(dataFim).toISOString()
                };
            }
            
            const audiencias = await collection.find(filter).sort({ data: 1 }).toArray();
            
            // Buscar dados dos processos relacionados
            const processosCollection = db.collection('processos');
            const processosIds = [...new Set(audiencias.map(a => a.processoId))];
            const processos = await processosCollection.find({ _id: { $in: processosIds.map(id => new ObjectId(id)) } }).toArray();
            
            const processosMap = {};
            processos.forEach(p => { processosMap[p._id.toString()] = p; });
            
            const audienciasComProcesso = audiencias.map(a => ({
                ...a,
                processo: processosMap[a.processoId] || null
            }));
            
            res.status(200).json({ success: true, data: audienciasComProcesso });
        }
        
        // GET by ID - Buscar audiência específica
        else if (req.method === 'GET' && req.query.id) {
            const audiencia = await collection.findOne({ _id: new ObjectId(req.query.id) });
            
            if (!audiencia) {
                return res.status(404).json({ success: false, error: 'Audiência não encontrada' });
            }
            res.status(200).json({ success: true, data: audiencia });
        }
        
        // POST - Criar nova audiência
        else if (req.method === 'POST') {
            const audiencia = {
                ...req.body,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            const result = await collection.insertOne(audiencia);
            res.status(201).json({ 
                success: true, 
                data: { ...audiencia, _id: result.insertedId },
                message: 'Audiência agendada com sucesso'
            });
        }
        
        // PUT - Atualizar audiência
        else if (req.method === 'PUT') {
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
                return res.status(404).json({ success: false, error: 'Audiência não encontrada' });
            }
            
            res.status(200).json({ 
                success: true, 
                message: 'Audiência atualizada com sucesso' 
            });
        }
        
        // DELETE - Remover audiência
        else if (req.method === 'DELETE') {
            const { id } = req.query;
            const result = await collection.deleteOne({ _id: new ObjectId(id) });
            
            if (result.deletedCount === 0) {
                return res.status(404).json({ success: false, error: 'Audiência não encontrada' });
            }
            
            res.status(200).json({ 
                success: true, 
                message: 'Audiência removida com sucesso' 
            });
        }
        
        // GET hoje - Audiências do dia
        else if (req.method === 'GET' && req.query.hoje === 'true') {
            const hoje = new Date();
            const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();
            const fimDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1).toISOString();
            
            const audiencias = await collection.find({
                data: { $gte: inicioDia, $lt: fimDia }
            }).toArray();
            
            res.status(200).json({ success: true, data: audiencias });
        }
        
        else {
            res.status(405).json({ success: false, error: 'Método não permitido' });
        }
    } catch (error) {
        console.error('Erro na API de audiências:', error);
        res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
}