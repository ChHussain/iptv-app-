// Authentication module for IPTV app
class Auth {
    constructor() {
        this.storageKey = 'iptv_session';
        this.session = this.loadSession();
    }

    // Load session from localStorage
    loadSession() {
        try {
            const session = localStorage.getItem(this.storageKey);
            return session ? JSON.parse(session) : null;
        } catch (error) {
            console.error('Error loading session:', error);
            return null;
        }
    }

    // Save session to localStorage
    saveSession(sessionData) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(sessionData));
            this.session = sessionData;
        } catch (error) {
            console.error('Error saving session:', error);
        }
    }

    // Clear session
    clearSession() {
        localStorage.removeItem(this.storageKey);
        this.session = null;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.session && this.session.token && this.session.portalUrl && this.session.macAddress;
    }

    // Get current session
    getSession() {
        return this.session;
    }

    // Login with portal URL and MAC address
    async login(portalUrl, macAddress) {
        try {
            // Normalize portal URL
            const normalizedUrl = this.normalizePortalUrl(portalUrl);
            
            // Log authentication attempt
            if (window.diagnostics) {
                window.diagnostics.log('info', 'Authentication attempt started', {
                    portalUrl: normalizedUrl,
                    macAddress: macAddress
                });
            }
            
            // Create handshake request
            const handshakeData = await this.performHandshake(normalizedUrl, macAddress);
            
            if (handshakeData && handshakeData.token) {
                // Parse token expiry safely
                let tokenExpiry;
                if (handshakeData.token_expire) {
                    // Try to parse as timestamp (seconds or milliseconds)
                    const expireValue = parseInt(handshakeData.token_expire);
                    if (expireValue > 0) {
                        // If it's in seconds (typical for Unix timestamp), convert to milliseconds
                        tokenExpiry = expireValue < 10000000000 ? expireValue * 1000 : expireValue;
                    } else {
                        tokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // Default 24 hours
                    }
                } else {
                    tokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // Default 24 hours
                }

                const sessionData = {
                    token: handshakeData.token,
                    portalUrl: normalizedUrl,
                    macAddress: macAddress,
                    loginTime: Date.now(),
                    tokenExpiry: tokenExpiry
                };

                this.saveSession(sessionData);
                
                // Log successful authentication
                if (window.diagnostics) {
                    window.diagnostics.log('info', 'Authentication successful', {
                        portalUrl: normalizedUrl,
                        tokenExpiry: new Date(sessionData.tokenExpiry).toISOString()
                    });
                }
                
                return { success: true, session: sessionData };
            } else {
                throw new Error('Invalid response from portal');
            }
        } catch (error) {
            console.error('Login error:', error);
            
            // Log authentication error
            if (window.diagnostics) {
                window.diagnostics.log('error', 'Authentication failed', {
                    portalUrl: portalUrl,
                    error: error.message
                });
            }
            
            return { success: false, error: error.message };
        }
    }

    // Normalize portal URL - flexible approach for different portal types
    normalizePortalUrl(url) {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'http://' + url;
        }
        
        if (!url.endsWith('/')) {
            url += '/';
        }
        
        // Don't force stalker_portal path - many portals use different structures
        // This will be handled in the handshake discovery process
        return url;
    }

    // Perform handshake with Stalker portal with comprehensive CORS bypass strategies
    async performHandshake(portalUrl, macAddress) {
        console.log(`Starting authentication with ${portalUrl} using MAC: ${macAddress}`);
        
        // Try multiple common Stalker portal endpoint patterns
        const handshakeEndpoints = [
            'stalker_portal/api/v1/handshake',  // Standard v1 API
            'stalker_portal/api/handshake',     // API without version
            'stalker_portal/handshake',         // Direct portal handshake
            'portal.php?action=handshake',      // PHP-based portal
            'server/load.php?action=handshake', // Alternative PHP portal
            'api/v1/handshake',                 // Direct API v1
            'api/handshake',                    // Direct API
            'handshake'                         // Minimal endpoint
        ];
        
        for (let i = 0; i < handshakeEndpoints.length; i++) {
            const handshakeUrl = `${portalUrl}${handshakeEndpoints[i]}`;
            console.log(`Trying handshake endpoint ${i + 1}/${handshakeEndpoints.length}: ${handshakeUrl}`);
            
            // Strategy 1: Try standard fetch with enhanced headers (VU IPTV compatible)
            try {
                const result = await this.performStandardHandshake(handshakeUrl, macAddress);
                console.log('✓ Standard authentication successful');
                return result;
            } catch (error) {
                console.log('✗ Standard handshake failed:', error.message);
                
                // Strategy 2: Try with different parameter formats
                try {
                    const result = await this.performParameterVariantHandshake(handshakeUrl, macAddress);
                    console.log('✓ Parameter variant authentication successful');
                    return result;
                } catch (paramError) {
                    console.log('✗ Parameter variant handshake failed:', paramError.message);
                }
                
                // Strategy 3: Try proxy mode if available
                try {
                    const result = await this.performProxyHandshake(handshakeUrl, macAddress);
                    console.log('✓ Proxy authentication successful');
                    return result;
                } catch (proxyError) {
                    console.log('✗ Proxy handshake failed:', proxyError.message);
                }
                
                // Strategy 4: Try no-cors with form submission
                try {
                    const result = await this.performFormHandshake(handshakeUrl, macAddress);
                    console.log('✓ Form submission authentication successful');
                    return result;
                } catch (formError) {
                    console.log('✗ Form handshake failed:', formError.message);
                }
                
                // Continue to next endpoint
                console.log(`All strategies failed for endpoint: ${handshakeUrl}`);
            }
        }
        
        // If all endpoints fail, try the legacy approach with comprehensive strategies
        const legacyHandshakeUrl = `${portalUrl}handshake`;
        console.log('Trying legacy approach with comprehensive CORS bypass strategies...');
        
        // Try the original comprehensive CORS bypass strategies
        try {
            const result = await this.performStandardHandshake(legacyHandshakeUrl, macAddress);
            console.log('✓ Standard authentication successful');
            return result;
        } catch (error) {
            console.log('✗ Standard handshake failed:', error.message);
            
            // Strategy 2: Try WebRTC data channel for direct connection
            if (window.WebRTCPortalConnection) {
                try {
                    const webrtc = new window.WebRTCPortalConnection();
                    const result = await webrtc.createDirectConnection(portalUrl, macAddress);
                    console.log('✓ WebRTC authentication successful');
                    return result;
                } catch (webrtcError) {
                    console.log('✗ WebRTC handshake failed:', webrtcError.message);
                }
            }
            
            // Strategy 3: Try JSONP callback method
            try {
                const result = await this.performJSONPHandshake(legacyHandshakeUrl, macAddress);
                console.log('✓ JSONP authentication successful');
                return result;
            } catch (jsonpError) {
                console.log('✗ JSONP handshake failed:', jsonpError.message);
            }
            
            // Strategy 4: Try Server-Sent Events
            if (window.WebRTCPortalConnection) {
                try {
                    const webrtc = new window.WebRTCPortalConnection();
                    const result = await webrtc.createSSEConnection(portalUrl, macAddress);
                    console.log('✓ SSE authentication successful');
                    return result;
                } catch (sseError) {
                    console.log('✗ SSE handshake failed:', sseError.message);
                }
            }
            
            // Strategy 5: Try alternative endpoints
            try {
                const result = await this.performAlternativeHandshake(portalUrl, macAddress);
                console.log('✓ Alternative endpoint authentication successful');
                return result;
            } catch (altError) {
                console.log('✗ Alternative handshake failed:', altError.message);
            }
            
            // Strategy 6: Try WebSocket connection
            if (window.WebRTCPortalConnection) {
                try {
                    const webrtc = new window.WebRTCPortalConnection();
                    const result = await webrtc.createWebSocketConnection(portalUrl, macAddress);
                    console.log('✓ WebSocket authentication successful');
                    return result;
                } catch (wsError) {
                    console.log('✗ WebSocket handshake failed:', wsError.message);
                }
            }
            
            // Strategy 7: Try proxy mode if available
            try {
                const result = await this.performProxyHandshake(legacyHandshakeUrl, macAddress);
                console.log('✓ Proxy authentication successful');
                return result;
            } catch (proxyError) {
                console.log('✗ Proxy handshake failed:', proxyError.message);
            }
            
            // Strategy 8: Try no-cors with opaque response detection
            try {
                const result = await this.performNoCorsHandshake(legacyHandshakeUrl, macAddress);
                console.log('✓ No-CORS authentication successful');
                return result;
            } catch (noCorsError) {
                console.log('✗ No-CORS handshake failed:', noCorsError.message);
            }
            
            // All strategies failed - log detailed info for developers but show user-friendly message
            const technicalDetails = `All authentication strategies failed for portal ${portalUrl}. Attempted methods:
1. Standard CORS fetch (VU IPTV compatible headers)
2. WebRTC data channel direct connection
3. JSONP callback authentication  
4. Server-Sent Events streaming
5. Alternative portal endpoints
6. WebSocket bidirectional connection
7. Proxy server relay
8. No-CORS opaque response detection

Original error: ${error.message}

This portal may require:
- Dedicated IPTV application (not browser-based)
- VPN or specific network configuration
- Portal administrator whitelist addition
- Alternative authentication method`;

            // Log technical details for developers
            console.error('Technical details:', technicalDetails);
            
            // Provide user-friendly error message
            const userFriendlyMessage = 'Unable to connect to the portal. Please check your portal URL and try again. If the problem persists, contact your service provider.';
            
            throw new Error(userFriendlyMessage);
        }
    }

    // Standard handshake with VU IPTV compatible headers
    async performStandardHandshake(handshakeUrl, macAddress) {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
            'X-User-Agent': 'Model: MAG250; Link: WiFi',
            'Cookie': `mac=${macAddress}; stb_lang=en; timezone=Europe/Kiev;`,
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Referer': handshakeUrl.split('/stalker_portal')[0] + '/',
            'X-Requested-With': 'XMLHttpRequest'
        };

        const response = await fetch(handshakeUrl, {
            method: 'GET',
            headers: headers,
            mode: 'cors',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.js && data.js.token) {
            return {
                token: data.js.token,
                token_expire: data.js.token_expire,
                profile: data.js.profile || {}
            };
        } else {
            throw new Error('No token received from portal');
        }
    }

    // JSONP handshake for CORS bypass
    async performJSONPHandshake(handshakeUrl, macAddress) {
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonp_callback_' + Date.now();
            const script = document.createElement('script');
            const timeoutId = setTimeout(() => {
                cleanup();
                reject(new Error('JSONP request timeout'));
            }, 10000);

            const cleanup = () => {
                clearTimeout(timeoutId);
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                delete window[callbackName];
            };

            window[callbackName] = (data) => {
                cleanup();
                if (data.js && data.js.token) {
                    resolve({
                        token: data.js.token,
                        token_expire: data.js.token_expire,
                        profile: data.js.profile || {}
                    });
                } else {
                    reject(new Error('No token received from portal via JSONP'));
                }
            };

            script.onerror = () => {
                cleanup();
                reject(new Error('JSONP script loading failed'));
            };

            const separator = handshakeUrl.includes('?') ? '&' : '?';
            script.src = `${handshakeUrl}${separator}callback=${callbackName}&mac=${macAddress}&stb_lang=en&timezone=Europe/Kiev`;
            document.head.appendChild(script);
        });
    }

    // Try alternative portal endpoints
    async performAlternativeHandshake(portalUrl, macAddress) {
        const alternativeEndpoints = [
            'handshake.php',
            'api/handshake',
            'server/load.php?type=stb&action=handshake',
            'portal.php?type=account_info',
            'player_api.php?username=&password=&action=handshake'
        ];

        for (const endpoint of alternativeEndpoints) {
            try {
                const altUrl = portalUrl + endpoint;
                console.log(`Trying alternative endpoint: ${altUrl}`);
                
                const headers = {
                    'User-Agent': 'VLC/3.0.0 LibVLC/3.0.0',
                    'Cookie': `mac=${macAddress}; stb_lang=en; timezone=Europe/Kiev;`
                };

                const response = await fetch(altUrl, {
                    method: 'GET',
                    headers: headers,
                    mode: 'no-cors' // Try no-cors mode for alternative endpoints
                });

                // For no-cors, we can't read the response, but if it doesn't throw, the endpoint exists
                if (response.type === 'opaque') {
                    // Endpoint exists, try with cors again
                    const corsResponse = await fetch(altUrl, {
                        method: 'GET',
                        headers: headers,
                        mode: 'cors'
                    });
                    
                    if (corsResponse.ok) {
                        const data = await corsResponse.json();
                        if (data.js && data.js.token) {
                            return {
                                token: data.js.token,
                                token_expire: data.js.token_expire,
                                profile: data.js.profile || {}
                            };
                        }
                    }
                }
            } catch (error) {
                console.log(`Alternative endpoint ${endpoint} failed:`, error.message);
                continue;
            }
        }
        
        throw new Error('All alternative endpoints failed');
    }

    // Proxy handshake through local server
    async performProxyHandshake(handshakeUrl, macAddress) {
        try {
            const proxyUrl = '/proxy-auth';
            const response = await fetch(proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: handshakeUrl,
                    macAddress: macAddress,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
                        'X-User-Agent': 'Model: MAG250; Link: WiFi',
                        'Cookie': `mac=${macAddress}; stb_lang=en; timezone=Europe/Kiev;`
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Proxy server error: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.js && data.js.token) {
                return {
                    token: data.js.token,
                    token_expire: data.js.token_expire,
                    profile: data.js.profile || {}
                };
            } else {
                throw new Error('No token received from portal via proxy');
            }
        } catch (error) {
            throw new Error(`Proxy method failed: ${error.message}`);
        }
    }

    // No-CORS handshake with opaque response detection
    async performNoCorsHandshake(handshakeUrl, macAddress) {
        try {
            // First, try no-cors mode to see if request goes through
            const noCorsResponse = await fetch(handshakeUrl, {
                method: 'GET',
                mode: 'no-cors',
                headers: {
                    'Cookie': `mac=${macAddress}; stb_lang=en; timezone=Europe/Kiev;`
                }
            });

            // If we get an opaque response, the server is reachable
            if (noCorsResponse.type === 'opaque') {
                console.log('Portal is reachable via no-cors mode');
                
                // Try to use a different approach - form submission
                return await this.performFormSubmitHandshake(handshakeUrl, macAddress);
            } else {
                throw new Error('No-cors request did not return opaque response');
            }
        } catch (error) {
            throw new Error(`No-CORS method failed: ${error.message}`);
        }
    }

    // Form submission handshake (another CORS bypass technique)
    async performFormSubmitHandshake(handshakeUrl, macAddress) {
        return new Promise((resolve, reject) => {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.name = `handshake_frame_${Date.now()}`;
            
            const form = document.createElement('form');
            form.method = 'GET';
            form.action = handshakeUrl;
            form.target = iframe.name;
            
            // Add MAC address as parameter
            const macInput = document.createElement('input');
            macInput.type = 'hidden';
            macInput.name = 'mac';
            macInput.value = macAddress;
            form.appendChild(macInput);
            
            // Add language parameter
            const langInput = document.createElement('input');
            langInput.type = 'hidden';
            langInput.name = 'stb_lang';
            langInput.value = 'en';
            form.appendChild(langInput);
            
            // Add timezone parameter
            const tzInput = document.createElement('input');
            tzInput.type = 'hidden';
            tzInput.name = 'timezone';
            tzInput.value = 'Europe/Kiev';
            form.appendChild(tzInput);

            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error('Form submission timeout'));
            }, 10000);

            const cleanup = () => {
                clearTimeout(timeout);
                if (iframe.parentNode) {
                    iframe.parentNode.removeChild(iframe);
                }
                if (form.parentNode) {
                    form.parentNode.removeChild(form);
                }
            };

            iframe.onload = () => {
                try {
                    // Try to read iframe content (will fail due to same-origin policy)
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    const content = iframeDoc.body.innerHTML;
                    
                    // If we can read it, try to parse JSON
                    const data = JSON.parse(content);
                    cleanup();
                    
                    if (data.js && data.js.token) {
                        resolve({
                            token: data.js.token,
                            token_expire: data.js.token_expire,
                            profile: data.js.profile || {}
                        });
                    } else {
                        reject(new Error('No token received from portal via form submission'));
                    }
                } catch (error) {
                    cleanup();
                    // Cannot read iframe content due to CORS, but form was submitted
                    reject(new Error('Form submitted but cannot read response due to CORS'));
                }
            };

            iframe.onerror = () => {
                cleanup();
                reject(new Error('Form submission failed'));
            };

            document.body.appendChild(iframe);
            document.body.appendChild(form);
            form.submit();
        });
    }

    // Parameter variant handshake - try different parameter formats
    async performParameterVariantHandshake(handshakeUrl, macAddress) {
        const parameterVariants = [
            // Standard Stalker parameters
            { mac: macAddress, stb_lang: 'en', timezone: 'Europe/Kiev' },
            // Alternative parameter names
            { mac_address: macAddress, language: 'en', tz: 'Europe/Kiev' },
            // Query string format
            '',  // Will be handled as query string
            // Form data format - handled by different method
        ];

        for (let i = 0; i < parameterVariants.length - 1; i++) {
            try {
                const params = parameterVariants[i];
                let requestUrl = handshakeUrl;
                
                if (i === 2) {
                    // Query string format
                    const queryParams = new URLSearchParams({
                        mac: macAddress,
                        stb_lang: 'en',
                        timezone: 'Europe/Kiev'
                    });
                    requestUrl = `${handshakeUrl}?${queryParams.toString()}`;
                }

                const headers = {
                    'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
                    'X-User-Agent': 'Model: MAG250; Link: WiFi',
                    'Cookie': `mac=${macAddress}; stb_lang=en; timezone=Europe/Kiev;`,
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Referer': handshakeUrl.split('/stalker_portal')[0] + '/' || handshakeUrl.split('/api')[0] + '/' || handshakeUrl.split('?')[0]
                };

                let response;
                if (i === 2) {
                    // GET with query string
                    response = await fetch(requestUrl, {
                        method: 'GET',
                        headers: headers,
                        mode: 'cors',
                        credentials: 'include'
                    });
                } else {
                    // POST with form data
                    const formData = new FormData();
                    Object.keys(params).forEach(key => {
                        formData.append(key, params[key]);
                    });

                    response = await fetch(requestUrl, {
                        method: 'POST',
                        headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams(params).toString(),
                        mode: 'cors',
                        credentials: 'include'
                    });
                }

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                
                if (data.js && data.js.token) {
                    return {
                        token: data.js.token,
                        token_expire: data.js.token_expire,
                        profile: data.js.profile || {}
                    };
                }
            } catch (error) {
                console.log(`Parameter variant ${i + 1} failed:`, error.message);
                continue;
            }
        }
        
        throw new Error('All parameter variants failed');
    }

    // Form handshake - direct form submission approach
    async performFormHandshake(handshakeUrl, macAddress) {
        return this.performFormSubmitHandshake(handshakeUrl, macAddress);
    }

    // Logout user
    logout() {
        this.clearSession();
        // Redirect to login page
        if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
            window.location.href = 'index.html';
        }
    }

    // Check if token is expired
    isTokenExpired() {
        if (!this.session || !this.session.tokenExpiry) {
            return true;
        }
        return Date.now() > this.session.tokenExpiry;
    }

    // Refresh token if needed
    async refreshTokenIfNeeded() {
        if (this.isTokenExpired()) {
            const result = await this.login(this.session.portalUrl, this.session.macAddress);
            return result.success;
        }
        return true;
    }

    // Enhanced WebRTC authentication method
    async performWebRTCHandshake(portalUrl, macAddress) {
        if (window.WebRTCPortalConnection) {
            const webrtc = new window.WebRTCPortalConnection();
            return await webrtc.createDirectConnection(portalUrl, macAddress);
        } else {
            throw new Error('WebRTC not available');
        }
    }

    // Enhanced SSE authentication method
    async performSSEHandshake(portalUrl, macAddress) {
        if (window.WebRTCPortalConnection) {
            const webrtc = new window.WebRTCPortalConnection();
            return await webrtc.createSSEConnection(portalUrl, macAddress);
        } else {
            throw new Error('SSE not available');
        }
    }

    // Enhanced WebSocket authentication method
    async performWebSocketHandshake(portalUrl, macAddress) {
        if (window.WebRTCPortalConnection) {
            const webrtc = new window.WebRTCPortalConnection();
            return await webrtc.createWebSocketConnection(portalUrl, macAddress);
        } else {
            throw new Error('WebSocket not available');
        }
    }

    // Generate comprehensive error report for debugging
    generateErrorReport(attemptLog, portalUrl, macAddress) {
        const totalAttempts = attemptLog.length;
        const uniqueErrors = [...new Set(attemptLog.map(a => a.error))];
        const strategiesTried = [...new Set(attemptLog.map(a => a.strategy))];
        
        // Analyze error patterns
        const corsErrors = attemptLog.filter(a => 
            a.error.toLowerCase().includes('cors') || 
            a.error.toLowerCase().includes('blocked') ||
            a.error.toLowerCase().includes('origin')
        ).length;
        
        const networkErrors = attemptLog.filter(a => 
            a.error.toLowerCase().includes('network') || 
            a.error.toLowerCase().includes('timeout') ||
            a.error.toLowerCase().includes('unreachable')
        ).length;
        
        const authErrors = attemptLog.filter(a => 
            a.error.toLowerCase().includes('token') || 
            a.error.toLowerCase().includes('auth') ||
            a.error.toLowerCase().includes('unauthorized')
        ).length;

        let primaryIssue = 'Unknown';
        let recommendation = '';
        
        if (corsErrors > totalAttempts * 0.5) {
            primaryIssue = 'CORS Security Restrictions';
            recommendation = 'Portal blocks browser connections. Use Electron app or Smart TV deployment.';
        } else if (networkErrors > totalAttempts * 0.5) {
            primaryIssue = 'Network Connectivity';
            recommendation = 'Check portal URL and internet connection.';
        } else if (authErrors > 0) {
            primaryIssue = 'Authentication Issues';
            recommendation = 'Verify MAC address and portal credentials.';
        }

        const report = {
            summary: {
                portalUrl,
                macAddress,
                totalAttempts,
                strategiesTried: strategiesTried.length,
                primaryIssue,
                recommendation
            },
            analysis: {
                corsErrors,
                networkErrors,
                authErrors,
                uniqueErrors: uniqueErrors.length
            },
            attempts: attemptLog,
            userMessage: `Authentication failed: ${primaryIssue}. ${recommendation} (${totalAttempts} attempts made)`
        };

        return report;
    }

    // Protect page - redirect to login if not authenticated
    protectPage() {
        if (!this.isAuthenticated()) {
            window.location.href = 'index.html';
            return false;
        }
        
        if (this.isTokenExpired()) {
            this.logout();
            return false;
        }
        
        return true;
    }
}

// Create global auth instance
window.auth = new Auth();