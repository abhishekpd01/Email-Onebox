import Imap from 'node-imap';
import { simpleParser } from 'mailparser';
import { inspect } from 'util';
import { Readable } from 'stream';
import { ElasticsearchService, EmailDocument } from './ElasticsearchService';
import { AIService } from './AIService';

export class ImapService {
    private imap: Imap;

    constructor(
        private config: Imap.Config,
        private esService: ElasticsearchService,
        private aiService: AIService
    ) {
        this.imap = new Imap(config);
    }

    public connect(): void {
        this.imap.once('ready', () => this.onReady());
        this.imap.once('error', (err: Error) => console.error(`[${this.config.user}] IMAP Error:`, err));
        this.imap.once('end', () => console.log(`[${this.config.user}] Connection Ended!`));
        this.imap.connect();
    }

    private async processMessage(stream: NodeJS.ReadableStream) : Promise<void> {
        try {
            const parsed = await simpleParser(stream as Readable);
            const emailContent = parsed.text || '';

            // Categorize the email using AI Service
            const category = await this.aiService.categorizeEmail(emailContent);
            console.log(`[${this.config.user}] AI Categorized email "${parsed.subject}" as "${category}."`);

            const emailDocument: EmailDocument = {
                ...parsed,
                account: this.config.user,
                category: category // Add category to the document
            }

            // Index the document in Elastiseatch
            await this.esService.indexEmail(emailDocument);
            console.log(`[${this.config.user}] Indexed email with category: ${parsed.subject}`);
        } catch (error) {
            console.error(`[${this.config.user}] Error processing message:`, error);
        }
    }

    private onReady(): void {
        console.log(`[${this.config.user}] Connection Successful! Starting initial sync...`);
        this.imap.openBox('INBOX', false, (err, box) => {
            if(err) throw err;

            // Sync last 30 days mails
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 2);     // for testing 0 days.....
            const searchCriteria = ['SINCE', thirtyDaysAgo.toISOString()];

            this.imap.search([searchCriteria], (err, results) => {
                // No emails found
                if(err || !results || results.length === 0){
                    console.log(`[${this.config.user}] No recent emails found! Setting up listener for new emails...`);
                    this.setupIdleListener();
                    return;
                }

                // Found Emails
                console.log(`[${this.config.user}] Found ${results.length} emails from the last 30 days.`);
                const f = this.imap.fetch(results, { bodies: '' });

                f.on('message', (msg, seqno) => {
                    msg.on('body', (stream) => {
                        this.processMessage(stream);
                    });
                });

                // After all initial emails are fetched, setup the listener
                f.once('end', () => {
                    console.log(`[${this.config.user}] Initial sync completed! Setting up listener for new emails...`);
                    this.setupIdleListener();
                });

                f.once('error', (err) => {
                    console.error(`[${this.config.user}] Error during initial fetch:`, err);
                });
            });
        });
    }

    private setupIdleListener(): void {
        console.log(`[${this.config.user}] IDLE listener activated. Waiting for new emails...`);
        
        this.imap.on('mail', (numNewMsgs: number) => {
            console.log(`[${this.config.user}] New Mail Received! Count: ${numNewMsgs}`);
            
            this.imap.openBox('INBOX', false, (err, box) => {
                if(err) throw err;

                // Fetch newest messages
                const f = this.imap.fetch(box.messages.total + ':*', { bodies: '' });
                f.on('message', (msg) => {
                    msg.on('body', (stream) => {
                        this.processMessage(stream);
                    });
                });
            });
        });
    };
}