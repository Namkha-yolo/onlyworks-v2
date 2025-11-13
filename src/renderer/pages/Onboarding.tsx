import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import logoDark from '../assets/images/logo-dark.png';
import logoLight from '../assets/images/logo-light.png';
import { useThemeStore } from '../stores/themeStore';

interface OnboardingData {
  fullName: string;
  username: string;
  company: string;
  role: string;
  workField: string;
  experience: string;
  goals: string[];
  workStyle: string;
  teamSize: string;
  timezone: string;
}

const Onboarding: React.FC = () => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuthStore();
  const actualTheme = useThemeStore((state) => state.actualTheme);

  const [data, setData] = useState<OnboardingData>({
    fullName: user?.name || '',
    username: '',
    company: '',
    role: '',
    workField: '',
    experience: '',
    goals: [],
    workStyle: '',
    teamSize: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const totalSteps = 4;

  const updateData = (field: keyof OnboardingData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleGoalToggle = (goal: string) => {
    const goals = data.goals.includes(goal)
      ? data.goals.filter(g => g !== goal)
      : [...data.goals, goal];
    updateData('goals', goals);
  };

  const completeOnboarding = async () => {
    setIsLoading(true);
    try {
      // TODO: Send onboarding data to backend
      console.log('Onboarding data:', data);

      // Update user profile with onboarding completion
      // For now, we'll store in localStorage
      localStorage.setItem('onboarding_completed', 'true');
      localStorage.setItem('onboarding_data', JSON.stringify(data));

      // Trigger a custom event to notify the app of completion
      window.dispatchEvent(new CustomEvent('onboarding-completed'));
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return data.fullName.trim() && data.username.trim() && data.company.trim();
      case 2:
        return data.role.trim() && data.workField.trim() && data.experience.trim();
      case 3:
        return data.goals.length > 0;
      case 4:
        return data.workStyle.trim() && data.teamSize.trim();
      default:
        return false;
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Let's get to know you
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Help us personalize your OnlyWorks experience
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Full Name
          </label>
          <input
            type="text"
            value={data.fullName}
            onChange={(e) => updateData('fullName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your full name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Username
          </label>
          <input
            type="text"
            value={data.username}
            onChange={(e) => updateData('username', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Choose a username"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Company/Organization
          </label>
          <input
            type="text"
            value={data.company}
            onChange={(e) => updateData('company', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Where do you work?"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Tell us about your work
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          This helps us provide relevant insights and suggestions
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Job Title/Role
          </label>
          <input
            type="text"
            value={data.role}
            onChange={(e) => updateData('role', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. Software Engineer, Designer, Manager"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Field of Work
          </label>
          <select
            value={data.workField}
            onChange={(e) => updateData('workField', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select your field</option>
            <option value="software-engineering">Software Engineering</option>
            <option value="design">Design (UI/UX)</option>
            <option value="product-management">Product Management</option>
            <option value="marketing">Marketing</option>
            <option value="sales">Sales</option>
            <option value="data-science">Data Science/Analytics</option>
            <option value="research">Research & Development</option>
            <option value="consulting">Consulting</option>
            <option value="finance">Finance</option>
            <option value="legal">Legal</option>
            <option value="education">Education</option>
            <option value="healthcare">Healthcare</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Experience Level
          </label>
          <select
            value={data.experience}
            onChange={(e) => updateData('experience', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select experience level</option>
            <option value="entry">Entry Level (0-2 years)</option>
            <option value="mid">Mid Level (2-5 years)</option>
            <option value="senior">Senior Level (5-10 years)</option>
            <option value="lead">Lead/Principal (10+ years)</option>
            <option value="executive">Executive/C-level</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => {
    const goalOptions = [
      'Improve Focus & Concentration',
      'Reduce Distractions',
      'Track Time Better',
      'Increase Productivity',
      'Work-Life Balance',
      'Team Collaboration',
      'Project Management',
      'Skill Development',
      'Health & Wellness',
      'Goal Achievement'
    ];

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            What are your goals?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Select all that apply - we'll help you achieve them
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {goalOptions.map((goal) => (
            <button
              key={goal}
              onClick={() => handleGoalToggle(goal)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                data.goals.includes(goal)
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{goal}</span>
                {data.goals.includes(goal) && (
                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Final setup
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Help us understand your work environment
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Work Style
          </label>
          <select
            value={data.workStyle}
            onChange={(e) => updateData('workStyle', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select work style</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="office">Office</option>
            <option value="freelance">Freelance</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Team Size
          </label>
          <select
            value={data.teamSize}
            onChange={(e) => updateData('teamSize', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select team size</option>
            <option value="solo">Solo (Just me)</option>
            <option value="small">Small (2-5 people)</option>
            <option value="medium">Medium (6-20 people)</option>
            <option value="large">Large (21-100 people)</option>
            <option value="enterprise">Enterprise (100+ people)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Timezone
          </label>
          <input
            type="text"
            value={data.timezone}
            onChange={(e) => updateData('timezone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Auto-detected timezone"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <img
            src={actualTheme === 'dark' ? logoLight : logoDark}
            alt="OnlyWorks"
            className="h-12 w-auto mx-auto mb-4"
          />
          <div className="flex items-center justify-center space-x-2 mb-6">
            {[1, 2, 3, 4].map((stepNum) => (
              <div
                key={stepNum}
                className={`w-3 h-3 rounded-full ${
                  stepNum === step
                    ? 'bg-blue-600'
                    : stepNum < step
                    ? 'bg-blue-400'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Step {step} of {totalSteps}
          </p>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={prevStep}
            disabled={step === 1}
            className={`px-6 py-2 rounded-lg font-medium ${
              step === 1
                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            ← Back
          </button>

          {step < totalSteps ? (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className={`px-6 py-2 rounded-lg font-medium ${
                canProceed()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={completeOnboarding}
              disabled={!canProceed() || isLoading}
              className={`px-6 py-2 rounded-lg font-medium ${
                canProceed() && !isLoading
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Setting up...' : 'Complete Setup'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;