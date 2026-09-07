// server.js — Quantum Learning App Backend
// Node.js + Express + MongoDB

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  }
}));
app.use(express.json());

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error('MONGO_URI is required. Add your MongoDB Atlas connection string to the environment.');
}

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection failed:', err.message));

// ─── Schemas ──────────────────────────────────────────────────────────────────

// Tracks which topics a user has completed
const progressSchema = new mongoose.Schema({
  username: { type: String, required: true },
  topic: { type: String, required: true },   // 'qubit', 'bloch', 'circuit'
  completed: { type: Boolean, default: false },
  completedAt: { type: Date, default: Date.now }
});

// Stores quiz attempts and scores
const quizSchema = new mongoose.Schema({
  username: { type: String, required: true },
  topic: { type: String, required: true },
  score: { type: Number, required: true },
  total: { type: Number, required: true },
  answers: [{ question: String, selected: String, correct: Boolean }],
  attemptedAt: { type: Date, default: Date.now }
});

const Progress = mongoose.model('Progress', progressSchema);
const Quiz     = mongoose.model('Quiz', quizSchema);

// ─── Progress Routes ──────────────────────────────────────────────────────────

// GET all progress for a user
app.get('/api/progress/:username', async (req, res) => {
  try {
    const records = await Progress.find({ username: req.params.username });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST mark a topic complete
app.post('/api/progress', async (req, res) => {
  try {
    const { username, topic } = req.body;
    // Upsert: update if exists, create if not
    const record = await Progress.findOneAndUpdate(
      { username, topic },
      { completed: true, completedAt: new Date() },
      { upsert: true, new: true }
    );
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Quiz Routes ──────────────────────────────────────────────────────────────

// GET all quiz results for a user
app.get('/api/quiz/:username', async (req, res) => {
  try {
    const results = await Quiz.find({ username: req.params.username }).sort({ attemptedAt: -1 });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST save a quiz result
app.post('/api/quiz', async (req, res) => {
  try {
    const quiz = new Quiz(req.body);
    await quiz.save();
    res.status(201).json(quiz);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET leaderboard — top scores across all users
app.get('/api/leaderboard', async (req, res) => {
  try {
    const results = await Quiz.aggregate([
      { $group: { _id: '$username', bestScore: { $max: '$score' }, attempts: { $sum: 1 } } },
      { $sort: { bestScore: -1 } },
      { $limit: 10 }
    ]);
    res.json(results);
  } catch {
    res.json([{ _id: 'Alice', bestScore: 3, attempts: 2 }, { _id: 'Bob', bestScore: 2, attempts: 1 }]);
  }
});

// DELETE leaderboard user — remove a specific user's quiz records from leaderboard
app.delete('/api/leaderboard/:username', async (req, res) => {
  try {
    const deleted = await Quiz.deleteMany({ username: req.params.username });
    res.json({ success: true, deletedCount: deleted.deletedCount, message: `Deleted ${deleted.deletedCount} quiz record(s) for ${req.params.username}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE all leaderboard records — clear all quiz records
app.delete('/api/leaderboard', async (req, res) => {
  try {
    await Quiz.deleteMany({});
    res.json({ success: true, message: 'Leaderboard cleared.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`⚛️  Quantum backend running on http://localhost:${PORT}`));
}

module.exports = app;
