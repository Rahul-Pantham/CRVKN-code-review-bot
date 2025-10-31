import React from 'react';
import { User, Shield } from 'lucide-react';

const RoleSelection = ({ onSelectRole }) => {
  return (
    <div className="min-h-screen bg-[#343541] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Logo and Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl mb-6 shadow-2xl">
            <span className="text-4xl font-bold text-white">□</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-3">
            codeGem
          </h1>
          <p className="text-xl text-gray-400">Code Review Bot</p>
        </div>

        {/* Role Selection */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-white mb-2">Choose Your Access Level</h2>
          <p className="text-gray-400">Select how you want to use codeGem</p>
        </div>

        {/* Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* User Option */}
          <button
            onClick={() => onSelectRole('user')}
            className="group relative overflow-hidden bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-2 border-blue-500/30 rounded-2xl p-8 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 transform hover:scale-105"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-blue-500/50 transition-shadow duration-300">
                <User className="w-10 h-10 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">User</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Get AI-powered code reviews, upload files, and review Git repositories
                </p>
              </div>
              <div className="pt-4">
                <div className="inline-flex items-center gap-2 text-blue-400 font-semibold">
                  <span>Continue as User</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </div>
            
            {/* Feature badges */}
            <div className="mt-6 pt-6 border-t border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="text-green-400">✓</span>
                <span>Code Analysis</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="text-green-400">✓</span>
                <span>Multi-file Upload</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="text-green-400">✓</span>
                <span>Git Repository Review</span>
              </div>
            </div>
          </button>

          {/* Admin Option */}
          <button
            onClick={() => onSelectRole('admin')}
            className="group relative overflow-hidden bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-2 border-purple-500/30 rounded-2xl p-8 hover:border-purple-500 hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 transform hover:scale-105"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-purple-500/50 transition-shadow duration-300">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Admin</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Access admin dashboard, view analytics, and manage the platform
                </p>
              </div>
              <div className="pt-4">
                <div className="inline-flex items-center gap-2 text-purple-400 font-semibold">
                  <span>Continue as Admin</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </div>
            
            {/* Feature badges */}
            <div className="mt-6 pt-6 border-t border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="text-green-400">✓</span>
                <span>Dashboard Access</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="text-green-400">✓</span>
                <span>Analytics & Stats</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="text-green-400">✓</span>
                <span>User Management</span>
              </div>
            </div>
          </button>
        </div>

        {/* Footer note */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>💡 You can always switch between modes later</p>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
