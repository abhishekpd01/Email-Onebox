import { GoogleGenAI } from "@google/genai";

// define categories for AI to use
export type EmailCategory = 'Interested' | 'Not Interested' | 'Meeting Booked' | 'Spam' | 'Out of Office' | 'Uncategorized';

export class AIService {
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
    }

    private delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    public async categorizeEmail(emailContent: string) : Promise<EmailCategory> {
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

        try {
            // Artificial delay of 50 seconds between calls
            await this.delay(2000);

            const result = await Promise.race([
                this.genAI.models.generateContent({
                    model: "gemini-2.5-pro",
                    contents: prompt
                }),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error("Request timed out after 2s")), 2000)
                )
            ]);

            // @ts-ignore - because result is from Promise.race
            const response = result.text;
            console.log(response);

            const categoryText = response;

            if (this.validCategories.includes(categoryText as EmailCategory)) {
                return categoryText as EmailCategory;
            } else {
                console.warn(`[AI Service] Received an invalid category: ${categoryText}, defaulting to 'Uncategorized'.`);
                return 'Uncategorized';
            }
        } catch (error) {
            console.error('[AI Service] Error categorizing email.', error);
            return 'Uncategorized';
        }
    }
}