import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Register = ({ setShowLogin, setShowRegister, setIsAuthenticated, setUsername: setAppUsername, setToken }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      if (response.ok) {
        // Registration successful — require explicit login
        setSuccess('Registration successful. Please log in to continue.');
        setError('');
        // Close register modal and open login modal (if available)
        if (setShowRegister) setShowRegister(false);
        if (setShowLogin) setShowLogin(true);
      } else {
        const data = await response.json();
        setError(data.detail || 'Registration failed');
        setSuccess('');
      }
    } catch (error) {
      console.error('Register error:', error);
      setError('Failed to connect to backend: ' + (error?.message || String(error)));
      setSuccess('');
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
        <h2 className="text-white text-2xl font-medium mb-6">Register</h2>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
          {success && <p className="text-[#10a37f] text-sm">{success}</p>}
          <button
            onClick={handleRegister}
            className="w-full bg-[#10a37f] text-white py-3 rounded-lg hover:bg-[#0d8c6b] font-medium"
          >
            Register
          </button>
          <p className="text-gray-300 text-sm text-center">
            Already have an account?{' '}
            <span
              className="text-[#10a37f] cursor-pointer hover:underline"
              onClick={() => { if (setShowLogin) { setShowRegister && setShowRegister(false); setShowLogin(true); } else { navigate('/login'); } }}
            >
              Login
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
