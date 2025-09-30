import * as dotenv from 'dotenv';
import { ImapService } from './ImapService';

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

function main() {
    console.log('Starting Onebox Email Synchronizer...');

    for(const config of accounts) {
        if(config.user && config.password) {
            const imapService = new ImapService(config);
            imapService.connect();
        }
    }
}

main();
