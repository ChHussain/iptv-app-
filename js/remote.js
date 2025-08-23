// Smart TV Remote Control Support
class RemoteControl {
    constructor() {
        this.platform = window.deviceManager ? window.deviceManager.platform : 'browser';
        this.isRemoteEnabled = false;
        this.keyHandlers = new Map();
        this.currentFocus = null;
        this.focusableElements = [];
        
        this.initializeRemoteControl();
    }

    // Initialize remote control based on platform
    initializeRemoteControl() {
        console.log('Initializing remote control for platform:', this.platform);
        
        switch (this.platform) {
            case 'webos':
                this.initializeWebOSRemote();
                break;
            case 'tizen':
                this.initializeTizenRemote();
                break;
            case 'androidtv':
                this.initializeAndroidTVRemote();
                break;
            case 'mag':
                this.initializeMAGRemote();
                break;
            default:
                this.initializeGenericRemote();
        }
        
        this.setupFocusManagement();
        this.registerGlobalKeyHandlers();
    }

    // WebOS TV Remote Control
    initializeWebOSRemote() {
        try {
            if (typeof window.webOS !== 'undefined' && window.webOS.platformBack) {
                // Enable WebOS platform back button
                window.webOS.platformBack.registrate(this);
                this.isRemoteEnabled = true;
                console.log('WebOS remote control enabled');
            }
        } catch (error) {
            console.warn('WebOS remote initialization failed:', error);
            this.initializeGenericRemote();
        }
    }

    // Tizen TV Remote Control
    initializeTizenRemote() {
        try {
            if (typeof tizen !== 'undefined' && tizen.tvinputdevice) {
                // Register for Tizen TV remote events
                const supportedKeys = [
                    'ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue',
                    'MediaPlay', 'MediaPause', 'MediaStop', 'MediaFastForward', 'MediaRewind',
                    'VolumeUp', 'VolumeDown', 'VolumeMute'
                ];
                
                tizen.tvinputdevice.registerKeyBatch(supportedKeys);
                this.isRemoteEnabled = true;
                console.log('Tizen remote control enabled');
            }
        } catch (error) {
            console.warn('Tizen remote initialization failed:', error);
            this.initializeGenericRemote();
        }
    }

    // Android TV Remote Control
    initializeAndroidTVRemote() {
        try {
            // Android TV uses standard keyboard events, but we can enhance them
            this.isRemoteEnabled = true;
            console.log('Android TV remote control enabled');
        } catch (error) {
            console.warn('Android TV remote initialization failed:', error);
            this.initializeGenericRemote();
        }
    }

    // MAG STB Remote Control
    initializeMAGRemote() {
        try {
            if (typeof gSTB !== 'undefined') {
                // MAG STB specific remote control
                this.isRemoteEnabled = true;
                console.log('MAG STB remote control enabled');
            }
        } catch (error) {
            console.warn('MAG STB remote initialization failed:', error);
            this.initializeGenericRemote();
        }
    }

    // Generic Remote Control (keyboard events)
    initializeGenericRemote() {
        this.isRemoteEnabled = true;
        console.log('Generic remote control enabled (keyboard events)');
    }

