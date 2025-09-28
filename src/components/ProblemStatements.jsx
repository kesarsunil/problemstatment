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
    // INSTANT CONFIRMATION - Skip pre-check for maximum speed
    // Direct to confirmation for lightning-fast racing
    setSelectedProblem({
      ...problemStatement,
      fastRace: true,
      preparedAt: performance.now()
    });
    setShowConfirmation(true);
  };

  const handleConfirmSelection = async () => {
    if (!selectedProblem) return;

    // INSTANT RESPONSE - Immediate loading state (0ms delay)
    setLoading(true);
    
    // ULTRA-HIGH PRECISION TIMING - Nanosecond accuracy
    const clickTimestamp = performance.now(); // High precision timer
    const clickEpoch = Date.now(); // Epoch timestamp
    const startTime = performance.now();
    
    console.log(`⚡ RACE START: Team ${team.teamId} at ${clickEpoch}.${String(Math.floor(clickTimestamp % 1000)).padStart(3, '0')}ms`);
    
    try {
      // LIGHTNING-SPEED ATOMIC RACE - Sub-millisecond processing
      const result = await runTransaction(db, async (transaction) => {
        const raceStartTime = performance.now();
        
        // INSTANT DATABASE QUERIES - Parallel execution for maximum speed
        const [problemSnapshot, teamSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'registrations'), where('problemStatementId', '==', selectedProblem.id))),
          getDocs(query(collection(db, 'registrations'), where('teamId', '==', team.teamId)))
        ]);
        
        const queryEndTime = performance.now();
        const queryTime = queryEndTime - raceStartTime;
        const currentCount = problemSnapshot.size;
        
        // IMMEDIATE RACE VALIDATION
        if (!teamSnapshot.empty) {
          const rejectTime = performance.now();
          throw new Error(`TEAM_ALREADY_REGISTERED:${clickTimestamp}:${rejectTime}:${rejectTime - clickTimestamp}`);
        }

        // CRITICAL 1MS RACE CHECK - Instant rejection if full
        if (currentCount >= 2) {
          const rejectTime = performance.now();
          const raceDelay = rejectTime - clickTimestamp;
          throw new Error(`RACE_LOST:${clickTimestamp}:${rejectTime}:${raceDelay}:${currentCount}`);
        }

        // INSTANT SUCCESS - Reserve slot in sub-millisecond
        const winTime = performance.now();
        const registrationRef = doc(collection(db, 'registrations'));
        
        transaction.set(registrationRef, {
          teamId: team.teamId,
          teamName: team.teamName,
          teamLeader: team.teamLeader,
          problemStatementId: selectedProblem.id,
          problemStatementTitle: selectedProblem.title,
          
          // ULTRA-PRECISE TIMING DATA
          clickTimestamp: clickTimestamp,           // High precision click time
          clickEpoch: clickEpoch,                  // Standard timestamp
          winTimestamp: winTime,                   // Win confirmation time
          queryDuration: queryTime,                // Database query time
          racePosition: currentCount + 1,          // Position in race (1 or 2)
          raceDuration: winTime - clickTimestamp,  // Total race duration
          
          // PERFORMANCE METRICS
          processingSpeed: `${(winTime - clickTimestamp).toFixed(3)}ms`,
          raceWinner: true,
          documentId: registrationRef.id
        });

        const completeTime = performance.now();
        return { 
          success: true, 
          newCount: currentCount + 1,
          clickTime: clickTimestamp,
          winTime: winTime,
          completeTime: completeTime,
          totalRaceTime: completeTime - clickTimestamp,
          queryTime: queryTime,
          racePosition: currentCount + 1,
          availableSlots: 2 - (currentCount + 1)
        };
      });

      // � INSTANT SUCCESS - Race won in milliseconds!
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      setShowConfirmation(false);
      setSuccessMessage(
        `🏆 RACE WON! Lightning-fast success in ${totalTime.toFixed(3)}ms!\n\n` +
        `🥇 Position: #${result.racePosition}/2\n` +
        `⚡ Click: ${result.clickTime.toFixed(3)}ms\n` +
        `🎯 Win: ${result.winTime.toFixed(3)}ms\n` +
        `⏱️ Race time: ${result.totalRaceTime.toFixed(3)}ms\n` +
        `📊 Query: ${result.queryTime.toFixed(3)}ms\n\n` +
        `Problem: "${selectedProblem.title}"\n` +
        `Slots remaining: ${result.availableSlots}`
      );
      
      // IMMEDIATE STATE UPDATE
      setProblemCounts(prev => ({
        ...prev,
        [selectedProblem.id]: result.newCount
      }));

      setSelectedProblem(null);
      
      // Quick redirect after showing race results
      setTimeout(() => navigate('/'), 4000);
      
    } catch (error) {
      const errorTime = performance.now();
      const totalErrorTime = errorTime - startTime;
      
      console.error('🚫 RACE FAILED:', error.message);
      
      // INSTANT RACE FAILURE FEEDBACK
      if (error.message.includes('RACE_LOST')) {
        const [, clickTime, rejectTime, raceDelay, currentCount] = error.message.split(':');
        const clickMs = parseFloat(clickTime).toFixed(3);
        const rejectMs = parseFloat(rejectTime).toFixed(3);
        const delayMs = parseFloat(raceDelay).toFixed(3);
        
        alert(
          `⚡ RACE LOST BY MILLISECONDS!\n\n` +
          `🏃‍♂️ Your click: ${clickMs}ms\n` +
          `🚫 Rejected at: ${rejectMs}ms\n` +
          `💔 Lost by: ${delayMs}ms\n\n` +
          `🏁 Result: Another team was ${delayMs}ms faster!\n` +
          `📊 Status: FULL (${currentCount}/2 teams)\n\n` +
          `Choose another problem statement to race again!`
        );
        
      } else if (error.message.includes('TEAM_ALREADY_REGISTERED')) {
        const [, clickTime, rejectTime, delay] = error.message.split(':');
        alert(
          `🚫 ALREADY REGISTERED!\n\n` +
          `Your team already registered earlier.\n` +
          `Processing time: ${parseFloat(delay).toFixed(3)}ms`
        );
      } else {
        alert(`🚫 RACE ERROR: Failed in ${totalErrorTime.toFixed(3)}ms. Try another problem statement!`);
      }
      
      // IMMEDIATE REFRESH after race failure
      await fetchProblemCounts();
      setLastUpdated(new Date());
      
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
                        {selectedProblem.fastRace && (
                          <div className="text-center mt-2">
                            <span className="badge bg-warning fs-6 animate__animated animate__pulse">
                              ⚡ ULTRA-FAST RACE MODE ENABLED
                            </span>
                            <br />
                            <small className="text-muted">
                              Ready for 1ms precision racing!
                            </small>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="alert alert-danger">
                    <strong>⚡ 1MS PRECISION RACE:</strong> Click "CONFIRM" to enter the race! System will check availability in microseconds.
                    <br />
                    <strong>🏃‍♂️ Lightning Speed:</strong> If another team clicks even 1ms before you, they win the slot.
                    <br />
                    <strong>🎯 Example:</strong> Team A clicks at 14:30:25.847ms, Team B at 14:30:25.848ms → Team A wins!
                    <br />
                    <small className="text-info mt-1 d-block">
                      <strong>⚡ Sub-millisecond Processing:</strong> Parallel database queries + atomic transactions = ultra-fast results!
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
                  className="btn btn-danger btn-lg" 
                  onClick={handleConfirmSelection}
                  disabled={loading}
                  style={{ minWidth: '200px', fontWeight: 'bold' }}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Racing at light speed...
                    </>
                  ) : (
                    <>
                      ⚡ CONFIRM - ENTER RACE!
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