import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RegistrationForm from './components/RegistrationForm.jsx';
import ProblemStatements from './components/ProblemStatements.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import './App.css';

function App() {
  return (
    <Router>
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1B1B 50%, #1a1a1a 100%)',
        fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, "Roboto", "Helvetica Neue", Arial, sans-serif'
      }}>
        {/* TECHFRONTIER Navigation */}
        <nav style={{
          background: 'linear-gradient(90deg, #8B0000 0%, #CD5C5C 50%, #8B0000 100%)',
          padding: '1rem 0',
          boxShadow: '0 4px 20px rgba(139, 0, 0, 0.3)'
        }}>
          <div className="container">
            <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <span style={{
                  fontSize: '1.8rem',
                  fontWeight: 'bold',
                  color: '#FFFFFF',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                  letterSpacing: '1px'
                }}>
                  TECHFRONTIER <span style={{color: '#FFD700'}}>2K25</span>
                </span>
                <span style={{
                  marginLeft: '1rem',
                  color: '#E0E0E0',
                  fontSize: '0.9rem'
                }}>
                  The Ultimate Cyber Hackathon
                </span>
              </div>
              <div className="d-flex gap-3">
                <a 
                  href="/" 
                  style={{
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '25px',
                    border: '2px solid transparent',
                    transition: 'all 0.3s ease',
                    fontWeight: '500'
                  }}
                  className="nav-link-tech"
                >
                  🏠 Home
                </a>
                <a 
                  href="/admin" 
                  style={{
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '25px',
                    border: '2px solid #FFD700',
                    transition: 'all 0.3s ease',
                    fontWeight: '500'
                  }}
                  className="nav-link-tech"
                >
                  ⚙️ Admin
                </a>
              </div>
            </div>
          </div>
        </nav>
        
        {/* Main Content */}
        <div style={{ minHeight: 'calc(100vh - 80px)' }}>
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
