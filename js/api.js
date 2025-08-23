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

    // Make API request
    async apiRequest(endpoint, params = {}) {
        const session = this.auth.getSession();
        if (!session) {
            throw new Error('No active session');
        }

        // Build URL with parameters
        const url = new URL(session.portalUrl + endpoint);
        Object.keys(params).forEach(key => {
            url.searchParams.append(key, params[key]);
        });

        const startTime = performance.now();
        const headers = this.getHeaders();

        try {
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
            const duration = Math.round(performance.now() - startTime);
            
            // Track failed API request for diagnostics
            if (window.diagnostics) {
                window.diagnostics.trackApiRequest(
                    url.toString(),
                    'GET',
                    headers,
                    params,
                    null,
                    error.message,
                    duration
                );
            }
            
            console.error('API request error:', error);
            if (error.message.includes('401') || error.message.includes('403')) {
                // Token expired, logout user
                this.auth.logout();
            }
            throw error;
        }
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