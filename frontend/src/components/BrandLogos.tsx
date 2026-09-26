import React from 'react';
import { CONNECTOR_LOGO_PATHS } from '../config/connectorLogos.generated';

/**
 * Real brand logo (downloaded to /public/connector-logos, see
 * CONNECTOR_LOGO_PATHS) with a graceful fallback to the hand-drawn SVG mark
 * below when the image is missing or fails to load.
 */

type Logo = React.ReactNode;

const rounded = (fill: string, r = 6) => (
  <rect x="2" y="2" width="20" height="20" rx={r} fill={fill} />
);

const letter = (fill: string, glyph: string, size = 11) => (
  <text
    x="12"
    y="12"
    textAnchor="middle"
    dominantBaseline="central"
    fill={fill}
    fontSize={size}
    fontWeight="800"
    fontFamily="system-ui, -apple-system, sans-serif"
  >
    {glyph}
  </text>
);

/**
 * Fallback registry of simplified brand-colored SVG marks — used only when a
 * connector's downloaded logo is missing or fails to load.
 */
const BRAND_LOGOS: Record<string, Logo> = {
  // ---- Google -------------------------------------------------------
  gmail: (
    <>
      <path d="M2 7l10 7 10-7v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7z" fill="#EA4335" />
      <path d="M2 6.5l10 7 10-7A2 2 0 0 0 20 5H4a2 2 0 0 0-2 1.5z" fill="#C5221F" />
      <path d="M2 6l10 7 10-7" stroke="#FFF" strokeWidth="2" fill="none" />
    </>
  ),
  google_sheets: (
    <>
      {rounded('#0F9D58', 3)}
      <path d="M7 7h10v10H7z" fill="#FFF" />
      <path d="M9 10h6M9 12.5h6M9 15h4" stroke="#0F9D58" strokeWidth="1.6" />
    </>
  ),
  google_drive: (
    <>
      <path d="M8.4 3h7.2l6.4 11-3.6 6H5.6L2 14z" fill="none" />
      <path d="M8.4 3L4.9 20l-2.4-6z" fill="#0066DA" />
      <path d="M8.4 3h8.9l-3.4 6H5.2z" fill="#00AC47" />
      <path d="M17.3 3L21.7 14l-3.6 6-4.4-11z" fill="#FFBA00" />
      <path d="M4.9 20h13.2l-3.4-6H8.4z" fill="#EA4335" opacity="0.9" />
    </>
  ),
  google_calendar: (
    <>
      {rounded('#4285F4', 3)}
      <rect x="4" y="4" width="16" height="12" fill="#FFF" />
      <text x="12" y="10.5" textAnchor="middle" fill="#4285F4" fontSize="8.5" fontWeight="800" fontFamily="system-ui">31</text>
      <rect x="4" y="17" width="16" height="3" fill="#FFF" opacity="0.4" />
    </>
  ),
  firebase: (
    <>
      <path d="M5 16L9 3l3 8-5 4z" fill="#FFCA28" />
      <path d="M9 3l3 8 4-2-6-7a1 1 0 0 0-1 1z" fill="#FFA000" />
      <path d="M12 11l6 7-11 2z" fill="#F57C00" />
      <path d="M5 16l2 5 10-10z" fill="#FFCA28" opacity="0.85" />
    </>
  ),
  bigquery: (
    <>
      <path d="M12 2l8 4.5v11L12 22l-8-4.5v-11z" fill="#4285F4" />
      <path d="M8 8h8M8 11h8M8 14h5" stroke="#FFF" strokeWidth="1.8" />
    </>
  ),
  google_ads: (
    <>
      {rounded('#4285F4', 5)}
      <path d="M7 8l5 9-5 1z" fill="#FBBC04" />
      <path d="M17 8l-5 9 5 1z" fill="#34A853" />
      <circle cx="12" cy="7" r="2" fill="#EA4335" />
    </>
  ),
  // ---- Cloud & Database ------------------------------------------------
  supabase: (
    <>
      <path d="M12 2c4 4.5 6 7.5 6 10a6 6 0 0 1-10.6 3.9L16 6z" fill="#3ECF8E" />
      <path d="M12 22c-4-4.5-6-7.5-6-10a6 6 0 0 1 10.6-3.9L8 18z" fill="#3ECF8E" opacity="0.6" />
    </>
  ),
  postgres: (
    <>
      {rounded('#336791', 5)}
      {letter('#FFF', 'PG', 10)}
    </>
  ),
  mongodb: (
    <>
      <path d="M12 2c4 4 5 9 5 12.5 0 3.5-2.5 6-5 7.5-2.5-1.5-5-4-5-7.5C7 11 8 6 12 2z" fill="#47A248" />
      <path d="M12 5v15" stroke="#00361E" strokeWidth="1.4" />
    </>
  ),
  upstash_redis: (
    <>
      {rounded('#0F172A', 5)}
      <path d="M6 9l6-3 6 3-6 3z" fill="#00E599" />
      <path d="M6 13l6 3 6-3" stroke="#00E599" strokeWidth="1.6" fill="none" opacity="0.6" />
    </>
  ),
  neon: (
    <>
      <circle cx="12" cy="12" r="10" fill="#00E599" />
      <path d="M9 8v8M15 8v8M9 12h6" stroke="#052E1E" strokeWidth="1.8" />
    </>
  ),
  planetscale: (
    <>
      <circle cx="12" cy="12" r="6.5" fill="#0B0F1A" stroke="#8B5CF6" strokeWidth="1.5" />
      <ellipse cx="12" cy="12" rx="10" ry="3.5" fill="none" stroke="#8B5CF6" strokeWidth="1.5" transform="rotate(-20 12 12)" />
    </>
  ),
  aws: (
    <>
      {rounded('#0B0F1A', 5)}
      <text x="12" y="10.5" textAnchor="middle" fill="#FFF" fontSize="7.5" fontWeight="800" fontFamily="system-ui">aws</text>
      <path d="M6 13c4 3 8 3 12 0" stroke="#FF9900" strokeWidth="1.6" fill="none" />
      <path d="M16.5 12.2l2 1.3-2.4 1.2" fill="none" stroke="#FF9900" strokeWidth="1.6" />
    </>
  ),
  azure: (
    <>
      <path d="M13.5 3h6L15 21h-6z" fill="#0078D4" />
      <path d="M9.5 6.5l2 4.5L6 21H3l6.5-14.5z" fill="#50E6FF" />
      <path d="M15 21l2-6.5-6-1z" fill="#0078D4" opacity="0.7" />
    </>
  ),
  // ---- Messaging & OTP ---------------------------------------------------
  resend: (
    <>
      {rounded('#0A0A0A', 5)}
      <path d="M7 15V8l5 4.5L17 8v7" stroke="#FFF" strokeWidth="1.8" fill="none" />
    </>
  ),
  twilio: (
    <>
      <circle cx="12" cy="12" r="10" fill="#F22F46" />
      <circle cx="8.5" cy="8.5" r="1.7" fill="#FFF" />
      <circle cx="15.5" cy="8.5" r="1.7" fill="#FFF" />
      <circle cx="8.5" cy="15.5" r="1.7" fill="#FFF" />
      <circle cx="15.5" cy="15.5" r="1.7" fill="#FFF" />
    </>
  ),
  whatsapp_business: (
    <>
      <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2z" fill="#25D366" />
      <path d="M8.5 8.5c2 4 3 5 6 6l1.5-2-3-1.5-1 .5c-1-1-1.5-2-2-3l.5-1-1.5-3z" fill="#FFF" />
    </>
  ),
  brevo: (
    <>
      {rounded('#2E9BF0', 5)}
      {letter('#FFF', 'b', 12)}
    </>
  ),
  telegram_bot: (
    <>
      <circle cx="12" cy="12" r="10" fill="#26A5E4" />
      <path d="M6.5 11.5l11-4.2-3.4 9.7-2.8-2.6-1.6 1.6-.5-3.5z" fill="#FFF" />
    </>
  ),
  slack: (
    <>
      <rect x="3" y="9" width="7" height="3" rx="1.5" fill="#36C5F0" transform="rotate(-90 6.5 10.5)" />
      <rect x="8" y="9" width="7" height="3" rx="1.5" fill="#2EB67D" transform="rotate(-90 11.5 10.5)" />
      <rect x="14" y="6" width="7" height="3" rx="1.5" fill="#ECB22E" />
      <rect x="11" y="14" width="7" height="3" rx="1.5" fill="#E01E5A" />
      <rect x="4" y="15" width="7" height="3" rx="1.5" fill="#36C5F0" transform="rotate(180 7.5 16.5)" />
      <rect x="4" y="9" width="3" height="7" rx="1.5" fill="#E01E5A" transform="rotate(90 5.5 12.5)" />
    </>
  ),
  microsoft_teams: (
    <>
      {rounded('#5059C9', 5)}
      {letter('#FFF', 'T', 12)}
    </>
  ),
  mailgun: (
    <>
      {rounded('#F0533D', 5)}
      <path d="M6 9h12v7H6z" fill="none" stroke="#FFF" strokeWidth="1.6" />
      <path d="M6 9l6 4 6-4" stroke="#FFF" strokeWidth="1.6" fill="none" />
    </>
  ),
  discord_webhook: (
    <>
      {rounded('#5865F2', 5)}
      <circle cx="9" cy="10.5" r="1.5" fill="#FFF" />
      <circle cx="15" cy="10.5" r="1.5" fill="#FFF" />
      <path d="M8.5 14c1 1.2 6 1.2 7 0" stroke="#FFF" strokeWidth="1.4" fill="none" />
    </>
  ),
  // ---- AI Providers --------------------------------------------------------
  openai_api: (
    <>
      <path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z" fill="none" stroke="#10A37F" strokeWidth="1.6" />
      <path d="M12 7.2l3.9 2.4v4.8L12 16.8l-3.9-2.4V9.6z" fill="#10A37F" />
    </>
  ),
  anthropic_claude: (
    <>
      <path d="M12 3l1.6 5 5 1.6-5 1.6L12 16l-1.6-4.8L5.4 9.6l5-1.6z" fill="#D97757" transform="rotate(45 12 9.5)" />
      <path d="M12 13l1 3.5L16.5 17.5 13 18.5 12 22l-1-3.5L7.5 17.5 11 16.5z" fill="#D97757" opacity="0.7" />
    </>
  ),
  google_gemini: (
    <>
      <defs>
        <linearGradient id="gemini" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4285F4" />
          <stop offset="0.5" stopColor="#9B72CB" />
          <stop offset="1" stopColor="#D96570" />
        </linearGradient>
      </defs>
      <path d="M12 2c1 4 4 7 10 10-6 3-9 6-10 10-1-4-4-7-10-10 6-3 9-6 10-10z" fill="url(#gemini)" />
    </>
  ),
  groq: (
    <>
      {rounded('#0B0B0B', 5)}
      <path d="M13 5L7 13h4l-2 6 8-9h-5z" fill="#F55036" />
    </>
  ),
  deepseek: (
    <>
      {rounded('#4D6BFE', 5)}
      <path d="M8 8c3 1 4 2.5 4 8 0-5.5 1-7 4-8-1.5 5-2 6.5-4 8-2-1.5-2.5-3-4-8z" fill="#FFF" />
    </>
  ),
  perplexity: (
    <>
      {rounded('#20808D', 5)}
      <circle cx="9" cy="9" r="1.6" fill="#FFF" />
      <circle cx="15" cy="9" r="1.6" fill="#FFF" />
      <circle cx="12" cy="12.5" r="1.6" fill="#FFF" />
      <circle cx="9" cy="16" r="1.6" fill="#FFF" />
      <circle cx="15" cy="16" r="1.6" fill="#FFF" />
    </>
  ),
  replicate: (
    <>
      {rounded('#0A0A0A', 5)}
      {letter('#FFF', 'R', 12)}
    </>
  ),
  // ---- Design & Assets ---------------------------------------------------
  dev21st_components: (
    <>
      {rounded('#7C3AED', 5)}
      {letter('#FFF', '21', 10)}
    </>
  ),
  figma_api: (
    <>
      <circle cx="9" cy="6.5" r="3.5" fill="#F24E1E" />
      <circle cx="9" cy="13" r="3.5" fill="#A259FF" />
      <circle cx="9" cy="19.5" r="3" fill="#0ACF83" transform="translate(0 -0.5)" />
      <circle cx="15" cy="9.75" r="3.5" fill="#FF7262" />
      <circle cx="15" cy="16.25" r="3.5" fill="#1ABCFE" />
    </>
  ),
  unsplash_api: (
    <>
      {rounded('#0A0A0A', 5)}
      <path d="M8 10V7h8v3h-8zm0 2h8v5H8z" fill="#FFF" opacity="0.9" />
    </>
  ),
  lucide_icons: (
    <>
      {rounded('#0A0A0A', 5)}
      <path d="M12 5l1.2 3.6L17 10l-3.8 1.4L12 15l-1.2-3.6L7 10l3.8-1.4z" fill="#FFF" />
      <circle cx="17" cy="16.5" r="1.2" fill="#FFF" />
    </>
  ),
  // ---- Ecommerce & Productivity ---------------------------------------
  stripe: (
    <>
      {rounded('#635BFF', 5)}
      {letter('#FFF', 'S', 12)}
    </>
  ),
  airtable: (
    <>
      <path d="M12 3l9 3.5-9 3.5-9-3.5z" fill="#FCB400" />
      <path d="M4 8l7.2 2.8V21L4 18z" fill="#2D7FF9" />
      <path d="M13 10.8L20 8v10l-7 3z" fill="#18BFFF" />
    </>
  ),
  shopify: (
    <>
      <path d="M6 8h12l-1 13H7z" fill="#95BF47" />
      <path d="M9 8c0-3 1-5 3-5s3 2 3 5" stroke="#5E8E3E" strokeWidth="1.6" fill="none" />
      {letter('#FFF', 'S', 10)}
    </>
  ),
  notion: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" fill="#FFF" />
      {letter('#18181B', 'N', 11)}
    </>
  ),
  looker: (
    <>
      {rounded('#0B1F3A', 5)}
      <circle cx="9" cy="9" r="3.4" fill="#6CB4EE" />
      <circle cx="15.5" cy="14.5" r="3.4" fill="#4FC3F7" opacity="0.85" />
      <path d="M11 11l2.6 2.6" stroke="#FFF" strokeWidth="1.4" />
      <path d="M6 17h9" stroke="#4FC3F7" strokeWidth="2.2" />
    </>
  )
};

export const BrandLogo: React.FC<{ id: string; size?: number }> = ({ id, size = 34 }) => {
  const [imgFailed, setImgFailed] = React.useState(false);
  const logoPath = CONNECTOR_LOGO_PATHS[id];

  // Prefer the real downloaded logo; fall back to the SVG mark on any error.
  if (logoPath && !imgFailed) {
    return (
      <img
        src={logoPath}
        alt={id}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setImgFailed(true)}
        style={{
          display: 'block',
          flexShrink: 0,
          width: size,
          height: size,
          objectFit: 'contain',
          // Raw brand glyphs default to black — a light chip keeps them
          // visible on the dark UI and uniform across brands.
          background: '#F8FAFC',
          borderRadius: Math.max(4, size * 0.14),
          padding: size >= 24 ? 3 : 2,
          boxSizing: 'border-box'
        }}
      />
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ display: 'block', flexShrink: 0 }}
      aria-label={id}
      role="img"
    >
      {BRAND_LOGOS[id] ?? (
        <>
          <circle cx="12" cy="12" r="10" fill="#27272A" />
          {letter('#A1A1AA', '◈', 12)}
        </>
      )}
    </svg>
  );
};