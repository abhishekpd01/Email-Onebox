import path from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Instead of file path, use environment variable
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  // Write the JSON content to a temporary file
  const credentialsPath = path.resolve(__dirname, 'temp-credentials.json');
  writeFileSync(credentialsPath, process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
} else {
  // For local development, keep the file path
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, 'onebox-473910-3f4ec29cf285.json');
}

import { Pinecone } from '@pinecone-database/pinecone';
import { Document } from '@langchain/core/documents';
import { ChatVertexAI, VertexAIEmbeddings } from '@langchain/google-vertexai';
import { PineconeStore } from '@langchain/pinecone';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";
import { StringOutputParser } from '@langchain/core/output_parsers';
import { formatDocumentsAsString } from "langchain/util/document";

export class RagService {
    private vectorStore: PineconeStore;
    private llm: ChatVertexAI;

    constructor() {
        // Initialize pinecone
        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY!,
        });
        const pineconeIndex = pinecone.Index('onebox-agenda');

        // Initialize Google Vertex AI Embedding model
        const embeddings = new VertexAIEmbeddings({
            model: "text-embedding-gecko@003"
        });

        // Initialize Pineconestore for langchain
        this.vectorStore = new PineconeStore(embeddings, { pineconeIndex });
        
        // Initialize Google Vertex AI LLM model
        this.llm = new ChatVertexAI({
            model: "gemini-1.0-pro",
            temperature: 0.5
        });
    }

    // Create Embeddings and store it in the Pincone for training
    public async addAgenda(text: string): Promise<void> {
        const docs = [new Document({ pageContent: text })];
        await this.vectorStore.addDocuments(docs);
        console.log(`[RagService] Added new agenda to the vector store.`);
    }
    
    // Generate suggested reply for incoming email content
    public async generateReply(emailContent: string): Promise<string> {
        console.log(`[RagService] Generating Reply for new Email...`);
        
        // fetch relevant documents from Pinecone using retriever
        const retriever = this.vectorStore.asRetriever();

        const promptTemplate = PromptTemplate.fromTemplate(`
            You are a professional assistant who is excellent at drafting concise and helpful email replies.
        
            Based on the provided context and the content of the email I received, please draft a suitable reply.
            
            CONTEXT:
            {context}
            
            EMAIL I RECEIVED:
            ---
            {question}
            ---
            
            SUGGESTED REPLY:
        `);

        // Build the RAG chain using LangChain Expression Language (LCEL)
        const chain = RunnableSequence.from([
            {
                context: retriever.pipe(formatDocumentsAsString),
                question: new RunnablePassthrough(),
            },
            promptTemplate,
            this.llm,
            new StringOutputParser(),
        ]);

        // Invoke chain with just the email content string
        const result = await chain.invoke(emailContent);
        
        console.log(`[RAG Service] Reply generated Successfully!`);
        return result;
    }
}