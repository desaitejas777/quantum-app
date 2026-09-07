// App.jsx — Root component. Handles navigation between all pages.
// Navigation criterion: currentPage state + renderPage() switch drives all routing.

import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import QubitPage from './pages/QubitPage';
import BlochPage from './pages/BlochPage';
import CircuitPage from './pages/CircuitPage';
import QuizPage from './pages/QuizPage';
import ProgressPage from './pages/ProgressPage';
import './App.css';

function App() {
  // ── Navigation state ──────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState('home');
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // ── Page renderer — functional component navigation ───────────────────────
  const renderPage = () => {
    // Props passed down to child components for state management
    const commonProps = { setPage: setCurrentPage, username };

    switch (currentPage) {
      case 'home':     return <Home     {...commonProps} isLoggedIn={isLoggedIn} setUsername={setUsername} setLoggedIn={setIsLoggedIn} setIsAdmin={setIsAdmin} />;
      case 'qubit':    return <QubitPage  {...commonProps} />;
      case 'bloch':    return <BlochPage  {...commonProps} />;
      case 'circuit':  return <CircuitPage {...commonProps} />;
      case 'quiz':     return <QuizPage   {...commonProps} />;
      case 'progress': return <ProgressPage {...commonProps} isAdmin={isAdmin} />;
      default:         return <Home     {...commonProps} isLoggedIn={isLoggedIn} setUsername={setUsername} setLoggedIn={setIsLoggedIn} setIsAdmin={setIsAdmin} />;
    }
  };

  return (
    <div className="app">
      <Navbar
        currentPage={currentPage}
        setPage={setCurrentPage}
        username={username}
        isLoggedIn={isLoggedIn}
      />
      <main className="content fade-in">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
