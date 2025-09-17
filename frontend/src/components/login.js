/*import React, { useState } from 'react';
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
      const response = await fetch('/token', {
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
    <div className="min-h-screen bg-[#343541] flex items-center justify-center">
      <div className="bg-[#40414f] rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
            <div className="w-8 h-8 bg-[#343541] rounded flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
            </div>
          </div>
          <span className="text-white text-xl font-semibold">CRVKN</span>
        </div>
        <h2 className="text-white text-2xl font-medium mb-6">Login</h2>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={usernameLocal}
            onChange={(e) => setLocalUsername(e.target.value)}
            className="w-full bg-[#343541] text-white placeholder-gray-400 rounded-lg p-3 outline-none"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#343541] text-white placeholder-gray-400 rounded-lg p-3 outline-none"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            onClick={handleLogin}
            className="w-full bg-[#10a37f] text-white py-3 rounded-lg hover:bg-[#0d8c6b] font-medium"
          >
            Login
          </button>
          <p className="text-gray-300 text-sm text-center">
            Don't have an account?{' '}
            <span
              className="text-[#10a37f] cursor-pointer hover:underline"
              onClick={() => { if (setShowRegister) { setShowLogin && setShowLogin(false); setShowRegister(true); } else { navigate('/register'); } }}
            >
              Register
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;*/

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
    <div className="min-h-screen bg-[#343541] flex items-center justify-center">
      <div className="bg-[#40414f] rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
            <div className="w-8 h-8 bg-[#343541] rounded flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
            </div>
          </div>
          <span className="text-white text-xl font-semibold">CRVKN</span>
        </div>
        <h2 className="text-white text-2xl font-medium mb-6">Login</h2>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={usernameLocal}
            onChange={(e) => setLocalUsername(e.target.value)}
            className="w-full bg-[#343541] text-white placeholder-gray-400 rounded-lg p-3 outline-none"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#343541] text-white placeholder-gray-400 rounded-lg p-3 outline-none"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            onClick={handleLogin}
            className="w-full bg-[#10a37f] text-white py-3 rounded-lg hover:bg-[#0d8c6b] font-medium"
          >
            Login
          </button>
          <p className="text-gray-300 text-sm text-center">
            Don't have an account?{' '}
            <span
              className="text-[#10a37f] cursor-pointer hover:underline"
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

