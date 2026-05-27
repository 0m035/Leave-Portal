import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { UserPlus, UserCheck, Shield, Trash2, Edit2, Key, RefreshCw } from 'lucide-react';

export default function AdminPanel({ showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form Registration State
  const [regId, setRegId] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regRole, setRegRole] = useState("FACULTY");
  const [regDept, setRegDept] = useState("Computer Engineering");
  const [regPassword, setRegPassword] = useState("password123");
  const [regLoading, setRegLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.users.getAll();
      setUsers(data || []);
    } catch (err) {
      showToast(err.message || "Failed to load users database.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegLoading(true);
    try {
      await api.auth.register({
        id: regId,
        name: regName,
        email: regEmail,
        role: regRole,
        department: regDept,
        password: regPassword
      });
      showToast(`User ${regName} registered successfully inside PostgreSQL/SQLite!`, "success");
      // Reset
      setRegId("");
      setRegName("");
      setRegEmail("");
      setRegPassword("password123");
      fetchUsers();
    } catch (err) {
      showToast(err.message || "Failed to register new system user.", "error");
    } finally {
      setRegLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.users.update(userId, { role: newRole });
      showToast("User privileges and roles updated successfully.", "success");
      fetchUsers();
    } catch (err) {
      showToast(err.message || "Failed to update user role privileges.", "error");
    }
  };

  const handleDelete = async (userId, userName) => {
    if (!window.confirm(`Are you absolutely sure you want to delete user ${userName}?`)) {
      return;
    }
    try {
      await api.users.delete(userId);
      showToast("User profile and credentials deleted successfully.", "success");
      fetchUsers();
    } catch (err) {
      showToast(err.message || "Failed to delete user profile.", "error");
    }
  };

  return (
    <div className="admin-page-wrapper">
      <div className="page-header">
        <h1 className="page-title">Identity & Access Management</h1>
        <p className="page-subtitle">Configure security credentials, manage system authorizations, and adjust user privileges.</p>
      </div>

      <div className="admin-split-layout">
        {/* Registration form */}
        <div className="glass-card reg-form-card">
          <div className="card-header-icon">
            <UserPlus size={24} className="text-brand" />
            <h3>Create New User Profile</h3>
          </div>
          
          <form onSubmit={handleRegister} className="reg-form">
            <div className="form-group">
              <label htmlFor="regId">Unique User / Faculty ID</label>
              <input
                id="regId"
                type="text"
                className="form-control"
                placeholder="E.g., FAC-102 or HOD-202"
                required
                value={regId}
                onChange={(e) => setRegId(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="regName">Full Legal Name</label>
              <input
                id="regName"
                type="text"
                className="form-control"
                placeholder="E.g., Prof. Rajesh..."
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="regEmail">Academic Email Address</label>
              <input
                id="regEmail"
                type="email"
                className="form-control"
                placeholder="rajesh@apcoer.edu.in"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
              />
            </div>

            <div className="form-row-two">
              <div className="form-group">
                <label htmlFor="regRole">Role Authorization</label>
                <select
                  id="regRole"
                  className="form-control"
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                >
                  <option value="FACULTY">FACULTY</option>
                  <option value="HOD">HOD</option>
                  <option value="PRINCIPAL">PRINCIPAL</option>
                  <option value="CLERK">CLERK</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="regDept">Academic Department</label>
                <input
                  id="regDept"
                  type="text"
                  className="form-control"
                  placeholder="Computer Engineering"
                  required
                  value={regDept}
                  onChange={(e) => setRegDept(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label htmlFor="regPass">Default Security Password</label>
              <input
                id="regPass"
                type="text"
                className="form-control"
                placeholder="password123"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={regLoading}>
              <UserCheck size={18} />
              <span>{regLoading ? "Saving User..." : "Register User Profile"}</span>
            </button>
          </form>
        </div>

        {/* Database grid panel */}
        <div className="glass-card users-grid-card">
          <div className="card-header-icon" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Shield size={24} className="text-brand" />
              <h3>Authorized Portal Users</h3>
            </div>
            <button className="btn btn-secondary refresh-btn" onClick={fetchUsers} disabled={loading}>
              <RefreshCw size={16} className={loading ? "spin-icon" : ""} />
            </button>
          </div>

          {loading && users.length === 0 ? (
            <div className="table-loader">
              <RefreshCw size={28} className="spin-icon text-brand" />
              <p>Fetching active security credentials...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role Privilege</th>
                    <th>Department</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td><code className="text-code">{u.id}</code></td>
                      <td><strong>{u.name}</strong></td>
                      <td><span className="email-text">{u.email}</span></td>
                      <td>
                        <select
                          className="role-dropdown-editor"
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        >
                          <option value="FACULTY">FACULTY</option>
                          <option value="HOD">HOD</option>
                          <option value="PRINCIPAL">PRINCIPAL</option>
                          <option value="CLERK">CLERK</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                      <td>{u.department}</td>
                      <td>
                        <button 
                          className="btn-action-delete"
                          onClick={() => handleDelete(u.id, u.name)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .admin-split-layout {
          display: grid;
          grid-template-columns: 1fr 1.8fr;
          gap: 24px;
        }

        .card-header-icon {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border-glass);
          padding-bottom: 12px;
        }

        .card-header-icon h3 {
          font-size: 1.15rem;
          font-weight: 700;
        }

        .text-brand {
          color: var(--brand);
        }

        .form-row-two {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .btn-block {
          width: 100%;
        }

        .text-code {
          background-color: rgba(0,0,0,0.04);
          padding: 3px 6px;
          border-radius: 4px;
          font-weight: 700;
        }

        .email-text {
          font-size: 0.88rem;
          color: var(--text-secondary);
        }

        .role-dropdown-editor {
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid var(--border-glass);
          background-color: rgba(255, 255, 255, 0.5);
          font-weight: 700;
          font-size: 0.8rem;
          color: var(--brand);
          outline: none;
          cursor: pointer;
        }

        .btn-action-delete {
          background: transparent;
          border: none;
          color: var(--danger);
          cursor: pointer;
          padding: 6px;
          border-radius: 4px;
          transition: var(--transition);
        }

        .btn-action-delete:hover {
          background-color: #fee2e2;
        }

        .spin-icon {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 991px) {
          .admin-split-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
