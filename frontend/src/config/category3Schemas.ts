/**
 * Credential schemas for the 9 Category 3 (Messaging & OTP) connectors.
 * Same vault mechanism as Category 2 (see category2Schemas.ts): multi-field
 * masked forms, persisted in craftai_connector_vault, injected into the
 * generated app's .env as VITE_* vars by the Developer Agent.
 */
import { ConnectorField } from './category2Schemas';

export const CATEGORY3_SCHEMAS: Record<string, ConnectorField[]> = {
  resend: [
    { key: 'apiKey', label: 'Resend API Key', placeholder: 're_123456789...', mask: true },
    { key: 'fromEmail', label: 'Default From Email', placeholder: 'onboarding@resend.dev' }
  ],
  twilio: [
    { key: 'accountSid', label: 'Twilio Account SID', placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
    { key: 'authToken', label: 'Twilio Auth Token', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', mask: true },
    { key: 'phoneNumber', label: 'Twilio Sender Phone Number', placeholder: '+1234567890' }
  ],
  slack: [
    { key: 'webhookOrToken', label: 'Slack Incoming Webhook URL / Bot Token', placeholder: 'https://hooks.slack.com/services/... or xoxb-...', mask: true }
  ],
  discord_webhook: [
    { key: 'webhookUrl', label: 'Discord Webhook URL', placeholder: 'https://discord.com/api/webhooks/...', mask: true }
  ],
  whatsapp_business: [
    { key: 'accessToken', label: 'WhatsApp Access Token', placeholder: 'EAAG...', mask: true },
    { key: 'phoneNumberId', label: 'Phone Number ID', placeholder: '100654321098765' },
    { key: 'wabaId', label: 'WhatsApp Business Account ID', placeholder: '109876543210065' }
  ],
  brevo: [
    { key: 'apiKey', label: 'Brevo API Key', placeholder: 'xkeysib-...', mask: true },
    { key: 'senderEmail', label: 'Sender Email', placeholder: 'info@yourdomain.com' }
  ],
  telegram_bot: [
    { key: 'botToken', label: 'Telegram Bot Token', placeholder: '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ...', mask: true },
    { key: 'chatId', label: 'Default Chat ID (Optional)', placeholder: '-100123456789', optional: true }
  ],
  microsoft_teams: [
    { key: 'webhookUrl', label: 'Teams Incoming Webhook URL', placeholder: 'https://outlook.office.com/webhook/...', mask: true }
  ],
  mailgun: [
    { key: 'apiKey', label: 'Mailgun API Key', placeholder: 'key-...', mask: true },
    { key: 'domain', label: 'Mailgun Domain', placeholder: 'mg.yourdomain.com' },
    { key: 'region', label: 'Region', placeholder: 'US or EU' }
  ]
};

export const isCategory3 = (id: string): boolean => id in CATEGORY3_SCHEMAS;