import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, CheckCircle2, Rocket, ExternalLink, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export const DeployModal: React.FC = () => {
  const { isDeployModalOpen, setIsDeployModalOpen, currentProject } = useApp();
  const [activePlatform, setActivePlatform] = useState<'vercel' | 'netlify' | 'custom'>('vercel');
  const [deployState, setDeployState] = useState<'idle' | 'deploying' | 'success'>('idle');
  const [deployUrl, setDeployUrl] = useState('');

  if (!isDeployModalOpen) return null;

  const handleDeploy = () => {
    setDeployState('deploying');

    setTimeout(() => {
      setDeployState('success');
      setDeployUrl(`https://${currentProject?.id || 'portfolio-website'}.craftai.app`);
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // ignore if confetti fails
      }
    }, 2200);
  };

  const handleClose = () => {
    setIsDeployModalOpen(false);
    setDeployState('idle');
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.75rem 2.25rem 0' }}>
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Deploy Your Project</h2>
            <p style={{ color: 'var(--neutral-slate)', fontSize: '0.9rem', marginTop: '2px' }}>
              Choose how you want to publish your project to the web.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="btn-ghost"
            style={{ padding: '6px', color: 'var(--neutral-gray)' }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="deploy-modal-body">
          {/* Platform Tabs */}
          <div className="deploy-tabs">
            <button
              type="button"
              className={`deploy-tab ${activePlatform === 'vercel' ? 'active' : ''}`}
              onClick={() => setActivePlatform('vercel')}
            >
              Vercel
            </button>
            <button
              type="button"
              className={`deploy-tab ${activePlatform === 'netlify' ? 'active' : ''}`}
              onClick={() => setActivePlatform('netlify')}
            >
              Netlify
            </button>
            <button
              type="button"
              className={`deploy-tab ${activePlatform === 'custom' ? 'active' : ''}`}
              onClick={() => setActivePlatform('custom')}
            >
              Custom Domain
            </button>
          </div>

          {/* Platform Card */}
          <div className="deploy-platform-card">
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>
                {activePlatform === 'vercel'
                  ? 'Deploy to Vercel'
                  : activePlatform === 'netlify'
                  ? 'Deploy to Netlify'
                  : 'Connect Custom Domain'}
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--neutral-slate)', lineHeight: 1.5 }}>
                {activePlatform === 'vercel'
                  ? 'Connect your project to Vercel for instant deployment and a custom domain.'
                  : activePlatform === 'netlify'
                  ? 'Publish modern static assets and serverless functions directly on Netlify edge network.'
                  : 'Point any DNS domain name or CNAME directly to your CraftAi server.'}
              </p>

              <ul className="deploy-features-list">
                <li className="deploy-feature-item">
                  <CheckCircle2 size={16} color="#10B981" />
                  <span>Free global edge hosting</span>
                </li>
                <li className="deploy-feature-item">
                  <CheckCircle2 size={16} color="#10B981" />
                  <span>Custom domain support with automatic SSL</span>
                </li>
                <li className="deploy-feature-item">
                  <CheckCircle2 size={16} color="#10B981" />
                  <span>Automatic HTTPS &amp; DDOS protection</span>
                </li>
              </ul>
            </div>

            <div>
              <img
                src="/assets/deploy-rocket.jpg"
                alt="Deploy rocket"
                className="deploy-rocket-illustration"
              />
            </div>
          </div>

          {/* Status Message if Deploying / Succeeded */}
          {deployState === 'deploying' && (
            <div
              style={{
                padding: '1rem',
                borderRadius: '8px',
                background: '#141414',
                border: '1px solid #27272A',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '1rem'
              }}
            >
              <Loader2 size={18} className="animate-spin" color="#FFFFFF" />
              <span style={{ fontSize: '0.88rem', color: '#EDEDED', fontWeight: 500 }}>
                Building production bundle, provisioning SSL, and deploying to global CDN...
              </span>
            </div>
          )}

          {deployState === 'success' && (
            <div
              style={{
                padding: '1.25rem',
                borderRadius: '8px',
                background: '#141414',
                border: '1px solid #333333',
                marginBottom: '1rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF', fontWeight: 700, marginBottom: '6px' }}>
                <CheckCircle2 size={18} color="#FFFFFF" />
                <span>Successfully Deployed to Production!</span>
              </div>
              <a
                href={deployUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  textDecoration: 'underline'
                }}
              >
                <span>{deployUrl}</span>
                <ExternalLink size={14} />
              </a>
            </div>
          )}

          {/* Modal Actions */}
          <div className="deploy-modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleClose}
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn-primary"
              disabled={deployState === 'deploying'}
              onClick={handleDeploy}
            >
              <Rocket size={16} />
              <span>{deployState === 'deploying' ? 'Deploying...' : 'Deploy Now'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
