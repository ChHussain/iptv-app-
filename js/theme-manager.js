// Theme Manager for IPTV App
class ThemeManager {
    constructor() {
        this.currentTheme = 'dark';
        this.loadTheme();
        this.applyTheme();
    }

    // Load theme from localStorage
    loadTheme() {
        try {
            const saved = localStorage.getItem('iptv_theme');
            if (saved) {
                this.currentTheme = saved;
            }
        } catch (error) {
            console.error('Error loading theme:', error);
        }
    }

    // Save theme to localStorage
    saveTheme() {
        try {
            localStorage.setItem('iptv_theme', this.currentTheme);
        } catch (error) {
            console.error('Error saving theme:', error);
        }
    }

    // Apply theme
    applyTheme() {
        document.body.setAttribute('data-theme', this.currentTheme);
        
        // Update theme color meta tag for better integration
        let themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (!themeColorMeta) {
            themeColorMeta = document.createElement('meta');
            themeColorMeta.name = 'theme-color';
            document.head.appendChild(themeColorMeta);
        }
        
        themeColorMeta.content = this.currentTheme === 'dark' ? '#1e3c72' : '#ffffff';
    }

    // Set theme
    setTheme(theme) {
        if (theme === 'dark' || theme === 'light') {
            this.currentTheme = theme;
            this.saveTheme();
            this.applyTheme();
            
            // Log theme change
            if (window.diagnostics) {
                window.diagnostics.log('info', `Theme changed to ${theme}`);
            }
        }
    }

    // Get current theme
    getCurrentTheme() {
        return this.currentTheme;
    }

    // Toggle theme
    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
        return newTheme;
    }
}

// Create global theme manager instance
window.themeManager = new ThemeManager();