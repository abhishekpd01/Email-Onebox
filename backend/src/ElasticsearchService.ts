import { Client } from '@elastic/elasticsearch';
import { ParsedMail } from 'mailparser';
import dotenv from "dotenv";
dotenv.config();

if (!process.env.ELASTICSEARCH_API_KEY) {
    throw new Error("Missing ELASTICSEARCH_API_KEY");
}
import { EmailCategory } from './AIService';

// Define type for email document for storing
export interface EmailDocument extends ParsedMail {
    account : string,
    category?: EmailCategory
}

export class ElasticsearchService {
    private client: Client;

    constructor() {
        this.client = new Client({ 
            node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
            auth: {
                apiKey: process.env.ELASTICSEARCH_API_KEY || ''
            }
        });

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
        mappings: {
          properties: {
            date: { type: 'date' },
            subject: { type: 'text' },
            from: { type: 'object' },
            to: { type: 'object' },
            text: { type: 'text' },
            account: { type: 'keyword' }, // 'keyword' is better for exact filtering
            category: { type: 'keyword' }, // add category as keyword
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

    public async searchEmails(query: string, account?: string) {
    const searchBody: any = {
      sort: [{ date: { order: 'desc' } }],
      size: 100,
    };

    // If there's no query, match all documents. Otherwise, build the query.
    if (!query) {
      searchBody.query = { match_all: {} };
    } else {
      searchBody.query = {
        multi_match: {
          query,
          fields: ['subject', 'text', 'from.value.address', 'to.value.address'],
        },
      };
    }
    
    // Add the account filter if it exists
    if (account) {
        searchBody.query = {
            bool: {
                must: searchBody.query,
                filter: [{ term: { 'account': account } }],
            },
        };
    }

    const response = await this.client.search({
      index: 'emails',
      body: searchBody,
    });

    return response.hits.hits.map((hit: any) => hit._source);
  }
}