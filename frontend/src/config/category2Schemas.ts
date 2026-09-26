/**
 * Credential schemas for the 8 Category 2 (Cloud & Database) connectors.
 * Each connector gets a custom multi-field vault form instead of the generic
 * single API-key input. `key` is the field name stored in the
 * craftai_connector_vault localStorage store and sent to /generate-project;
 * the backend maps each key onto a VITE_* env var for the generated app.
 */
export interface ConnectorField {
  /** Vault/payload field key (e.g. "anonKey"). */
  key: string;
  label: string;
  placeholder: string;
  /** Mask the input (password field with a show/hide toggle). */
  mask?: boolean;
  optional?: boolean;
}

export const CATEGORY2_SCHEMAS: Record<string, ConnectorField[]> = {
  supabase: [
    { key: 'url', label: 'Supabase Project URL', placeholder: 'https://your-project.supabase.co' },
    { key: 'anonKey', label: 'Anon / Public Key', placeholder: 'eyJh...', mask: true },
    { key: 'serviceKey', label: 'Service Role Secret Key (Optional)', placeholder: 'eyJh...', mask: true, optional: true }
  ],
  postgres: [
    { key: 'connectionString', label: 'Postgres Connection URI', placeholder: 'postgresql://user:password@host:5432/dbname', mask: true }
  ],
  mongodb: [
    { key: 'connectionString', label: 'MongoDB Connection String', placeholder: 'mongodb+srv://user:password@cluster.mongodb.net/dbname', mask: true }
  ],
  upstash_redis: [
    { key: 'url', label: 'Upstash Redis REST URL', placeholder: 'https://your-redis.upstash.io' },
    { key: 'token', label: 'Upstash Redis REST Token', placeholder: 'AXXXX...', mask: true }
  ],
  neon: [
    { key: 'connectionString', label: 'Neon Postgres Connection URI', placeholder: 'postgresql://user:pass@ep-cool-name.neon.tech/neondb', mask: true }
  ],
  planetscale: [
    { key: 'connectionString', label: 'PlanetScale Connection URI', placeholder: 'mysql://user:pass@aws.connect.psdb.cloud/dbname?ssl=...', mask: true }
  ],
  aws: [
    { key: 'accessKeyId', label: 'AWS Access Key ID', placeholder: 'AKIAIOSFODNN7EXAMPLE' },
    { key: 'secretAccessKey', label: 'AWS Secret Access Key', placeholder: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', mask: true },
    { key: 'region', label: 'AWS Default Region', placeholder: 'us-east-1' },
    { key: 's3Bucket', label: 'S3 Bucket Name (Optional)', placeholder: 'my-app-uploads', optional: true }
  ],
  azure: [
    { key: 'connectionString', label: 'Azure Storage Connection String', placeholder: 'DefaultEndpointsProtocol=https;AccountName=...', mask: true },
    { key: 'accountKey', label: 'Azure Account Key', placeholder: 'key...', mask: true }
  ]
};

export const isCategory2 = (id: string): boolean => id in CATEGORY2_SCHEMAS;