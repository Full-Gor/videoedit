/**
 * VideoEdit - Multi-Track Video Editor
 * Features: Split, Speed, Delete, Drag & Drop, Multi-track
 */

class VideoEditor {
    constructor() {
        // DOM Elements
        this.homeScreen = document.getElementById('home-screen');
        this.editorScreen = document.getElementById('editor-screen');
        this.importBtn = document.getElementById('import-btn');
        this.fileInput = document.getElementById('file-input');
        this.video = document.getElementById('preview-video');

        // Header buttons
        this.backBtn = document.getElementById('back-btn');
        this.undoBtn = document.getElementById('undo-btn');
        this.redoBtn = document.getElementById('redo-btn');
        this.exportBtn = document.getElementById('export-btn');

        // Playback controls
        this.playBtn = document.getElementById('play-btn');
        this.fullscreenBtn = document.getElementById('fullscreen-btn');
        this.currentTimeEl = document.getElementById('current-time');
        this.totalTimeEl = document.getElementById('total-time');

        // Timeline controls
        this.zoomInBtn = document.getElementById('zoom-in');
        this.zoomOutBtn = document.getElementById('zoom-out');
        this.zoomFitBtn = document.getElementById('zoom-fit');

        // Timeline
        this.timelineContainer = document.getElementById('timeline-container');
        this.timeRuler = document.getElementById('time-ruler');
        this.tracksWrapper = document.getElementById('timeline-tracks-wrapper');
        this.playhead = document.getElementById('playhead');
        this.cutCursor = document.getElementById('cut-cursor');
        this.scissorBtn = document.getElementById('scissor-btn');

        // Tracks
        this.tracks = [
            document.getElementById('track-0'),
            document.getElementById('track-1'),
            document.getElementById('track-2')
        ];

        // Tools
        this.toolBtns = document.querySelectorAll('.tool-btn');
        this.moreToolsBtn = document.getElementById('more-tools-btn');
        this.toolsPanel = document.getElementById('tools-panel');
        this.panelToolBtns = document.querySelectorAll('.panel-tool-btn');

        // Export modal
        this.exportModal = document.getElementById('export-modal');
        this.closeExportBtn = document.getElementById('close-export');
        this.startExportBtn = document.getElementById('start-export');
        this.exportFormat = document.getElementById('export-format');
        this.exportQuality = document.getElementById('export-quality');
        this.exportProgress = document.getElementById('export-progress');
        this.progressFill = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-text');

        // Toast
        this.toastContainer = document.getElementById('toast-container');

        // State
        this.videoFile = null;
        this.videoUrl = null;
        this.videoDuration = 0;
        this.isPlaying = false;
        this.zoom = 1;
        this.pixelsPerSecond = 100;

        // Clips state
        this.clips = [];
        this.clipIdCounter = 0;
        this.selectedClip = null;

        // Cut cursor state
        this.cutTime = 0;
        this.cutCursorVisible = false;

        // Drag state
        this.isDragging = false;
        this.dragClip = null;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragOffsetX = 0;

        // History
        this.history = [];
        this.historyIndex = -1;

        // Initialize
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupTouchEvents();
    }

