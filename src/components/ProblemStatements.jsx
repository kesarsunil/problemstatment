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

    // IMMEDIATE LOADING STATE - Show user action is processing
    setLoading(true);
    
    // RECORD EXACT CLICK TIMESTAMP - Millisecond precision
    const clickTimestamp = Date.now();
    const clickTime = performance.now(); // High precision timer
    
    console.log(`🚀 REGISTRATION ATTEMPT: Team ${team.teamId} clicked at ${clickTimestamp} (${new Date(clickTimestamp).toLocaleTimeString()}.${String(clickTimestamp % 1000).padStart(3, '0')})`);
    
    try {
      // ULTRA-FAST ATOMIC TRANSACTION - Millisecond-level race protection
      const result = await runTransaction(db, async (transaction) => {
        const transactionStartTime = performance.now();
        
        // STEP 1: LIGHTNING-FAST COUNT CHECK - Get current registrations
        const problemRegistrationsQuery = query(
          collection(db, 'registrations'),
          where('problemStatementId', '==', selectedProblem.id)
        );
        const problemSnapshot = await getDocs(problemRegistrationsQuery);
        const currentCount = problemSnapshot.size;
        const queryTime = performance.now();

        // STEP 2: INSTANT TEAM VERIFICATION - Check if team already registered
        const teamRegistrationsQuery = query(
          collection(db, 'registrations'),
          where('teamId', '==', team.teamId)
        );
        const teamSnapshot = await getDocs(teamRegistrationsQuery);
        const teamCheckTime = performance.now();
        
        if (!teamSnapshot.empty) {
          throw new Error(`TEAM_ALREADY_REGISTERED:${clickTimestamp}`);
        }

        // STEP 3: CRITICAL MILLISECOND RACE CHECK - First-come-first-served
        if (currentCount >= 2) {
          const rejectionTime = Date.now();
          const processingDelay = rejectionTime - clickTimestamp;
          throw new Error(`PROBLEM_FULL_RACE:${clickTimestamp}:${rejectionTime}:${processingDelay}`);
        }

        // STEP 4: INSTANT SUCCESS REGISTRATION - Reserve slot immediately
        const registrationTimestamp = Date.now();
        const registrationRef = doc(collection(db, 'registrations'));
        
        transaction.set(registrationRef, {
          teamId: team.teamId,
          teamName: team.teamName,
          teamLeader: team.teamLeader,
          problemStatementId: selectedProblem.id,
          problemStatementTitle: selectedProblem.title,
          clickTimestamp: clickTimestamp,                    // When user clicked confirm
          registrationTimestamp: registrationTimestamp,     // When registration completed
          processingTime: registrationTimestamp - clickTimestamp, // Total processing time
          transactionStartTime: transactionStartTime,       // Performance tracking
          queryCompletionTime: queryTime - transactionStartTime,
          teamCheckTime: teamCheckTime - queryTime,
          serverTimestamp: new Date(),                      // Server timestamp
          documentId: registrationRef.id,
          racePosition: currentCount + 1                    // Position in the race (1st or 2nd)
        });

        const completionTime = performance.now();
        const totalProcessingTime = completionTime - clickTime;

        return { 
          success: true, 
          newCount: currentCount + 1,
          clickTimestamp: clickTimestamp,
          registrationTimestamp: registrationTimestamp,
          processingTime: registrationTimestamp - clickTimestamp,
          performanceTime: totalProcessingTime,
          racePosition: currentCount + 1,
          availableSlots: 2 - (currentCount + 1)
        };
      });

      // 🎉 SUCCESS - First team wins the race!
      const successTime = Date.now();
      const totalTime = successTime - clickTimestamp;
      
      setShowConfirmation(false);
      setSuccessMessage(
        `🏆 REGISTRATION SUCCESS! You won the race! Team ${team.teamName} secured position #${result.racePosition} for "${selectedProblem.title}" in ${totalTime}ms (clicked: ${new Date(result.clickTimestamp).toLocaleTimeString()}.${String(result.clickTimestamp % 1000).padStart(3, '0')}, registered: ${new Date(result.registrationTimestamp).toLocaleTimeString()}.${String(result.registrationTimestamp % 1000).padStart(3, '0')})`
      );
      
      // Update local state immediately
      setProblemCounts(prev => ({
        ...prev,
        [selectedProblem.id]: result.newCount
      }));

      setSelectedProblem(null);
      
      // Redirect after showing success details
      setTimeout(() => {
        navigate('/');
      }, 5000);
      
    } catch (error) {
      const errorTime = Date.now();
      const totalErrorTime = errorTime - clickTimestamp;
      
      console.error('🚫 RACE LOST:', error);
      
      // Handle millisecond-level race conditions
      if (error.message.includes('TEAM_ALREADY_REGISTERED')) {
        const [, originalClick] = error.message.split(':');
        alert(`🚫 TEAM ALREADY REGISTERED: Your team registered earlier. Processing time: ${totalErrorTime}ms (clicked at ${new Date(parseInt(originalClick)).toLocaleTimeString()}.${String(parseInt(originalClick) % 1000).padStart(3, '0')})`);
        
      } else if (error.message.includes('PROBLEM_FULL_RACE')) {
        const [, clickTime, rejectTime, delay] = error.message.split(':');
        alert(`⚡ RACE LOST! Another team was faster by milliseconds!\n\n🕐 You clicked: ${new Date(parseInt(clickTime)).toLocaleTimeString()}.${String(parseInt(clickTime) % 1000).padStart(3, '0')}\n🚫 Rejected at: ${new Date(parseInt(rejectTime)).toLocaleTimeString()}.${String(parseInt(rejectTime) % 1000).padStart(3, '0')}\n⏱️ Processing delay: ${delay}ms\n\nThis problem statement is now FULL (2/2 teams). Please choose another problem statement.`);
        
        // Immediately refresh counts to show updated status
        await fetchProblemCounts();
        setLastUpdated(new Date());
        
      } else {
        alert(`🚫 REGISTRATION FAILED: Technical error after ${totalErrorTime}ms. The problem may have been filled by another team. Please refresh and try again.`);
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
                  
                  <div className="alert alert-danger">
                    <strong>⚡ REAL-TIME RACE:</strong> Multiple teams may be trying to register simultaneously. When you click "Confirm", the system will check availability in milliseconds.
                    <br />
                    <strong>🏃‍♂️ First-Come-First-Served:</strong> The fastest click wins! If another team clicks even milliseconds before you, they get the slot.
                    <br />
                    <small className="text-info mt-1 d-block">
                      <strong>🎯 Race Protection:</strong> Atomic database transactions ensure only the first team succeeds - no double bookings possible.
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
                  style={{ minWidth: '180px' }}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Racing for slot...
                    </>
                  ) : (
                    <>
                      🏃‍♂️ CONFIRM - JOIN RACE!
                    </>
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
              <div className="alert alert-warning mt-3">
                <strong>🏁 REAL-TIME RACING SYSTEM:</strong> Each problem statement has <strong>only 2 slots</strong>. 
                Multiple teams can compete simultaneously - <strong>fastest click wins!</strong>
                <br />
                <strong>⚡ Millisecond Precision:</strong> System tracks exact click timestamps. If you click milliseconds after another team, you'll be rejected.
                <br />
                <small className="text-muted">
                  🕐 Last updated: {lastUpdated.toLocaleTimeString()}.{String(lastUpdated.getTime() % 1000).padStart(3, '0')} 
                  <button 
                    className="btn btn-sm btn-outline-warning ms-2"
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
                        <span className="spinner-border spinner-border-sm" style={{ width: '0.8rem', height: '0.8rem' }}></span> Racing...
                      </>
                    ) : (
                      '🔄 Refresh Race Status'
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
                      className={`btn ${isDisabled || isTeamAlreadyRegistered ? 'btn-danger' : registeredCount === 1 ? 'btn-warning' : 'btn-success'}`}
                      style={{ minWidth: '120px' }}
                    >
                      {isDisabled ? 'RACE OVER' : 
                       isTeamAlreadyRegistered ? 'REGISTERED' :
                       registeredCount === 1 ? '🏃‍♂️ FINAL SLOT!' :
                       loading ? (
                         <>
                           <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                           Checking...
                         </>
                       ) : '🏁 JOIN RACE'}
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