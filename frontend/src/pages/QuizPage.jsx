// QuizPage.jsx — Quiz with score saved to MongoDB via backend API.
// Demonstrates: multi-step state, answer tracking, POST to database, props.

import React, { useState } from 'react';
import API from '../apiConfig';

const QUESTIONS = [
  {
    topic: 'qubit',
    question: 'What is a qubit?',
    options: ['A classical bit that is always 0', 'A quantum bit that can be 0, 1, or both simultaneously', 'A type of transistor', 'A memory unit in RAM'],
    answer: 1,
    explanation: 'A qubit can exist in superposition — 0 and 1 at the same time — unlike classical bits.',
  },
  {
    topic: 'qubit',
    question: 'What happens when you measure a qubit in superposition?',
    options: ['It stays in superposition', 'It becomes 0 and 1 at the same time', 'It collapses to either 0 or 1', 'It disappears'],
    answer: 2,
    explanation: 'Measurement collapses the superposition, giving a definite 0 or 1 result.',
  },
  {
    topic: 'bloch',
    question: 'Where is the state |0⟩ located on the Bloch Sphere?',
    options: ['Equator', 'South Pole', 'North Pole', 'Inside the sphere'],
    answer: 2,
    explanation: 'By convention, |0⟩ is placed at the north pole of the Bloch Sphere.',
  },
  {
    topic: 'bloch',
    question: 'What does a point on the equator of the Bloch Sphere represent?',
    options: ['State |0⟩', 'State |1⟩', 'An equal superposition of |0⟩ and |1⟩', 'A measured qubit'],
    answer: 2,
    explanation: 'The equator represents equal superpositions, like |+⟩ = (|0⟩ + |1⟩)/√2.',
  },
  {
    topic: 'circuit',
    question: 'What does the Hadamard (H) gate do?',
    options: ['Flips |0⟩ to |1⟩', 'Measures the qubit', 'Puts the qubit into superposition', 'Entangles two qubits'],
    answer: 2,
    explanation: 'The H gate transforms |0⟩ into an equal superposition (|0⟩ + |1⟩)/√2.',
  },
  {
    topic: 'circuit',
    question: 'Which gate combination creates a Bell state (entanglement)?',
    options: ['X then Z', 'H then CNOT', 'Z then H', 'H then H'],
    answer: 1,
    explanation: 'An H gate followed by a CNOT gate creates a maximally entangled Bell state.',
  },
];

// ─── Sub-component: OptionButton ─────────────────────────────────────────────
function OptionButton({ label, selected, correct, revealed, onClick }) {
  let bg = 'transparent', border = 'var(--border)', color = 'var(--text)';
  if (revealed) {
    if (correct)         { bg = 'rgba(104,211,145,0.12)'; border = 'var(--green)'; color = 'var(--green)'; }
    else if (selected)   { bg = 'rgba(252,129,129,0.12)'; border = 'var(--red)';   color = 'var(--red)'; }
  } else if (selected) { bg = 'rgba(99,179,237,0.1)'; border = 'var(--blue)'; color = 'var(--blue)'; }

  return (
    <button onClick={onClick} disabled={revealed}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        background: bg, border: `1px solid ${border}`, borderRadius: '8px',
        padding: '11px 14px', cursor: revealed ? 'default' : 'pointer',
        color, fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', transition: 'all 0.15s',
        marginBottom: '8px',
      }}>
      {revealed && correct ? '✓ ' : revealed && selected ? '✗ ' : ''}{label}
    </button>
  );
}

