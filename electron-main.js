const { app, BrowserWindow, session } = require('electron');
const path = require('path');

// Enable live reload for development
if (process.env.NODE_ENV === 'development') {
    require('electron-reload')(__dirname, {
        electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
        hardResetMethod: 'exit'
    });
}

function createWindow() {
    // Create the browser window with relaxed security for IPTV portal access
    const mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,              // Disable CORS restrictions
            allowRunningInsecureContent: true, // Allow HTTP content
            experimentalFeatures: true        // Enable experimental web features
        },
        show: false, // Don't show until ready
        title: 'IPTV Stalker Player',
        icon: path.join(__dirname, 'assets', 'icon.png'), // Optional: add app icon
        titleBarStyle: 'default',
        fullscreenable: true,
        autoHideMenuBar: true // Hide menu bar (can be toggled with Alt)
    });

    // Disable security features that block IPTV portals
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': ['*']
            }
        });
    });

    // Handle certificate errors (for HTTPS IPTV portals with self-signed certs)
    app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
        event.preventDefault();
        callback(true); // Accept all certificates
    });

    // Set user agent to match Smart STB for better portal compatibility
    mainWindow.webContents.setUserAgent(
        'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3'
    );

    // Load the index.html of the app
    mainWindow.loadFile('index.html');

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // Focus on window
        if (process.platform === 'darwin') {
            app.dock.show();
        }
        mainWindow.focus();
    });

    // Handle external links (open in default browser instead of Electron)
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        require('electron').shell.openExternal(url);
        return { action: 'deny' };
    });

    // Development tools
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    // Optimize for video playback
    mainWindow.webContents.on('dom-ready', () => {
        // Inject CSS for better video performance
        mainWindow.webContents.insertCSS(`
            video {
                background-color: black;
            }
            body {
                background-color: #1a1a1a;
            }
        `);
    });

    // Handle window closed
    mainWindow.on('closed', () => {
        app.quit();
    });

    return mainWindow;
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
    createWindow();

    // On macOS, re-create window when dock icon is clicked
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, navigationUrl) => {
        event.preventDefault();
        require('electron').shell.openExternal(navigationUrl);
    });
});

// Handle app protocol for better integration
app.setAsDefaultProtocolClient('iptv-stalker');

console.log('🚀 IPTV Stalker Player - Electron Edition');
console.log('✓ CORS restrictions disabled');
console.log('✓ VU IPTV/Smart STB user agent set');
console.log('✓ Certificate validation relaxed');
console.log('✓ Ready for real IPTV portal connections');