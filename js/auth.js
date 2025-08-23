// Authentication module for IPTV app
class Auth {
    constructor() {
        this.storageKey = 'iptv_session';
        this.portalsKey = 'iptv_portals';
        this.session = this.loadSession();
        this.portals = this.loadPortals();
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

    // Load portals from localStorage
    loadPortals() {
        try {
            const portals = localStorage.getItem(this.portalsKey);
            return portals ? JSON.parse(portals) : [];
        } catch (error) {
            console.error('Error loading portals:', error);
            return [];
        }
    }

    // Save portals to localStorage
    savePortals(portals) {
        try {
            localStorage.setItem(this.portalsKey, JSON.stringify(portals));
            this.portals = portals;
        } catch (error) {
            console.error('Error saving portals:', error);
        }
    }

    // Add a new portal
    addPortal(portalData) {
        const existingIndex = this.portals.findIndex(p => p.url === portalData.url);
        if (existingIndex >= 0) {
            this.portals[existingIndex] = portalData;
        } else {
            this.portals.push(portalData);
        }
        this.savePortals(this.portals);
    }

    // Remove a portal
    removePortal(portalUrl) {
        this.portals = this.portals.filter(p => p.url !== portalUrl);
        this.savePortals(this.portals);
    }

    // Get all saved portals
    getPortals() {
        return this.portals;
    }

    // Generate a virtual MAC address
    generateVirtualMAC() {
        const chars = '0123456789ABCDEF';
        let mac = '00:1A:79:'; // Common prefix for virtual MACs
        
        for (let i = 0; i < 6; i++) {
            if (i > 0 && i % 2 === 0) {
                mac += ':';
            }
            mac += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return mac;
    }

    // Validate MAC address format
    validateMAC(mac) {
        const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
        return macRegex.test(mac);
    }

    // Clear session
    clearSession() {
        localStorage.removeItem(this.storageKey);
        this.session = null;
        this.stopKeepAlive();
    }

    // Keep-alive mechanism to maintain session
    async startKeepAlive() {
        if (!this.session) return;
        
        // Send keep-alive every 10 minutes
        this.keepAliveInterval = setInterval(async () => {
            try {
                await this.sendKeepAlive();
            } catch (error) {
                console.error('Keep-alive failed:', error);
                // If keep-alive fails multiple times, logout
                if (!this.keepAliveFailures) this.keepAliveFailures = 0;
                this.keepAliveFailures++;
                
                if (this.keepAliveFailures >= 3) {
                    console.log('Multiple keep-alive failures, logging out');
                    this.logout();
                }
            }
        }, 600000); // 10 minutes
    }

    // Stop keep-alive mechanism
    stopKeepAlive() {
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }
    }

    // Send keep-alive request
    async sendKeepAlive() {
        if (!this.session) throw new Error('No active session');
        
        const keepAliveUrl = `${this.session.portalUrl}watchdog`;
        const headers = {
            'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
            'X-User-Agent': 'Model: MAG250; Link: WiFi',
            'Authorization': `Bearer ${this.session.token}`,
            'Cookie': `mac=${this.session.macAddress}; stb_lang=en; timezone=Europe/Kiev;`
        };

        const response = await fetch(keepAliveUrl, {
            method: 'GET',
            headers: headers,
            mode: 'cors'
        });

        if (response.ok) {
            this.keepAliveFailures = 0;
            const data = await response.json();
            return data;
        } else {
            throw new Error(`Keep-alive failed: ${response.status}`);
        }
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
                
                // Save portal for future use
                this.addPortal({
                    url: normalizedUrl,
                    macAddress: macAddress,
                    name: this.extractPortalName(normalizedUrl),
                    lastUsed: Date.now()
                });
                
                // Start keep-alive mechanism
                this.startKeepAlive();
                
                return { success: true, session: sessionData };
            } else {
                throw new Error('Invalid response from portal');
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

    // Extract portal name from URL for display
    extractPortalName(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname + (urlObj.port ? `:${urlObj.port}` : '');
        } catch (error) {
            return url;
        }
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
            if (error.name === 'TypeError' && error.message.includes('CORS')) {
                throw new Error('CORS error - Portal may not allow cross-origin requests from browser');
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