import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

const Register = ({ setShowLogin, setShowRegister, setIsAuthenticated, setUsername: setAppUsername, setToken }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [userId, setUserId] = useState(null);
  const [step, setStep] = useState(1); // 1: registration form, 2: OTP verification
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isResending, setIsResending] = useState(false);
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
      if (response.ok) {
        const data = await response.json();
        setUserId(data.user_id);
        setStep(2); // Move to OTP verification step
        setSuccess('Registration successful! Please check your email for verification code.');
        setError('');
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

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId, otp_code: otp }),
      });
      if (response.ok) {
        setSuccess('Email verified successfully! You can now log in.');
        setError('');
        setTimeout(() => {
          if (setShowRegister) setShowRegister(false);
          if (setShowLogin) setShowLogin(true);
        }, 2000);
      } else {
        const data = await response.json();
        setError(data.detail || 'OTP verification failed');
        setSuccess('');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setError('Failed to verify OTP: ' + (error?.message || String(error)));
      setSuccess('');
    }
  };

  const handleResendOTP = async () => {
    setIsResending(true);
    try {
      const response = await fetch(`${API_BASE}/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      if (response.ok) {
        setSuccess('New verification code sent to your email!');
        setError('');
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to resend OTP');
        setSuccess('');
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      setError('Failed to resend OTP: ' + (error?.message || String(error)));
      setSuccess('');
    } finally {
      setIsResending(false);
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
        <h2 className="text-white text-2xl font-medium mb-6">
          {step === 1 ? 'Register' : 'Verify Email'}
        </h2>

        {step === 1 ? (
          // Registration Form
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#343541] text-white placeholder-gray-400 rounded-lg p-3 outline-none"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              disabled={!username || !email || !password}
              className="w-full bg-[#10a37f] text-white py-3 rounded-lg hover:bg-[#0d8c6b] font-medium disabled:bg-gray-600 disabled:cursor-not-allowed"
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
        ) : (
          // OTP Verification Form
          <div className="space-y-4">
            <p className="text-gray-300 text-sm mb-4">
              We've sent a 6-digit verification code to <strong>{email}</strong>
            </p>
            <input
              type="text"
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full bg-[#343541] text-white placeholder-gray-400 rounded-lg p-3 outline-none text-center text-lg tracking-wider"
              maxLength="6"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {success && <p className="text-[#10a37f] text-sm">{success}</p>}
            <button
              onClick={handleVerifyOTP}
              disabled={otp.length !== 6}
              className="w-full bg-[#10a37f] text-white py-3 rounded-lg hover:bg-[#0d8c6b] font-medium disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              Verify Email
            </button>
            <div className="flex justify-between items-center">
              <button
                onClick={() => setStep(1)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ← Back to Registration
              </button>
              <button
                onClick={handleResendOTP}
                disabled={isResending}
                className="text-[#10a37f] hover:underline text-sm disabled:text-gray-500"
              >
                {isResending ? 'Sending...' : 'Resend Code'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;
