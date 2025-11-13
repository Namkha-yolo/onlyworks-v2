# OnlyWorks v2 - Production Release v1.0.0

## 🎉 Major Release: Enhanced Productivity Tracking

This is a significant update to OnlyWorks with powerful new features and critical bug fixes for a better user experience.

## 🚀 What's New

### ⭐ Major Features
- **🌐 Global Activity Monitoring** - Track clicks and keyboard activity across all applications, not just within OnlyWorks
- **🎯 Intelligent Scoring System** - Automatic productivity and focus scores based on session duration and activity
- **📊 Adaptive Screenshot Analysis** - Get insights faster with reduced screenshot requirements (5-20 vs 30 previously)
- **⚡ Enhanced Session Management** - Accurate duration tracking and improved backend synchronization

### 🔧 Key Improvements
- **Fixed 404 errors** for goals API endpoints
- **Resolved session duration** showing as 0 seconds
- **Fixed productivity/focus scores** showing as null
- **Improved global click detection** beyond app boundaries
- **Enhanced error handling** and network resilience

## 📦 Download & Installation

1. **Download** the release archive below
2. **Extract** to your desired location
3. **Install dependencies**: `npm install`
4. **Setup backend** (see documentation)
5. **Start application**: `npm start`

## 📋 System Requirements

- **Node.js** 18+
- **Operating System**: macOS 10.14+, Windows 10+, or Linux Ubuntu 18.04+
- **Permissions**: Accessibility permissions for global monitoring features

## 🔗 Backend Server Required

This frontend application requires the backend server from:
**[onlyworks-backend-server](https://github.com/Namkha-yolo/onlyworks-backend-server)**

Follow the setup instructions in the included `DEPLOYMENT.md` file.

## 📖 Documentation Included

- **README.md** - Quick start guide
- **DEPLOYMENT.md** - Complete setup instructions
- **RELEASE_NOTES.md** - Detailed changelog and features

## ⚡ Performance Improvements

- **75% faster analysis** - Reduced screenshot requirements
- **Better memory management** - Improved screenshot cleanup
- **Global monitoring** - Low-overhead system-wide activity tracking
- **Network resilience** - Smart retry mechanisms and offline handling

## 🔐 Privacy & Security

- **Permission-based monitoring** - Global features require explicit user consent
- **Local-first storage** - Screenshots stored locally by default
- **Optional cloud sync** - Supabase integration available but not required
- **Data minimization** - Only captures necessary metadata

## 🐛 Known Issues

- Global monitoring may require app restart on some systems
- First-time permission setup varies by operating system
- Very short sessions (< 1 minute) don't generate scores

## 📞 Support

- **Issues**: Report bugs in this repository's Issues section
- **Documentation**: Check the included documentation files
- **Backend Issues**: Report backend-related issues in the onlyworks-backend-server repository

---

**Full Changelog**: See `RELEASE_NOTES.md` in the download for complete details

**Backend Repository**: [onlyworks-backend-server](https://github.com/Namkha-yolo/onlyworks-backend-server)