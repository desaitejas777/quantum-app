// BlochPage.jsx — Bloch Sphere visualisation using 2D SVG shapes.
// Demonstrates: useState, SVG geometry, animated state vector, prop navigation.

import React, { useState } from 'react';
import API from '../apiConfig';

// ─── Sub-component: BlochSVG ─────────────────────────────────────────────────
// Draws a 2D cross-section of the Bloch sphere with a state vector.
// Props: theta (0–180°), phi (0–360°)
function BlochSVG({ theta, phi }) {
  const cx = 130, cy = 130, r = 100;
  // Convert spherical → 2D projected coords
  const rad = theta * Math.PI / 180;
  const phiRad = phi * Math.PI / 180;
  const vx = cx + r * Math.sin(rad) * Math.cos(phiRad);
  const vy = cy - r * Math.cos(rad);

  return (
    <svg width="260" height="260" viewBox="0 0 260 260" style={{ display: 'block', margin: '0 auto' }}>
      {/* Outer circle */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(99,179,237,0.25)" strokeWidth="1.5" />
      {/* Equator ellipse */}
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.28} fill="none" stroke="rgba(99,179,237,0.2)" strokeWidth="1" strokeDasharray="5,4" />
      {/* Meridian */}
      <ellipse cx={cx} cy={cy} rx={r * 0.28} ry={r} fill="none" stroke="rgba(99,179,237,0.15)" strokeWidth="1" strokeDasharray="5,4" />

      {/* Axes */}
      {[
        { x1: cx, y1: cy - r - 14, x2: cx, y2: cy + r + 8,  label: '|0⟩', lx: cx + 6, ly: cy - r - 16, label2: '|1⟩', l2x: cx + 6, l2y: cy + r + 20 },
      ].map((ax, i) => (
        <g key={i}>
          <line x1={ax.x1} y1={ax.y1} x2={ax.x2} y2={ax.y2} stroke="rgba(99,179,237,0.4)" strokeWidth="1" />
          <text x={ax.lx} y={ax.ly} fill="var(--blue)" fontSize="12" fontFamily="Space Mono, monospace">{ax.label}</text>
          <text x={ax.l2x} y={ax.l2y} fill="var(--blue)" fontSize="12" fontFamily="Space Mono, monospace">{ax.label2}</text>
        </g>
      ))}

      {/* Horizontal axis */}
      <line x1={cx - r - 8} y1={cy} x2={cx + r + 8} y2={cy} stroke="rgba(99,179,237,0.3)" strokeWidth="1" />
      <text x={cx + r + 10} y={cy + 4} fill="var(--muted)" fontSize="10" fontFamily="Space Mono, monospace">+x</text>

      {/* State vector */}
      <line x1={cx} y1={cy} x2={vx} y2={vy} stroke="var(--purple)" strokeWidth="2.5" />
      <circle cx={vx} cy={vy} r="5" fill="var(--purple)" />
      {/* Arrow head */}
      <polygon
        points={`${vx},${vy - 8} ${vx - 5},${vy + 4} ${vx + 5},${vy + 4}`}
        fill="var(--purple)"
        transform={`rotate(${Math.atan2(vy - cy, vx - cx) * 180 / Math.PI + 90}, ${vx}, ${vy})`}
      />

      {/* Centre dot */}
      <circle cx={cx} cy={cy} r="3" fill="var(--muted)" />

      {/* Angle arc */}
      <path
        d={`M ${cx} ${cy - 30} A 30 30 0 0 1 ${cx + 30 * Math.sin(rad)} ${cy - 30 * Math.cos(rad)}`}
        fill="none" stroke="var(--yellow)" strokeWidth="1.5" strokeDasharray="3,3"
      />
      <text x={cx + 8} y={cy - 14} fill="var(--yellow)" fontSize="11">θ</text>
    </svg>
  );
}

