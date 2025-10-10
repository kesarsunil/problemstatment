import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, orderBy, query, addDoc, serverTimestamp, onSnapshot, setDoc, doc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const AdminDashboard = () => {
  const [registrations, setRegistrations] = useState([]);
  const [problemStatements, setProblemStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 🔐 PASSWORD PROTECTION
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // Problem Statement Form State
  const [newProblem, setNewProblem] = useState({
    number: '',
    title: '',
    description: '',
    teamLimit: 2
  });
  const [addingProblem, setAddingProblem] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [realTimeConnected, setRealTimeConnected] = useState(false);
  const [migrating, setMigrating] = useState(false);

  // 🔐 PASSWORD AUTHENTICATION
  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === 'problem') {
      setIsAuthenticated(true);
      setPasswordError('');
      loadAllData();
    } else {
      setPasswordError('❌ Incorrect password. Please try again.');
      setPasswordInput('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPasswordInput('');
    setPasswordError('');
    setRegistrations([]);
    setProblemStatements([]);
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
      setupRealTimeListeners();
    }
  }, [isAuthenticated]);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchRegistrations(),
      fetchProblemStatements()
    ]);
    setLoading(false);
  };

  // 🔄 SETUP REAL-TIME LISTENERS
  const setupRealTimeListeners = () => {
    // Real-time registrations listener
    const registrationsRef = collection(db, 'registrations');
    const unsubscribeRegistrations = onSnapshot(registrationsRef, (snapshot) => {
      const registrationsData = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        registrationsData.push({
          id: doc.id,
          ...data,
          // Normalize data structure
          teamNumber: data.teamId || data.teamNumber,
          teamName: data.teamName,
          teamLeader: data.teamLeader,
          problemTitle: data.problemTitle || data.problemStatementId,
          timestamp: data.registeredAt || data.timestamp || data.registrationTime
        });
      });
      
      // Sort by most recent first
      registrationsData.sort((a, b) => {
        const timeA = a.timestamp?.toDate?.() || new Date(a.timestamp) || new Date();
        const timeB = b.timestamp?.toDate?.() || new Date(b.timestamp) || new Date();
        return timeB - timeA;
      });
      
      setRegistrations(registrationsData);
      setRealTimeConnected(true);
      console.log(`📊 Real-time update: ${registrationsData.length} registrations`);
    });

    // Real-time problem statements listener
    const problemsRef = collection(db, 'problem_statements');
    const unsubscribeProblems = onSnapshot(problemsRef, (snapshot) => {
      const problemsData = [];
      snapshot.forEach((doc) => {
        problemsData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort by number or creation date
      problemsData.sort((a, b) => {
        if (a.number && b.number) {
          return parseInt(a.number) - parseInt(b.number);
        }
        const timeA = a.createdAt?.toDate?.() || new Date();
        const timeB = b.createdAt?.toDate?.() || new Date();
        return timeB - timeA;
      });
      
      setProblemStatements(problemsData);
      console.log(`📋 Real-time update: ${problemsData.length} problem statements`);
    });

    return () => {
      unsubscribeRegistrations();
      unsubscribeProblems();
    };
  };

  const fetchRegistrations = async () => {
    try {
      // Try multiple query approaches for better compatibility
      let querySnapshot;
      try {
        const q = query(
          collection(db, 'registrations'),
          orderBy('registeredAt', 'desc')
        );
        querySnapshot = await getDocs(q);
      } catch (orderError) {
        console.log('Trying fallback query without ordering...');
        querySnapshot = await getDocs(collection(db, 'registrations'));
      }
      
      const registrationsData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        registrationsData.push({
          id: doc.id,
          ...data,
          // Normalize data structure for better display
          teamNumber: data.teamId || data.teamNumber,
          teamName: data.teamName,
          teamLeader: data.teamLeader,
          problemTitle: data.problemTitle || data.problemStatementId,
          timestamp: data.registeredAt || data.timestamp || data.registrationTime,
          memberDetails: data.memberDetails || []
        });
      });
      
      // Sort manually if needed
      registrationsData.sort((a, b) => {
        const timeA = a.timestamp?.toDate?.() || new Date(a.timestamp) || new Date();
        const timeB = b.timestamp?.toDate?.() || new Date(b.timestamp) || new Date();
        return timeB - timeA;
      });
      
      setRegistrations(registrationsData);
      console.log(`📊 Admin Dashboard: Loaded ${registrationsData.length} registrations`);
      
    } catch (error) {
      console.error('Error fetching registrations:', error);
      setError('Failed to load registrations. Please check your Firebase configuration.');
    }
  };

  const fetchProblemStatements = async () => {
    try {
      let querySnapshot;
      try {
        const q = query(
          collection(db, 'problem_statements'),
          orderBy('createdAt', 'desc')
        );
        querySnapshot = await getDocs(q);
      } catch (orderError) {
        console.log('Trying fallback query for problem statements...');
        querySnapshot = await getDocs(collection(db, 'problem_statements'));
      }
      
      const problemsData = [];
      querySnapshot.forEach((doc) => {
        problemsData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort by number if available, otherwise by creation date
      problemsData.sort((a, b) => {
        if (a.number && b.number) {
          return parseInt(a.number) - parseInt(b.number);
        }
        const timeA = a.createdAt?.toDate?.() || new Date();
        const timeB = b.createdAt?.toDate?.() || new Date();
        return timeB - timeA;
      });
      
      setProblemStatements(problemsData);
      console.log(`📋 Admin Dashboard: Loaded ${problemsData.length} problem statements`);
      console.log('📊 Problem statements data:', problemsData.map(p => ({
        id: p.id,
        title: p.title,
        teamLimit: p.teamLimit,
        hasTeamLimit: p.hasOwnProperty('teamLimit')
      })));
      
    } catch (error) {
      console.error('Error fetching problem statements:', error);
    }
  };

  // 🔄 SYNC COUNTERS WITH ACTUAL REGISTRATIONS
  const syncCountersWithRegistrations = async () => {
    if (migrating) return;
    
    try {
      setMigrating(true);
      console.log('🔄 Syncing problem counters with actual registrations...');
      
      // Get all registrations
      const registrationsSnapshot = await getDocs(collection(db, 'registrations'));
      const problemCounts = {};
      
      // Count actual registrations per problem
      registrationsSnapshot.forEach((doc) => {
        const data = doc.data();
        const problemId = data.problemStatementId;
        if (problemId) {
          problemCounts[problemId] = (problemCounts[problemId] || 0) + 1;
        }
      });
      
      // Update counter documents to match actual registrations
      const updates = [];
      for (const [problemId, count] of Object.entries(problemCounts)) {
        const counterRef = doc(db, 'problem_counters', problemId);
        updates.push(
          setDoc(counterRef, { 
            count: count, 
            updated: Date.now(),
            problemId: problemId,
            lastSync: new Date().toISOString()
          }, { merge: true })
        );
        console.log(`📊 Problem ${problemId}: Setting counter to ${count} registrations`);
      }
      
      if (updates.length > 0) {
        await Promise.all(updates);
        console.log(`✅ Counter sync complete! Updated ${updates.length} problem counters`);
        alert(`✅ Counter Sync Complete!\n\nSynced ${updates.length} problem counters with actual registrations.\n\nThe display should now show correct counts.`);
        
        // Reload data
        fetchProblemStatements();
        fetchRegistrations();
      } else {
        console.log('ℹ️ No registrations found to sync');
        alert('ℹ️ No registrations found to sync counters with.');
      }
      
    } catch (error) {
      console.error('❌ Counter sync error:', error);
      alert('❌ Counter sync failed: ' + error.message);
    } finally {
      setMigrating(false);
    }
  };

  // 🔄 MIGRATE EXISTING PROBLEM STATEMENTS TO ADD TEAM LIMIT
  const migrateExistingProblems = async () => {
    if (migrating) return;
    
    try {
      setMigrating(true);
      console.log('🔄 Starting migration of existing problem statements...');
      
      const querySnapshot = await getDocs(collection(db, 'problem_statements'));
      const updates = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.hasOwnProperty('teamLimit')) {
          console.log(`📝 Migrating problem ${doc.id}: "${data.title}" - adding teamLimit: 2`);
          updates.push(
            setDoc(doc.ref, { ...data, teamLimit: 2 }, { merge: true })
          );
        }
      });
      
      if (updates.length > 0) {
        await Promise.all(updates);
        console.log(`✅ Migration complete! Updated ${updates.length} problem statements`);
        alert(`✅ Migration Complete!\n\nUpdated ${updates.length} problem statements with default team limit of 2.\n\nPlease refresh the page to see the changes.`);
        
        // Reload data
        fetchProblemStatements();
      } else {
        console.log('ℹ️ No migration needed - all problem statements already have teamLimit');
        alert('ℹ️ All problem statements already have team limits set.');
      }
      
    } catch (error) {
      console.error('❌ Migration error:', error);
      alert('❌ Migration failed: ' + error.message);
    } finally {
      setMigrating(false);
    }
  };

  const addProblemStatement = async (e) => {
    e.preventDefault();
    
    if (!newProblem.number.trim() || !newProblem.title.trim() || !newProblem.description.trim()) {
      alert('Please fill in problem number, title, and description');
      return;
    }
    
    // Validate problem number is 1-8
    const problemNum = parseInt(newProblem.number.trim());
    if (problemNum < 1 || problemNum > 8) {
      alert('❌ Problem number must be between 1 and 8');
      return;
    }
    
    // Check if problem number already exists
    const existingProblem = problemStatements.find(p => p.number === newProblem.number.trim());
    if (existingProblem) {
      alert(`❌ Problem ${newProblem.number} already exists. Please use a different number.`);
      return;
    }
    
    try {
      setAddingProblem(true);
      
      const problemData = {
        number: newProblem.number.trim(),
        title: newProblem.title.trim(),
        description: newProblem.description.trim(),
        teamLimit: newProblem.teamLimit || 2,
        createdAt: serverTimestamp(),
        status: 'active',
        registrationCount: 0
      };
      
      // Use the number as the document ID
      await setDoc(doc(db, 'problem_statements', newProblem.number.trim()), problemData);
      
      // Clear form
      setNewProblem({ number: '', title: '', description: '', teamLimit: 2 });
      setShowAddForm(false);
      
      alert('✅ Problem Statement added successfully!\nIt will now appear on the home page for team registration.');
      
    } catch (error) {
      console.error('Error adding problem statement:', error);
      alert('❌ Error adding problem statement: ' + error.message);
    } finally {
      setAddingProblem(false);
    }
  };

  const downloadPDF = () => {
    if (registrations.length === 0) {
      alert('No registrations to download.');
      return;
    }

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Problem Statement Registrations', 14, 22);
    
    // Add generation date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Prepare table data
    const tableData = registrations.map((reg, index) => [
      index + 1,
      reg.teamNumber,
      reg.teamName,
      reg.teamLeader,
      reg.problemStatementTitle,
      reg.timestamp ? new Date(reg.timestamp.toDate()).toLocaleDateString() : 'N/A'
    ]);
    
    // Add table
    doc.autoTable({
      head: [['S.No', 'Team Number', 'Team Name', 'Team Leader', 'Problem Statement', 'Date']],
      body: tableData,
      startY: 35,
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { top: 35 }
    });
    
    // Save the PDF
    doc.save('registrations.pdf');
  };

  const refreshData = () => {
    fetchRegistrations();
  };

  // 🔐 PASSWORD LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="container-fluid" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
        <div className="row justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
          <div className="col-md-6 col-lg-4">
            <div className="card shadow-lg border-0">
              <div className="card-header text-center" style={{ backgroundColor: '#2c3e50', color: 'white' }}>
                <h3 className="mb-0">🔐 Admin Access</h3>
                <p className="mb-0 mt-2" style={{ fontSize: '14px', opacity: '0.9' }}>
                  Protected Dashboard
                </p>
              </div>
              <div className="card-body p-4">
                <form onSubmit={handlePasswordSubmit}>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Enter Admin Password:</label>
                    <input
                      type="password"
                      className="form-control form-control-lg"
                      placeholder="Enter password..."
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      required
                      autoFocus
                      style={{ borderRadius: '8px' }}
                    />
                  </div>
                  
                  {passwordError && (
                    <div className="alert alert-danger py-2" style={{ fontSize: '14px' }}>
                      {passwordError}
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg w-100"
                    style={{ backgroundColor: '#2c3e50', borderColor: '#2c3e50', borderRadius: '8px' }}
                  >
                    🚀 Access Dashboard
                  </button>
                  
                  <div className="text-center mt-3">
                    <small className="text-muted">
                      📊 Problem Statement Registration System Admin Panel
                    </small>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-fluid d-flex justify-content-center align-items-center" style={{height: '100vh'}}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status" style={{width: '3rem', height: '3rem'}}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5 className="text-muted">Loading Admin Dashboard...</h5>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="alert alert-danger">
              <h4 className="alert-heading">Error</h4>
              <p>{error}</p>
              <hr />
              <p className="mb-0">
                Please make sure you have configured Firebase properly with your project credentials.
              </p>
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
      {/* TECHFRONTIER Header */}
      <div style={{
        background: 'linear-gradient(90deg, #8B0000 0%, #CD5C5C 50%, #8B0000 100%)',
        padding: '2rem 0',
        marginBottom: '2rem',
        boxShadow: '0 4px 20px rgba(139, 0, 0, 0.3)'
      }}>
        <div className="container">
          <div className="text-center">
            <h1 style={{
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: 'bold',
              color: '#FFFFFF',
              textShadow: '3px 3px 6px rgba(0,0,0,0.5)',
              letterSpacing: '1px',
              marginBottom: '0.5rem'
            }}>
              📊 ADMIN CONTROL CENTER
            </h1>
            <p style={{
              fontSize: '1.2rem',
              color: '#E0E0E0',
              marginBottom: '1.5rem'
            }}>
              TECHFRONTIER 2K25 Management Dashboard
            </p>
            
            <div className="d-flex justify-content-center gap-3 flex-wrap">
              <div style={{
                backgroundColor: 'rgba(0,0,0,0.4)',
                border: '2px solid #00FF00',
                borderRadius: '25px',
                padding: '0.5rem 1rem',
                backdropFilter: 'blur(10px)'
              }}>
                <span style={{color: realTimeConnected ? '#00FF00' : '#FF0000', fontWeight: 'bold'}}>
                  {realTimeConnected ? '🟢 LIVE UPDATES' : '🔴 DISCONNECTED'}
                </span>
              </div>
              
              <button 
                onClick={downloadPDF}
                disabled={registrations.length === 0}
                style={{
                  backgroundColor: registrations.length === 0 ? '#6c757d' : '#28a745',
                  border: 'none',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '25px',
                  fontWeight: 'bold',
                  cursor: registrations.length === 0 ? 'not-allowed' : 'pointer',
                  boxShadow: '0 3px 10px rgba(40, 167, 69, 0.3)'
                }}
              >
                📥 DOWNLOAD PDF
              </button>
              
              <button 
                onClick={handleLogout}
                style={{
                  backgroundColor: 'transparent',
                  border: '2px solid #FFD700',
                  color: '#FFD700',
                  padding: '0.5rem 1rem',
                  borderRadius: '25px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </div>

        {/* Statistics Cards */}
        <div className="row mb-4">
          <div className="col-md-4">
            <div style={{
              background: 'linear-gradient(145deg, rgba(23, 162, 184, 0.2), rgba(23, 162, 184, 0.1))',
              backdropFilter: 'blur(15px)',
              border: '2px solid rgba(23, 162, 184, 0.3)',
              borderRadius: '20px',
              padding: '2rem',
              textAlign: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
            }}>
              <h2 style={{
                fontSize: '3rem',
                fontWeight: 'bold',
                color: '#17a2b8',
                marginBottom: '0.5rem',
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
              }}>
                {problemStatements.length}
              </h2>
              <p style={{color: '#FFFFFF', fontSize: '1.1rem', margin: 0, fontWeight: 'bold'}}>
                Problem Statements
              </p>
            </div>
          </div>
          
          <div className="col-md-4">
            <div style={{
              background: 'linear-gradient(145deg, rgba(40, 167, 69, 0.2), rgba(40, 167, 69, 0.1))',
              backdropFilter: 'blur(15px)',
              border: '2px solid rgba(40, 167, 69, 0.3)',
              borderRadius: '20px',
              padding: '2rem',
              textAlign: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
            }}>
              <h2 style={{
                fontSize: '3rem',
                fontWeight: 'bold',
                color: '#28a745',
                marginBottom: '0.5rem',
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
              }}>
                {registrations.length}
              </h2>
              <p style={{color: '#FFFFFF', fontSize: '1.1rem', margin: 0, fontWeight: 'bold'}}>
                Team Registrations
              </p>
            </div>
          </div>

          <div className="col-md-4">
            <div style={{
              background: 'linear-gradient(145deg, rgba(220, 53, 69, 0.2), rgba(220, 53, 69, 0.1))',
              backdropFilter: 'blur(15px)',
              border: '2px solid rgba(220, 53, 69, 0.3)',
              borderRadius: '20px',
              padding: '2rem',
              textAlign: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
            }}>
              <h2 style={{
                fontSize: '3rem',
                fontWeight: 'bold',
                color: '#dc3545',
                marginBottom: '0.5rem',
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
              }}>
                {problemStatements.filter(problem => {
                  const registeredTeams = registrations.filter(r => 
                    r.problemTitle === problem.title || r.problemStatementId === problem.id
                  );
                  return registeredTeams.length >= (problem.teamLimit || 2);
                }).length}
              </h2>
              <p style={{color: '#FFFFFF', fontSize: '1.1rem', margin: 0, fontWeight: 'bold'}}>
                Full Problems
              </p>
            </div>
          </div>
        </div>

      {/* ADD PROBLEM STATEMENT SECTION */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header" style={{ backgroundColor: '#e3f2fd' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h3 className="mb-0">🎯 Add New Problem Statement</h3>
            <div className="d-flex gap-2">
              <button
                onClick={syncCountersWithRegistrations}
                className="btn btn-danger btn-sm"
                disabled={migrating}
                title="Sync counter display with actual registrations (fixes 3/2 issues)"
              >
                {migrating ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    Syncing...
                  </>
                ) : (
                  '🔄 Fix Counts'
                )}
              </button>
              <button
                onClick={migrateExistingProblems}
                className="btn btn-warning btn-sm"
                disabled={migrating}
                title="Add teamLimit field to existing problem statements that don't have it"
              >
                {migrating ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    Migrating...
                  </>
                ) : (
                  '🔄 Fix Limits'
                )}
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="btn btn-success"
              >
                {showAddForm ? '❌ Cancel' : '➕ Add Problem Statement'}
              </button>
            </div>
          </div>
        </div>

        {showAddForm && (
          <div className="card-body">
            <form onSubmit={addProblemStatement}>
              <div className="row">
                <div className="col-md-2 mb-3">
                  <label className="form-label fw-bold">Problem Number *</label>
                  <select
                    className="form-control"
                    value={newProblem.number}
                    onChange={(e) => setNewProblem(prev => ({...prev, number: e.target.value}))}
                    required
                  >
                    <option value="">Select...</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                    <option value="7">7</option>
                    <option value="8">8</option>
                  </select>
                  <div className="form-text">
                    Choose 1-8
                  </div>
                </div>
                
                <div className="col-md-10 mb-3">
                  <label className="form-label fw-bold">Problem Statement Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter problem statement title..."
                    value={newProblem.title}
                    onChange={(e) => setNewProblem(prev => ({...prev, title: e.target.value}))}
                    required
                    maxLength="100"
                  />
                  <div className="form-text">
                    Characters: {newProblem.title.length}/100
                  </div>
                </div>
                
                <div className="col-md-10 mb-3">
                  <label className="form-label fw-bold">Problem Statement Description *</label>
                  <textarea
                    className="form-control"
                    rows="4"
                    placeholder="Enter detailed description of the problem statement..."
                    value={newProblem.description}
                    onChange={(e) => setNewProblem(prev => ({...prev, description: e.target.value}))}
                    required
                    maxLength="500"
                  ></textarea>
                  <div className="form-text">
                    Characters: {newProblem.description.length}/500
                  </div>
                </div>
                
                <div className="col-md-2 mb-3">
                  <label className="form-label fw-bold">Team Limit *</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Max teams"
                    value={newProblem.teamLimit}
                    onChange={(e) => setNewProblem(prev => ({...prev, teamLimit: parseInt(e.target.value) || 1}))}
                    required
                    min="1"
                    max="20"
                  />
                  <div className="form-text">
                    Max: 20 teams
                  </div>
                </div>
                
                <div className="col-md-12">
                  <button
                    type="submit"
                    className="btn btn-primary me-2 btn-lg"
                    disabled={addingProblem}
                  >
                    {addingProblem ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Adding...
                      </>
                    ) : (
                      '� Add to Home Page'
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-lg"
                    onClick={() => {
                      setNewProblem({ number: '', title: '', description: '', teamLimit: 2 });
                      setShowAddForm(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Current Problem Statements List */}
        <div className="card-body border-top">
          <h5 className="mb-3">📋 Current Problem Statements ({problemStatements.length})</h5>
          {problemStatements.length === 0 ? (
            <div className="text-center py-4">
              <div className="alert alert-info">
                <h6>📋 No Problem Statements Added Yet</h6>
                <p className="mb-0">Add problem statements above to make them available for team registration on the home page.</p>
              </div>
            </div>
          ) : (
            <div className="row">
              {problemStatements.map((problem, index) => {
                const registeredTeams = registrations.filter(r => 
                  r.problemTitle === problem.title || r.problemStatementId === problem.id
                );
                
                return (
                  <div key={problem.id} className="col-md-6 mb-3">
                    <div className="card border h-100">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <h6 className="card-title text-primary mb-1">
                            Problem {problem.number ? problem.number : index + 1}: {problem.title}
                          </h6>
                          <div>
                            {registeredTeams.length >= (problem.teamLimit || 2) ? (
                              <span className="badge bg-danger">FULL</span>
                            ) : (
                              <span className="badge bg-success">ACTIVE</span>
                            )}
                            <span className="badge bg-info ms-2">{registeredTeams.length}/{problem.teamLimit || 2} Teams</span>
                          </div>
                        </div>
                        <p className="card-text text-muted small mb-2">
                          {problem.description.length > 100 
                            ? problem.description.substring(0, 100) + '...' 
                            : problem.description
                          }
                        </p>
                        <div className="d-flex justify-content-between align-items-center">
                          <small className="text-muted">
                            Added: {problem.createdAt 
                              ? new Date(problem.createdAt.toDate()).toLocaleDateString()
                              : 'Recently'
                            }
                          </small>
                          <small className="text-info">
                            📊 {registeredTeams.length} registrations
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* TEAM REGISTRATIONS SECTION */}
      <div className="card shadow-sm">
        <div className="card-header" style={{ backgroundColor: '#f0f8ff' }}>
          <h3 className="mb-0">👥 Team Registration Details</h3>
          <p className="mb-0 text-muted">Complete details of all registered teams with their selected problem statements</p>
        </div>
        <div className="card-body">
          <div className="mb-3 d-flex justify-content-between align-items-center">
            <p className="text-muted mb-0">
              Total Registrations: <span className="fw-bold fs-5 text-primary">{registrations.length}</span>
            </p>
            <button 
              onClick={loadAllData}
              className="btn btn-outline-primary btn-sm"
            >
              🔄 Refresh Data
            </button>
          </div>

          {registrations.length === 0 ? (
            <div className="text-center py-5">
              <div className="alert alert-info">
                <h5 className="text-muted">📝 No Team Registrations Yet</h5>
                <p className="text-muted mb-0">Teams will appear here once they register for problem statements from the home page.</p>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead className="table-dark">
                  <tr>
                    <th width="5%">S.No</th>
                    <th width="10%">Team ID</th>
                    <th width="15%">Team Details</th>
                    <th width="15%">Team Leader</th>
                    <th width="25%">Problem Statement Selected</th>
                    <th width="15%">Registration Time</th>
                    <th width="15%">Members</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((registration, index) => (
                    <tr key={registration.id}>
                      <td className="fw-bold">{index + 1}</td>
                      <td>
                        <span className="badge bg-primary fs-6">
                          {registration.teamNumber || registration.teamId}
                        </span>
                      </td>
                      <td>
                        <div>
                          <strong className="text-primary">{registration.teamName}</strong>
                          <br />
                          <small className="text-muted">
                            {registration.teamMembers ? `${registration.teamMembers} members` : 'Team size not specified'}
                          </small>
                        </div>
                      </td>
                      <td>
                        <strong>{registration.teamLeader}</strong>
                      </td>
                      <td>
                        <div>
                          <strong className="text-success">
                            🎯 {registration.problemTitle || registration.problemStatementId || 'Not specified'}
                          </strong>
                          <br />
                          <small className="text-info">
                            {registration.problemStatementId && (
                              <>ID: {registration.problemStatementId.substring(0, 12)}...</>
                            )}
                          </small>
                        </div>
                      </td>
                      <td>
                        <small>
                          {registration.timestamp 
                            ? (() => {
                                try {
                                  const date = registration.timestamp.toDate ? 
                                    registration.timestamp.toDate() : 
                                    new Date(registration.timestamp);
                                  return date.toLocaleString();
                                } catch (e) {
                                  return 'Recently';
                                }
                              })()
                            : 'Recently'
                          }
                        </small>
                      </td>
                      <td>
                        {registration.memberDetails && registration.memberDetails.length > 0 ? (
                          <div>
                            <small className="text-success fw-bold">
                              {registration.memberDetails.length} members
                            </small>
                            <div className="mt-1">
                              {registration.memberDetails.map((member, idx) => (
                                <small key={idx} className="d-block text-info">
                                  {member.name} ({member.rollNumber})
                                </small>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <small className="text-muted">Details not provided</small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="text-center py-4" style={{color: '#CCCCCC', marginTop: '3rem'}}>
          <p className="mb-0">DESIGNED AND DEVELOPED BY WEB DEV TEAM CYBERNERDS KARE</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;