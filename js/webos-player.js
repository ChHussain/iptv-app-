// webOS Media Player for IPTV
class WebOSMediaPlayer {
    constructor() {
        this.player = null;
        this.isWebOS = this.detectWebOS();
        this.isPlaying = false;
        this.currentStream = null;
        this.listeners = {};
    }

    // Detect if running on webOS
    detectWebOS() {
        return typeof webOS !== 'undefined' || 
               navigator.userAgent.includes('Web0S') ||
               window.PalmServiceBridge !== undefined;
    }

    // Initialize webOS media player
    async initialize() {
        if (!this.isWebOS) {
            console.log('Not running on webOS, falling back to HTML5 video');
            return this.initializeHTML5Player();
        }

        try {
            // Load webOS media service
            if (typeof webOS !== 'undefined' && webOS.media) {
                console.log('Initializing webOS media player');
                return this.initializeWebOSPlayer();
            } else {
                console.log('webOS media API not available, using fallback');
                return this.initializeHTML5Player();
            }
        } catch (error) {
            console.error('Error initializing webOS player:', error);
            return this.initializeHTML5Player();
        }
    }

    // Initialize webOS native media player
    initializeWebOSPlayer() {
        return new Promise((resolve, reject) => {
            try {
                // Create webOS media player instance
                this.player = webOS.media.createMediaPlayer({
                    mediaTransportType: 'URI',
                    option: {
                        mediaFormat: 'adaptive',
                        mediaStreamType: 'live'
                    }
                });

                // Set up event listeners
                this.player.on('loadCompleted', () => {
                    console.log('webOS player loaded');
                    this.emit('loadCompleted');
                });

                this.player.on('bufferingStart', () => {
                    console.log('webOS player buffering started');
                    this.emit('bufferingStart');
                });

                this.player.on('bufferingComplete', () => {
                    console.log('webOS player buffering completed');
                    this.emit('bufferingComplete');
                });

                this.player.on('playing', () => {
                    console.log('webOS player playing');
                    this.isPlaying = true;
                    this.emit('playing');
                });

                this.player.on('paused', () => {
                    console.log('webOS player paused');
                    this.isPlaying = false;
                    this.emit('paused');
                });

                this.player.on('error', (error) => {
                    console.error('webOS player error:', error);
                    this.emit('error', error);
                });

                this.player.on('ended', () => {
                    console.log('webOS player ended');
                    this.isPlaying = false;
                    this.emit('ended');
                });

                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    }

    // Initialize HTML5 fallback player
    initializeHTML5Player() {
        return new Promise((resolve) => {
            console.log('Initializing HTML5 video player');
            
            const video = document.getElementById('videoPlayer') || this.createVideoElement();
            this.player = video;

            // Set up HTML5 video event listeners
            video.addEventListener('loadstart', () => this.emit('loadCompleted'));
            video.addEventListener('waiting', () => this.emit('bufferingStart'));
            video.addEventListener('canplay', () => this.emit('bufferingComplete'));
            video.addEventListener('play', () => {
                this.isPlaying = true;
                this.emit('playing');
            });
            video.addEventListener('pause', () => {
                this.isPlaying = false;
                this.emit('paused');
            });
            video.addEventListener('error', (e) => this.emit('error', e));
            video.addEventListener('ended', () => {
                this.isPlaying = false;
                this.emit('ended');
            });

            resolve(true);
        });
    }

    // Create HTML5 video element if not exists
    createVideoElement() {
        const video = document.createElement('video');
        video.id = 'videoPlayer';
        video.controls = true;
        video.autoplay = true;
        video.style.width = '100%';
        video.style.height = '100%';
        
        const container = document.querySelector('.video-container') || document.body;
        container.appendChild(video);
        
        return video;
    }

    // Load and play stream
    async loadStream(streamUrl, mediaType = 'video') {
        if (!this.player) {
            throw new Error('Player not initialized');
        }

        this.currentStream = streamUrl;
        
        try {
            if (this.isWebOS && this.player.load) {
                // webOS player
                await this.player.load({
                    mediaSource: {
                        uri: streamUrl
                    },
                    mediaFormat: this.detectStreamFormat(streamUrl),
                    mediaStreamType: mediaType === 'live' ? 'live' : 'vod'
                });
            } else {
                // HTML5 player
                if (this.isHLSStream(streamUrl)) {
                    this.loadHLSStream(streamUrl);
                } else if (this.isDASHStream(streamUrl)) {
                    this.loadDASHStream(streamUrl);
                } else {
                    this.player.src = streamUrl;
                    this.player.load();
                }
            }
        } catch (error) {
            console.error('Error loading stream:', error);
            throw error;
        }
    }

    // Detect stream format
    detectStreamFormat(url) {
        if (url.includes('.m3u8')) return 'hls';
        if (url.includes('.mpd')) return 'dash';
        if (url.includes('.mp4')) return 'mp4';
        if (url.includes('.ts')) return 'ts';
        return 'adaptive'; // Let webOS detect
    }

    // Check if stream is HLS
    isHLSStream(url) {
        return url.includes('.m3u8') || url.includes('hls');
    }

    // Check if stream is DASH
    isDASHStream(url) {
        return url.includes('.mpd') || url.includes('dash');
    }

    // Load HLS stream for HTML5
    loadHLSStream(url) {
        if (typeof Hls !== 'undefined' && Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: false,
                backBufferLength: 90
            });
            hls.loadSource(url);
            hls.attachMedia(this.player);
        } else if (this.player.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari native HLS support
            this.player.src = url;
            this.player.load();
        } else {
            throw new Error('HLS not supported');
        }
    }

    // Load DASH stream for HTML5
    loadDASHStream(url) {
        if (typeof dashjs !== 'undefined') {
            const player = dashjs.MediaPlayer().create();
            player.initialize(this.player, url, true);
        } else {
            throw new Error('DASH not supported');
        }
    }

    // Play stream
    async play() {
        if (!this.player) {
            throw new Error('Player not initialized');
        }

        try {
            if (this.isWebOS && this.player.play) {
                await this.player.play();
            } else {
                await this.player.play();
            }
        } catch (error) {
            console.error('Play error:', error);
            throw error;
        }
    }

    // Pause stream
    async pause() {
        if (!this.player) {
            throw new Error('Player not initialized');
        }

        try {
            if (this.isWebOS && this.player.pause) {
                await this.player.pause();
            } else {
                this.player.pause();
            }
        } catch (error) {
            console.error('Pause error:', error);
            throw error;
        }
    }

    // Stop stream
    async stop() {
        if (!this.player) return;

        try {
            if (this.isWebOS && this.player.stop) {
                await this.player.stop();
            } else {
                this.player.pause();
                this.player.currentTime = 0;
            }
            this.isPlaying = false;
        } catch (error) {
            console.error('Stop error:', error);
            throw error;
        }
    }

    // Set volume
    setVolume(volume) {
        if (!this.player) return;

        try {
            if (this.isWebOS && this.player.setVolume) {
                this.player.setVolume(volume);
            } else {
                this.player.volume = volume;
            }
        } catch (error) {
            console.error('Set volume error:', error);
        }
    }

    // Get current time
    getCurrentTime() {
        if (!this.player) return 0;

        try {
            if (this.isWebOS && this.player.getCurrentTime) {
                return this.player.getCurrentTime();
            } else {
                return this.player.currentTime;
            }
        } catch (error) {
            console.error('Get current time error:', error);
            return 0;
        }
    }

    // Seek to position
    async seek(time) {
        if (!this.player) return;

        try {
            if (this.isWebOS && this.player.seek) {
                await this.player.seek(time);
            } else {
                this.player.currentTime = time;
            }
        } catch (error) {
            console.error('Seek error:', error);
            throw error;
        }
    }

    // Event listener management
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Event listener error:', error);
                }
            });
        }
    }

    // Cleanup
    destroy() {
        if (this.player) {
            if (this.isWebOS && this.player.destroy) {
                this.player.destroy();
            }
            this.player = null;
        }
        this.listeners = {};
        this.isPlaying = false;
        this.currentStream = null;
    }
}

// Create global media player instance
window.webOSPlayer = new WebOSMediaPlayer();