// ─── Main QuizPage ────────────────────────────────────────────────────────────
function QuizPage({ setPage, username }) {
  const [idx, setIdx]           = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers]   = useState([]);
  const [done, setDone]         = useState(false);
  const [saved, setSaved]       = useState(false);

  const q = QUESTIONS[idx];
  const score = answers.filter(a => a.correct).length;

  const handleSelect = (i) => {
    if (revealed) return;
    setSelected(i);
  };

  const handleConfirm = () => {
    if (selected === null) return;
    setRevealed(true);
  };

  const handleNext = () => {
    const newAnswers = [...answers, { question: q.question, selected: q.options[selected], correct: selected === q.answer }];
    setAnswers(newAnswers);
    if (idx + 1 >= QUESTIONS.length) {
      setDone(true);
      saveQuiz(newAnswers);
    } else {
      setIdx(idx + 1);
      setSelected(null);
      setRevealed(false);
    }
  };

  // POST quiz result to MongoDB via backend
  const saveQuiz = async (finalAnswers) => {
    try {
      await fetch(`${API}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          topic: 'all',
          score: finalAnswers.filter(a => a.correct).length,
          total: QUESTIONS.length,
          answers: finalAnswers,
        }),
      });
      setSaved(true);
    } catch {
      setSaved(false);
    }
  };

  if (done) {
    const pct = Math.round((score / QUESTIONS.length) * 100);
    return (
      <div className="fade-in" style={{ maxWidth: '520px', margin: '0 auto', textAlign: 'center', paddingTop: '20px' }}>
        <div style={{ fontSize: '4rem', marginBottom: '12px' }}>
          {pct >= 80 ? '🏆' : pct >= 50 ? '🎯' : '📚'}
        </div>
        <h1 className="page-title" style={{ textAlign: 'center' }}>Quiz Complete!</h1>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '3rem', color: pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)', margin: '16px 0' }}>
          {score}/{QUESTIONS.length}
        </div>
        <div style={{ color: 'var(--muted)', marginBottom: '20px' }}>{pct}% correct</div>

        {saved && <div className="badge badge-green" style={{ marginBottom: '16px', display: 'inline-block' }}>✓ Score saved to database</div>}

        {/* Answer review */}
        <div className="card" style={{ textAlign: 'left', marginBottom: '20px' }}>
          <div className="section-label">Your Answers</div>
          {answers.map((a, i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: i < answers.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '2px' }}>{QUESTIONS[i].question}</div>
              <div style={{ fontSize: '0.88rem', color: a.correct ? 'var(--green)' : 'var(--red)' }}>
                {a.correct ? '✓' : '✗'} {a.selected}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button className="btn btn-blue" onClick={() => { setIdx(0); setSelected(null); setRevealed(false); setAnswers([]); setDone(false); setSaved(false); }}>
            Retry Quiz
          </button>
          <button className="btn btn-ghost" onClick={() => setPage('progress')}>View Progress →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ maxWidth: '620px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <h1 className="page-title">Quiz</h1>
        <span style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>Q {idx + 1} / {QUESTIONS.length}</span>
      </div>
      <div className="prog-bar" style={{ marginBottom: '22px' }}>
        <div className="prog-fill" style={{ width: `${((idx) / QUESTIONS.length) * 100}%`, background: 'var(--blue)' }} />
      </div>

      <div className="card">
        <span className="badge badge-blue" style={{ marginBottom: '14px', display: 'inline-block' }}>{q.topic}</span>
        <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: '1.05rem', lineHeight: 1.5, marginBottom: '20px' }}>{q.question}</h2>

        {q.options.map((opt, i) => (
          <OptionButton
            key={i} label={opt}
            selected={selected === i}
            correct={i === q.answer}
            revealed={revealed}
            onClick={() => handleSelect(i)}
          />
        ))}

        {revealed && (
          <div style={{ padding: '12px', background: 'rgba(99,179,237,0.08)', borderRadius: '8px', margin: '10px 0', fontSize: '0.88rem', color: 'var(--text)' }}>
            💡 {q.explanation}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', gap: '10px' }}>
          {!revealed ? (
            <button className="btn btn-blue" onClick={handleConfirm} disabled={selected === null}>Check Answer</button>
          ) : (
            <button className="btn btn-blue" onClick={handleNext}>
              {idx + 1 >= QUESTIONS.length ? 'Finish →' : 'Next →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuizPage;
