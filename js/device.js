// Device detection and MAC address fetching module
class DeviceManager {
    constructor() {
        this.platform = this.detectPlatform();
        this.deviceInfo = {};
        this.macAddress = null;
    }

    // Detect the platform/device type
    detectPlatform() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        // WebOS TV detection
        if (userAgent.includes('webos')) {
            return 'webos';
        }
        
        // Tizen (Samsung Smart TV) detection
        if (userAgent.includes('tizen')) {
            return 'tizen';
        }
        
        // Android TV detection
        if (userAgent.includes('android') && userAgent.includes('tv')) {
            return 'androidtv';
        }
        
        // MAG STB detection
        if (userAgent.includes('mag') || userAgent.includes('stb')) {
            return 'mag';
        }
        
        // Generic Smart TV detection
        if (userAgent.includes('smart') && userAgent.includes('tv')) {
            return 'smarttv';
        }
        
        // Desktop/Mobile browser
        if (userAgent.includes('chrome') || userAgent.includes('firefox') || userAgent.includes('safari')) {
            return 'browser';
        }
        
        return 'unknown';
    }

    // Get real device MAC address
    async getDeviceMacAddress() {
        console.log('Attempting to fetch device MAC address for platform:', this.platform);
        
        try {
            switch (this.platform) {
                case 'webos':
                    return await this.getWebOSMacAddress();
                
                case 'tizen':
                    return await this.getTizenMacAddress();
                
                case 'androidtv':
                    return await this.getAndroidTVMacAddress();
                
                case 'mag':
                    return await this.getMAGMacAddress();
                
                case 'browser':
                    return await this.getBrowserMacAddress();
                
                default:
                    return await this.getGenericMacAddress();
            }
        } catch (error) {
            console.error('Error fetching MAC address:', error);
            return null;
        }
    }

    // WebOS TV MAC address detection
    async getWebOSMacAddress() {
        try {
            // Check for WebOS device API
            if (typeof window.webOS !== 'undefined') {
                return new Promise((resolve, reject) => {
                    // Use WebOS device API to get network info
                    if (window.webOS.deviceInfo) {
                        const deviceInfo = window.webOS.deviceInfo();
                        if (deviceInfo && deviceInfo.networkInfo && deviceInfo.networkInfo.macAddress) {
                            resolve(deviceInfo.networkInfo.macAddress);
                            return;
                        }
                    }
                    
                    // Try WebOS service call
                    if (window.webOS.service) {
                        window.webOS.service.request('luna://com.webos.service.connectionmanager', {
                            method: 'getStatus',
                            parameters: {},
                            onSuccess: function(result) {
                                if (result && result.wired && result.wired.netmask) {
                                    // Extract MAC from network info if available
                                    resolve(result.wired.macAddress || null);
                                } else {
                                    reject(new Error('No MAC address in WebOS response'));
                                }
                            },
                            onFailure: function(error) {
                                reject(error);
                            }
                        });
                    } else {
                        reject(new Error('WebOS service API not available'));
                    }
                });
            }
            
            // Fallback: Try to extract from device fingerprint
            return await this.generateDeviceFingerprint();
            
        } catch (error) {
            console.error('WebOS MAC detection failed:', error);
            return await this.generateDeviceFingerprint();
        }
    }

    // Tizen TV MAC address detection
    async getTizenMacAddress() {
        try {
            // Check for Tizen device API
            if (typeof tizen !== 'undefined' && tizen.systeminfo) {
                return new Promise((resolve, reject) => {
                    tizen.systeminfo.getPropertyValue('NETWORK', 
                        function(network) {
                            if (network && network.macAddress) {
                                resolve(network.macAddress);
                            } else {
                                reject(new Error('No MAC address in Tizen network info'));
                            }
                        },
                        function(error) {
                            reject(error);
                        }
                    );
                });
            }
            
            return await this.generateDeviceFingerprint();
            
        } catch (error) {
            console.error('Tizen MAC detection failed:', error);
            return await this.generateDeviceFingerprint();
        }
    }

    // Android TV MAC address detection
    async getAndroidTVMacAddress() {
        try {
            // Check for Android TV APIs
            if (typeof Android !== 'undefined' && Android.getDeviceInfo) {
                const deviceInfo = Android.getDeviceInfo();
                if (deviceInfo && deviceInfo.macAddress) {
                    return deviceInfo.macAddress;
                }
            }
            
            return await this.generateDeviceFingerprint();
            
        } catch (error) {
            console.error('Android TV MAC detection failed:', error);
            return await this.generateDeviceFingerprint();
        }
    }

    // MAG STB MAC address detection
    async getMAGMacAddress() {
        try {
            // Check for MAG STB specific APIs
            if (typeof gSTB !== 'undefined') {
                // MAG STB has gSTB global object
                if (gSTB.GetDeviceMacAddress) {
                    return gSTB.GetDeviceMacAddress();
                }
                
                if (gSTB.GetDeviceInfo) {
                    const deviceInfo = gSTB.GetDeviceInfo();
                    if (deviceInfo && deviceInfo.macAddress) {
                        return deviceInfo.macAddress;
                    }
                }
            }
            
            // Check for STB environment variables
            if (typeof window.stb !== 'undefined' && window.stb.GetDeviceMacAddress) {
                return window.stb.GetDeviceMacAddress();
            }
            
            return await this.generateDeviceFingerprint();
            
        } catch (error) {
            console.error('MAG STB MAC detection failed:', error);
            return await this.generateDeviceFingerprint();
        }
    }

    // Browser-based MAC address detection (limited)
    async getBrowserMacAddress() {
        try {
            // Modern browsers don't allow direct MAC access for security
            // We'll generate a consistent device fingerprint instead
            return await this.generateDeviceFingerprint();
            
        } catch (error) {
            console.error('Browser MAC detection failed:', error);
            return await this.generateDeviceFingerprint();
        }
    }

    // Generic MAC address detection
    async getGenericMacAddress() {
        try {
            // Try various methods
            
            // Method 1: Check for device APIs
            if (typeof navigator.deviceInfo !== 'undefined') {
                const deviceInfo = await navigator.deviceInfo.getInfo();
                if (deviceInfo && deviceInfo.macAddress) {
                    return deviceInfo.macAddress;
                }
            }
            
            // Method 2: Check for network APIs
            if (typeof navigator.connection !== 'undefined' && navigator.connection.macAddress) {
                return navigator.connection.macAddress;
            }
            
            // Fallback: Generate device fingerprint
            return await this.generateDeviceFingerprint();
            
        } catch (error) {
            console.error('Generic MAC detection failed:', error);
            return await this.generateDeviceFingerprint();
        }
    }

    // Generate a consistent device fingerprint as MAC alternative
    async generateDeviceFingerprint() {
        try {
            // Collect device characteristics
            const characteristics = [
                navigator.userAgent,
                navigator.language,
                navigator.platform,
                screen.width + 'x' + screen.height,
                new Date().getTimezoneOffset(),
                navigator.hardwareConcurrency || 1,
                navigator.maxTouchPoints || 0
            ];
            
            // Add more device-specific info if available
            if (navigator.deviceMemory) {
                characteristics.push(navigator.deviceMemory.toString());
            }
            
            if (navigator.getBattery) {
                try {
                    const battery = await navigator.getBattery();
                    characteristics.push(battery.level.toString());
                } catch (e) {
                    // Battery API not available
                }
            }
            
            // Create hash from characteristics
            const fingerprint = await this.hashString(characteristics.join('|'));
            
            // Format as MAC address (but mark it as generated)
            const mac = this.formatAsMAC(fingerprint);
            
            console.log('Generated device fingerprint MAC:', mac);
            return mac;
            
        } catch (error) {
            console.error('Error generating device fingerprint:', error);
            // Ultimate fallback: random MAC with device-specific prefix
            return this.generateRandomMAC();
        }
    }

    // Hash string to create consistent fingerprint
    async hashString(str) {
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            const encoder = new TextEncoder();
            const data = encoder.encode(str);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } else {
            // Simple hash fallback
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return Math.abs(hash).toString(16).padStart(8, '0');
        }
    }

    // Format hash as MAC address
    formatAsMAC(hash) {
        // Take first 12 hex characters
        const macHex = hash.substring(0, 12).padEnd(12, '0');
        
        // Add platform-specific prefix to identify generated MACs
        const platformPrefix = {
            'webos': '00:1a:79',
            'tizen': '00:1b:7a', 
            'androidtv': '00:1c:7b',
            'mag': '00:1d:7c',
            'browser': '00:1e:7d',
            'unknown': '00:1f:7e'
        };
        
        const prefix = platformPrefix[this.platform] || platformPrefix['unknown'];
        const suffix = macHex.substring(6, 12);
        
        return prefix + ':' + suffix.substring(0, 2) + ':' + suffix.substring(2, 4) + ':' + suffix.substring(4, 6);
    }

    // Generate random MAC as ultimate fallback
    generateRandomMAC() {
        const randomBytes = new Array(6).fill(0).map(() => Math.floor(Math.random() * 256));
        
        // Set first byte to identify this as generated
        randomBytes[0] = 0x00;
        randomBytes[1] = 0x50; // Vendor prefix for generated MACs
        
        return randomBytes.map(b => b.toString(16).padStart(2, '0')).join(':');
    }

    // Check if MAC address is likely fake/hardcoded
    isMACAddressSuspicious(mac) {
        if (!mac || typeof mac !== 'string') {
            return true;
        }
        
        const suspiciousPatterns = [
            /^00:00:00:00:00:00$/, // All zeros
            /^ff:ff:ff:ff:ff:ff$/i, // All F's
            /^(00:11:22:33:44:55|00:1a:79:00:00:00)$/i, // Common test MACs
            /^00:50:56/i, // VMware
            /^08:00:27/i, // VirtualBox default
        ];
        
        return suspiciousPatterns.some(pattern => pattern.test(mac));
    }

    // Get comprehensive device information
    async getDeviceInfo() {
        try {
            const info = {
                platform: this.platform,
                userAgent: navigator.userAgent,
                language: navigator.language,
                screenResolution: `${screen.width}x${screen.height}`,
                colorDepth: screen.colorDepth,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                macAddress: await this.getDeviceMacAddress(),
                deviceMemory: navigator.deviceMemory || 'unknown',
                hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
                connectionType: navigator.connection ? navigator.connection.effectiveType : 'unknown'
            };
            
            this.deviceInfo = info;
            return info;
            
        } catch (error) {
            console.error('Error getting device info:', error);
            return {
                platform: this.platform,
                error: error.message
            };
        }
    }

    // Validate device for IPTV compatibility
    validateDeviceCompatibility() {
        const issues = [];
        
        // Check for required APIs
        if (!document.createElement('video').canPlayType) {
            issues.push('Video playback not supported');
        }
        
        // Check for HLS support
        const video = document.createElement('video');
        if (!video.canPlayType('application/vnd.apple.mpegurl') && typeof Hls === 'undefined') {
            issues.push('HLS streaming may not be supported');
        }
        
        // Check screen resolution for TV compatibility
        if (screen.width < 1280 || screen.height < 720) {
            issues.push('Screen resolution may be too low for optimal viewing');
        }
        
        return {
            compatible: issues.length === 0,
            issues: issues,
            platform: this.platform
        };
    }
}

// Create global device manager instance
window.deviceManager = new DeviceManager();