// ─── Main BlochPage ───────────────────────────────────────────────────────────
function BlochPage({ setPage, username }) {
  const [theta, setTheta] = useState(45);  // polar angle 0–180
  const [phi,   setPhi]   = useState(0);   // azimuthal angle 0–360

  const PRESETS = [
    { label: '|0⟩ (North Pole)',    theta: 0,   phi: 0,   color: 'var(--green)'  },
    { label: '|1⟩ (South Pole)',    theta: 180, phi: 0,   color: 'var(--blue)'   },
    { label: '|+⟩ Superposition',   theta: 90,  phi: 0,   color: 'var(--purple)' },
    { label: '|−⟩ Superposition',   theta: 90,  phi: 180, color: 'var(--yellow)' },
  ];

  const markComplete = async () => {
    try {
      await fetch(`${API}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, topic: 'bloch' }),
      });
    } catch {}
    setPage('circuit');
  };

  // Derive human-readable state
  const stateLabel = () => {
    if (theta < 5)   return '|0⟩ — spin up';
    if (theta > 175) return '|1⟩ — spin down';
    if (Math.abs(theta - 90) < 5) return '|+⟩ or |−⟩ — equal superposition';
    return `cos(${(theta/2).toFixed(0)}°)|0⟩ + sin(${(theta/2).toFixed(0)}°)|1⟩`;
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Bloch Sphere</h1>
          <p className="page-subtitle">Every qubit state as a point on a sphere</p>
        </div>
        <span className="badge badge-purple">Lesson 2 of 3</span>
      </div>

      <div className="grid2" style={{ marginBottom: '20px' }}>
        {/* Explanation */}
        <div className="card">
          <div className="section-label">What is the Bloch Sphere?</div>
          <p style={{ lineHeight: 1.7, fontSize: '0.92rem', marginBottom: '16px' }}>
            The Bloch Sphere is a 3D model where every possible state of a single qubit is represented as a point on the surface of a unit sphere.
          </p>
          <ul style={{ paddingLeft: '18px', color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 2 }}>
            <li>The <strong style={{ color: 'var(--green)' }}>north pole</strong> = state |0⟩</li>
            <li>The <strong style={{ color: 'var(--blue)' }}>south pole</strong> = state |1⟩</li>
            <li>Any point on the <strong style={{ color: 'var(--purple)' }}>equator</strong> = superposition of 0 and 1</li>
            <li>The <strong style={{ color: 'var(--yellow)' }}>angle θ</strong> determines probability of measuring 0 or 1</li>
          </ul>

          <div style={{ marginTop: '18px' }}>
            <div className="section-label">Preset States</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {PRESETS.map(p => (
                <button key={p.label} className="btn btn-ghost"
                  style={{ textAlign: 'left', justifyContent: 'flex-start', borderColor: 'transparent' }}
                  onClick={() => { setTheta(p.theta); setPhi(p.phi); }}>
                  <span style={{ color: p.color, marginRight: '8px' }}>●</span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bloch Sphere SVG */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="section-label">Interactive 2D Diagram</div>
          <BlochSVG theta={theta} phi={phi} />

          <div style={{ margin: '14px 0 8px', padding: '10px', background: 'rgba(183,148,244,0.08)', borderRadius: '8px', border: '1px solid rgba(183,148,244,0.2)' }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.85rem', color: 'var(--purple)' }}>{stateLabel()}</div>
          </div>

          {/* Sliders */}
          <div style={{ textAlign: 'left', marginTop: '12px' }}>
            <label className="section-label">θ (Theta / polar angle): {theta}°</label>
            <input type="range" min="0" max="180" value={theta}
              onChange={e => setTheta(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--purple)', marginBottom: '10px' }} />

            <label className="section-label">φ (Phi / azimuthal angle): {phi}°</label>
            <input type="range" min="0" max="360" value={phi}
              onChange={e => setPhi(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--yellow)' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button className="btn btn-ghost" onClick={() => setPage('qubit')}>← Back</button>
        <button className="btn btn-green" onClick={markComplete}>Mark Complete & Continue →</button>
      </div>
    </div>
  );
}

export default BlochPage;
