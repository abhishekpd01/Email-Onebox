import * as dotenv from 'dotenv';
import express from 'express';
import { ImapService } from './ImapService';
import { ElasticsearchService } from './ElasticsearchService';
import { AIService } from './AIService';
import { RagService } from './RagService';
import { NotificationService } from './NotificationService';

dotenv.config();

const accounts = [
    {
        user: process.env.IMAP_USER_1!,
        password: process.env.IMAP_PASSWORD_1!,
        host: process.env.IMAP_HOST_1!,
        port: 993,
        tls: true,
        tlsOptions: {
            rejectUnauthorized: false,
            servername: process.env.IMAP_HOST_1!
        },
        connTimeout: 30000,  // 30 seconds
        authTimeout: 15000,  // 15 seconds
        keepalive: {
            interval: 10000,
            idleInterval: 300000,
            forceNoop: true
        }
    },
    {
        user: process.env.IMAP_USER_2!,
        password: process.env.IMAP_PASSWORD_2!,
        host: process.env.IMAP_HOST_2!,
        port: 993,
        tls: true,
        tlsOptions: {
            rejectUnauthorized: false,
            servername: process.env.IMAP_HOST_2!
        },
        connTimeout: 30000,
        authTimeout: 15000,
        keepalive: {
            interval: 10000,
            idleInterval: 300000,
            forceNoop: true
        }
    },
]

async function main() {
    
    // Initialize the Elastisearch Storage Service
    const esService = new ElasticsearchService();
    await esService.checkConnection();
    await esService.createIndexIfNotExists();
    
    // Initialize the AI Service
    const aiService = new AIService();

    // Initialize Notification Service
    const notificationService = new NotificationService();

    // Initialize RAG service
    const ragService = new RagService();

    // Start IMAP synchronization for each account
    console.log('Starting Onebox Email Synchronizer...');
    for(const config of accounts) {
        if(config.user && config.password) {
            const imapService = new ImapService(config, esService, aiService, notificationService);
            imapService.connect();
        }
    }

    // Set up the Express Server
    const app = express();
    const port = process.env.PORT || 3000;
    app.use(express.json());

    app.get('/api/search', async (req, res) => {
        
        const q = req.query.q as string | undefined;
        const account = req.query.account as string | undefined;

        try {
        // Pass the query, even if it's empty/undefined. The service will handle it.
        const results = await esService.searchEmails(q || '', account);
        res.json(results);
        } catch (error) {
        console.error('Search API error:', error);
        res.status(500).send({ error: 'Failed to perform search.' });
        }
    });

    app.post('/api/agenda', async (req, res) => {
        const { text } = req.body;
        console.log(text);
        if(!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Request body must contain a "text" field.' });
        }

        try {
            await ragService.addAgenda(text);
            res.status(200).json({ message: 'Agenda added Successfully!' });
        } catch (error) {
            console.error('Agenda API Error: ', error);
            res.status(500).json({ error: 'Failed to add Agenda' });
        }
    });

    app.post('/api/suggest-reply', async (req, res) => {
        const { emailContent } = req.body;
        console.log(emailContent);
        if(!emailContent || typeof emailContent !== 'string') {
            return res.status(400).send({ error: 'Request body must contain an "emailContent" field.' });
        }

        try {
            const reply = await ragService.generateReply(emailContent);
            res.json({ reply });
        } catch (error) {
            console.error('Suggest Reply API error:', error);
            res.status(500).send({ error: 'Failed to generate reply.' })
        }
    })

    app.listen(port, () => console.log(`Server is up and running 🏃 on PORT ${port}`))
}

main().catch(console.error);
