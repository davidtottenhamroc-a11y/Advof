// src/mongodb.js
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb+srv://lucasvianaabrantes23_db_user:proJectpwssd!@cluster0.bq02dgw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
};

let client;
let clientPromise;

if (!process.env.MONGODB_URI) {
    console.warn('⚠️ MONGODB_URI não configurada. Usando string padrão.');
}

if (process.env.NODE_ENV === 'development') {
    // Em desenvolvimento, use uma variável global para manter a conexão
    if (!global._mongoClientPromise) {
        client = new MongoClient(uri, options);
        global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
} else {
    // Em produção, crie uma nova conexão
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
}

export async function connectToDatabase() {
    try {
        const client = await clientPromise;
        const db = client.db('advflow_db');
        
        // Criar índices se não existirem
        await criarIndices(db);
        
        return { db, client };
    } catch (error) {
        console.error('Erro ao conectar ao MongoDB:', error);
        throw error;
    }
}

async function criarIndices(db) {
    try {
        // Índices para processos
        const processosCollection = db.collection('processos');
        await processosCollection.createIndex({ numero: 1 }, { unique: true });
        await processosCollection.createIndex({ cliente: 1 });
        await processosCollection.createIndex({ status: 1 });
        await processosCollection.createIndex({ createdAt: -1 });
        
        // Índices para audiências
        const audienciasCollection = db.collection('audiencias');
        await audienciasCollection.createIndex({ processoId: 1 });
        await audienciasCollection.createIndex({ data: 1 });
        
        // Índices para tarefas
        const tarefasCollection = db.collection('tarefas');
        await tarefasCollection.createIndex({ processoId: 1 });
        await tarefasCollection.createIndex({ prazo: 1 });
        await tarefasCollection.createIndex({ concluida: 1 });
        
        // Índices para financeiro
        const financeiroCollection = db.collection('financeiro');
        await financeiroCollection.createIndex({ processoId: 1 });
        await financeiroCollection.createIndex({ data: -1 });
        
        console.log('✅ Índices do MongoDB criados/verificados com sucesso');
    } catch (error) {
        console.error('Erro ao criar índices:', error);
    }
}

export default { connectToDatabase };