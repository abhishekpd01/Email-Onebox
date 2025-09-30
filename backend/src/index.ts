import * as dotenv from 'dotenv';
import express from 'express';
import { ImapService } from './ImapService';
import { ElasticsearchService } from './ElasticsearchService';

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

    // Start IMAP synchronization for each account
    console.log('Starting Onebox Email Synchronizer...');
    for(const config of accounts) {
        if(config.user && config.password) {
            const imapService = new ImapService(config, esService);
            imapService.connect();
        }
    }

    // Set up the Express Server
    const app = express();
    const port = process.env.PORT || 3000;
    app.use(express.json());

    app.get('/api/search', async (req, res) => {
        const { q, account } = req.query;

        if(!q || typeof q !== 'string') {
            return res.status(400).send({ error: 'Query parameter "q" is required.' })
        }


        try {
            const results = await esService.searchEmails(q, account as string);
            res.json(results);
        } catch (error) {
            console.error('Search API error:', error);
            res.status(500).send({ error: 'Failed to perform search.' });
        }
    })

    app.listen(port, () => console.log(`Server is up and running 🏃 on PORT ${port}`))
}

main().catch(console.error);
