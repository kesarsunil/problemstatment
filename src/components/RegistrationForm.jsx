import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Registered teams data from CSV
const REGISTERED_TEAMS = [
  { teamId: 'T001', teamName: 'Team Localhost', teamLeader: 'Sivaiahgari Chandra Kanth Reddy', registrationId: '99230040771' },
  { teamId: 'T002', teamName: 'Team salaar', teamLeader: 'R.Arjun kumar', registrationId: '99230040747' },
  { teamId: 'T003', teamName: 'Team Taitan\'s', teamLeader: 'Varthyavath Shiva Kumar', registrationId: '99230041082' },
  { teamId: 'T004', teamName: 'Codecrafters', teamLeader: 'Boge Deepika', registrationId: '99230040496' },
  { teamId: 'T005', teamName: 'Fire storm', teamLeader: 'MAA TEJA NAIK', registrationId: '99230040220' },
  { teamId: 'T006', teamName: 'KALKI', teamLeader: 'Sanjeevula varun', registrationId: '99230040853' },
  { teamId: 'T007', teamName: 'Dynamites', teamLeader: 'Jay', registrationId: '99230041197' },
  { teamId: 'T008', teamName: 'CYBERTRAN', teamLeader: 'KABILASH K N', registrationId: '99220040553' },
  { teamId: 'T009', teamName: 'TEAM GALAXY', teamLeader: 'BADIGA TEJESH CHALAPATHI', registrationId: '99230040832' },
  { teamId: 'T010', teamName: 'Coding Ninjas', teamLeader: 'Anala Surendra', registrationId: '9922005015' },
  { teamId: 'T011', teamName: 'Tech Vampires', teamLeader: 'NELLURI UDAY KIRAN', registrationId: '99230041081' },
  { teamId: 'T012', teamName: 'TEAM KANYARAASI', teamLeader: 'MANDALURU BABJI', registrationId: '99230040229' },
  { teamId: 'T013', teamName: 'AruMeXa', teamLeader: 'S.Arul Kumaran', registrationId: '99220041352' },
  { teamId: 'T014', teamName: 'Fire Storm', teamLeader: 'Kokkera Srinivas', registrationId: '9923005096' },
  { teamId: 'T015', teamName: 'Kingdom', teamLeader: 'K.Siva sai Royal', registrationId: '9922008042' },
  { teamId: 'T016', teamName: 'Roger pirates', teamLeader: 'Chekuri Sai Chandra', registrationId: '99230040188' },
  { teamId: 'T017', teamName: 'BROOKLYN', teamLeader: 'Lalith sagar akunuru', registrationId: '99230040034' },
  { teamId: 'T018', teamName: 'Echo', teamLeader: 'Pitchuka Rahul Devanga', registrationId: '99220040963' },
  { teamId: 'T019', teamName: 'Pioneers', teamLeader: 'Ravuri Krishna sai vardhan', registrationId: '99220040709' },
  { teamId: 'T020', teamName: 'White wolfs', teamLeader: 'Gurusamy P', registrationId: '9923017023' },
  { teamId: 'T021', teamName: 'Black Clover', teamLeader: 'MARNENI TRINADH', registrationId: '99220041041' },
  { teamId: 'T022', teamName: 'Zorr', teamLeader: 'CHUKKALURU YASWANTH KUMAR', registrationId: '99230040287' },
  { teamId: 'T023', teamName: 'Rise And Grind', teamLeader: 'SHAIK AFRID BASHA', registrationId: '99220041871' },
  { teamId: 'T024', teamName: 'SKATERS', teamLeader: 'Turpu Pranadeep Reddy', registrationId: '99230041004' },
  { teamId: 'T025', teamName: 'TEAM SAMOSA', teamLeader: 'Uppu Vishnu Brahmayya', registrationId: '99230041061' },
  { teamId: 'T026', teamName: 'Jk Warriors', teamLeader: 'Abhijot Singh', registrationId: '99240041414' },
  { teamId: 'T027', teamName: 'LEO', teamLeader: 'ETIKALA SRAVAN KUMAR REDDY', registrationId: '99230041080' },
  { teamId: 'T028', teamName: 'Black Squad', teamLeader: 'Venkata Sai Manoj naidu', registrationId: '9922008299' },
  { teamId: 'T029', teamName: 'Gym rats', teamLeader: 'BADAM NARENDRA REDDY', registrationId: '99220041116' },
  { teamId: 'T030', teamName: 'Nextlinkers', teamLeader: 'Nischal S Tumbeti', registrationId: '99230041300' },
  { teamId: 'T031', teamName: 'POWER HOUSE', teamLeader: 'Mavilla . Venkata Hemadri', registrationId: '99230040372' },
  { teamId: 'T032', teamName: 'Ctrl Alt Defeat', teamLeader: 'ASHWIN S', registrationId: '99220042080' },
  { teamId: 'T033', teamName: 'Code Fusion', teamLeader: 'DONGARA. MATHEWS KUMAR', registrationId: '99230040925' },
  { teamId: 'T034', teamName: 'STRAW HATS', teamLeader: 'PINJARI ABDUL RAHIMAN', registrationId: '99230040728' },
  { teamId: 'T035', teamName: 'NEW HUNTERS', teamLeader: 'MOTAMARRI VEERENDRA KUMAR', registrationId: '9923005110' },
  { teamId: 'T036', teamName: 'Trailblazers', teamLeader: 'SRIDHAR R', registrationId: '99230041102' },
  { teamId: 'T037', teamName: 'Team Demons', teamLeader: 'KADE KAMALAKAR', registrationId: '9824005014' },
  { teamId: 'T038', teamName: 'Manoj Hariharan R', teamLeader: 'Manoj Hariharan R', registrationId: '99220041614' },
  { teamId: 'T039', teamName: 'Incredible', teamLeader: 'Manjula Tharun kumar', registrationId: '99220040624' },
  { teamId: 'T040', teamName: 'WASHI', teamLeader: 'C.SAINATH REDDY', registrationId: '99220040038' },
  { teamId: 'T041', teamName: 'Vision X', teamLeader: 'M Vishwak Sai', registrationId: '9923005157' },
  { teamId: 'T042', teamName: 'CodeXplorers', teamLeader: 'PASAM VISHNU VARDHAN', registrationId: '99230041036' },
  { teamId: 'T043', teamName: 'Alpha V', teamLeader: 'DUGGINENI DEVI SRUTHI', registrationId: '99230040530' },
  { teamId: 'T044', teamName: 'Challengers', teamLeader: 'Bhukya Neeraj Kumar', registrationId: '99230040492' },
  { teamId: 'T045', teamName: 'Team OMI', teamLeader: 'THATIKONDU VENKATA SAI CHARAN', registrationId: '99230040196' },
  { teamId: 'T046', teamName: 'Asthra', teamLeader: 'RAMISETTY DIVYA TEJA', registrationId: '99230040413' },
  { teamId: 'T047', teamName: 'V12', teamLeader: 'GARLAPATI HANMANTH SAI RAM', registrationId: '99230040836' },
  { teamId: 'T048', teamName: 'Team Inevitables', teamLeader: 'Santimalla Lakshmidhar Reddy', registrationId: '99240041393' },
  { teamId: 'T049', teamName: 'Team Nellore', teamLeader: 'KODE DEEPAK', registrationId: '99240041365' },
  { teamId: 'T050', teamName: 'TEAM DEVARA', teamLeader: 'Matli Lakshmi Prasanna Kumar Reddy', registrationId: '99230040135' },
  { teamId: 'T051', teamName: 'Code Royals', teamLeader: 'Besta Charitha', registrationId: '99230040491' },
  { teamId: 'T052', teamName: 'TEAM SPIRIT', teamLeader: 'Dhudekula Zaheer', registrationId: '99230040524' },
  { teamId: 'T053', teamName: 'TARGARYEN', teamLeader: 'Varugu MD Anees', registrationId: '99230040448' },
  { teamId: 'T054', teamName: 'Black squad', teamLeader: 'A SAM JOEL', registrationId: '9924051017' },
  { teamId: 'T055', teamName: 'TEAM VLC', teamLeader: 'KATTA VEERANJINEYULU', registrationId: '99240040514' },
  { teamId: 'T056', teamName: 'CLUTCH GODS', teamLeader: 'T.Chandra shekar', registrationId: '99230040887' },
  { teamId: 'T057', teamName: 'Shadowforce', teamLeader: 'Kasaraneni Chandra sen', registrationId: '99230040333' },
  { teamId: 'T058', teamName: 'Hack Squad', teamLeader: 'Yerra Thrinesh', registrationId: '99230040187' },
  { teamId: 'T059', teamName: 'Coders', teamLeader: 'Kanti Varun Venkat', registrationId: '99230040328' },
  { teamId: 'T060', teamName: 'Team Rocks', teamLeader: 'SAYED AFAN ALI', registrationId: '99230041194' },
  { teamId: 'T061', teamName: 'Apx Gp', teamLeader: 'Boppadala.NagaSanjay', registrationId: '9824005007' },
  { teamId: 'T062', teamName: 'TEAM APEX', teamLeader: 'APPALA VENKATA SAI NIKHIL', registrationId: '9824005002' },
  { teamId: 'T063', teamName: 'ALCO NINJAS', teamLeader: 'BATTALA DHARANEESWAR', registrationId: '99230040267' },
  { teamId: 'T064', teamName: 'Gen-z core', teamLeader: 'MARRI.UDAY RAJA SEKHAR REDDY', registrationId: '9923008044' },
  { teamId: 'T065', teamName: 'DREAM CODERS', teamLeader: 'VANGA VENKATA CHARAN SIVA KUMAR', registrationId: '99220041755' },
  { teamId: 'T066', teamName: 'Debug Thugs', teamLeader: 'JUNNURU AKHIL VANKATA SATYA KARTHIK', registrationId: '99230040581' },
  { teamId: 'T067', teamName: 'Team Special', teamLeader: 'Reserved Team', registrationId: 'RESERVE001' }
];

