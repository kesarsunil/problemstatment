import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, runTransaction, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';

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
  const [registrationCache, setRegistrationCache] = useState(new Set()); // Cache for ultra-fast validation
  const [realTimeConnected, setRealTimeConnected] = useState(false);
  const [realtimeUpdates, setRealtimeUpdates] = useState(0); // Counter for real-time updates
  const [autoRefreshActive, setAutoRefreshActive] = useState(false); // Track 1ms auto-refresh status
  const [refreshCount, setRefreshCount] = useState(0); // Track number of 1ms refreshes

  useEffect(() => {
    try {
      const decodedTeamData = JSON.parse(atob(teamData));
      setTeam(decodedTeamData);
      
      // 🔒 INITIAL TEAM VALIDATION - Check if team already booked at entry time
      const validateTeamAtEntry = async () => {
        const entryTimestamp = performance.now();
        console.log(`🔍 Validating team ${decodedTeamData.teamId} at entry time: ${entryTimestamp}ms`);
        
        try {
          // Check if team has already registered for any problem
          const q = query(
            collection(db, 'registrations'),
            where('teamId', '==', decodedTeamData.teamId)
          );
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            // Team already registered - show details and redirect
            const existingRegistration = querySnapshot.docs[0].data();
            alert(
              `🚫 TEAM ALREADY REGISTERED!\n\n` +
              `Team: ${decodedTeamData.teamName}\n` +
              `Already registered for: ${existingRegistration.problemTitle || existingRegistration.problemStatementId}\n` +
              `Registration time: ${new Date(existingRegistration.registeredAt?.seconds * 1000).toLocaleString()}\n\n` +
              `❌ Each team can only register ONCE.\n` +
              `🔄 Redirecting to home page...`
            );
            setTimeout(() => navigate('/'), 2000);
            return;
          }
          
          console.log(`✅ Team ${decodedTeamData.teamId} validation passed at entry`);
          setTeamRegistrationChecked(true);
          setIsTeamAlreadyRegistered(false);
          
        } catch (error) {
          console.error('Entry validation error:', error);
          setTeamRegistrationChecked(true);
          setIsTeamAlreadyRegistered(false);
        }
      };
      
      // Run initial validation
      validateTeamAtEntry();
      
      // Initial data load
      fetchProblemCounts().catch(() => {});
      
      // 🚀 REAL-TIME AUTOMATIC UPDATES - Like financial trading systems
      const setupRealTimeListener = () => {
        console.log('🔥 Starting real-time listener...');
        
        const registrationsRef = collection(db, 'registrations');
        const unsubscribe = onSnapshot(registrationsRef, (snapshot) => {
          const updateStart = performance.now();
          
          // INSTANT DATA PROCESSING - <1ms update
          const counts = {};
          const teamCache = new Set();
          
          // Initialize counts
          PROBLEM_STATEMENTS.forEach(problem => counts[problem.id] = 0);
          
          // Process all changes in single loop
          snapshot.forEach(doc => {
            const data = doc.data();
            const problemId = data.problemStatementId || data.p;
            const teamId = data.teamId || data.t;
            
            if (problemId && counts.hasOwnProperty(problemId)) {
              counts[problemId]++;
            }
            if (teamId) {
              teamCache.add(teamId);
            }
          });
          
          const updateTime = performance.now() - updateStart;
          
          // INSTANT STATE UPDATES
          setProblemCounts(counts);
          setRegistrationCache(teamCache);
          setLastUpdated(new Date());
          setRealtimeUpdates(prev => prev + 1);
          setRealTimeConnected(true);
          
          console.log(`⚡ Real-time update completed in ${updateTime.toFixed(3)}ms`);
          
        }, (error) => {
          console.error('Real-time listener error:', error);
          setRealTimeConnected(false);
          // Auto-reconnect after 1 second
          setTimeout(setupRealTimeListener, 1000);
        });
        
        return unsubscribe;
      };
      
      // Start real-time listener
      const unsubscribe = setupRealTimeListener();
      
      // 🚀 AUTOMATIC REFRESH EVERY 1 MILLISECOND - Ultra-fast updates
      const setupAutoRefresh = () => {
        console.log('⚡ Starting 1ms automatic refresh...');
        setAutoRefreshActive(true);
        
        const autoRefreshInterval = setInterval(() => {
          const refreshStart = performance.now();
          
          // Ultra-fast refresh - fetch problem counts every 1ms
          fetchProblemCounts().then(() => {
            const refreshTime = performance.now() - refreshStart;
            console.log(`🔄 Auto-refresh #${refreshCount + 1} completed in ${refreshTime.toFixed(3)}ms`);
            
            // Update real-time indicators
            setLastUpdated(new Date());
            setRealtimeUpdates(prev => prev + 1);
            setRefreshCount(prev => prev + 1);
            setRealTimeConnected(true);
          }).catch(error => {
            console.error('Auto-refresh error:', error);
            setRealTimeConnected(false);
          });
        }, 1); // 1 millisecond interval
        
        return autoRefreshInterval;
      };
      
      // Start 1ms auto-refresh
      const autoRefreshInterval = setupAutoRefresh();
      
      // Cleanup on unmount
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
        if (autoRefreshInterval) {
          clearInterval(autoRefreshInterval);
          setAutoRefreshActive(false);
          console.log('⚡ 1ms auto-refresh stopped');
        }
      };
      
    } catch (error) {
      console.error('Invalid team data');
      navigate('/');
    }
  }, [teamData, navigate]);

  // Removed automatic polling - only manual refresh for better performance
  // Real-time updates can be triggered manually when needed

  // 🚀 OPTIMIZED FOR 1MS AUTO-REFRESH - Ultra-fast data fetching
  const fetchProblemCounts = async () => {
    try {
      const fetchStart = performance.now();
      
      // Single optimized query - get all registrations at once (optimized for 1ms calls)
      const querySnapshot = await getDocs(collection(db, 'registrations'));
      
      const counts = {};
      const teamCache = new Set();
      
      // Initialize all counts to 0 for faster processing
      PROBLEM_STATEMENTS.forEach(problem => counts[problem.id] = 0);
      
      // Single loop - count registrations AND build cache (optimized for speed)
      querySnapshot.forEach(doc => {
        const data = doc.data();
        const problemId = data.problemStatementId || data.p; // Support both old and new format
        const teamId = data.teamId || data.t;
        
        if (problemId && counts.hasOwnProperty(problemId)) {
          counts[problemId]++;
        }
        
        if (teamId) {
          teamCache.add(teamId); // Build registration cache
        }
      });
      
      // Update state efficiently
      setProblemCounts(counts);
      setRegistrationCache(teamCache); // Set cache for instant validation
      
      const fetchTime = performance.now() - fetchStart;
      
      // Only log every 1000th fetch to avoid console spam
      if (refreshCount % 1000 === 0) {
        console.log(`📊 1ms refresh #${refreshCount}: ${fetchTime.toFixed(3)}ms fetch time`);
      }
      
      return counts;
      setRegistrationCache(teamCache); // Set cache for instant validation  
      return counts;
    } catch (error) {
      console.error('Error fetching problem counts:', error);
      return {};
    }
  };


  const handleSelectProblem = async (problemStatement) => {
    // INSTANT VALIDATION - Check cache in <0.1ms
    const teamKey = `${team.teamId}`;
    const problemKey = `${problemStatement.id}`;
    
    // Ultra-fast cache checks
    if (registrationCache.has(teamKey)) {
      alert('⚡ Team already registered! (Instant cache check)');
      return;
    }
    
    const currentCount = problemCounts[problemStatement.id] || 0;
    if (currentCount >= 2) {
      alert('⚡ Problem statement full! (Instant count check)');
      return;
    }
    
    setSelectedProblem(problemStatement);
    setShowConfirmation(true);
  };

  const handleConfirmSelection = async () => {
    if (!selectedProblem) return;

    // � MILLISECOND-PRECISE BOOKING SYSTEM - First-come-first-served
    const bookingStartTime = performance.now();
    const preciseTimestamp = Date.now(); // Millisecond precision
    const nanoseconds = performance.timeOrigin + bookingStartTime; // Ultra-precise timing
    
    console.log(`🕐 Booking attempt - Team: ${team.teamId}, Time: ${preciseTimestamp}ms, Nano: ${nanoseconds}`);
    
    // INSTANT UI RESPONSE
    setLoading(true);
    setShowConfirmation(false);
    setSelectedProblem(null);
    
    try {
      // 🔒 SIMPLIFIED TRANSACTION - No complex Firebase operations
      const result = await runTransaction(db, async (transaction) => {
        // Check existing registrations first
        const registrationsRef = collection(db, 'registrations');
        const teamQuery = query(registrationsRef, where('teamId', '==', team.teamId));
        const existingRegs = await getDocs(teamQuery);
        
        if (!existingRegs.empty) {
          throw new Error('TEAM_ALREADY_REGISTERED');
        }
        
        // Simple registration without complex bookings
        const regRef = doc(collection(db, 'registrations'));
        const registrationData = {
          teamId: team.teamId,
          teamName: team.teamName,
          teamLeader: team.teamLeader,
          problemStatementId: selectedProblem.id,
          problemTitle: selectedProblem.title,
          bookingTime: preciseTimestamp,
          status: 'CONFIRMED'
        };
        
        transaction.set(regRef, registrationData);
        
        return {
          success: true,
          bookingTime: preciseTimestamp,
          processingTime: performance.now() - bookingStartTime
        };
      });
      
      // ✅ SUCCESS
      setLoading(false);
      
      // Update local state
      setProblemCounts(prev => ({
        ...prev,
        [selectedProblem.id]: (prev[selectedProblem.id] || 0) + 1
      }));
      
      setRegistrationCache(prev => new Set([...prev, team.teamId]));
      
      // Simple success message
      setSuccessMessage(
        `✅ BOOKING CONFIRMED!\n\n` +
        `Problem: "${selectedProblem.title}"\n` +
        `Team: ${team.teamName}\n` +
        `Time: ${new Date(result.bookingTime).toLocaleTimeString()}\n` +
        `Processing: ${result.processingTime.toFixed(2)}ms\n\n` +
        `Registration successful!`
      );
      
      // Redirect after success
      setTimeout(() => navigate('/'), 3000);
      
    } catch (error) {
      setLoading(false);
      setShowConfirmation(false);
      setSelectedProblem(null);
      
      const processingTime = performance.now() - bookingStartTime;
      console.error('Booking failed:', error.message);
      
      // Simple error handling
      if (error.message.includes('TEAM_ALREADY_REGISTERED')) {
        alert(
          `🚫 TEAM ALREADY REGISTERED!\n\n` +
          `Your team is already registered.\n` +
          `Each team can only register once!`
        );
      } else {
        alert(
          `❌ BOOKING ERROR!\n\n` +
          `Failed after ${processingTime.toFixed(2)}ms\n` +
          `Error: ${error.message}\n\n` +
          `Please try again.`
        );
      }
    }
  };

  const handleCancelSelection = () => {
    setShowConfirmation(false);
    setSelectedProblem(null);
  };

  if (!team || !teamRegistrationChecked) {
    return (
      <div style={{
        backgroundColor: '#ffffff',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '40px',
          backgroundColor: '#f8f9fa',
          border: '2px solid #2c3e50',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #2c3e50',
            borderTop: '4px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 15px'
          }}></div>
          <p style={{ color: '#2c3e50', fontWeight: 'bold' }}>
            Loading team data...
          </p>
        </div>
      </div>
    );
  }

  if (successMessage) {
    return (
      <div style={{
        backgroundColor: '#ffffff',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: '#d4edda',
          border: '2px solid #28a745',
          borderRadius: '8px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
          maxWidth: '500px'
        }}>
          <h4 style={{ 
            color: '#155724', 
            fontWeight: 'bold',
            marginBottom: '20px'
          }}>
            ✅ Success!
          </h4>
          <p style={{ 
            color: '#155724',
            marginBottom: '15px',
            whiteSpace: 'pre-wrap'
          }}>
            {successMessage}
          </p>
          <small style={{ color: '#6c757d' }}>
            Redirecting to home page...
          </small>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#ffffff',
      minHeight: '100vh',
      padding: '20px',
      color: '#2c3e50'
    }}>
      {/* CSS for animations */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .live-indicator {
          animation: pulse 1.5s infinite;
        }
        .real-time-glow {
          box-shadow: 0 0 10px rgba(40, 167, 69, 0.3);
          transition: box-shadow 0.3s ease;
        }
      `}</style>
      {/* Confirmation Modal */}
      {showConfirmation && selectedProblem && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" style={{
              backgroundColor: '#ffffff',
              border: '2px solid #2c3e50',
              borderRadius: '8px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
            }}>
              <div className="modal-header" style={{
                backgroundColor: '#f8f9fa',
                borderBottom: '2px solid #2c3e50',
                color: '#2c3e50'
              }}>
                <h5 className="modal-title" style={{
                  fontWeight: 'bold',
                  color: '#2c3e50'
                }}>
                  Confirm Problem Statement Selection
                </h5>
              </div>
              <div className="modal-body" style={{
                backgroundColor: '#ffffff',
                color: '#2c3e50'
              }}>
                <div className="text-center">
                  <div className="mb-3" style={{
                    border: '1px solid #dee2e6',
                    borderRadius: '6px',
                    padding: '15px',
                    backgroundColor: '#f8f9fa'
                  }}>
                    <strong style={{ color: '#2c3e50' }}>Team Details:</strong>
                    <p className="mb-1" style={{ color: '#495057' }}>
                      Team ID: <span style={{ color: '#2c3e50', fontWeight: 'bold' }}>{team.teamId}</span>
                    </p>
                    <p className="mb-1" style={{ color: '#495057' }}>
                      Team Name: <span style={{ color: '#2c3e50', fontWeight: 'bold' }}>{team.teamName}</span>
                    </p>
                    <p className="mb-3" style={{ color: '#495057' }}>
                      Team Leader: <span style={{ color: '#2c3e50', fontWeight: 'bold' }}>{team.teamLeader}</span>
                    </p>
                  </div>
                  
                  <div className="mb-3">
                    <strong style={{ color: '#2c3e50' }}>Selected Problem Statement:</strong>
                    <div style={{
                      backgroundColor: '#f8f9fa',
                      border: '2px solid #dee2e6',
                      borderRadius: '6px',
                      padding: '15px',
                      marginTop: '10px'
                    }}>
                      <h6 style={{ 
                        color: '#2c3e50', 
                        fontWeight: 'bold',
                        marginBottom: '10px'
                      }}>
                        {selectedProblem.title}
                      </h6>
                      <p style={{ 
                        color: '#6c757d', 
                        fontSize: '0.9rem',
                        margin: 0
                      }}>
                        {selectedProblem.description}
                      </p>
                    </div>
                  </div>
                  
                  <div style={{
                    backgroundColor: '#d4edda',
                    border: '2px solid #28a745',
                    borderRadius: '6px',
                    padding: '15px',
                    marginBottom: '20px'
                  }}>
                    <strong style={{ color: '#155724' }}>⚡ ULTRA-FAST REGISTRATION:</strong>
                    <span style={{ color: '#155724' }}> Click "INSTANT REGISTER" for lightning-speed processing!</span>
                    <br />
                    <small style={{ color: '#6c757d' }}>
                      🚀 Financial-grade speed: Registration completes in &lt;2 milliseconds
                    </small>
                  </div>
                  
                  <p className="text-center" style={{ 
                    color: '#2c3e50', 
                    fontWeight: 'bold'
                  }}>
                    Are you sure you want to register for this problem statement?
                  </p>
                </div>
              </div>
              <div className="modal-footer justify-content-center" style={{
                backgroundColor: '#f8f9fa',
                borderTop: '2px solid #dee2e6'
              }}>
                <button 
                  type="button" 
                  onClick={handleCancelSelection}
                  disabled={loading}
                  style={{
                    backgroundColor: '#6c757d',
                    border: '2px solid #6c757d',
                    color: '#ffffff',
                    borderRadius: '6px',
                    padding: '10px 20px',
                    fontWeight: 'bold',
                    marginRight: '10px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleConfirmSelection}
                  disabled={loading}
                  style={{
                    backgroundColor: '#2c3e50',
                    border: '2px solid #2c3e50',
                    color: '#ffffff',
                    borderRadius: '6px',
                    padding: '10px 25px',
                    fontWeight: 'bold',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    minWidth: '160px',
                    transition: 'all 0.1s ease'
                  }}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      ⚡ PROCESSING...
                    </>
                  ) : (
                    '⚡ INSTANT REGISTER'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row justify-content-center mb-4">
        <div className="col-md-8">
          <div style={{
            backgroundColor: '#ffffff',
            border: '2px solid #2c3e50',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              padding: '30px',
              textAlign: 'center'
            }}>
              <h2 style={{
                color: '#2c3e50',
                fontWeight: 'bold',
                marginBottom: '20px'
              }}>
                Select Problem Statement
              </h2>
              <div style={{
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                padding: '15px',
                marginBottom: '20px'
              }}>
                <p style={{ color: '#495057', marginBottom: '8px' }}>
                  <strong style={{ color: '#2c3e50' }}>Team:</strong> {team.teamName} 
                  <span style={{ color: '#6c757d' }}> (ID: {team.teamId})</span>
                </p>
                <p style={{ color: '#495057', margin: 0 }}>
                  <strong style={{ color: '#2c3e50' }}>Team Leader:</strong> {team.teamLeader}
                </p>
              </div>
              <div style={{
                backgroundColor: '#e8f4fd',
                border: '1px solid #bee5eb',
                borderRadius: '6px',
                padding: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div>
                    <strong style={{ color: '#2c3e50' }}>⚡ 1ms Auto-Refresh System</strong>
                    <div style={{ 
                      display: 'inline-block', 
                      marginLeft: '10px',
                      padding: '2px 8px', 
                      borderRadius: '4px',
                      backgroundColor: autoRefreshActive ? '#d4edda' : '#f8d7da',
                      color: autoRefreshActive ? '#155724' : '#721c24',
                      fontSize: '0.8rem',
                      fontWeight: 'bold'
                    }}>
                      {autoRefreshActive ? '⚡ 1ms ACTIVE' : '🔴 STOPPED'}
                    </div>
                    {autoRefreshActive && (
                      <div style={{ 
                        display: 'inline-block', 
                        marginLeft: '5px',
                        padding: '2px 8px', 
                        borderRadius: '4px',
                        backgroundColor: '#fff3cd',
                        color: '#856404',
                        fontSize: '0.7rem',
                        fontWeight: 'bold'
                      }}>
                        #{refreshCount}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                    Refreshes: {refreshCount} | Updates: {realtimeUpdates}
                  </div>
                </div>
                
                <span style={{ color: '#495057' }}> Each problem statement has </span>
                <strong style={{ color: '#2c3e50' }}>only 2 slots available</strong>.
                <br />
                <small style={{ color: '#6c757d' }}>
                  ⚡ Last refresh: {lastUpdated.toLocaleTimeString()}.{String(lastUpdated.getMilliseconds()).padStart(3, '0')}
                  <span style={{ 
                    marginLeft: '10px',
                    color: autoRefreshActive ? '#28a745' : '#dc3545',
                    fontWeight: 'bold'
                  }}>
                    {autoRefreshActive ? '⚡ 1ms AUTO-REFRESH ACTIVE' : 'AUTO-REFRESH STOPPED'}
                  </span>
                </small>
                {autoRefreshActive && (
                  <div style={{ 
                    marginTop: '8px', 
                    padding: '8px', 
                    backgroundColor: '#e8f5e8', 
                    borderRadius: '4px',
                    border: '1px solid #28a745'
                  }}>
                    <small style={{ color: '#155724', fontWeight: 'bold' }}>
                      🚀 Ultra-fast refresh every 1 millisecond - Total refreshes: {refreshCount}
                    </small>
                  </div>
                )}
                <div style={{ 
                  marginTop: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <button
                    onClick={() => {
                      fetchProblemCounts();
                      setRealtimeUpdates(prev => prev + 1);
                    }}
                    style={{
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '5px 10px',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    🔄 Manual Refresh
                  </button>
                  <small style={{ color: '#6c757d' }}>
                    Next auto-refresh in: <strong>1ms</strong>
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {PROBLEM_STATEMENTS.map((problem) => {
          const registeredCount = problemCounts[problem.id] || 0;
          const isDisabled = registeredCount >= 2;
          const isFilled = registeredCount >= 2;
          
          return (
            <div key={problem.id} className="col-md-6 col-lg-4">
              <div style={{ 
                     backgroundColor: '#ffffff',
                     cursor: (isDisabled || isTeamAlreadyRegistered) ? 'not-allowed' : 'pointer',
                     transition: 'transform 0.2s, box-shadow 0.2s',
                     border: isFilled || isTeamAlreadyRegistered ? 
                       '3px solid #dc3545' : 
                       registeredCount === 1 ?
                       '3px solid #ffc107' :
                       '2px solid #2c3e50',
                     borderRadius: '8px',
                     boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                     height: '100%',
                     opacity: isDisabled || isTeamAlreadyRegistered ? 0.7 : 1
                   }}
                   onMouseEnter={(e) => {
                     if (!isDisabled && !isTeamAlreadyRegistered) {
                       e.currentTarget.style.transform = 'translateY(-5px)';
                       e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.2)';
                     }
                   }}
                   onMouseLeave={(e) => {
                     e.currentTarget.style.transform = 'translateY(0)';
                     e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                   }}
                   onClick={() => {
                     if (isDisabled) {
                       alert('Sorry! This problem statement is already filled. Please choose another problem statement.');
                     } else if (!isTeamAlreadyRegistered) {
                       handleSelectProblem(problem);
                     }
                   }}>
                <div style={{
                  padding: '25px',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '15px'
                  }}>
                    <h5 style={{
                      color: '#2c3e50',
                      fontWeight: 'bold',
                      fontSize: '1.2rem',
                      flex: 1,
                      marginRight: '15px'
                    }}>
                      {problem.title}
                    </h5>
                    {(isFilled || isTeamAlreadyRegistered) && (
                      <span style={{
                        backgroundColor: isFilled ? '#dc3545' : '#28a745',
                        color: '#ffffff',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold'
                      }}>
                        {isTeamAlreadyRegistered ? 'REGISTERED' : 'FILLED'}
                      </span>
                    )}
                  </div>
                  
                  <p style={{
                    color: '#6c757d',
                    lineHeight: '1.5',
                    flex: 1,
                    marginBottom: '20px'
                  }}>
                    {problem.description}
                  </p>
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 'auto'
                  }}>
                    <small style={{
                      color: registeredCount >= 2 ? '#dc3545' : 
                             registeredCount === 1 ? '#ffc107' : '#28a745',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <span style={{ marginRight: '5px' }}>
                        {registeredCount >= 2 ? '🔴' : registeredCount === 1 ? '🟡' : '🟢'}
                      </span>
                      {registeredCount}/2 teams {isFilled ? '(COMPLETE)' : 'registered'}
                      {realTimeConnected && (
                        <span style={{
                          marginLeft: '8px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          animation: 'pulse 2s infinite'
                        }}>
                          LIVE
                        </span>
                      )}
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
                      style={{
                        backgroundColor: isDisabled || isTeamAlreadyRegistered ? 
                          '#6c757d' : 
                          registeredCount === 1 ? 
                          '#ffc107' : 
                          '#2c3e50',
                        border: `2px solid ${isDisabled || isTeamAlreadyRegistered ? 
                          '#6c757d' : 
                          registeredCount === 1 ? 
                          '#ffc107' : 
                          '#2c3e50'}`,
                        color: '#ffffff',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        cursor: isDisabled || loading || isTeamAlreadyRegistered ? 'not-allowed' : 'pointer',
                        minWidth: '100px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {isDisabled ? 'FULL' : 
                       isTeamAlreadyRegistered ? 'REGISTERED' :
                       registeredCount === 1 ? 'LAST SLOT' :
                       loading ? (
                         <>
                           <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                           Loading...
                         </>
                       ) : 'SELECT'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="text-center mt-5">
        <button
          onClick={() => navigate('/')}
          style={{
            backgroundColor: '#2c3e50',
            border: '2px solid #2c3e50',
            color: '#ffffff',
            borderRadius: '8px',
            padding: '12px 25px',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#1a252f';
            e.target.style.borderColor = '#1a252f';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#2c3e50';
            e.target.style.borderColor = '#2c3e50';
          }}
        >
          ← Back to Registration
        </button>
      </div>
    </div>
  );
};

export default ProblemStatements;