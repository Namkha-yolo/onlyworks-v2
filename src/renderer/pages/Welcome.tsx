import React, { useState } from 'react';
import LoginButton from '../components/auth/LoginButton';
import logoDark from '../assets/images/logo-dark.png';
import logoLight from '../assets/images/logo-light.png';
import { useThemeStore } from '../stores/themeStore';

const Welcome: React.FC = () => {
  const [showLogin, setShowLogin] = useState(false);
  const actualTheme = useThemeStore((state) => state.actualTheme);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-4">
          <img
            src={actualTheme === 'dark' ? logoLight : logoDark}
            alt="OnlyWorks"
            className="h-16 w-auto"
          />
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Welcome to OnlyWorks
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Your productivity companion for focused work sessions
            </p>
            <span className="inline-block mt-2 px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
              BETA v2
            </span>
          </div>
        </div>

        {/* Features */}
        {!showLogin && (
          <>
            <div className="space-y-6 text-left">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white text-center">
                What's new in v2?
              </h2>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Smart Screenshot Capture</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Automatic screenshots with AI-powered productivity analysis</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Cloud Sync & Teams</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Sync your data across devices and collaborate with teams</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Advanced Analytics</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Detailed reports and insights about your work patterns</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setShowLogin(true)}
                className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Get Started
              </button>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </>
        )}

        {/* Login Section */}
        {showLogin && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Sign in to your account
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Connect your account to start tracking your productivity
              </p>
            </div>

            <div className="space-y-3">
              <LoginButton
                provider="google"
                className="w-full"
                variant="primary"
                size="large"
              />
              <LoginButton
                provider="github"
                className="w-full"
                variant="outline"
                size="large"
              />
            </div>

            <button
              onClick={() => setShowLogin(false)}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              ← Back to welcome
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Welcome;