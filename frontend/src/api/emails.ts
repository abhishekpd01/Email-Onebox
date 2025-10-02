import axios from "axios";

export interface Email {
    messageId: string;
    from: { value: { address: string; name: string }[] };
    subject: string;
    text: string;
    date: string;
    category: string;
    account: string;
}

export const fetchEmails = async (query: string, account: string) : Promise<Email[]> => {
    try {
        const response = await axios.get('/api/search', {
            params: {
                q: query,
                account: account
            },
        });

        return response.data;
    } catch (error) {
        console.error("Failed to fetch emails:", error);
    return [];
    }
}