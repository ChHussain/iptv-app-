// WebRTC-based CORS bypass for IPTV portal connections
// This creates direct peer connections that bypass browser CORS restrictions
class WebRTCPortalConnection {
    constructor() {
        this.connections = new Map();
        this.signalingServer = null;
    }

    // Utility method to normalize portal URLs
    normalizePortalUrl(url) {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'http://' + url;
        }
        if (!url.endsWith('/')) {
            url += '/';
        }
        return url;
    }

    // Cleanup method for connections
    cleanup(connectionId) {
        const connection = this.connections.get(connectionId);
        if (connection) {
            try {
                if (connection.dataChannel) {
                    connection.dataChannel.close();
                }
                if (connection.pc) {
                    connection.pc.close();
                }
            } catch (e) {
                console.warn('Error during WebRTC cleanup:', e);
            }
            this.connections.delete(connectionId);
        }
    }

    // Create WebRTC data channel for direct portal communication with enhanced fallbacks
    async createDirectConnection(portalUrl, macAddress) {
        try {
            console.log('🔗 Attempting WebRTC direct connection to portal...');
            
            // Enhanced ICE servers for better connectivity
            const iceServers = [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' }
            ];

            const pc = new RTCPeerConnection({
                iceServers: iceServers,
                iceCandidatePoolSize: 10,
                bundlePolicy: 'max-bundle',
                rtcpMuxPolicy: 'require'
            });

            // Enhanced data channel configuration
            const dataChannel = pc.createDataChannel('iptv-portal', {
                ordered: true,
                maxRetransmits: 5,
                maxPacketLifeTime: 30000
            });

            // Store connection for cleanup
            const connectionId = `portal_${Date.now()}`;
            this.connections.set(connectionId, { pc, dataChannel });

            return new Promise((resolve, reject) => {
                let resolved = false;
                const timeout = setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        this.cleanup(connectionId);
                        reject(new Error('WebRTC connection timeout - portal may not support direct connections'));
                    }
                }, 20000);

                const cleanup = () => {
                    clearTimeout(timeout);
                    this.cleanup(connectionId);
                };

                // Enhanced connection state monitoring
                pc.onconnectionstatechange = () => {
                    console.log(`WebRTC connection state: ${pc.connectionState}`);
                    if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                        if (!resolved) {
                            resolved = true;
                            cleanup();
                            reject(new Error('WebRTC connection failed - trying alternative methods'));
                        }
                    }
                };

                pc.onicegatheringstatechange = () => {
                    console.log(`ICE gathering state: ${pc.iceGatheringState}`);
                };

                dataChannel.onopen = () => {
                    if (resolved) return;
                    console.log('✓ WebRTC data channel opened for portal communication');
                    
                    // Enhanced handshake data with multiple portal formats
                    const handshakeRequests = [
                        {
                            type: 'stalker_handshake',
                            method: 'GET',
                            url: this.normalizePortalUrl(portalUrl) + 'stalker_portal/api/v1/handshake',
                            macAddress: macAddress,
                            userAgent: 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG250 stbapp ver: 2 rev: 250 Safari/533.3',
                            headers: {
                                'X-User-Agent': `Model: MAG250; Link: WiFi; MAC: ${macAddress}`,
                                'Cookie': `mac=${macAddress}; stb_lang=en; timezone=Europe/Kiev;`,
                                'Accept': 'application/json, text/javascript, */*; q=0.01',
                                'Accept-Language': 'en-US,en;q=0.5',
                                'Cache-Control': 'no-cache',
                                'Referer': this.normalizePortalUrl(portalUrl)
                            }
                        },
                        {
                            type: 'alternative_handshake',
                            method: 'POST',
                            url: this.normalizePortalUrl(portalUrl) + 'portal.php',
                            macAddress: macAddress,
                            formData: `action=handshake&type=stb&mac=${macAddress}&stb_lang=en&timezone=Europe/Kiev`,
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                                'User-Agent': 'VuPlusIPTVPlayer/1.0'
                            }
                        }
                    ];
                    
                    // Try each handshake format
                    handshakeRequests.forEach((request, index) => {
                        setTimeout(() => {
                            if (!resolved && dataChannel.readyState === 'open') {
                                console.log(`Sending handshake attempt ${index + 1}:`, request.type);
                                dataChannel.send(JSON.stringify(request));
                            }
                        }, index * 1000);
                    });
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