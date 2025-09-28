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
  { teamId: 'T050', teamName: 'TEAM DEVARA', teamLeader: 'Matli Lakshmi Prasanna Kumar Reddy', registrationId: '99230040135' }
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
        // Immediately navigate with optimistic UI - check registration in background
        const teamDataEncoded = btoa(JSON.stringify(formData));
        navigate(`/problems/${teamDataEncoded}`);
        
        // Background check (optional for extra validation)
        checkTeamAlreadyRegistered(formData.teamId).then(isAlreadyRegistered => {
          if (isAlreadyRegistered) {
            console.log('Team already registered - will be handled in ProblemStatements component');
          }
        }).catch(error => {
          console.error('Background registration check failed:', error);
        });
        
      } catch (error) {
        console.error('Error during navigation:', error);
        alert('Error processing request. Please try again.');
        setLoading(false);
      }
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-8 col-lg-6">
        <div className="card shadow">
          <div className="card-body p-4">
            <h2 className="card-title text-center mb-4">🏆 Team Registration</h2>
            <div className="alert alert-info text-center mb-4">
              <strong>Select your registered team from the dropdown</strong>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="teamId" className="form-label">
                  <i className="fas fa-users"></i> Select Your Team <span className="text-danger">*</span>
                </label>
                <select
                  id="teamId"
                  name="teamId"
                  value={formData.teamId}
                  onChange={handleChange}
                  className={`form-control ${errors.teamId ? 'is-invalid' : ''}`}
                >
                  <option value="">-- Choose your team --</option>
                  {REGISTERED_TEAMS.map(team => (
                    <option key={team.teamId} value={team.teamId}>
                      {team.teamId} - {team.teamName}
                    </option>
                  ))}
                </select>
                {errors.teamId && (
                  <div className="invalid-feedback">{errors.teamId}</div>
                )}
              </div>

              {formData.teamId && (
                <>
                  <div className="mb-3">
                    <label htmlFor="teamName" className="form-label">
                      <i className="fas fa-flag"></i> Team Name
                    </label>
                    <input
                      type="text"
                      id="teamName"
                      name="teamName"
                      value={formData.teamName}
                      readOnly
                      className="form-control bg-light"
                      placeholder="Team name will auto-fill"
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="teamLeader" className="form-label">
                      <i className="fas fa-crown"></i> Team Leader
                    </label>
                    <input
                      type="text"
                      id="teamLeader"
                      name="teamLeader"
                      value={formData.teamLeader}
                      readOnly
                      className="form-control bg-light"
                      placeholder="Team leader will auto-fill"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={loading || !formData.teamId}
                style={{ minHeight: '50px', fontSize: '1.1rem' }}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-arrow-right me-2"></i>
                    Continue to Problem Statements
                  </>
                )}
              </button>
              
              {!formData.teamId && (
                <small className="text-muted d-block text-center mt-3">
                  Please select your team to continue
                </small>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationForm;