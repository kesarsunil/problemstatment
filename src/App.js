import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RegistrationForm from './components/RegistrationForm.jsx';
import ProblemStatements from './components/ProblemStatements.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import './App.css';

function App() {
  return (
    <Router>
      <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
        <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
          <div className="container">
            <span className="navbar-brand h1 mb-0">Problem Statement Registration</span>
            <div className="navbar-nav ms-auto">
              <a href="/" className="nav-link text-white">Home</a>
              <a href="/admin" className="nav-link text-white">Admin</a>
            </div>
          </div>
        </nav>
        
        <div className="container mt-4">
          <Routes>
            <Route path="/" element={<RegistrationForm />} />
            <Route path="/problems/:teamData" element={<ProblemStatements />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
