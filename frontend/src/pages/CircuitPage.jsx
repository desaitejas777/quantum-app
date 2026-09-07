// CircuitPage.jsx — Quantum Circuit builder with SVG gate diagrams.
// Demonstrates: useState array manipulation, SVG rendering, event-driven state.

import React, { useState } from 'react';
import API from '../apiConfig';

const GATES = [
  { id: 'H',    label: 'H',    name: 'Hadamard',    color: 'var(--blue)', desc: 'Puts qubit into superposition' },
  { id: 'X',    label: 'X',    name: 'Pauli-X (NOT)', color: 'var(--red)', desc: 'Flips |0⟩↔|1⟩ (like classical NOT)' },
  { id: 'Z',    label: 'Z',    name: 'Pauli-Z',     color: 'var(--yellow)', desc: 'Flips the phase of |1⟩' },
  { id: 'CNOT', label: 'CX',   name: 'CNOT',        color: 'var(--green)', desc: 'Flips target if control is |1⟩' },
  { id: 'M',    label: '⊛',   name: 'Measure',     color: 'var(--purple)', desc: 'Collapses qubit to 0 or 1' },
];

// ─── Sub-component: GateBox ───────────────────────────────────────────────────
function GateBox({ gate, size = 36 }) {
  return (
    <rect
      width={size} height={size}
      rx="5"
      fill={`${gate.color}22`}
      stroke={gate.color}
      strokeWidth="1.5"
    />
  );
}

// ─── Sub-component: CircuitSVG ────────────────────────────────────────────────
// Renders the circuit as an SVG diagram with wires and gates.
function CircuitSVG({ gates }) {
  const W = Math.max(320, 60 + gates.length * 56 + 20);
  const H = 120;
  const wireY = 60;

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflowX: 'auto' }}>
      {/* Wire */}
      <line x1="20" y1={wireY} x2={W - 20} y2={wireY} stroke="rgba(99,179,237,0.5)" strokeWidth="1.5" />

      {/* |0⟩ label */}
      <text x="6" y={wireY + 5} fill="var(--green)" fontSize="12" fontFamily="Space Mono, monospace">|0⟩</text>

      {/* Gates placed on wire */}
      {gates.map((g, i) => {
        const gx = 60 + i * 56;
        const gy = wireY - 18;
        return (
          <g key={i}>
            <rect x={gx} y={gy} width={36} height={36} rx="5"
              fill={`${g.color}22`} stroke={g.color} strokeWidth="1.5" />
            <text x={gx + 18} y={gy + 24} textAnchor="middle" fill={g.color}
              fontSize={g.label.length > 2 ? '10' : '14'} fontFamily="Space Mono, monospace" fontWeight="700">
              {g.label}
            </text>
          </g>
        );
      })}

      {/* Output label */}
      {gates.length > 0 && (
        <text x={W - 18} y={wireY + 5} fill="var(--purple)" fontSize="12"
          fontFamily="Space Mono, monospace" textAnchor="end">|ψ⟩</text>
      )}
    </svg>
  );
}

