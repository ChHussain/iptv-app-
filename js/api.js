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

        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: this.getHeaders(),
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.js) {
                return data.js;
            } else {
                return data;
            }
        } catch (error) {
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

    // Test connection to portal and validate real data
    async testConnection() {
        try {
            console.log('Testing connection to IPTV portal...');
            
            // Test 1: Get profile information
            const profileResult = await this.getProfile();
            console.log('Profile test result:', profileResult);
            
            // Test 2: Try to get channel list to verify real content
            let channelsResult = null;
            try {
                channelsResult = await this.getChannels();
                console.log('Channels test result:', channelsResult);
            } catch (channelError) {
                console.warn('Channels test failed:', channelError);
            }
            
            // Test 3: Try to get movie list to verify content diversity
            let moviesResult = null;
            try {
                moviesResult = await this.getMovies();
                console.log('Movies test result:', moviesResult);
            } catch (movieError) {
                console.warn('Movies test failed:', movieError);
            }
            
            // Analyze results to determine if this is a real portal
            const analysis = this.analyzePortalResponse(profileResult, channelsResult, moviesResult);
            
            return { 
                success: true, 
                profile: profileResult,
                channels: channelsResult,
                movies: moviesResult,
                analysis: analysis
            };
        } catch (error) {
            console.error('Connection test failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Analyze portal responses to detect fake/demo content
    analyzePortalResponse(profile, channels, movies) {
        const analysis = {
            isReal: true,
            confidence: 100,
            issues: [],
            indicators: []
        };

        // Check profile for real vs demo indicators
        if (profile) {
            if (profile.name && (profile.name.toLowerCase().includes('demo') || profile.name.toLowerCase().includes('test'))) {
                analysis.issues.push('Profile contains demo/test indicators');
                analysis.confidence -= 20;
            }
            
            if (profile.tariff_plan && profile.tariff_plan.toLowerCase().includes('demo')) {
                analysis.issues.push('Tariff plan indicates demo account');
                analysis.confidence -= 15;
            }
            
            analysis.indicators.push('Profile data available');
        } else {
            analysis.issues.push('No profile data available');
            analysis.confidence -= 30;
        }

        // Check channels for real content
        if (channels && channels.data && Array.isArray(channels.data)) {
            if (channels.data.length === 0) {
                analysis.issues.push('No channels available');
                analysis.confidence -= 40;
            } else if (channels.data.length < 10) {
                analysis.issues.push('Very few channels available (possible demo)');
                analysis.confidence -= 20;
            } else {
                analysis.indicators.push(`${channels.data.length} channels available`);
            }
            
            // Check for demo channel names
            const demoNames = channels.data.filter(ch => 
                ch.name && (ch.name.toLowerCase().includes('demo') || ch.name.toLowerCase().includes('test'))
            );
            if (demoNames.length > 0) {
                analysis.issues.push('Demo/test channels detected');
                analysis.confidence -= 15;
            }
        } else {
            analysis.issues.push('No channel data available');
            analysis.confidence -= 25;
        }

        // Check movies for content diversity
        if (movies && movies.data && Array.isArray(movies.data)) {
            if (movies.data.length === 0) {
                analysis.issues.push('No movies available');
                analysis.confidence -= 20;
            } else {
                analysis.indicators.push(`${movies.data.length} movies available`);
            }
        }

        analysis.isReal = analysis.confidence > 50;
        
        if (analysis.confidence < 30) {
            analysis.issues.push('Portal appears to be demo/fake - very limited functionality');
        } else if (analysis.confidence < 60) {
            analysis.issues.push('Portal may be demo/limited - some functionality missing');
        }

        return analysis;
    }
}

// Create global API instance
window.api = new StalkerAPI();