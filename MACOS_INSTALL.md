# OnlyWorks v2 - macOS Installation Guide

## 🍎 macOS App Bundle

For Mac users, we provide a native `.app` bundle that integrates seamlessly with macOS.

## 📥 Download Options

### Option 1: DMG Installer (Recommended)
1. Download `OnlyWorks-1.0.0.dmg`
2. Double-click to mount the disk image
3. Drag OnlyWorks.app to your Applications folder
4. Launch from Applications or Spotlight

### Option 2: ZIP Archive
1. Download `OnlyWorks-1.0.0-mac.zip`
2. Double-click to extract
3. Move OnlyWorks.app to your Applications folder
4. Launch from Applications or Spotlight

## 🔐 macOS Security & Permissions

### First Launch
When you first run OnlyWorks, macOS may show security warnings:

1. **"OnlyWorks" can't be opened because it's from an unidentified developer**
   - Right-click the app and select "Open"
   - Click "Open" in the dialog that appears
   - Or go to System Preferences > Security & Privacy > General and click "Open Anyway"

2. **Code Signing Notice**
   - The app is not code-signed with an Apple Developer certificate
   - This is normal for open-source applications
   - macOS will remember your choice after the first launch

### Required Permissions

OnlyWorks needs several permissions to function properly:

#### 🖱️ Accessibility Access (Required for Global Monitoring)
- **When prompted**: Click "Open System Preferences"
- **Manual setup**: System Preferences > Security & Privacy > Privacy > Accessibility
- **Add OnlyWorks**: Click the lock, then + button, select OnlyWorks.app
- **Purpose**: Enables global click and keyboard monitoring across all applications

#### 📷 Screen Recording (Required for Screenshots)
- **When prompted**: Click "Open System Preferences"
- **Manual setup**: System Preferences > Security & Privacy > Privacy > Screen Recording
- **Add OnlyWorks**: Click the lock, then + button, select OnlyWorks.app
- **Purpose**: Allows capturing screenshots for productivity analysis

#### 🌐 Network Access (Optional)
- Automatically granted on first network request
- **Purpose**: Connects to backend server for data synchronization

## ⚙️ System Requirements

- **macOS**: 10.14 (Mojave) or later
- **Architecture**: Intel x64 or Apple Silicon (M1/M2) - Universal build
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 200MB for application, additional for screenshots
- **Network**: Internet connection for backend synchronization

## 🚀 Quick Start

1. **Install the app** using one of the methods above
2. **Grant permissions** when prompted
3. **Start OnlyWorks** from Applications
4. **Setup backend** (see main documentation)
5. **Begin tracking** your productivity!

## 🔧 Troubleshooting

### App Won't Launch
- **Check permissions**: Ensure all required permissions are granted
- **Restart app**: Quit completely and relaunch
- **Check system version**: Ensure you're running macOS 10.14+

### Global Monitoring Not Working
- **Grant Accessibility**: Go to System Preferences > Security & Privacy > Accessibility
- **Restart required**: Quit and restart OnlyWorks after granting permissions
- **Check system integrity**: Some system protection features may interfere

### Performance Issues
- **Close unused apps**: Global monitoring works better with fewer running applications
- **Check storage**: Ensure adequate disk space for screenshot storage
- **Activity Monitor**: Check if OnlyWorks is consuming excessive resources

### Network Issues
- **Check backend**: Ensure the backend server is running and accessible
- **Firewall settings**: macOS firewall may block connections on first use
- **VPN interference**: Some VPNs may affect local backend connections

## 🍎 macOS-Specific Features

### Menu Bar Integration
- OnlyWorks appears in the menu bar when running
- Click the icon to quickly access session controls
- Right-click for additional options

### Notification Center
- Session updates appear in macOS notifications
- Productivity insights delivered via notification banners
- Configurable in System Preferences > Notifications

### Spotlight Integration
- Search "OnlyWorks" in Spotlight to quickly launch
- Session data may be indexed for Spotlight search (if enabled)

## 🔐 Privacy & Security

### Data Storage
- **Local storage**: Screenshots and session data stored in `~/Library/Application Support/OnlyWorks`
- **Keychain integration**: Secure storage of authentication tokens
- **iCloud sync**: Option to sync settings via iCloud (coming soon)

### System Integration
- **No system modifications**: OnlyWorks runs entirely in user space
- **Sandboxed**: App operates within macOS security sandbox
- **Permission-based**: All access requires explicit user consent

## 🔄 Updates

### Automatic Updates
- OnlyWorks checks for updates on launch
- Option to enable automatic updates in preferences
- Manual update check available in app menu

### Manual Updates
- Download new version from GitHub releases
- Replace existing app in Applications folder
- Settings and data are preserved across updates

## 🆘 Support

### Logs & Diagnostics
- **Console.app**: Search for "OnlyWorks" to see system logs
- **Activity Monitor**: Monitor resource usage and performance
- **Crash Reports**: Located in `~/Library/Logs/DiagnosticReports`

### Getting Help
- **GitHub Issues**: Report macOS-specific issues
- **System Information**: Include macOS version and hardware details
- **Permissions**: Screenshot of Security & Privacy settings helpful for troubleshooting

---

**Happy productivity tracking on macOS!** 🍎✨