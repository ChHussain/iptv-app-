// MAC Address Generator for IPTV App
class MACGenerator {
    constructor() {
        this.storageKey = 'iptv_virtual_mac';
    }

    // Generate a random MAC address in the format 00:1a:79:xx:xx:xx
    generateMAC() {
        // Use a common OUI prefix for STB devices (00:1a:79 is commonly used)
        const oui = '00:1a:79';
        
        // Generate random bytes for the remaining 3 octets
        const randomBytes = [];
        for (let i = 0; i < 3; i++) {
            randomBytes.push(Math.floor(Math.random() * 256));
        }
        
        // Format as hex and pad with zeros
        const randomPart = randomBytes
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join(':');
        
        return `${oui}:${randomPart}`;
    }

    // Generate MAC based on device characteristics (more consistent)
    generateDeviceBasedMAC() {
        const deviceInfo = this.getDeviceInfo();
        const hash = this.simpleHash(deviceInfo);
        
        // Use hash to generate consistent MAC for this device
        const oui = '00:1a:79';
        const bytes = [];
        
        for (let i = 0; i < 3; i++) {
            bytes.push((hash >> (i * 8)) & 0xFF);
        }
        
        const randomPart = bytes
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join(':');
        
        return `${oui}:${randomPart}`;
    }

    // Get device information for generating consistent MAC
    getDeviceInfo() {
        const info = [
            navigator.userAgent,
            screen.width + 'x' + screen.height,
            navigator.language,
            new Date().getTimezoneOffset(),
            navigator.platform
        ].join('|');
        
        return info;
    }

    // Simple hash function
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    // Get stored virtual MAC or generate new one
    getVirtualMAC() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored && this.isValidMAC(stored)) {
                return stored;
            }
        } catch (error) {
            console.error('Error loading virtual MAC:', error);
        }
        
        // Generate new MAC
        const mac = this.generateDeviceBasedMAC();
        this.saveVirtualMAC(mac);
        return mac;
    }

    // Save virtual MAC to storage
    saveVirtualMAC(mac) {
        try {
            localStorage.setItem(this.storageKey, mac);
        } catch (error) {
            console.error('Error saving virtual MAC:', error);
        }
    }

    // Clear stored virtual MAC
    clearVirtualMAC() {
        try {
            localStorage.removeItem(this.storageKey);
        } catch (error) {
            console.error('Error clearing virtual MAC:', error);
        }
    }

    // Validate MAC address format
    isValidMAC(mac) {
        const macRegex = /^([0-9a-fA-F]{2}[:-]){5}([0-9a-fA-F]{2})$/;
        return macRegex.test(mac);
    }



    // Get suggested MAC addresses (virtual + some randoms)
    getSuggestedMACs() {
        const suggestions = [];
        
        // Add provider-supplied MAC first (highest priority)
        suggestions.push({
            type: 'provider',
            mac: 'AA:7A:10:57:C1:00',
            description: 'Provider-supplied MAC (VU IPTV/Smart STB compatible)'
        });
        
        // Add virtual MAC
        suggestions.push({
            type: 'virtual',
            mac: this.getVirtualMAC(),
            description: 'Device-based virtual MAC (recommended)'
        });
        
        // Add some common STB MAC prefixes
        const commonPrefixes = [
            '00:1a:79', // Common STB prefix
            '00:50:f2', // Another common prefix
            '08:00:27'  // VirtualBox prefix (for testing)
        ];
        
        commonPrefixes.forEach((prefix, index) => {
            if (index === 0) return; // Skip first one as it's already used for virtual
            
            const randomBytes = [];
            for (let i = 0; i < 3; i++) {
                randomBytes.push(Math.floor(Math.random() * 256));
            }
            
            const randomPart = randomBytes
                .map(byte => byte.toString(16).padStart(2, '0'))
                .join(':');
            
            suggestions.push({
                type: 'random',
                mac: `${prefix}:${randomPart}`,
                description: `Random MAC with ${prefix} prefix`
            });
        });
        
        return suggestions;
    }

    // Get the provider-supplied MAC address
    getProviderMAC() {
        return 'AA:7A:10:57:C1:00';
    }
}

// Create global MAC generator instance
window.macGenerator = new MACGenerator();