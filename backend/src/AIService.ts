import { GoogleGenAI } from "@google/genai";
import PQueue from "p-queue";

// define categories for AI to use
export type EmailCategory = 'Interested' | 'Not Interested' | 'Meeting Booked' | 'Spam' | 'Out of Office' | 'Uncategorized';

export class AIService {
    private queue: PQueue;
    private genAI: GoogleGenAI;
    private readonly validCategories: EmailCategory[] = ['Interested', 'Not Interested', 'Meeting Booked', 'Spam', 'Out of Office'];

    constructor() {
        const apiKey = process.env.GOOGLE_API_KEY;
        if(!apiKey) {
            throw new Error("GOOGLE_API_KEY not set in Environment Variables.");
        } else {
            console.log('API Key is set');
        }
        this.genAI = new GoogleGenAI({ apiKey: apiKey });

        // Queue setup: max 10 requests per 60 seconds (free-tier quota)
        this.queue = new PQueue({
            interval: 60000,     // 60 seconds
            intervalCap: 10,     // max 10 requests per interval
            carryoverConcurrencyCount: true,
        });
    }

    // Wrapped categorize function that respects the queue
    public async categorizeEmail(prompt: string): Promise<EmailCategory> {
        return this.queue.add(() => this._categorizeEmail(prompt));
    }

    public async _categorizeEmail(emailContent: string, attempt = 1) : Promise<EmailCategory> {
        const prompt = `
        You are an expert email classifier. Your task is to analyze the email content and classify it into one of the following exact categories:
        - Interested
        - Not Interested
        - Meeting Booked
        - Spam
        - Out of Office
        
        Analyze the following email text and respond with ONLY the category name and nothing else.
        
        Email Content:
        ---
        ${emailContent.substring(0, 3000)}
        ---
        
        Category:
        `;

        const MAX_RETRIES = 5;

        try {
        const result = await this.genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });

        const response = result.text;
        console.log(response);

        if (this.validCategories.includes(response as EmailCategory)) {
            return response as EmailCategory;
        } else {
            console.warn(`[AI Service] Received invalid category: ${response}, defaulting to 'Uncategorized'.`);
            return 'Uncategorized';
        }

    } catch (error: any) {
        // Quota exceeded (429)
        if (error.status === 429 && error.error?.details) {
            const retryInfo = error.error.details.find((d: any) => d['@type']?.includes('RetryInfo'));
            const delayMs = retryInfo?.retryDelay
                ? parseFloat(retryInfo.retryDelay) * 1000
                : 60000; // fallback 60s
            console.warn(`[AI Service] Quota exceeded. Retrying after ${delayMs / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            return this._categorizeEmail(prompt, attempt);

        // Model overloaded (503)
        } else if (error.status === 503 && attempt <= MAX_RETRIES) {
            const backoffMs = 2000 * attempt; // exponential backoff: 2s, 4s, 6s...
            console.warn(`[AI Service] Model overloaded. Retry #${attempt} after ${backoffMs / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            return this._categorizeEmail(prompt, attempt + 1);
        }

        console.error('[AI Service] Error categorizing email.', error);
        return 'Uncategorized';
    }
    }
}