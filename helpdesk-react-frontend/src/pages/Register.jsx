import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Register = ({ onLoginRedirect }) => {
  const { register, isBackendConnected } = useAuth();
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [loading, setLoading]     = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) { setError('Please fill in all fields.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await register(name, email, password);
      setSuccess('Account created! Redirecting to login...');
      setTimeout(() => {
        onLoginRedirect();
      }, 1500);
    } catch (err) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (!isBackendConnected) {
        setError('Cannot reach server. Ensure the backend is running.');
      } else {
        setError('Registration failed. Email may already be in use.');
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    if (password.length === 0) return null;
    if (password.length < 6)  return { label: 'Weak',   color: '#ffb4ab', width: '30%' };
    if (password.length < 10) return { label: 'Fair',   color: '#ffb695', width: '60%' };
    return                           { label: 'Strong', color: '#c3c0ff', width: '100%' };
  };
  const strength = passwordStrength();

  return (
    <div className="bg-background text-on-surface min-h-screen w-full flex items-center justify-center relative overflow-hidden geometric-bg font-body-md">
      {/* Ambient Background Glows */}
      <div className="ambient-glow bg-primary w-[500px] h-[500px] top-[-20%] left-[-10%] opacity-40"></div>
      <div className="ambient-glow bg-secondary w-[400px] h-[400px] bottom-[-10%] right-[-10%] opacity-20"></div>

      <main className="relative z-10 w-full max-w-[440px] px-lg py-xl">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-xl">
          <div className="w-12 h-12 bg-surface-container-high rounded-xl border border-outline-variant flex items-center justify-center mb-md shadow-lg shadow-black/20">
            <span className="material-symbols-outlined text-primary text-[28px] icon-fill">auto_awesome</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-primary mb-xs tracking-tight">helpdeskAI</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Enterprise Support Platform</p>
        </div>

        {/* Register Card */}
        <div className="glass-card border border-outline-variant rounded-xl p-xl transition-all duration-300 hover:border-outline/50">
          <div className="mb-lg">
            <h2 className="font-title-md text-title-md text-on-surface mb-xs">Create your account</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Join to file and track support tickets.</p>
          </div>

          {/* Offline Warning */}
          {!isBackendConnected && (
            <div className="flex items-start gap-3 p-3.5 rounded-lg mb-5 text-xs bg-error/10 border border-error/25">
              <span className="material-symbols-outlined text-error text-[18px] mt-0.5">warning</span>
              <div>
                <p className="font-semibold text-error">Backend Offline</p>
                <p className="text-[10px] mt-0.5 text-error/80">Start the Spring Boot server at port 8080</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-3 p-3.5 rounded-lg mb-5 text-xs bg-primary/10 border border-primary/30">
              <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
              <p className="text-primary font-semibold">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-3 p-3.5 rounded-lg mb-5 text-xs bg-tertiary-container/20 border border-tertiary/30">
              <span className="material-symbols-outlined text-tertiary text-[18px]">warning</span>
              <p className="text-tertiary">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-md">
            {/* Full Name Field */}
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs" htmlFor="name">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-sm flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-outline text-[18px]">person</span>
                </div>
                <input 
                  className="field pl-10 pr-md py-[10px]" 
                  id="name" 
                  name="name" 
                  placeholder="Jane Smith" 
                  required 
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs" htmlFor="email">Work Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-sm flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-outline text-[18px]">mail</span>
                </div>
                <input 
                  className="field pl-10 pr-md py-[10px]" 
                  id="email" 
                  name="email" 
                  placeholder="name@company.com" 
                  required 
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs" htmlFor="password">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-sm flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-outline text-[18px]">lock</span>
                </div>
                <input 
                  className="field pl-10 pr-11 py-[10px]" 
                  id="password" 
                  name="password" 
                  placeholder="••••••••" 
                  required 
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button 
                  aria-label="Toggle password visibility" 
                  className="absolute inset-y-0 right-0 pr-sm flex items-center text-outline hover:text-on-surface transition-colors cursor-pointer" 
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                >
                  <span className="material-symbols-outlined text-[18px]">{showPass ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              {/* Dynamic strength meter */}
              {strength && (
                <div className="mt-xs">
                  <div className="flex justify-between items-center mb-xs">
                    <span className="text-[10px] font-semibold" style={{ color: strength.color }}>{strength.label} password</span>
                  </div>
                  <div className="h-[3px] rounded-full bg-outline-variant/30">
                    <div className="h-full rounded-full transition-all duration-300"
                      style={{ width: strength.width, background: strength.color }} />
                  </div>
                </div>
              )}
            </div>

            {/* Primary Action */}
            <button 
              className="w-full mt-lg bg-primary-container text-on-primary-container font-label-sm text-label-sm font-semibold py-[12px] px-md rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-[#5a52f0] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface active:scale-[0.98] transition-all flex items-center justify-center gap-sm group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" 
              type="submit"
              disabled={loading || !isBackendConnected}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-on-primary-container/30 border-t-on-primary-container rounded-full animate-spin" /> 
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center py-lg">
            <div className="flex-grow border-t border-outline-variant/50"></div>
            <span className="flex-shrink-0 mx-md font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Already have an account?</span>
            <div className="flex-grow border-t border-outline-variant/50"></div>
          </div>

          {/* Login Redirect Button */}
          <button 
            className="w-full bg-transparent border border-outline-variant text-on-surface font-label-sm text-label-sm font-medium py-[10px] px-md rounded-lg hover:bg-surface-container-high focus:outline-none focus:ring-2 focus:ring-outline transition-colors flex items-center justify-center gap-sm cursor-pointer" 
            type="button"
            onClick={onLoginRedirect}
          >
            <span className="material-symbols-outlined text-[20px]">login</span>
            Sign In Instead
          </button>
        </div>
      </main>
    </div>
  );
};

export default Register;
