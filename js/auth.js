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
            console.log('Attempting login with:', { portalUrl, macAddress });
            
            // Validate MAC address authenticity if deviceManager is available
            if (window.deviceManager && window.deviceManager.isMACAddressSuspicious(macAddress)) {
                console.warn('MAC address appears to be suspicious/generated:', macAddress);
            }
            
            // Normalize portal URL
            const normalizedUrl = this.normalizePortalUrl(portalUrl);
            console.log('Normalized URL:', normalizedUrl);
            
            // Create handshake request
            const handshakeData = await this.performHandshake(normalizedUrl, macAddress);
            
            if (handshakeData && handshakeData.token) {
                console.log('Handshake successful, token received');
                
                const sessionData = {
                    token: handshakeData.token,
                    portalUrl: normalizedUrl,
                    macAddress: macAddress,
                    loginTime: Date.now(),
                    tokenExpiry: handshakeData.token_expire || (Date.now() + 24 * 60 * 60 * 1000), // 24 hours default
                    deviceInfo: window.deviceManager ? await window.deviceManager.getDeviceInfo() : null
                };

                this.saveSession(sessionData);
                
                // Verify the connection by trying to fetch profile
                try {
                    const profileTest = await this.verifyConnection(sessionData);
                    console.log('Connection verification:', profileTest.success ? 'passed' : 'failed');
                } catch (verifyError) {
                    console.warn('Connection verification failed:', verifyError);
                    // Don't fail login for verification issues
                }
                
                return { success: true, session: sessionData };
            } else {
                throw new Error('Invalid response from portal - no token received');
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    }

    // Normalize portal URL
    normalizePortalUrl(url) {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'http://' + url;
        }
        
        if (!url.endsWith('/')) {
            url += '/';
        }
        
        if (!url.includes('/stalker_portal/api/')) {
            if (url.endsWith('/')) {
                url += 'stalker_portal/api/v1/';
            } else {
                url += '/stalker_portal/api/v1/';
            }
        }
        
        return url;
    }

    // Perform handshake with Stalker portal
    async performHandshake(portalUrl, macAddress) {
        console.log('Performing handshake with:', portalUrl);
        const handshakeUrl = `${portalUrl}handshake`;
        
        // Enhanced headers to better mimic real STB behavior
        const headers = {
            'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
            'X-User-Agent': 'Model: MAG250; Link: WiFi',
            'Cookie': `mac=${macAddress}; stb_lang=en; timezone=Europe/Kiev;`,
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        };

        try {
            console.log('Sending handshake request to:', handshakeUrl);
            const response = await fetch(handshakeUrl, {
                method: 'GET',
                headers: headers,
                mode: 'cors',
                credentials: 'include'
            });

            console.log('Handshake response status:', response.status, response.statusText);

            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('Access denied - MAC address may not be authorized on this portal');
                } else if (response.status === 404) {
                    throw new Error('Portal endpoint not found - please check the URL');
                } else if (response.status === 500) {
                    throw new Error('Portal server error - please try again later');
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }

            const responseText = await response.text();
            console.log('Handshake raw response:', responseText);

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Failed to parse handshake response as JSON:', parseError);
                throw new Error('Invalid response format from portal');
            }
            
            console.log('Parsed handshake data:', data);
            
            if (data.js && data.js.token) {
                console.log('Handshake successful, token received:', data.js.token.substring(0, 20) + '...');
                return {
                    token: data.js.token,
                    token_expire: data.js.token_expire,
                    profile: data.js.profile || {},
                    random: data.js.random || null
                };
            } else if (data.error) {
                throw new Error(`Portal error: ${data.error}`);
            } else {
                console.error('Unexpected handshake response structure:', data);
                throw new Error('No token received from portal - invalid response structure');
            }
        } catch (error) {
            console.error('Handshake request failed:', error);
            
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                throw new Error('Network error - unable to reach portal. Check URL and internet connection.');
            } else if (error.name === 'TypeError' && error.message.includes('CORS')) {
                throw new Error('CORS error - Portal may not allow cross-origin requests from browser');
            }
            throw error;
        }
    }

    // Verify connection by testing API access
    async verifyConnection(sessionData) {
        try {
            const headers = {
                'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
                'X-User-Agent': 'Model: MAG250; Link: WiFi',
                'Authorization': `Bearer ${sessionData.token}`,
                'Cookie': `mac=${sessionData.macAddress}; stb_lang=en; timezone=Europe/Kiev;`
            };

            const profileUrl = `${sessionData.portalUrl}profile`;
            const response = await fetch(profileUrl, {
                method: 'GET',
                headers: headers,
                mode: 'cors'
            });

            if (response.ok) {
                const data = await response.json();
                return { 
                    success: true, 
                    profile: data.js || data,
                    message: 'Real IPTV connection verified - portal is responding with valid data'
                };
            } else {
                return { 
                    success: false, 
                    error: `Profile verification failed: HTTP ${response.status}`,
                    message: 'Connection established but profile access failed'
                };
            }
        } catch (error) {
            return { 
                success: false, 
                error: error.message,
                message: 'Connection verification failed - this may be a demo/fake portal'
            };
        }
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