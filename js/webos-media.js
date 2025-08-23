// LG webOS 6.0.0 Media Player Integration
class WebOSMediaPlayer {
    constructor() {
        this.player = null;
        this.isWebOS = this.detectWebOS();
        this.currentMedia = null;
        this.eventListeners = {};
        this.mediaState = 'idle';
    }

    // Detect if running on webOS
    detectWebOS() {
        return typeof window.webOS !== 'undefined' || 
               navigator.userAgent.includes('webOS') ||
               navigator.userAgent.includes('Web0S');
    }

    // Initialize webOS media player
    init() {
        if (!this.isWebOS) {
            console.warn('Not running on webOS, falling back to HTML5 video');
            return false;
        }

        try {
            // Initialize webOS media service
            if (window.webOS && window.webOS.media) {
                this.player = window.webOS.media;
                console.log('webOS Media Player initialized');
                return true;
            } else if (window.AVPlay) {
                // Fallback to AVPlay for older webOS versions
                this.player = window.AVPlay;
                this.setupAVPlay();
                console.log('AVPlay initialized');
                return true;
            }
        } catch (error) {
            console.error('Failed to initialize webOS media player:', error);
        }
        return false;
    }

    // Setup AVPlay callbacks
    setupAVPlay() {
        if (!window.AVPlay) return;

        const self = this;
        
        AVPlay.setListener({
            onbufferingstart: function() {
                self.mediaState = 'buffering';
                self.emit('buffering');
            },
            onbufferingprogress: function(percent) {
                self.emit('bufferingProgress', percent);
            },
            onbufferingcomplete: function() {
                self.mediaState = 'playing';
                self.emit('canplay');
            },
            oncurrentplaytime: function(currentTime) {
                self.emit('timeupdate', currentTime);
            },
            onerror: function(eventType) {
                self.mediaState = 'error';
                self.emit('error', eventType);
            },
            onevent: function(eventType, eventData) {
                self.handleAVPlayEvent(eventType, eventData);
            },
            onstreamcompleted: function() {
                self.mediaState = 'ended';
                self.emit('ended');
            }
        });
    }

    // Handle AVPlay events
    handleAVPlayEvent(eventType, eventData) {
        switch (eventType) {
            case 'STATE_CHANGED':
                this.handleStateChange(eventData);
                break;
            case 'STREAM_INFO_READY':
                this.emit('loadedmetadata', eventData);
                break;
            default:
                console.log('AVPlay event:', eventType, eventData);
        }
    }

    // Handle state changes
    handleStateChange(state) {
        switch (state) {
            case 'READY':
                this.mediaState = 'ready';
                this.emit('loadeddata');
                break;
            case 'PLAYING':
                this.mediaState = 'playing';
                this.emit('play');
                break;
            case 'PAUSED':
                this.mediaState = 'paused';
                this.emit('pause');
                break;
            case 'STOPPED':
                this.mediaState = 'stopped';
                this.emit('stop');
                break;
        }
    }

    // Load and prepare media
    async prepareMedia(streamUrl, mediaType = 'AUTO') {
        if (!this.isWebOS || !this.player) {
            throw new Error('webOS media player not available');
        }

        this.currentMedia = {
            url: streamUrl,
            type: mediaType
        };

        try {
            if (window.webOS && window.webOS.media) {
                // Use modern webOS media API
                await this.prepareWithWebOSMedia(streamUrl, mediaType);
            } else if (window.AVPlay) {
                // Use AVPlay
                this.prepareWithAVPlay(streamUrl, mediaType);
            }
        } catch (error) {
            console.error('Failed to prepare media:', error);
            throw error;
        }
    }

    // Prepare media with webOS Media API
    async prepareWithWebOSMedia(streamUrl, mediaType) {
        const mediaObject = {
            uri: streamUrl,
            type: mediaType
        };

        return new Promise((resolve, reject) => {
            this.player.load(mediaObject, {
                onSuccess: () => {
                    this.mediaState = 'ready';
                    this.emit('loadeddata');
                    resolve();
                },
                onFailure: (error) => {
                    this.mediaState = 'error';
                    this.emit('error', error);
                    reject(error);
                }
            });
        });
    }

    // Prepare media with AVPlay
    prepareWithAVPlay(streamUrl, mediaType) {
        try {
            AVPlay.stop();
            AVPlay.close();
            
            // Open the stream
            AVPlay.open(streamUrl);
            
            // Prepare for playback
            AVPlay.prepare();
            
            this.mediaState = 'preparing';
            this.emit('loadstart');
            
        } catch (error) {
            console.error('AVPlay prepare error:', error);
            this.emit('error', error);
            throw error;
        }
    }

    // Play media
    play() {
        if (!this.isWebOS || !this.player) {
            throw new Error('webOS media player not available');
        }

        try {
            if (window.webOS && window.webOS.media) {
                this.player.play({
                    onSuccess: () => {
                        this.mediaState = 'playing';
                        this.emit('play');
                    },
                    onFailure: (error) => {
                        this.emit('error', error);
                    }
                });
            } else if (window.AVPlay) {
                AVPlay.play();
            }
        } catch (error) {
            console.error('Play error:', error);
            this.emit('error', error);
        }
    }

    // Pause media
    pause() {
        if (!this.isWebOS || !this.player) {
            throw new Error('webOS media player not available');
        }

        try {
            if (window.webOS && window.webOS.media) {
                this.player.pause({
                    onSuccess: () => {
                        this.mediaState = 'paused';
                        this.emit('pause');
                    }
                });
            } else if (window.AVPlay) {
                AVPlay.pause();
            }
        } catch (error) {
            console.error('Pause error:', error);
            this.emit('error', error);
        }
    }

    // Stop media
    stop() {
        if (!this.isWebOS || !this.player) {
            return;
        }

        try {
            if (window.webOS && window.webOS.media) {
                this.player.stop({
                    onSuccess: () => {
                        this.mediaState = 'stopped';
                        this.emit('stop');
                    }
                });
            } else if (window.AVPlay) {
                AVPlay.stop();
                AVPlay.close();
            }
        } catch (error) {
            console.error('Stop error:', error);
        }
    }



    // Check if media is playing
    isPlaying() {
        return this.mediaState === 'playing';
    }



    // Add event listener
    addEventListener(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    // Remove event listener
    removeEventListener(event, callback) {
        if (this.eventListeners[event]) {
            const index = this.eventListeners[event].indexOf(callback);
            if (index > -1) {
                this.eventListeners[event].splice(index, 1);
            }
        }
    }

    // Emit event
    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Event listener error:', error);
                }
            });
        }
    }

    // Clean up
    destroy() {
        this.stop();
        this.eventListeners = {};
        this.currentMedia = null;
        this.player = null;
    }
}

// Create global webOS media player instance
window.webOSPlayer = new WebOSMediaPlayer();