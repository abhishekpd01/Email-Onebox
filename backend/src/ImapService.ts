import Imap from 'node-imap';
import { simpleParser, ParsedMail } from 'mailparser';
import { inspect } from 'util';
import { Readable } from 'stream';

export class ImapService {
    private imap: Imap;

    constructor(private config: Imap.Config) {
        this.imap = new Imap(config);
    }

    public connect(): void {
        this.imap.once('ready', () => this.onReady());
        this.imap.once('error', (err: Error) => console.error(`[${this.config.user}] IMAP Error:`, err));
        this.imap.once('end', () => console.log(`[${this.config.user}] Connection Ended!`));
        this.imap.connect();
    }

    private onReady(): void {
        console.log(`[${this.config.user}] Connection Successful! Starting initial sync...`);
        this.imap.openBox('INBOX', false, (err, box) => {
            if(err) throw err;

            // Sync last 30 days mails
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 0);     // for testing 0 days.....
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
                        simpleParser(stream as Readable, async (err, parsed) => {
                            // send `parsed` to Elasticsearch Storage.
                            console.log(`[${this.config.user}] Fetched initial email: ${parsed.subject}`)
                        });
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
            
            // Remove the listener to prevent multiple triggers
            this.imap.removeAllListeners('mail');
            
            // Search for UNSEEN emails to get only new ones
            this.imap.search(['UNSEEN'], (err, results) => {
                if(err) {
                    console.error(`[${this.config.user}] Error searching for new emails:`, err);
                    this.setupIdleListener();
                    return;
                }

                if(!results || results.length === 0) {
                    console.log(`[${this.config.user}] No unseen emails found.`);
                    this.setupIdleListener();
                    return;
                }

                console.log(`[${this.config.user}] Processing ${results.length} new email(s)...`);
                const f = this.imap.fetch(results, { 
                    bodies: '',
                    markSeen: true  // Mark as seen after fetching
                });
                
                f.on('message', (msg, seqno) => {
                    msg.on('body', (stream) => {
                        simpleParser(stream as Readable, async (err, parsed) => {
                            if (err) {
                                console.error(`[${this.config.user}] Error parsing email:`, err);
                                return;
                            }
                            // process the new email (send to ES, categorize)
                            console.log(`[${this.config.user}] Parsed new email: ${parsed.subject}`);
                        })
                    })
                })
                
                f.once('end', () => {
                    console.log(`[${this.config.user}] Finished processing new email(s)!`);
                    // Restart the IDLE listener after processing
                    this.setupIdleListener();
                })

                f.once('error', (err) => {
                    console.error(`[${this.config.user}] Error fetching new email:`, err);
                    // Restart listener even on error
                    this.setupIdleListener();
                });
            });
        })
    }
}