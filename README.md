# IPTV App - LG webOS 6.0.0 Production Deployment Guide

## Overview
This application is now production-ready for LG webOS 6.0.0 Virtual Machine deployment. It provides a complete IPTV experience with Stalker portal middleware compatibility.

## webOS Deployment

### 1. App Package Structure
```
iptv-app/
├── appinfo.json          # webOS app configuration
├── index.html           # Login page
├── home.html            # Main content browser  
├── player.html          # Media player
├── settings.html        # Settings page
├── css/
│   └── style.css        # Application styles
├── js/
│   ├── auth.js          # Authentication & session management
│   ├── api.js           # Stalker API integration
│   ├── webos-player.js  # webOS media player
│   ├── webos-remote.js  # Remote control handling
│   ├── epg.js           # Electronic Program Guide
│   ├── favorites.js     # Favorites management
│   ├── login.js         # Login functionality
│   ├── home.js          # Home page functionality
│   ├── player.js        # Player functionality
│   └── settings.js      # Settings functionality
└── README.md            # This file
```

### 2. webOS SDK Setup
1. Install LG webOS SDK
2. Create webOS project: `ares-generate -t web-app iptv-stalker`
3. Copy all files to project directory
4. Package app: `ares-package .`
5. Install on emulator: `ares-install com.iptv.stalker_1.0.0_all.ipk -d emulator`

### 3. webOS 6.0.0 Virtual Machine Testing
- Tested on LG webOS 6.0.0 Virtual Machine
- Remote control navigation fully functional
- Media playback optimized for TV hardware
- Performance tested for 1920x1080 resolution

## Features

### Authentication System
- **MAC Address + Portal URL login** (Stalker middleware compatible)
- **Auto MAC generation** for virtual testing
- **Multi-portal management** with saved credentials
- **Session keep-alive** mechanism

### Content Management
- **Live TV Channels** with genre filtering
- **Movies & Series** (VOD) with categories
- **Radio Stations** support
- **Electronic Program Guide (EPG)** with timeline view
- **Favorites system** for all content types

### Media Playback
- **webOS media APIs** integration with HTML5 fallback
- **Multiple formats**: HLS, DASH, MP4, TS
- **Codec support**: H.264, H.265, VP8, VP9, AAC, MP3, AC3, EAC3
- **Remote control integration** for playback control

### User Interface
- **10-foot interface** optimized for TV viewing
- **Remote control navigation** with visual focus
- **Color button functions**: Red (Favorites), Green (EPG), Yellow (Settings), Blue (Menu)
- **Responsive design** for different screen sizes

## Portal Configuration

### Supported Portal Formats
- `http://example.com:8080/stalker_portal/api/v1/`
- `http://example.com:8080/` (auto-appends API path)
- `example.com:8080` (auto-adds protocol and path)

### MAC Address Format
- Standard format: `00:1a:79:xx:xx:xx`
- Auto-generation available for testing
- Virtual MAC addresses supported

## API Integration

### Stalker Portal Endpoints
- Authentication handshake with token management
- Channel listing with genre filtering
- Movie/series listing with categories
- Stream URL generation for all content types
- EPG data retrieval and parsing
- Profile information and status

### Keep-Alive Mechanism
- Automatic session maintenance every 10 minutes
- Graceful handling of connection failures
- Automatic re-authentication when needed

## Remote Control Mapping

### Navigation
- **Arrow Keys**: Navigate through interface
- **Enter**: Select/activate focused element
- **Back/Escape**: Go back or exit

### Media Control
- **Play/Pause**: Toggle playback
- **Stop**: Stop playback and return
- **Volume Up/Down**: Adjust audio level
- **Mute**: Toggle audio mute

### Color Buttons
- **Red**: Toggle favorites for current content
- **Green**: Show EPG guide
- **Yellow**: Open settings
- **Blue**: Show favorites/menu

## Error Handling

