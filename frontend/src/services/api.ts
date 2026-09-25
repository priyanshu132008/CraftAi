import { supabase } from '../lib/supabaseClient';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';

export interface PlanResponse {
  type: string;
  sections: string[];
  techStack?: string[];
  features?: string[];
  [key: string]: unknown;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface TraceStep {
  step: string;
  message: string;
  detail?: string;
  ts?: number;
}

export interface DesignDirection {
  id: string;
  title: string;
}

export type GenerationMode = 'build' | 'chat' | 'plan';

export interface GenerateProjectResponse {
  status: string;
  mode?: GenerationMode;
  plan?: PlanResponse;
  generated_code: string;
  files: GeneratedFile[];
  entry_path?: string;
  project_id?: string;
  projectPath?: string;
  connectors?: string[];
  custom_connectors?: CustomConnectorPayload[];
  mcp_servers?: McpServerPayload[];
  design_style?: string | null;
  design_directions?: DesignDirection[];
  trace?: TraceStep[];
  /** Markdown reply for chat/plan modes. */
  message?: string;
  preview_url: string;
  user_email?: string;
  [key: string]: unknown;
}

/** Connector services the backend can wire into a generated project. */
export const SUPPORTED_CONNECTORS = [
  // Google
  'google_sheets', 'gmail', 'google_drive', 'google_calendar', 'firebase', 'bigquery', 'google_ads',
  // Cloud & Database
  'supabase', 'postgres', 'mongodb', 'upstash_redis', 'neon', 'planetscale', 'aws', 'azure',
  // Messaging & OTP
  'resend', 'twilio', 'whatsapp_business', 'brevo', 'telegram_bot', 'slack',
  'microsoft_teams', 'mailgun', 'discord_webhook',
  // AI Providers
  'openai_api', 'anthropic_claude', 'google_gemini', 'groq', 'deepseek',
  'perplexity', 'replicate',
  // Design & Assets
  'dev21st_components', 'figma_api', 'unsplash_api', 'lucide_icons',
  // Ecommerce / Productivity
  'stripe', 'shopify', 'airtable', 'notion', 'looker'
] as const;

export type ConnectorId = (typeof SUPPORTED_CONNECTORS)[number];

/** A user-defined REST API connector (payload shape sent to the backend). */
export interface CustomConnectorPayload {
  name: string;
  baseUrl: string;
  headers: Record<string, string>;
  openApiSchema?: string;
}

/** An MCP server the generated app can call (payload shape). */
export interface McpServerPayload {
  name: string;
  serverUrl: string;
  authToken?: string;
}

/** Thrown when there is no Supabase session or the backend rejects the token. */
export class NotAuthenticatedError extends Error {
  constructor(message = 'Please log in to generate projects.') {
    super(message);
    this.name = 'NotAuthenticatedError';
  }
}

/** Current Supabase access token, or null when not logged in. */
export async function getAuthToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;
  return data.session.access_token;
}

/**
 * Runs the CraftAI engine on the FastAPI backend:
 * POST /generate-project with Supabase Bearer auth.
 *
 * @param prompt       natural-language request
 * @param options.mode       build (full pipeline) | chat | plan — default build
 * @param options.connectors  services to wire into the generated src/lib/
 * @param options.customConnectors user-defined REST APIs (typed wrapper clients)
 * @param options.mcpServers  MCP servers the generated app can call
 * @param options.designStyle visual direction chosen in the console
 * @param options.context     extra context from an attached file
 */
export async function generateProjectApi(
  prompt: string,
  options: {
    mode?: GenerationMode;
    connectors?: string[];
    customConnectors?: CustomConnectorPayload[];
    mcpServers?: McpServerPayload[];
    /** Agent tool permission per connector ('ask' | 'always' | 'never'). */
    connectorPermissions?: Record<string, string>;
    /** Which connectors have credentials configured (flags, never raw secrets). */
    connectorCredentials?: Record<string, boolean>;
    designStyle?: string | null;
    context?: string | null;
  } = {}
): Promise<GenerateProjectResponse> {
  const token = await getAuthToken();
  if (!token) {
    throw new NotAuthenticatedError();
  }

  const res = await fetch(`${API_URL}/generate-project`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      prompt,
      mode: options.mode ?? 'build',
      connectors: options.connectors ?? [],
      custom_connectors: options.customConnectors ?? [],
      mcp_servers: options.mcpServers ?? [],
      connector_permissions: options.connectorPermissions ?? {},
      connector_credentials: options.connectorCredentials ?? {},
      design_style: options.designStyle ?? undefined,
      context: options.context ?? undefined
    })
  });

  if (res.status === 401) {
    throw new NotAuthenticatedError();
  }

  const data = (await res.json()) as GenerateProjectResponse;
  if (!res.ok || data.status !== 'success') {
    throw new Error(data.message || `Generation failed (HTTP ${res.status})`);
  }
  return data;
}

/** SSE stream of live agent execution steps during a generation. */
export const GENERATION_EVENTS_URL = `${API_URL}/generation-events`;

export interface ProjectListItem {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

/** Fetch recent generated projects from the backend. Returns [] on error. */
export async function fetchProjects(): Promise<ProjectListItem[]> {
  try {
    const res = await fetch(`${API_URL}/api/projects`);
    if (!res.ok) return [];
    const data = (await res.json()) as { status?: string; projects?: ProjectListItem[] };
    return Array.isArray(data.projects) ? data.projects : [];
  } catch {
    return [];
  }
}