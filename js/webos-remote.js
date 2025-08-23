// webOS Remote Control Handler
class WebOSRemoteControl {
    constructor() {
        this.isWebOS = this.detectWebOS();
        this.focusedElement = null;
        this.focusableElements = [];
        this.keyHandlers = {};
        this.init();
    }

    // Detect if running on webOS
    detectWebOS() {
        return typeof webOS !== 'undefined' || 
               navigator.userAgent.includes('Web0S') ||
               window.PalmServiceBridge !== undefined;
    }

    // Initialize remote control
    init() {
        this.setupKeyListeners();
        this.refreshFocusableElements();
        
        // Auto-refresh focusable elements when DOM changes
        if (typeof MutationObserver !== 'undefined') {
            const observer = new MutationObserver(() => {
                this.refreshFocusableElements();
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    // Setup keyboard event listeners
    setupKeyListeners() {
        document.addEventListener('keydown', (e) => {
            this.handleKeyPress(e);
        });

        // Prevent default behavior for TV remote keys
        document.addEventListener('keypress', (e) => {
            if (this.isTVKey(e.keyCode)) {
                e.preventDefault();
            }
        });
    }

    // Check if key is a TV remote key
    isTVKey(keyCode) {
        const tvKeys = [
            37, 38, 39, 40, // Arrow keys
            13, 8,          // Enter, Back
            403, 404, 405, 406, 407, 408, 409, 410, 411, 412, // webOS specific
            27, 36, 35, 33, 34, // Esc, Home, End, PageUp, PageDown
            174, 175, 176, 177, 178, 179 // Media keys
        ];
        return tvKeys.includes(keyCode);
    }

    // Handle key press events
    handleKeyPress(e) {
        e.preventDefault();
        
        const keyCode = e.keyCode;
        const keyName = this.getKeyName(keyCode);
        
        console.log(`Key pressed: ${keyName} (${keyCode})`);

        // Check for custom key handlers first
        if (this.keyHandlers[keyCode]) {
            this.keyHandlers[keyCode](e);
            return;
        }

        // Default navigation handling
        switch (keyCode) {
            case 37: // Left arrow
                this.navigateLeft();
                break;
            case 38: // Up arrow
                this.navigateUp();
                break;
            case 39: // Right arrow
                this.navigateRight();
                break;
            case 40: // Down arrow
                this.navigateDown();
                break;
            case 13: // Enter
                this.selectCurrentElement();
                break;
            case 8: // Back button
            case 27: // Escape
                this.goBack();
                break;
            case 403: // Red button
                this.handleColorButton('red');
                break;
            case 404: // Green button
                this.handleColorButton('green');
                break;
            case 405: // Yellow button
                this.handleColorButton('yellow');
                break;
            case 406: // Blue button
                this.handleColorButton('blue');
                break;
            case 174: // Volume down
                this.adjustVolume(-5);
                break;
            case 175: // Volume up
                this.adjustVolume(5);
                break;
            case 179: // Play/Pause
                this.togglePlayPause();
                break;
            case 177: // Stop
                this.stopPlayback();
                break;
            default:
                console.log(`Unhandled key: ${keyName} (${keyCode})`);
        }
    }

    // Get human-readable key name
    getKeyName(keyCode) {
        const keyNames = {
            37: 'Left', 38: 'Up', 39: 'Right', 40: 'Down',
            13: 'Enter', 8: 'Back', 27: 'Escape',
            403: 'Red', 404: 'Green', 405: 'Yellow', 406: 'Blue',
            174: 'VolumeDown', 175: 'VolumeUp',
            179: 'PlayPause', 177: 'Stop', 176: 'Next', 178: 'Previous'
        };
        return keyNames[keyCode] || `Key${keyCode}`;
    }

    // Refresh list of focusable elements
    refreshFocusableElements() {
        const selectors = [
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
            '.content-item',
            '.nav-btn',
            '.focusable'
        ];

        this.focusableElements = Array.from(document.querySelectorAll(selectors.join(',')))
            .filter(el => {
                return el.offsetParent !== null && // Element is visible
                       !el.hasAttribute('disabled') &&
                       getComputedStyle(el).display !== 'none' &&
                       getComputedStyle(el).visibility !== 'hidden';
            });

        // Set initial focus if no element is focused
        if (!this.focusedElement && this.focusableElements.length > 0) {
            this.setFocus(this.focusableElements[0]);
        }
    }

    // Set focus on element
    setFocus(element) {
        if (this.focusedElement) {
            this.focusedElement.classList.remove('tv-focused');
        }

        this.focusedElement = element;
        if (element) {
            element.classList.add('tv-focused');
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Trigger focus event
            element.dispatchEvent(new Event('tvfocus'));
        }
    }

    // Navigate left
    navigateLeft() {
        if (!this.focusedElement) return;

        const currentRect = this.focusedElement.getBoundingClientRect();
        let bestElement = null;
        let bestDistance = Infinity;

        this.focusableElements.forEach(el => {
            if (el === this.focusedElement) return;

            const rect = el.getBoundingClientRect();
            
            // Element should be to the left
            if (rect.right <= currentRect.left) {
                const distance = this.calculateDistance(currentRect, rect);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestElement = el;
                }
            }
        });

        if (bestElement) {
            this.setFocus(bestElement);
        }
    }

    // Navigate right
    navigateRight() {
        if (!this.focusedElement) return;

        const currentRect = this.focusedElement.getBoundingClientRect();
        let bestElement = null;
        let bestDistance = Infinity;

        this.focusableElements.forEach(el => {
            if (el === this.focusedElement) return;

            const rect = el.getBoundingClientRect();
            
            // Element should be to the right
            if (rect.left >= currentRect.right) {
                const distance = this.calculateDistance(currentRect, rect);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestElement = el;
                }
            }
        });

        if (bestElement) {
            this.setFocus(bestElement);
        }
    }

    // Navigate up
    navigateUp() {
        if (!this.focusedElement) return;

        const currentRect = this.focusedElement.getBoundingClientRect();
        let bestElement = null;
        let bestDistance = Infinity;

        this.focusableElements.forEach(el => {
            if (el === this.focusedElement) return;

            const rect = el.getBoundingClientRect();
            
            // Element should be above
            if (rect.bottom <= currentRect.top) {
                const distance = this.calculateDistance(currentRect, rect);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestElement = el;
                }
            }
        });

        if (bestElement) {
            this.setFocus(bestElement);
        }
    }

    // Navigate down
    navigateDown() {
        if (!this.focusedElement) return;

        const currentRect = this.focusedElement.getBoundingClientRect();
        let bestElement = null;
        let bestDistance = Infinity;

        this.focusableElements.forEach(el => {
            if (el === this.focusedElement) return;

            const rect = el.getBoundingClientRect();
            
            // Element should be below
            if (rect.top >= currentRect.bottom) {
                const distance = this.calculateDistance(currentRect, rect);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestElement = el;
                }
            }
        });

        if (bestElement) {
            this.setFocus(bestElement);
        }
    }

