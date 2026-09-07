// ProgressPage.jsx — Fetches user progress and quiz scores from MongoDB.
// Demonstrates: useEffect + fetch from backend, state management, conditional rendering.

import React, { useState, useEffect } from 'react';
import API from '../apiConfig';

const TOPICS = [
  { id: 'qubit',   label: 'Qubits & Superposition', icon: '◉', color: 'var(--blue)'   },
  { id: 'bloch',   label: 'Bloch Sphere',            icon: '◎', color: 'var(--purple)' },
  { id: 'circuit', label: 'Quantum Circuits',        icon: '⊞', color: 'var(--green)'  },
];

function ProgressPage({ setPage, username, isAdmin }) {
  const [progress, setProgress]       = useState([]);
  const [quizResults, setQuizResults] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [adminMessage, setAdminMessage] = useState('');

  // Fetch from backend on mount — database interaction
  useEffect(() => {
    if (!username) { setLoading(false); return; }
    const load = async () => {
      try {
        const [pRes, qRes, lRes] = await Promise.all([
          fetch(`${API}/progress/${username}`),
          fetch(`${API}/quiz/${username}`),
          fetch(`${API}/leaderboard`),
        ]);
        setProgress(await pRes.json());
        setQuizResults(await qRes.json());
        setLeaderboard(await lRes.json());
      } catch {
        // fallback demo data if backend offline
        setProgress([{ topic: 'qubit', completed: true }]);
        setQuizResults([{ score: 4, total: 6, attemptedAt: new Date() }]);
        setLeaderboard([{ _id: username || 'You', bestScore: 4, attempts: 1 }]);
      }
      setLoading(false);
    };
    load();
  }, [username]);

  const isComplete = (topicId) => progress.some(p => p.topic === topicId && p.completed);
  const completedCount = TOPICS.filter(t => isComplete(t.id)).length;
  const bestQuiz = quizResults.length ? Math.max(...quizResults.map(r => r.score)) : null;

  const refreshLeaderboard = async () => {
    try {
      const response = await fetch(`${API}/leaderboard`);
      const data = await response.json();
      setLeaderboard(data);
    } catch {
      setAdminMessage('Unable to refresh leaderboard.');
    }
  };

  const handleDeleteUser = async (deleteUsername) => {
    if (!window.confirm(`Delete all leaderboard records for ${deleteUsername}? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`${API}/leaderboard/${encodeURIComponent(deleteUsername)}`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok && json.success) {
        setAdminMessage(`${deleteUsername} removed from leaderboard.`);
        refreshLeaderboard();
      } else {
        setAdminMessage(json.error || 'Delete failed.');
      }
    } catch (err) {
      setAdminMessage(`Error: ${err.message}`);
    }
  };

  if (!username) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔒</div>
        <div style={{ color: 'var(--muted)' }}>Please log in from the Home page to see your progress.</div>
        <button className="btn btn-blue" style={{ marginTop: '16px' }} onClick={() => setPage('home')}>Go to Home</button>
      </div>
    );
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '80px', color: 'var(--muted)' }}>Loading progress...</div>;
  }

  return (
    <div className="fade-in">
      <h1 className="page-title">My Progress</h1>
      <p className="page-subtitle">Tracking {username}'s learning journey</p>

      {/* Summary stats */}
      <div className="grid3" style={{ marginBottom: '20px' }}>
        {[
          { label: 'Topics Completed', value: `${completedCount}/${TOPICS.length}`, color: 'var(--green)', icon: '✓' },
          { label: 'Best Quiz Score',  value: bestQuiz !== null ? `${bestQuiz}/6` : '—', color: 'var(--blue)', icon: '🏆' },
          { label: 'Quiz Attempts',    value: quizResults.length, color: 'var(--purple)', icon: '✎' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', marginBottom: '6px' }}>{s.icon}</div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '1.6rem', color: s.color, fontWeight: 700 }}>{s.value}</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.8rem', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid2" style={{ marginBottom: '20px' }}>
        {/* Topic progress */}
        <div className="card">
          <div className="section-label">Topic Progress (from DB)</div>
          {TOPICS.map(t => {
            const done = isComplete(t.id);
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '1.4rem' }}>{t.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{t.label}</div>
                  <div className="prog-bar" style={{ marginTop: '6px' }}>
                    <div className="prog-fill" style={{ width: done ? '100%' : '0%', background: t.color }} />
                  </div>
                </div>
                {done
                  ? <span className="badge badge-green">✓ Done</span>
                  : <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '5px 10px' }} onClick={() => setPage(t.id)}>Start</button>
                }
              </div>
            );
          })}
        </div>

        {/* Quiz history */}
        <div className="card">
          <div className="section-label">Quiz History (from DB)</div>
          {quizResults.length === 0 ? (
            <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '30px' }}>
              No quiz attempts yet.
              <br />
              <button className="btn btn-purple" style={{ marginTop: '12px' }} onClick={() => setPage('quiz')}>Take the Quiz</button>
            </div>
          ) : quizResults.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Attempt #{quizResults.length - i}</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
                  {new Date(r.attemptedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontFamily: 'Space Mono, monospace', fontSize: '1.1rem',
                  color: r.score / r.total >= 0.8 ? 'var(--green)' : r.score / r.total >= 0.5 ? 'var(--yellow)' : 'var(--red)',
                }}>
                  {r.score}/{r.total}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  {Math.round((r.score / r.total) * 100)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="card">
        <div className="section-label">Leaderboard (from DB)</div>
        {isAdmin && (
          <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div style={{ color: 'var(--blue)', fontSize: '0.9rem' }}>Admin access granted. Delete leaderboard users below.</div>
            <button className="btn btn-ghost" style={{ padding: '8px 12px' }} onClick={refreshLeaderboard}>Refresh</button>
          </div>
        )}
        {adminMessage && (
          <div style={{ color: 'var(--purple)', marginBottom: '12px', fontSize: '0.9rem' }}>{adminMessage}</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {leaderboard.map((entry, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '10px 12px', borderRadius: '8px',
              background: entry._id === username ? 'rgba(99,179,237,0.08)' : 'var(--bg2)',
              border: entry._id === username ? '1px solid rgba(99,179,237,0.3)' : '1px solid transparent',
            }}>
              <span style={{ fontFamily: 'Space Mono, monospace', color: i === 0 ? 'var(--yellow)' : 'var(--muted)', width: '24px' }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </span>
              <span style={{ flex: 1, fontWeight: 600, color: entry._id === username ? 'var(--blue)' : 'var(--text)' }}>
                {entry._id} {entry._id === username && <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>(you)</span>}
              </span>
              <span style={{ fontFamily: 'Space Mono, monospace', color: 'var(--green)' }}>{entry.bestScore}/6</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{entry.attempts} attempt{entry.attempts !== 1 ? 's' : ''}</span>
              {isAdmin && (
                <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '0.78rem' }} onClick={() => handleDeleteUser(entry._id)}>
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProgressPage;
