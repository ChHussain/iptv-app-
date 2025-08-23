# LG webOS 6.0.0 IPTV Application

A production-ready IPTV application specifically designed for LG webOS 6.0.0 that emulates a MAG-based Stalker Portal (like Smart STB or Vu IPTV Player).

## Features

- **LG webOS 6.0.0 Compatibility**: Native integration with webOS media APIs (webOS.media and AVPlay)
- **Stalker Portal Authentication**: MAC address + Portal URL login (Stalker middleware style)
- **MAC Address Management**: Auto-generate virtual MAC or manually input custom MAC addresses
- **Multi-Portal Support**: Manage and switch between multiple IPTV portals
- **Content Streaming**: Live TV channels, Movies, TV Series with webOS-optimized playback
- **Electronic Program Guide (EPG)**: Timeline view with current and upcoming programs
- **Favorites Management**: Save and organize favorite channels, movies, and series
- **TV Remote Navigation**: Optimized for LG TV remote control with full keyboard support
- **Session Management**: Secure authentication with automatic token refresh
- **Error Handling**: Comprehensive error handling for portal timeouts and stream failures

## webOS 6.0.0 Specific Features

- **Native Media Player**: Uses webOS.media API for optimal video playback
- **AVPlay Fallback**: Automatic fallback to AVPlay for compatibility
- **Remote Control Support**: Full support for LG TV remote including color keys and navigation
- **TV-Optimized UI**: Interface designed specifically for television displays
- **Focus Management**: Proper focus handling for TV navigation
- **System Integration**: Integrates with webOS system volume and display controls

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