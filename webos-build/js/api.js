// API module for Stalker portal communication
class StalkerAPI {
    constructor() {
        this.auth = window.auth;
    }

    // Get API headers for authenticated requests
    getHeaders() {
        const session = this.auth.getSession();
        if (!session) {
            throw new Error('No active session');
        }

        return {
            'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
            'X-User-Agent': 'Model: MAG250; Link: WiFi',
            'Authorization': `Bearer ${session.token}`,
            'Cookie': `mac=${session.macAddress}; stb_lang=en; timezone=Europe/Kiev;`
        };
    }

    // Make API request - enhanced for different portal structures
    async apiRequest(endpoint, params = {}) {
        const session = this.auth.getSession();
        if (!session) {
            throw new Error('No active session');
        }

        // Try different endpoint patterns based on portal structure
        const endpointPatterns = [
            // Standard Stalker v1 API
            `stalker_portal/api/v1/${endpoint}`,
            // Alternative API structures
            `stalker_portal/api/${endpoint}`,
            `api/v1/${endpoint}`,
            `api/${endpoint}`,
            // Direct endpoint (for non-standard portals)
            endpoint,
            // PHP-based endpoints
            `server/load.php?type=stb&action=${endpoint}`,
            `portal.php?type=${endpoint}`
        ];

        let lastError;
        for (const endpointPattern of endpointPatterns) {
            try {
                const url = new URL(session.portalUrl + endpointPattern);
                Object.keys(params).forEach(key => {
                    url.searchParams.append(key, params[key]);
                });

                const startTime = performance.now();
                const headers = this.getHeaders();

                const response = await fetch(url.toString(), {
                    method: 'GET',
                    headers: headers,
                    mode: 'cors'
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                const duration = Math.round(performance.now() - startTime);
                
                // Track API request for diagnostics
                if (window.diagnostics) {
                    window.diagnostics.trackApiRequest(
                        url.toString(),
                        'GET',
                        headers,
                        params,
                        data,
                        null,
                        duration
                    );
                }
                
                if (data.js) {
                    return data.js;
                } else {
                    return data;
                }
            } catch (error) {
                lastError = error;
                console.log(`API endpoint pattern failed: ${endpointPattern} - ${error.message}`);
                continue;
            }
        }

        // If all patterns failed, track the error and throw
        if (window.diagnostics) {
            window.diagnostics.trackApiRequest(
                session.portalUrl + endpoint,
                'GET',
                this.getHeaders(),
                params,
                null,
                lastError,
                0
            );
        }
        
        throw new Error(`All API endpoint patterns failed for ${endpoint}: ${lastError.message}`);
    }

    // Get profile information
    async getProfile() {
        return await this.apiRequest('profile');
    }

    // Get live TV channels
    async getChannels(genre = null, page = 1, pageSize = 14) {
        const params = {
            type: 'itv',
            action: 'get_ordered_list',
            p: page,
            JsHttpRequest: `1-xml`
        };

        if (genre) {
            params.genre = genre;
        }

        return await this.apiRequest('itv', params);
    }

    // Get channel genres
    async getChannelGenres() {
        return await this.apiRequest('itv', {
            type: 'itv',
            action: 'get_genres',
            JsHttpRequest: `1-xml`
        });
    }

    // Get movies
    async getMovies(genre = null, page = 1, pageSize = 14) {
        const params = {
            type: 'vod',
            action: 'get_ordered_list',
            p: page,
            JsHttpRequest: `1-xml`
        };

        if (genre) {
            params.category = genre;
        }

        return await this.apiRequest('vod', params);
    }

    // Get movie genres
    async getMovieGenres() {
        return await this.apiRequest('vod', {
            type: 'vod',
            action: 'get_categories',
            JsHttpRequest: `1-xml`
        });
    }

    // Get TV series
    async getSeries(genre = null, page = 1, pageSize = 14) {
        const params = {
            type: 'series',
            action: 'get_ordered_list',
            p: page,
            JsHttpRequest: `1-xml`
        };

        if (genre) {
            params.category = genre;
        }

        return await this.apiRequest('series', params);
    }

    // Get series genres
    async getSeriesGenres() {
        return await this.apiRequest('series', {
            type: 'series',
            action: 'get_categories',
            JsHttpRequest: `1-xml`
        });
    }

    // Get stream link for channel
    async getChannelLink(channelId) {
        return await this.apiRequest('itv', {
            type: 'itv',
            action: 'create_link',
            cmd: channelId,
            series: '',
            forced_storage: 'undefined',
            disable_ad: '0',
            download: '0',
            JsHttpRequest: `1-xml`
        });
    }

    // Get stream link for movie
    async getMovieLink(movieId) {
        return await this.apiRequest('vod', {
            type: 'vod',
            action: 'create_link',
            cmd: movieId,
            series: '',
            forced_storage: 'undefined',
            disable_ad: '0',
            download: '0',
            JsHttpRequest: `1-xml`
        });
    }

    // Get stream link for series episode
    async getSeriesLink(seriesId, season, episode) {
        return await this.apiRequest('series', {
            type: 'series',
            action: 'create_link',
            cmd: seriesId,
            series: `${season}:${episode}`,
            forced_storage: 'undefined',
            disable_ad: '0',
            download: '0',
            JsHttpRequest: `1-xml`
        });
    }

    // Get series seasons and episodes
    async getSeriesInfo(seriesId) {
        return await this.apiRequest('series', {
            type: 'series',
            action: 'get_info',
            movie_id: seriesId,
            JsHttpRequest: `1-xml`
        });
    }

    // Test connection to portal
    async testConnection() {
        try {
            const profile = await this.getProfile();
            return { success: true, profile };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Create global API instance
window.api = new StalkerAPI();