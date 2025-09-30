import { Client } from '@elastic/elasticsearch';
import { ParsedMail } from 'mailparser';

// Define type for email document for storing
export interface EmailDocument extends ParsedMail {
    account : string
}

export class ElasticsearchService {
    private client: Client;

    constructor() {
        this.client = new Client({ node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200' });
    }

    public async checkConnection() : Promise<void>{
        try {
            const health = await this.client.cluster.health();
            console.log('Elasticsearch Connection Successful. Cluster Status:', health.status);
        } catch (error) {
            console.error('Failed to connect to Elasticsearch:', error);
            throw error;
        }
    }

    public async createIndexIfNotExists(): Promise<void> {
    const indexName = 'emails';
    const indexExists = await this.client.indices.exists({ index: indexName });

    if (!indexExists) {
      console.log(`Index '${indexName}' does not exist. Creating...`);
      await this.client.indices.create({
        index: indexName,
        body: {
          mappings: {
            properties: {
              date: { type: 'date' },
              subject: { type: 'text' },
              from: { type: 'object' },
              to: { type: 'object' },
              text: { type: 'text' },
              account: { type: 'keyword' }, // 'keyword' is better for exact filtering
            },
          },
        },
      });
      console.log(`Index '${indexName}' created successfully.`);
    }
  }

    public async indexEmail(email: EmailDocument) : Promise<void> {
        await this.client.index({
            index: 'emails',
            document: email
        });
    }

    // ElasticsearchService.ts

    public async searchEmails(query: string, account?: string): Promise<any> {
        try {
            // Build the query with optional account filter
            const mustClauses: any[] = [
                {
                    multi_match: {
                        query: query,
                        fields: ['subject^2', 'text', 'from.name', 'from.address', 'to.name', 'to.address']
                    }
                }
            ];

            // Add account filter if provided
            if (account) {
                mustClauses.push({
                    term: {
                        account: account
                    }
                });
            }

            const result = await this.client.search({
                index: 'emails',
                query: {
                    bool: {
                        must: mustClauses
                    }
                },
                size: 100, // Adjust as needed
                sort: [
                    { date: { order: 'desc' } }
                ]
            });

            console.log(`Found ${result.hits.total} matching emails`);
            
            // Return formatted results
            return {
                total: typeof result.hits.total === 'object' ? result.hits.total.value : result.hits.total,
                emails: result.hits.hits.map(hit => ({
                    id: hit._id,
                    score: hit._score,
                    ...(typeof hit._source === 'object' && hit._source !== null ? hit._source : {})
                }))
            };
        } catch (error) {
            console.error('Error searching emails:', error);
            throw error;
        }
    }
}