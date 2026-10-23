import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import AppLogo from './AppLogo';

/**
 * Shared shell for the sign-in and sign-up pages: logo, one card, one footer link.
 */
export const AuthLayout = ({ title, subtitle, children, footer }) => (
  <div className="min-h-screen w-full overflow-y-auto bg-background flex flex-col items-center justify-center px-4 py-10">
    <div className="w-full max-w-[400px]">
      <div className="flex items-center justify-center gap-2.5 mb-8">
        <AppLogo size={30} />
        <span className="text-[17px] font-semibold text-on-surface tracking-tight">Aegis Helpdesk</span>
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface-container-low shadow-[var(--shadow-sm)] p-6 sm:p-8">
        <h1 className="text-[20px] font-semibold text-on-surface">{title}</h1>
        {subtitle && <p className="text-[14px] text-on-surface-variant mt-1">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>

      {footer && <p className="text-center text-[14px] text-on-surface-variant mt-6">{footer}</p>}
    </div>
  </div>
);

export const AuthField = ({ id, label, hint, type = 'text', ...inputProps }) => {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div>
      <label htmlFor={id} className="block text-[13.5px] font-medium text-on-surface mb-1.5">{label}</label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={isPassword && show ? 'text' : type}
          className={`field !text-[14px] ${isPassword ? '!pr-10' : ''}`}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="absolute inset-y-0 right-0 px-3 flex items-center text-on-surface-variant hover:text-on-surface cursor-pointer"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            <span className="material-symbols-outlined !text-[18px]">{show ? 'visibility_off' : 'visibility'}</span>
          </button>
        )}
      </div>
      {hint && <p className="text-[12.5px] text-on-surface-variant mt-1.5">{hint}</p>}
    </div>
  );
};

export const AuthAlert = ({ tone = 'danger', children }) => {
  const styles = {
    danger: 'bg-danger-soft border-danger-border text-danger-text',
    success: 'bg-success-soft border-success-border text-success-text',
  };
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[13.5px] mb-5 ${styles[tone]}`}>
      <span className="material-symbols-outlined !text-[18px] mt-px">{tone === 'danger' ? 'error' : 'check_circle'}</span>
      <span>{children}</span>
    </div>
  );
};

export const AuthSubmit = ({ loading, loadingLabel, children, disabled }) => (
  <button type="submit" disabled={loading || disabled} className="btn btn-primary w-full !py-2.5 !text-[14px]">
    {loading && <Loader2 size={16} className="animate-spin" />}
    {loading ? loadingLabel : children}
  </button>
);
