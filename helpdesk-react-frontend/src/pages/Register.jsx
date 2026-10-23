import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AuthAlert, AuthField, AuthLayout, AuthSubmit } from '../components/AuthLayout';

const Register = ({ onLoginRedirect }) => {
  const { register, isBackendConnected } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) { setError('Please fill in all fields.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await register(name, email, password);
      setSuccess('Account created. Taking you to sign in…');
      setTimeout(onLoginRedirect, 1500);
    } catch (err) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (!isBackendConnected) {
        setError("Can't reach the server. Please try again in a moment.");
      } else {
        setError('We couldn’t create your account. This email may already be registered.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Get help from our support team."
      footer={<>Already have an account?{' '}
        <button type="button" onClick={onLoginRedirect} className="font-medium text-primary hover:underline cursor-pointer">Sign in</button>
      </>}
    >
      {!isBackendConnected && <AuthAlert>Can't reach the server right now. Sign-up will work once it's back.</AuthAlert>}
      {success && <AuthAlert tone="success">{success}</AuthAlert>}
      {error && <AuthAlert>{error}</AuthAlert>}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AuthField
          id="name"
          label="Full name"
          autoComplete="name"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
          required
        />
        <AuthField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="name@company.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <AuthField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <div className="pt-2">
          <AuthSubmit loading={loading} loadingLabel="Creating account…" disabled={!isBackendConnected || !!success}>Create account</AuthSubmit>
        </div>
      </form>
    </AuthLayout>
  );
};

export default Register;
