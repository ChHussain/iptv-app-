# IPTV Portal CORS Bypass - Usage Guide

## 🚀 Quick Start

The enhanced IPTV app now includes comprehensive CORS bypass strategies that replicate VU IPTV and Smart STB behavior to overcome browser security restrictions.

### 1. Start the Enhanced Server

```bash
# Start with CORS proxy, SSE, and WebSocket support
npm start
# or
python3 proxy-server.py 8080
```

### 2. Access the Application

- **Main App**: http://localhost:8080/
- **CORS Testing Interface**: http://localhost:8080/cors-test.html

### 3. Portal Configuration

Use the exact same portal URLs and MAC addresses that work with VU IPTV:

```
Portal URLs:
- http://play.b4u.live
- http://glotv.me  
- http://play.suntv.biz
- http://tv.service8k.xyz

MAC Address:
- AA:7A:10:57:C1:00 (Provider-supplied, VU IPTV compatible)
```

## 🔧 How It Works

### Automatic Strategy Fallback

The system automatically tries 9 different CORS bypass strategies in sequence:

1. **Standard CORS** with VU IPTV headers
2. **JSONP Callback** for cross-domain authentication
3. **WebRTC Data Channel** for direct peer connections
4. **Server-Sent Events** for real-time streaming
5. **Alternative Endpoints** (handshake.php, portal.php, etc.)
6. **WebSocket Connection** for interactive sessions
7. **Proxy Server Relay** for server-side bypass
8. **No-CORS Detection** for endpoint discovery
9. **Form Submission** via hidden iframe

### VU IPTV/Smart STB Emulation

The system sends identical headers to what VU IPTV and Smart STB use:

```javascript
headers: {
    'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
    'X-User-Agent': 'Model: MAG250; Link: WiFi',
    'Cookie': 'mac=AA:7A:10:57:C1:00; stb_lang=en; timezone=Europe/Kiev;',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': 'http://portal-url/',
    'X-Requested-With': 'XMLHttpRequest'
}
```

## 🧪 Testing

### Using the CORS Test Interface

1. Navigate to http://localhost:8080/cors-test.html
2. Select portal URL and MAC address
3. Click "Test All Strategies"
4. Watch real-time status of each bypass method

### Console Logging

All authentication attempts are logged with detailed information:

```
✓ Standard authentication successful
✗ Standard handshake failed: Failed to fetch
✓ WebRTC authentication successful  
✗ JSONP handshake failed: JSONP script loading failed
```

## 🎯 Expected Behavior

### When Portals Are Accessible
- System tries standard CORS first
- Falls back through strategies until one succeeds
- Returns authentication token and profile data
- Proceeds to load IPTV content identical to VU IPTV

### When Portals Are Blocked
- System attempts all 9 bypass strategies
- Provides detailed error analysis
- Logs each strategy attempt for debugging
- Suggests troubleshooting steps

## 🔍 Troubleshooting

### Portal Connection Issues

1. **CORS Errors**: Normal - system will try bypass strategies automatically
2. **DNS Resolution**: Check internet connection and portal URL
3. **All Strategies Failed**: Portal may require VPN or whitelist addition
4. **Proxy Errors**: Ensure proxy server is running on port 8080

### Success Indicators

```javascript
// Successful authentication response
{
  success: true,
  session: {
    token: "auth_token_here",
    portalUrl: "http://portal-url/stalker_portal/api/v1/",
    macAddress: "AA:7A:10:57:C1:00",
    tokenExpiry: 1693123456789
  }
}
```

## 📊 Compatibility

### Supported Portal Types
- ✅ Stalker Middleware portals
- ✅ MAG STB compatible portals  
- ✅ JSONP-enabled portals
- ✅ Alternative API endpoints
- ✅ WebRTC-compatible portals

### Browser Support
- ✅ Chrome/Chromium 60+
- ✅ Firefox 55+
- ✅ Safari 11+
- ✅ Edge 79+

The enhanced system maximizes compatibility while maintaining the exact behavior that makes portals work with VU IPTV and Smart STB applications.