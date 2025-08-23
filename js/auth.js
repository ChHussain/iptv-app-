// Authentication module for IPTV app
class Auth {
    constructor() {
        this.storageKey = 'iptv_session';
        this.portalsKey = 'iptv_portals';
        this.session = this.loadSession();
        this.portals = this.loadPortals();
        this.debugCallback = null; // For UI debugging
    }

    // Set debug callback for UI logging
    setDebugCallback(callback) {
        this.debugCallback = callback;
    }

    // Debug log that can be sent to UI
    debugLog(message) {
        console.log('[AUTH]', message);
        if (this.debugCallback) {
            this.debugCallback(message);
        }
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

    // Generate a virtual MAC address with VU+ compatibility
    generateVirtualMAC() {
        const chars = '0123456789ABCDEF';
        
        // VU+ and STB compatible MAC prefixes
        const macPrefixes = [
            '00:1A:79', // Common virtual MAC prefix
            '00:1B:C5', // VU+ compatible prefix  
            '00:0F:EA', // Another VU+ prefix
            '00:50:C2', // STB compatible prefix
            '00:09:34', // Alternative STB prefix
        ];
        
        // Choose a random prefix for better compatibility
        const prefix = macPrefixes[Math.floor(Math.random() * macPrefixes.length)];
        let mac = prefix + ':';
        
        // Generate the remaining 3 octets
        for (let i = 0; i < 6; i++) {
            if (i > 0 && i % 2 === 0) {
                mac += ':';
            }
            mac += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return mac.toLowerCase(); // VU+ systems often prefer lowercase MACs
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
        
        // Use stored device configuration or fall back to MAG250
        const deviceConfig = this.session.deviceConfig || {
            userAgent: 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
            xUserAgent: 'Model: MAG250; Link: WiFi'
        };
        
        const headers = {
            'User-Agent': deviceConfig.userAgent,
            'X-User-Agent': deviceConfig.xUserAgent,
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
            // Try multiple portal URL variations for better compatibility
            const result = await this.tryMultiplePortalUrls(portalUrl, macAddress);
            
            if (result.success && result.data.token) {
                const sessionData = {
                    token: result.data.token,
                    portalUrl: result.portalUrl, // Use the successful portal URL
                    macAddress: macAddress,
                    loginTime: Date.now(),
                    tokenExpiry: result.data.token_expire || (Date.now() + 24 * 60 * 60 * 1000), // 24 hours default
                    deviceConfig: result.data.deviceConfig // Store successful device configuration
                };

                this.saveSession(sessionData);
                
                // Save portal for future use
                this.addPortal({
                    url: result.portalUrl, // Use the successful portal URL
                    macAddress: macAddress,
                    name: this.extractPortalName(result.portalUrl),
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

    // Normalize portal URL with multiple fallback strategies
    normalizePortalUrl(url) {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'http://' + url;
        }
        
        if (!url.endsWith('/')) {
            url += '/';
        }
        
        // If URL already has API path, use it as-is
        if (url.includes('/stalker_portal/api/')) {
            return url;
        }
        
        // If URL has /api/ but not stalker_portal, try to normalize
        if (url.includes('/api/')) {
            return url;
        }
        
        // Default: add stalker_portal/api/v1/ path
        if (url.endsWith('/')) {
            url += 'stalker_portal/api/v1/';
        } else {
            url += '/stalker_portal/api/v1/';
        }
        
        return url;
    }

    // Try multiple portal URL variations for better compatibility
    async tryMultiplePortalUrls(baseUrl, macAddress) {
        const urlVariations = [
            // Direct URL as provided
            baseUrl,
            // Add stalker_portal/api/v1/ if not present
            this.normalizePortalUrl(baseUrl),
            // Try without version number
            baseUrl.replace('/stalker_portal/api/v1/', '/stalker_portal/api/'),
            // Try c/ endpoint (some portals use this)
            baseUrl.replace('/stalker_portal/api/v1/', '/c/'),
            // Try direct API without stalker_portal
            baseUrl.replace('/stalker_portal/api/v1/', '/api/v1/'),
            // Try portal/ endpoint (some VU+ compatible portals)
            baseUrl.replace('/stalker_portal/api/v1/', '/portal/'),
            // Try api/ endpoint only
            baseUrl.replace('/stalker_portal/api/v1/', '/api/'),
            // Try with server_api.php (some old portals)
            baseUrl.replace('/stalker_portal/api/v1/', '/server_api.php'),
            // Try without any API path (direct portal)
            baseUrl.replace('/stalker_portal/api/v1/', '/'),
        ];
        
        // Remove duplicates while preserving order
        const uniqueUrls = [...new Set(urlVariations)];
        
        let lastError = null;
        
        for (const portalUrl of uniqueUrls) {
            try {
                this.debugLog(`Trying portal URL: ${portalUrl}`);
                const result = await this.performHandshake(portalUrl, macAddress);
                if (result && result.token) {
                    this.debugLog(`✓ Success with portal URL: ${portalUrl}`);
                    return { success: true, data: result, portalUrl: portalUrl };
                }
            } catch (error) {
                this.debugLog(`✗ Failed with portal URL ${portalUrl}: ${error.message}`);
                lastError = error;
                continue;
            }
        }
        
        throw lastError || new Error('All portal URL variations failed');
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

    // Get authentication configurations for different device types
    getAuthConfigurations() {
        return [
            // VU+ configuration (commonly used by VU IPTV players)
            {
                name: 'VU+ STB',
                userAgent: 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) VU+ STB stbapp ver: 4 rev: 9493 Safari/533.3',
                xUserAgent: 'Model: VU+; Link: WiFi',
                deviceModel: 'VU+'
            },
            // VU+ Solo2 (specific VU model)
            {
                name: 'VU+ Solo2',
                userAgent: 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) VU+solo2 STB stbapp ver: 4 rev: 9493 Safari/533.3',
                xUserAgent: 'Model: VU+solo2; Link: WiFi',
                deviceModel: 'VU+solo2'
            },
            // VU+ Ultimo (another popular VU model)
            {
                name: 'VU+ Ultimo',
                userAgent: 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) VU+ultimo STB stbapp ver: 4 rev: 9493 Safari/533.3',
                xUserAgent: 'Model: VU+ultimo; Link: WiFi',
                deviceModel: 'VU+ultimo'
            },
            // VU+ Duo2 (commonly supported)
            {
                name: 'VU+ Duo2',
                userAgent: 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) VU+duo2 STB stbapp ver: 4 rev: 9493 Safari/533.3',
                xUserAgent: 'Model: VU+duo2; Link: WiFi',
                deviceModel: 'VU+duo2'
            },
            // Original MAG250 (fallback)
            {
                name: 'MAG250',
                userAgent: 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
                xUserAgent: 'Model: MAG250; Link: WiFi',
                deviceModel: 'MAG250'
            },
            // MAG254 (another common STB)
            {
                name: 'MAG254',
                userAgent: 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 254 Safari/533.3',
                xUserAgent: 'Model: MAG254; Link: WiFi',
                deviceModel: 'MAG254'
            },
            // Generic Enigma2 (used by many VU+ boxes)
            {
                name: 'Enigma2',
                userAgent: 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) Enigma2 STB stbapp ver: 1 rev: 1 Safari/533.3',
                xUserAgent: 'Model: Enigma2; Link: WiFi',
                deviceModel: 'Enigma2'
            }
        ];
    }

    // Perform handshake with Stalker portal using multiple device configurations
    async performHandshake(portalUrl, macAddress) {
        const handshakeUrl = `${portalUrl}handshake`;
        const configurations = this.getAuthConfigurations();
        
        let lastError = null;
        
        // Try each configuration until one works
        for (const config of configurations) {
            try {
                this.debugLog(`Attempting authentication with ${config.name}...`);
                
                const headers = {
                    'User-Agent': config.userAgent,
                    'X-User-Agent': config.xUserAgent,
                    'Cookie': `mac=${macAddress}; stb_lang=en; timezone=Europe/Kiev;`
                };

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
                    this.debugLog(`✓ Authentication successful with ${config.name}`);
                    return {
                        token: data.js.token,
                        token_expire: data.js.token_expire,
                        profile: data.js.profile || {},
                        deviceConfig: config
                    };
                } else {
                    throw new Error('No token received from portal');
                }
            } catch (error) {
                this.debugLog(`✗ Authentication failed with ${config.name}: ${error.message}`);
                lastError = error;
                
                // If it's a CORS error, continue to next config
                if (error.name === 'TypeError' && error.message.includes('CORS')) {
                    continue;
                }
                // If it's a 4xx error, continue to next config
                if (error.message.includes('HTTP 4')) {
                    continue;
                }
                // For other errors, continue trying other configurations
                continue;
            }
        }
        
        // If all configurations failed, throw the last error
        if (lastError) {
            if (lastError.name === 'TypeError' && lastError.message.includes('CORS')) {
                throw new Error('CORS error - Portal may not allow cross-origin requests from browser');
            }
            throw lastError;
        } else {
            throw new Error('Authentication failed with all device configurations');
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