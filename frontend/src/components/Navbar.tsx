import React from 'react';
import { useApp } from '../context/AppContext';
import { ArrowRight } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentScreen, setCurrentScreen } = useApp();

  return (
    <header className="navbar">
      <div className="craftai-logo" onClick={() => setCurrentScreen('landing')}>
        <div className="craftai-logo-icon" />
        <span>Craft<span className="highlight">Ai</span></span>
      </div>

      <nav>
        <ul className="nav-links">
          <li
            className={`nav-link ${currentScreen === 'landing' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('landing')}
          >
            Home
          </li>
          <li
            className={`nav-link ${currentScreen === 'features' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('features')}
          >
            Features
          </li>
          <li
            className={`nav-link ${currentScreen === 'about' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('about')}
          >
            About
          </li>
        </ul>
      </nav>

      <div className="nav-actions">
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
