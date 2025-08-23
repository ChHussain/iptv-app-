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
    
    // Initialize favorites and EPG
    if (window.favoritesManager) {
        window.favoritesManager.initialize?.();
    }
    if (window.epgManager) {
        window.epgManager.initialize?.();
    }

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
            const portalUrl = new URL(session.portalUrl);
            portalInfo.textContent = `Connected to: ${portalUrl.hostname}`;
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
                    await loadGenreFilter('channelGenreFilter', 'channels');
                    renderChannels(data, containerElement);
                    break;

                case 'movies':
                    data = await window.api.getMovies();
                    containerElement = document.getElementById('moviesList');
                    await loadGenreFilter('movieGenreFilter', 'movies');
                    renderMovies(data, containerElement);
                    break;

                case 'series':
                    data = await window.api.getSeries();
                    containerElement = document.getElementById('seriesList');
                    await loadGenreFilter('seriesGenreFilter', 'series');
                    renderSeries(data, containerElement);
                    break;

                case 'epg':
                    containerElement = document.getElementById('epgContainer');
                    await loadEPGGuide(containerElement);
                    break;

                case 'favorites':
                    containerElement = document.getElementById('favoritesContainer');
                    loadFavorites(containerElement);
                    break;

                case 'radio':
                    data = await window.api.getRadio?.() || await window.api.getChannels('radio');
                    containerElement = document.getElementById('radioList');
                    await loadGenreFilter('radioGenreFilter', 'radio');
                    renderRadio(data, containerElement);
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
                () => playChannel(channel),
                'channels',
                channel
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
                () => playMovie(movie),
                'movies',
                movie
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
                () => playSeries(series),
                'series',
                series
            );
            container.appendChild(seriesElement);
        });
    }

    function createContentItem(title, imageUrl, subtitle, clickHandler, contentType, contentData) {
        const item = document.createElement('div');
        item.className = 'content-item focusable';
        item.innerHTML = `
            <img src="${imageUrl}" alt="${title}" onerror="this.src='data:image/svg+xml,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"100\\" height=\\"100\\"><rect width=\\"100\\" height=\\"100\\" fill=\\"%23333\\"/><text x=\\"50\\" y=\\"50\\" text-anchor=\\"middle\\" fill=\\"white\\">📺</text></svg>'">
            <h4>${title}</h4>
            <p>${subtitle}</p>
            <div class="item-actions"></div>
        `;
        item.addEventListener('click', clickHandler);
        
        // Add favorite button if we have the required data
        if (contentType && contentData && window.favoritesManager) {
            window.favoritesManager.addFavoriteButton(item, contentType, contentData);
        }
        
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

    // Load genre filter options
    async function loadGenreFilter(filterId, contentType) {
        const filterSelect = document.getElementById(filterId);
        if (!filterSelect) return;

        try {
            let genres = [];
            switch (contentType) {
                case 'channels':
                    const channelGenres = await window.api.getChannelGenres();
                    genres = channelGenres.data || [];
                    break;
                case 'movies':
                    const movieGenres = await window.api.getMovieGenres();
                    genres = movieGenres.data || [];
                    break;
                case 'series':
                    const seriesGenres = await window.api.getSeriesGenres();
                    genres = seriesGenres.data || [];
                    break;
                case 'radio':
                    // Radio might use the same as channels or have its own
                    genres = []; // Add radio genres if API supports it
                    break;
            }

            // Clear existing options except "All Genres"
            filterSelect.innerHTML = '<option value="">All Genres</option>';

            // Add genre options
            genres.forEach(genre => {
                const option = document.createElement('option');
                option.value = genre.id || genre.name;
                option.textContent = genre.title || genre.name;
                filterSelect.appendChild(option);
            });

            // Add filter change listener
            filterSelect.addEventListener('change', () => {
                const selectedGenre = filterSelect.value;
                loadContentWithFilter(contentType, selectedGenre);
            });

        } catch (error) {
            console.error('Error loading genres:', error);
        }
    }

    // Load content with genre filter
    async function loadContentWithFilter(contentType, genre) {
        showLoading(true);
        try {
            let data;
            let containerElement;

            switch (contentType) {
                case 'channels':
                    data = await window.api.getChannels(genre);
                    containerElement = document.getElementById('channelsList');
                    renderChannels(data, containerElement);
                    break;
                case 'movies':
                    data = await window.api.getMovies(genre);
                    containerElement = document.getElementById('moviesList');
                    renderMovies(data, containerElement);
                    break;
                case 'series':
                    data = await window.api.getSeries(genre);
                    containerElement = document.getElementById('seriesList');
                    renderSeries(data, containerElement);
                    break;
                case 'radio':
                    data = await window.api.getRadio?.(genre) || await window.api.getChannels(genre);
                    containerElement = document.getElementById('radioList');
                    renderRadio(data, containerElement);
                    break;
            }
        } catch (error) {
            console.error('Error loading filtered content:', error);
            showError('Failed to load filtered content: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    // Load EPG Guide
    async function loadEPGGuide(container) {
        if (!window.epgManager) {
            container.innerHTML = '<p>EPG not available</p>';
            return;
        }

        try {
            // Get channels for EPG
            const channelsData = await window.api.getChannels();
            const channels = channelsData.data || [];

            if (channels.length === 0) {
                container.innerHTML = '<p>No channels available for EPG</p>';
                return;
            }

            // Initialize EPG and create timeline
            await window.epgManager.initialize();
            window.epgManager.createTimelineView(container, channels.slice(0, 20), 0, 12); // Show first 20 channels, 12 hours

        } catch (error) {
            console.error('Error loading EPG:', error);
            container.innerHTML = '<p>Failed to load EPG guide</p>';
        }
    }

    // Load Favorites
    function loadFavorites(container) {
        if (!window.favoritesManager) {
            container.innerHTML = '<p>Favorites not available</p>';
            return;
        }

        window.favoritesManager.createFavoritesView(container);
    }

    // Render Radio Stations
    function renderRadio(data, container) {
        container.innerHTML = '';

        if (!data || !data.data || data.data.length === 0) {
            container.innerHTML = '<p>No radio stations available</p>';
            return;
        }

        data.data.forEach(radio => {
            const radioElement = createContentItem(
                radio.name,
                radio.logo || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23333"/><text x="50" y="50" text-anchor="middle" fill="white">📻</text></svg>',
                radio.genre || 'Radio',
                () => playRadio(radio),
                'radio',
                radio
            );
            container.appendChild(radioElement);
        });
    }

    // Play Radio Station
    function playRadio(radio) {
        const params = new URLSearchParams({
            type: 'radio',
            id: radio.id,
            name: radio.name
        });
        window.location.href = `player.html?${params.toString()}`;
    }

    // Handle color button presses from remote
    document.addEventListener('colorbutton', function(e) {
        const color = e.detail.color;
        
        switch (color) {
            case 'red':
                // Red button - toggle favorite for focused item
                const focusedElement = window.remoteControl?.getFocusedElement();
                if (focusedElement && focusedElement.classList.contains('content-item')) {
                    const favoriteBtn = focusedElement.querySelector('.favorite-btn');
                    if (favoriteBtn) {
                        favoriteBtn.click();
                    }
                }
                break;
            case 'green':
                // Green button - show info or EPG for focused channel
                window.location.href = '#epg';
                switchSection('epg');
                loadContent('epg');
                break;
            case 'yellow':
                // Yellow button - settings (handled by remote control)
                break;
            case 'blue':
                // Blue button - favorites
                switchSection('favorites');
                loadContent('favorites');
                break;
        }
    });

    // Handle EPG refresh events
    document.addEventListener('epgRefresh', function(e) {
        const activeSection = document.querySelector('.content-section.active');
        if (activeSection && activeSection.id === 'epg') {
            loadEPGGuide(document.getElementById('epgContainer'));
        }
    });

    // Handle favorites changed events
    document.addEventListener('favoritesChanged', function(e) {
        // Update favorites tab if it's active
        const activeSection = document.querySelector('.content-section.active');
        if (activeSection && activeSection.id === 'favorites') {
            loadFavorites(document.getElementById('favoritesContainer'));
        }
    });
});