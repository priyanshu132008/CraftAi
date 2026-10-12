export type ConnectorCategory =
  | 'Google'
  | 'Cloud'
  | 'Messaging'
  | 'AI'
  | 'Design'
  | 'Payments'
  | 'Productivity';

export type ConnectorAuthTier = 'oauth' | 'api_key' | 'none';

export interface ConnectorMeta {
  id: string;
  name: string;
  category: ConnectorCategory;
  desc: string;
  file: string;
  docsUrl: string;
  authType: 'oauth' | 'apikey';
  tags: string[];
  icon?: string;
  popular?: boolean;
  isNew?: boolean;
  capabilities?: string[];
  useCases?: Array<{ title: string; prompt: string }>;
}

export interface DesignStyle {
  id: string;
  title: string;
  description?: string;
}

/** Authentic brand colors driving per-card glows/tints in the Connectors
 *  Hub — cards are never monochrome. Unknown ids fall back to CraftAI
 *  indigo so every card still reads as a member of the system. */
export const BRAND_COLORS: Record<string, string> = {
  // Google
  gmail: '#EA4335',
  google_sheets: '#0F9D58',
  google_drive: '#00AC47',
  google_calendar: '#4285F4',
  google_ads: '#34A853',
  bigquery: '#4285F4',
  firebase: '#FFA000',
  // Cloud & data
  supabase: '#3ECF8E',
  postgres: '#336791',
  mongodb: '#47A248',
  upstash_redis: '#00E599',
  neon: '#00E599',
  planetscale: '#8B5CF6',
  aws: '#FF9900',
  azure: '#0078D4',
  // Messaging
  twilio: '#F22F46',
  whatsapp_business: '#25D366',
  brevo: '#2E9BF0',
  telegram_bot: '#26A5E4',
  slack: '#36C5F0',
  microsoft_teams: '#5059C9',
  mailgun: '#F0533D',
  discord_webhook: '#5865F2',
  // AI providers
  openai_api: '#10A37F',
  anthropic_claude: '#D97757',
  google_gemini: '#9B72CB',
  groq: '#F55036',
  deepseek: '#4D6BFE',
  perplexity: '#20808D',
  // Design, commerce & productivity
  figma_api: '#A259FF',
  dev21st_components: '#7C3AED',
  stripe: '#635BFF',
  airtable: '#2D7FF9',
  shopify: '#95BF47',
  notion: '#D4D4D8',
  looker: '#4FC3F7'
};

export const brandColor = (id: string): string => BRAND_COLORS[id] ?? '#6366F1';

const DEFAULT_CONNECTOR_ICON = '🔌';

const resolveCapabilities = (id: string): string[] => {
  const base = {
    google_sheets: ['Read/write spreadsheet data', 'Create automated reporting flows', 'Sync dashboard inputs'],
    gmail: ['Send transactional mail', 'Manage outreach sequences', 'Monitor account notifications'],
    google_drive: ['Upload assets', 'List project folders', 'Sync shared files'],
    google_calendar: ['Create event invites', 'Track scheduling states', 'Sync team calendars'],
    firebase: ['Realtime data sync', 'Auth sessions', 'Cloud storage'],
    supabase: ['Postgres data access', 'Auth and policies', 'Edge function hooks'],
    postgres: ['Query relational data', 'Run managed SQL workflows', 'Back production analytics'],
    mongodb: ['Document queries', 'Flexible records', 'Operational data pipelines'],
    slack: ['Post alerts', 'Notify teams', 'Coordinate workflows'],
    twilio: ['Send SMS', 'Launch messages', 'Trigger notifications'],
    whatsapp_business: ['Customer messaging', 'Order alerts', 'Support notifications'],
    openai_api: ['LLM chat', 'Summaries', 'Content generation'],
    anthropic_claude: ['Deep reasoning', 'Classification', 'Evaluation workflows'],
    google_gemini: ['Vision prompts', 'Multimodal AI', 'Content generation'],
    stripe: ['Payments', 'Subscriptions', 'Billing events'],
    shopify: ['Storefront data', 'Orders', 'Catalog sync'],
    notion: ['Docs sync', 'Database updates', 'Knowledge base access'],
    airtable: ['Record sync', 'Views', 'Workflow tables'],
    figma_api: ['Design tokens', 'Assets', 'Component extraction'],
    unsplash_api: ['Image search', 'Curated collections', 'Hero photography']
  } as Record<string, string[]>;

  return base[id] ?? ['Data access', 'Automation hooks', 'Connected workflows'];
};

