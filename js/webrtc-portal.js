// WebRTC-based CORS bypass for IPTV portal connections
// This creates direct peer connections that bypass browser CORS restrictions
class WebRTCPortalConnection {
    constructor() {
        this.connections = new Map();
        this.signalingServer = null;
    }

    // Create WebRTC data channel for direct portal communication
    async createDirectConnection(portalUrl, macAddress) {
        try {
            const connectionId = `portal_${Date.now()}`;
            
            // Create RTCPeerConnection with ICE servers
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });

            // Create data channel for portal communication
            const dataChannel = pc.createDataChannel('portal', {
                ordered: true,
                maxRetransmits: 3
            });

            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('WebRTC connection timeout'));
                }, 15000);

                dataChannel.onopen = () => {
                    clearTimeout(timeout);
                    console.log('WebRTC data channel opened for portal communication');
                    
                    // Send handshake request through data channel
                    const handshakeData = {
                        type: 'handshake',
                        url: portalUrl,
                        macAddress: macAddress,
                        userAgent: 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
                        headers: {
                            'X-User-Agent': 'Model: MAG250; Link: WiFi',
                            'Cookie': `mac=${macAddress}; stb_lang=en; timezone=Europe/Kiev;`
                        }
                    };
                    
                    dataChannel.send(JSON.stringify(handshakeData));
                };

                dataChannel.onmessage = (event) => {
                    try {
                        const response = JSON.parse(event.data);
                        if (response.type === 'handshake_response') {
                            if (response.success && response.data.js && response.data.js.token) {
                                resolve({
                                    token: response.data.js.token,
                                    token_expire: response.data.js.token_expire,
                                    profile: response.data.js.profile || {},
                                    connectionType: 'webrtc'
                                });
                            } else {
                                reject(new Error(response.error || 'WebRTC handshake failed'));
                            }
                        }
                    } catch (error) {
                        reject(new Error(`WebRTC message parsing error: ${error.message}`));
                    }
                };

                dataChannel.onerror = (error) => {
                    clearTimeout(timeout);
                    reject(new Error(`WebRTC data channel error: ${error}`));
                };

                pc.onerror = (error) => {
                    clearTimeout(timeout);
                    reject(new Error(`WebRTC connection error: ${error}`));
                };
            });

        } catch (error) {
            throw new Error(`WebRTC setup failed: ${error.message}`);
        }
    }

    // Server-Sent Events fallback for real-time portal data
    async createSSEConnection(portalUrl, macAddress) {
        return new Promise((resolve, reject) => {
            const sseUrl = `/sse-portal?url=${encodeURIComponent(portalUrl)}&mac=${encodeURIComponent(macAddress)}`;
            const eventSource = new EventSource(sseUrl);
            
            const timeout = setTimeout(() => {
                eventSource.close();
                reject(new Error('SSE connection timeout'));
            }, 10000);

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'handshake_success') {
                        clearTimeout(timeout);
                        eventSource.close();
                        resolve({
                            token: data.token,
                            token_expire: data.token_expire,
                            profile: data.profile || {},
                            connectionType: 'sse'
                        });
                    } else if (data.type === 'error') {
                        clearTimeout(timeout);
                        eventSource.close();
                        reject(new Error(data.message));
                    }
                } catch (error) {
                    clearTimeout(timeout);
                    eventSource.close();
                    reject(new Error(`SSE data parsing error: ${error.message}`));
                }
            };

            eventSource.onerror = () => {
                clearTimeout(timeout);
                eventSource.close();
                reject(new Error('SSE connection failed'));
            };
        });
    }

    // WebSocket fallback for bidirectional portal communication
    async createWebSocketConnection(portalUrl, macAddress) {
        return new Promise((resolve, reject) => {
            const wsUrl = `ws://localhost:8080/ws-portal`;
            const ws = new WebSocket(wsUrl);
            
            const timeout = setTimeout(() => {
                ws.close();
                reject(new Error('WebSocket connection timeout'));
            }, 10000);

            ws.onopen = () => {
                console.log('WebSocket connection opened for portal communication');
                
                // Send handshake request
                const handshakeData = {
                    type: 'portal_handshake',
                    url: portalUrl,
                    macAddress: macAddress,
                    userAgent: 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3'
                };
                
                ws.send(JSON.stringify(handshakeData));
            };

            ws.onmessage = (event) => {
                try {
                    const response = JSON.parse(event.data);
                    if (response.type === 'portal_handshake_response') {
                        clearTimeout(timeout);
                        ws.close();
                        
                        if (response.success && response.data.js && response.data.js.token) {
                            resolve({
                                token: response.data.js.token,
                                token_expire: response.data.js.token_expire,
                                profile: response.data.js.profile || {},
                                connectionType: 'websocket'
                            });
                        } else {
                            reject(new Error(response.error || 'WebSocket handshake failed'));
                        }
                    }
                } catch (error) {
                    clearTimeout(timeout);
                    ws.close();
                    reject(new Error(`WebSocket message parsing error: ${error.message}`));
                }
            };

            ws.onerror = () => {
                clearTimeout(timeout);
                ws.close();
                reject(new Error('WebSocket connection failed'));
            };
        });
    }

    // Image pixel technique for basic GET requests (very limited)
    async createImagePixelConnection(portalUrl, macAddress) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const timeout = setTimeout(() => {
                reject(new Error('Image pixel connection timeout'));
            }, 5000);

            // Construct URL with parameters
            const handshakeUrl = `${portalUrl}handshake?mac=${encodeURIComponent(macAddress)}&stb_lang=en&timezone=Europe/Kiev&_=${Date.now()}`;
            
            img.onload = () => {
                clearTimeout(timeout);
                // Image loaded successfully, but we can't read response data
                // This technique is very limited and mainly used for tracking
                reject(new Error('Image pixel technique cannot read response data'));
            };

            img.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('Image pixel connection failed'));
            };

            img.src = handshakeUrl;
        });
    }
}

// Export for use in auth.js
window.WebRTCPortalConnection = WebRTCPortalConnection;