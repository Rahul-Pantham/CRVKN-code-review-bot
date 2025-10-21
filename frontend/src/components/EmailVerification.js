import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      verifyEmail(token);
    } else {
      setStatus('error');
      setMessage('Invalid verification link');
    }
  }, [searchParams]);

  const verifyEmail = async (token) => {
    try {
      const response = await fetch(`${API_BASE}/verify-email?token=${token}`, {
        method: 'GET',
      });
      
      if (response.ok) {
        setStatus('success');
        setMessage('Email verified successfully! You can now log in.');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        const data = await response.json();
        setStatus('error');
        setMessage(data.detail || 'Verification failed');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Failed to verify email: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#343541] flex items-center justify-center">
      <div className="bg-[#40414f] rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
        <div className="mb-6">
          <span className="text-white text-xl font-semibold">CRVKN</span>
        </div>
        
        <div className="space-y-6">
          {status === 'verifying' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#10a37f] mx-auto"></div>
              <h2 className="text-white text-xl">Verifying your email...</h2>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="text-green-500 text-4xl">✓</div>
              <h2 className="text-white text-xl">Email Verified!</h2>
              <p className="text-gray-300">{message}</p>
              <p className="text-sm text-gray-400">Redirecting to login...</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="text-red-500 text-4xl">✗</div>
              <h2 className="text-white text-xl">Verification Failed</h2>
              <p className="text-red-400">{message}</p>
              <button
                onClick={() => navigate('/register')}
                className="mt-4 px-6 py-2 bg-[#10a37f] text-white rounded hover:bg-[#0d8c6b]"
              >
                Back to Register
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;