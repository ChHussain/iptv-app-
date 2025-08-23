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

    // Initialize player
    initializePlayer();
    
    // Initialize webOS media player
    if (window.webOSPlayer) {
        window.webOSPlayer.initialize().then(() => {
            console.log('webOS player initialized');
            setupPlayerEventListeners();
        }).catch(error => {
            console.error('Failed to initialize webOS player:', error);
            setupPlayerEventListeners(); // Fallback to HTML5
        });
    } else {
        setupPlayerEventListeners();
    }

    // Back button handler
    backBtn.addEventListener('click', function() {
        window.location.href = 'home.html';
    });

    // Video player event handlers
    videoPlayer.addEventListener('loadstart', function() {
        showLoading(true);
        hideError();
    });

    videoPlayer.addEventListener('canplay', function() {
        showLoading(false);
        hideError();
    });

    videoPlayer.addEventListener('error', function(e) {
        console.error('Video player error:', e);
        showLoading(false);
        showError('Failed to load video stream. The stream may be unavailable or your browser may not support this format.');
    });

    videoPlayer.addEventListener('loadeddata', function() {
        showLoading(false);
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

                case 'radio':
                    streamData = await window.api.getRadioLink(contentId);
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
        console.log('Loading stream:', streamUrl);
        hideError();
        showLoading(true);

        try {
            // Use webOS player if available
            if (window.webOSPlayer && window.webOSPlayer.player) {
                console.log('Using webOS media player');
                
                // Determine media type based on content type
                const mediaType = contentType === 'channel' || contentType === 'radio' ? 'live' : 'vod';
                
                window.webOSPlayer.loadStream(streamUrl, mediaType)
                    .then(() => {
                        console.log('Stream loaded successfully');
                        showLoading(false);
                        return window.webOSPlayer.play();
                    })
                    .catch(error => {
                        console.error('webOS player failed, falling back to HTML5:', error);
                        loadStreamHTML5(streamUrl);
                    });
            } else {
                console.log('Using HTML5 video player');
                loadStreamHTML5(streamUrl);
            }
        } catch (error) {
            console.error('Error setting up stream:', error);
            showError('Failed to setup video stream');
            showLoading(false);
        }
    }

    function loadStreamHTML5(streamUrl) {
        try {
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
                videoSource.type = 'video/mp4';
                videoPlayer.load();
            }
        } catch (error) {
            console.error('Error setting up stream:', error);
            showError('Failed to setup video stream');
        }
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
            case 'radio':
                infoHtml += `<p>Type: Radio Station</p>`;
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

    // Setup player event listeners for both webOS and HTML5
    function setupPlayerEventListeners() {
        if (window.webOSPlayer) {
            // webOS player events
            window.webOSPlayer.on('loadCompleted', () => {
                showLoading(false);
                hideError();
            });

            window.webOSPlayer.on('bufferingStart', () => {
                showLoading(true);
            });

            window.webOSPlayer.on('bufferingComplete', () => {
                showLoading(false);
            });

            window.webOSPlayer.on('playing', () => {
                showLoading(false);
                hideError();
            });

            window.webOSPlayer.on('error', (error) => {
                console.error('webOS player error:', error);
                showLoading(false);
                showError('Playback error: ' + (error.message || 'Unknown error'));
            });

            window.webOSPlayer.on('ended', () => {
                console.log('Playback ended');
                // Could navigate back or show replay options
            });
        }

        // HTML5 video events (fallback)
        if (videoPlayer) {
            videoPlayer.addEventListener('loadstart', () => {
                showLoading(true);
            });

            videoPlayer.addEventListener('canplay', () => {
                showLoading(false);
                hideError();
            });

            videoPlayer.addEventListener('error', (e) => {
                console.error('Video player error:', e);
                showLoading(false);
                showError('Failed to load video stream. The stream may be unavailable or your browser may not support this format.');
            });

            videoPlayer.addEventListener('loadeddata', () => {
                showLoading(false);
            });

            videoPlayer.addEventListener('waiting', () => {
                showLoading(true);
            });

            videoPlayer.addEventListener('playing', () => {
                showLoading(false);
            });
        }
    }

    // Keyboard controls
    document.addEventListener('keydown', function(e) {
        switch (e.key) {
            case ' ':
            case 'k':
                // Space or K to pause/play
                e.preventDefault();
                togglePlayPause();
                break;

            case 'f':
                // F for fullscreen
                e.preventDefault();
                if (videoPlayer && videoPlayer.requestFullscreen) {
                    videoPlayer.requestFullscreen();
                }
                break;

            case 'm':
                // M to mute/unmute
                e.preventDefault();
                toggleMute();
                break;

            case 'Escape':
                // Escape to go back
                e.preventDefault();
                window.location.href = 'home.html';
                break;

            case 'ArrowLeft':
                // Left arrow to seek backward
                e.preventDefault();
                seekBackward();
                break;

            case 'ArrowRight':
                // Right arrow to seek forward
                e.preventDefault();
                seekForward();
                break;

            case 'ArrowUp':
                // Up arrow to increase volume
                e.preventDefault();
                adjustVolume(0.1);
                break;

            case 'ArrowDown':
                // Down arrow to decrease volume
                e.preventDefault();
                adjustVolume(-0.1);
                break;
        }
    });

    // Enhanced player control functions
    function togglePlayPause() {
        if (window.webOSPlayer && window.webOSPlayer.player) {
            if (window.webOSPlayer.isPlaying) {
                window.webOSPlayer.pause();
            } else {
                window.webOSPlayer.play();
            }
        } else if (videoPlayer) {
            if (videoPlayer.paused) {
                videoPlayer.play();
            } else {
                videoPlayer.pause();
            }
        }
    }

    function toggleMute() {
        if (window.webOSPlayer && window.webOSPlayer.player) {
            // webOS mute handling
            const currentVolume = window.webOSPlayer.getCurrentVolume?.() || 0.8;
            window.webOSPlayer.setVolume(currentVolume > 0 ? 0 : 0.8);
        } else if (videoPlayer) {
            videoPlayer.muted = !videoPlayer.muted;
        }
    }

    function seekBackward() {
        if (window.webOSPlayer && window.webOSPlayer.player) {
            const currentTime = window.webOSPlayer.getCurrentTime();
            window.webOSPlayer.seek(Math.max(0, currentTime - 10));
        } else if (videoPlayer) {
            videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 10);
        }
    }

    function seekForward() {
        if (window.webOSPlayer && window.webOSPlayer.player) {
            const currentTime = window.webOSPlayer.getCurrentTime();
            window.webOSPlayer.seek(currentTime + 10);
        } else if (videoPlayer) {
            videoPlayer.currentTime = Math.min(videoPlayer.duration, videoPlayer.currentTime + 10);
        }
    }

    function adjustVolume(delta) {
        if (window.webOSPlayer && window.webOSPlayer.player) {
            const currentVolume = window.webOSPlayer.getCurrentVolume?.() || 0.8;
            const newVolume = Math.max(0, Math.min(1, currentVolume + delta));
            window.webOSPlayer.setVolume(newVolume);
        } else if (videoPlayer) {
            const newVolume = Math.max(0, Math.min(1, videoPlayer.volume + delta));
            videoPlayer.volume = newVolume;
        }
    }

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