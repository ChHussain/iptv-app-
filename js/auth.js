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
                const sessionData = {
                    token: handshakeData.token,
                    portalUrl: normalizedUrl,
                    macAddress: macAddress,
                    loginTime: Date.now(),
                    tokenExpiry: handshakeData.token_expire || (Date.now() + 24 * 60 * 60 * 1000) // 24 hours default
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
        const handshakeUrl = `${portalUrl}handshake`;
        
        const headers = {
            'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
            'X-User-Agent': 'Model: MAG250; Link: WiFi',
            'Cookie': `mac=${macAddress}; stb_lang=en; timezone=Europe/Kiev;`
        };

        try {
            const response = await fetch(handshakeUrl, {
                method: 'GET',
                headers: headers,
                mode: 'cors'
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
        } catch (error) {
            // Enhanced error handling for better diagnostics
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                throw new Error('CORS error - Portal may not allow cross-origin requests from browser, or portal is unreachable');
            }
            if (error.message.includes('ERR_BLOCKED_BY_CLIENT')) {
                throw new Error('Request blocked by client (ad blocker or browser security)');
            }
            if (error.message.includes('ERR_NAME_NOT_RESOLVED')) {
                throw new Error('Portal domain name could not be resolved (DNS error)');
            }
            if (error.message.includes('ERR_CONNECTION_REFUSED')) {
                throw new Error('Portal refused connection (server may be down)');
            }
            if (error.message.includes('ERR_CONNECTION_TIMED_OUT')) {
                throw new Error('Connection to portal timed out');
            }
            throw error;
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