import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, Loader2, Mail } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
import ThemeToggle from './ThemeToggle';
import { BrandLogo } from './BrandLogos';
import '../styles/auth.css';

/**
 * Shared 50/50 split auth page (Stitch design port).
 * LoginPage renders it with initialMode="login", SignupPage with "signup".
 * All Supabase calls are the real ones preserved from the original pages:
 * signInWithPassword, signInWithOtp (magic link), signUp, signInWithOAuth
 * (google + github).
 */

type AuthMode = 'signup' | 'login';
type LoginMethod = 'magic' | 'password';
type OAuthProvider = 'google' | 'github';
type Busy = 'submit' | OAuthProvider | null;

const REDIRECT_TO = `${window.location.origin}/dashboard`;

const GoogleIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

const GitHubIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

/** Marquee content — real BrandLogo ids (downloaded brand logos). */
const MARQUEE_ROWS: {
  variant: 'l1' | 'r2' | 'l3';
  items: [string, string][];
}[] = [
  {
    variant: 'l1',
    items: [
      ['openai_api', 'OpenAI'],
      ['supabase', 'Supabase'],
      ['google_gemini', 'Gemini'],
      ['stripe', 'Stripe'],
      ['figma_api', 'Figma']
    ]
  },
  {
    variant: 'r2',
    items: [
      ['anthropic_claude', 'Anthropic'],
      ['slack', 'Slack'],
      ['mongodb', 'MongoDB'],
      ['notion', 'Notion'],
      ['deepseek', 'DeepSeek']
    ]
  },
  {
    variant: 'l3',
    items: [
      ['aws', 'AWS'],
      ['azure', 'Azure'],
      ['firebase', 'Firebase'],
      ['postgres', 'PostgreSQL'],
      ['resend', 'Resend']
    ]
  }
];

const MarqueeRow: React.FC<{
  variant: 'l1' | 'r2' | 'l3';
  items: [string, string][];
}> = ({ variant, items }) => (
  <div className={`auth-marquee auth-marquee--${variant}`}>
    {/* Content rendered twice for a seamless translateX(-50%) loop. */}
    <div className="auth-marquee-track">
      {[0, 1].map(copy =>
        items.map(([id, name]) => (
          <div className="auth-chip" key={`${copy}-${id}`}>
            <BrandLogo id={id} size={20} />
            <span>{name}</span>
          </div>
        ))
      )}
    </div>
  </div>
);

