/**
 * Credential schemas for the 7 Category 4 (AI Providers) connectors.
 * Same vault mechanism as Categories 2 & 3 (see category2Schemas.ts):
 * masked multi-field forms, persisted in craftai_connector_vault, injected
 * into the generated app's .env as VITE_* vars by the Developer Agent.
 */
import { ConnectorField } from './category2Schemas';

export const CATEGORY4_SCHEMAS: Record<string, ConnectorField[]> = {
  openai_api: [
    { key: 'apiKey', label: 'OpenAI API Key', placeholder: 'sk-proj-...', mask: true },
    { key: 'baseUrl', label: 'Custom Endpoint / Base URL (Optional)', placeholder: 'https://api.openai.com/v1', optional: true }
  ],
  anthropic_claude: [
    { key: 'apiKey', label: 'Anthropic API Key', placeholder: 'sk-ant-...', mask: true }
  ],
  google_gemini: [
    { key: 'apiKey', label: 'Gemini API Key', placeholder: 'AIzaSy...', mask: true }
  ],
  groq: [
    { key: 'apiKey', label: 'Groq API Key', placeholder: 'gsk_...', mask: true }
  ],
  deepseek: [
    { key: 'apiKey', label: 'DeepSeek API Key', placeholder: 'sk-...', mask: true },
    { key: 'baseUrl', label: 'DeepSeek Base URL (Optional)', placeholder: 'https://api.deepseek.com', optional: true }
  ],
  perplexity: [
    { key: 'apiKey', label: 'Perplexity API Key', placeholder: 'pplx-...', mask: true }
  ],
  replicate: [
    { key: 'apiKey', label: 'Replicate API Token', placeholder: 'r8_...', mask: true }
  ]
};

export const isCategory4 = (id: string): boolean => id in CATEGORY4_SCHEMAS;