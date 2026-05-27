import React, { useState } from 'react';
import { api } from '../services/api';
import { Send, FileText, Calendar, HelpCircle } from 'lucide-react';

export default function ApplyLeave({ user, onViewChange, showToast }) {
  if (!user) return null;

  const [leaveType, setLeaveType] = useState("Casual Leave");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(false);

    // Simple date range validation
    if (new Date(fromDate) > new Date(toDate)) {
      showToast("Start date ('From') cannot be after the end date ('To').", "error");
      return;
    }

    setLoading(true);
    try {
      await api.leaves.apply({
        leave_type: leaveType,
        from_date: fromDate,
        to_date: toDate,
        reason
      });
      showToast("Leave request submitted successfully! HOD and authorities have been notified via email.", "success");
      onViewChange("dashboard");
    } catch (err) {
      showToast(err.message || "Failed to submit leave request.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="apply-page-wrapper">
      <div className="page-header">
        <h1 className="page-title">Submit Leave Application</h1>
        <p className="page-subtitle">File a new request. Multi-level automated email notifications will trigger immediately.</p>
      </div>

      <div className="apply-split-layout">
        {/* Form panel */}
        <div className="glass-card apply-form-card">
          <form onSubmit={handleSubmit} className="premium-form">
            <div className="form-row-two">
              <div className="form-group">
                <label>Faculty Applicant Name</label>
                <input type="text" className="form-control" readOnly value={user.name} />
              </div>
              <div className="form-group">
                <label>Faculty Identity ID</label>
                <input type="text" className="form-control" readOnly value={user.id} />
              </div>
            </div>

            <div className="form-row-two">
              <div className="form-group">
                <label>Academic Department</label>
                <input type="text" className="form-control" readOnly value={user.department} />
              </div>
              <div className="form-group">
                <label htmlFor="leaveType">Leave Type Category</label>
                <select 
                  id="leaveType" 
                  className="form-control"
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                >
                  <option value="Casual Leave">Casual Leave (CL)</option>
                  <option value="Medical Leave">Medical Leave (ML)</option>
                  <option value="Earned Leave">Earned Leave (EL)</option>
                  <option value="Movement Leave">Movement Leave (MVT)</option>
                </select>
              </div>
            </div>

            <div className="form-row-two">
              <div className="form-group">
                <label htmlFor="fromDate">From Date</label>
                <div className="input-with-icon">
                  <Calendar size={16} className="input-icon" />
                  <input 
                    id="fromDate" 
                    type="date" 
                    className="form-control" 
                    required 
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="toDate">To Date</label>
                <div className="input-with-icon">
                  <Calendar size={16} className="input-icon" />
                  <input 
                    id="toDate" 
                    type="date" 
                    className="form-control" 
                    required 
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label htmlFor="reason">Detailed Reason for Leave</label>
              <textarea 
                id="reason" 
                className="form-control" 
                rows="4" 
                placeholder="Describe your reason in detail. This description will be automatically compiled into review emails."
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              ></textarea>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => onViewChange("dashboard")}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                <Send size={18} />
                <span>{loading ? "Submitting..." : "Submit Application"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar help guidelines panel */}
        <div className="glass-card apply-guidelines-card">
          <div className="guideline-header">
            <HelpCircle size={24} className="guideline-icon" />
            <h3>Notification Flow Guidelines</h3>
          </div>
          <div className="guidelines-content">
            <div className="guideline-step">
              <span className="step-num">1</span>
              <div>
                <h5>Instant HOD Notification</h5>
                <p>An email compiles details and alerts the HOD of your specific department immediately.</p>
              </div>
            </div>
            <div className="guideline-step">
              <span className="step-num">2</span>
              <div>
                <h5>Principal & Clerk Alerts</h5>
                <p>Simultaneous copy emails are transmitted to the Principal's board and clerk offices for archival synchronization.</p>
              </div>
            </div>
            <div className="guideline-step">
              <span className="step-num">3</span>
              <div>
                <h5>Real-time Progress Tracker</h5>
                <p>Status amendments trigger rapid responses directly back to your registered mailbox with reviewer remarks.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .apply-split-layout {
          display: grid;
          grid-template-columns: 1.8fr 1fr;
          gap: 24px;
        }

        .form-row-two {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .input-with-icon {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-secondary);
          pointer-events: none;
        }

        .input-with-icon .form-control {
          padding-left: 40px;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          border-top: 1px solid var(--border-glass);
          padding-top: 20px;
        }

        .apply-guidelines-card {
          border-left: 4px solid var(--brand);
        }

        .guideline-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          color: var(--brand);
        }

        .guideline-icon {
          flex-shrink: 0;
        }

        .guideline-header h3 {
          font-size: 1.15rem;
          font-weight: 700;
        }

        .guidelines-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .guideline-step {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .step-num {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background-color: rgba(141, 43, 43, 0.08);
          color: var(--brand);
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          flex-shrink: 0;
          border: 1px solid var(--border-glass);
        }

        .guideline-step h5 {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .guideline-step p {
          font-size: 0.88rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        @media (max-width: 991px) {
          .apply-split-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .form-row-two {
            grid-template-columns: 1fr;
            gap: 0;
          }
        }
      `}</style>
    </div>
  );
}