const resolveUseCases = (id: string): Array<{ title: string; prompt: string }> => {
  const base = {
    google_sheets: [
      { title: 'Ops dashboard', prompt: 'Build a live operations dashboard that reads metrics from Google Sheets and shows changes in real time.' },
      { title: 'Invoice tracker', prompt: 'Create a lightweight invoice tracker that updates a spreadsheet and summarizes overdue payments.' }
    ],
    gmail: [
      { title: 'Welcome sequence', prompt: 'Send a branded welcome email when a user signs up and include a follow-up summary.' },
      { title: 'Lead follow-up', prompt: 'Create a lead nurture workflow that drafts personalized follow-up emails from CRM data.' }
    ],
    google_drive: [
      { title: 'Asset library', prompt: 'Create a file library where users upload artwork and view organized folders in Google Drive.' },
      { title: 'Shared delivery', prompt: 'Build a secure document sharing flow that stores exports in a Google Drive folder.' }
    ],
    google_calendar: [
      { title: 'Booking flow', prompt: 'Build a booking system that creates calendar events and sends confirmations for scheduled meetings.' },
      { title: 'Campaign planner', prompt: 'Create a campaign planner that blocks time slots and keeps stakeholders synced by calendar.' }
    ],
    firebase: [
      { title: 'Realtime app', prompt: 'Build a collaborative app with realtime updates using Firebase auth and storage.' },
      { title: 'Mobile sync', prompt: 'Create a mobile-first app that syncs user data and session states with Firebase.' }
    ],
    supabase: [
      { title: 'Members portal', prompt: 'Create a members portal with auth, profiles, and protected tables using Supabase.' },
      { title: 'Operations backend', prompt: 'Build a production-ready backend with CRUD APIs and role-based access via Supabase.' }
    ],
    stripe: [
      { title: 'Subscription checkout', prompt: 'Create a SaaS checkout flow with subscriptions, invoices, and billing events.' },
      { title: 'Plan upgrades', prompt: 'Build a plan upgrade UI with Stripe-managed billing and account limits.' }
    ],
    notion: [
      { title: 'Knowledge hub', prompt: 'Create a Notion-backed knowledge hub where product notes and docs stay synchronized.' },
      { title: 'Project wiki', prompt: 'Build a project wiki that writes updates into a shared Notion database.' }
    ]
  } as Record<string, Array<{ title: string; prompt: string }>>;

  return base[id] ?? [
    { title: 'Connected workflow', prompt: 'Build a polished product flow that reads and writes via this connector.' },
    { title: 'Smart automation', prompt: 'Create an automated workflow that keeps customer data and actions synchronized.' }
  ];
};

/** Wire-up instructions per connector, injected into the generation system
 *  prompt so the AI knows exactly how to code the integration. Any connector
 *  without an entry here gets a generic built from its catalog metadata. */
