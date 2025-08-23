// EPG (Electronic Program Guide) module
class EPGManager {
    constructor() {
        this.epgData = new Map();
        this.currentDate = new Date();
        this.selectedChannel = null;
    }

    // Initialize EPG
    async initialize() {
        await this.loadEPGData();
    }

    // Load EPG data from API
    async loadEPGData(date = null) {
        if (!date) date = this.currentDate;

        try {
            const dateStr = this.formatDate(date);
            const epgResponse = await window.api.apiRequest('epg', {
                action: 'get_epg',
                type: 'itv',
                date: dateStr,
                JsHttpRequest: '1-xml'
            });

            if (epgResponse && epgResponse.data) {
                this.processEPGData(epgResponse.data, date);
                return true;
            }
        } catch (error) {
            console.error('Error loading EPG data:', error);
            return false;
        }
    }

    // Process and store EPG data
    processEPGData(data, date) {
        const dateKey = this.formatDate(date);
        
        if (!this.epgData.has(dateKey)) {
            this.epgData.set(dateKey, new Map());
        }

        const dayData = this.epgData.get(dateKey);

        // Process EPG data - format depends on portal response
        if (Array.isArray(data)) {
            data.forEach(program => {
                if (program.ch_id) {
                    if (!dayData.has(program.ch_id)) {
                        dayData.set(program.ch_id, []);
                    }
                    dayData.get(program.ch_id).push({
                        id: program.id,
                        title: program.name || program.title,
                        startTime: new Date(program.time * 1000),
                        endTime: new Date((program.time + program.length) * 1000),
                        description: program.descr || program.description || '',
                        category: program.category || ''
                    });
                }
            });
        }

        // Sort programs by start time
        dayData.forEach(programs => {
            programs.sort((a, b) => a.startTime - b.startTime);
        });
    }

    // Get EPG data for specific channel and date
    getChannelEPG(channelId, date = null) {
        if (!date) date = this.currentDate;
        const dateKey = this.formatDate(date);
        
        if (this.epgData.has(dateKey)) {
            return this.epgData.get(dateKey).get(channelId) || [];
        }
        return [];
    }

    // Get current program for channel
    getCurrentProgram(channelId, date = null) {
        const programs = this.getChannelEPG(channelId, date);
        const now = new Date();

        return programs.find(program => 
            program.startTime <= now && program.endTime > now
        ) || null;
    }

    // Get next program for channel
    getNextProgram(channelId, date = null) {
        const programs = this.getChannelEPG(channelId, date);
        const now = new Date();

        return programs.find(program => program.startTime > now) || null;
    }

    // Create EPG timeline view
    createTimelineView(container, channels, startHour = 0, hours = 24) {
        container.innerHTML = '';
        container.className = 'epg-timeline';

        // Create timeline header
        const header = this.createTimelineHeader(startHour, hours);
        container.appendChild(header);

        // Create channel rows
        const channelsContainer = document.createElement('div');
        channelsContainer.className = 'epg-channels';

        channels.forEach(channel => {
            const channelRow = this.createChannelRow(channel, startHour, hours);
            channelsContainer.appendChild(channelRow);
        });

        container.appendChild(channelsContainer);

        // Add navigation controls
        const controls = this.createEPGControls();
        container.appendChild(controls);
    }

    // Create timeline header with time slots
    createTimelineHeader(startHour, hours) {
        const header = document.createElement('div');
        header.className = 'epg-header';

        // Channel name column
        const channelHeader = document.createElement('div');
        channelHeader.className = 'epg-channel-header';
        channelHeader.textContent = 'Channels';
        header.appendChild(channelHeader);

        // Time slots
        const timeSlots = document.createElement('div');
        timeSlots.className = 'epg-time-slots';

        for (let i = 0; i < hours; i++) {
            const hour = (startHour + i) % 24;
            const timeSlot = document.createElement('div');
            timeSlot.className = 'epg-time-slot';
            timeSlot.textContent = this.formatHour(hour);
            timeSlots.appendChild(timeSlot);
        }

        header.appendChild(timeSlots);
        return header;
    }

    // Create channel row with programs
    createChannelRow(channel, startHour, hours) {
        const row = document.createElement('div');
        row.className = 'epg-channel-row focusable';
        row.dataset.channelId = channel.id;

        // Channel info
        const channelInfo = document.createElement('div');
        channelInfo.className = 'epg-channel-info';
        channelInfo.innerHTML = `
            <img src="${channel.logo || ''}" alt="${channel.name}" class="channel-logo">
            <span class="channel-name">${channel.name}</span>
        `;
        row.appendChild(channelInfo);

        // Programs timeline
        const programsContainer = document.createElement('div');
        programsContainer.className = 'epg-programs';

        const programs = this.getChannelEPG(channel.id);
        const now = new Date();
        const startTime = new Date(now);
        startTime.setHours(startHour, 0, 0, 0);
        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + hours);

