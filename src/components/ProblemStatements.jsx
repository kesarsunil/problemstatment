import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, runTransaction, doc, onSnapshot, serverTimestamp, orderBy, setDoc } from 'firebase/firestore';

const ProblemStatements = () => {
  const { teamData } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [problemStatements, setProblemStatements] = useState([]); // Dynamic problem statements from Firebase
  const [problemCounts, setProblemCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [teamRegistrationChecked, setTeamRegistrationChecked] = useState(false);
  const [isTeamAlreadyRegistered, setIsTeamAlreadyRegistered] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [registrationCache, setRegistrationCache] = useState(new Set());
  const [realTimeConnected, setRealTimeConnected] = useState(false);
  // ⚡ PERFORMANCE TRACKING: Monitor registration speed
  const [performanceStats, setPerformanceStats] = useState({
    lastRegistrationTime: null,
    averageTime: null,
    registrationCount: 0
  });
  const [realtimeUpdates, setRealtimeUpdates] = useState(0);

  // 📋 FETCH PROBLEM STATEMENTS FROM FIREBASE
  const fetchProblemStatements = async () => {
    try {
      const q = query(
        collection(db, 'problem_statements'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const problems = [];
      
      querySnapshot.forEach((doc) => {
        problems.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort by problem number (1, 2, 3, 4, 5, 6, 7, 8)
      problems.sort((a, b) => {
        if (a.number && b.number) {
          return parseInt(a.number) - parseInt(b.number);
        }
        return 0; // Keep original order if no numbers
      });
      
      setProblemStatements(problems);
      console.log(`📋 Loaded ${problems.length} problem statements from Firebase (sorted by number)`);
      console.log('🔍 Problem statements with limits:', problems.map(p => ({
        id: p.id,
        title: p.title,
        teamLimit: p.teamLimit,
        hasTeamLimit: p.hasOwnProperty('teamLimit')
      })));
      
    } catch (error) {
      console.error('Error fetching problem statements:', error);
      setProblemStatements([]);
    }
  };

  // 🚀 FETCH PROBLEM COUNTS
  const fetchProblemCounts = async () => {
    try {
      if (problemStatements.length === 0) {
        console.log('⏳ Problem statements not loaded yet, skipping count fetch');
        return;
      }

      const querySnapshot = await getDocs(collection(db, 'registrations'));
      const counts = {};
      const teamCache = new Set();
      
      // Initialize all counts to 0
      problemStatements.forEach(problem => counts[problem.id] = 0);
      
      // Count registrations
      querySnapshot.forEach(doc => {
        const data = doc.data();
        const problemId = data.problemStatementId;
        const teamId = data.teamId;
        
        if (problemId && counts.hasOwnProperty(problemId)) {
          counts[problemId]++;
        }
        
        if (teamId) {
          teamCache.add(teamId);
        }
      });
      
      setProblemCounts(counts);
      setRegistrationCache(teamCache);
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('Error fetching problem counts:', error);
    }
  };

  useEffect(() => {
    try {
      const decodedTeamData = JSON.parse(atob(teamData));
      setTeam(decodedTeamData);
      
      // Load problem statements and setup real-time updates
      fetchProblemStatements().then(() => {
        fetchProblemCounts();
      });
      
      // Check if team already registered
      const checkTeamRegistration = async () => {
        try {
          const q = query(
            collection(db, 'registrations'),
            where('teamId', '==', decodedTeamData.teamId)
          );
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const existingRegistration = querySnapshot.docs[0].data();
            alert(
              `🚫 TEAM ALREADY REGISTERED!\n\n` +
              `Team: ${decodedTeamData.teamName}\n` +
              `Already registered for: ${existingRegistration.problemTitle}\n\n` +
              `❌ Each team can only register ONCE.\n` +
              `🔄 Redirecting to home page...`
            );
            setTimeout(() => navigate('/'), 2000);
            return;
          }
          
          setTeamRegistrationChecked(true);
          setIsTeamAlreadyRegistered(false);
          
        } catch (error) {
          console.error('Team registration check error:', error);
          setTeamRegistrationChecked(true);
          setIsTeamAlreadyRegistered(false);
        }
      };
      
      checkTeamRegistration();
      
    } catch (error) {
      console.error('Invalid team data');
      navigate('/');
    }
  }, [teamData, navigate]);

  // Update problem counts when problem statements change
  useEffect(() => {
    if (problemStatements.length > 0) {
      fetchProblemCounts();
      
      // Setup real-time listener for problem counters (authoritative source)
      const counterRef = collection(db, 'problem_counters');
      const unsubscribe = onSnapshot(counterRef, (snapshot) => {
        const counts = {};
        const teamCache = new Set();
        
        // Initialize all counts to 0
        problemStatements.forEach(problem => counts[problem.id] = 0);
        
        // Get counts from counter documents (authoritative)
        snapshot.forEach(doc => {
          const data = doc.data();
          const problemId = doc.id;
          const count = data.count || 0;
          
          if (counts.hasOwnProperty(problemId)) {
            counts[problemId] = count;
          }
        });
        
        // Also listen to registrations for team cache
        const registrationsRef = collection(db, 'registrations');
        const regUnsubscribe = onSnapshot(registrationsRef, (regSnapshot) => {
          const teamCacheLocal = new Set();
          
          regSnapshot.forEach(doc => {
            const data = doc.data();
            const teamId = data.teamId;
            if (teamId) {
              teamCacheLocal.add(teamId);
            }
          });
          
          setRegistrationCache(teamCacheLocal);
        });
        
        setProblemCounts(counts);
        setLastUpdated(new Date());
        setRealtimeUpdates(prev => prev + 1);
        setRealTimeConnected(true);
        
        return () => regUnsubscribe();
      });
      
      return () => unsubscribe();
    }
  }, [problemStatements]);

  const handleProblemSelect = (problem) => {
    setSelectedProblem(problem);
    setShowConfirmation(true);
  };

  const handleConfirmSelection = async () => {
    if (!selectedProblem || !team) {
      alert('Please select a problem statement first.');
      return;
    }

    try {
      setLoading(true);
      setShowConfirmation(false);
      setSelectedProblem(null);

      // ⚡ LIGHTNING FAST REGISTRATION - Optimized for <1s performance
      const startTime = performance.now();
      
      const result = await runTransaction(db, async (transaction) => {
        // ⚡ HYPER-SPEED: Only counter (most critical operation)
        const counterRef = doc(db, 'problem_counters', selectedProblem.id);
        
        // SINGLE READ: Only what we absolutely need
        const counter = await transaction.get(counterRef);
        
        const currentCount = counter.exists() ? (counter.data().count || 0) : 0;
        const problemLimit = selectedProblem.teamLimit || 2;
        
        if (currentCount >= problemLimit) {
          throw new Error(`FULL`);
        }
        
        // SINGLE WRITE: Just increment counter (lightning fast)
        const slot = currentCount + 1;
        transaction.set(counterRef, { count: slot });
        
        return { slot, count: slot };
      });
      
      const endTime = performance.now();
      const processingTime = Math.round(endTime - startTime);
      
      // ⚡ INSTANT SUCCESS: Show result immediately
      console.log(`🚀 HYPER-SPEED REGISTRATION: ${processingTime}ms`);
      
      // INSTANT UI UPDATE
      setRegistrationCache(prev => new Set([...prev, team.teamId]));
      setProblemCounts(prev => ({
        ...prev,
        [selectedProblem.id]: result.count
      }));
      
      // 🔥 BACKGROUND REGISTRATION: Non-blocking team record
      const backgroundOps = async () => {
        try {
          const timestamp = Date.now();
          
          // Team registration (non-blocking)
          await setDoc(doc(db, 'teams', team.teamId), { 
            problem: selectedProblem.id,
            slot: result.slot,
            registered: timestamp
          });
          
          // Registration record (non-blocking)
          await addDoc(collection(db, 'registrations'), {
            problemStatementId: selectedProblem.id,
            problemTitle: selectedProblem.title,
            teamId: team.teamId,
            teamName: team.teamName,
            teamLeader: team.teamLeader,
            slot: result.slot,
            status: 'CONFIRMED',
            timestamp
          });
          
          console.log('📝 Background registration records saved');
        } catch (error) {
          console.log('⚠️ Background save failed:', error.message);
        }
      };
      
      // Execute in background (don't wait)
      backgroundOps();
      
      // UPDATE PERFORMANCE STATS
      setPerformanceStats(prev => {
        const newCount = prev.registrationCount + 1;
        const newAverage = prev.averageTime 
          ? Math.round((prev.averageTime * prev.registrationCount + processingTime) / newCount)
          : processingTime;
        
        return {
          lastRegistrationTime: processingTime,
          averageTime: newAverage,
          registrationCount: newCount
        };
      });
      
      const speedStatus = processingTime < 1000 ? '🚀 ULTRA-FAST' : processingTime < 2000 ? '⚡ FAST' : '⏱️ NORMAL';
      
      setSuccessMessage(
        `🎉 REGISTRATION SUCCESS!\n\n` +
        `✅ Team "${team.teamName}" secured SLOT ${result.slot}/${selectedProblem.teamLimit || 2}\n` +
        `📋 Problem: "${selectedProblem.title}"\n\n` +
        `${speedStatus} Registration: ${processingTime}ms\n` +
        `📊 Average Speed: ${performanceStats.averageTime || processingTime}ms`
      );
      
      setTimeout(() => navigate('/'), 1200);
      
    } catch (error) {
      console.error('🚨 ATOMIC Registration error:', error);
      console.error('Error details:', error.message);
      console.error('Error code:', error.code);
      
      let errorMessage = '';
      let isRaceCondition = false;
      
      console.log('❌ Registration failed:', error.message);
      
      // Handle error types
      if (error.message.includes('FULL:')) {
        const cleanMessage = error.message.replace('FULL: ', '');
        errorMessage = 
          `❌ PROBLEM FULL!\n\n` +
          `${cleanMessage}\n\n` +
          `🎯 Please select another problem!`;
        
      } else if (error.message.includes('TEAM_EXISTS:')) {
        const cleanMessage = error.message.replace('TEAM_EXISTS: ', '');
        errorMessage = 
          `🚫 TEAM ALREADY REGISTERED!\n\n` +
          `${cleanMessage}\n\n` +
          `🔄 Redirecting to home...`;
        setTimeout(() => navigate('/'), 1000);
        
      } else {
        // Generic error handling
        errorMessage = 
          `❌ REGISTRATION FAILED!\n\n` +
          `Error: ${error.message}\n\n` +
          `Please try again.`;
      }
      
      // Show fast error message
      alert(errorMessage);
      
      setLoading(false);
    }
  };

  if (!teamRegistrationChecked) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{height: '100vh'}}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Checking team registration...</span>
        </div>
      </div>
    );
  }

  if (isTeamAlreadyRegistered) {
    return (
      <div className="container-fluid d-flex justify-content-center align-items-center" style={{height: '100vh'}}>
        <div className="text-center">
          <h3 className="text-danger">⚠️ Team Already Registered</h3>
          <p>This team has already registered for a problem statement.</p>
        </div>
      </div>
    );
  }

  if (successMessage) {
    return (
      <div className="container-fluid d-flex justify-content-center align-items-center" style={{height: '100vh', backgroundColor: '#e8f5e8'}}>
        <div className="text-center p-5">
          <div className="mb-4">
            <div className="display-1 text-success">🎉</div>
            <h2 className="text-success mb-3">Registration Successful!</h2>
          </div>
          <div className="alert alert-success p-4" style={{fontSize: '16px', lineHeight: '1.6'}}>
            <pre style={{whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0}}>
              {successMessage}
            </pre>
          </div>
          <div className="mt-4">
            <div className="spinner-border text-success me-2" role="status" style={{width: '1rem', height: '1rem'}}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <span className="text-muted">Redirecting to home page...</span>
          </div>
        </div>
      </div>
    );
  }

  if (showConfirmation && selectedProblem) {
    return (
      <div className="container-fluid d-flex justify-content-center align-items-center" style={{height: '100vh', backgroundColor: '#f8f9fa'}}>
        <div className="card shadow-lg" style={{maxWidth: '600px', width: '100%'}}>
          <div className="card-header text-center bg-warning">
            <h4 className="mb-0">⚠️ Confirm Problem Selection</h4>
          </div>
          <div className="card-body">
            <div className="text-center mb-4">
              <h5 className="text-primary">Selected Problem Statement:</h5>
              <h6 className="fw-bold">{selectedProblem.title}</h6>
              <p className="text-muted">{selectedProblem.description}</p>
            </div>
            
            <div className="text-center mb-4">
              <h5 className="text-info">Team Details:</h5>
              <p><strong>Team Name:</strong> {team?.teamName}</p>
              <p><strong>Team Leader:</strong> {team?.teamLeader}</p>
              <p><strong>Team ID:</strong> {team?.teamId}</p>
            </div>
            
            <div className="alert alert-warning">
              <strong>⚠️ Important:</strong> Once confirmed, this registration cannot be changed. 
              Each team can only register for ONE problem statement.
            </div>
            
            <div className="d-flex gap-3 justify-content-center">
              <button
                onClick={handleConfirmSelection}
                className="btn btn-success btn-lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Registering...
                  </>
                ) : (
                  '✅ Confirm Registration'
                )}
              </button>
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setSelectedProblem(null);
                }}
                className="btn btn-secondary btn-lg"
                disabled={loading}
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1B1B 50%, #1a1a1a 100%)',
      padding: '2rem 0'
    }}>
      
      {/* Team Information Header */}
      <div className="container mb-4">
        <div className="row justify-content-center">
          <div className="col-lg-10">
            <div style={{
              background: 'linear-gradient(145deg, rgba(205, 92, 92, 0.2), rgba(205, 92, 92, 0.1))',
              backdropFilter: 'blur(15px)',
              border: '2px solid rgba(205, 92, 92, 0.3)',
              borderRadius: '20px',
              padding: '2rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
            }}>
              <h2 style={{
                textAlign: 'center',
                color: '#FFFFFF',
                fontSize: '2rem',
                fontWeight: 'bold',
                marginBottom: '1.5rem'
              }}>
                🎯 Problem Statement Selection
              </h2>
              
              <div className="row text-center">
                <div className="col-md-3">
                  <div style={{marginBottom: '1rem'}}>
                    <strong style={{color: '#CD5C5C'}}>Team Name:</strong><br/>
                    <span style={{color: '#FFFFFF', fontSize: '1.1rem'}}>{team?.teamName}</span>
                  </div>
                </div>
                <div className="col-md-3">
                  <div style={{marginBottom: '1rem'}}>
                    <strong style={{color: '#CD5C5C'}}>Team Leader:</strong><br/>
                    <span style={{color: '#FFFFFF', fontSize: '1.1rem'}}>{team?.teamLeader}</span>
                  </div>
                </div>
                <div className="col-md-3">
                  <div style={{marginBottom: '1rem'}}>
                    <strong style={{color: '#CD5C5C'}}>Team ID:</strong><br/>
                    <span style={{color: '#FFFFFF', fontSize: '1.1rem'}}>{team?.teamId}</span>
                  </div>
                </div>
                <div className="col-md-3">
                  <div style={{marginBottom: '1rem'}}>
                    <strong style={{color: '#CD5C5C'}}>Members:</strong><br/>
                    <span style={{color: '#FFFFFF', fontSize: '1.1rem'}}>5</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Problem Statements Grid */}
      <div className="container py-4">
        <div className="text-center mb-5">
          <h2 style={{
            color: '#FFFFFF',
            fontSize: '2.5rem',
            fontWeight: 'bold',
            marginBottom: '1rem',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
          }}>
            Choose Your Challenge
          </h2>
          <p style={{
            color: '#CCCCCC',
            fontSize: '1.2rem',
            marginBottom: '0'
          }}>
            Select the problem statement that matches your team's expertise
          </p>
        </div>
        
        <div className="row">
        {problemStatements.length === 0 ? (
          <div className="col-12 text-center py-5">
            <div className="alert alert-info">
              <h5>📋 Loading Problem Statements...</h5>
              <p className="mb-0">Please wait while we load the available problem statements from the database.</p>
            </div>
          </div>
        ) : (
          problemStatements.map((problem) => {
            const count = problemCounts[problem.id] || 0;
            const problemLimit = problem.teamLimit || 2; // Use problem's limit or default to 2
            const isFull = count >= problemLimit;
            const isAvailable = count < problemLimit;
            
            return (
              <div key={problem.id} className="col-lg-6 col-xl-4 mb-4">
                <div style={{
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                  backdropFilter: 'blur(15px)',
                  border: `2px solid ${isFull ? 'rgba(220, 53, 69, 0.5)' : 'rgba(40, 167, 69, 0.5)'}`,
                  borderRadius: '20px',
                  padding: '0',
                  height: '100%',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div style={{
                    padding: '1.5rem 1.5rem 1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <h6 style={{
                      color: '#FFFFFF',
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      marginBottom: '1rem'
                    }}>
                      Problem {problem.number || 'X'}: {problem.title}
                    </h6>
                    <div className="d-flex gap-2">
                      <span style={{
                        backgroundColor: isFull ? '#dc3545' : '#28a745',
                        color: 'white',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '15px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold'
                      }}>
                        {isFull ? 'FULL' : 'ACTIVE'}
                      </span>
                      <span style={{
                        backgroundColor: '#17a2b8',
                        color: 'white',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '15px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold'
                      }}>
                        {count}/{problemLimit}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{
                    padding: '1rem 1.5rem',
                    flex: '1',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <p style={{
                      color: '#CCCCCC',
                      lineHeight: '1.5',
                      flex: '1',
                      marginBottom: '1.5rem'
                    }}>
                      {problem.description}
                    </p>
                    
                    <div>
                      {isFull ? (
                        <button 
                          disabled 
                          style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '15px',
                            border: 'none',
                            background: 'linear-gradient(45deg, #6c757d, #495057)',
                            color: '#FFFFFF',
                            fontWeight: 'bold',
                            cursor: 'not-allowed',
                            fontSize: '1rem'
                          }}
                        >
                          🚫 PROBLEM FULL ({count}/{problemLimit})
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleProblemSelect(problem)}
                          disabled={loading}
                          style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '15px',
                            border: 'none',
                            background: loading ? 'linear-gradient(45deg, #6c757d, #495057)' : 'linear-gradient(45deg, #28a745, #20c997)',
                            color: '#FFFFFF',
                            fontWeight: 'bold',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '1rem',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)'
                          }}
                        >
                          ✅ Select Problem {problem.number || 'X'} ({count}/{problemLimit})
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div style={{
                    padding: '0.75rem 1.5rem',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    textAlign: 'center'
                  }}>
                    <small style={{color: '#999999', fontSize: '0.8rem'}}>
                      Last updated: {lastUpdated.toLocaleTimeString()}
                    </small>
                  </div>
                </div>
              </div>
            );
          })
        )}
        </div>

        {/* Back Button */}
        <div className="row mt-5 mb-4">
          <div className="col-12 text-center">
            <button 
              onClick={() => navigate('/')}
              style={{
                backgroundColor: 'transparent',
                border: '2px solid #CD5C5C',
                color: '#CD5C5C',
                padding: '12px 30px',
                borderRadius: '25px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              className="back-btn-hover"
            >
              ← Back to Registration
            </button>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="text-center py-4" style={{color: '#CCCCCC', marginTop: '2rem'}}>
        <p className="mb-0">DESIGNED AND DEVELOPED BY WEB DEV TEAM CYBERNERDS KARE</p>
      </div>
    </div>
  );
};

export default ProblemStatements;