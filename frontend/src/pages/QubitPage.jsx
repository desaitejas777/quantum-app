// QubitPage.jsx — Teaches Qubits & Superposition with live SVG animations.
// Demonstrates: useState, useEffect, SVG drawing, prop-based navigation.

import React, { useState, useEffect, useRef } from 'react';
import API from '../apiConfig';

// ─── Sub-component: BitComparison ────────────────────────────────────────────
// Accepts props: classical (0 or 1), qubitState ('0','1','super')
function BitComparison({ classical, qubitState }) {
  const getColor = () => {
    if (qubitState === 'super') return 'var(--purple)';
    if (qubitState === '1')     return 'var(--blue)';
    return 'var(--green)';
  };

  return (
    <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', padding: '16px 0' }}>
      {/* Classical bit */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', letterSpacing: '1.5px', marginBottom: '10px' }}>CLASSICAL BIT</div>
        <div style={{
          width: '70px', height: '70px', borderRadius: '50%',
          border: '3px solid var(--green)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.8rem', fontFamily: 'Space Mono, monospace',
          color: 'var(--green)', background: 'rgba(104,211,145,0.08)',
        }}>
          {classical}
        </div>
        <div style={{ color: 'var(--muted)', fontSize: '0.78rem', marginTop: '8px' }}>Definite: {classical === 0 ? 'OFF' : 'ON'}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', color: 'var(--muted)', fontSize: '1.4rem' }}>vs</div>

      {/* Qubit */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', letterSpacing: '1.5px', marginBottom: '10px' }}>QUBIT</div>
        <div style={{
          width: '70px', height: '70px', borderRadius: '50%',
          border: `3px solid ${getColor()}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: qubitState === 'super' ? '1rem' : '1.8rem',
          fontFamily: 'Space Mono, monospace',
          color: getColor(),
          background: `${getColor()}12`,
          animation: qubitState === 'super' ? 'blink 1.2s ease-in-out infinite' : 'none',
        }}>
          {qubitState === 'super' ? '|ψ⟩' : qubitState}
        </div>
        <div style={{ color: 'var(--muted)', fontSize: '0.78rem', marginTop: '8px' }}>
          {qubitState === 'super' ? '0 AND 1 (superposition)' : qubitState === '1' ? 'State |1⟩' : 'State |0⟩'}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-component: ProbabilityBar ───────────────────────────────────────────
function ProbabilityBar({ label, value, color }) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
        <span style={{ fontFamily: 'Space Mono, monospace', color }}>{label}</span>
        <span style={{ color: 'var(--muted)' }}>{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="prog-bar">
        <div className="prog-fill" style={{ width: `${value * 100}%`, background: color }} />
      </div>
    </div>
  );
}

// ─── Main QubitPage ───────────────────────────────────────────────────────────
function QubitPage({ setPage, username }) {
  const [qubitState, setQubitState] = useState('0');  // '0', '1', or 'super'
  const [angle, setAngle] = useState(0);               // for animation
  const [measured, setMeasured] = useState(null);      // result after measurement
  const [step, setStep] = useState(0);                 // lesson step
  const animRef = useRef(null);

  // Animate the superposition wave
  useEffect(() => {
    if (qubitState === 'super') {
      animRef.current = setInterval(() => setAngle(a => (a + 3) % 360), 40);
    } else {
      clearInterval(animRef.current);
    }
    return () => clearInterval(animRef.current);
  }, [qubitState]);

  const handleMeasure = () => {
    if (qubitState !== 'super') { setMeasured(qubitState); return; }
    setMeasured(Math.random() < 0.5 ? '0' : '1');  // collapses superposition
    setQubitState(Math.random() < 0.5 ? '0' : '1');
  };

  const markComplete = async () => {
    try {
      await fetch(`${API}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, topic: 'qubit' }),
      });
    } catch {}
    setPage('bloch');
  };

  const STEPS = [
    { title: 'What is a Bit?', body: 'A classical computer uses bits — each is either 0 (off) or 1 (on). Think of it like a light switch. It cannot be both at the same time.' },
    { title: 'What is a Qubit?', body: 'A quantum bit (qubit) can be 0, 1, or both at the same time — this is called superposition. It is only when we measure it that it collapses to 0 or 1.' },
    { title: 'Superposition', body: 'While unmeasured, a qubit exists in a blend of both states. We describe this with probabilities: a 50/50 qubit has equal chance of collapsing to 0 or 1.' },
  ];

  // SVG wave for superposition
  const wavePoints = Array.from({ length: 60 }, (_, i) => {
    const x = i * 5;
    const y = 40 + 28 * Math.sin(((i * 6) + angle) * Math.PI / 180);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Qubits & Superposition</h1>
          <p className="page-subtitle">How quantum bits differ from classical bits</p>
        </div>
        <span className="badge badge-blue">Lesson 1 of 3</span>
      </div>

      <div className="grid2" style={{ marginBottom: '20px' }}>
        {/* Lesson text */}
        <div className="card">
          <div className="section-label">Concept {step + 1} of {STEPS.length}</div>
          <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: '1.1rem', marginBottom: '10px', color: 'var(--blue)' }}>
            {STEPS[step].title}
          </h2>
          <p style={{ color: 'var(--text)', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '20px' }}>
            {STEPS[step].body}
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-ghost" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>← Prev</button>
            <button className="btn btn-blue"  onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))} disabled={step === STEPS.length - 1}>Next →</button>
          </div>
        </div>

        {/* Interactive Qubit Demo */}
        <div className="card">
          <div className="section-label">Interactive Demo</div>
          <BitComparison classical={qubitState === '1' ? 1 : 0} qubitState={qubitState} />

          {/* SVG Wave Animation */}
          {qubitState === 'super' && (
            <div style={{ margin: '10px 0' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textAlign: 'center', marginBottom: '4px' }}>Superposition wave</div>
              <svg width="100%" height="80" viewBox="0 0 300 80" style={{ display: 'block' }}>
                <polyline points={wavePoints} fill="none" stroke="var(--purple)" strokeWidth="2.5" />
                <line x1="0" y1="40" x2="300" y2="40" stroke="var(--border)" strokeDasharray="4,4" />
              </svg>
            </div>
          )}

          {/* Probability bars */}
          <ProbabilityBar label="|0⟩" value={qubitState === 'super' ? 0.5 : qubitState === '0' ? 1 : 0} color="var(--green)" />
          <ProbabilityBar label="|1⟩" value={qubitState === 'super' ? 0.5 : qubitState === '1' ? 1 : 0} color="var(--blue)" />

          {/* Controls */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            {['0', '1', 'super'].map(s => (
              <button key={s} className="btn btn-ghost"
                style={{ flex: 1, borderColor: qubitState === s ? 'var(--blue)' : undefined, color: qubitState === s ? 'var(--blue)' : undefined }}
                onClick={() => { setQubitState(s); setMeasured(null); }}>
                {s === 'super' ? '|ψ⟩ Superposition' : `State |${s}⟩`}
              </button>
            ))}
          </div>
          <button className="btn btn-purple" onClick={handleMeasure} style={{ marginTop: '10px', width: '100%' }}>
            ⚡ Measure Qubit
          </button>
          {measured !== null && (
            <div style={{ marginTop: '10px', textAlign: 'center', padding: '10px', background: 'rgba(183,148,244,0.1)', borderRadius: '8px', border: '1px solid var(--purple)' }}>
              Collapsed to: <strong style={{ fontFamily: 'Space Mono, monospace', color: 'var(--purple)' }}>|{measured}⟩</strong>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button className="btn btn-ghost" onClick={() => setPage('home')}>← Back</button>
        <button className="btn btn-green" onClick={markComplete}>Mark Complete & Continue →</button>
      </div>
    </div>
  );
}

export default QubitPage;
