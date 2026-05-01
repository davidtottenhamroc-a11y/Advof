// api/documento.js
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
        const collection = db.collection('documentos');

        // GET - Buscar documentos
        if (req.method === 'GET') {
            const { tipo } = req.query;
            let filter = {};
            
            if (tipo) filter.tipo = tipo;
            
            const documentos = await collection.find(filter).sort({ createdAt: -1 }).toArray();
            res.status(200).json({ success: true, data: documentos });
        }
        
        // GET modelos padrão - Modelos pré-carregados
        else if (req.method === 'GET' && req.query.padrao === 'true') {
            const modelosPadrao = [
                {
                    id: 'inicial',
                    nome: 'Petição Inicial',
                    tipo: 'padrao',
                    conteudo: `EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA ___ VARA CÍVEL DA COMARCA DE ___.

[NOME DO CLIENTE], [NACIONALIDADE], [ESTADO CIVIL], [PROFISSÃO], portador do CPF sob n° [CPF], residente e domiciliado na [ENDEREÇO], vem, respeitosamente, por intermédio de seu advogado, propor a presente

AÇÃO [TIPO DE AÇÃO]

em face de [PARTE CONTRARIA]...`
                },
                {
                    id: 'contestacao',
                    nome: 'Contestação',
                    tipo: 'padrao',
                    conteudo: `EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA ___ VARA CÍVEL DA COMARCA DE ___

[NOME DO CLIENTE]...`
                },
                {
                    id: 'recurso',
                    nome: 'Recurso de Apelação',
                    tipo: 'padrao',
                    conteudo: `EXCELENTÍSSIMO SENHOR DOUTOR DESEMBARGADOR PRESIDENTE...`
                },
                {
                    id: 'embargos',
                    nome: 'Embargos de Declaração',
                    tipo: 'padrao',
                    conteudo: `EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO...`
                }
            ];
            res.status(200).json({ success: true, data: modelosPadrao });
        }
        
        // POST - Salvar documento/modelo
        else if (req.method === 'POST') {
            const documento = {
                ...req.body,
                tipo: req.body.tipo || 'usuario',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            const result = await collection.insertOne(documento);
            res.status(201).json({ 
                success: true, 
                data: { ...documento, _id: result.insertedId },
                message: 'Documento salvo com sucesso'
            });
        }
        
        // PUT - Atualizar documento
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
                return res.status(404).json({ success: false, error: 'Documento não encontrado' });
            }
            
            res.status(200).json({ 
                success: true, 
                message: 'Documento atualizado com sucesso' 
            });
        }
        
        // DELETE - Remover documento
        else if (req.method === 'DELETE') {
            const { id } = req.query;
            const result = await collection.deleteOne({ _id: new ObjectId(id) });
            
            if (result.deletedCount === 0) {
                return res.status(404).json({ success: false, error: 'Documento não encontrado' });
            }
            
            res.status(200).json({ 
                success: true, 
                message: 'Documento removido com sucesso' 
            });
        }
        
        else {
            res.status(405).json({ success: false, error: 'Método não permitido' });
        }
    } catch (error) {
        console.error('Erro na API de documentos:', error);
        res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
}