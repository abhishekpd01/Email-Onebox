import axios from 'axios';
import { EmailDocument } from './ElasticsearchService';

export class NotificationService {
    private slackWebhookUrl?: string;
    private genericWebhookUrl?: string;

    constructor() {
        this.slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
        this.genericWebhookUrl = process.env.WEBHOOK_SITE_URL;
    }

    public async sendSlackNotification(email: EmailDocument) : Promise<void> {
        if(!this.slackWebhookUrl) {
            console.warn('[NotificationService] SLACK_WEBHOOK_URL is not configured. Skipping Slack notification.');
            return;
        }

        // Format a message using Slack's Block Kit
        const payload = {
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*New "Interested" Lead!*`,
                    },
                },
                {
                    type: 'section',
                    fields: [
                        { type: 'mrkdwn', text: `*From:*\n${email.from?.text}` },
                        { type: 'mrkdwn', text: `*Date:*\n${email.date?.toLocaleString()}` },
                    ],
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*Subject:*\n${email.subject}`,
                    },
                },
                {
                    type: 'divider',
                },
                {
                    type: 'context',
                    elements: [
                        {
                        type: 'mrkdwn',
                        text: `Sent from account: ${email.account}`,
                        },
                    ],
                },
            ]
        };

        try {
            await axios.post(this.slackWebhookUrl, payload);
            console.log(`[NotificationService] Sent Slack notification for email from ${email.from?.text}`);
        } catch (error) {
            console.error('[NotificationService] Failed to send Slack notification:', error);
        }
    }

    public async sendGenericWebhook(email: EmailDocument) : Promise<void> {
        if (!this.genericWebhookUrl) {
            console.warn('[NotificationService] WEBHOOK_SITE_URL is not configured. Skipping generic webhook.');
            return;
        }

        try {
            // Send the entire email document as the payload
            await axios.post(this.genericWebhookUrl, email);
            console.log(`[NotificationService] Sent generic webhook for email from ${email.from?.text}`);
        } catch (error) {
            console.error('[NotificationService] Failed to send generic webhook:', error);
        }
    }
}