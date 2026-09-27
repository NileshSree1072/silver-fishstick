import React, { useState, useEffect } from 'react';
import { useAuth, api } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { X, User as UserIcon, Lock, Shield, Mail } from 'lucide-react';

const ProfileModal = ({ open, onClose }) => {
  const { user, updateUserProfileState } = useAuth();
  const { addToast } = useNotifications();

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync inputs with user state when opened
  useEffect(() => {
    if (open && user) {
      setName(user.name || '');
      setPassword('');
      setConfirmPassword('');
    }
  }, [open, user]);

  // Handle escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      addToast('Name must be at least 2 characters.', 'Validation Error', 'error');
      return;
    }

    const payload = { name: name.trim() };

    if (password) {
      if (password.length < 8) {
        addToast('Password must be at least 8 characters.', 'Validation Error', 'error');
        return;
      }
      if (password !== confirmPassword) {
        addToast('Passwords do not match.', 'Validation Error', 'error');
        return;
      }
      payload.password = password;
    }

    setLoading(false);
    setLoading(true);
    try {
      const response = await api.patch('/api/users/me', payload);
      // Update local context
      updateUserProfileState({ name: response.data.name });
      addToast('Profile updated successfully.', 'Profile Saved', 'success');
      setPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to update profile settings.';
      addToast(errMsg, 'Update Failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl anim-bounce-in overflow-hidden glass-panel"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top colored stripe */}
        <div style={{ height: 3, background: 'var(--brand)', opacity: 0.9 }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-outline-variant/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-primary/10 text-primary border border-outline-variant/30">
              <UserIcon size={16} />
            </div>
            <h3 className="text-sm font-bold text-on-surface" style={{ fontFamily: 'var(--font-heading)' }}>
              Profile Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg cursor-pointer transition-colors text-on-surface-variant hover:text-on-surface"
          >
            <X size={17} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Read-only User metadata */}
          <div className="p-3.5 rounded-xl bg-surface-container-lowest/30 border border-outline-variant/20 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant flex items-center gap-1.5">
                <Mail size={12} className="text-on-surface-variant/70" /> Email:
              </span>
              <span className="font-semibold text-on-surface select-all">{user.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant flex items-center gap-1.5">
                <Shield size={12} className="text-on-surface-variant/70" /> System Role:
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-primary-container text-on-primary-container border border-outline-variant/30">
                {user.role}
              </span>
            </div>
          </div>

          {/* Edit Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Full Name
            </label>
            <div className="relative">
              <input
                type="text"
                required
                className="field pl-10"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <UserIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/70" />
            </div>
          </div>

          <div className="pt-2 border-t border-outline-variant/20">
            <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
              Change Password (optional)
            </p>
            
            <div className="space-y-3">
              {/* New Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    className="field pl-10"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/70" />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    className="field pl-10"
                    placeholder="Verify new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/70" />
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-3 border-t border-outline-variant/20">
            <button
              type="button"
              onClick={onClose}
              className="btn flex-1 text-center"
              style={{
                padding: '10px 16px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-body)',
                fontSize: 12,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-input)')}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary flex-1"
              style={{ padding: '10px 16px', fontSize: 12 }}
            >
              {loading ? 'Saving Changes...' : 'Save Settings'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