const SYSTEM_CONTEXT: Record<string, string> = {
  google_sheets: 'Use the googleapis Spreadsheets API from a service account. Read creds from env GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID.',
  gmail: 'Use the gmail.googleapis.com API with OAuth2 service-account creds from env GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY.',
  google_drive: 'Use the Drive v3 API with OAuth2 service-account creds from env GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY.',
  google_calendar: 'Use the Calendar v3 API with OAuth2 service-account creds from env GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY.',
  firebase: 'Initialize with firebase-admin: initializeApp({ credential: cert(serviceAccount) }). Read projectId/clientEmail/privateKey from env FIREBASE_*.',
  supabase: 'Use @supabase/supabase-js. Create client with createClient(SUPABASE_URL, SUPABASE_ANON_KEY). For admin work use the service_role key server-side only.',
  postgres: 'Use node-postgres (pg) Pool with connection string from env DATABASE_URL. Always parameterize queries.',
  mongodb: 'Use the mongodb driver: new MongoClient(process.env.MONGODB_URI). Handle async connect once, reuse the client.',
  slack: 'Use @slack/web-api WebClient with env SLACK_BOT_TOKEN. Post via chat.postMessage(channel, text).',
  twilio: 'Use twilio SDK with TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER from env.',
  whatsapp_business: 'Use Meta Graph API v18 webhooks: send messages to graph.facebook.com/v18.0/{phone_number_id}/messages with bearer env WHATSAPP_TOKEN.',
  openai_api: 'Use the openai SDK: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }). Prefer chat.completions.create for chat flows.',
  anthropic_claude: 'Use @anthropic-ai/sdk: new Anthropic({ apiKey: env ANTHROPIC_API_KEY }). Call messages.create with model claude-sonnet-4-5.',
  google_gemini: 'Use @google/generative-ai with env GEMINI_API_KEY, model gemini-2.0-flash on generateContent.',
  stripe: 'Use stripe-node SDK. Initialize with process.env.STRIPE_SECRET_KEY. Verify webhooks with STRIPE_WEBHOOK_SECRET (constructEvent).',
  shopify: 'Use Shopify Admin REST via @shopify/shopify-api with SHOPIFY_STORE_DOMAIN / SHOPIFY_ADMIN_ACCESS_TOKEN from env.',
  notion: 'Use @notionhq/client Client({ auth: process.env.NOTION_TOKEN }). Databases queried via databases.query, pages via pages.create.',
  airtable: 'Use Airtable REST base https://api.airtable.com/v0/{baseId}/{table} with bearer AIRTABLE_API_KEY from env.',
  figma_api: 'Use Figma REST API https://api.figma.com/v1 with header X-Figma-Token: FIGMA_API_KEY. Fetch nodes via /files/{key}/nodes.',
  unsplash_api: 'Use Unsplash API https://api.unsplash.com with bearer UNSPLASH_ACCESS_KEY; search via /search/photos.'
};

/** Build the connector block for the generation system prompt: the wire-up
 *  instructions of every enabled connector, plus the generic fallback for
 *  ids that aren't in the catalog (custom REST connectors). */
export const getEnabledConnectorsContext = (activeConnectorIds: string[]): string =>
  activeConnectorIds
    .map(id => {
      const meta = CONNECTOR_CATALOG[id];
      if (!meta) {
        return `- ${id}: user-defined REST connector — build a typed wrapper around its baseUrl with the configured headers and inspect responses to model the types.`;
      }
      const sys =
        SYSTEM_CONTEXT[id] ??
        `Use the ${meta.name} API (${meta.docsUrl}). Read credentials from env vars and wrap calls in src/lib/${meta.file}.`;
      return `- ${meta.name}: ${sys}`;
    })
    .join('\n');

export const DESIGN_STYLES: DesignStyle[] = [
  { id: 'minimal', title: 'Minimal', description: 'Clean, quiet, and highly focused' },
  { id: 'luxury', title: 'Luxury', description: 'Premium surfaces and refined contrast' },
  { id: 'playful', title: 'Playful', description: 'Bright, social, and energetic' },
  { id: 'dark', title: 'Dark', description: 'Cinematic and high-contrast UI' },
  { id: 'editorial', title: 'Editorial', description: 'Magazine-inspired layouts and typography' }
];

