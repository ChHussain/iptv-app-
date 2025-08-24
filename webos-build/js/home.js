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
            if (section) {
                switchSection(section);
                loadContent(section);
            }
        });
    });

    // EPG button handler
    const epgBtn = document.getElementById('epgBtn');
    epgBtn.addEventListener('click', function() {
        window.location.href = 'epg.html';
    });

    // Favorites tab handlers
    const favTabBtns = document.querySelectorAll('.fav-tab-btn');
    favTabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active tab
            favTabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Load favorites for selected type
            const favType = this.dataset.favType;
            loadFavorites(favType);
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

                case 'favorites':
                    // Load all favorites initially
                    loadFavorites('all');
                    return; // Don't show loading for favorites

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
            const isFavorite = window.favoritesManager.isFavorite('channels', channel.id);
            const channelElement = createContentItem(
                channel.name,
                channel.logo || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23333"/><text x="50" y="50" text-anchor="middle" fill="white">TV</text></svg>',
                channel.number ? `Channel ${channel.number}` : '',
                () => playChannel(channel),
                isFavorite,
                { ...channel, type: 'channels' }
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
            const isFavorite = window.favoritesManager.isFavorite('movies', movie.id);
            const movieElement = createContentItem(
                movie.name,
                movie.screenshot_uri || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23333"/><text x="50" y="50" text-anchor="middle" fill="white">🎬</text></svg>',
                movie.year ? `Year: ${movie.year}` : '',
                () => playMovie(movie),
                isFavorite,
                { ...movie, type: 'movies' }
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
            const isFavorite = window.favoritesManager.isFavorite('series', series.id);
            const seriesElement = createContentItem(
                series.name,
                series.screenshot_uri || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23333"/><text x="50" y="50" text-anchor="middle" fill="white">📺</text></svg>',
                series.year ? `Year: ${series.year}` : '',
                () => playSeries(series),
                isFavorite,
                { ...series, type: 'series' }
            );
            container.appendChild(seriesElement);
        });
    }

    function createContentItem(title, imageUrl, subtitle, clickHandler, isFavorite = false, item = null) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'content-item';
        
        // Add favorite button if item data is provided
        const favoriteBtn = item ? createFavoriteButton(item, isFavorite) : '';
        
        itemDiv.innerHTML = `
            <img src="${imageUrl}" alt="${title}" onerror="this.src='data:image/svg+xml,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"100\\" height=\\"100\\"><rect width=\\"100\\" height=\\"100\\" fill=\\"%23333\\"/><text x=\\"50\\" y=\\"50\\" text-anchor=\\"middle\\" fill=\\"white\\">📺</text></svg>'">
            <h4>${title}</h4>
            <p>${subtitle}</p>
            ${favoriteBtn}
        `;
        
        itemDiv.addEventListener('click', function(e) {
            // Don't trigger play if clicking on favorite button
            if (e.target.classList.contains('favorite-btn')) {
                return;
            }
            clickHandler();
        });
        
        return itemDiv;
    }

    function createFavoriteButton(item, isFavorite) {
        const buttonClass = isFavorite ? 'favorite-btn favorited' : 'favorite-btn';
        const buttonText = isFavorite ? '⭐' : '☆';
        
        return `<button class="${buttonClass}" onclick="toggleFavorite(event, this, '${item.type || 'channel'}', ${JSON.stringify(item).replace(/"/g, '&quot;')})">${buttonText}</button>`;
    }

    // Make toggleFavorite available globally
    window.toggleFavorite = function(event, button, type, itemData) {
        event.stopPropagation();
        
        const item = typeof itemData === 'string' ? JSON.parse(itemData) : itemData;
        const isCurrentlyFavorite = button.classList.contains('favorited');
        
        if (window.favoritesManager.toggleFavorite(type, item)) {
            // Toggle button appearance
            if (isCurrentlyFavorite) {
                button.classList.remove('favorited');
                button.textContent = '☆';
            } else {
                button.classList.add('favorited');
                button.textContent = '⭐';
            }
            
            // Refresh favorites view if currently viewing favorites
            const activeSection = document.querySelector('.content-section.active');
            if (activeSection && activeSection.id === 'favorites') {
                const activeTab = document.querySelector('.fav-tab-btn.active');
                if (activeTab) {
                    loadFavorites(activeTab.dataset.favType);
                }
            }
        }
    };

    function loadFavorites(type = 'all') {
        const container = document.getElementById('favoritesList');
        
        try {
            let favorites = [];
            
            if (type === 'all') {
                favorites = window.favoritesManager.getAllFavorites();
            } else {
                favorites = window.favoritesManager.getFavorites(type);
            }
            
            if (favorites.length === 0) {
                container.innerHTML = `<p>No ${type === 'all' ? '' : type} favorites yet. Add some by clicking the star (☆) on any content!</p>`;
                return;
            }
            
            container.innerHTML = '';
            
            favorites.forEach(favorite => {
                const item = favorite.data;
                const itemElement = createContentItem(
                    item.name,
                    item.logo || item.screenshot_uri || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23333"/><text x="50" y="50" text-anchor="middle" fill="white">⭐</text></svg>',
                    `${favorite.type.charAt(0).toUpperCase() + favorite.type.slice(1)} • Added ${new Date(favorite.addedDate).toLocaleDateString()}`,
                    () => playFavoriteItem(favorite),
                    true,
                    { ...item, type: favorite.type }
                );
                container.appendChild(itemElement);
            });
            
        } catch (error) {
            console.error('Error loading favorites:', error);
            container.innerHTML = '<p>Error loading favorites.</p>';
        }
    }

    function playFavoriteItem(favorite) {
        const params = new URLSearchParams({
            type: favorite.type,
            id: favorite.id,
            name: favorite.data.name
        });
        window.location.href = `player.html?${params.toString()}`;
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