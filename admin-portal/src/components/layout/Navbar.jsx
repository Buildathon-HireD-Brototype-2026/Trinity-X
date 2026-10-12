import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import logoSvg from '../../assets/logo.svg';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="admin-navbar">
      <div className="navbar-left">
        <img src={logoSvg} alt="HireD Logo" className="navbar-logo" />
        <span className="navbar-badge">Admin</span>
      </div>

      <div className="navbar-right" ref={dropdownRef}>
        <button
          type="button"
          className="admin-profile-trigger"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          aria-expanded={dropdownOpen}
        >
          <div className="admin-avatar">
            <User size={18} />
          </div>
          <div className="admin-info">
            <span className="admin-name">{user?.name || 'Admin'}</span>
            <span className="admin-role">{user?.role || 'Admin'}</span>
          </div>
          <ChevronDown size={16} className={`dropdown-chevron ${dropdownOpen ? 'open' : ''}`} />
        </button>

        {dropdownOpen && (
          <div className="profile-dropdown-menu">
            <div className="dropdown-user-header">
              <p className="dropdown-user-name">{user?.name}</p>
              <p className="dropdown-user-email">{user?.email}</p>
            </div>
            <div className="dropdown-divider" />
            <button
              type="button"
              className="dropdown-item"
              onClick={() => alert(`Admin Profile:\n\nName: ${user?.name}\nEmail: ${user?.email}\nRole: ${user?.role}\nAdmin ID: ${user?.id}`)}
            >
              <User size={16} />
              <span>Admin Profile</span>
            </button>
            <div className="dropdown-divider" />
            <button
              type="button"
              className="dropdown-item text-danger"
              onClick={logout}
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
