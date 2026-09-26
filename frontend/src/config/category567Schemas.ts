/**
 * Credential schemas for the remaining API-based connectors (Categories 5-7:
 * Ecommerce, Productivity, Design & Assets). Same vault mechanism as
 * Categories 2-4 (see category2Schemas.ts): masked multi-field forms,
 * persisted in craftai_connector_vault, injected into the generated app's
 * .env as VITE_* vars by the Developer Agent.
 */
import { ConnectorField } from './category2Schemas';

export const CATEGORY567_SCHEMAS: Record<string, ConnectorField[]> = {
  stripe: [
    { key: 'publishableKey', label: 'Stripe Publishable Key', placeholder: 'pk_test_...' },
    { key: 'secretKey', label: 'Stripe Secret Key', placeholder: 'sk_test_...', mask: true }
  ],
  airtable: [
    { key: 'pat', label: 'Airtable PAT', placeholder: 'pat...', mask: true },
    { key: 'baseId', label: 'Default Base ID (Optional)', placeholder: 'app...', optional: true }
  ],
  looker: [
    { key: 'clientId', label: 'Looker API Client ID', placeholder: '...' },
    { key: 'clientSecret', label: 'Looker API Client Secret', placeholder: '...', mask: true },
    { key: 'hostUrl', label: 'Looker Host URL', placeholder: 'https://your-instance.looker.com' }
  ],
  figma_api: [
    { key: 'pat', label: 'Figma Personal Access Token', placeholder: 'figd_...', mask: true }
  ],
  unsplash_api: [
    { key: 'accessKey', label: 'Unsplash Access Key', placeholder: '...', mask: true }
  ],
  // firebase was in the API-key tier from the start but had no schema —
  // the VaultForm-only modal made the gap visible, so it lives here.
  firebase: [
    { key: 'apiKey', label: 'Firebase Web API Key', placeholder: 'AIzaSy...', mask: true }
  ]
};

export const isCategory567 = (id: string): boolean => id in CATEGORY567_SCHEMAS;