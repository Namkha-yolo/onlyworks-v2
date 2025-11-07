module.exports = {
  darkMode: 'class',
  content: [
    './src/renderer/**/*.{js,jsx,ts,tsx}',
    './src/renderer/index.html',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef0fe',
          100: '#dee2fd',
          200: '#cdd4fc',
          300: '#bdc5fc',
          400: '#9ca9fa',
          500: '#5b70f8',
          600: '#5164df',
          700: '#4859c6',
          800: '#3f4ead',
          900: '#364394',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          800: '#1f2937',
          900: '#111827',
        },
      },
    },
  },
  plugins: [],
};