    // Setup focus management for TV navigation
    setupFocusManagement() {
        this.updateFocusableElements();
        
        // Auto-update focusable elements when DOM changes
        const observer = new MutationObserver(() => {
            this.updateFocusableElements();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'disabled', 'hidden']
        });
    }

    // Update list of focusable elements
    updateFocusableElements() {
        const selectors = [
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
            '.nav-btn',
            '.content-item',
            '.focusable'
        ];
        
        this.focusableElements = Array.from(document.querySelectorAll(selectors.join(', ')))
            .filter(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden';
            });
        
        // Auto-focus first element if none is focused
        if (this.focusableElements.length > 0 && !this.currentFocus) {
            this.setFocus(this.focusableElements[0]);
        }
    }

    // Set focus to an element
    setFocus(element) {
        if (this.currentFocus) {
            this.currentFocus.classList.remove('tv-focused');
        }
        
        this.currentFocus = element;
        if (element) {
            element.classList.add('tv-focused');
            element.focus();
            
            // Scroll into view if needed
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center'
            });
        }
    }

    // Navigate to next focusable element
    navigateNext() {
        if (this.focusableElements.length === 0) return;
        
        const currentIndex = this.currentFocus ? 
            this.focusableElements.indexOf(this.currentFocus) : -1;
        const nextIndex = (currentIndex + 1) % this.focusableElements.length;
        
        this.setFocus(this.focusableElements[nextIndex]);
    }

    // Navigate to previous focusable element
    navigatePrevious() {
        if (this.focusableElements.length === 0) return;
        
        const currentIndex = this.currentFocus ? 
            this.focusableElements.indexOf(this.currentFocus) : 0;
        const prevIndex = currentIndex === 0 ? 
            this.focusableElements.length - 1 : currentIndex - 1;
        
        this.setFocus(this.focusableElements[prevIndex]);
    }

    // Navigate in 2D grid (for content grids)
    navigate2D(direction) {
        if (!this.currentFocus || this.focusableElements.length === 0) return;
        
        const currentRect = this.currentFocus.getBoundingClientRect();
        let bestElement = null;
        let bestDistance = Infinity;
        
        this.focusableElements.forEach(element => {
            if (element === this.currentFocus) return;
            
            const rect = element.getBoundingClientRect();
            let isValidDirection = false;
            let distance;
            
            switch (direction) {
                case 'up':
                    isValidDirection = rect.bottom <= currentRect.top;
                    distance = currentRect.top - rect.bottom + 
                              Math.abs(rect.left + rect.width/2 - currentRect.left - currentRect.width/2);
                    break;
                case 'down':
                    isValidDirection = rect.top >= currentRect.bottom;
                    distance = rect.top - currentRect.bottom + 
                              Math.abs(rect.left + rect.width/2 - currentRect.left - currentRect.width/2);
                    break;
                case 'left':
                    isValidDirection = rect.right <= currentRect.left;
                    distance = currentRect.left - rect.right + 
                              Math.abs(rect.top + rect.height/2 - currentRect.top - currentRect.height/2);
                    break;
                case 'right':
                    isValidDirection = rect.left >= currentRect.right;
                    distance = rect.left - currentRect.right + 
                              Math.abs(rect.top + rect.height/2 - currentRect.top - currentRect.height/2);
                    break;
            }
            
            if (isValidDirection && distance < bestDistance) {
                bestDistance = distance;
                bestElement = element;
            }
        });
        
        if (bestElement) {
            this.setFocus(bestElement);
        } else {
            // Fallback to linear navigation
            if (direction === 'down' || direction === 'right') {
                this.navigateNext();
            } else {
                this.navigatePrevious();
            }
        }
    }

    // Activate current focused element
    activateElement() {
        if (this.currentFocus) {
            // Trigger click event
            this.currentFocus.click();
            return true;
        }
        return false;
    }

    // Register global key handlers
    registerGlobalKeyHandlers() {
        document.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });
        
        document.addEventListener('keyup', (e) => {
            this.handleKeyUp(e);
        });
    }

    // Handle key down events
    handleKeyDown(event) {
        const key = event.key || event.keyCode;
        const handled = this.handleRemoteKey(key, event);
        
        if (handled) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    // Handle key up events
    handleKeyUp(event) {
        // Handle any key up specific logic here
    }

    // Handle remote control keys
    handleRemoteKey(key, event) {
        switch (key) {
            // Navigation keys
            case 'ArrowUp':
            case 38:
                this.navigate2D('up');
                return true;
                
            case 'ArrowDown':
            case 40:
                this.navigate2D('down');
                return true;
                
            case 'ArrowLeft':
            case 37:
                this.navigate2D('left');
                return true;
                
            case 'ArrowRight':
            case 39:
                this.navigate2D('right');
                return true;
                
            // Activation keys
            case 'Enter':
            case 13:
            case ' ':
            case 32:
                return this.activateElement();
                
            // Back/Exit keys
            case 'Escape':
            case 27:
            case 'Backspace':
            case 8:
                return this.handleBackKey();
                
            // Media control keys
            case 'MediaPlay':
            case 'MediaPause':
            case 'MediaPlayPause':
                return this.handleMediaKey('playpause');
                
            case 'MediaStop':
                return this.handleMediaKey('stop');
                
            case 'MediaFastForward':
                return this.handleMediaKey('fastforward');
                
            case 'MediaRewind':
                return this.handleMediaKey('rewind');
                
            // Volume keys
            case 'VolumeUp':
                return this.handleVolumeKey('up');
                
            case 'VolumeDown':
                return this.handleVolumeKey('down');
                
            case 'VolumeMute':
                return this.handleVolumeKey('mute');
                
            // Color keys (Red, Green, Yellow, Blue)
            case 'ColorF0Red':
            case 'F1':
                return this.handleColorKey('red');
                
            case 'ColorF1Green':
            case 'F2':
                return this.handleColorKey('green');
                
            case 'ColorF2Yellow':
            case 'F3':
                return this.handleColorKey('yellow');
                
            case 'ColorF3Blue':
            case 'F4':
                return this.handleColorKey('blue');
                
            // Number keys
            case '0': case '1': case '2': case '3': case '4':
            case '5': case '6': case '7': case '8': case '9':
                return this.handleNumberKey(key);
                
            default:
                return false;
        }
    }

    // Handle back key
    handleBackKey() {
        // Check current page and handle accordingly
        const path = window.location.pathname;
        
        if (path.includes('player.html')) {
            window.location.href = 'home.html';
            return true;
        } else if (path.includes('settings.html')) {
            window.location.href = 'home.html';
            return true;
        } else if (path.includes('home.html')) {
            // Maybe show exit confirmation
            if (confirm('Exit application?')) {
                if (window.close) {
                    window.close();
                } else {
                    window.location.href = 'index.html';
                }
            }
            return true;
        } else if (path.includes('index.html') || path === '/') {
            // On login page, maybe show exit confirmation
            return false; // Let browser handle
        }
        
        return false;
    }

    // Handle media control keys
    handleMediaKey(action) {
        const video = document.querySelector('video');
        if (!video) return false;
        
        switch (action) {
            case 'playpause':
                if (video.paused) {
                    video.play();
                } else {
                    video.pause();
                }
                return true;
                
            case 'stop':
                video.pause();
                video.currentTime = 0;
                return true;
                
            case 'fastforward':
                video.currentTime = Math.min(video.duration, video.currentTime + 30);
                return true;
                
            case 'rewind':
                video.currentTime = Math.max(0, video.currentTime - 10);
                return true;
        }
        
        return false;
    }

    // Handle volume keys
    handleVolumeKey(action) {
        const video = document.querySelector('video');
        if (!video) return false;
        
        switch (action) {
            case 'up':
                video.volume = Math.min(1, video.volume + 0.1);
                return true;
                
            case 'down':
                video.volume = Math.max(0, video.volume - 0.1);
                return true;
                
            case 'mute':
                video.muted = !video.muted;
                return true;
        }
        
        return false;
    }

    // Handle color keys
    handleColorKey(color) {
        // Color keys can be used for quick actions
        switch (color) {
            case 'red':
                // Red = Back/Exit
                return this.handleBackKey();
                
            case 'green':
                // Green = OK/Select
                return this.activateElement();
                
            case 'yellow':
                // Yellow = Settings
                if (!window.location.pathname.includes('settings.html')) {
                    window.location.href = 'settings.html';
                    return true;
                }
                break;
                
            case 'blue':
                // Blue = Info/Menu
                // Could show channel info or menu
                break;
        }
        
        return false;
    }

    // Handle number keys
    handleNumberKey(number) {
        // Number keys could be used for channel selection
        // This would be implemented based on specific requirements
        console.log('Number key pressed:', number);
        return false;
    }

    // Register custom key handler
    registerKeyHandler(key, handler) {
        this.keyHandlers.set(key, handler);
    }

    // Unregister key handler
    unregisterKeyHandler(key) {
        this.keyHandlers.delete(key);
    }

    // Enable/disable remote control
    setEnabled(enabled) {
        this.isRemoteEnabled = enabled;
        
        if (enabled) {
            document.body.classList.add('remote-control-enabled');
        } else {
            document.body.classList.remove('remote-control-enabled');
        }
    }

    // Get remote control status
    isEnabled() {
        return this.isRemoteEnabled;
    }

    // Cleanup
    destroy() {
        this.keyHandlers.clear();
        this.focusableElements = [];
        this.currentFocus = null;
        
        if (this.currentFocus) {
            this.currentFocus.classList.remove('tv-focused');
        }
    }
}

// Create global remote control instance
window.remoteControl = new RemoteControl();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.remoteControl.updateFocusableElements();
    });
} else {
    window.remoteControl.updateFocusableElements();
}