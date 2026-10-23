import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AuthAlert, AuthField, AuthLayout, AuthSubmit } from '../components/AuthLayout';

const Login = ({ onRegisterRedirect }) => {
  const { login, isBackendConnected } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      const status = err.response?.status;
      if (!err.response || !isBackendConnected) {
        setError("Can't reach the server. Please try again in a moment.");
      } else if (status === 401 || status === 403) {
        setError('Incorrect email or password.');
      } else if (status >= 500) {
        setError('Something went wrong on our side. Please try again.');
      } else {
        setError(err.response.data?.message || 'Incorrect email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back. Sign in to continue."
      footer={<>Don't have an account?{' '}
        <button type="button" onClick={onRegisterRedirect} className="font-medium text-primary hover:underline cursor-pointer">Create one</button>
      </>}
    >
      {!isBackendConnected && <AuthAlert>Can't reach the server right now. Sign-in will work once it's back.</AuthAlert>}
      {error && <AuthAlert>{error}</AuthAlert>}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AuthField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="name@company.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoFocus
          required
        />
        <AuthField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <div className="pt-2">
          <AuthSubmit loading={loading} loadingLabel="Signing in…" disabled={!isBackendConnected}>Sign in</AuthSubmit>
        </div>
      </form>
    </AuthLayout>
  );
};

export default Login;
