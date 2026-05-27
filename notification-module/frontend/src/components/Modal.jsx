import React, { useState } from 'react';
import { X, CheckCircle, XCircle } from 'lucide-react';

export default function Modal({ isOpen, leave, onApprove, onReject, onClose }) {
  if (!isOpen || !leave) return null;

  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAction = async (type) => {
    setSubmitting(true);
    try {
      if (type === "APPROVE") {
        await onApprove(leave.leave_id, remarks);
      } else {
        await onReject(leave.leave_id, remarks);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
      setRemarks("");
    }
  };

  return (
    <div className="modal-backdrop-overlay">
      <div className="modal-content-card glass-card">
        {/* Header */}
        <div className="modal-header">
          <h3>Review Leave Application</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body details */}
        <div className="modal-body">
          <div className="modal-meta-grid">
            <div className="meta-box">
              <span className="label">Faculty Member</span>
              <strong className="value">{leave.Faculty?.name || "Dr. Nilesh Bhosale"}</strong>
            </div>
            <div className="meta-box">
              <span className="label">Department</span>
              <span className="value">{leave.Faculty?.department || "Computer Engineering"}</span>
            </div>
            <div className="meta-box">
              <span className="label">Leave Type</span>
              <span className="value">{leave.leave_type}</span>
            </div>
            <div className="meta-box">
              <span className="label">Leave Period</span>
              <strong className="value text-brand">{leave.from_date} to {leave.to_date}</strong>
            </div>
          </div>

          <div className="modal-reason-block">
            <h5>Reason for Application:</h5>
            <p>{leave.reason}</p>
          </div>

          {/* Remarks text input */}
          <div className="form-group" style={{ marginTop: '20px' }}>
            <label htmlFor="modalRemarks">Authorization Remarks / Comments:</label>
            <textarea
              id="modalRemarks"
              className="form-control"
              rows="3"
              placeholder="E.g., Approved. Class syllabus mapping adjusted with substitute."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            ></textarea>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <div className="action-button-group">
            <button 
              className="btn btn-danger" 
              onClick={() => handleAction("REJECT")}
              disabled={submitting}
            >
              <XCircle size={18} />
              <span>Reject Request</span>
            </button>
            <button 
              className="btn btn-success" 
              onClick={() => handleAction("APPROVE")}
              disabled={submitting}
            >
              <CheckCircle size={18} />
              <span>Approve Leave</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .modal-backdrop-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
          animation: fadeIn 0.25s ease-out;
        }

        .modal-content-card {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          box-shadow: var(--shadow-lg);
          border-top: 6px solid var(--brand);
          animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--border-glass);
          padding-bottom: 12px;
        }

        .modal-header h3 {
          font-size: 1.3rem;
          font-weight: 700;
          color: var(--brand);
        }

        .modal-close-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          transition: var(--transition);
        }

        .modal-close-btn:hover {
          color: var(--danger);
        }

        .modal-meta-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }

        .meta-box {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .meta-box .label {
          font-size: 0.78rem;
          color: var(--text-secondary);
          font-weight: 600;
          text-transform: uppercase;
        }

        .meta-box .value {
          font-size: 0.95rem;
          color: var(--text-primary);
        }

        .text-brand {
          color: var(--brand);
        }

        .modal-reason-block {
          background-color: rgba(141, 43, 43, 0.03);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-sm);
          padding: 14px;
          margin-bottom: 16px;
        }

        .modal-reason-block h5 {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 6px;
        }

        .modal-reason-block p {
          font-size: 0.92rem;
          line-height: 1.5;
        }

        .modal-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--border-glass);
          padding-top: 20px;
          margin-top: 20px;
        }

        .action-button-group {
          display: flex;
          gap: 10px;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleUp {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
