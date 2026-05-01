// api/config.js
import { connectToDatabase } from '../src/mongodb.js';

export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { db } = await connectToDatabase();
        const collection = db.collection('config');

        // GET - Buscar configurações
        if (req.method === 'GET') {
            const configs = await collection.find({}).toArray();
            const configMap = {};
            configs.forEach(c => { configMap[c.chave] = c.valor; });
            
            // Valores padrão
            const defaultConfig = {
                metaFinanceira: 20000,
                notificacoesAtivas: true,
                tema: 'escuro',
                versao: '1.0.0'
            };
            
            res.status(200).json({ 
                success: true, 
                data: { ...defaultConfig, ...configMap }
            });
        }
        
        // POST/PUT - Salvar configurações
        else if (req.method === 'POST' || req.method === 'PUT') {
            const configs = req.body;
            
            for (const [chave, valor] of Object.entries(configs)) {
                await collection.updateOne(
                    { chave },
                    { $set: { chave, valor, updatedAt: new Date().toISOString() } },
                    { upsert: true }
                );
            }
            
            res.status(200).json({ 
                success: true, 
                message: 'Configurações salvas com sucesso' 
            });
        }
        
        else {
            res.status(405).json({ success: false, error: 'Método não permitido' });
        }
    } catch (error) {
        console.error('Erro na API de configurações:', error);
        res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
}