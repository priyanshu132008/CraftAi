import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
import { Eye, EyeOff, Sparkles, ArrowLeft, Loader2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { setCurrentScreen, setUser } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const finishSignIn = (userEmail: string) => {
    setUser({
      name: userEmail.split('@')[0],
      email: userEmail,
      avatar: userEmail.slice(0, 2).toUpperCase()
    });
    setCurrentScreen('dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    setBusy(false);
    if (error || !data.session) {
      setAuthError(error?.message ?? 'Login failed. Please try again.');
      return;
    }
    finishSignIn(data.session.user.email ?? email);
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    setBusy(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/dashboard` }
    });
    setBusy(false);
    if (error) {
      setAuthError(
        `${provider} sign-in is not configured for this Supabase project (${error.message}).`
      );
    }
  };

  return (
    <div className="auth-page-container">
      {/* Left Column: Login Form */}
      <div className="auth-form-side">
        <div style={{ marginBottom: '2.5rem' }}>
          <button
            onClick={() => setCurrentScreen('landing')}
            className="btn-ghost"
            style={{ padding: '6px 0', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1.5rem' }}
          >
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </button>

          <div className="craftai-logo" onClick={() => setCurrentScreen('landing')}>
            <div className="craftai-logo-icon" />
            <span>Craft<span className="highlight">Ai</span></span>
          </div>
        </div>

        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '6px' }}>
          Welcome back!
        </h1>
        <p style={{ color: 'var(--neutral-slate)', fontSize: '0.95rem', marginBottom: '2rem' }}>
          Sign in to continue to your workspace.
        </p>

        {/* Social Logins */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.5rem' }}>
          <button
            type="button"
            className="btn-social"
            disabled={busy}
            onClick={() => handleOAuth('google')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <button
            type="button"
            className="btn-social"
            disabled={busy}
            onClick={() => handleOAuth('github')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            <span>Continue with GitHub</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', color: 'var(--neutral-gray)' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--neutral-light-gray)' }} />
          <span style={{ padding: '0 12px', fontSize: '0.85rem' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--neutral-light-gray)' }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="input-group">
            <label className="input-label">Email address</label>
            <input
              type="email"
              required
              className="input-field"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="input-label">Password</label>
              <a href="#" style={{ fontSize: '0.8rem', color: '#FFFFFF', fontWeight: 600 }}>
                Forgot password?
              </a>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="input-field"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--neutral-gray)',
                  cursor: 'pointer'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={busy}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', marginTop: '0.75rem' }}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : 'Sign In'}
          </button>
        </form>

        {authError && (
          <p style={{ marginTop: '1rem', fontSize: '0.82rem', color: '#F87171' }}>{authError}</p>
        )}

        <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.9rem', color: '#A1A1AA' }}>
          Don't have an account?{' '}
          <span
            onClick={() => setCurrentScreen('signup')}
            style={{ color: '#FFFFFF', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
          >
            Sign Up
          </span>
        </p>
      </div>

      {/* Right Column: Dreamscape Landscape Card from Design */}
      <div className="auth-visual-side">
        <img
          src="/assets/dreamscape-dunes.jpg"
          alt="Purple dunes dreamscape"
          className="auth-bg-img"
        />
        <div className="auth-visual-content">
          <div style={{ display: 'inline-flex', padding: '6px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(8px)', marginBottom: '1.25rem' }}>
            <Sparkles size={20} color="#FFFFFF" />
          </div>
          <h2 className="auth-visual-title">
            Better Tools.<br />Bigger Dreams.
          </h2>
          <p className="auth-visual-subtext">
            Create, build, and deploy stunning web experiences with the power of AI.
          </p>
        </div>
      </div>
    </div>
  );
};
