// Navbar.jsx — Navigation bar. Receives setPage prop from App.jsx.
// Clicking a nav item calls setPage(), which updates App's currentPage state.

import React from 'react';

const NAV = [
  { id: 'home',     label: 'Home',     icon: '⌂' },
  { id: 'qubit',    label: 'Qubits',   icon: '◉' },
  { id: 'bloch',    label: 'Bloch',    icon: '◎' },
  { id: 'circuit',  label: 'Circuits', icon: '⊞' },
  { id: 'quiz',     label: 'Quiz',     icon: '✎' },
  { id: 'progress', label: 'Progress', icon: '▲' },
];

function Navbar({ currentPage, setPage, username, isLoggedIn }) {
  return (
    <>
      <nav className="navbar" style={s.nav}>
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
              style={{ ...s.link, ...(currentPage === item.id ? s.active : {}) }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>

        {/* User chip */}
        <div style={s.user} className="nav-user">
          {isLoggedIn
            ? <span style={s.userChip}>👤 {username}</span>
            : <span style={{ ...s.userChip, color: 'var(--muted)', fontSize: '0.78rem' }}>Not logged in</span>
          }
        </div>
      </nav>

      <div className="mobile-nav">
        {NAV.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPage(item.id)}
            className={`nav-link${currentPage === item.id ? ' active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </div>
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
  link: {
    background: 'transparent', border: 'none', color: 'var(--muted)',
    cursor: 'pointer', padding: '7px 12px', borderRadius: '7px',
    fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '0.82rem',
    display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.18s',
  },
  active: {
    background: 'rgba(99,179,237,0.2)',
    color: 'var(--blue)',
    borderBottom: '2px solid var(--blue)',
  },
  user: { minWidth: '120px', textAlign: 'right' },
  userChip: { fontSize: '0.82rem', color: 'var(--blue)', fontWeight: 500 },
};

export default Navbar;
