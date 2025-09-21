import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

// Sample problem statements data
const PROBLEM_STATEMENTS = [
  {
    id: 'ps1',
    title: 'Smart Traffic Management System',
    description: 'Develop an AI-powered system to optimize traffic flow in urban areas using real-time data analysis and predictive modeling.'
  },
  {
    id: 'ps2',
    title: 'Sustainable Energy Monitor',
    description: 'Create a IoT-based solution to monitor and optimize energy consumption in residential and commercial buildings.'
  },
  {
    id: 'ps3',
    title: 'Healthcare Data Analytics',
    description: 'Build a platform to analyze patient data for early disease detection and personalized treatment recommendations.'
  },
  {
    id: 'ps4',
    title: 'Agricultural Automation',
    description: 'Design an automated farming system using drones and sensors for crop monitoring and precision agriculture.'
  },
  {
    id: 'ps5',
    title: 'Financial Fraud Detection',
    description: 'Develop a machine learning model to detect fraudulent transactions in real-time banking systems.'
  },
  {
    id: 'ps6',
    title: 'Educational Learning Assistant',
    description: 'Create an AI-powered learning assistant that adapts to individual student needs and learning patterns.'
  }
];

const ProblemStatements = () => {
  const { teamData } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [problemCounts, setProblemCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [teamRegistrationChecked, setTeamRegistrationChecked] = useState(false);
  const [isTeamAlreadyRegistered, setIsTeamAlreadyRegistered] = useState(false);

  useEffect(() => {
    try {
      const decodedTeamData = JSON.parse(atob(teamData));
      setTeam(decodedTeamData);
      // Fetch both problem counts and check team registration in parallel
      Promise.all([
        fetchProblemCounts(),
        checkTeamAlreadyRegistered(decodedTeamData.teamNumber)
      ]).then(([, isRegistered]) => {
        setIsTeamAlreadyRegistered(isRegistered);
        setTeamRegistrationChecked(true);
      });
    } catch (error) {
      console.error('Invalid team data');
      navigate('/');
    }
  }, [teamData, navigate]);

  const fetchProblemCounts = async () => {
    try {
      // Fetch all registrations in one query instead of 6 separate queries
      const allRegistrationsQuery = query(collection(db, 'registrations'));
      const querySnapshot = await getDocs(allRegistrationsQuery);
      
      const counts = {};
      // Initialize counts for all problems
      PROBLEM_STATEMENTS.forEach(problem => {
        counts[problem.id] = 0;
      });
      
      // Count registrations for each problem
      querySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.problemStatementId && counts.hasOwnProperty(data.problemStatementId)) {
          counts[data.problemStatementId]++;
        }
      });
      
      setProblemCounts(counts);
    } catch (error) {
      console.error('Error fetching problem counts:', error);
    }
  };

  const checkTeamAlreadyRegistered = async (teamNumber) => {
    try {
      const q = query(
        collection(db, 'registrations'),
        where('teamNumber', '==', teamNumber)
      );
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking team registration:', error);
      return false;
    }
  };

  const handleSelectProblem = async (problemStatement) => {
    if (problemCounts[problemStatement.id] >= 3) {
      return; // Already at limit
    }

    // Use cached team registration status instead of making another Firebase call
    if (isTeamAlreadyRegistered) {
      alert(`Team ${team.teamNumber} has already registered for a problem statement. Each team can only register once.`);
      return;
    }

    // Show confirmation popup immediately - no waiting for Firebase
    setSelectedProblem(problemStatement);
    setShowConfirmation(true);
  };

  const handleConfirmSelection = async () => {
    if (!selectedProblem) return;

    setLoading(true);
    
    try {
      // Optimistic UI update - update count immediately
      setProblemCounts(prev => ({
        ...prev,
        [selectedProblem.id]: (prev[selectedProblem.id] || 0) + 1
      }));

      // Show success message immediately
      setShowConfirmation(false);
      setSuccessMessage(`Registration Successful – Your team has been registered for "${selectedProblem.title}".`);
      
      // Add registration to Firestore in background
      await addDoc(collection(db, 'registrations'), {
        teamNumber: team.teamNumber,
        teamName: team.teamName,
        teamLeader: team.teamLeader,
        problemStatementId: selectedProblem.id,
        problemStatementTitle: selectedProblem.title,
        timestamp: new Date()
      });

      // Clear selected problem
      setSelectedProblem(null);
      
      // Redirect to home after 3 seconds
      setTimeout(() => {
        navigate('/');
      }, 3000);
      
    } catch (error) {
      console.error('Error registering team:', error);
      
      // Revert optimistic update on error
      setProblemCounts(prev => ({
        ...prev,
        [selectedProblem.id]: Math.max(0, (prev[selectedProblem.id] || 0) - 1)
      }));
      
      setSuccessMessage('');
      setShowConfirmation(true);
      alert('Error registering team. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSelection = () => {
    setShowConfirmation(false);
    setSelectedProblem(null);
  };

  if (!team || !teamRegistrationChecked) {
    return (
      <div className="text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading team data...</p>
      </div>
    );
  }

  if (successMessage) {
    return (
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="alert alert-success text-center">
            <h4 className="alert-heading">✅ Success!</h4>
            <p className="mb-2">{successMessage}</p>
            <small className="text-muted">Redirecting to home page...</small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Confirmation Modal */}
      {showConfirmation && selectedProblem && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Problem Statement Selection</h5>
              </div>
              <div className="modal-body">
                <div className="text-center">
                  <div className="mb-3">
                    <strong>Team Details:</strong>
                    <p className="mb-1">Team Number: <span className="text-primary">{team.teamNumber}</span></p>
                    <p className="mb-1">Team Name: <span className="text-primary">{team.teamName}</span></p>
                    <p className="mb-3">Team Leader: <span className="text-primary">{team.teamLeader}</span></p>
                  </div>
                  
                  <div className="mb-3">
                    <strong>Selected Problem Statement:</strong>
                    <div className="card bg-light mt-2">
                      <div className="card-body">
                        <h6 className="card-title text-primary">{selectedProblem.title}</h6>
                        <p className="card-text small text-muted">{selectedProblem.description}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="alert alert-warning">
                    <strong>⚠️ Important:</strong> Once confirmed, this registration cannot be changed. Each team can only register for one problem statement.
                  </div>
                  
                  <p className="text-center">
                    <strong>Are you sure you want to register for this problem statement?</strong>
                  </p>
                </div>
              </div>
              <div className="modal-footer justify-content-center">
                <button 
                  type="button" 
                  className="btn btn-secondary me-2" 
                  onClick={handleCancelSelection}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-success" 
                  onClick={handleConfirmSelection}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Confirming...
                    </>
                  ) : (
                    'Confirm Registration'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row justify-content-center mb-4">
        <div className="col-md-8">
          <div className="card">
            <div className="card-body text-center">
              <h2 className="card-title">Select Problem Statement</h2>
              <div className="text-muted">
                <p><strong>Team:</strong> {team.teamName} (#{team.teamNumber})</p>
                <p><strong>Team Leader:</strong> {team.teamLeader}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {PROBLEM_STATEMENTS.map((problem) => {
          const registeredCount = problemCounts[problem.id] || 0;
          const isDisabled = registeredCount >= 3;
          const isFilled = registeredCount >= 3;
          
          return (
            <div key={problem.id} className="col-md-6 col-lg-4">
              <div className={`card h-100 ${isDisabled || isTeamAlreadyRegistered ? 'opacity-75' : ''}`} 
                   style={{ 
                     cursor: (isDisabled || isTeamAlreadyRegistered) ? 'not-allowed' : 'pointer',
                     transition: 'transform 0.2s, box-shadow 0.2s',
                     border: (isFilled || isTeamAlreadyRegistered) ? '2px solid #dc3545' : '1px solid #dee2e6'
                   }}
                   onMouseEnter={(e) => {
                     if (!isDisabled && !isTeamAlreadyRegistered) {
                       e.currentTarget.style.transform = 'scale(1.02)';
                       e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)';
                     }
                   }}
                   onMouseLeave={(e) => {
                     e.currentTarget.style.transform = 'scale(1)';
                     e.currentTarget.style.boxShadow = '';
                   }}>
                <div className="card-body d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="card-title text-primary flex-grow-1">
                      {problem.title}
                    </h5>
                    {(isFilled || isTeamAlreadyRegistered) && (
                      <span className="badge bg-danger ms-2">
                        {isTeamAlreadyRegistered ? 'TEAM REGISTERED' : 'FILLED'}
                      </span>
                    )}
                  </div>
                  
                  <p className="card-text text-muted flex-grow-1">
                    {problem.description}
                  </p>
                  
                  <div className="d-flex justify-content-between align-items-center mt-auto">
                    <small className={`${registeredCount >= 3 ? 'text-danger fw-bold' : 'text-success'}`}>
                      {registeredCount}/3 teams {isFilled ? '(COMPLETE)' : 'registered'}
                    </small>
                    
                    <button
                      onClick={() => handleSelectProblem(problem)}
                      disabled={isDisabled || loading || isTeamAlreadyRegistered}
                      className={`btn ${isDisabled || isTeamAlreadyRegistered ? 'btn-danger' : 'btn-primary'}`}
                      style={{ minWidth: '80px' }}
                    >
                      {isDisabled ? 'FILLED' : 
                       isTeamAlreadyRegistered ? 'REGISTERED' :
                       loading ? (
                         <>
                           <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                           Processing...
                         </>
                       ) : 'Select'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="text-center mt-4">
        <button
          onClick={() => navigate('/')}
          className="btn btn-outline-primary"
        >
          ← Back to Registration
        </button>
      </div>
    </div>
  );
};

export default ProblemStatements;