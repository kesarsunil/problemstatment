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
    description: ''
  });
  const [addingProblem, setAddingProblem] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [realTimeConnected, setRealTimeConnected] = useState(false);

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
          problemNumber: data.problemNumber || data.problemStatementId, // Include problem number
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
          problemNumber: data.problemNumber || data.problemStatementId, // Include problem number
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
      
    } catch (error) {
      console.error('Error fetching problem statements:', error);
    }
  };

  const addProblemStatement = async (e) => {
    e.preventDefault();
    
    if (!newProblem.number.trim() || !newProblem.title.trim() || !newProblem.description.trim()) {
      alert('Please fill in problem number, title, and description');
      return;
    }
    
    // Validate problem number is 1-50
    const problemNum = parseInt(newProblem.number.trim());
    if (problemNum < 1 || problemNum > 50) {
      alert('❌ Problem number must be between 1 and 50');
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
        createdAt: serverTimestamp(),
        status: 'active',
        registrationCount: 0
      };
      
      // Use the number as the document ID
      await setDoc(doc(db, 'problem_statements', newProblem.number.trim()), problemData);
      
      // Clear form
      setNewProblem({ number: '', title: '', description: '' });
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

  // Helper function to get problem statement number from ID
  const getProblemStatementNumber = (problemStatementId) => {
    const problem = problemStatements.find(p => p.id === problemStatementId);
    return problem ? problem.number : null;
  };

  // Helper function to format team number
  const formatTeamNumber = (teamNumber) => {
    if (!teamNumber) return 'N/A';
    // If it already starts with T, just ensure proper padding
    if (teamNumber.toString().startsWith('T')) {
      const num = teamNumber.toString().substring(1);
      return `T${num.padStart(3, '0')}`;
    }
    // If it's just a number, format it properly
    return `T${teamNumber.toString().padStart(3, '0')}`;
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
    <div className="container-fluid" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', paddingTop: '2rem' }}>
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="display-6 text-primary mb-1">📊 Admin Dashboard</h1>
              <p className="text-muted mb-0">Manage Problem Statements & Monitor Team Registrations</p>
            </div>
            <div className="d-flex gap-2">
              <div className={`badge ${realTimeConnected ? 'bg-success' : 'bg-danger'} fs-6`}>
                {realTimeConnected ? '🟢 Live Updates' : '🔴 Disconnected'}
              </div>
              <button 
                onClick={downloadPDF}
                className="btn btn-success"
                disabled={registrations.length === 0}
              >
                📥 Download PDF
              </button>
              <button 
                onClick={handleLogout}
                className="btn btn-outline-secondary"
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
          <div className="card border-0 shadow-sm bg-primary text-white">
            <div className="card-body text-center">
              <h2 className="display-4 mb-0">{problemStatements.length}</h2>
              <p className="mb-0">Problem Statements</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm bg-success text-white">
            <div className="card-body text-center">
              <h2 className="display-4 mb-0">{registrations.length}</h2>
              <p className="mb-0">Team Registrations</p>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm bg-danger text-white">
            <div className="card-body text-center">
              <h2 className="display-4 mb-0">
                {problemStatements.filter(problem => {
                  const registeredTeams = registrations.filter(r => 
                    r.problemTitle === problem.title || r.problemStatementId === problem.id
                  );
                  return registeredTeams.length >= 2;
                }).length}
              </h2>
              <p className="mb-0">Full Problems</p>
            </div>
          </div>
        </div>
      </div>

      {/* ADD PROBLEM STATEMENT SECTION */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header" style={{ backgroundColor: '#e3f2fd' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h3 className="mb-0">🎯 Add New Problem Statement</h3>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn btn-success"
            >
              {showAddForm ? '❌ Cancel' : '➕ Add Problem Statement'}
            </button>
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
                    {Array.from({length: 50}, (_, i) => i + 1).map(num => (
                      <option key={num} value={num.toString()}>{num}</option>
                    ))}
                  </select>
                  <div className="form-text">
                    Choose 1-50
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
                
                <div className="col-md-12 mb-3">
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
                      setNewProblem({ number: '', title: '', description: '' });
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
                            {problem.number ? problem.number : index + 1}: {problem.title}
                          </h6>
                          <div>
                            {registeredTeams.length >= 2 ? (
                              <span className="badge bg-danger">FULL</span>
                            ) : (
                              <span className="badge bg-success">ACTIVE</span>
                            )}
                            <span className="badge bg-info ms-2">{registeredTeams.length}/2 Teams</span>
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
                          {formatTeamNumber(registration.teamNumber || registration.teamId)}
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
                            🎯 {(() => {
                              if (registration.problemNumber) {
                                return `Problem Statement ${registration.problemNumber}: ${registration.problemTitle || 'Title not available'}`;
                              }
                              return registration.problemTitle || registration.problemStatementId || 'Not specified';
                            })()}
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
      </div>
    </div>
  );
};

export default AdminDashboard;