    bindEvents() {
        // Import
        this.importBtn.addEventListener('click', () => this.fileInput.click());
        this.importBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.fileInput.click();
        });
        this.fileInput.addEventListener('change', (e) => this.handleFileImport(e));

        // Header buttons
        this.backBtn.addEventListener('click', () => this.goBack());
        this.undoBtn.addEventListener('click', () => this.undo());
        this.redoBtn.addEventListener('click', () => this.redo());
        this.exportBtn.addEventListener('click', () => this.openExportModal());
        this.exportBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.openExportModal();
        });

        // Playback
        this.playBtn.addEventListener('click', () => this.togglePlay());
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

        // Video events
        this.video.addEventListener('loadedmetadata', () => this.onVideoLoaded());
        this.video.addEventListener('timeupdate', () => this.onTimeUpdate());
        this.video.addEventListener('ended', () => this.onVideoEnded());
        this.video.addEventListener('click', () => this.togglePlay());

        // Zoom controls
        this.zoomInBtn.addEventListener('click', () => this.zoomIn());
        this.zoomOutBtn.addEventListener('click', () => this.zoomOut());
        this.zoomFitBtn.addEventListener('click', () => this.zoomFit());

        // Timeline click to position cut cursor
        this.tracksWrapper.addEventListener('click', (e) => this.handleTimelineClick(e));

        // Scissor button
        this.scissorBtn.addEventListener('click', () => this.splitAtCursor());

        // Tools - avec support touch
        this.toolBtns.forEach(btn => {
            btn.addEventListener('click', () => this.handleTool(btn.dataset.tool));
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.handleTool(btn.dataset.tool);
            });
        });

        this.panelToolBtns.forEach(btn => {
            btn.addEventListener('click', () => this.handleTool(btn.dataset.tool));
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.handleTool(btn.dataset.tool);
            });
        });

        // More tools button
        this.moreToolsBtn.addEventListener('click', () => this.toggleToolsPanel());
        this.moreToolsBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.toggleToolsPanel();
        });

        // Export modal
        this.closeExportBtn.addEventListener('click', () => this.closeExportModal());
        this.startExportBtn.addEventListener('click', () => this.startExport());
        this.startExportBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.startExport();
        });
        this.exportModal.addEventListener('click', (e) => {
            if (e.target === this.exportModal) this.closeExportModal();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Drag and drop file
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => this.handleDrop(e));

        // Mouse drag events for clips
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }

    setupTouchEvents() {
        // Touch events for timeline
        this.tracksWrapper.addEventListener('touchstart', (e) => {
            // Only handle if not on a clip
            if (!e.target.closest('.timeline-clip')) {
                const rect = this.tracksWrapper.getBoundingClientRect();
                const x = e.touches[0].clientX - rect.left + this.timelineContainer.scrollLeft;
                this.positionCutCursor(x);
            }
        }, { passive: true });

        // Touch for play button
        this.playBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.togglePlay();
        });

        // Touch for scissor button
        this.scissorBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.splitAtCursor();
        });
    }

    // ==================== FILE HANDLING ====================

    handleFileImport(e) {
        const file = e.target.files[0];
        if (file) {
            this.loadVideo(file);
        }
    }

    handleDrop(e) {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('video/')) {
            this.loadVideo(file);
        }
    }

    loadVideo(file) {
        this.videoFile = file;
        this.videoUrl = URL.createObjectURL(file);
        this.video.src = this.videoUrl;
        this.video.load();

        // Switch to editor
        this.homeScreen.classList.add('hidden');
        this.editorScreen.classList.add('active');

        this.showToast('Vidéo chargée avec succès', 'success');
    }

    onVideoLoaded() {
        this.videoDuration = this.video.duration;

        // Create initial clip covering the full video on track 0
        this.clips = [{
            id: this.clipIdCounter++,
            trackIndex: 0,
            startTime: 0,
            sourceStart: 0,
            sourceEnd: this.videoDuration,
            duration: this.videoDuration,
            speed: 1,
            name: this.videoFile.name.substring(0, 15)
        }];

        this.updateTimeDisplay();
        this.renderTimeline();
        this.renderClips();
        this.saveState();
    }

    // ==================== PLAYBACK ====================

    onTimeUpdate() {
        this.updateTimeDisplay();
        this.updatePlayhead();
    }

    onVideoEnded() {
        this.isPlaying = false;
        this.updatePlayButton();
    }

    updateTimeDisplay() {
        const current = this.video.currentTime;
        const total = this.videoDuration || 0;

        this.currentTimeEl.textContent = this.formatTime(current);
        this.totalTimeEl.textContent = this.formatTime(total);
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    togglePlay() {
        if (!this.video.src) return;

        if (this.isPlaying) {
            this.video.pause();
        } else {
            this.video.play();
        }

        this.isPlaying = !this.isPlaying;
        this.updatePlayButton();
    }

    updatePlayButton() {
        const icon = this.playBtn.querySelector('i');
        if (this.isPlaying) {
            icon.className = 'fas fa-pause';
            this.playBtn.classList.add('playing');
        } else {
            icon.className = 'fas fa-play';
            this.playBtn.classList.remove('playing');
        }
    }

    toggleFullscreen() {
        const previewArea = document.querySelector('.preview-area');

        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            previewArea.requestFullscreen();
        }
    }

    seekTo(time) {
        time = Math.max(0, Math.min(this.videoDuration, time));
        this.video.currentTime = time;
        this.updatePlayhead();
    }

    // ==================== TIMELINE RENDERING ====================

    renderTimeline() {
        this.timeRuler.innerHTML = '';

        if (!this.videoDuration) return;

        const timelineWidth = this.videoDuration * this.pixelsPerSecond * this.zoom;
        this.timeRuler.style.width = `${timelineWidth}px`;
        this.tracksWrapper.style.width = `${timelineWidth}px`;

        const markerInterval = this.calculateMarkerInterval(this.videoDuration);

        for (let t = 0; t <= this.videoDuration; t += markerInterval) {
            const marker = document.createElement('span');
            marker.className = 'time-marker';
            marker.textContent = this.formatTime(t);
            marker.style.left = `${t * this.pixelsPerSecond * this.zoom}px`;
            this.timeRuler.appendChild(marker);
        }
    }

    calculateMarkerInterval(duration) {
        const zoomedDuration = duration / this.zoom;
        if (zoomedDuration <= 10) return 1;
        if (zoomedDuration <= 30) return 5;
        if (zoomedDuration <= 60) return 10;
        if (zoomedDuration <= 300) return 30;
        return 60;
    }

    updatePlayhead() {
        if (!this.videoDuration) return;
        const position = this.video.currentTime * this.pixelsPerSecond * this.zoom;
        this.playhead.style.left = `${position}px`;
    }

    // ==================== CLIPS RENDERING ====================

    renderClips() {
        this.tracks.forEach(track => {
            const existingClips = track.querySelectorAll('.timeline-clip');
            existingClips.forEach(clip => clip.remove());
        });

        this.clips.forEach(clip => {
            this.renderClip(clip);
        });
    }

    renderClip(clip) {
        const track = this.tracks[clip.trackIndex];
        if (!track) return;

        const clipEl = document.createElement('div');
        clipEl.className = 'timeline-clip';
        clipEl.dataset.clipId = clip.id;
        clipEl.dataset.speed = clip.speed;

        const left = clip.startTime * this.pixelsPerSecond * this.zoom;
        const width = clip.duration * this.pixelsPerSecond * this.zoom;

        clipEl.style.left = `${left}px`;
        clipEl.style.width = `${width}px`;

        clipEl.innerHTML = `
            <div class="resize-handle left"></div>
            <div class="clip-content">
                <span class="clip-name">${clip.name}</span>
                ${clip.speed !== 1 ? `<span class="clip-speed">${clip.speed}x</span>` : ''}
            </div>
            <div class="resize-handle right"></div>
        `;

        if (this.selectedClip && this.selectedClip.id === clip.id) {
            clipEl.classList.add('selected');
        }

        // Click to select clip
        clipEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectClip(clip);
        });

        // Mouse drag
        clipEl.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('resize-handle')) return;
            e.preventDefault();
            this.startDrag(clip, e);
        });

        // Touch events
        let longPressTimer = null;
        let touchStartPos = null;

        clipEl.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };

            // Select on touch
            this.selectClip(clip);

            // Long press for drag
            longPressTimer = setTimeout(() => {
                clipEl.classList.add('dragging');
                this.startTouchDrag(clip, e);
                if (navigator.vibrate) navigator.vibrate(50);
            }, 500);
        }, { passive: false });

        clipEl.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            const dx = Math.abs(touch.clientX - touchStartPos.x);
            const dy = Math.abs(touch.clientY - touchStartPos.y);

            if (dx > 10 || dy > 10) {
                clearTimeout(longPressTimer);
            }

            if (this.isDragging && this.dragClip && this.dragClip.id === clip.id) {
                e.preventDefault();
                this.handleTouchMove(e);
            }
        }, { passive: false });

        clipEl.addEventListener('touchend', () => {
            clearTimeout(longPressTimer);
            if (this.isDragging) {
                this.endDrag();
            }
        });

        track.appendChild(clipEl);
    }

    selectClip(clip) {
        const prevSelected = document.querySelector('.timeline-clip.selected');
        if (prevSelected) prevSelected.classList.remove('selected');

        this.selectedClip = clip;
        const clipEl = document.querySelector(`[data-clip-id="${clip.id}"]`);
        if (clipEl) clipEl.classList.add('selected');

        // Check if we should show scissor button
        this.updateScissorButton();
    }

    deselectClip() {
        const selected = document.querySelector('.timeline-clip.selected');
        if (selected) selected.classList.remove('selected');
        this.selectedClip = null;
        this.hideScissorButton();
    }

    // ==================== CUT CURSOR ====================

    handleTimelineClick(e) {
        // If clicked on a clip, don't position cursor
        if (e.target.closest('.timeline-clip')) return;

        const rect = this.tracksWrapper.getBoundingClientRect();
        const x = e.clientX - rect.left + this.timelineContainer.scrollLeft;
        this.positionCutCursor(x);
    }

    positionCutCursor(x) {
        this.cutTime = x / (this.pixelsPerSecond * this.zoom);
        this.cutTime = Math.max(0, Math.min(this.videoDuration, this.cutTime));

        this.cutCursor.style.left = `${x}px`;
        this.cutCursor.classList.add('visible');
        this.cutCursorVisible = true;

        // Also seek video to this position
        this.seekTo(this.cutTime);

        // Check if we should show scissor button
        this.updateScissorButton();
    }

    hideCutCursor() {
        this.cutCursor.classList.remove('visible');
        this.cutCursorVisible = false;
        this.hideScissorButton();
    }

    // ==================== SCISSOR BUTTON ====================

    updateScissorButton() {
        // Show scissor button if:
        // 1. A clip is selected
        // 2. Cut cursor is visible
        // 3. Cut cursor is within the selected clip
        if (!this.selectedClip || !this.cutCursorVisible) {
            this.hideScissorButton();
            return;
        }

        const clipEnd = this.selectedClip.startTime + this.selectedClip.duration;
        const isWithinClip = this.cutTime > this.selectedClip.startTime && this.cutTime < clipEnd;

        if (isWithinClip) {
            this.showScissorButton();
        } else {
            this.hideScissorButton();
        }
    }

    showScissorButton() {
        // Position the scissor button above the cut cursor
        const cursorX = this.cutTime * this.pixelsPerSecond * this.zoom;
        this.scissorBtn.style.left = `${cursorX - 25}px`;
        this.scissorBtn.style.top = '-60px';
        this.scissorBtn.classList.add('visible');
    }

    hideScissorButton() {
        this.scissorBtn.classList.remove('visible');
    }

    // ==================== SPLIT ====================

    splitAtCursor() {
        if (!this.selectedClip || !this.cutCursorVisible) {
            this.showToast('Positionnez le curseur et sélectionnez un clip', 'warning');
            return;
        }

        const clipEnd = this.selectedClip.startTime + this.selectedClip.duration;
        if (this.cutTime <= this.selectedClip.startTime || this.cutTime >= clipEnd) {
            this.showToast('Le curseur doit être sur le clip sélectionné', 'warning');
            return;
        }

        // Calculate split
        const relativeTime = this.cutTime - this.selectedClip.startTime;
        const sourceRelativeTime = (relativeTime / this.selectedClip.duration) *
            (this.selectedClip.sourceEnd - this.selectedClip.sourceStart);

        // Create two new clips
        const clip1 = {
            id: this.clipIdCounter++,
            trackIndex: this.selectedClip.trackIndex,
            startTime: this.selectedClip.startTime,
            sourceStart: this.selectedClip.sourceStart,
            sourceEnd: this.selectedClip.sourceStart + sourceRelativeTime,
            duration: relativeTime,
            speed: this.selectedClip.speed,
            name: this.selectedClip.name + ' (1)'
        };

        const clip2 = {
            id: this.clipIdCounter++,
            trackIndex: this.selectedClip.trackIndex,
            startTime: this.cutTime,
            sourceStart: this.selectedClip.sourceStart + sourceRelativeTime,
            sourceEnd: this.selectedClip.sourceEnd,
            duration: this.selectedClip.duration - relativeTime,
            speed: this.selectedClip.speed,
            name: this.selectedClip.name + ' (2)'
        };

        // Replace original with new clips
        const index = this.clips.findIndex(c => c.id === this.selectedClip.id);
        this.clips.splice(index, 1, clip1, clip2);

        // Select second clip
        this.selectedClip = clip2;
        this.hideScissorButton();

        this.renderClips();
        this.saveState();
        this.showToast('Clip divisé !', 'success');
    }

    // ==================== DRAG & DROP ====================

    startDrag(clip, e) {
        this.isDragging = true;
        this.dragClip = clip;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;

        const clipEl = document.querySelector(`[data-clip-id="${clip.id}"]`);
        if (clipEl) {
            clipEl.classList.add('dragging');
            const rect = clipEl.getBoundingClientRect();
            this.dragOffsetX = e.clientX - rect.left;
        }
    }

    startTouchDrag(clip, e) {
        this.isDragging = true;
        this.dragClip = clip;
        const touch = e.touches[0];
        this.dragStartX = touch.clientX;
        this.dragStartY = touch.clientY;

        const clipEl = document.querySelector(`[data-clip-id="${clip.id}"]`);
        if (clipEl) {
            const rect = clipEl.getBoundingClientRect();
            this.dragOffsetX = touch.clientX - rect.left;
        }
    }

    handleMouseMove(e) {
        if (!this.isDragging || !this.dragClip) return;

        const clipEl = document.querySelector(`[data-clip-id="${this.dragClip.id}"]`);
        if (!clipEl) return;

        const wrapperRect = this.tracksWrapper.getBoundingClientRect();
        const x = e.clientX - wrapperRect.left - this.dragOffsetX + this.timelineContainer.scrollLeft;
        const y = e.clientY - wrapperRect.top;

        clipEl.style.left = `${Math.max(0, x)}px`;
        this.updateDropTarget(y);
    }

    handleTouchMove(e) {
        if (!this.isDragging || !this.dragClip) return;

        const touch = e.touches[0];
        const clipEl = document.querySelector(`[data-clip-id="${this.dragClip.id}"]`);
        if (!clipEl) return;

        const wrapperRect = this.tracksWrapper.getBoundingClientRect();
        const x = touch.clientX - wrapperRect.left - this.dragOffsetX + this.timelineContainer.scrollLeft;
        const y = touch.clientY - wrapperRect.top;

        clipEl.style.left = `${Math.max(0, x)}px`;
        this.updateDropTarget(y);
    }

    updateDropTarget(y) {
        this.tracks.forEach(track => track.classList.remove('drop-target'));

        let trackIndex = Math.floor(y / 55);
        trackIndex = Math.max(0, Math.min(this.tracks.length - 1, trackIndex));

        this.tracks[trackIndex].classList.add('drop-target');
        this.dragClip.targetTrack = trackIndex;
    }

    handleMouseUp() {
        if (!this.isDragging) return;
        this.endDrag();
    }

    endDrag() {
        if (!this.dragClip) return;

        const clipEl = document.querySelector(`[data-clip-id="${this.dragClip.id}"]`);
        if (clipEl) {
            clipEl.classList.remove('dragging');

            const left = parseFloat(clipEl.style.left);
            const newStartTime = left / (this.pixelsPerSecond * this.zoom);

            this.dragClip.startTime = Math.max(0, newStartTime);

            if (this.dragClip.targetTrack !== undefined) {
                this.dragClip.trackIndex = this.dragClip.targetTrack;
                delete this.dragClip.targetTrack;
            }
        }

        this.tracks.forEach(track => track.classList.remove('drop-target'));

        this.isDragging = false;
        this.dragClip = null;

        this.renderClips();
        this.saveState();
    }

    // ==================== TOOLS ====================

    handleTool(tool) {
        switch (tool) {
            case 'split':
                this.splitAtCursor();
                break;
            case 'adjust':
                this.showAdjustPanel();
                break;
            case 'speed':
                this.showSpeedPanel();
                break;
            case 'delete':
                this.deleteSelectedClip();
                break;
            case 'transform':
                this.showTransformPanel();
                break;
            case 'filters':
                this.showFiltersPanel();
                break;
            case 'text':
                this.showToast('Fonctionnalité texte à venir', 'info');
                break;
            case 'audio':
                this.showAudioPanel();
                break;
            case 'rotate':
                this.rotateVideo();
                break;
        }
    }

    // ==================== DELETE ====================

    deleteSelectedClip() {
        if (!this.selectedClip) {
            this.showToast('Sélectionnez d\'abord un clip', 'warning');
            return;
        }

        if (this.clips.length === 1) {
            this.showToast('Impossible de supprimer le dernier clip', 'warning');
            return;
        }

        const index = this.clips.findIndex(c => c.id === this.selectedClip.id);
        if (index !== -1) {
            this.clips.splice(index, 1);
            this.selectedClip = null;
            this.hideScissorButton();
            this.renderClips();
            this.saveState();
            this.showToast('Clip supprimé', 'success');
        }
    }

    // ==================== SPEED ====================

    showSpeedPanel() {
        if (!this.selectedClip) {
            this.showToast('Sélectionnez d\'abord un clip', 'warning');
            return;
        }

        const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
        const currentSpeed = this.selectedClip.speed;

        const panel = this.createToolPanel('Vitesse du segment', `
            <div class="speed-presets">
                ${speeds.map(s => `
                    <button class="speed-preset-btn ${s === currentSpeed ? 'active' : ''}" data-speed="${s}">
                        ${s}x
                    </button>
                `).join('')}
            </div>
        `);

        panel.querySelectorAll('.speed-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const newSpeed = parseFloat(btn.dataset.speed);
                this.setClipSpeed(this.selectedClip, newSpeed);

                panel.querySelectorAll('.speed-preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                this.showToast(`Vitesse: ${newSpeed}x`, 'success');
            });
        });
    }

    setClipSpeed(clip, speed) {
        const originalDuration = (clip.sourceEnd - clip.sourceStart) / clip.speed;
        clip.speed = speed;
        clip.duration = originalDuration / speed;

        this.renderClips();
        this.saveState();
    }

    // ==================== OTHER TOOLS ====================

    showAdjustPanel() {
        const panel = this.createToolPanel('Ajuster', `
            <div class="slider-control">
                <label><span>Luminosité</span><span id="brightness-value">100%</span></label>
                <input type="range" id="brightness-slider" min="50" max="150" value="100">
            </div>
            <div class="slider-control">
                <label><span>Contraste</span><span id="contrast-value">100%</span></label>
                <input type="range" id="contrast-slider" min="50" max="150" value="100">
            </div>
            <div class="slider-control">
                <label><span>Saturation</span><span id="saturation-value">100%</span></label>
                <input type="range" id="saturation-slider" min="0" max="200" value="100">
            </div>
        `);

        const updateFilters = () => {
            const brightness = document.getElementById('brightness-slider').value;
            const contrast = document.getElementById('contrast-slider').value;
            const saturation = document.getElementById('saturation-slider').value;

            document.getElementById('brightness-value').textContent = brightness + '%';
            document.getElementById('contrast-value').textContent = contrast + '%';
            document.getElementById('saturation-value').textContent = saturation + '%';

            this.video.style.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
        };

        panel.querySelectorAll('input[type="range"]').forEach(slider => {
            slider.addEventListener('input', updateFilters);
        });
    }

    showTransformPanel() {
        const panel = this.createToolPanel('Transformer', `
            <div class="speed-presets">
                <button class="speed-preset-btn" data-action="flip-h">Miroir H</button>
                <button class="speed-preset-btn" data-action="flip-v">Miroir V</button>
                <button class="speed-preset-btn" data-action="rotate-left">-90°</button>
                <button class="speed-preset-btn" data-action="rotate-right">+90°</button>
            </div>
        `);

        let rotation = 0, scaleX = 1, scaleY = 1;

        panel.querySelectorAll('.speed-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                switch (btn.dataset.action) {
                    case 'flip-h': scaleX *= -1; break;
                    case 'flip-v': scaleY *= -1; break;
                    case 'rotate-left': rotation -= 90; break;
                    case 'rotate-right': rotation += 90; break;
                }
                this.video.style.transform = `rotate(${rotation}deg) scale(${scaleX}, ${scaleY})`;
                this.showToast('Transformation appliquée', 'success');
            });
        });
    }

    showFiltersPanel() {
        const filters = [
            { name: 'Normal', filter: 'none' },
            { name: 'N&B', filter: 'grayscale(100%)' },
            { name: 'Sépia', filter: 'sepia(100%)' },
            { name: 'Vintage', filter: 'sepia(50%) contrast(120%)' },
            { name: 'Froid', filter: 'saturate(80%) hue-rotate(180deg)' },
            { name: 'Chaud', filter: 'saturate(120%) hue-rotate(-20deg)' }
        ];

        const panel = this.createToolPanel('Filtres', `
            <div class="speed-presets" style="flex-wrap: wrap;">
                ${filters.map((f, i) => `
                    <button class="speed-preset-btn ${i === 0 ? 'active' : ''}" data-filter="${f.filter}">${f.name}</button>
                `).join('')}
            </div>
        `);

        panel.querySelectorAll('.speed-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.video.style.filter = btn.dataset.filter;
                panel.querySelectorAll('.speed-preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.showToast('Filtre appliqué', 'success');
            });
        });
    }

    showAudioPanel() {
        const panel = this.createToolPanel('Audio', `
            <div class="slider-control">
                <label><span>Volume</span><span id="volume-value">100%</span></label>
                <input type="range" id="volume-slider" min="0" max="100" value="100">
            </div>
            <div class="speed-presets">
                <button class="speed-preset-btn" data-mute="true">
                    <i class="fas fa-volume-mute"></i> Muet
                </button>
            </div>
        `);

        const volumeSlider = panel.querySelector('#volume-slider');
        const volumeValue = panel.querySelector('#volume-value');
        const muteBtn = panel.querySelector('[data-mute]');

        volumeSlider.addEventListener('input', () => {
            const vol = volumeSlider.value;
            this.video.volume = vol / 100;
            volumeValue.textContent = vol + '%';
        });

        muteBtn.addEventListener('click', () => {
            this.video.muted = !this.video.muted;
            muteBtn.classList.toggle('active');
            this.showToast(this.video.muted ? 'Audio désactivé' : 'Audio activé', 'success');
        });
    }

    rotateVideo() {
        const currentRotation = this.video.style.transform || '';
        const match = currentRotation.match(/rotate\((-?\d+)deg\)/);
        let rotation = match ? parseInt(match[1]) : 0;
        rotation += 90;
        this.video.style.transform = `rotate(${rotation}deg)`;
        this.showToast('Rotation +90°', 'success');
    }

    createToolPanel(title, content) {
        const existing = document.querySelector('.tool-options-panel');
        if (existing) existing.remove();

        const panel = document.createElement('div');
        panel.className = 'tool-options-panel active';
        panel.innerHTML = `
            <div class="tool-options-header">
                <h4>${title}</h4>
                <button class="tool-options-close">&times;</button>
            </div>
            <div class="tool-options-body">${content}</div>
        `;

        document.body.appendChild(panel);

        panel.querySelector('.tool-options-close').addEventListener('click', () => {
            panel.remove();
        });

        return panel;
    }

    toggleToolsPanel() {
        this.toolsPanel.classList.toggle('active');
        this.moreToolsBtn.classList.toggle('active');
    }

    // ==================== ZOOM ====================

    zoomIn() {
        this.zoom = Math.min(4, this.zoom * 1.5);
        this.applyZoom();
    }

    zoomOut() {
        this.zoom = Math.max(0.25, this.zoom / 1.5);
        this.applyZoom();
    }

    zoomFit() {
        this.zoom = 1;
        this.applyZoom();
    }

    applyZoom() {
        this.renderTimeline();
        this.renderClips();
        this.updatePlayhead();
        if (this.cutCursorVisible) {
            const cursorX = this.cutTime * this.pixelsPerSecond * this.zoom;
            this.cutCursor.style.left = `${cursorX}px`;
        }
    }

    // ==================== HISTORY ====================

    saveState() {
        const state = {
            clips: JSON.parse(JSON.stringify(this.clips)),
            selectedClipId: this.selectedClip ? this.selectedClip.id : null
        };

        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(state);
        this.historyIndex = this.history.length - 1;

        this.updateHistoryButtons();
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.applyState(this.history[this.historyIndex]);
            this.showToast('Annulé', 'success');
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.applyState(this.history[this.historyIndex]);
            this.showToast('Rétabli', 'success');
        }
    }

    applyState(state) {
        this.clips = JSON.parse(JSON.stringify(state.clips));

        if (state.selectedClipId) {
            this.selectedClip = this.clips.find(c => c.id === state.selectedClipId);
        } else {
            this.selectedClip = null;
        }

        this.renderClips();
        this.updateHistoryButtons();
    }

    updateHistoryButtons() {
        this.undoBtn.style.opacity = this.historyIndex > 0 ? '1' : '0.5';
        this.redoBtn.style.opacity = this.historyIndex < this.history.length - 1 ? '1' : '0.5';
    }

    // ==================== NAVIGATION ====================

    goBack() {
        if (confirm('Voulez-vous vraiment quitter l\'éditeur ?')) {
            this.video.src = '';
            this.video.style.filter = '';
            this.video.style.transform = '';
            if (this.videoUrl) URL.revokeObjectURL(this.videoUrl);
            this.videoFile = null;
            this.videoUrl = null;
            this.videoDuration = 0;
            this.clips = [];
            this.selectedClip = null;
            this.isPlaying = false;

            this.timeRuler.innerHTML = '';
            this.tracks.forEach(track => {
                const clips = track.querySelectorAll('.timeline-clip');
                clips.forEach(c => c.remove());
            });

            this.hideCutCursor();
            this.editorScreen.classList.remove('active');
            this.homeScreen.classList.remove('hidden');
            this.fileInput.value = '';
        }
    }

    // ==================== EXPORT ====================

    openExportModal() {
        if (!this.video.src) {
            this.showToast('Aucune vidéo à exporter', 'warning');
            return;
        }
        this.exportModal.classList.add('active');
    }

    closeExportModal() {
        this.exportModal.classList.remove('active');
        this.exportProgress.classList.remove('active');
        this.progressFill.style.width = '0%';
        this.progressText.textContent = '0%';
    }

    async startExport() {
        const quality = this.exportQuality.value;

        this.exportProgress.classList.add('active');
        this.startExportBtn.disabled = true;

        try {
            let width, height;
            switch (quality) {
                case '1080p': width = 1920; height = 1080; break;
                case '720p': width = 1280; height = 720; break;
                case '480p': width = 854; height = 480; break;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            const stream = canvas.captureStream(30);
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9',
                videoBitsPerSecond: quality === '1080p' ? 8000000 : quality === '720p' ? 5000000 : 2500000
            });

            const chunks = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                await this.saveFile(blob, 'video-export.webm');

                this.progressFill.style.width = '100%';
                this.progressText.textContent = '100% - Terminé!';
                this.showToast('Export terminé!', 'success');

                setTimeout(() => {
                    this.closeExportModal();
                    this.startExportBtn.disabled = false;
                }, 1500);
            };

            mediaRecorder.start(100);

            const tempVideo = document.createElement('video');
            tempVideo.src = this.video.src;
            tempVideo.muted = true;

            await new Promise(resolve => { tempVideo.onloadeddata = resolve; });

            const duration = this.videoDuration;
            const startTime = Date.now();

            const renderFrame = () => {
                const elapsed = (Date.now() - startTime) / 1000;
                const progress = Math.min(elapsed / duration, 1);

                this.progressFill.style.width = `${Math.round(progress * 100)}%`;
                this.progressText.textContent = `${Math.round(progress * 100)}%`;

                ctx.filter = this.video.style.filter || 'none';
                ctx.drawImage(tempVideo, 0, 0, width, height);

                if (progress < 1 && !tempVideo.ended) {
                    requestAnimationFrame(renderFrame);
                } else {
                    mediaRecorder.stop();
                }
            };

            tempVideo.play();
            renderFrame();

        } catch (error) {
            console.error('Export error:', error);
            this.showToast('Erreur: ' + error.message, 'error');
            this.startExportBtn.disabled = false;
        }
    }

    async saveFile(blob, filename) {
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

        try {
            // Option 1: Web Share API (meilleur pour mobile)
            if (navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: blob.type })] })) {
                const file = new File([blob], filename, { type: blob.type });
                await navigator.share({
                    title: 'Vidéo exportée',
                    text: 'Votre vidéo éditée',
                    files: [file]
                });
                this.showToast('Vidéo partagée avec succès!', 'success');
                return;
            }

            // Option 2: File System Access API (Desktop moderne)
            if ('showSaveFilePicker' in window && !isMobile) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{ description: 'Video File', accept: { 'video/*': ['.webm'] } }]
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                this.showToast('Vidéo sauvegardée!', 'success');
                return;
            }

            // Option 3: Téléchargement classique
            await this.downloadFile(blob, filename);

        } catch (error) {
            if (error.name !== 'AbortError') {
                // Fallback au téléchargement classique
                await this.downloadFile(blob, filename);
            }
        }
    }

    async downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);

        // Pour mobile, on ouvre dans un nouvel onglet
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

        if (isMobile) {
            // Sur mobile, afficher un message avec le lien
            this.showDownloadModal(url, filename);
        } else {
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        }
    }

    showDownloadModal(url, filename) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Télécharger la vidéo</h3>
                </div>
                <div class="modal-body" style="text-align: center;">
                    <p style="margin-bottom: 1rem; color: var(--text-secondary);">
                        Appuyez sur le bouton ci-dessous pour télécharger votre vidéo.
                    </p>
                    <a href="${url}" download="${filename}"
                       class="btn-primary"
                       style="display: inline-block; text-decoration: none; padding: 1rem 2rem;">
                        <i class="fas fa-download"></i> Télécharger ${filename}
                    </a>
                    <p style="margin-top: 1rem; font-size: 0.8rem; color: var(--text-muted);">
                        Le fichier sera enregistré dans votre dossier Téléchargements.
                    </p>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary close-download-modal">Fermer</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.close-download-modal').addEventListener('click', () => {
            modal.remove();
            URL.revokeObjectURL(url);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                URL.revokeObjectURL(url);
            }
        });
    }

    // ==================== KEYBOARD ====================

    handleKeyboard(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key) {
            case ' ':
                e.preventDefault();
                this.togglePlay();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.seekTo(this.video.currentTime - 5);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.seekTo(this.video.currentTime + 5);
                break;
            case 'Delete':
            case 'Backspace':
                e.preventDefault();
                this.deleteSelectedClip();
                break;
            case 's':
                if (!e.ctrlKey && !e.metaKey) {
                    this.splitAtCursor();
                }
                break;
            case 'z':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    e.shiftKey ? this.redo() : this.undo();
                }
                break;
            case 'y':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.redo();
                }
                break;
            case 'Escape':
                this.closeExportModal();
                this.deselectClip();
                const panel = document.querySelector('.tool-options-panel');
                if (panel) panel.remove();
                break;
        }
    }

    // ==================== TOAST ====================

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        let icon = 'fa-info-circle';
        if (type === 'success') icon = 'fa-check-circle';
        if (type === 'error') icon = 'fa-exclamation-circle';
        if (type === 'warning') icon = 'fa-exclamation-triangle';

        toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideUp 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.videoEditor = new VideoEditor();
});
