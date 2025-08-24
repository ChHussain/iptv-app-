// Player page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Protect the page - redirect to login if not authenticated
    if (!window.auth.protectPage()) {
        return;
    }

    // Initialize page elements
    const backBtn = document.getElementById('backBtn');
    const playerTitle = document.getElementById('playerTitle');
    const videoPlayer = document.getElementById('videoPlayer');
    const videoSource = document.getElementById('videoSource');
    const playerError = document.getElementById('playerError');
    const playerLoading = document.getElementById('playerLoading');
    const channelInfo = document.getElementById('channelInfo');

    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const contentType = urlParams.get('type');
    const contentId = urlParams.get('id');
    const contentName = urlParams.get('name');

    // Initialize webOS media player
    let useWebOSPlayer = false;
    if (window.webOSPlayer) {
        useWebOSPlayer = window.webOSPlayer.init();
        if (useWebOSPlayer) {
            console.log('Using webOS Media Player');
            setupWebOSPlayerEvents();
        } else {
            console.log('Falling back to HTML5 video player');
        }
    }

    // Initialize player
    initializePlayer();

    // Back button handler
    backBtn.addEventListener('click', function() {
        // Stop playback before leaving
        if (useWebOSPlayer && window.webOSPlayer) {
            window.webOSPlayer.stop();
        }
        window.location.href = 'home.html';
    });

    // Setup webOS player event handlers
    function setupWebOSPlayerEvents() {
        window.webOSPlayer.addEventListener('loadstart', function() {
            showLoading(true);
            hideError();
        });

        window.webOSPlayer.addEventListener('canplay', function() {
            showLoading(false);
            hideError();
        });

        window.webOSPlayer.addEventListener('loadeddata', function() {
            showLoading(false);
        });

        window.webOSPlayer.addEventListener('play', function() {
            showLoading(false);
            hideError();
        });

        window.webOSPlayer.addEventListener('pause', function() {
            console.log('Playback paused');
        });

        window.webOSPlayer.addEventListener('error', function(error) {
            console.error('webOS player error:', error);
            showLoading(false);
            showError('Failed to load video stream. The stream may be unavailable or not supported by webOS player.');
        });

        window.webOSPlayer.addEventListener('buffering', function() {
            showLoading(true);
        });

        window.webOSPlayer.addEventListener('ended', function() {
            console.log('Playback ended');
            showLoading(false);
        });
    }

    // Video player event handlers (for HTML5 fallback)
    videoPlayer.addEventListener('loadstart', function() {
        if (!useWebOSPlayer) {
            showLoading(true);
            hideError();
        }
    });

    videoPlayer.addEventListener('canplay', function() {
        if (!useWebOSPlayer) {
            showLoading(false);
            hideError();
        }
    });

    videoPlayer.addEventListener('error', function(e) {
        if (!useWebOSPlayer) {
            console.error('Video player error:', e);
            showLoading(false);
            showError('Failed to load video stream. The stream may be unavailable or your browser may not support this format.');
        }
    });

    videoPlayer.addEventListener('loadeddata', function() {
        if (!useWebOSPlayer) {
            showLoading(false);
        }
    });

    async function initializePlayer() {
        if (!contentType || !contentId || !contentName) {
            showError('Invalid content parameters');
            return;
        }

        playerTitle.textContent = contentName;
        showLoading(true);

        try {
            let streamData;

            switch (contentType) {
                case 'channel':
                    streamData = await window.api.getChannelLink(contentId);
                    break;

                case 'movie':
                    streamData = await window.api.getMovieLink(contentId);
                    break;

                case 'series':
                    // For series, we need season and episode info
                    // For now, we'll play the first episode
                    streamData = await window.api.getSeriesLink(contentId, 1, 1);
                    break;

                default:
                    throw new Error('Unknown content type: ' + contentType);
            }

            if (streamData && streamData.cmd) {
                loadStream(streamData.cmd);
                displayContentInfo(contentType, contentName, streamData);
            } else {
                throw new Error('No stream URL received from server');
            }

        } catch (error) {
            console.error('Error loading stream:', error);
            showError('Failed to load stream: ' + error.message);
        }
    }

    function loadStream(streamUrl) {
        try {
            if (useWebOSPlayer && window.webOSPlayer) {
                // Use webOS Media Player
                loadWithWebOSPlayer(streamUrl);
            } else {
                // Fallback to HTML5 video player
                loadWithHTML5Player(streamUrl);
            }
        } catch (error) {
            console.error('Error loading stream:', error);
            showError('Failed to load stream: ' + error.message);
        }
    }

    function loadWithWebOSPlayer(streamUrl) {
        console.log('Loading stream with webOS player:', streamUrl);
        
        // Determine media type based on URL
        let mediaType = 'AUTO';
        if (streamUrl.includes('.m3u8')) {
            mediaType = 'HLS';
        } else if (streamUrl.includes('.mpd')) {
            mediaType = 'DASH';
        } else if (streamUrl.includes('.mp4')) {
            mediaType = 'MP4';
        }

        window.webOSPlayer.prepareMedia(streamUrl, mediaType)
            .then(() => {
                console.log('Media prepared successfully');
                return window.webOSPlayer.play();
            })
            .catch(error => {
                console.error('webOS player error:', error);
                showError('Failed to play stream with webOS player. Trying HTML5 fallback...');
                
                // Fallback to HTML5
                useWebOSPlayer = false;
                loadWithHTML5Player(streamUrl);
            });
    }

    function loadWithHTML5Player(streamUrl) {
        console.log('Loading stream with HTML5 player:', streamUrl);
        
        // Handle different stream types
        if (streamUrl.includes('.m3u8')) {
            // HLS stream
            if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
                videoSource.src = streamUrl;
                videoSource.type = 'application/x-mpegURL';
                videoPlayer.load();
            } else {
                // Try to load with HLS.js if available
                loadWithHLS(streamUrl);
            }
        } else if (streamUrl.includes('.mpd')) {
            // DASH stream
            loadWithDash(streamUrl);
        } else {
            // Direct stream
            videoSource.src = streamUrl;
            videoSource.type = this.detectMimeType(streamUrl);
            videoPlayer.load();
        }
    }

    function detectMimeType(url) {
        if (url.includes('.m3u8')) return 'application/x-mpegURL';
        if (url.includes('.mpd')) return 'application/dash+xml';
        if (url.includes('.mp4')) return 'video/mp4';
        if (url.includes('.webm')) return 'video/webm';
        if (url.includes('.mkv')) return 'video/x-matroska';
        return 'video/mp4'; // Default
    }

    function loadWithHLS(streamUrl) {
        // Check if HLS.js is available (would need to be included separately)
        if (typeof Hls !== 'undefined') {
            if (Hls.isSupported()) {
                const hls = new Hls();
                hls.loadSource(streamUrl);
                hls.attachMedia(videoPlayer);
            } else {
                showError('HLS is not supported in this browser');
            }
        } else {
            // Fallback: try direct playback
            videoSource.src = streamUrl;
            videoSource.type = 'application/x-mpegURL';
            videoPlayer.load();
        }
    }

    function loadWithDash(streamUrl) {
        // Check if dash.js is available (would need to be included separately)
        if (typeof dashjs !== 'undefined') {
            const player = dashjs.MediaPlayer().create();
            player.initialize(videoPlayer, streamUrl, true);
        } else {
            showError('DASH playback is not supported');
        }
    }

    function displayContentInfo(type, name, streamData) {
        let infoHtml = `<h4>${name}</h4>`;
        
        switch (type) {
            case 'channel':
                infoHtml += `<p>Type: Live TV Channel</p>`;
                break;
            case 'movie':
                infoHtml += `<p>Type: Movie</p>`;
                break;
            case 'series':
                infoHtml += `<p>Type: TV Series</p>`;
                break;
        }

        if (streamData.epg_id) {
            infoHtml += `<p>EPG ID: ${streamData.epg_id}</p>`;
        }

        channelInfo.innerHTML = infoHtml;
    }

    function showLoading(show) {
        playerLoading.style.display = show ? 'block' : 'none';
    }

    function showError(message) {
        playerError.textContent = message;
        playerError.style.display = 'block';
    }

    function hideError() {
        playerError.style.display = 'none';
    }

    // Keyboard controls optimized for LG webOS TV remote
    document.addEventListener('keydown', function(e) {
        switch (e.key) {
            case ' ':
            case 'k':
            case 'Enter':
            case 'PlayPause': // LG remote play/pause key
                // Space, K, Enter, or PlayPause to pause/play
                e.preventDefault();
                if (useWebOSPlayer && window.webOSPlayer) {
                    if (window.webOSPlayer.isPlaying()) {
                        window.webOSPlayer.pause();
                    } else {
                        window.webOSPlayer.play();
                    }
                } else {
                    if (videoPlayer.paused) {
                        videoPlayer.play();
                    } else {
                        videoPlayer.pause();
                    }
                }
                break;

            case 'f':
            case 'F11':
                // F or F11 for fullscreen
                e.preventDefault();
                if (!useWebOSPlayer && videoPlayer.requestFullscreen) {
                    videoPlayer.requestFullscreen();
                }
                break;

            case 'm':
            case 'Mute':
                // M or Mute key to mute/unmute
                e.preventDefault();
                if (!useWebOSPlayer) {
                    videoPlayer.muted = !videoPlayer.muted;
                }
                break;

            case 'Escape':
            case 'Back':
            case 'GoBack':
                // Escape, Back or GoBack to return to home
                e.preventDefault();
                if (useWebOSPlayer && window.webOSPlayer) {
                    window.webOSPlayer.stop();
                }
                window.location.href = 'home.html';
                break;

            case 'ArrowLeft':
            case 'Rewind':
                // Left arrow or Rewind to seek backward
                e.preventDefault();
                if (useWebOSPlayer && window.webOSPlayer) {
                    // Seek backward 10 seconds (webOS handles this differently)
                    console.log('Seek backward requested');
                } else {
                    videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 10);
                }
                break;

            case 'ArrowRight':
            case 'FastForward':
                // Right arrow or FastForward to seek forward
                e.preventDefault();
                if (useWebOSPlayer && window.webOSPlayer) {
                    // Seek forward 10 seconds (webOS handles this differently)
                    console.log('Seek forward requested');
                } else {
                    videoPlayer.currentTime = Math.min(videoPlayer.duration, videoPlayer.currentTime + 10);
                }
                break;

            case 'ArrowUp':
            case 'VolumeUp':
            case 'ChannelUp':
                // Up arrow, VolumeUp or ChannelUp to increase volume
                e.preventDefault();
                if (useWebOSPlayer && window.webOSPlayer) {
                    // Volume control in webOS is typically handled by system
                    console.log('Volume up requested');
                } else {
                    videoPlayer.volume = Math.min(1, videoPlayer.volume + 0.1);
                }
                break;

            case 'ArrowDown':
            case 'VolumeDown':
            case 'ChannelDown':
                // Down arrow, VolumeDown or ChannelDown to decrease volume
                e.preventDefault();
                if (useWebOSPlayer && window.webOSPlayer) {
                    // Volume control in webOS is typically handled by system
                    console.log('Volume down requested');
                } else {
                    videoPlayer.volume = Math.max(0, videoPlayer.volume - 0.1);
                }
                break;

            case 'Home':
                // Home key to go to main menu
                e.preventDefault();
                if (useWebOSPlayer && window.webOSPlayer) {
                    window.webOSPlayer.stop();
                }
                window.location.href = 'home.html';
                break;

            case 'Menu':
            case 'ContextMenu':
                // Menu key to show options (placeholder for future implementation)
                e.preventDefault();
                console.log('Menu requested');
                break;

            case 'Red':
            case 'Green':
            case 'Yellow':
            case 'Blue':
                // Color keys for future functionality
                e.preventDefault();
                console.log(`${e.key} key pressed`);
                break;

            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
                // Number keys for channel selection (future feature)
                e.preventDefault();
                console.log(`Number ${e.key} pressed`);
                break;
        }
    });

    // Auto-save player settings
    videoPlayer.addEventListener('volumechange', function() {
        try {
            localStorage.setItem('iptv_player_volume', videoPlayer.volume);
            localStorage.setItem('iptv_player_muted', videoPlayer.muted);
        } catch (error) {
            console.error('Error saving player settings:', error);
        }
    });

    // Load saved player settings
    function loadPlayerSettings() {
        try {
            const savedVolume = localStorage.getItem('iptv_player_volume');
            const savedMuted = localStorage.getItem('iptv_player_muted');

            if (savedVolume !== null) {
                videoPlayer.volume = parseFloat(savedVolume);
            }

            if (savedMuted !== null) {
                videoPlayer.muted = savedMuted === 'true';
            }
        } catch (error) {
            console.error('Error loading player settings:', error);
        }
    }

    // Load settings when player is ready
    videoPlayer.addEventListener('loadedmetadata', loadPlayerSettings);
});