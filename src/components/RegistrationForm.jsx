import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const RegistrationForm = () => {
  const [formData, setFormData] = useState({
    teamNumber: '',
    teamName: '',
    teamLeader: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const checkTeamAlreadyRegistered = async (teamNumber) => {
    try {
      const q = query(
        collection(db, 'registrations'),
        where('teamNumber', '==', teamNumber)
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
    
    if (!formData.teamNumber.trim()) {
      newErrors.teamNumber = 'Team Number is required';
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
        checkTeamAlreadyRegistered(formData.teamNumber).then(isAlreadyRegistered => {
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
      <div className="col-md-6 col-lg-4">
        <div className="card shadow">
          <div className="card-body p-4">
            <h2 className="card-title text-center mb-4">Team Registration</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="teamNumber" className="form-label">
                  Team Number <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  id="teamNumber"
                  name="teamNumber"
                  value={formData.teamNumber}
                  onChange={handleChange}
                  className={`form-control ${errors.teamNumber ? 'is-invalid' : ''}`}
                  placeholder="Enter team number"
                />
                {errors.teamNumber && (
                  <div className="invalid-feedback">{errors.teamNumber}</div>
                )}
              </div>

              <div className="mb-3">
                <label htmlFor="teamName" className="form-label">
                  Team Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  id="teamName"
                  name="teamName"
                  value={formData.teamName}
                  onChange={handleChange}
                  className={`form-control ${errors.teamName ? 'is-invalid' : ''}`}
                  placeholder="Enter team name"
                />
                {errors.teamName && (
                  <div className="invalid-feedback">{errors.teamName}</div>
                )}
              </div>

              <div className="mb-3">
                <label htmlFor="teamLeader" className="form-label">
                  Team Leader Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  id="teamLeader"
                  name="teamLeader"
                  value={formData.teamLeader}
                  onChange={handleChange}
                  className={`form-control ${errors.teamLeader ? 'is-invalid' : ''}`}
                  placeholder="Enter team leader name"
                />
                {errors.teamLeader && (
                  <div className="invalid-feedback">{errors.teamLeader}</div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={loading}
                style={{ minHeight: '40px' }}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Processing...
                  </>
                ) : (
                  'Continue to Problem Statements'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationForm;