import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Bell, Mail, RefreshCw, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

export default function Notifications({ showToast }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.notifications.getLogs();
      setLogs(data || []);
    } catch (err) {
      showToast(err.message || "Failed to load notification audit logs.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="notifications-page-wrapper">
      <div className="page-header header-with-actions">
        <div>
          <h1 className="page-title">Notification Email Tracker</h1>
          <p className="page-subtitle">Real-time background SMTP deliverability logs, error payloads, and retry history audit logs.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchLogs} disabled={loading}>
          <RefreshCw size={16} className={loading ? "spin-icon" : ""} />
          <span>Sync Live Logs</span>
        </button>
      </div>

      <div className="logs-timeline-shell">
        {loading && logs.length === 0 ? (
          <div className="glass-card text-center" style={{ padding: '60px' }}>
            <RefreshCw size={36} className="spin-icon text-brand" />
            <p style={{ marginTop: '12px', fontWeight: '600' }}>Syncing SMTP transaction streams...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="glass-card text-center empty-logs-panel">
            <Bell size={48} className="empty-icon" />
            <h3>SMTP Log is Empty</h3>
            <p>Applied leave actions (Apply, Approve, Reject) will automatically populate these delivery logs.</p>
          </div>
        ) : (
          <div className="logs-list">
            {logs.map((log) => (
              <div key={log.notification_id} className={`log-item glass-card status-${log.status.toLowerCase()}`}>
                <div className="log-header">
                  <div className="log-recipient-meta">
                    <Mail size={18} className="mail-icon" />
                    <span>To: <strong>{log.receiver_email}</strong></span>
                  </div>
                  <span className={`log-status-badge badge-${log.status.toLowerCase()}`}>
                    {log.status === "SENT" ? <CheckCircle2 size={14} /> : log.status === "FAILED" ? <XCircle size={14} /> : <AlertCircle size={14} />}
                    <span>{log.status}</span>
                  </span>
                </div>

                <div className="log-body">
                  <h4>{log.subject}</h4>
                  <div className="log-meta-row">
                    <span>Transaction ID: <code>{log.notification_id}</code></span>
                    <span>•</span>
                    <span>Retries: <strong>{log.retry_count} / 3</strong></span>
                    <span>•</span>
                    <span>Log Time: {new Date(log.created_at || log.sent_at).toLocaleString()}</span>
                  </div>

                  {log.error_log && (
                    <div className="error-payload-panel">
                      <h5>Deliverability Exception Stack:</h5>
                      <pre>{log.error_log}</pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .header-with-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .spin-icon {
          animation: spin 1s linear infinite;
        }

        .text-brand {
          color: var(--brand);
        }

        .empty-logs-panel {
          padding: 80px 0;
          color: var(--text-secondary);
        }

        .empty-icon {
          color: var(--border-glass);
          margin-bottom: 16px;
        }

        .empty-logs-panel h3 {
          font-size: 1.2rem;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .logs-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .log-item {
          padding: 20px;
          border-left: 5px solid var(--border-glass);
          margin-bottom: 0;
        }

        .log-item.status-sent {
          border-left: 5px solid var(--success);
        }

        .log-item.status-failed {
          border-left: 5px solid var(--danger);
        }

        .log-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          border-bottom: 1px solid var(--border-glass);
          padding-bottom: 8px;
        }

        .log-recipient-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.95rem;
          color: var(--text-primary);
        }

        .mail-icon {
          color: var(--text-secondary);
        }

        .log-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          font-size: 0.72rem;
          font-weight: 800;
        }

        .badge-sent {
          background-color: #d1fae5;
          color: #065f46;
        }

        .badge-failed {
          background-color: #fee2e2;
          color: #991b1b;
        }

        .log-body h4 {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        .log-meta-row {
          display: flex;
          gap: 10px;
          align-items: center;
          font-size: 0.82rem;
          color: var(--text-secondary);
        }

        .log-meta-row code {
          background: rgba(0,0,0,0.03);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .error-payload-panel {
          background-color: #fef2f2;
          border: 1px solid #fee2e2;
          border-radius: var(--radius-sm);
          padding: 14px;
          margin-top: 14px;
        }

        .error-payload-panel h5 {
          font-size: 0.82rem;
          color: var(--danger);
          margin-bottom: 6px;
          font-weight: 700;
        }

        .error-payload-panel pre {
          font-family: monospace;
          font-size: 0.78rem;
          color: #7f1d1d;
          overflow-x: auto;
          white-space: pre-wrap;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 600px) {
          .log-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          .log-meta-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }
        }
      `}</style>
    </div>
  );
}
