// Favorites Management System
class FavoritesManager {
    constructor() {
        this.storageKey = 'iptv_favorites';
        this.favorites = this.loadFavorites();
    }

    // Load favorites from localStorage
    loadFavorites() {
        try {
            const favorites = localStorage.getItem(this.storageKey);
            return favorites ? JSON.parse(favorites) : {
                channels: [],
                movies: [],
                series: []
            };
        } catch (error) {
            console.error('Error loading favorites:', error);
            return {
                channels: [],
                movies: [],
                series: []
            };
        }
    }

    // Save favorites to localStorage
    saveFavorites() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.favorites));
        } catch (error) {
            console.error('Error saving favorites:', error);
        }
    }

    // Add item to favorites
    addToFavorites(type, item) {
        if (!this.favorites[type]) {
            this.favorites[type] = [];
        }

        // Check if already in favorites
        const exists = this.favorites[type].some(fav => fav.id === item.id);
        if (exists) {
            return false; // Already in favorites
        }

        // Add to favorites with timestamp
        const favoriteItem = {
            ...item,
            addedAt: Date.now()
        };

        this.favorites[type].push(favoriteItem);
        this.saveFavorites();

        // Emit event
        this.emitFavoritesChanged('added', type, favoriteItem);
        return true;
    }

    // Remove item from favorites
    removeFromFavorites(type, itemId) {
        if (!this.favorites[type]) {
            return false;
        }

        const index = this.favorites[type].findIndex(fav => fav.id === itemId);
        if (index === -1) {
            return false; // Not in favorites
        }

        const removedItem = this.favorites[type].splice(index, 1)[0];
        this.saveFavorites();

        // Emit event
        this.emitFavoritesChanged('removed', type, removedItem);
        return true;
    }

    // Check if item is in favorites
    isFavorite(type, itemId) {
        if (!this.favorites[type]) {
            return false;
        }
        return this.favorites[type].some(fav => fav.id === itemId);
    }

    // Toggle favorite status
    toggleFavorite(type, item) {
        if (this.isFavorite(type, item.id)) {
            return this.removeFromFavorites(type, item.id);
        } else {
            return this.addToFavorites(type, item);
        }
    }

    // Get favorites by type
    getFavorites(type) {
        return this.favorites[type] || [];
    }

    // Get all favorites
    getAllFavorites() {
        return this.favorites;
    }

    // Get favorites count by type
    getFavoritesCount(type) {
        return (this.favorites[type] || []).length;
    }

    // Get total favorites count
    getTotalFavoritesCount() {
        return Object.values(this.favorites).reduce((total, items) => total + items.length, 0);
    }

    // Clear all favorites
    clearAllFavorites() {
        this.favorites = {
            channels: [],
            movies: [],
            series: []
        };
        this.saveFavorites();
        this.emitFavoritesChanged('cleared');
    }

    // Clear favorites by type
    clearFavoritesByType(type) {
        if (this.favorites[type]) {
            this.favorites[type] = [];
            this.saveFavorites();
            this.emitFavoritesChanged('cleared', type);
        }
    }

    // Search favorites
    searchFavorites(query, type = null) {
        const normalizedQuery = query.toLowerCase();
        const results = {};

        const typesToSearch = type ? [type] : Object.keys(this.favorites);

        typesToSearch.forEach(searchType => {
            if (this.favorites[searchType]) {
                results[searchType] = this.favorites[searchType].filter(item =>
                    item.name.toLowerCase().includes(normalizedQuery) ||
                    (item.description && item.description.toLowerCase().includes(normalizedQuery))
                );
            }
        });

        return results;
    }

    // Sort favorites
    sortFavorites(type, sortBy = 'name', ascending = true) {
        if (!this.favorites[type]) {
            return [];
        }

        return [...this.favorites[type]].sort((a, b) => {
            let valueA, valueB;

            switch (sortBy) {
                case 'name':
                    valueA = a.name.toLowerCase();
                    valueB = b.name.toLowerCase();
                    break;
                case 'addedAt':
                    valueA = a.addedAt;
                    valueB = b.addedAt;
                    break;
                case 'year':
                    valueA = a.year || 0;
                    valueB = b.year || 0;
                    break;
                default:
                    valueA = a[sortBy];
                    valueB = b[sortBy];
            }

            if (valueA < valueB) return ascending ? -1 : 1;
            if (valueA > valueB) return ascending ? 1 : -1;
            return 0;
        });
    }

    // Create favorites UI
    createFavoritesView(container) {
        container.innerHTML = '';
        container.className = 'favorites-container';

        // Create tabs for different types
        const tabs = this.createFavoritesTabs();
        container.appendChild(tabs);

        // Create content area
        const content = document.createElement('div');
        content.className = 'favorites-content';
        container.appendChild(content);

        // Show channels by default
        this.showFavoritesType('channels', content);
    }

    // Create favorites tabs
    createFavoritesTabs() {
        const tabs = document.createElement('div');
        tabs.className = 'favorites-tabs';

        const tabTypes = [
            { key: 'channels', label: '📺 Channels', icon: '📺' },
            { key: 'movies', label: '🎬 Movies', icon: '🎬' },
            { key: 'series', label: '📺 Series', icon: '📺' }
        ];

        tabTypes.forEach((tab, index) => {
            const tabButton = document.createElement('button');
            tabButton.className = `favorites-tab focusable ${index === 0 ? 'active' : ''}`;
            tabButton.dataset.type = tab.key;
            tabButton.innerHTML = `
                ${tab.icon} ${tab.label}
                <span class="count">(${this.getFavoritesCount(tab.key)})</span>
            `;

            tabButton.addEventListener('click', () => {
                // Update active tab
                tabs.querySelectorAll('.favorites-tab').forEach(t => t.classList.remove('active'));
                tabButton.classList.add('active');

                // Show content for this type
                const content = document.querySelector('.favorites-content');
                this.showFavoritesType(tab.key, content);
            });

            tabs.appendChild(tabButton);
        });

        return tabs;
    }

    // Show favorites for specific type
    showFavoritesType(type, container) {
        container.innerHTML = '';

        const favorites = this.getFavorites(type);

        if (favorites.length === 0) {
            container.innerHTML = `
                <div class="no-favorites">
                    <h3>No ${type} in favorites</h3>
                    <p>Add items to favorites by pressing the Red button or using the favorite icon.</p>
                </div>
            `;
            return;
        }

        // Create controls
        const controls = this.createFavoritesControls(type);
        container.appendChild(controls);

        // Create grid
        const grid = document.createElement('div');
        grid.className = 'favorites-grid';

        favorites.forEach(item => {
            const itemElement = this.createFavoriteItem(type, item);
            grid.appendChild(itemElement);
        });

        container.appendChild(grid);
    }

    // Create favorites controls
    createFavoritesControls(type) {
        const controls = document.createElement('div');
        controls.className = 'favorites-controls';

        controls.innerHTML = `
            <div class="favorites-sort">
                <label>Sort by:</label>
                <select class="sort-select focusable">
                    <option value="name">Name</option>
                    <option value="addedAt">Date Added</option>
                    ${type !== 'channels' ? '<option value="year">Year</option>' : ''}
                </select>
                <button class="sort-order-btn focusable" data-ascending="true">↑</button>
            </div>
            <div class="favorites-actions">
                <button class="clear-favorites-btn focusable">Clear All</button>
            </div>
        `;

        // Add event listeners
        const sortSelect = controls.querySelector('.sort-select');
        const sortOrderBtn = controls.querySelector('.sort-order-btn');
        const clearBtn = controls.querySelector('.clear-favorites-btn');

        const updateSort = () => {
            const sortBy = sortSelect.value;
            const ascending = sortOrderBtn.dataset.ascending === 'true';
            const sorted = this.sortFavorites(type, sortBy, ascending);
            
            // Re-render grid
            const grid = document.querySelector('.favorites-grid');
            grid.innerHTML = '';
            sorted.forEach(item => {
                const itemElement = this.createFavoriteItem(type, item);
                grid.appendChild(itemElement);
            });
        };

        sortSelect.addEventListener('change', updateSort);
        
        sortOrderBtn.addEventListener('click', () => {
            const ascending = sortOrderBtn.dataset.ascending === 'true';
            sortOrderBtn.dataset.ascending = !ascending;
            sortOrderBtn.textContent = ascending ? '↓' : '↑';
            updateSort();
        });

        clearBtn.addEventListener('click', () => {
            if (confirm(`Clear all ${type} from favorites?`)) {
                this.clearFavoritesByType(type);
                this.showFavoritesType(type, document.querySelector('.favorites-content'));
                // Update tab count
                const tab = document.querySelector(`[data-type="${type}"] .count`);
                if (tab) tab.textContent = '(0)';
            }
        });

        return controls;
    }

    // Create favorite item element
    createFavoriteItem(type, item) {
        const element = document.createElement('div');
        element.className = 'favorite-item focusable';
        element.dataset.type = type;
        element.dataset.id = item.id;

        const imageUrl = item.logo || item.screenshot_uri || 
            `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23333"/><text x="50" y="50" text-anchor="middle" fill="white">${type === 'channels' ? '📺' : type === 'movies' ? '🎬' : '📺'}</text></svg>`;

        element.innerHTML = `
            <img src="${imageUrl}" alt="${item.name}" class="item-image" onerror="this.src='data:image/svg+xml,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"100\\" height=\\"100\\"><rect width=\\"100\\" height=\\"100\\" fill=\\"%23333\\"/><text x=\\"50\\" y=\\"50\\" text-anchor=\\"middle\\" fill=\\"white\\">📺</text></svg>'">
            <div class="item-info">
                <h4 class="item-title">${item.name}</h4>
                ${item.year ? `<p class="item-year">Year: ${item.year}</p>` : ''}
                ${item.number ? `<p class="item-number">Channel ${item.number}</p>` : ''}
                <p class="item-added">Added: ${new Date(item.addedAt).toLocaleDateString()}</p>
            </div>
            <div class="item-actions">
                <button class="btn-play focusable" title="Play">▶</button>
                <button class="btn-remove focusable" title="Remove from favorites">❤️</button>
            </div>
        `;

        // Add event listeners
        const playBtn = element.querySelector('.btn-play');
        const removeBtn = element.querySelector('.btn-remove');

        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.playFavoriteItem(type, item);
        });

        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeFromFavorites(type, item.id);
            element.remove();
            // Update tab count
            const tab = document.querySelector(`[data-type="${type}"] .count`);
            if (tab) tab.textContent = `(${this.getFavoritesCount(type)})`;
        });

        // Play on click
        element.addEventListener('click', () => {
            this.playFavoriteItem(type, item);
        });

        return element;
    }

    // Play favorite item
    playFavoriteItem(type, item) {
        const params = new URLSearchParams({
            type: type === 'channels' ? 'channel' : type.slice(0, -1), // Remove 's' from movies/series
            id: item.id,
            name: item.name
        });
        window.location.href = `player.html?${params.toString()}`;
    }

    // Add favorite button to content items
    addFavoriteButton(element, type, item) {
        // Check if button already exists
        if (element.querySelector('.favorite-btn')) {
            return;
        }

        const favoriteBtn = document.createElement('button');
        favoriteBtn.className = 'favorite-btn';
        favoriteBtn.innerHTML = this.isFavorite(type, item.id) ? '❤️' : '🤍';
        favoriteBtn.title = this.isFavorite(type, item.id) ? 'Remove from favorites' : 'Add to favorites';

        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const wasAdded = this.toggleFavorite(type, item);
            favoriteBtn.innerHTML = this.isFavorite(type, item.id) ? '❤️' : '🤍';
            favoriteBtn.title = this.isFavorite(type, item.id) ? 'Remove from favorites' : 'Add to favorites';
            
            // Show feedback
            this.showFavoritesFeedback(wasAdded ? 'Added to favorites' : 'Removed from favorites');
        });

        // Add to element
        const actionsDiv = element.querySelector('.item-actions') || element;
        actionsDiv.appendChild(favoriteBtn);
    }

    // Show favorites feedback
    showFavoritesFeedback(message) {
        // Remove existing feedback
        const existing = document.getElementById('favorites-feedback');
        if (existing) {
            existing.remove();
        }

        // Create feedback element
        const feedback = document.createElement('div');
        feedback.id = 'favorites-feedback';
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            z-index: 10000;
            font-size: 16px;
            animation: fadeInOut 2s ease-in-out;
        `;
        feedback.textContent = message;

        document.body.appendChild(feedback);

        // Auto-remove after 2 seconds
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.remove();
            }
        }, 2000);
    }

    // Emit favorites changed event
    emitFavoritesChanged(action, type, item) {
        const event = new CustomEvent('favoritesChanged', {
            detail: { action, type, item, favorites: this.favorites }
        });
        document.dispatchEvent(event);
    }
}

// Create global favorites manager instance
window.favoritesManager = new FavoritesManager();

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        20%, 80% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    }
`;
document.head.appendChild(style);