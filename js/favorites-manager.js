// Favorites Management System
class FavoritesManager {
    constructor() {
        this.storageKey = 'iptv_favorites';
        this.favorites = this.loadFavorites();
    }

    // Load favorites from localStorage
    loadFavorites() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : {
                channels: [],
                movies: [],
                series: [],
                categories: []
            };
        } catch (error) {
            console.error('Error loading favorites:', error);
            return {
                channels: [],
                movies: [],
                series: [],
                categories: []
            };
        }
    }

    // Save favorites to localStorage
    saveFavorites() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.favorites));
        } catch (error) {
            console.error('Error saving favorites:', error);
        }
    }

    // Add item to favorites
    addToFavorites(type, item) {
        if (!this.favorites[type]) {
            console.error('Invalid favorite type:', type);
            return false;
        }

        const favoriteItem = {
            id: item.id,
            name: item.name,
            type: type,
            addedDate: Date.now(),
            portalUrl: window.auth.getSession()?.portalUrl || '',
            data: {
                ...item,
                // Store essential data for playback
                logo: item.logo,
                screenshot_uri: item.screenshot_uri,
                genre: item.genre,
                year: item.year,
                rating: item.rating,
                description: item.description
            }
        };

        // Check if already in favorites
        const existingIndex = this.favorites[type].findIndex(fav => 
            fav.id === item.id && fav.portalUrl === favoriteItem.portalUrl
        );

        if (existingIndex === -1) {
            this.favorites[type].push(favoriteItem);
            this.saveFavorites();
            return true;
        }

        return false; // Already in favorites
    }

    // Remove item from favorites
    removeFromFavorites(type, itemId, portalUrl = null) {
        if (!this.favorites[type]) {
            console.error('Invalid favorite type:', type);
            return false;
        }

        const currentPortalUrl = portalUrl || window.auth.getSession()?.portalUrl || '';
        const index = this.favorites[type].findIndex(fav => 
            fav.id === itemId && fav.portalUrl === currentPortalUrl
        );

        if (index !== -1) {
            this.favorites[type].splice(index, 1);
            this.saveFavorites();
            return true;
        }

        return false;
    }

    // Check if item is in favorites
    isFavorite(type, itemId, portalUrl = null) {
        if (!this.favorites[type]) {
            return false;
        }

        const currentPortalUrl = portalUrl || window.auth.getSession()?.portalUrl || '';
        return this.favorites[type].some(fav => 
            fav.id === itemId && fav.portalUrl === currentPortalUrl
        );
    }

    // Toggle favorite status
    toggleFavorite(type, item) {
        if (this.isFavorite(type, item.id)) {
            return this.removeFromFavorites(type, item.id);
        } else {
            return this.addToFavorites(type, item);
        }
    }

    // Get all favorites of a specific type
    getFavorites(type, portalUrl = null) {
        if (!this.favorites[type]) {
            return [];
        }

        const currentPortalUrl = portalUrl || window.auth.getSession()?.portalUrl || '';
        
        if (currentPortalUrl) {
            return this.favorites[type]
                .filter(fav => fav.portalUrl === currentPortalUrl)
                .sort((a, b) => b.addedDate - a.addedDate);
        }

        return this.favorites[type].sort((a, b) => b.addedDate - a.addedDate);
    }

    // Get all favorites (all types)
    getAllFavorites(portalUrl = null) {
        const allFavorites = [];
        
        Object.keys(this.favorites).forEach(type => {
            const typeFavorites = this.getFavorites(type, portalUrl);
            allFavorites.push(...typeFavorites);
        });

        return allFavorites.sort((a, b) => b.addedDate - a.addedDate);
    }

    // Get recently added favorites
    getRecentFavorites(limit = 10, portalUrl = null) {
        return this.getAllFavorites(portalUrl).slice(0, limit);
    }

    // Search favorites
    searchFavorites(query, type = null, portalUrl = null) {
        const lowercaseQuery = query.toLowerCase();
        let searchIn = [];

        if (type && this.favorites[type]) {
            searchIn = this.getFavorites(type, portalUrl);
        } else {
            searchIn = this.getAllFavorites(portalUrl);
        }

        return searchIn.filter(favorite => 
            favorite.name.toLowerCase().includes(lowercaseQuery) ||
            (favorite.data.description && favorite.data.description.toLowerCase().includes(lowercaseQuery)) ||
            (favorite.data.genre && favorite.data.genre.toLowerCase().includes(lowercaseQuery))
        );
    }

    // Get favorites count by type
    getFavoritesCount(type = null, portalUrl = null) {
        if (type) {
            return this.getFavorites(type, portalUrl).length;
        }

        const counts = {};
        Object.keys(this.favorites).forEach(type => {
            counts[type] = this.getFavorites(type, portalUrl).length;
        });
        counts.total = this.getAllFavorites(portalUrl).length;

        return counts;
    }

    // Clear all favorites
    clearAllFavorites() {
        this.favorites = {
            channels: [],
            movies: [],
            series: [],
            categories: []
        };
        this.saveFavorites();
    }

    // Clear favorites for specific portal
    clearPortalFavorites(portalUrl) {
        Object.keys(this.favorites).forEach(type => {
            this.favorites[type] = this.favorites[type].filter(fav => 
                fav.portalUrl !== portalUrl
            );
        });
        this.saveFavorites();
    }

    // Export favorites
    exportFavorites(portalUrl = null) {
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            portalUrl: portalUrl || window.auth.getSession()?.portalUrl || 'all',
            favorites: portalUrl ? this.getAllFavorites(portalUrl) : this.favorites
        };

        return JSON.stringify(exportData, null, 2);
    }

    // Import favorites
    importFavorites(jsonData) {
        try {
            const importData = JSON.parse(jsonData);
            
            if (!importData.favorites) {
                throw new Error('Invalid import data format');
            }

            let importedCount = 0;
            let skippedCount = 0;

            if (Array.isArray(importData.favorites)) {
                // Import from exported array format
                importData.favorites.forEach(favorite => {
                    if (!this.isFavorite(favorite.type, favorite.id, favorite.portalUrl)) {
                        if (!this.favorites[favorite.type]) {
                            this.favorites[favorite.type] = [];
                        }
                        this.favorites[favorite.type].push(favorite);
                        importedCount++;
                    } else {
                        skippedCount++;
                    }
                });
            } else {
                // Import from object format
                Object.keys(importData.favorites).forEach(type => {
                    if (Array.isArray(importData.favorites[type])) {
                        importData.favorites[type].forEach(favorite => {
                            if (!this.isFavorite(type, favorite.id, favorite.portalUrl)) {
                                if (!this.favorites[type]) {
                                    this.favorites[type] = [];
                                }
                                this.favorites[type].push(favorite);
                                importedCount++;
                            } else {
                                skippedCount++;
                            }
                        });
                    }
                });
            }

            this.saveFavorites();
            return { imported: importedCount, skipped: skippedCount };

        } catch (error) {
            console.error('Error importing favorites:', error);
            throw new Error('Failed to import favorites: ' + error.message);
        }
    }

    // Get favorite item by ID and type
    getFavoriteById(type, itemId, portalUrl = null) {
        const currentPortalUrl = portalUrl || window.auth.getSession()?.portalUrl || '';
        
        if (!this.favorites[type]) {
            return null;
        }

        return this.favorites[type].find(fav => 
            fav.id === itemId && fav.portalUrl === currentPortalUrl
        );
    }

    // Update favorite item data
    updateFavorite(type, itemId, updateData, portalUrl = null) {
        const currentPortalUrl = portalUrl || window.auth.getSession()?.portalUrl || '';
        
        if (!this.favorites[type]) {
            return false;
        }

        const index = this.favorites[type].findIndex(fav => 
            fav.id === itemId && fav.portalUrl === currentPortalUrl
        );

        if (index !== -1) {
            this.favorites[type][index] = {
                ...this.favorites[type][index],
                ...updateData,
                data: {
                    ...this.favorites[type][index].data,
                    ...updateData.data
                }
            };
            this.saveFavorites();
            return true;
        }

        return false;
    }

    // Get statistics
    getStatistics() {
        const stats = {
            total: 0,
            byType: {},
            byPortal: {},
            recentlyAdded: 0
        };

        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

        Object.keys(this.favorites).forEach(type => {
            stats.byType[type] = this.favorites[type].length;
            stats.total += this.favorites[type].length;

            this.favorites[type].forEach(fav => {
                // Count by portal
                if (!stats.byPortal[fav.portalUrl]) {
                    stats.byPortal[fav.portalUrl] = 0;
                }
                stats.byPortal[fav.portalUrl]++;

                // Count recently added
                if (fav.addedDate > oneWeekAgo) {
                    stats.recentlyAdded++;
                }
            });
        });

        return stats;
    }
}

// Create global favorites manager instance
window.favoritesManager = new FavoritesManager();