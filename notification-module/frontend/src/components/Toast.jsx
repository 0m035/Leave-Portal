import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  const getStyle = () => {
    switch (toast.type) {
      case "success":
        return {
          borderLeft: "6px solid #2d6a4f",
          backgroundColor: "#e6f4ea",
          color: "#137333",
          icon: <CheckCircle2 className="toast-icon" style={{ color: "#2d6a4f" }} />
        };
      case "error":
        return {
          borderLeft: "6px solid #a4161a",
          backgroundColor: "#fce8e6",
          color: "#c5221f",
          icon: <XCircle className="toast-icon" style={{ color: "#a4161a" }} />
        };
      case "warning":
        return {
          borderLeft: "6px solid #f59e0b",
          backgroundColor: "#fef3c7",
          color: "#d97706",
          icon: <AlertCircle className="toast-icon" style={{ color: "#f59e0b" }} />
        };
      default:
        return {
          borderLeft: "6px solid #8d2b2b",
          backgroundColor: "#fdf6f6",
          color: "#8d2b2b",
          icon: <Info className="toast-icon" style={{ color: "#8d2b2b" }} />
        };
    }
  };

  const toastDetails = getStyle();

  return (
    <div className="custom-toast-wrapper">
      <div 
        className="toast-container"
        style={{
          borderLeft: toastDetails.borderLeft,
          backgroundColor: toastDetails.backgroundColor,
          color: toastDetails.color
        }}
      >
        {toastDetails.icon}
        <div className="toast-message">
          {toast.message}
        </div>
        <button className="toast-close-btn" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <style>{`
        .custom-toast-wrapper {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 9999;
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .toast-container {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-radius: 8px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          min-width: 320px;
          max-width: 450px;
          backdrop-filter: blur(8px);
        }

        .toast-icon {
          flex-shrink: 0;
          width: 20px;
          height: 20px;
        }

        .toast-message {
          font-size: 0.95rem;
          font-weight: 600;
          flex-grow: 1;
        }

        .toast-close-btn {
          background: transparent;
          border: none;
          color: inherit;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.2s;
          display: flex;
          align-items: center;
        }

        .toast-close-btn:hover {
          opacity: 1;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
