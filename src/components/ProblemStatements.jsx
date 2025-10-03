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

      // Check if problem is full
      const currentCount = problemCounts[selectedProblem.id] || 0;
      if (currentCount >= 2) {
        alert(`❌ Registration failed! Problem "${selectedProblem.title}" is already full (${currentCount}/2 teams registered).`);
        setLoading(false);
        return;
      }

      // Check if team already registered
      if (registrationCache.has(team.teamId)) {
        alert('❌ Registration failed! Your team is already registered for a problem statement.');
        setLoading(false);
        return;
      }

      // Register the team using simple addDoc (more reliable than transactions)
      console.log('🚀 Starting registration process...');
      console.log('Team:', team);
      console.log('Selected Problem:', selectedProblem);
      
      // Final checks before registration
      const registrationsRef = collection(db, 'registrations');
      
      // Check current registrations for this problem
      const currentRegistrations = await getDocs(query(registrationsRef, where('problemStatementId', '==', selectedProblem.id)));
      console.log(`Current registrations for problem ${selectedProblem.id}:`, currentRegistrations.size);
      
      if (currentRegistrations.size >= 2) {
        throw new Error(`Problem is full - ${currentRegistrations.size} teams already registered`);
      }

      // Check for duplicate team registration
      const teamCheck = await getDocs(query(registrationsRef, where('teamId', '==', team.teamId)));
      console.log(`Team check for ${team.teamId}:`, teamCheck.size);
      
      if (!teamCheck.empty) {
        throw new Error('Team already registered');
      }

      // Create registration data
      const registrationData = {
        problemStatementId: selectedProblem.id, // Now will be numeric (1, 2, 3, etc.)
        problemNumber: selectedProblem.number || selectedProblem.id, // Store the problem number
        problemTitle: selectedProblem.title,
        teamId: team.teamId,
        teamName: team.teamName,
        teamLeader: team.teamLeader,
        teamMembers: 5, // Set to constant 5 members
        memberDetails: team.memberDetails || [],
        registeredAt: serverTimestamp(),
        timestamp: serverTimestamp(), // Add both for compatibility
        status: 'CONFIRMED'
      };
      
      console.log('Registration data:', registrationData);

      // Add registration document
      const docRef = await addDoc(registrationsRef, registrationData);
      console.log('Registration successful! Document ID:', docRef.id);
      
      const result = { success: true, id: docRef.id };
      
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
      console.error('Registration error:', error);
      console.error('Error details:', error.message);
      console.error('Error code:', error.code);
      
      let errorMessage = '❌ Registration failed! ';
      
      if (error.message.includes('full')) {
        errorMessage += 'This problem statement is now full.';
      } else if (error.message.includes('already registered')) {
        errorMessage += 'Your team is already registered.';
      } else if (error.code === 'permission-denied') {
        errorMessage += 'Permission denied. Please check Firebase security rules.';
      } else if (error.code === 'unavailable') {
        errorMessage += 'Service temporarily unavailable. Please try again.';
      } else if (error.message.includes('network')) {
        errorMessage += 'Network error. Please check your internet connection.';
      } else {
        errorMessage += `Please try again. Error: ${error.message}`;
      }
      
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