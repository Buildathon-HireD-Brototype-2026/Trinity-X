import React, { useState, useEffect, useRef } from 'react';
import notificationService from '../../services/notificationService';
import useTableSubscription from '../../hooks/useTableSubscription';
import {
  Bell,
  CheckCircle2,
  XCircle,
  FileText,
  MailCheck,
  Check,
} from 'lucide-react';

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Real-time automatic subscription to database changes on notifications
  useTableSubscription(['notifications'], () => {
    fetchNotifications();
  });

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = async (id) => {
    await notificationService.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const getIcon = (type) => {
    switch (type) {
      case 'ORDER_ACCEPTED':
        return <CheckCircle2 size={16} color="var(--success)" />;
      case 'ORDER_REJECTED':
        return <XCircle size={16} color="var(--danger)" />;
      case 'STATEMENT_PUBLISHED':
        return <FileText size={16} color="var(--primary)" />;
      default:
        return <Bell size={16} color="var(--text-secondary)" />;
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
        style={{
          position: 'relative',
          padding: '0.5rem',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isOpen ? 'var(--primary-50)' : 'transparent',
        }}
      >
        <Bell size={20} color={isOpen ? 'var(--primary)' : 'currentColor'} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              backgroundColor: 'var(--danger)',
              color: 'white',
              fontSize: '0.625rem',
              fontWeight: 700,
              padding: '0.1rem 0.35rem',
              borderRadius: 'var(--radius-full)',
              minWidth: '16px',
              textAlign: 'center',
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="card"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '360px',
            maxHeight: '440px',
            overflowY: 'auto',
            padding: 0,
            zIndex: 60,
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '0.875rem 1rem',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-muted)',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
              Notifications ({unreadCount} new)
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                No notifications right now.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.notification_id}
                  onClick={() => !n.is_read && handleMarkAsRead(n.notification_id)}
                  style={{
                    padding: '0.875rem 1rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    backgroundColor: n.is_read ? 'var(--bg-surface)' : 'var(--primary-50)',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{ marginTop: '2px', flexShrink: 0 }}>{getIcon(n.type)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-main)' }}>
                          {n.title}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          {new Date(n.created_at).toLocaleTimeString('en-IN', { timeStyle: 'short' })}
                        </div>
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                        {n.message}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.35rem', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        <MailCheck size={12} color="var(--success)" />
                        <span>Email dispatched to {n.recipient_email}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;