/** 0–4 password strength score for the segmented meter. */
const passwordScore = (pw: string): number => {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) s++;
  return s;
};

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export const AuthSplit: React.FC<{ initialMode: AuthMode }> = ({ initialMode }) => {
  const { setCurrentScreen, setUser } = useApp();
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('magic');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);

  const isSignup = mode === 'signup';
  const showPasswordField = isSignup || loginMethod === 'password';

  const finishSignIn = (userEmail: string, fullName?: string) => {
    setUser({
      name: fullName || userEmail.split('@')[0],
      email: userEmail,
      avatar: (fullName ? fullName[0] : userEmail[0]).toUpperCase()
    });
    setCurrentScreen('dashboard');
  };

  const switchMode = (m: AuthMode) => {
    setMode(m);
    setLoginMethod('magic');
    setAuthError(null);
    setMagicSent(false);
  };

  // ---- Real Supabase: password sign-in (from the original LoginPage) ----
  const handlePasswordSignIn = async () => {
    if (!isEmail(email)) {
      setAuthError('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }
    setBusy('submit');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(null);
    if (error || !data.session) {
      setAuthError(error?.message ?? 'Login failed. Please try again.');
      return;
    }
    finishSignIn(data.session.user.email ?? email);
  };

  // ---- Real Supabase: magic link via OTP email (from the original LoginPage) ----
  const handleMagicLink = async () => {
    if (!isEmail(email)) {
      setAuthError('Enter a valid email address.');
      return;
    }
    setBusy('submit');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: REDIRECT_TO }
    });
    setBusy(null);
    if (error) {
      setAuthError(error.message);
      return;
    }
    setMagicSent(true);
  };

  // ---- Real Supabase: sign-up (from the original SignupPage) ----
  const handleSignUp = async () => {
    if (!name.trim()) {
      setAuthError('Enter your full name.');
      return;
    }
    if (!isEmail(email)) {
      setAuthError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setAuthError('Password must be at least 8 characters.');
      return;
    }
    setBusy('submit');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } }
    });
    setBusy(null);
    if (error) {
      setAuthError(error.message);
      return;
    }
    // Email-confirmation projects only return a session after the inbox
    // link is clicked.
    if (data.session) {
      finishSignIn(email, name);
    } else {
      setAuthError('Account created — check your inbox to confirm your email, then log in.');
    }
  };

  // ---- Real Supabase: OAuth (google wired on both pages, github on signup) ----
  const handleOAuth = async (provider: OAuthProvider) => {
    setAuthError(null);
    setBusy(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: REDIRECT_TO }
    });
    setBusy(null);
    if (error) {
      setAuthError(
        `${provider === 'google' ? 'Google' : 'GitHub'} sign-in is not configured for this Supabase project (${error.message}).`
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (mode === 'signup') {
      handleSignUp();
    } else if (loginMethod === 'magic') {
      handleMagicLink();
    } else {
      handlePasswordSignIn();
    }
  };

  const submitLabel = isSignup
    ? 'Create Account'
    : loginMethod === 'magic'
      ? 'Send Magic Link'
      : 'Sign In';

  const heading = isSignup ? 'Create your account' : 'Welcome back';
  const subheading = isSignup
    ? 'Start building autonomous software with multi-agent orchestration.'
    : 'Authenticate to access workspace environments and active runs.';

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    lineHeight: '16px',
    letterSpacing: '0.08em',
    fontWeight: 600,
    textTransform: 'uppercase',
    color: 'var(--text-muted)'
  };

  return (
    <div className="auth-split">
      {/* LEFT: form column */}
      <div className="auth-split-left">
        {/* Header: CraftAI logo + theme toggle */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div
            className="craftai-logo"
            onClick={() => setCurrentScreen('landing')}
            style={{ cursor: 'pointer' }}
          >
            <div className="craftai-logo-icon" />
            <span>
              Craft<span className="highlight">Ai</span>
            </span>
          </div>
          <ThemeToggle />
        </header>

        <div style={{ width: '100%', maxWidth: 480, margin: '2rem auto', padding: '1rem 0' }}>
          {/* Sign Up / Log In tabs with animated underline */}
          <div
            style={{
              display: 'flex',
              gap: 32,
              borderBottom: '1px solid var(--border-subtle)',
              marginBottom: '2rem',
              position: 'relative'
            }}
          >
            {(['signup', 'login'] as AuthMode[]).map(m => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  aria-selected={active}
                  role="tab"
                  onClick={() => switchMode(m)}
                  style={{
                    position: 'relative',
                    paddingBottom: 12,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    paddingTop: 0,
                    paddingLeft: 0,
                    paddingRight: 0,
                    fontSize: 15,
                    fontWeight: active ? 600 : 500,
                    letterSpacing: '-0.01em',
                    color: active ? 'var(--text-heading)' : 'var(--text-muted)',
                    transition: 'color var(--transition-fast)'
                  }}
                >
                  {m === 'signup' ? 'Sign Up' : 'Log In'}
                  {active && (
                    <motion.span
                      layoutId="auth-tab-underline"
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : { type: 'spring', stiffness: 400, damping: 34 }
                      }
                      style={{
                        position: 'absolute',
                        bottom: -1,
                        left: 0,
                        right: 0,
                        height: 2,
                        background: 'var(--text-heading)'
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Heading/subheading swap per mode */}
          <div style={{ marginBottom: '1.75rem' }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mode}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <h1
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '2.15rem',
                    lineHeight: 1.2,
                    letterSpacing: '-0.03em',
                    color: 'var(--text-heading)'
                  }}
                >
                  {heading}
                </h1>
                <p
                  style={{
                    marginTop: 10,
                    fontSize: '0.9rem',
                    lineHeight: 1.6,
                    color: 'var(--text-muted)'
                  }}
                >
                  {subheading}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Stacked OAuth buttons — both wired to real signInWithOAuth */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1.5rem' }}>
            <button
              type="button"
              className="btn-social"
              disabled={busy !== null}
              onClick={() => handleOAuth('google')}
            >
              {busy === 'google' ? <Loader2 size={18} className="animate-spin" /> : <GoogleIcon />}
              <span>{busy === 'google' ? 'Connecting to Google…' : 'Continue with Google'}</span>
            </button>
            <button
              type="button"
              className="btn-social"
              disabled={busy !== null}
              onClick={() => handleOAuth('github')}
            >
              {busy === 'github' ? <Loader2 size={18} className="animate-spin" /> : <GitHubIcon />}
              <span>{busy === 'github' ? 'Connecting to GitHub…' : 'Continue with GitHub'}</span>
            </button>
          </div>

          {/* OR divider */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0', position: 'relative' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
            <span
              style={{
                padding: '0 12px',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)'
              }}
            >
              OR
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {magicSent ? (
              <motion.div
                key="magic-sent"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                  padding: '2rem 1.5rem',
                  textAlign: 'center'
                }}
              >
                <Mail size={28} color="var(--accent-indigo-bright)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Check your inbox</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  We sent a magic sign-in link to{' '}
                  <strong style={{ color: 'var(--text-heading)' }}>{email}</strong>. Click it to
                  jump straight into your workspace.
                </p>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setMagicSent(false);
                    setLoginMethod('password');
                  }}
                >
                  Use a different method
                </button>
              </motion.div>
            ) : (
              <motion.form
                key={`${mode}-${loginMethod}`}
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                onSubmit={handleSubmit}
                noValidate
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                {isSignup && (
                  <div>
                    <label htmlFor="auth-name" style={labelStyle}>
                      Full Name
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      className="input-field"
                      value={name}
                      autoComplete="name"
                      disabled={busy !== null}
                      onChange={e => setName(e.target.value)}
                      placeholder="Ada Lovelace"
                      style={{ marginTop: 6 }}
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="auth-email" style={labelStyle}>
                    Work Email
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    className="input-field"
                    value={email}
                    autoComplete="email"
                    disabled={busy !== null}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="ada@craftai.systems"
                    style={{ marginTop: 6 }}
                  />
                </div>

                {showPasswordField && (
                  <div>
                    <label htmlFor="auth-password" style={labelStyle}>
                      Password
                    </label>
                    <div style={{ position: 'relative', marginTop: 6 }}>
                      <input
                        id="auth-password"
                        type={showPassword ? 'text' : 'password'}
                        className="input-field"
                        value={password}
                        autoComplete={isSignup ? 'new-password' : 'current-password'}
                        disabled={busy !== null}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        style={{ paddingRight: 42 }}
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          padding: 4,
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex'
                        }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {/* 4-segment strength meter (signup only) */}
                    {isSignup && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 8 }}>
                        {[0, 1, 2, 3].map(i => (
                          <div
                            key={i}
                            style={{
                              height: 4,
                              flex: 1,
                              borderRadius: 9999,
                              background:
                                i < passwordScore(password)
                                  ? 'var(--accent-indigo-bright)'
                                  : 'var(--border-subtle)',
                              transition: 'background var(--transition-normal)'
                            }}
                          />
                        ))}
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 10,
                            marginLeft: 8,
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            color: 'var(--text-muted)'
                          }}
                        >
                          8+ chars required
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Magic-link toggle: login defaults to magic link; swap to password */}
                {!isSignup && loginMethod === 'magic' && (
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod('password');
                      setAuthError(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      textAlign: 'left',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      textDecoration: 'underline',
                      textUnderlineOffset: 4,
                      cursor: 'pointer',
                      transition: 'color var(--transition-fast)'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-heading)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                  >
                    or sign in with password
                  </button>
                )}

                {/* High-contrast CTA — "white" via text-heading/bg-primary tokens */}
                <button
                  type="submit"
                  disabled={busy !== null}
                  style={{
                    width: '100%',
                    marginTop: 4,
                    padding: '14px 16px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'var(--text-heading)',
                    color: 'var(--bg-primary)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: '-0.01em',
                    cursor: busy !== null ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    opacity: busy !== null ? 0.7 : 1,
                    boxShadow: '0 0 24px color-mix(in srgb, var(--text-heading) 20%, transparent)',
                    transition: 'box-shadow var(--transition-fast), transform var(--transition-fast)'
                  }}
                >
                  {busy === 'submit' ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <span>{submitLabel}</span>
                  )}
                  {busy !== 'submit' && <ArrowRight size={16} strokeWidth={2.5} />}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {authError && (
            <motion.p
              key={authError}
              initial={reduceMotion ? false : { x: [0, -6, 6, -4, 4, 0], opacity: 0.6 }}
              animate={{ x: 0, opacity: 1 }}
              role="alert"
              style={{
                marginTop: '1rem',
                fontSize: '0.82rem',
                color: '#F87171',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid rgba(248, 113, 113, 0.3)',
                background: 'rgba(248, 113, 113, 0.08)',
                lineHeight: 1.5
              }}
            >
              {authError}
            </motion.p>
          )}
        </div>

        {/* Footer terms */}
        <footer style={{ width: '100%', maxWidth: 480, margin: '0 auto' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            By continuing, you agree to our{' '}
            <span
              style={{ color: 'var(--text-main)', textDecoration: 'underline', textUnderlineOffset: 2 }}
            >
              Terms of Service
            </span>{' '}
            and{' '}
            <span
              style={{ color: 'var(--text-main)', textDecoration: 'underline', textUnderlineOffset: 2 }}
            >
              Privacy Policy
            </span>
            .
          </p>
        </footer>
      </div>

      {/* RIGHT: integrations marquee pane */}
      <div className="auth-split-right">
        {/* "40+ NATIVE INTEGRATIONS" pill — section heading, top-center */}
        <div
          className="auth-glass-pill"
          style={{
            position: 'absolute',
            top: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2
          }}
        >
          <span
            className="auth-pulse-dot"
            style={{
              width: 6,
              height: 6,
              borderRadius: 9999,
              background: 'var(--agent-debugger)',
              display: 'inline-block',
              flexShrink: 0
            }}
          />
          40+ NATIVE INTEGRATIONS
        </div>

        {/* 3-row infinite marquee, edge-fade mask, hover pause */}
        <div
          className="auth-marquee-mask"
          style={{ width: '100%', margin: 'auto 0', display: 'flex', flexDirection: 'column', gap: 24, padding: '3rem 0' }}
        >
          {MARQUEE_ROWS.map(row => (
            <MarqueeRow key={row.variant} variant={row.variant} items={row.items} />
          ))}
        </div>

        {/* Bottom tagline */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <p
            className="text-zinc-900 dark:text-white"
            style={{
              fontSize: '0.95rem',
              fontWeight: 500,
              letterSpacing: '-0.005em',
              textAlign: 'center'
            }}
          >
            Powered by modern AI tools.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthSplit;