import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = ({ setIsAuthenticated, setUsername, setShowLogin, setShowRegister, setToken }) => {
  const [usernameLocal, setLocalUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Dynamic API_BASE: Use relative URL in production (same server), localhost in development
  const API_BASE = process.env.NODE_ENV === 'production' 
    ? '' // Relative URL - same server
    : 'http://localhost:8000';

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
      <div className="w-full max-w-md">
        {/* Login Form */}
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-white text-2xl font-semibold mb-6 text-center">Login</h2>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={usernameLocal}
              onChange={(e) => setLocalUsername(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />

            {error && (
              <div className="text-sm px-4 py-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300">
                {error}
              </div>
            )}

            <button 
              onClick={handleLogin} 
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              Login
            </button>

            <p className="text-gray-400 text-sm text-center pt-4">
              Don't have an account?{' '}
              <span
                className="text-blue-400 cursor-pointer hover:text-blue-300 hover:underline font-semibold"
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
    </div>
  );
};

export default Login;
