import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, runTransaction, doc, onSnapshot, serverTimestamp, orderBy } from 'firebase/firestore';

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
      
      // Setup real-time listener
      const registrationsRef = collection(db, 'registrations');
      const unsubscribe = onSnapshot(registrationsRef, (snapshot) => {
        const counts = {};
        const teamCache = new Set();
        
        problemStatements.forEach(problem => counts[problem.id] = 0);
        
        snapshot.forEach(doc => {
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
        setRealtimeUpdates(prev => prev + 1);
        setRealTimeConnected(true);
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

      // FRESH CHECK: Get real-time registration count from Firebase (not cached data)
      const registrationsRef = collection(db, 'registrations');
      const problemQuery = query(registrationsRef, where('problemStatementId', '==', selectedProblem.id));
      const freshCheck = await getDocs(problemQuery);
      
      console.log(`🔍 FRESH CHECK - Current registrations for problem ${selectedProblem.id}:`, freshCheck.size);
      
      if (freshCheck.size >= 2) {
        const registeredTeams = [];
        freshCheck.forEach(doc => {
          const data = doc.data();
          registeredTeams.push(data.teamName);
        });
        
        alert(
          `❌ PROBLEM STATEMENT FULL!\n\n` +
          `Problem "${selectedProblem.title}" is now FULL (${freshCheck.size}/2 teams).\n\n` +
          `Registered teams:\n` +
          `• ${registeredTeams.join('\n• ')}\n\n` +
          `🚫 Maximum 2 teams per problem statement.\n` +
          `🎯 Please select a different available problem.`
        );
        setLoading(false);
        return;
      }

      // FRESH CHECK: Verify team hasn't registered elsewhere (real-time check)
      const teamQuery = query(registrationsRef, where('teamId', '==', team.teamId));
      const teamCheck = await getDocs(teamQuery);
      
      console.log(`🔍 FRESH CHECK - Team check for ${team.teamId}:`, teamCheck.size);
      
      if (!teamCheck.empty) {
        const existingRegistration = teamCheck.docs[0].data();
        alert(
          `🚫 TEAM ALREADY REGISTERED!\n\n` +
          `Your team "${team.teamName}" is already registered for:\n` +
          `"${existingRegistration.problemTitle}"\n\n` +
          `❌ Each team can only register ONCE.\n` +
          `🔄 Redirecting to home page...`
        );
        setTimeout(() => navigate('/'), 2000);
        setLoading(false);
        return;
      }

      // Use atomic transaction to prevent race conditions
      console.log('🚀 Starting ATOMIC registration process...');
      console.log('Team:', team);
      console.log('Selected Problem:', selectedProblem);
      
      const result = await runTransaction(db, async (transaction) => {
        const registrationsRef = collection(db, 'registrations');
        
        // ATOMIC CHECK: Get current registrations for this problem
        const problemQuery = query(registrationsRef, where('problemStatementId', '==', selectedProblem.id));
        const currentRegistrations = await getDocs(problemQuery);
        
        console.log(`🔍 ATOMIC CHECK - Current registrations for problem ${selectedProblem.id}:`, currentRegistrations.size);
        
        // RACE CONDITION PROTECTION: Check if problem is full (2 teams maximum)
        if (currentRegistrations.size >= 2) {
          const registeredTeams = [];
          currentRegistrations.forEach(doc => {
            const data = doc.data();
            registeredTeams.push(`${data.teamName} (registered: ${new Date(data.registrationTimestamp).toLocaleTimeString()})`);
          });
          throw new Error(`RACE_CONDITION_REJECTED: Problem "${selectedProblem.title}" is now FULL! Already registered teams: ${registeredTeams.join(', ')}. Maximum 2 teams per problem. Please choose another problem immediately!`);
        }

        // ATOMIC CHECK: Verify team hasn't registered elsewhere
        const teamQuery = query(registrationsRef, where('teamId', '==', team.teamId));
        const teamCheck = await getDocs(teamQuery);
        
        console.log(`🔍 ATOMIC CHECK - Team check for ${team.teamId}:`, teamCheck.size);
        
        if (!teamCheck.empty) {
          const existingRegistration = teamCheck.docs[0].data();
          throw new Error(`TEAM_ALREADY_REGISTERED: Your team "${team.teamName}" is already registered for "${existingRegistration.problemTitle}"`);
        }

        // CREATE ATOMIC REGISTRATION DATA with precise timestamp
        const registrationData = {
          problemStatementId: selectedProblem.id,
          problemNumber: selectedProblem.number || selectedProblem.id,
          problemTitle: selectedProblem.title,
          teamId: team.teamId,
          teamName: team.teamName,
          teamLeader: team.teamLeader,
          teamMembers: 5,
          memberDetails: team.memberDetails || [],
          registeredAt: serverTimestamp(),
          timestamp: serverTimestamp(),
          status: 'CONFIRMED',
          raceConditionWinner: true, // Mark as winner of race condition
          registrationTimestamp: Date.now() // Additional timestamp for sorting
        };
        
        console.log('📝 ATOMIC registration data:', registrationData);

        // ATOMIC OPERATION: Add registration document
        const newDocRef = doc(registrationsRef);
        transaction.set(newDocRef, registrationData);
        
        return { success: true, id: newDocRef.id, isWinner: true };
      });
      
      console.log('✅ ATOMIC Registration successful! Result:', result);
      
      // Update local cache immediately
      setRegistrationCache(prev => new Set([...prev, team.teamId]));
      setProblemCounts(prev => ({
        ...prev,
        [selectedProblem.id]: (prev[selectedProblem.id] || 0) + 1
      }));
      
      setSuccessMessage(
        `🎉 REGISTRATION SUCCESS!\n\n` +
        `✅ Team "${team.teamName}" registered for "${selectedProblem.title}"\n\n` +
        `Registration completed successfully!`
      );
      
      setTimeout(() => navigate('/'), 3000);
      
    } catch (error) {
      console.error('🚨 ATOMIC Registration error:', error);
      console.error('Error details:', error.message);
      console.error('Error code:', error.code);
      
      let errorMessage = '';
      let isRaceCondition = false;
      
      // Handle specific race condition errors
      if (error.message.includes('RACE_CONDITION_REJECTED')) {
        isRaceCondition = true;
        const cleanMessage = error.message.replace('RACE_CONDITION_REJECTED: ', '');
        errorMessage = 
          `🏃‍♂️ REGISTRATION LIMIT REACHED!\n\n` +
          `⚡ ${cleanMessage}\n\n` +
          `🎯 WHAT HAPPENED:\n` +
          `• While you were registering, the 2-team limit was reached\n` +
          `• Another team submitted just milliseconds before you\n` +
          `• Maximum 2 teams allowed per problem statement\n\n` +
          `🚀 NEXT STEPS:\n` +
          `• Choose a different available problem immediately\n` +
          `• Speed matters - first 2 teams win each problem!\n\n` +
          `⏱️ Timing is everything in hackathons!`;
        
      } else if (error.message.includes('TEAM_ALREADY_REGISTERED')) {
        const cleanMessage = error.message.replace('TEAM_ALREADY_REGISTERED: ', '');
        errorMessage = 
          `🚫 ALREADY REGISTERED!\n\n` +
          `${cleanMessage}\n\n` +
          `❌ Each team can only register ONCE.\n` +
          `🔄 Redirecting to home page...`;
        
        setTimeout(() => navigate('/'), 3000);
        
      } else if (error.message.includes('full')) {
        errorMessage = 
          `❌ PROBLEM STATEMENT FULL!\n\n` +
          `This problem statement is now full.\n` +
          `Please select another available problem.`;
        
      } else if (error.code === 'permission-denied') {
        errorMessage = 
          `🔒 PERMISSION DENIED!\n\n` +
          `Database access denied. Please contact administrator.`;
        
      } else if (error.code === 'unavailable') {
        errorMessage = 
          `📡 SERVICE UNAVAILABLE!\n\n` +
          `Registration service is temporarily down.\n` +
          `Please try again in a moment.`;
        
      } else if (error.message.includes('network')) {
        errorMessage = 
          `🌐 NETWORK ERROR!\n\n` +
          `Please check your internet connection and try again.`;
        
      } else {
        errorMessage = 
          `❌ REGISTRATION FAILED!\n\n` +
          `An unexpected error occurred.\n` +
          `Error: ${error.message}\n\n` +
          `Please try again or contact support.`;
      }
      
      // Show appropriate alert based on error type
      if (isRaceCondition) {
        // More prominent alert for race conditions
        if (window.confirm(errorMessage + '\n\nClick OK to try selecting another problem, or Cancel to go back to home.')) {
          // Stay on page to select another problem
          setShowConfirmation(false);
          setSelectedProblem(null);
        } else {
          navigate('/');
        }
      } else {
        alert(errorMessage);
      }
      
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
    <div className="container-fluid" style={{backgroundColor: '#f8f9fa', minHeight: '100vh', paddingTop: '2rem'}}>
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12 text-center">
          <h1 className="display-5 text-primary mb-3">🎯 Problem Statement Selection</h1>
          <div className="card mx-auto" style={{maxWidth: '600px'}}>
            <div className="card-body">
              <h5 className="card-title text-info">Team Information</h5>
              <div className="row">
                <div className="col-md-6">
                  <p><strong>Team Name:</strong> {team?.teamName}</p>
                  <p><strong>Team Leader:</strong> {team?.teamLeader}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Team ID:</strong> {team?.teamId}</p>
                  <p><strong>Members:</strong> 5</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Problem Statements Grid */}
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
            const isFull = count >= 2;
            const isAvailable = count < 2;
            
            return (
              <div key={problem.id} className="col-lg-6 col-xl-4 mb-4">
                <div className={`card h-100 border-2 ${isFull ? 'border-danger' : 'border-success'}`}>
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <h6 className="card-title mb-0 text-primary">
                      Problem {problem.number || 'X'}: {problem.title}
                    </h6>
                    <div>
                      <span className={`badge ${isFull ? 'bg-danger' : 'bg-success'}`}>
                        {isFull ? 'FULL' : 'ACTIVE'}
                      </span>
                      <span className="badge bg-info ms-1">
                        {count}/2
                      </span>
                    </div>
                  </div>
                  
                  <div className="card-body d-flex flex-column">
                    <p className="card-text text-muted flex-grow-1">{problem.description}</p>
                    
                    <div className="mt-auto">
                      {isFull ? (
                        <button className="btn btn-danger w-100" disabled>
                          🚫 PROBLEM FULL ({count}/2)
                        </button>
                      ) : (
                        <button 
                          className="btn btn-success w-100" 
                          onClick={() => handleProblemSelect(problem)}
                          disabled={loading}
                        >
                          ✅ Select Problem {problem.number || 'X'} ({count}/2)
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="card-footer bg-transparent">
                    <small className="text-muted">
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
      <div className="row mt-4 mb-4">
        <div className="col-12 text-center">
          <button 
            onClick={() => navigate('/')}
            className="btn btn-outline-secondary btn-lg"
          >
            ← Back to Registration
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProblemStatements;