// EPG (Electronic Program Guide) Manager
class EPGManager {
    constructor() {
        this.storageKey = 'iptv_epg_cache';
        this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
        this.epgCache = this.loadCache();
        this.api = window.api;
    }

    // Load EPG cache from localStorage
    loadCache() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Error loading EPG cache:', error);
            return {};
        }
    }

    // Save EPG cache to localStorage
    saveCache() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.epgCache));
        } catch (error) {
            console.error('Error saving EPG cache:', error);
        }
    }

    // Clear old cache entries
    clearOldCache() {
        const now = Date.now();
        Object.keys(this.epgCache).forEach(key => {
            if (this.epgCache[key].timestamp < now - this.cacheTimeout) {
                delete this.epgCache[key];
            }
        });
        this.saveCache();
    }

    // Get EPG data for a channel
    async getChannelEPG(channelId, days = 1) {
        const cacheKey = `${channelId}_${days}`;
        const now = Date.now();

        // Check cache first
        if (this.epgCache[cacheKey] && 
            (now - this.epgCache[cacheKey].timestamp) < this.cacheTimeout) {
            return this.epgCache[cacheKey].data;
        }

        try {
            const epgData = await this.fetchChannelEPG(channelId, days);
            
            // Cache the result
            this.epgCache[cacheKey] = {
                data: epgData,
                timestamp: now
            };
            this.saveCache();
            
            return epgData;
        } catch (error) {
            console.error('Error fetching EPG:', error);
            
            // Return cached data if available, even if expired
            if (this.epgCache[cacheKey]) {
                return this.epgCache[cacheKey].data;
            }
            
            throw error;
        }
    }

    // Fetch EPG data from API
    async fetchChannelEPG(channelId, days = 1) {
        const fromDate = new Date();
        fromDate.setHours(0, 0, 0, 0);
        
        const toDate = new Date(fromDate);
        toDate.setDate(toDate.getDate() + days);

        const params = {
            type: 'itv',
            action: 'get_epg_info',
            period: days,
            ch_id: channelId,
            JsHttpRequest: '1-xml'
        };

        return await this.api.apiRequest('itv', params);
    }

    // Get current program for a channel
    async getCurrentProgram(channelId) {
        try {
            const epgData = await this.getChannelEPG(channelId, 1);
            const now = Date.now();

            if (epgData && epgData.epg_info) {
                // Find current program
                for (const program of epgData.epg_info) {
                    const startTime = new Date(program.start_timestamp * 1000).getTime();
                    const endTime = new Date(program.stop_timestamp * 1000).getTime();
                    
                    if (now >= startTime && now <= endTime) {
                        return {
                            ...program,
                            progress: this.calculateProgress(startTime, endTime, now)
                        };
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error getting current program:', error);
            return null;
        }
    }

    // Get next program for a channel
    async getNextProgram(channelId) {
        try {
            const epgData = await this.getChannelEPG(channelId, 1);
            const now = Date.now();

            if (epgData && epgData.epg_info) {
                // Find next program
                const futurePrograms = epgData.epg_info
                    .filter(program => new Date(program.start_timestamp * 1000).getTime() > now)
                    .sort((a, b) => a.start_timestamp - b.start_timestamp);
                
                return futurePrograms.length > 0 ? futurePrograms[0] : null;
            }
            
            return null;
        } catch (error) {
            console.error('Error getting next program:', error);
            return null;
        }
    }

    // Get EPG timeline for multiple channels
    async getEPGTimeline(channelIds, hours = 6) {
        const timeline = {};
        const promises = channelIds.map(async (channelId) => {
            try {
                const epgData = await this.getChannelEPG(channelId, 1);
                timeline[channelId] = this.filterProgramsByTime(epgData, hours);
            } catch (error) {
                console.error(`Error getting EPG for channel ${channelId}:`, error);
                timeline[channelId] = [];
            }
        });

        await Promise.all(promises);
        return timeline;
    }

    // Filter programs by time window
    filterProgramsByTime(epgData, hours) {
        if (!epgData || !epgData.epg_info) return [];

        const now = Date.now();
        const endTime = now + (hours * 60 * 60 * 1000);

        return epgData.epg_info.filter(program => {
            const programStart = new Date(program.start_timestamp * 1000).getTime();
            const programEnd = new Date(program.stop_timestamp * 1000).getTime();
            
            // Include programs that overlap with our time window
            return (programStart < endTime && programEnd > now);
        }).map(program => ({
            ...program,
            progress: this.calculateProgress(
                new Date(program.start_timestamp * 1000).getTime(),
                new Date(program.stop_timestamp * 1000).getTime(),
                now
            )
        }));
    }

    // Calculate program progress (0-100)
    calculateProgress(startTime, endTime, currentTime) {
        if (currentTime < startTime) return 0;
        if (currentTime > endTime) return 100;
        
        const duration = endTime - startTime;
        const elapsed = currentTime - startTime;
        
        return Math.round((elapsed / duration) * 100);
    }

    // Format time for display
    formatTime(timestamp) {
        const date = new Date(timestamp * 1000);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Format date for display
    formatDate(timestamp) {
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString();
    }

    // Format duration
    formatDuration(startTimestamp, endTimestamp) {
        const duration = (endTimestamp - startTimestamp) * 1000; // Convert to milliseconds
        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }

    // Search programs by title or description
    async searchPrograms(query, channelIds = null, days = 1) {
        const results = [];
        const lowercaseQuery = query.toLowerCase();
        
        try {
            if (channelIds) {
                // Search in specific channels
                for (const channelId of channelIds) {
                    const epgData = await this.getChannelEPG(channelId, days);
                    if (epgData && epgData.epg_info) {
                        const matches = epgData.epg_info.filter(program => 
                            program.name.toLowerCase().includes(lowercaseQuery) ||
                            (program.descr && program.descr.toLowerCase().includes(lowercaseQuery))
                        );
                        
                        matches.forEach(program => {
                            results.push({
                                ...program,
                                channelId: channelId
                            });
                        });
                    }
                }
            } else {
                // Search in all cached EPG data
                Object.keys(this.epgCache).forEach(cacheKey => {
                    const epgData = this.epgCache[cacheKey].data;
                    if (epgData && epgData.epg_info) {
                        const matches = epgData.epg_info.filter(program => 
                            program.name.toLowerCase().includes(lowercaseQuery) ||
                            (program.descr && program.descr.toLowerCase().includes(lowercaseQuery))
                        );
                        
                        matches.forEach(program => {
                            results.push({
                                ...program,
                                channelId: cacheKey.split('_')[0]
                            });
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Error searching programs:', error);
        }
        
        // Sort by start time
        return results.sort((a, b) => a.start_timestamp - b.start_timestamp);
    }

    // Get programs by genre
    async getProgramsByGenre(genre, channelIds = null, days = 1) {
        const results = [];
        const lowercaseGenre = genre.toLowerCase();
        
        try {
            if (channelIds) {
                for (const channelId of channelIds) {
                    const epgData = await this.getChannelEPG(channelId, days);
                    if (epgData && epgData.epg_info) {
                        const matches = epgData.epg_info.filter(program => 
                            program.category && program.category.toLowerCase().includes(lowercaseGenre)
                        );
                        
                        matches.forEach(program => {
                            results.push({
                                ...program,
                                channelId: channelId
                            });
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error getting programs by genre:', error);
        }
        
        return results.sort((a, b) => a.start_timestamp - b.start_timestamp);
    }

    // Clear all cached EPG data
    clearCache() {
        this.epgCache = {};
        localStorage.removeItem(this.storageKey);
    }

    // Get cache statistics
    getCacheStats() {
        const stats = {
            entries: Object.keys(this.epgCache).length,
            totalSize: JSON.stringify(this.epgCache).length,
            oldestEntry: null,
            newestEntry: null
        };

        const timestamps = Object.values(this.epgCache).map(entry => entry.timestamp);
        if (timestamps.length > 0) {
            stats.oldestEntry = Math.min(...timestamps);
            stats.newestEntry = Math.max(...timestamps);
        }

        return stats;
    }

    // Preload EPG for channels
    async preloadEPG(channelIds, days = 1) {
        const promises = channelIds.map(channelId => 
            this.getChannelEPG(channelId, days).catch(error => 
                console.error(`Failed to preload EPG for channel ${channelId}:`, error)
            )
        );
        
        await Promise.all(promises);
        this.clearOldCache();
    }
}

// Create global EPG manager instance
window.epgManager = new EPGManager();