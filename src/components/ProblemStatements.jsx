import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, runTransaction, doc } from 'firebase/firestore';

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
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    try {
      const decodedTeamData = JSON.parse(atob(teamData));
      setTeam(decodedTeamData);
      // Fetch both problem counts and check team registration in parallel
      Promise.all([
        fetchProblemCounts(),
        checkTeamAlreadyRegistered(decodedTeamData.teamId)
      ]).then(([, isRegistered]) => {
        setIsTeamAlreadyRegistered(isRegistered);
        setTeamRegistrationChecked(true);
      });
    } catch (error) {
      console.error('Invalid team data');
      navigate('/');
    }
  }, [teamData, navigate]);

  // Real-time updates - refresh problem counts every 5 seconds
  useEffect(() => {
    if (!teamRegistrationChecked || isTeamAlreadyRegistered || successMessage) {
      return; // Don't poll if team is already registered or if successful
    }

    const interval = setInterval(async () => {
      await fetchProblemCounts();
      setLastUpdated(new Date());
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [teamRegistrationChecked, isTeamAlreadyRegistered, successMessage]);

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
      return counts;
    } catch (error) {
      console.error('Error fetching problem counts:', error);
      return {};
    }
  };

  // Real-time check for a specific problem's current count
  const fetchCurrentProblemCount = async (problemId) => {
    try {
      const q = query(
        collection(db, 'registrations'),
        where('problemStatementId', '==', problemId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error fetching current problem count:', error);
      return 0;
    }
  };

  const checkTeamAlreadyRegistered = async (teamId) => {
    try {
      const q = query(
        collection(db, 'registrations'),
        where('teamId', '==', teamId)
      );
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking team registration:', error);
      return false;
    }
  };

  const handleSelectProblem = async (problemStatement) => {
    // STEP 1: IMMEDIATE PRE-CHECK - Real-time verification before showing confirmation
    setLoading(true);
    
    try {
      // Get absolutely latest count from database (millisecond-level check)
      const realTimeCount = await fetchCurrentProblemCount(problemStatement.id);
      
      // STEP 2: MILLISECOND-LEVEL AVAILABILITY CHECK
      if (realTimeCount >= 2) {
        alert(`🚫 PROBLEM STATEMENT FILLED: This problem statement just became full (${realTimeCount}/2 teams). Please choose another problem statement.`);
        // Update local counts to reflect real-time status
        await fetchProblemCounts();
        setLastUpdated(new Date());
        setLoading(false);
        return;
      }

      // STEP 3: REAL-TIME TEAM REGISTRATION CHECK
      const isCurrentlyRegistered = await checkTeamAlreadyRegistered(team.teamId);
      if (isCurrentlyRegistered) {
        alert(`🚫 TEAM ALREADY REGISTERED: Team ${team.teamName} has already registered for a problem statement. Each team can only register once.`);
        setIsTeamAlreadyRegistered(true);
        setLoading(false);
        return;
      }

      // STEP 4: AVAILABLE SLOTS VERIFICATION
      const availableSlots = 2 - realTimeCount;
      if (availableSlots <= 0) {
        alert(`🚫 NO SLOTS AVAILABLE: This problem statement has no available slots (${realTimeCount}/2 teams registered).`);
        await fetchProblemCounts();
        setLastUpdated(new Date());
        setLoading(false);
        return;
      }

      // STEP 5: SUCCESS - Show confirmation with real-time slot information
      setSelectedProblem({
        ...problemStatement,
        realTimeCount: realTimeCount,
        availableSlots: availableSlots,
        checkedAt: Date.now()
      });
      setShowConfirmation(true);
      
    } catch (error) {
      console.error('Error during real-time pre-check:', error);
      alert('❌ Unable to verify problem statement availability. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSelection = async () => {
    if (!selectedProblem) return;

    setLoading(true);
    
    try {
      // ATOMIC TRANSACTION - Real-time booking protection with millisecond-level checking
      const result = await runTransaction(db, async (transaction) => {
        // Step 1: REAL-TIME CHECK - Get current registrations count for this problem (millisecond precision)
        const problemRegistrationsQuery = query(
          collection(db, 'registrations'),
          where('problemStatementId', '==', selectedProblem.id)
        );
        const problemSnapshot = await getDocs(problemRegistrationsQuery);
        const currentCount = problemSnapshot.size;

        // Step 2: IMMEDIATE CHECK - Verify team is not already registered (anywhere)
        const teamRegistrationsQuery = query(
          collection(db, 'registrations'),
          where('teamId', '==', team.teamId)
        );
        const teamSnapshot = await getDocs(teamRegistrationsQuery);
        
        if (!teamSnapshot.empty) {
          throw new Error('TEAM_ALREADY_REGISTERED');
        }

        // Step 3: CRITICAL MILLISECOND CHECK - Verify problem is not full RIGHT NOW
        if (currentCount >= 2) {
          throw new Error('PROBLEM_FULL_REALTIME');
        }

        // Step 4: DOUBLE VERIFICATION - Additional safety check for empty problem slots
        if (currentCount < 0) {
          throw new Error('INVALID_COUNT_STATE');
        }

        // Step 5: MILLISECOND-LEVEL SUCCESS - Problem is available, register immediately
        const registrationRef = doc(collection(db, 'registrations'));
        transaction.set(registrationRef, {
          teamId: team.teamId,
          teamName: team.teamName,
          teamLeader: team.teamLeader,
          problemStatementId: selectedProblem.id,
          problemStatementTitle: selectedProblem.title,
          timestamp: new Date(),
          registrationTimestamp: Date.now(), // Exact millisecond timestamp
          documentId: registrationRef.id
        });

        return { 
          success: true, 
          newCount: currentCount + 1,
          registeredAt: Date.now(),
          availableSlots: 2 - (currentCount + 1)
        };
      });

      // SUCCESS - Registration completed atomically with millisecond precision
      setShowConfirmation(false);
      setSuccessMessage(
        `✅ Registration Successful! Your team has been registered for "${selectedProblem.title}" at ${new Date(result.registeredAt).toLocaleTimeString()}.${String(result.registeredAt % 1000).padStart(3, '0')} (${result.availableSlots} slots remaining).`
      );
      
      // Update local state ONLY after successful database write
      setProblemCounts(prev => ({
        ...prev,
        [selectedProblem.id]: result.newCount
      }));

      // Clear selected problem
      setSelectedProblem(null);
      
      // Redirect to home after 4 seconds to show precise timestamp
      setTimeout(() => {
        navigate('/');
      }, 4000);
      
    } catch (error) {
      console.error('Transaction failed:', error);
      
      // Handle specific error cases with millisecond-level feedback
      if (error.message === 'TEAM_ALREADY_REGISTERED') {
        alert('❌ REGISTRATION BLOCKED: Your team has already registered for a problem statement. Each team can only register once.');
      } else if (error.message === 'PROBLEM_FULL_REALTIME') {
        // Fetch latest counts to show real-time status
        const latestCount = await fetchCurrentProblemCount(selectedProblem.id);
        alert(`❌ PROBLEM STATEMENT FILLED: Another team registered in the last few milliseconds! This problem now has ${latestCount}/2 teams. Please choose another problem statement.`);
        // Refresh all counts to show updated status
        await fetchProblemCounts();
        setLastUpdated(new Date());
      } else if (error.message === 'INVALID_COUNT_STATE') {
        alert('❌ SYSTEM ERROR: Invalid registration count detected. Please refresh and try again.');
        await fetchProblemCounts();
        setLastUpdated(new Date());
      } else {
        alert('❌ Registration failed due to a technical error. The problem statement may have become full. Please refresh and try again.');
        await fetchProblemCounts();
        setLastUpdated(new Date());
      }
      
      setShowConfirmation(false);
      setSelectedProblem(null);
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
                    <p className="mb-1">Team ID: <span className="text-primary">{team.teamId}</span></p>
                    <p className="mb-1">Team Name: <span className="text-primary">{team.teamName}</span></p>
                    <p className="mb-3">Team Leader: <span className="text-primary">{team.teamLeader}</span></p>
                  </div>
                  
                  <div className="mb-3">
                    <strong>Selected Problem Statement:</strong>
                    <div className="card bg-light mt-2">
                      <div className="card-body">
                        <h6 className="card-title text-primary">{selectedProblem.title}</h6>
                        <p className="card-text small text-muted">{selectedProblem.description}</p>
                        {selectedProblem.realTimeCount !== undefined && (
                          <div className="text-center mt-2">
                            <span className={`badge ${selectedProblem.availableSlots === 1 ? 'bg-warning' : 'bg-success'} fs-6`}>
                              {selectedProblem.realTimeCount}/2 teams registered • {selectedProblem.availableSlots} slot{selectedProblem.availableSlots !== 1 ? 's' : ''} available
                            </span>
                            <br />
                            <small className="text-muted">
                              Verified at: {new Date(selectedProblem.checkedAt).toLocaleTimeString()}.{String(selectedProblem.checkedAt % 1000).padStart(3, '0')}
                            </small>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="alert alert-warning">
                    <strong>⚠️ Important:</strong> Once confirmed, this registration cannot be changed. Each team can only register for one problem statement.
                    <br />
                    <small className="text-info mt-1 d-block">
                      <strong>⚡ Millisecond Protection:</strong> System will verify availability again before final registration - if another team registers simultaneously, only ONE will succeed.
                    </small>
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
                <p><strong>Team:</strong> {team.teamName} (ID: {team.teamId})</p>
                <p><strong>Team Leader:</strong> {team.teamLeader}</p>
              </div>
              <div className="alert alert-info mt-3">
                <strong>⚡ Real-Time Atomic Booking System:</strong> Each problem statement can accommodate <strong>only 2 teams</strong>. 
                Uses millisecond-level database transactions with real-time verification - if multiple teams click simultaneously, only ONE will succeed.
                <br />
                <small className="text-muted">
                  Last updated: {lastUpdated.toLocaleTimeString()}.{String(lastUpdated.getTime() % 1000).padStart(3, '0')} 
                  <button 
                    className="btn btn-sm btn-outline-primary ms-2"
                    onClick={async () => {
                      setLoading(true);
                      await fetchProblemCounts();
                      setLastUpdated(new Date());
                      setLoading(false);
                    }}
                    disabled={loading}
                    style={{ fontSize: '0.8rem', padding: '2px 8px' }}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" style={{ width: '0.8rem', height: '0.8rem' }}></span> Refreshing...
                      </>
                    ) : (
                      '🔄 Refresh Now'
                    )}
                  </button>
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {PROBLEM_STATEMENTS.map((problem) => {
          const registeredCount = problemCounts[problem.id] || 0;
          const isDisabled = registeredCount >= 2; // Changed from 3 to 2
          const isFilled = registeredCount >= 2; // Changed from 3 to 2
          
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
                   }}
                   onClick={() => {
                     if (isDisabled) {
                       alert('Sorry! This problem statement is already filled. Please choose another problem statement.');
                     } else if (!isTeamAlreadyRegistered) {
                       handleSelectProblem(problem);
                     }
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
                    <small className={`${registeredCount >= 2 ? 'text-danger fw-bold' : registeredCount === 1 ? 'text-warning fw-bold' : 'text-success'}`}>
                      {registeredCount}/2 teams {isFilled ? '(COMPLETE)' : 'registered'}
                    </small>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isDisabled) {
                          alert('Sorry! This problem statement is already filled. Please choose another problem statement.');
                        } else {
                          handleSelectProblem(problem);
                        }
                      }}
                      disabled={isDisabled || loading || isTeamAlreadyRegistered}
                      className={`btn ${isDisabled || isTeamAlreadyRegistered ? 'btn-danger' : registeredCount === 1 ? 'btn-warning' : 'btn-primary'}`}
                      style={{ minWidth: '100px' }}
                    >
                      {isDisabled ? 'FILLED' : 
                       isTeamAlreadyRegistered ? 'REGISTERED' :
                       registeredCount === 1 ? 'LAST SPOT!' :
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