# OnlyWorks v2 - Release Notes v1.0.0

## 🎉 Major Release: Enhanced Productivity Tracking

### 🚀 New Features

#### 1. **Global Activity Monitoring**
- **System-wide Click Detection**: Tracks mouse clicks anywhere on your system, not just within the app
- **Global Keyboard Shortcuts**: Monitors Ctrl/Cmd+C, Ctrl/Cmd+V, and Enter key presses across all applications
- **Cross-Application Tracking**: True productivity monitoring across your entire workflow

#### 2. **Intelligent Session Scoring**
- **Automatic Productivity Scores**: Calculates scores based on session duration, activity level, and goal alignment
- **Focus Score Calculation**: Measures sustained attention and deep work periods
- **Duration-Based Analytics**: Longer, focused sessions receive higher scores
- **Goal Alignment Bonus**: Sessions with meaningful goals get score bonuses

#### 3. **Adaptive Screenshot Analysis**
- **Reduced Analysis Thresholds**:
  - Short sessions (≤10 screenshots): Analyze with just 5 screenshots
  - Medium sessions (≤20 screenshots): Analyze with 10 screenshots
  - Long sessions: Analyze with 20 screenshots (reduced from 30)
- **Minimal Data Analysis**: Provides insights even for brief work sessions
- **Forced Analysis**: Automatically analyzes short sessions with at least 2 screenshots

#### 4. **Enhanced Session Management**
- **Accurate Duration Tracking**: Frontend calculates and syncs duration with backend
- **Robust Error Handling**: Better handling of network issues and API failures
- **Session State Persistence**: Maintains session data across app restarts

### 🔧 Technical Improvements

#### Backend Integration
- **Enhanced API Endpoints**: Added missing `/goals` endpoints for goal management
- **Session Data Sync**: Proper duration and end time transmission to backend
- **Score Updates**: Automatic score updating when sessions end
- **Error Recovery**: Graceful handling of backend connectivity issues

#### Performance Optimizations
- **Efficient Event Monitoring**: Uses `uiohook-napi` for low-overhead global event detection
- **Adaptive Batching**: Smart screenshot analysis batching based on session length
- **Memory Management**: Improved screenshot storage and cleanup
- **Network Resilience**: Better handling of offline scenarios

#### Code Quality
- **TypeScript Fixes**: Resolved all type safety issues
- **Better Error Messages**: More informative logging and error reporting
- **Code Organization**: Cleaner separation of concerns and modularity

### 🛠️ Bug Fixes

1. **Fixed 404 errors** for `/goals` API endpoints
2. **Resolved session duration** showing as 0 seconds
3. **Fixed productivity/focus scores** showing as null
4. **Improved click detection** beyond app window boundaries
5. **Enhanced screenshot analysis** for minimal session data

### ⚡ Performance Metrics

- **Faster Analysis**: Analysis now triggers with 75% fewer screenshots required
- **Reduced Memory Usage**: Better screenshot cleanup and management
- **Improved Responsiveness**: Global event monitoring with minimal system impact
- **Network Efficiency**: Smart batching and retry mechanisms

### 🔐 Privacy & Security

- **Permission-Based Monitoring**: Global monitoring requires explicit user consent
- **Local-First Storage**: Screenshots stored locally by default
- **Optional Cloud Sync**: Supabase integration for backup and sync (optional)
- **Data Minimization**: Only captures necessary metadata

### 📋 System Requirements

#### Supported Platforms
- **macOS**: 10.14+ (requires Accessibility permissions)
- **Windows**: 10+ (may require Administrator privileges)
- **Linux**: Ubuntu 18.04+ with X11/Wayland

#### Dependencies
- Node.js 18+
- Electron 38+
- PostgreSQL database (for backend)

### 🚀 Getting Started

1. **Download**: Get the latest release from GitHub
2. **Install Dependencies**: `npm install`
3. **Setup Backend**: Follow backend setup guide
4. **Run Application**: `npm start`
5. **Grant Permissions**: Allow accessibility permissions when prompted

### 🔄 Migration Guide

If upgrading from a previous version:

1. **Backup Data**: Export your session data before upgrading
2. **Update Dependencies**: Run `npm install` to get latest packages
3. **Database Migration**: Run backend migrations if required
4. **Permission Reset**: Re-grant system permissions if needed

### 🐛 Known Issues

- Global monitoring may require app restart on some systems
- First-time permission setup varies by operating system
- Very short sessions (< 1 minute) don't generate scores

### 📞 Support

- **Issues**: Report bugs on GitHub
- **Documentation**: Check DEPLOYMENT.md for setup instructions
- **Community**: Join our community discussions

### 🔮 Coming Next

- AI-powered productivity insights
- Team collaboration features
- Advanced analytics dashboard
- Mobile companion app
- Custom productivity metrics

---

**Download**: [GitHub Releases](https://github.com/Namkha-yolo/onlyworks-dist/releases/tag/v1.0.0)

**Backend**: [OnlyWorks Backend Server](https://github.com/Namkha-yolo/onlyworks-backend-server)

Built with ❤️ by the OnlyWorks Team