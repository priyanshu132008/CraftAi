import React from 'react';
import { useApp } from '../context/AppContext';
import { ArrowRight } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export const Navbar: React.FC = () => {
  const { currentScreen, setCurrentScreen } = useApp();

  return (
    <header className="navbar">
      <div
        className="craftai-logo"
        role="button"
        tabIndex={0}
        onClick={() => setCurrentScreen('landing')}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setCurrentScreen('landing');
          }
        }}
      >
        <div className="craftai-logo-icon" />
        <span>Craft<span className="highlight">Ai</span></span>
      </div>

      <nav>
        <ul className="nav-links">
          <li className={`nav-link ${currentScreen === 'landing' ? 'active' : ''}`}>
            <button type="button" onClick={() => setCurrentScreen('landing')}>Home</button>
          </li>
          <li className={`nav-link ${currentScreen === 'features' ? 'active' : ''}`}>
            <button type="button" onClick={() => setCurrentScreen('features')}>Features</button>
          </li>
        </ul>
      </nav>

      <div className="nav-actions">
        <ThemeToggle />
        <button className="btn-ghost" onClick={() => setCurrentScreen('login')}>
          Login
        </button>
        <button className="btn-primary" onClick={() => setCurrentScreen('signup')}>
          <span>Get Started</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </header>
  );
};
