import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const AdminDashboard = () => {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'registrations'),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const registrationsData = [];
      
      querySnapshot.forEach((doc) => {
        registrationsData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setRegistrations(registrationsData);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      setError('Failed to load registrations. Please check your Firebase configuration.');
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{height: '200px'}}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
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
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center">
            <h2 className="mb-0">Admin Dashboard</h2>
            <div>
              <button
                onClick={refreshData}
                className="btn btn-success me-2"
              >
                🔄 Refresh
              </button>
              <button
                onClick={downloadPDF}
                className="btn btn-primary"
              >
                📄 Download PDF
              </button>
            </div>
          </div>
        </div>

        <div className="card-body">
          <div className="mb-3">
            <p className="text-muted">
              Total Registrations: <span className="fw-bold">{registrations.length}</span>
            </p>
          </div>

          {registrations.length === 0 ? (
            <div className="text-center py-5">
              <h5 className="text-muted">No registrations found.</h5>
              <p className="text-muted">Teams will appear here once they register for problem statements.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead className="table-dark">
                  <tr>
                    <th>S.No</th>
                    <th>Team Number</th>
                    <th>Team Name</th>
                    <th>Team Leader</th>
                    <th>Problem Statement</th>
                    <th>Registration Date</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((registration, index) => (
                    <tr key={registration.id}>
                      <td>{index + 1}</td>
                      <td className="fw-bold">{registration.teamNumber}</td>
                      <td>{registration.teamName}</td>
                      <td>{registration.teamLeader}</td>
                      <td>{registration.problemStatementTitle}</td>
                      <td>
                        {registration.timestamp 
                          ? new Date(registration.timestamp.toDate()).toLocaleDateString()
                          : 'N/A'
                        }
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