export const CONNECTOR_CATEGORIES: ConnectorCategory[] = [
  'Google',
  'Cloud',
  'Messaging',
  'AI',
  'Design',
  'Payments',
  'Productivity'
];

export const CONNECTOR_LIST: ConnectorMeta[] = [
  {
    id: 'google_sheets',
    name: 'Google Sheets',
    category: 'Google',
    desc: 'Read and write spreadsheet data for dashboards and operational workflows.',
    file: 'lib/googleSheets.ts',
    docsUrl: 'https://developers.google.com/sheets/api',
    authType: 'oauth',
    tags: ['spreadsheet', 'dashboard', 'google'],
    icon: '📊',
    popular: true,
    isNew: false,
    capabilities: resolveCapabilities('google_sheets'),
    useCases: resolveUseCases('google_sheets')
  },
  {
    id: 'gmail',
    name: 'Gmail',
    category: 'Google',
    desc: 'Send transactional or marketing emails directly from generated apps.',
    file: 'lib/gmail.ts',
    docsUrl: 'https://developers.google.com/gmail/api',
    authType: 'oauth',
    tags: ['email', 'google'],
    icon: '✉️',
    popular: true,
    isNew: false,
    capabilities: resolveCapabilities('gmail'),
    useCases: resolveUseCases('gmail')
  },
  {
    id: 'google_drive',
    name: 'Google Drive',
    category: 'Google',
    desc: 'Upload, list, and sync files with Google Drive.',
    file: 'lib/googleDrive.ts',
    docsUrl: 'https://developers.google.com/drive/api',
    authType: 'oauth',
    tags: ['files', 'storage'],
    icon: '📁',
    popular: false,
    isNew: false,
    capabilities: resolveCapabilities('google_drive'),
    useCases: resolveUseCases('google_drive')
  },
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    category: 'Google',
    desc: 'Create calendar events and manage scheduling flows.',
    file: 'lib/googleCalendar.ts',
    docsUrl: 'https://developers.google.com/calendar/api',
    authType: 'oauth',
    tags: ['calendar', 'scheduling'],
    icon: '🗓️',
    popular: false,
    isNew: false,
    capabilities: resolveCapabilities('google_calendar'),
    useCases: resolveUseCases('google_calendar')
  },
  {
    id: 'firebase',
    name: 'Firebase',
    category: 'Cloud',
    desc: 'Connect to Firebase for auth, storage, and real-time app data.',
    file: 'lib/firebase.ts',
    docsUrl: 'https://firebase.google.com/docs',
    authType: 'apikey',
    tags: ['database', 'realtime'],
    icon: '🔥',
    popular: true,
    isNew: false,
    capabilities: resolveCapabilities('firebase'),
    useCases: resolveUseCases('firebase')
  },
  {
    id: 'supabase',
    name: 'Supabase',
    category: 'Cloud',
    desc: 'Use Supabase tables, auth, and edge functions from generated apps.',
    file: 'lib/supabase.ts',
    docsUrl: 'https://supabase.com/docs',
    authType: 'apikey',
    tags: ['database', 'auth'],
    icon: '🗃️',
    popular: true,
    isNew: true,
    capabilities: resolveCapabilities('supabase'),
    useCases: resolveUseCases('supabase')
  },
  {
    id: 'postgres',
    name: 'Postgres',
    category: 'Cloud',
    desc: 'Query Postgres databases with SQL-based access layers.',
    file: 'lib/postgres.ts',
    docsUrl: 'https://www.postgresql.org/docs/',
    authType: 'apikey',
    tags: ['sql', 'database'],
    icon: '🧱',
    popular: false,
    isNew: false,
    capabilities: resolveCapabilities('postgres'),
    useCases: resolveUseCases('postgres')
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    category: 'Cloud',
    desc: 'Store and query document-based application data.',
    file: 'lib/mongodb.ts',
    docsUrl: 'https://www.mongodb.com/docs/',
    authType: 'apikey',
    tags: ['nosql', 'database'],
    icon: '🧮',
    popular: false,
    isNew: false,
    capabilities: resolveCapabilities('mongodb'),
    useCases: resolveUseCases('mongodb')
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'Messaging',
    desc: 'Send alerts, notifications, and team updates programmatically.',
    file: 'lib/slack.ts',
    docsUrl: 'https://api.slack.com/',
    authType: 'oauth',
    tags: ['notifications', 'team'],
    icon: '💬',
    popular: true,
    isNew: false,
    capabilities: resolveCapabilities('slack'),
    useCases: resolveUseCases('slack')
  },
  {
    id: 'twilio',
    name: 'Twilio',
    category: 'Messaging',
    desc: 'Send SMS and WhatsApp messages from your products.',
    file: 'lib/twilio.ts',
    docsUrl: 'https://www.twilio.com/docs',
    authType: 'apikey',
    tags: ['sms', 'notification'],
    icon: '📲',
    popular: false,
    isNew: false,
    capabilities: resolveCapabilities('twilio'),
    useCases: resolveUseCases('twilio')
  },
  {
    id: 'whatsapp_business',
    name: 'WhatsApp Business',
    category: 'Messaging',
    desc: 'Trigger customer conversations and one-time messaging campaigns.',
    file: 'lib/whatsappBusiness.ts',
    docsUrl: 'https://developers.facebook.com/docs/whatsapp',
    authType: 'apikey',
    tags: ['chat', 'customers'],
    icon: '💬',
    popular: false,
    isNew: false,
    capabilities: resolveCapabilities('whatsapp_business'),
    useCases: resolveUseCases('whatsapp_business')
  },
  {
    id: 'openai_api',
    name: 'OpenAI',
    category: 'AI',
    desc: 'Use GPT models for assistants, summarization, and smart UX flows.',
    file: 'lib/openai.ts',
    docsUrl: 'https://platform.openai.com/docs',
    authType: 'apikey',
    tags: ['chatgpt', 'llm'],
    icon: '🤖',
    popular: true,
    isNew: false,
    capabilities: resolveCapabilities('openai_api'),
    useCases: resolveUseCases('openai_api')
  },
  {
    id: 'anthropic_claude',
    name: 'Anthropic Claude',
    category: 'AI',
    desc: 'Route reasoning-heavy prompts through Claude models.',
    file: 'lib/anthropic.ts',
    docsUrl: 'https://docs.anthropic.com/',
    authType: 'apikey',
    tags: ['reasoning', 'llm'],
    icon: '🧠',
    popular: false,
    isNew: false,
    capabilities: resolveCapabilities('anthropic_claude'),
    useCases: resolveUseCases('anthropic_claude')
  },
  {
    id: 'google_gemini',
    name: 'Google Gemini',
    category: 'AI',
    desc: 'Build multimodal AI experiences with Gemini.',
    file: 'lib/gemini.ts',
    docsUrl: 'https://ai.google.dev/gemini-api/docs',
    authType: 'apikey',
    tags: ['vision', 'llm'],
    icon: '✨',
    popular: false,
    isNew: true,
    capabilities: resolveCapabilities('google_gemini'),
    useCases: resolveUseCases('google_gemini')
  },
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'Payments',
    desc: 'Accept payments, subscriptions, and invoicing flows.',
    file: 'lib/stripe.ts',
    docsUrl: 'https://stripe.com/docs',
    authType: 'apikey',
    tags: ['payments', 'billing'],
    icon: '💳',
    popular: true,
    isNew: false,
    capabilities: resolveCapabilities('stripe'),
    useCases: resolveUseCases('stripe')
  },
  {
    id: 'shopify',
    name: 'Shopify',
    category: 'Payments',
    desc: 'Connect commerce inventory and storefront actions.',
    file: 'lib/shopify.ts',
    docsUrl: 'https://shopify.dev/docs',
    // Vault tier, not OAuth: generic Shopify OAuth needs a per-shop authorize
    // domain, so a static /oauth/shopify/authorize endpoint can't exist.
    authType: 'apikey',
    tags: ['commerce', 'ecommerce'],
    icon: '🛍️',
    popular: false,
    isNew: false,
    capabilities: resolveCapabilities('shopify'),
    useCases: resolveUseCases('shopify')
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'Productivity',
    desc: 'Sync notes, databases, and internal docs into your app.',
    file: 'lib/notion.ts',
    docsUrl: 'https://developers.notion.com/docs',
    authType: 'oauth',
    tags: ['docs', 'workspace'],
    icon: '📝',
    popular: false,
    isNew: false,
    capabilities: resolveCapabilities('notion'),
    useCases: resolveUseCases('notion')
  },
  {
    id: 'airtable',
    name: 'Airtable',
    category: 'Productivity',
    desc: 'Connect to structured customer and task records instantly.',
    file: 'lib/airtable.ts',
    docsUrl: 'https://airtable.com/developers',
    authType: 'apikey',
    tags: ['records', 'database'],
    icon: '📋',
    popular: false,
    isNew: false,
    capabilities: resolveCapabilities('airtable'),
    useCases: resolveUseCases('airtable')
  },
  {
    id: 'figma_api',
    name: 'Figma',
    category: 'Design',
    desc: 'Pull design tokens, components, and specs into the workflow.',
    file: 'lib/figma.ts',
    docsUrl: 'https://www.figma.com/developers/api',
    authType: 'apikey',
    tags: ['design', 'assets'],
    icon: '🎨',
    popular: false,
    isNew: false,
    capabilities: resolveCapabilities('figma_api'),
    useCases: resolveUseCases('figma_api')
  },
  {
    id: 'unsplash_api',
    name: 'Unsplash',
    category: 'Design',
    desc: 'Access curated design imagery for landing pages and posts.',
    file: 'lib/unsplash.ts',
    docsUrl: 'https://unsplash.com/developers',
    authType: 'apikey',
    tags: ['images', 'assets'],
    icon: '📷',
    popular: false,
    isNew: false,
    capabilities: resolveCapabilities('unsplash_api'),
    useCases: resolveUseCases('unsplash_api')
  }
];