const RegistrationForm = () => {
  const [formData, setFormData] = useState({
    teamId: '',
    teamName: '',
    teamLeader: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // If team is selected, auto-populate other fields
    if (name === 'teamId') {
      const selectedTeam = REGISTERED_TEAMS.find(team => team.teamId === value);
      if (selectedTeam) {
        setFormData({
          teamId: value,
          teamName: selectedTeam.teamName,
          teamLeader: selectedTeam.teamLeader
        });
      } else {
        setFormData({
          teamId: value,
          teamName: '',
          teamLeader: ''
        });
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const checkTeamAlreadyRegistered = async (teamId) => {
    try {
      // Check if team has already registered for ANY problem
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

  // Removed localStorage-based access tracking - only check actual Firebase registrations

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.teamId.trim()) {
      newErrors.teamId = 'Team selection is required';
    }
    
    if (!formData.teamName.trim()) {
      newErrors.teamName = 'Team Name is required';
    }
    
    if (!formData.teamLeader.trim()) {
      newErrors.teamLeader = 'Team Leader Name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      setLoading(true);
      
      try {
        // STRICT REGISTRATION CHECK: Verify team hasn't registered for any problem
        const isAlreadyRegistered = await checkTeamAlreadyRegistered(formData.teamId);
        if (isAlreadyRegistered) {
          alert('🚫 REGISTRATION BLOCKED: Your team has already registered for a problem statement. Each team can only register once.');
          setLoading(false);
          return;
        }

        // Navigate to problem selection
        const teamDataEncoded = btoa(JSON.stringify(formData));
        navigate(`/problems/${teamDataEncoded}`);
        
      } catch (error) {
        console.error('Error during navigation:', error);
        alert('Error processing request. Please try again.');
        setLoading(false);
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #8B0000 0%, #CD5C5C 30%, #8B0000 100%)',
      padding: '2rem 0'
    }}>
      {/* Hero Section */}
      <div className="container text-center py-5">
        <h1 style={{
          fontSize: 'clamp(2.5rem, 6vw, 4rem)',
          fontWeight: 'bold',
          color: '#FFFFFF',
          textShadow: '3px 3px 6px rgba(0,0,0,0.5)',
          letterSpacing: '2px',
          marginBottom: '1rem'
        }}>
          TECHFRONTIER <span style={{color: '#FFD700'}}>2K25</span>
        </h1>
        
        <p style={{
          fontSize: '1.2rem',
          color: '#E0E0E0',
          marginBottom: '2rem'
        }}>
          Register Your Team for the Ultimate Hackathon Challenge
        </p>

        {/* Event Info Cards */}
        <div className="row justify-content-center g-3 mb-5">
          <div className="col-md-3">
            <div style={{
              backgroundColor: 'rgba(0,0,0,0.4)',
              border: '2px solid #FF4444',
              borderRadius: '15px',
              padding: '1.5rem',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{fontSize: '1.5rem', marginBottom: '0.5rem'}}>📅</div>
              <h6 style={{color: '#FF6666', fontWeight: 'bold', marginBottom: '0.5rem'}}>DATE</h6>
              <p style={{color: 'white', fontSize: '0.9rem', margin: 0}}>Oct 11-12, 2025</p>
            </div>
          </div>
          <div className="col-md-3">
            <div style={{
              backgroundColor: 'rgba(0,0,0,0.4)',
              border: '2px solid #FF4444',
              borderRadius: '15px',
              padding: '1.5rem',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{fontSize: '1.5rem', marginBottom: '0.5rem'}}>⏰</div>
              <h6 style={{color: '#FF6666', fontWeight: 'bold', marginBottom: '0.5rem'}}>DURATION</h6>
              <p style={{color: 'white', fontSize: '0.9rem', margin: 0}}>24 Hours</p>
            </div>
          </div>
          <div className="col-md-3">
            <div style={{
              backgroundColor: 'rgba(0,0,0,0.4)',
              border: '2px solid #FF4444',
              borderRadius: '15px',
              padding: '1.5rem',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{fontSize: '1.5rem', marginBottom: '0.5rem'}}>🏆</div>
              <h6 style={{color: '#FF6666', fontWeight: 'bold', marginBottom: '0.5rem'}}>PRIZE</h6>
              <p style={{color: 'white', fontSize: '0.9rem', margin: 0}}>₹20,000</p>
            </div>
          </div>
        </div>
      </div>

      {/* Registration Form */}
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div style={{
              backgroundColor: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(15px)',
              border: '2px solid rgba(205, 92, 92, 0.3)',
              borderRadius: '20px',
              padding: '2rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
            }}>
              <h2 style={{
                textAlign: 'center',
                marginBottom: '2rem',
                color: '#FFFFFF',
                fontSize: '2rem',
                fontWeight: 'bold'
              }}>
                🏆 Team Registration
              </h2>
            
              {/* CRITICAL REGISTRATION WARNING */}
              <div style={{
                backgroundColor: 'rgba(255, 193, 7, 0.2)',
                border: '2px solid #FFC107',
                borderRadius: '15px',
                padding: '1.5rem',
                marginBottom: '2rem',
                backdropFilter: 'blur(10px)'
              }}>
                <h5 style={{color: '#FFD700', fontWeight: 'bold', marginBottom: '1rem'}}>
                  ⚠️ CRITICAL: ONE-TIME REGISTRATION ONLY
                </h5>
                <p style={{color: '#FFFFFF', marginBottom: '0.5rem'}}>
                  <strong>⛔ Each team can register for ONLY ONE problem statement!</strong>
                </p>
                <p style={{color: '#FFFFFF', marginBottom: '0.5rem'}}>
                  <strong>🔒 Once you select a problem, you cannot change or return.</strong>
                </p>
                <p style={{color: '#FFFFFF', marginBottom: '0'}}>
                  <strong>🎯 Choose your team carefully before proceeding!</strong>
                </p>
              </div>
              
              <div style={{
                backgroundColor: 'rgba(23, 162, 184, 0.2)',
                border: '2px solid #17A2B8',
                borderRadius: '15px',
                padding: '1rem',
                marginBottom: '2rem',
                textAlign: 'center',
                backdropFilter: 'blur(10px)'
              }}>
                <strong style={{color: '#FFFFFF'}}>
                  📋 All {REGISTERED_TEAMS.length} teams are loaded. Select your registered team from dropdown.
                </strong>
              </div>
            
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="teamId" style={{
                    color: '#FFFFFF',
                    fontWeight: 'bold',
                    marginBottom: '0.5rem',
                    display: 'block'
                  }}>
                    <i className="fas fa-users"></i> Select Your Team <span style={{color: '#FF6B6B'}}>*</span>
                  </label>
                  <select
                    id="teamId"
                    name="teamId"
                    value={formData.teamId}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: errors.teamId ? '2px solid #FF6B6B' : '2px solid rgba(205, 92, 92, 0.5)',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      color: '#FFFFFF',
                      fontSize: '1rem',
                      backdropFilter: 'blur(10px)',
                      outline: 'none'
                    }}
                  >
                    <option value="" style={{backgroundColor: '#333', color: '#fff'}}>
                      -- Choose your team (ONE-TIME REGISTRATION) --
                    </option>
                    {REGISTERED_TEAMS.map(team => (
                      <option key={team.teamId} value={team.teamId} style={{backgroundColor: '#333', color: '#fff'}}>
                        {team.teamId} - {team.teamName}
                      </option>
                    ))}
                  </select>
                  {errors.teamId && (
                    <div style={{color: '#FF6B6B', fontSize: '0.875rem', marginTop: '0.5rem'}}>
                      {errors.teamId}
                    </div>
                  )}
                </div>

                {formData.teamId && (
                  <>
                    <div className="mb-4">
                      <label htmlFor="teamName" style={{
                        color: '#FFFFFF',
                        fontWeight: 'bold',
                        marginBottom: '0.5rem',
                        display: 'block'
                      }}>
                        <i className="fas fa-flag"></i> Team Name
                      </label>
                      <input
                        type="text"
                        id="teamName"
                        name="teamName"
                        value={formData.teamName}
                        readOnly
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          border: '2px solid rgba(40, 167, 69, 0.5)',
                          backgroundColor: 'rgba(40, 167, 69, 0.1)',
                          color: '#FFFFFF',
                          fontSize: '1rem',
                          backdropFilter: 'blur(10px)',
                          outline: 'none'
                        }}
                        placeholder="Team name will auto-fill"
                      />
                    </div>

                    <div className="mb-4">
                      <label htmlFor="teamLeader" style={{
                        color: '#FFFFFF',
                        fontWeight: 'bold',
                        marginBottom: '0.5rem',
                        display: 'block'
                      }}>
                        <i className="fas fa-crown"></i> Team Leader
                      </label>
                      <input
                        type="text"
                        id="teamLeader"
                        name="teamLeader"
                        value={formData.teamLeader}
                        readOnly
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          border: '2px solid rgba(40, 167, 69, 0.5)',
                          backgroundColor: 'rgba(40, 167, 69, 0.1)',
                          color: '#FFFFFF',
                          fontSize: '1rem',
                          backdropFilter: 'blur(10px)',
                          outline: 'none'
                        }}
                        placeholder="Team leader will auto-fill"
                      />
                    </div>

                    {/* FINAL CONFIRMATION WARNING */}
                    <div style={{
                      backgroundColor: 'rgba(220, 53, 69, 0.2)',
                      border: '2px solid #DC3545',
                      borderRadius: '15px',
                      padding: '1.5rem',
                      marginBottom: '2rem',
                      backdropFilter: 'blur(10px)'
                    }}>
                      <h6 style={{color: '#FF6B6B', fontWeight: 'bold', marginBottom: '1rem'}}>
                        🔒 FINAL WARNING
                      </h6>
                      <p style={{color: '#FFFFFF', marginBottom: '0.5rem'}}>
                        You are about to proceed as <strong>{formData.teamName}</strong>.
                      </p>
                      <p style={{color: '#FFFFFF', marginBottom: '0'}}>
                        <strong>❌ This action CANNOT be undone. Your team will be LOCKED after registration.</strong>
                      </p>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading || !formData.teamId}
                  style={{
                    width: '100%',
                    minHeight: '60px',
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    borderRadius: '15px',
                    border: 'none',
                    background: loading || !formData.teamId 
                      ? 'linear-gradient(45deg, #6c757d, #495057)' 
                      : 'linear-gradient(45deg, #DC3545, #B02A37)',
                    color: '#FFFFFF',
                    cursor: loading || !formData.teamId ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(220, 53, 69, 0.3)',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
                  }}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Processing Registration...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-lock me-2"></i>
                      🚨 PROCEED TO PROBLEMS (ONE REGISTRATION ONLY) 🚨
                    </>
                  )}
                </button>
                
                {!formData.teamId && (
                  <div style={{
                    color: '#CCCCCC',
                    fontSize: '0.9rem',
                    textAlign: 'center',
                    marginTop: '1rem'
                  }}>
                    Please select your team to continue
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center py-4" style={{color: '#CCCCCC', marginTop: '3rem'}}>
          <p className="mb-0">DESIGNED AND DEVELOPED BY WEB DEV TEAM CYBERNERDS KARE</p>
        </div>
      </div>
    </div>
  );
};

export default RegistrationForm;