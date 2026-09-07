'/;/=# QuantumLearn — AI-Based Interactive Quantum Computing Education App
**Student:** Tejas Suresh Desai | SRN: PES1PG25CA353 | MCA Section F

---

## Project Overview
An interactive web application that teaches the basics of quantum computing through
animated SVG diagrams, hands-on simulations, and quizzes — with a full backend
that tracks user progress and scores in MongoDB.

---

## Grading Criteria Coverage

| Criterion | Marks | Where in Code |
|---|---|---|
| Designing User Interface (React Components) | 3 | All `.jsx` files in `src/pages/` and `src/components/` |
| Data Processing (JSX, state, props) | 2 | `QubitPage.jsx`, `CircuitPage.jsx`, `QuizPage.jsx` |
| Navigation between Functional Components | 2 | `App.jsx` (`renderPage()` switch + `setPage` prop) |
| Database Interaction (Node + Express + MongoDB) | 3 | `backend/server.js` |

---

## Tech Stack
- **Frontend:** React 18, HTML5 SVG animations, CSS3
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (via Mongoose)

---

## Project Structure
```
quantum-app/
├── frontend/
│   └── src/
│       ├── App.jsx             ← Navigation logic (currentPage state + renderPage)
│       ├── App.css             ← Global styles + CSS variables
│       ├── components/
│       │   └── Navbar.jsx      ← Top navbar (receives setPage prop)
│       └── pages/
│           ├── Home.jsx        ← Landing + login (state, props, conditional render)
│           ├── QubitPage.jsx   ← Lesson 1: Qubits + SVG wave animation
│           ├── BlochPage.jsx   ← Lesson 2: Bloch Sphere SVG diagram + sliders
│           ├── CircuitPage.jsx ← Lesson 3: Circuit builder + gate simulation
│           ├── QuizPage.jsx    ← 6-question quiz, POST score to MongoDB
│           └── ProgressPage.jsx← GET progress + scores + leaderboard from MongoDB
└── backend/
    └── server.js               ← Express + Mongoose: 4 API routes, 2 schemas
```

---

## Setup & Run Instructions

### 1. Start MongoDB
Make sure MongoDB is running locally:
```bash
mongod
```
Or use MongoDB Atlas and set `MONGO_URI` in an `.env` file.

### 2. Start the Backend
```bash
cd quantum-app/backend
npm install
node server.js
# Running on http://localhost:5000
```

### 3. Start the Frontend
```bash
cd quantum-app/frontend
npm install
npm start
# Running on http://localhost:3000
```

---

## API Endpoints (Backend)

| Method | Route | Description |
|---|---|---|
| GET | `/api/progress/:username` | Fetch topic completion for a user |
| POST | `/api/progress` | Mark a topic as completed |
| GET | `/api/quiz/:username` | Fetch all quiz attempts for a user |
| POST | `/api/quiz` | Save a quiz result |
| GET | `/api/leaderboard` | Top scores across all users |
| GET | `/api/health` | Server + DB status check |

---

## Key React Concepts Demonstrated

### Navigation (App.jsx)
```jsx
const [currentPage, setCurrentPage] = useState('home');
// setPage prop passed to all children — child calls setPage('qubit') to navigate
const renderPage = () => {
  switch (currentPage) {
    case 'qubit': return <QubitPage setPage={setCurrentPage} username={username} />;
    ...
  }
};
```

### State & Props (QubitPage.jsx)
```jsx
const [qubitState, setQubitState] = useState('0'); // local state
// Props: setPage, username received from App
// BitComparison receives: classical, qubitState as props
<BitComparison classical={0} qubitState={qubitState} />
```

### Database Interaction (server.js)
```js
mongoose.connect('mongodb://localhost:27017/quantum_app');
app.post('/api/quiz', async (req, res) => {
  const quiz = new Quiz(req.body);
  await quiz.save();           // saves to MongoDB
  res.status(201).json(quiz);
});
```
