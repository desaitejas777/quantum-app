// Home.jsx — Landing page with login form.
// Demonstrates: state management (useState), prop passing, conditional rendering.

import React, { useState } from 'react';

// ─── Sub-component: TopicCard ─────────────────────────────────────────────────
// Receives props: title, desc, icon, color, onClick
function TopicCard({ title, desc, icon, color, onClick }) {
  return (
    <div
      className="card"
      onClick={onClick}
      style={{ cursor: 'pointer', borderTop: `3px solid ${color}`, textAlign: 'center', padding: '24px 18px' }}
    >
      <div style={{ fontSize: '2.4rem', marginBottom: '10px' }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '6px', color }}>{title}</div>
      <div style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5 }}>{desc}</div>
    </div>
  );
}

// ─── Main Home Page ───────────────────────────────────────────────────────────
function Home({ setPage, isLoggedIn, setUsername, setLoggedIn, setIsAdmin }) {
  // Local state for form inputs
  const [nameInput, setNameInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState('');

  const isAdminName = nameInput.trim().toLowerCase() === 'tejas desai';
  const ADMIN_CODE = '2277';

  const handleLogin = () => {
    const trimmedName = nameInput.trim();
    if (!trimmedName) { setError('Please enter a name to continue.'); return; }

    if (isAdminName) {
      if (codeInput !== ADMIN_CODE) {
        setError('Admin code incorrect. Enter 2277 to access admin controls.');
        setIsAdmin(false);
        setUsername(trimmedName);
        setLoggedIn(true);
        return;
      }
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }

    setUsername(trimmedName);  // Pass username up via prop
    setLoggedIn(true);
    setError('');
  };

  const TOPICS = [
    // { id: 'qubit',   title: 'Qubits & Superposition', desc: 'Understand how a qubit differs from a classical bit with live animations.',  icon: '◉', color: 'var(--blue)'   },
    // { id: 'bloch',   title: 'Bloch Sphere',            desc: 'Visualise a qubit\'s state on the 3D Bloch sphere using 2D diagrams.',        icon: '◎', color: 'var(--purple)' },
    // { id: 'circuit', title: 'Quantum Circuits',        desc: 'Build simple quantum gate circuits and see how they transform qubits.',       icon: '⊞', color: 'var(--green)'  },
  ];

  return (
    <div>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '30px 0 36px' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '12px', animation: 'float 3s ease-in-out infinite', display: 'inline-block' }}>⚛</div>
        <h1 style={{ fontFamily: 'Space Mono, monospace', fontSize: '2rem', fontWeight: 700, color: 'var(--blue)', marginBottom: '10px' }}>
          Learn Quantum Computing
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '1rem', maxWidth: '460px', margin: '0 auto', lineHeight: 1.6 }}>
          Interactive animations and simplified diagrams to understand the basics of quantum computing — no physics degree required.
        </p>
      </div>

      {/* Login card — conditional rendering based on isLoggedIn prop */}
      {!isLoggedIn ? (
        <div className="card" style={{ maxWidth: '400px', margin: '0 auto 36px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>👤</div>
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>Enter your name to begin</div>
          <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '16px' }}>Your progress and quiz scores will be saved.</div>
          <input
            className="input"
            placeholder="e.g. Tejas Desai"
            value={nameInput}
            onChange={e => { setNameInput(e.target.value); setError(''); setCodeInput(''); }}  // JSX event + state update
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ marginBottom: '10px' }}
          />
          {isAdminName && (
            <>
              <input
                className="input"
                type="password"
                placeholder="Admin code"
                value={codeInput}
                onChange={e => { setCodeInput(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{ marginBottom: '10px' }}
              />
              {codeInput && codeInput === ADMIN_CODE && (
                <div style={{ color: 'var(--green)', fontSize: '0.82rem', marginBottom: '8px' }}>
                  Admin code accepted. Login will grant access to leaderboard controls.
                </div>
              )}
              {codeInput && codeInput !== ADMIN_CODE && (
                <div style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: '8px' }}>
                  Enter admin code 2277 to unlock delete and refresh on the leaderboard.
                </div>
              )}
            </>
          )}
          {error && <div style={{ color: 'var(--red)', fontSize: '0.82rem', marginBottom: '8px' }}>{error}</div>}
          <button className="btn btn-blue" onClick={handleLogin} style={{ width: '100%' }}>
            Start Learning →
          </button>
        </div>
      ) : (
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <span className="badge badge-green" style={{ fontSize: '0.88rem', padding: '6px 16px' }}>
            ✓ Welcome back! Pick a topic below.
          </span>
        </div>
      )}

      {/* Topic cards — pass setPage as prop to navigate */}
      <div className="grid3" style={{ marginBottom: '28px' }}>
        {TOPICS.map(t => (
          <TopicCard
            key={t.id}
            {...t}
            onClick={() => isLoggedIn ? setPage(t.id) : setError('Please enter your name first.')}
          />
        ))}
      </div>

      {/* Quick nav to quiz + progress */}
      {isLoggedIn && (
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button className="btn btn-purple" onClick={() => setPage('quiz')}>Take the Quiz ✎</button>
          <button className="btn btn-ghost" onClick={() => setPage('progress')}>View My Progress ▲</button>
        </div>
      )}
    </div>
  );
}

export default Home;
