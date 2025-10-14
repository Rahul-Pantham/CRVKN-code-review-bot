import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = ({ setIsAuthenticated, setUsername, setShowLogin, setShowRegister, setToken }) => {
  const [usernameLocal, setLocalUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'username': usernameLocal,
          'password': password,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        if (setToken) setToken(data.access_token);
        if (setUsername) setUsername(usernameLocal);
        if (setIsAuthenticated) setIsAuthenticated(true);
        if (setShowLogin) {
          setShowLogin(false);
        } else {
          navigate('/');
        }
      } else {
        setError('Incorrect username or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Failed to connect to backend: ' + (error?.message || String(error)));
    }
  };

  return (
    <div className="min-h-screen bg-[#343541] flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <span className="text-white text-xl font-semibold tracking-wide">CRVKN</span>
        </div>

        <h2 className="text-white text-2xl font-semibold mb-5">Login</h2>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={usernameLocal}
            onChange={(e) => setLocalUsername(e.target.value)}
            className="field"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
          />

          {error && (
            <div className="text-sm px-3 py-2 rounded border border-red-500/30 bg-red-500/10 text-red-300">
              {error}
            </div>
          )}

          <button onClick={handleLogin} className="w-full btn btn-auth justify-center text-base py-3">
            Login
          </button>

          <p className="text-gray-300 text-sm text-center">
            Don't have an account?{' '}
            <span
              className="text-[var(--color-auth)] cursor-pointer hover:underline"
              onClick={() => {
                if (setShowRegister) {
                  setShowLogin && setShowLogin(false);
                  setShowRegister(true);
                } else {
                  navigate('/register');
                }
              }}
            >
              Register
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