    // Calculate distance between two rectangles
    calculateDistance(rect1, rect2) {
        const centerX1 = rect1.left + rect1.width / 2;
        const centerY1 = rect1.top + rect1.height / 2;
        const centerX2 = rect2.left + rect2.width / 2;
        const centerY2 = rect2.top + rect2.height / 2;

        return Math.sqrt(Math.pow(centerX2 - centerX1, 2) + Math.pow(centerY2 - centerY1, 2));
    }

    // Select current element
    selectCurrentElement() {
        if (this.focusedElement) {
            // Trigger click event
            this.focusedElement.click();
        }
    }

    // Go back
    goBack() {
        // Check if we're in player page
        if (window.location.pathname.includes('player.html')) {
            window.location.href = 'home.html';
        } else if (window.location.pathname.includes('settings.html')) {
            window.location.href = 'home.html';
        } else if (window.location.pathname.includes('home.html')) {
            // Show exit confirmation
            this.showExitConfirmation();
        } else {
            window.history.back();
        }
    }

    // Show exit confirmation
    showExitConfirmation() {
        if (confirm('Exit application?')) {
            if (this.isWebOS && window.close) {
                window.close();
            } else {
                // Logout and go to login page
                if (window.auth) {
                    window.auth.logout();
                }
            }
        }
    }

