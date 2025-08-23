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

    // Keyboard controls
    document.addEventListener('keydown', function(e) {
        switch (e.key) {
            case ' ':
            case 'k':
                // Space or K to pause/play
                e.preventDefault();
                if (videoPlayer.paused) {
                    videoPlayer.play();
                } else {
                    videoPlayer.pause();
                }
                break;

            case 'f':
                // F for fullscreen
                e.preventDefault();
                if (videoPlayer.requestFullscreen) {
                    videoPlayer.requestFullscreen();
                }
                break;

            case 'm':
                // M to mute/unmute
                e.preventDefault();
                videoPlayer.muted = !videoPlayer.muted;
                break;

            case 'Escape':
                // Escape to go back
                e.preventDefault();
                window.location.href = 'home.html';
                break;

            case 'ArrowLeft':
                // Left arrow to seek backward
                e.preventDefault();
                videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 10);
                break;

            case 'ArrowRight':
                // Right arrow to seek forward
                e.preventDefault();
                videoPlayer.currentTime = Math.min(videoPlayer.duration, videoPlayer.currentTime + 10);
                break;

            case 'ArrowUp':
                // Up arrow to increase volume
                e.preventDefault();
                videoPlayer.volume = Math.min(1, videoPlayer.volume + 0.1);
                break;

            case 'ArrowDown':
                // Down arrow to decrease volume
                e.preventDefault();
                videoPlayer.volume = Math.max(0, videoPlayer.volume - 0.1);
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