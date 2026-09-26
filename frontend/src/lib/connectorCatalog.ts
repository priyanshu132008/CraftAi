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
    authType: 'oauth',
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
