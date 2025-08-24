// EPG page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Protect the page - redirect to login if not authenticated
    if (!window.auth.protectPage()) {
        return;
    }

    // Initialize page elements
    const backBtn = document.getElementById('backBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const prevTimeBtn = document.getElementById('prevTimeBtn');
    const nextTimeBtn = document.getElementById('nextTimeBtn');
    const currentTimeDisplay = document.getElementById('currentTimeDisplay');
    const channelFilter = document.getElementById('channelFilter');
    const timeRangeSelect = document.getElementById('timeRangeSelect');
    const epgLoading = document.getElementById('epgLoading');
    const epgError = document.getElementById('epgError');
    const epgGrid = document.getElementById('epgGrid');

    // State variables
    let channels = [];
    let currentStartTime = new Date();
    let timeRange = 6; // hours
    let selectedGenre = '';
    let epgData = {};

    // Initialize
    initializePage();

    // Event handlers
    backBtn.addEventListener('click', function() {
        window.location.href = 'home.html';
    });

    refreshBtn.addEventListener('click', function() {
        loadEPGData();
    });

    prevTimeBtn.addEventListener('click', function() {
        currentStartTime.setHours(currentStartTime.getHours() - timeRange);
        updateTimeDisplay();
        loadEPGData();
    });

    nextTimeBtn.addEventListener('click', function() {
        currentStartTime.setHours(currentStartTime.getHours() + timeRange);
        updateTimeDisplay();
        loadEPGData();
    });

    channelFilter.addEventListener('change', function() {
        selectedGenre = this.value;
        renderEPGGrid();
    });

    timeRangeSelect.addEventListener('change', function() {
        timeRange = parseInt(this.value);
        loadEPGData();
    });

    async function initializePage() {
        showLoading(true);
        updateTimeDisplay();
        
        try {
            // Load channels first
            await loadChannels();
            await loadEPGData();
        } catch (error) {
            console.error('Error initializing EPG:', error);
            showError('Failed to load EPG data: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function loadChannels() {
        try {
            const channelsData = await window.api.getChannels();
            
            if (channelsData && channelsData.data) {
                channels = channelsData.data.slice(0, 20); // Limit to first 20 channels for performance
                
                // Populate channel filter
                populateChannelFilter();
            } else {
                throw new Error('No channels data received');
            }
        } catch (error) {
            console.error('Error loading channels:', error);
            throw error;
        }
    }

    function populateChannelFilter() {
        // Clear existing options except "All Channels"
        channelFilter.innerHTML = '<option value="">All Channels</option>';
        
        // Get unique genres
        const genres = [...new Set(channels.map(ch => ch.genre).filter(g => g))];
        
        genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre;
            channelFilter.appendChild(option);
        });
    }

    async function loadEPGData() {
        showLoading(true);
        hideError();
        
        try {
            const channelIds = getFilteredChannels().map(ch => ch.id);
            epgData = await window.epgManager.getEPGTimeline(channelIds, timeRange);
            renderEPGGrid();
        } catch (error) {
            console.error('Error loading EPG data:', error);
            showError('Failed to load EPG data: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    function getFilteredChannels() {
        if (!selectedGenre) {
            return channels;
        }
        return channels.filter(ch => ch.genre === selectedGenre);
    }

    function renderEPGGrid() {
        const filteredChannels = getFilteredChannels();
        
        if (filteredChannels.length === 0) {
            epgGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px;">No channels available</div>';
            return;
        }

        // Create time slots (hour by hour)
        const timeSlots = generateTimeSlots();
        
        // Build grid
        let gridHTML = '';
        
        // Header row
        gridHTML += '<div class="time-header">Channel</div>';
        timeSlots.forEach(slot => {
            gridHTML += `<div class="time-header">${slot.display}</div>`;
        });
        
        // Channel rows
        filteredChannels.forEach(channel => {
            // Channel name
            gridHTML += `<div class="channel-name">${channel.name}</div>`;
            
            // Program slots for this channel
            timeSlots.forEach(slot => {
                const program = findProgramForTimeSlot(channel.id, slot.start, slot.end);
                gridHTML += renderProgramSlot(program, channel, slot);
            });
        });
        
        epgGrid.innerHTML = gridHTML;
        
        // Update grid layout
        epgGrid.style.gridTemplateColumns = `200px repeat(${timeSlots.length}, 1fr)`;
        
        // Add click handlers
        addProgramClickHandlers();
    }

    function generateTimeSlots() {
        const slots = [];
        const slotDuration = timeRange <= 6 ? 1 : 2; // 1 hour slots for ≤6 hours, 2 hour slots for longer periods
        const totalSlots = Math.ceil(timeRange / slotDuration);
        
        for (let i = 0; i < totalSlots; i++) {
            const start = new Date(currentStartTime);
            start.setHours(start.getHours() + (i * slotDuration));
            
            const end = new Date(start);
            end.setHours(end.getHours() + slotDuration);
            
            slots.push({
                start: start,
                end: end,
                display: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        }
        
        return slots;
    }

    function findProgramForTimeSlot(channelId, slotStart, slotEnd) {
        const channelEPG = epgData[channelId] || [];
        
        // Find program that overlaps with this time slot
        return channelEPG.find(program => {
            const progStart = new Date(program.start_timestamp * 1000);
            const progEnd = new Date(program.stop_timestamp * 1000);
            
            // Check if program overlaps with slot
            return progStart < slotEnd && progEnd > slotStart;
        });
    }

    function renderProgramSlot(program, channel, slot) {
        if (!program) {
            return '<div class="program-slot"></div>';
        }
        
        const now = new Date();
        const progStart = new Date(program.start_timestamp * 1000);
        const progEnd = new Date(program.stop_timestamp * 1000);
        
        const isCurrent = now >= progStart && now <= progEnd;
        const progress = isCurrent ? window.epgManager.calculateProgress(progStart.getTime(), progEnd.getTime(), now.getTime()) : 0;
        
        let slotHTML = `<div class="program-slot ${isCurrent ? 'current' : ''}" data-channel-id="${channel.id}" data-program-id="${program.id || ''}" data-start="${program.start_timestamp}">`;
        slotHTML += `<div class="program-title">${program.name || 'No Title'}</div>`;
        slotHTML += `<div class="program-time">${window.epgManager.formatTime(program.start_timestamp)} - ${window.epgManager.formatTime(program.stop_timestamp)}</div>`;
        
        if (isCurrent && progress > 0) {
            slotHTML += `<div class="program-progress"><div class="program-progress-bar" style="width: ${progress}%"></div></div>`;
        }
        
        slotHTML += '</div>';
        
        return slotHTML;
    }

    function addProgramClickHandlers() {
        const programSlots = epgGrid.querySelectorAll('.program-slot[data-channel-id]');
        
        programSlots.forEach(slot => {
            slot.addEventListener('click', function() {
                const channelId = this.dataset.channelId;
                const programId = this.dataset.programId;
                const startTime = this.dataset.start;
                
                handleProgramClick(channelId, programId, startTime);
            });
        });
    }

    function handleProgramClick(channelId, programId, startTime) {
        const channel = channels.find(ch => ch.id === channelId);
        
        if (channel) {
            if (confirm(`Watch "${channel.name}"?`)) {
                // Navigate to player
                const params = new URLSearchParams({
                    type: 'channel',
                    id: channelId,
                    name: channel.name
                });
                window.location.href = `player.html?${params.toString()}`;
            }
        }
    }

    function updateTimeDisplay() {
        const endTime = new Date(currentStartTime);
        endTime.setHours(endTime.getHours() + timeRange);
        
        const startStr = currentStartTime.toLocaleString([], { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const endStr = endTime.toLocaleString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        currentTimeDisplay.textContent = `${startStr} - ${endStr}`;
    }

    function showLoading(show) {
        epgLoading.style.display = show ? 'block' : 'none';
    }

    function showError(message) {
        epgError.textContent = message;
        epgError.style.display = 'block';
    }

    function hideError() {
        epgError.style.display = 'none';
    }

    // Auto-refresh EPG every 5 minutes
    setInterval(function() {
        if (document.visibilityState === 'visible') {
            loadEPGData();
        }
    }, 5 * 60 * 1000);

    // Handle keyboard navigation for TV remote
    document.addEventListener('keydown', function(e) {
        switch (e.key) {
            case 'Escape':
            case 'Back':
            case 'GoBack':
                e.preventDefault();
                window.location.href = 'home.html';
                break;
                
            case 'ArrowLeft':
                e.preventDefault();
                prevTimeBtn.click();
                break;
                
            case 'ArrowRight':
                e.preventDefault();
                nextTimeBtn.click();
                break;
                
            case 'F5':
            case 'Refresh':
                e.preventDefault();
                refreshBtn.click();
                break;
        }
    });
});