    // Handle color button presses
    handleColorButton(color) {
        console.log(`${color} button pressed`);
        
        // Emit custom event for color buttons
        document.dispatchEvent(new CustomEvent('colorbutton', { 
            detail: { color: color } 
        }));

        // Default color button actions
        switch (color) {
            case 'red':
                // Red could be used for favorites
                this.toggleFavorite();
                break;
            case 'green':
                // Green could be used for info
                this.showInfo();
                break;
            case 'yellow':
                // Yellow could be used for settings
                if (window.location.pathname.includes('home.html')) {
                    window.location.href = 'settings.html';
                }
                break;
            case 'blue':
                // Blue could be used for search or menu
                this.showMenu();
                break;
        }
    }

    // Toggle favorite for current content
    toggleFavorite() {
        // Implementation would depend on current page
        console.log('Toggle favorite');
    }

    // Show content info
    showInfo() {
        console.log('Show info');
    }

    // Show menu
    showMenu() {
        console.log('Show menu');
    }

    // Adjust volume
    adjustVolume(delta) {
        if (window.webOSPlayer && window.webOSPlayer.player) {
            const currentVolume = window.webOSPlayer.player.volume || 0.8;
            const newVolume = Math.max(0, Math.min(1, currentVolume + delta / 100));
            window.webOSPlayer.setVolume(newVolume);
            
            // Show volume indicator
            this.showVolumeIndicator(newVolume);
        }
    }

    // Show volume indicator
    showVolumeIndicator(volume) {
        const percentage = Math.round(volume * 100);
        
        // Remove existing indicator
        const existing = document.getElementById('volume-indicator');
        if (existing) {
            existing.remove();
        }

        // Create volume indicator
        const indicator = document.createElement('div');
        indicator.id = 'volume-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 10000;
            font-size: 18px;
        `;
        indicator.textContent = `Volume: ${percentage}%`;
        document.body.appendChild(indicator);

        // Auto-hide after 2 seconds
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.remove();
            }
        }, 2000);
    }

    // Toggle play/pause
    togglePlayPause() {
        if (window.webOSPlayer) {
            if (window.webOSPlayer.isPlaying) {
                window.webOSPlayer.pause();
            } else {
                window.webOSPlayer.play();
            }
        }
    }

    // Stop playback
    stopPlayback() {
        if (window.webOSPlayer) {
            window.webOSPlayer.stop();
        }
    }

    // Register custom key handler
    registerKeyHandler(keyCode, handler) {
        this.keyHandlers[keyCode] = handler;
    }

    // Unregister custom key handler
    unregisterKeyHandler(keyCode) {
        delete this.keyHandlers[keyCode];
    }

    // Focus specific element by selector
    focusElement(selector) {
        const element = document.querySelector(selector);
        if (element && this.focusableElements.includes(element)) {
            this.setFocus(element);
        }
    }

    // Get currently focused element
    getFocusedElement() {
        return this.focusedElement;
    }
}

// Create global remote control instance
window.remoteControl = new WebOSRemoteControl();

// Add CSS for focused elements
const style = document.createElement('style');
style.textContent = `
    .tv-focused {
        outline: 3px solid #007bff !important;
        outline-offset: 2px !important;
        background-color: rgba(0, 123, 255, 0.1) !important;
        transform: scale(1.05) !important;
        transition: all 0.2s ease !important;
        z-index: 1000 !important;
        position: relative !important;
    }
    
    .content-item.tv-focused {
        box-shadow: 0 0 20px rgba(0, 123, 255, 0.5) !important;
    }
`;
document.head.appendChild(style);