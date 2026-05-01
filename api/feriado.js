// api/feriado.js
import { connectToDatabase } from '../src/mongodb.js';

export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { db } = await connectToDatabase();
        const collection = db.collection('feriados');

        // GET - Buscar feriados
        if (req.method === 'GET') {
            const feriados = await collection.find({}).sort({ data: 1 }).toArray();
            
            // Se não houver feriados, criar os padrão
            if (feriados.length === 0) {
                const feriadosPadrao = [
                    { data: '01-01', descricao: 'Confraternização Universal', tipo: 'nacional' },
                    { data: '07-09', descricao: 'Independência do Brasil', tipo: 'nacional' },
                    { data: '15-11', descricao: 'Proclamação da República', tipo: 'nacional' },
                    { data: '25-12', descricao: 'Natal', tipo: 'nacional' }
                ];
                
                await collection.insertMany(feriadosPadrao);
                res.status(200).json({ success: true, data: feriadosPadrao });
            } else {
                res.status(200).json({ success: true, data: feriados });
            }
        }
        
        // POST - Adicionar feriado
        else if (req.method === 'POST') {
            const feriado = {
                ...req.body,
                createdAt: new Date().toISOString()
            };
            
            // Verificar se já existe
            const existente = await collection.findOne({ data: feriado.data });
            if (existente) {
                return res.status(409).json({ success: false, error: 'Feriado já cadastrado' });
            }
            
            const result = await collection.insertOne(feriado);
            res.status(201).json({ 
                success: true, 
                data: { ...feriado, _id: result.insertedId },
                message: 'Feriado adicionado com sucesso'
            });
        }
        
        // DELETE - Remover feriado
        else if (req.method === 'DELETE') {
            const { data } = req.query;
            const result = await collection.deleteOne({ data });
            
            if (result.deletedCount === 0) {
                return res.status(404).json({ success: false, error: 'Feriado não encontrado' });
            }
            
            res.status(200).json({ 
                success: true, 
                message: 'Feriado removido com sucesso' 
            });
        }
        
        else {
            res.status(405).json({ success: false, error: 'Método não permitido' });
        }
    } catch (error) {
        console.error('Erro na API de feriados:', error);
        res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
}