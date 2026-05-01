// api/tarefa.js
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
        const collection = db.collection('tarefas');

        // GET - Buscar tarefas
        if (req.method === 'GET') {
            const { processoId, concluida, prioridade } = req.query;
            let filter = {};
            
            if (processoId) filter.processoId = processoId;
            if (concluida !== undefined) filter.concluida = concluida === 'true';
            if (prioridade) filter.prioridade = prioridade;
            
            const tarefas = await collection.find(filter).sort({ prazo: 1 }).toArray();
            res.status(200).json({ success: true, data: tarefas });
        }
        
        // GET by ID - Buscar tarefa específica
        else if (req.method === 'GET' && req.query.id) {
            const tarefa = await collection.findOne({ _id: new ObjectId(req.query.id) });
            
            if (!tarefa) {
                return res.status(404).json({ success: false, error: 'Tarefa não encontrada' });
            }
            res.status(200).json({ success: true, data: tarefa });
        }
        
        // POST - Criar nova tarefa
        else if (req.method === 'POST') {
            const tarefa = {
                ...req.body,
                concluida: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            const result = await collection.insertOne(tarefa);
            res.status(201).json({ 
                success: true, 
                data: { ...tarefa, _id: result.insertedId },
                message: 'Tarefa criada com sucesso'
            });
        }
        
        // PUT - Atualizar tarefa
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
                return res.status(404).json({ success: false, error: 'Tarefa não encontrada' });
            }
            
            res.status(200).json({ 
                success: true, 
                message: 'Tarefa atualizada com sucesso' 
            });
        }
        
        // PATCH - Concluir tarefa
        else if (req.method === 'PATCH') {
            const { id } = req.query;
            const result = await collection.updateOne(
                { _id: new ObjectId(id) },
                { 
                    $set: { 
                        concluida: true,
                        concluidaEm: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    } 
                }
            );
            
            if (result.matchedCount === 0) {
                return res.status(404).json({ success: false, error: 'Tarefa não encontrada' });
            }
            
            res.status(200).json({ 
                success: true, 
                message: 'Tarefa concluída com sucesso' 
            });
        }
        
        // DELETE - Remover tarefa
        else if (req.method === 'DELETE') {
            const { id } = req.query;
            const result = await collection.deleteOne({ _id: new ObjectId(id) });
            
            if (result.deletedCount === 0) {
                return res.status(404).json({ success: false, error: 'Tarefa não encontrada' });
            }
            
            res.status(200).json({ 
                success: true, 
                message: 'Tarefa removida com sucesso' 
            });
        }
        
        else {
            res.status(405).json({ success: false, error: 'Método não permitido' });
        }
    } catch (error) {
        console.error('Erro na API de tarefas:', error);
        res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
}