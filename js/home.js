// Home page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Protect the page - redirect to login if not authenticated
    if (!window.auth.protectPage()) {
        return;
    }

    // Initialize page elements
    const portalInfo = document.getElementById('portalInfo');
    const settingsBtn = document.getElementById('settingsBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const navBtns = document.querySelectorAll('.nav-btn');
    const contentSections = document.querySelectorAll('.content-section');
    const loadingContent = document.getElementById('loadingContent');
    const errorContent = document.getElementById('errorContent');

    // Initialize page
    initializePage();
    loadContent('channels');

    // Navigation button handlers
    navBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const section = this.dataset.section;
            switchSection(section);
            loadContent(section);
        });
    });

    // Settings button handler
    settingsBtn.addEventListener('click', function() {
        window.location.href = 'settings.html';
    });

    // Logout button handler
    logoutBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to logout?')) {
            window.auth.logout();
        }
    });

    function initializePage() {
        const session = window.auth.getSession();
        if (session) {
            // Display portal info
            const portalUrl = new URL(session.portalUrl);
            portalInfo.textContent = `Connected to: ${portalUrl.hostname}`;
            
            // Display MAC address info
            const macInfo = document.getElementById('macInfo');
            if (macInfo) {
                macInfo.textContent = `MAC: ${session.macAddress}`;
            }
            
            // Display device indicator
            const deviceIndicator = document.getElementById('deviceIndicator');
            if (deviceIndicator && session.deviceInfo) {
                deviceIndicator.textContent = `${session.deviceInfo.platform.toUpperCase()} Device`;
                
                // Add warning if MAC seems suspicious
                if (window.deviceManager && window.deviceManager.isMACAddressSuspicious(session.macAddress)) {
                    deviceIndicator.textContent += ' (Virtual)';
                    deviceIndicator.style.color = '#ffc107';
                }
            }
        }
    }

    function switchSection(sectionName) {
        // Update navigation buttons
        navBtns.forEach(btn => {
            if (btn.dataset.section === sectionName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Show corresponding content section
        contentSections.forEach(section => {
            if (section.id === sectionName) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });
    }

    async function loadContent(section) {
        showLoading(true);
        hideError();

        try {
            let data;
            let containerElement;

            switch (section) {
                case 'channels':
                    data = await window.api.getChannels();
                    containerElement = document.getElementById('channelsList');
                    renderChannels(data, containerElement);
                    break;

                case 'movies':
                    data = await window.api.getMovies();
                    containerElement = document.getElementById('moviesList');
                    renderMovies(data, containerElement);
                    break;

                case 'series':
                    data = await window.api.getSeries();
                    containerElement = document.getElementById('seriesList');
                    renderSeries(data, containerElement);
                    break;

                default:
                    throw new Error('Unknown section: ' + section);
            }

        } catch (error) {
            console.error('Error loading content:', error);
            showError('Failed to load content: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    function renderChannels(data, container) {
        container.innerHTML = '';

        if (!data || !data.data || data.data.length === 0) {
            container.innerHTML = '<p>No channels available</p>';
            return;
        }

        data.data.forEach(channel => {
            const channelElement = createContentItem(
                channel.name,
                channel.logo || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23333"/><text x="50" y="50" text-anchor="middle" fill="white">TV</text></svg>',
                channel.number ? `Channel ${channel.number}` : '',
                () => playChannel(channel)
            );
            container.appendChild(channelElement);
        });
    }

    function renderMovies(data, container) {
        container.innerHTML = '';

        if (!data || !data.data || data.data.length === 0) {
            container.innerHTML = '<p>No movies available</p>';
            return;
        }

        data.data.forEach(movie => {
            const movieElement = createContentItem(
                movie.name,
                movie.screenshot_uri || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23333"/><text x="50" y="50" text-anchor="middle" fill="white">🎬</text></svg>',
                movie.year ? `Year: ${movie.year}` : '',
                () => playMovie(movie)
            );
            container.appendChild(movieElement);
        });
    }

    function renderSeries(data, container) {
        container.innerHTML = '';

        if (!data || !data.data || data.data.length === 0) {
            container.innerHTML = '<p>No series available</p>';
            return;
        }

        data.data.forEach(series => {
            const seriesElement = createContentItem(
                series.name,
                series.screenshot_uri || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23333"/><text x="50" y="50" text-anchor="middle" fill="white">📺</text></svg>',
                series.year ? `Year: ${series.year}` : '',
                () => playSeries(series)
            );
            container.appendChild(seriesElement);
        });
    }

    function createContentItem(title, imageUrl, subtitle, clickHandler) {
        const item = document.createElement('div');
        item.className = 'content-item';
        item.innerHTML = `
            <img src="${imageUrl}" alt="${title}" onerror="this.src='data:image/svg+xml,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"100\\" height=\\"100\\"><rect width=\\"100\\" height=\\"100\\" fill=\\"%23333\\"/><text x=\\"50\\" y=\\"50\\" text-anchor=\\"middle\\" fill=\\"white\\">📺</text></svg>'">
            <h4>${title}</h4>
            <p>${subtitle}</p>
        `;
        item.addEventListener('click', clickHandler);
        return item;
    }

    function playChannel(channel) {
        const params = new URLSearchParams({
            type: 'channel',
            id: channel.id,
            name: channel.name
        });
        window.location.href = `player.html?${params.toString()}`;
    }

    function playMovie(movie) {
        const params = new URLSearchParams({
            type: 'movie',
            id: movie.id,
            name: movie.name
        });
        window.location.href = `player.html?${params.toString()}`;
    }

    function playSeries(series) {
        const params = new URLSearchParams({
            type: 'series',
            id: series.id,
            name: series.name
        });
        window.location.href = `player.html?${params.toString()}`;
    }

    function showLoading(show) {
        loadingContent.style.display = show ? 'block' : 'none';
    }

    function showError(message) {
        errorContent.textContent = message;
        errorContent.style.display = 'block';
    }

    function hideError() {
        errorContent.style.display = 'none';
    }
});