// ─── Main CircuitPage ─────────────────────────────────────────────────────────
function CircuitPage({ setPage, username }) {
  const [circuit, setCircuit] = useState([]);   // array of gate objects — state
  const [selected, setSelected] = useState(GATES[0]);
  const [output, setOutput] = useState(null);

  // Add gate to circuit — demonstrates array state update
  const addGate = (gate) => {
    if (circuit.length >= 8) return;
    setCircuit(prev => [...prev, gate]);
    setOutput(null);
  };

  // Remove last gate
  const removeGate = () => {
    setCircuit(prev => prev.slice(0, -1));
    setOutput(null);
  };

  // Simulate circuit — simple state machine
  const simulate = () => {
    let state = '|0⟩';
    let inSuper = false;
    for (const g of circuit) {
      if (g.id === 'H')    { inSuper = !inSuper; state = inSuper ? '(|0⟩ + |1⟩)/√2' : '|0⟩'; }
      if (g.id === 'X')    { state = state === '|0⟩' ? '|1⟩' : state === '|1⟩' ? '|0⟩' : state; inSuper = false; }
      if (g.id === 'Z')    { state = inSuper ? '(|0⟩ − |1⟩)/√2' : state; }
      if (g.id === 'CNOT') { state = `CNOT applied on ${state}`; }
      if (g.id === 'M')    { state = Math.random() < 0.5 ? '|0⟩ (measured)' : '|1⟩ (measured)'; inSuper = false; }
    }
    setOutput(state);
  };

  const PREBUILT = [
    { name: 'Superposition', gates: ['H'],        desc: 'H gate on |0⟩ creates equal superposition' },
    { name: 'NOT Gate',      gates: ['X'],         desc: 'X gate flips |0⟩ to |1⟩' },
    { name: 'Bell State',    gates: ['H', 'CNOT'], desc: 'H + CNOT creates entanglement' },
    { name: 'Phase Flip',    gates: ['H', 'Z', 'H'], desc: 'H-Z-H = Pauli X (phase kickback)' },
  ];

  const loadPrebuilt = (names) => {
    setCircuit(names.map(n => GATES.find(g => g.id === n)));
    setOutput(null);
  };

  const markComplete = async () => {
    try {
      await fetch(`${API}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, topic: 'circuit' }),
      });
    } catch {}
    setPage('quiz');
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Quantum Circuits</h1>
          <p className="page-subtitle">Build and simulate simple quantum gate circuits</p>
        </div>
        <span className="badge badge-green">Lesson 3 of 3</span>
      </div>

      <div className="grid2" style={{ marginBottom: '18px' }}>
        {/* Gate palette */}
        <div className="card">
          <div className="section-label">Available Gates</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {GATES.map(g => (
              <button key={g.id} className="btn btn-ghost"
                onClick={() => { setSelected(g); addGate(g); }}
                style={{
                  textAlign: 'left', display: 'flex', gap: '12px', alignItems: 'center',
                  borderColor: selected?.id === g.id ? g.color : undefined,
                }}>
                <span style={{
                  width: '32px', height: '32px', borderRadius: '6px',
                  background: `${g.color}22`, border: `1.5px solid ${g.color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Space Mono, monospace', fontWeight: 700, color: g.color, fontSize: '0.85rem',
                }}>
                  {g.label}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{g.name}</div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>{g.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="section-label">Prebuilt Circuits</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
            {PREBUILT.map(p => (
              <button key={p.name} className="btn btn-ghost"
                style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                onClick={() => loadPrebuilt(p.gates)}
                title={p.desc}>
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Circuit canvas */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div className="section-label">Your Circuit ({circuit.length}/8 gates)</div>
            <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={removeGate}>↩ Undo</button>
          </div>

          <div style={{ background: 'var(--bg2)', borderRadius: '8px', padding: '14px', marginBottom: '14px', minHeight: '100px' }}>
            {circuit.length === 0 ? (
              <div style={{ color: 'var(--muted)', textAlign: 'center', paddingTop: '24px', fontSize: '0.88rem' }}>
                Click gates on the left to add them →
              </div>
            ) : (
              <CircuitSVG gates={circuit} />
            )}
          </div>

          {/* Gate chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
            {circuit.map((g, i) => (
              <span key={i} className="badge"
                style={{ background: `${g.color}22`, color: g.color, border: `1px solid ${g.color}`, fontFamily: 'Space Mono, monospace' }}>
                {g.label}
              </span>
            ))}
          </div>

          <button className="btn btn-purple" onClick={simulate} disabled={circuit.length === 0} style={{ width: '100%', marginBottom: '10px' }}>
            ▶ Run Simulation
          </button>
          <button className="btn btn-ghost" onClick={() => { setCircuit([]); setOutput(null); }} style={{ width: '100%' }}>
            🗑 Clear Circuit
          </button>

          {output && (
            <div style={{ marginTop: '12px', padding: '14px', background: 'rgba(183,148,244,0.1)', borderRadius: '8px', border: '1px solid rgba(183,148,244,0.3)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '4px' }}>OUTPUT STATE</div>
              <div style={{ fontFamily: 'Space Mono, monospace', color: 'var(--purple)', fontSize: '1rem' }}>{output}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button className="btn btn-ghost" onClick={() => setPage('bloch')}>← Back</button>
        <button className="btn btn-green" onClick={markComplete}>Finish Lessons → Take Quiz</button>
      </div>
    </div>
  );
}

export default CircuitPage;
