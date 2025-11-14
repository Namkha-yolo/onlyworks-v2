# OnlyWorks v2 - Production Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 8+
- Git

### Frontend Application (Electron App)

1. **Clone and Setup**
   ```bash
   git clone https://github.com/Namkha-yolo/onlyworks-dist.git
   cd onlyworks-dist
   npm install
   ```

2. **Run the Application**
   ```bash
   npm start
   ```

### Backend Server Setup

The backend server is in a separate repository: `onlyworks-backend-server`

1. **Clone Backend**
   ```bash
   git clone https://github.com/Namkha-yolo/onlyworks-backend-server.git
   cd onlyworks-backend-server
   npm install
   ```

2. **Environment Configuration**
   Create `.env` file in backend:
   ```env
   DATABASE_URL=your_postgresql_database_url
   JWT_SECRET=your_jwt_secret_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   PORT=8080
   ```

3. **Start Backend Server**
   ```bash
   npm start
   ```

## 🔧 Configuration

### Frontend Configuration
Set environment variables or update the app to point to your backend:
```env
ONLYWORKS_SERVER_URL=https://onlyworks-backend-server.onrender.com
```

### Backend Configuration
Ensure your PostgreSQL database is set up with the required schema. Check the backend repository for database migration scripts.

## 📋 Features Included in This Version

### ✅ New Features Added
1. **Global Click Detection** - System-wide mouse and keyboard monitoring
2. **Improved Session Duration** - Accurate calculation and backend sync
3. **Automatic Score Calculation** - Productivity and focus scores for all sessions
4. **Adaptive Screenshot Analysis** - Works with minimal session data

### 🔧 Technical Improvements
- Enhanced error handling for API calls
- Better TypeScript type safety
- Improved session management
- Global event monitoring using uiohook-napi
- Reduced analysis thresholds for faster insights

## 🏗️ Architecture

```
┌─────────────────────┐    ┌─────────────────────┐
│                     │    │                     │
│   Electron App      │◄──►│   Backend Server    │
│   (Frontend)        │    │   (Node.js/Express) │
│                     │    │                     │
└─────────────────────┘    └─────────────────────┘
           │                          │
           │                          │
           ▼                          ▼
┌─────────────────────┐    ┌─────────────────────┐
│                     │    │                     │
│   Local Storage     │    │   PostgreSQL DB    │
│   (Screenshots)     │    │   (Sessions/Users)  │
│                     │    │                     │
└─────────────────────┘    └─────────────────────┘
```

## 🚨 System Requirements

### macOS
- macOS 10.14 or later
- Accessibility permissions for global monitoring

### Windows
- Windows 10 or later
- Administrator privileges may be required for global hooks

### Linux
- Ubuntu 18.04+ or equivalent
- X11 or Wayland display server

## 📊 Monitoring & Analytics

The application now provides:
- Real-time productivity scoring
- Focus time analysis
- Global activity tracking
- Session duration metrics
- AI-powered work insights

## 🔐 Privacy & Security

- Screenshots are stored locally by default
- Optional Supabase cloud storage
- No sensitive data transmitted without consent
- Global monitoring can be disabled per session

## 🐛 Troubleshooting

### Common Issues

1. **Global Click Detection Not Working**
   - Check system permissions for accessibility
   - Restart application with admin privileges

2. **Backend Connection Failed**
   - Verify backend server is running on port 8080
   - Check firewall settings
   - Ensure CORS is properly configured

3. **Sessions Not Saving**
   - Check database connection
   - Verify JWT token configuration
   - Review server logs for errors

## 📞 Support

For issues and support:
- Frontend: GitHub Issues on onlyworks-dist repository
- Backend: GitHub Issues on onlyworks-backend-server repository

## 🔄 Version History

### v1.0.0 (Current)
- Global click and keyboard monitoring
- Improved session tracking
- Automatic productivity scoring
- Enhanced screenshot analysis
- Better error handling and stability

---

Built with ❤️ by the OnlyWorks Team