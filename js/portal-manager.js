// Multi-Portal Management System
class PortalManager {
    constructor() {
        this.storageKey = 'iptv_portals';
        this.currentPortalKey = 'iptv_current_portal';
        this.portals = this.loadPortals();
        this.currentPortal = this.loadCurrentPortal();
    }

    // Load portals from localStorage
    loadPortals() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading portals:', error);
            return [];
        }
    }

    // Save portals to localStorage
    savePortals() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.portals));
        } catch (error) {
            console.error('Error saving portals:', error);
        }
    }

    // Load current portal
    loadCurrentPortal() {
        try {
            const stored = localStorage.getItem(this.currentPortalKey);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.error('Error loading current portal:', error);
            return null;
        }
    }

    // Save current portal
    saveCurrentPortal(portal) {
        try {
            localStorage.setItem(this.currentPortalKey, JSON.stringify(portal));
            this.currentPortal = portal;
        } catch (error) {
            console.error('Error saving current portal:', error);
        }
    }

    // Add a new portal
    addPortal(portalData) {
        const portal = {
            id: this.generatePortalId(),
            name: portalData.name || this.extractPortalName(portalData.url),
            url: portalData.url,
            macAddress: portalData.macAddress,
            username: portalData.username || '',
            password: portalData.password || '',
            addedDate: Date.now(),
            lastUsed: null,
            isActive: false,
            settings: {
                autoConnect: false,
                useVirtualMAC: false,
                ...portalData.settings
            }
        };

        // Check if portal already exists
        const existingIndex = this.portals.findIndex(p => 
            p.url === portal.url && p.macAddress === portal.macAddress
        );

        if (existingIndex !== -1) {
            // Update existing portal
            this.portals[existingIndex] = { ...this.portals[existingIndex], ...portal };
            this.savePortals();
            return this.portals[existingIndex];
        } else {
            // Add new portal
            this.portals.push(portal);
            this.savePortals();
            return portal;
        }
    }

    // Remove a portal
    removePortal(portalId) {
        const index = this.portals.findIndex(p => p.id === portalId);
        if (index !== -1) {
            const removedPortal = this.portals.splice(index, 1)[0];
            
            // If this was the current portal, clear it
            if (this.currentPortal && this.currentPortal.id === portalId) {
                this.currentPortal = null;
                localStorage.removeItem(this.currentPortalKey);
            }
            
            this.savePortals();
            return removedPortal;
        }
        return null;
    }

    // Update portal
    updatePortal(portalId, updateData) {
        const index = this.portals.findIndex(p => p.id === portalId);
        if (index !== -1) {
            this.portals[index] = { ...this.portals[index], ...updateData };
            
            // Update current portal if it's the same
            if (this.currentPortal && this.currentPortal.id === portalId) {
                this.currentPortal = this.portals[index];
                this.saveCurrentPortal(this.currentPortal);
            }
            
            this.savePortals();
            return this.portals[index];
        }
        return null;
    }

    // Get all portals
    getAllPortals() {
        return [...this.portals];
    }

    // Get portal by ID
    getPortal(portalId) {
        return this.portals.find(p => p.id === portalId);
    }

    // Set current portal
    setCurrentPortal(portalId) {
        const portal = this.getPortal(portalId);
        if (portal) {
            // Mark all portals as inactive
            this.portals.forEach(p => p.isActive = false);
            
            // Mark selected portal as active
            portal.isActive = true;
            portal.lastUsed = Date.now();
            
            this.saveCurrentPortal(portal);
            this.savePortals();
            return portal;
        }
        return null;
    }

    // Get current portal
    getCurrentPortal() {
        return this.currentPortal;
    }

    // Clear current portal
    clearCurrentPortal() {
        this.currentPortal = null;
        localStorage.removeItem(this.currentPortalKey);
        
        // Mark all portals as inactive
        this.portals.forEach(p => p.isActive = false);
        this.savePortals();
    }

    // Generate unique portal ID
    generatePortalId() {
        return 'portal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Extract portal name from URL
    extractPortalName(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname || 'Unknown Portal';
        } catch (error) {
            return 'Unknown Portal';
        }
    }

    // Get recently used portals
    getRecentPortals(limit = 5) {
        return this.portals
            .filter(p => p.lastUsed)
            .sort((a, b) => b.lastUsed - a.lastUsed)
            .slice(0, limit);
    }

    // Search portals
    searchPortals(query) {
        const lowercaseQuery = query.toLowerCase();
        return this.portals.filter(portal => 
            portal.name.toLowerCase().includes(lowercaseQuery) ||
            portal.url.toLowerCase().includes(lowercaseQuery)
        );
    }

    // Export portals (for backup)
    exportPortals() {
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            portals: this.portals.map(portal => ({
                ...portal,
                // Don't export sensitive data in plain text
                password: portal.password ? '[ENCRYPTED]' : ''
            }))
        };
        return JSON.stringify(exportData, null, 2);
    }

    // Import portals (from backup)
    importPortals(jsonData) {
        try {
            const importData = JSON.parse(jsonData);
            
            if (!importData.portals || !Array.isArray(importData.portals)) {
                throw new Error('Invalid import data format');
            }

            let importedCount = 0;
            let skippedCount = 0;

            importData.portals.forEach(portalData => {
                // Skip if portal already exists
                const exists = this.portals.some(p => 
                    p.url === portalData.url && p.macAddress === portalData.macAddress
                );

                if (!exists) {
                    // Generate new ID and reset some fields
                    const portal = {
                        ...portalData,
                        id: this.generatePortalId(),
                        addedDate: Date.now(),
                        lastUsed: null,
                        isActive: false,
                        password: '' // Clear password as it was not exported
                    };
                    this.portals.push(portal);
                    importedCount++;
                } else {
                    skippedCount++;
                }
            });

            this.savePortals();
            return { imported: importedCount, skipped: skippedCount };

        } catch (error) {
            console.error('Error importing portals:', error);
            throw new Error('Failed to import portals: ' + error.message);
        }
    }

    // Clear all portals
    clearAllPortals() {
        this.portals = [];
        this.currentPortal = null;
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.currentPortalKey);
    }

    // Get portal statistics
    getStatistics() {
        return {
            totalPortals: this.portals.length,
            activePortals: this.portals.filter(p => p.isActive).length,
            recentlyUsed: this.portals.filter(p => p.lastUsed).length,
            withAutoConnect: this.portals.filter(p => p.settings.autoConnect).length
        };
    }

    // Validate portal data
    validatePortalData(portalData) {
        const errors = [];

        if (!portalData.url || typeof portalData.url !== 'string') {
            errors.push('Portal URL is required');
        } else {
            try {
                new URL(portalData.url);
            } catch (e) {
                errors.push('Invalid portal URL format');
            }
        }

        if (!portalData.macAddress || typeof portalData.macAddress !== 'string') {
            errors.push('MAC address is required');
        } else if (!/^([0-9a-fA-F]{2}[:-]){5}([0-9a-fA-F]{2})$/.test(portalData.macAddress)) {
            errors.push('Invalid MAC address format');
        }

        return errors;
    }
}

// Create global portal manager instance
window.portalManager = new PortalManager();