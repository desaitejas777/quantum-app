// Navbar.jsx — Navigation bar. Receives setPage prop from App.jsx.
// Clicking a nav item calls setPage(), which updates App's currentPage state.

import React, { useState } from 'react';

const NAV = [
  { id: 'home',     label: 'Home',     icon: '⌂' },
  { id: 'qubit',    label: 'Qubits',   icon: '◉' },
  { id: 'bloch',    label: 'Bloch',    icon: '◎' },
  { id: 'circuit',  label: 'Circuits', icon: '⊞' },
  { id: 'quiz',     label: 'Quiz',     icon: '✎' },
  { id: 'progress', label: 'Progress', icon: '▲' },
  { id: 'pqc',      label: 'PQC Compare', icon: '⌁' },
];
const MOBILE_PRIMARY = NAV.filter(item => ['home', 'qubit', 'pqc'].includes(item.id));
const MOBILE_MORE = NAV.filter(item => ['bloch', 'circuit', 'quiz', 'progress'].includes(item.id));

function Navbar({ currentPage, setPage, username, isLoggedIn, organizationRole }) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  return (
    <>
      <nav className="navbar" style={s.nav} aria-label="Primary navigation">
        {/* Brand */}
        <div style={s.brand} className="brand">
          <span style={s.atom}>⚛</span>
          <div>
            <div style={s.brandName}>QuantumLearn</div>
            <div style={s.brandSub}>Interactive Basics</div>
          </div>
        </div>

        {/* Nav links — each calls setPage(id) to navigate */}
        <div style={s.links} className="nav-links">
          {NAV.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPage(item.id)}
              className={`nav-link${currentPage === item.id ? ' active' : ''}`}
              aria-current={currentPage === item.id ? 'page' : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>

        {/* User chip */}
        <div style={s.user} className="nav-user">
          {isLoggedIn
            ? <span style={s.userChip}>👤 {username} · {organizationRole}</span>
            : <span style={{ ...s.userChip, color: 'var(--muted)', fontSize: '0.78rem' }}>Not logged in</span>
          }
        </div>
      </nav>

      <nav className="mobile-nav" aria-label="Primary navigation" onKeyDown={event => event.key === 'Escape' && setIsMoreOpen(false)}>
        {MOBILE_PRIMARY.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => { setIsMoreOpen(false); setPage(item.id); }}
            className={`nav-link${currentPage === item.id ? ' active' : ''}`}
            aria-current={currentPage === item.id ? 'page' : undefined}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
        <div className="mobile-more">
          <button
            type="button"
            className={`nav-link mobile-more-trigger${MOBILE_MORE.some(item => item.id === currentPage) ? ' active' : ''}`}
            aria-expanded={isMoreOpen}
            aria-controls="mobile-more-menu"
            onClick={() => setIsMoreOpen(open => !open)}
          >
            <span className="nav-icon" aria-hidden="true">•••</span>
            <span className="nav-label">More</span>
          </button>
          {isMoreOpen && (
            <div className="mobile-more-menu" id="mobile-more-menu" aria-label="More destinations">
              {MOBILE_MORE.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={`mobile-more-item${currentPage === item.id ? ' active' : ''}`}
                  aria-current={currentPage === item.id ? 'page' : undefined}
                  onClick={() => { setPage(item.id); setIsMoreOpen(false); }}
                >
                  <span aria-hidden="true">{item.icon}</span>{item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>
    </>
  );
}

const s = {
  nav: {
    background: 'linear-gradient(135deg,#ffffff,#f8f9fa)',
    borderBottom: '1px solid rgba(0,0,0,0.1)',
    padding: '0 24px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    height: '60px', position: 'sticky', top: 0, zIndex: 100,
    boxShadow: '0 2px 16px rgba(0,0,0,0.1)',
  },
  brand: { display: 'flex', alignItems: 'center', gap: '10px' },
  atom: { fontSize: '1.8rem', animation: 'spin 8s linear infinite', display: 'inline-block' },
  brandName: { fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: '1rem', color: 'var(--blue)', letterSpacing: '-0.5px' },
  brandSub: { fontSize: '0.62rem', color: 'var(--muted)', letterSpacing: '1px', textTransform: 'uppercase' },
  links: { display: 'flex', gap: '2px' },
  user: { minWidth: '120px', textAlign: 'right' },
  userChip: { fontSize: '0.82rem', color: 'var(--blue)', fontWeight: 500 },
};

export default Navbar;