### Network Issues
- Automatic retry mechanisms
- CORS error detection and user feedback
- Timeout handling with appropriate messages

### Stream Playback
- Format detection and fallback options
- Error recovery with alternative stream sources
- User-friendly error messages

### Session Management
- Token expiration handling
- Automatic session refresh
- Graceful logout on authentication failures

## Performance Optimizations

### Memory Management
- Efficient DOM manipulation
- Event listener cleanup
- Image lazy loading and fallbacks

### Network Efficiency
- API request optimization
- Caching of frequently accessed data
- Progressive loading of content

### TV Hardware Optimization
- Reduced animation complexity
- Optimized rendering for TV displays
- Memory-conscious media playback

## Security Considerations

### Data Protection
- Local storage encryption for sensitive data
- Session token secure handling
- Input validation and sanitization

### Network Security
- HTTPS support where available
- CORS handling for cross-domain requests
- API request rate limiting

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure portal supports cross-origin requests
   - Check portal configuration
   - Verify API endpoints accessibility

2. **Stream Playback Issues**
   - Verify stream format compatibility
   - Check network connectivity
   - Ensure proper codec support

3. **Authentication Failures**
   - Verify portal URL format
   - Check MAC address format
   - Confirm portal accessibility

### Debug Mode
- Browser console logging enabled
- Error details provided in UI
- Network request monitoring available

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- Access to a Stalker portal with valid credentials
- Python 3 (for local development server)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ChHussain/iptv-app-.git
cd iptv-app-
```

2. Start the development server:
```bash
npm start
# or
python3 -m http.server 8080
```

3. Open your browser and navigate to `http://localhost:8080`

### Usage

1. **Login**: Enter your portal URL and MAC address on the login page
2. **Browse Content**: Navigate between Live TV, Movies, and Series sections
3. **Play Content**: Click on any item to start playback
4. **Settings**: Access settings to view connection info and configure player options

## Configuration

### Portal URL Format

The application accepts portal URLs in various formats:
- `http://example.com:8080/stalker_portal/api/v1/`
- `http://example.com:8080/` (automatically appends API path)
- `example.com:8080` (automatically adds http:// and API path)

### MAC Address Format

MAC addresses should be in the format: `00:1a:79:xx:xx:xx`

## Technical Details

### Architecture

- **Frontend**: Vanilla HTML5, CSS3, and JavaScript (ES6+)
- **API Integration**: Stalker portal REST API
- **Authentication**: Token-based authentication with localStorage persistence
- **Video Playback**: HTML5 video with support for HLS streams

### Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

### Security Considerations

- Sessions are stored locally and automatically expire
- CORS handling for cross-domain API requests
- Input validation for URLs and MAC addresses

## Troubleshooting

### Common Issues

1. **CORS Errors**: Some portals may not allow cross-origin requests from browsers. This is a limitation of the portal configuration.

2. **Stream Playback Issues**: Modern browsers have restrictions on autoplay and certain video formats. Ensure user interaction before playback.

3. **Authentication Failures**: Verify that the portal URL and MAC address are correct and that the portal is accessible.

### Browser Console

Check the browser's developer console for detailed error messages and debugging information.

## Development

### File Structure

```
iptv-app-/
├── index.html          # Login page
├── home.html           # Main content browser
├── player.html         # Video player
├── settings.html       # Settings page
├── css/
│   └── style.css       # Application styles
├── js/
│   ├── auth.js         # Authentication module
│   ├── api.js          # Stalker API integration
│   ├── login.js        # Login page functionality
│   ├── home.js         # Home page functionality
│   ├── player.js       # Video player functionality
│   └── settings.js     # Settings page functionality
└── package.json        # Project configuration
```

### API Integration

The application integrates with Stalker portal APIs:
- Authentication handshake
- Channel listing
- Movie/series listing
- Stream URL generation
- Profile information

## License

MIT License - see LICENSE file for details.