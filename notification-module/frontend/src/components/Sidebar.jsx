import React from 'react';
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  History, 
  Bell, 
  ShieldAlert, 
  LogOut,
  User,
  GraduationCap
} from 'lucide-react';
import { api } from '../services/api';

export default function Sidebar({ user, currentView, onViewChange, onLogout }) {
  if (!user) return null;

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard size={20} />,
      roles: ["FACULTY", "HOD", "PRINCIPAL", "CLERK", "ADMIN"]
    },
    {
      id: "apply",
      label: "Apply Leave",
      icon: <FileSpreadsheet size={20} />,
      roles: ["FACULTY"]
    },
    {
      id: "history",
      label: "Leave Registry",
      icon: <History size={20} />,
      roles: ["CLERK", "PRINCIPAL", "ADMIN"]
    },
    {
      id: "notifications",
      label: "Email Tracker",
      icon: <Bell size={20} />,
      roles: ["FACULTY", "HOD", "PRINCIPAL", "CLERK", "ADMIN"]
    },
    {
      id: "admin",
      label: "Admin Panel",
      icon: <ShieldAlert size={20} />,
      roles: ["ADMIN"]
    }
  ];

  const visibleItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <aside className="app-sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-logo">
          <GraduationCap size={28} />
        </div>
        <div className="brand-meta">
          <h3>APCOER</h3>
          <span>Leave Manager</span>
        </div>
      </div>

      {/* User Quick Info */}
      <div className="sidebar-user">
        <div className="user-avatar">
          {user.name.charAt(0)}
        </div>
        <div className="user-info">
          <h4>{user.name}</h4>
          <span className="user-role-badge">{user.role}</span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="sidebar-nav">
        {visibleItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${currentView === item.id ? 'active' : ''}`}
            onClick={() => onViewChange(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Logout Footer */}
      <div className="sidebar-footer">
        <button className="nav-item logout-btn" onClick={onLogout}>
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>

      <style>{`
        .app-sidebar {
          width: 280px;
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(20px);
          border-right: 1px solid var(--border-glass);
          display: flex;
          flex-direction: column;
          padding: 24px;
          min-height: 100vh;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 32px;
        }

        .brand-logo {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          background-color: var(--brand);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(141, 43, 43, 0.2);
        }

        .brand-meta h3 {
          font-weight: 800;
          font-size: 1.15rem;
          color: var(--brand);
          letter-spacing: -0.5px;
        }

        .brand-meta span {
          font-size: 0.78rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: rgba(141, 43, 43, 0.04);
          border-radius: var(--radius-md);
          border: 1px solid rgba(141, 43, 43, 0.06);
          margin-bottom: 28px;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: var(--brand-dark);
          color: white;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-sm);
        }

        .user-info h4 {
          font-size: 0.92rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .user-role-badge {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 800;
          color: var(--brand);
          background-color: rgba(141, 43, 43, 0.08);
          padding: 2px 8px;
          border-radius: 4px;
          margin-top: 4px;
          text-transform: uppercase;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex-grow: 1;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-weight: 600;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: var(--transition);
          text-align: left;
        }

        .nav-item:hover {
          color: var(--brand);
          background-color: rgba(141, 43, 43, 0.04);
        }

        .nav-item.active {
          color: white;
          background-color: var(--brand);
          box-shadow: 0 4px 12px rgba(141, 43, 43, 0.2);
        }

        .logout-btn {
          color: var(--danger);
          margin-top: auto;
        }

        .logout-btn:hover {
          background-color: #fee2e2;
          color: var(--danger);
        }

        @media (max-width: 991px) {
          .app-sidebar {
            width: 100%;
            min-height: auto;
            border-right: none;
            border-bottom: 1px solid var(--border-glass);
            position: relative;
            padding: 16px;
          }
          .sidebar-user {
            margin-bottom: 16px;
          }
          .sidebar-nav {
            flex-direction: row;
            flex-wrap: wrap;
          }
          .sidebar-footer {
            margin-top: 16px;
          }
        }
      `}</style>
    </aside>
  );
}