CONNECTOR_LIST.forEach(meta => {
  meta.icon ??= DEFAULT_CONNECTOR_ICON;
  meta.popular ??= false;
  meta.isNew ??= false;
  meta.capabilities ??= resolveCapabilities(meta.id);
  meta.useCases ??= resolveUseCases(meta.id);
});

export const CONNECTOR_CATALOG: Record<string, ConnectorMeta> = Object.fromEntries(
  CONNECTOR_LIST.map(meta => [meta.id, meta])
);

export const CONNECTOR_AUTH: Record<string, ConnectorAuthTier> = Object.fromEntries(
  CONNECTOR_LIST.map(meta => [meta.id, meta.authType === 'oauth' ? 'oauth' : 'api_key'])
);

export const connectorDetail = (meta: ConnectorMeta | undefined): {
  docsUrl: string;
  authType: ConnectorAuthTier;
  capabilities: string[];
  useCases: Array<{ title: string; prompt: string }>;
} => ({
  docsUrl: meta?.docsUrl ?? 'https://docs.craftai.app',
  authType: meta?.authType === 'oauth' ? 'oauth' : 'api_key',
  capabilities: meta?.capabilities ?? ['Data access', 'Automation hooks', 'Connected workflows'],
  useCases: meta?.useCases ?? [
    { title: 'Connected workflow', prompt: 'Create a product flow that uses this integration to automate common user actions.' },
    { title: 'Smart automation', prompt: 'Build an automated workflow that keeps business data synchronized across systems.' }
  ]
});
