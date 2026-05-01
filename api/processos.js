// api/processo.js
import { connectToDatabase } from '../src/mongodb.js';

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
        const collection = db.collection('processos');

        // GET - Buscar todos os processos
        if (req.method === 'GET') {
            const { status, busca, limit = 100 } = req.query;
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
            
            const processos = await collection.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit)).toArray();
            res.status(200).json({ success: true, data: processos });
        }
        
        // GET by ID - Buscar um processo específico
        else if (req.method === 'GET' && req.query.id) {
            const { ObjectId } = await import('mongodb');
            const processo = await collection.findOne({ _id: new ObjectId(req.query.id) });
            
            if (!processo) {
                return res.status(404).json({ success: false, error: 'Processo não encontrado' });
            }
            res.status(200).json({ success: true, data: processo });
        }
        
        // POST - Criar novo processo
        else if (req.method === 'POST') {
            const processo = {
                ...req.body,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                valorRecebido: req.body.valorRecebido || 0,
                resultado: req.body.resultado || null
            };
            
            const result = await collection.insertOne(processo);
            res.status(201).json({ 
                success: true, 
                data: { ...processo, _id: result.insertedId },
                message: 'Processo criado com sucesso'
            });
        }
        
        // PUT - Atualizar processo
        else if (req.method === 'PUT') {
            const { ObjectId } = await import('mongodb');
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
            
            res.status(200).json({ 
                success: true, 
                message: 'Processo atualizado com sucesso' 
            });
        }
        
        // DELETE - Remover processo
        else if (req.method === 'DELETE') {
            const { ObjectId } = await import('mongodb');
            const { id } = req.query;
            
            // Remover também audiências e tarefas relacionadas
            const audienciasCollection = db.collection('audiencias');
            const tarefasCollection = db.collection('tarefas');
            
            await audienciasCollection.deleteMany({ processoId: id });
            await tarefasCollection.deleteMany({ processoId: id });
            
            const result = await collection.deleteOne({ _id: new ObjectId(id) });
            
            if (result.deletedCount === 0) {
                return res.status(404).json({ success: false, error: 'Processo não encontrado' });
            }
            
            res.status(200).json({ 
                success: true, 
                message: 'Processo e dados relacionados removidos com sucesso' 
            });
        }
        
        else {
            res.status(405).json({ success: false, error: 'Método não permitido' });
        }
    } catch (error) {
        console.error('Erro na API de processos:', error);
        res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
}