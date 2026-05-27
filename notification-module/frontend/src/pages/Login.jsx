import React, { useState } from 'react';
import { api } from '../services/api';
import { Lock, Mail, GraduationCap } from 'lucide-react';

export default function Login({ onLoginSuccess, showToast }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await api.auth.login(email, password);
      showToast(`Welcome back, ${user.name}! Successfully signed in as ${user.role}.`, "success");
      onLoginSuccess(user);
    } catch (err) {
      showToast(err.message || "Failed to log in. Please check your credentials.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      {/* Background Orbs */}
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>

      <div className="login-card-shell glass-card">
        {/* Logo and Meta */}
        <div className="login-brand">
          <div className="brand-logo">
            <GraduationCap size={36} />
          </div>
          <h2>APCOER Leave Portal</h2>
          <p>Secure Faculty Notification & Workflow Gateway</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Portal Email Address</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                id="email"
                type="email"
                className="form-control"
                placeholder="faculty@apcoer.edu.in"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label htmlFor="password">Security Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type="password"
                className="form-control"
                placeholder="••••••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Verifying Credentials..." : "Authenticate Access"}
          </button>
        </form>

        {/* Demo Accounts List */}
        <div className="demo-credentials-help">
          <h4>Development Demo Accounts (Password: <code>password123</code>):</h4>
          <ul>
            <li><strong>Faculty:</strong> <code>faculty@apcoer.edu.in</code></li>
            <li><strong>HOD:</strong> <code>hod@apcoer.edu.in</code></li>
            <li><strong>Principal:</strong> <code>principal@apcoer.edu.in</code></li>
            <li><strong>Clerk:</strong> <code>clerk@apcoer.edu.in</code></li>
            <li><strong>Admin:</strong> <code>admin@apcoer.edu.in</code></li>
          </ul>
        </div>
      </div>

      <style>{`
        .login-page-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: linear-gradient(135deg, #ffe8e8 0%, #ffffff 50%, #fff0f0 100%);
          position: relative;
          overflow: hidden;
          width: 100%;
        }

        .bg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          z-index: 0;
        }

        .orb-1 {
          width: 450px;
          height: 450px;
          background-color: rgba(141, 43, 43, 0.12);
          top: -100px;
          left: -100px;
        }

        .orb-2 {
          width: 350px;
          height: 350px;
          background-color: rgba(244, 122, 47, 0.08);
          bottom: -50px;
          right: -50px;
        }

        .login-card-shell {
          width: 100%;
          max-width: 520px;
          z-index: 1;
          box-shadow: 0 20px 50px rgba(141, 43, 43, 0.08);
          border-top: 6px solid var(--brand);
        }

        .login-brand {
          text-align: center;
          margin-bottom: 32px;
        }

        .login-brand .brand-logo {
          width: 60px;
          height: 60px;
          border-radius: var(--radius-md);
          background-color: var(--brand);
          color: white;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          box-shadow: 0 4px 15px rgba(141, 43, 43, 0.25);
        }

        .login-brand h2 {
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--brand);
          letter-spacing: -0.5px;
        }

        .login-brand p {
          font-size: 0.88rem;
          color: var(--text-secondary);
          margin-top: 4px;
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
          padding-left: 44px;
        }

        .btn-block {
          width: 100%;
          padding: 14px;
          font-size: 1rem;
        }

        .demo-credentials-help {
          margin-top: 28px;
          padding-top: 20px;
          border-top: 1px dashed var(--border-glass);
          text-align: left;
        }

        .demo-credentials-help h4 {
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .demo-credentials-help ul {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .demo-credentials-help li {
          font-size: 0.8rem;
          color: var(--text-primary);
        }

        .demo-credentials-help code {
          background-color: rgba(141, 43, 43, 0.08);
          color: var(--brand);
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
