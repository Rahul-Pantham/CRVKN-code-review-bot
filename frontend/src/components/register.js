import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Dynamic API_BASE: Use relative URL in production (same server), localhost in development
const API_BASE = process.env.NODE_ENV === 'production' 
  ? '' // Relative URL - same server
  : 'http://localhost:8000';

const Register = ({ setShowLogin, setShowRegister, setIsAuthenticated, setUsername: setAppUsername, setToken }) => {
  const [step, setStep] = useState('register'); // 'register' or 'verify-otp'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess('Registration successful! Please check your email for the verification code.');
        setError('');
        setUserId(data.user_id);
        setStep('verify-otp');
      } else {
        setError(data.detail || 'Registration failed');
        setSuccess('');
      }
    } catch (error) {
      console.error('Register error:', error);
      setError('Failed to connect to backend: ' + (error?.message || String(error)));
      setSuccess('');
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp_code: otp }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess('Email verified successfully! Redirecting to login...');
        setError('');
        setTimeout(() => {
          if (setShowRegister) setShowRegister(false);
          if (setShowLogin) setShowLogin(true);
        }, 1500);
      } else {
        setError(data.detail || 'Invalid OTP');
        setSuccess('');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setError('Failed to verify OTP: ' + (error?.message || String(error)));
      setSuccess('');
    }
  };

  const handleResendOTP = async () => {
    try {
      const response = await fetch(`${API_BASE}/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess('New OTP sent! Please check your email.');
        setError('');
      } else {
        setError(data.detail || 'Failed to resend OTP');
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      setError('Failed to resend OTP: ' + (error?.message || String(error)));
    }
  };

  return (
    <div className="min-h-screen bg-[#343541] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Register Form */}
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-white text-2xl font-semibold mb-6 text-center">
            {step === 'register' ? 'Register' : 'Verify Email'}
          </h2>

          {step === 'register' ? (
            /* Registration Form */
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/50 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/50 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/50 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
              {error && <p className="text-sm px-4 py-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300">{error}</p>}
              {success && <p className="text-sm px-4 py-3 rounded-lg border border-green-500/30 bg-green-500/10 text-green-300">{success}</p>}
              <button
                onClick={handleRegister}
                disabled={!username || !email || !password}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed disabled:transform-none"
              >
                Register
              </button>
              <p className="text-gray-400 text-sm text-center pt-4">
                Already have an account?{' '}
                <span
                  className="text-purple-400 cursor-pointer hover:text-purple-300 hover:underline font-semibold"
                  onClick={() => { if (setShowLogin) { setShowRegister && setShowRegister(false); setShowLogin(true); } else { navigate('/login'); } }}
                >
                  Login
                </span>
              </p>
            </div>
          ) : (
            /* OTP Verification Form */
            <div className="space-y-4">
              <p className="text-gray-300 text-sm text-center mb-4">
                We've sent a 6-digit verification code to <span className="text-purple-400 font-semibold">{email}</span>
              </p>
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="w-full px-4 py-3 bg-gray-800/50 border border-white/20 rounded-lg text-white text-center text-2xl tracking-widest placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
              {error && <p className="text-sm px-4 py-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300">{error}</p>}
              {success && <p className="text-sm px-4 py-3 rounded-lg border border-green-500/30 bg-green-500/10 text-green-300">{success}</p>}
              <button
                onClick={handleVerifyOTP}
                disabled={otp.length !== 6}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed disabled:transform-none"
              >
                Verify Email
              </button>
              <button
                onClick={handleResendOTP}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 rounded-lg transition-all duration-200"
              >
                Resend Code
              </button>
              <p className="text-gray-400 text-sm text-center pt-2">
                <span
                  className="text-purple-400 cursor-pointer hover:text-purple-300 hover:underline font-semibold"
                  onClick={() => { setStep('register'); setError(''); setSuccess(''); }}
                >
                  ← Back to Registration
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;