        // Filter programs for current time range
        const visiblePrograms = programs.filter(program => 
            program.startTime < endTime && program.endTime > startTime
        );

        if (visiblePrograms.length === 0) {
            // No program data available
            const noData = document.createElement('div');
            noData.className = 'epg-no-data';
            noData.textContent = 'No program information';
            programsContainer.appendChild(noData);
        } else {
            visiblePrograms.forEach(program => {
                const programElement = this.createProgramElement(program, startTime, hours);
                programsContainer.appendChild(programElement);
            });
        }

        row.appendChild(programsContainer);
        return row;
    }

    // Create program element
    createProgramElement(program, timelineStart, timelineHours) {
        const element = document.createElement('div');
        element.className = 'epg-program focusable';
        element.dataset.programId = program.id;

        // Calculate position and width based on time
        const timelineEnd = new Date(timelineStart);
        timelineEnd.setHours(timelineStart.getHours() + timelineHours);

        const programStart = Math.max(program.startTime, timelineStart);
        const programEnd = Math.min(program.endTime, timelineEnd);

        const totalMilliseconds = timelineEnd - timelineStart;
        const leftPercent = ((programStart - timelineStart) / totalMilliseconds) * 100;
        const widthPercent = ((programEnd - programStart) / totalMilliseconds) * 100;

        element.style.left = `${leftPercent}%`;
        element.style.width = `${widthPercent}%`;

        // Check if program is currently playing
        const now = new Date();
        if (program.startTime <= now && program.endTime > now) {
            element.classList.add('current-program');
        }

        element.innerHTML = `
            <div class="program-title">${program.title}</div>
            <div class="program-time">${this.formatTime(program.startTime)} - ${this.formatTime(program.endTime)}</div>
        `;

        // Add click handler
        element.addEventListener('click', () => {
            this.showProgramDetails(program);
        });

        return element;
    }

    // Create EPG controls
    createEPGControls() {
        const controls = document.createElement('div');
        controls.className = 'epg-controls';

        controls.innerHTML = `
            <button class="btn-epg-prev focusable">← Previous Day</button>
            <span class="epg-date">${this.formatDateFull(this.currentDate)}</span>
            <button class="btn-epg-next focusable">Next Day →</button>
            <button class="btn-epg-now focusable">Now</button>
        `;

        // Add event listeners
        controls.querySelector('.btn-epg-prev').addEventListener('click', () => {
            this.previousDay();
        });

        controls.querySelector('.btn-epg-next').addEventListener('click', () => {
            this.nextDay();
        });

        controls.querySelector('.btn-epg-now').addEventListener('click', () => {
            this.goToNow();
        });

        return controls;
    }

    // Show program details
    showProgramDetails(program) {
        const modal = document.createElement('div');
        modal.className = 'epg-program-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${program.title}</h3>
                    <button class="modal-close focusable">×</button>
                </div>
                <div class="modal-body">
                    <p><strong>Time:</strong> ${this.formatTime(program.startTime)} - ${this.formatTime(program.endTime)}</p>
                    ${program.category ? `<p><strong>Category:</strong> ${program.category}</p>` : ''}
                    ${program.description ? `<p><strong>Description:</strong> ${program.description}</p>` : ''}
                </div>
                <div class="modal-actions">
                    <button class="btn-watch focusable">Watch Channel</button>
                    <button class="btn-close focusable">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('.btn-close').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('.btn-watch').addEventListener('click', () => {
            // Navigate to player with channel
            const channelId = this.selectedChannel;
            if (channelId) {
                window.location.href = `player.html?type=channel&id=${channelId}&name=${encodeURIComponent(program.title)}`;
            }
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // Navigation methods
    previousDay() {
        this.currentDate.setDate(this.currentDate.getDate() - 1);
        this.loadEPGData(this.currentDate);
        this.refreshEPGView();
    }

    nextDay() {
        this.currentDate.setDate(this.currentDate.getDate() + 1);
        this.loadEPGData(this.currentDate);
        this.refreshEPGView();
    }

    goToNow() {
        this.currentDate = new Date();
        this.loadEPGData(this.currentDate);
        this.refreshEPGView();
    }

    refreshEPGView() {
        // Trigger refresh of current EPG view
        const event = new CustomEvent('epgRefresh', { detail: { date: this.currentDate } });
        document.dispatchEvent(event);
    }

    // Utility methods
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    formatDateFull(date) {
        return date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    formatTime(date) {
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
    }

    formatHour(hour) {
        return `${hour.toString().padStart(2, '0')}:00`;
    }
}

// Create global EPG manager instance
window.epgManager = new EPGManager();