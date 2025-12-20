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
        this.scissorCursor = document.getElementById('scissor-cursor');

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

        // Clips state - array of clips on different tracks
        this.clips = [];
        this.clipIdCounter = 0;
        this.selectedClip = null;

        // Scissor cursor state
        this.scissorTime = 0;
        this.scissorVisible = false;

        // Drag state
        this.isDragging = false;
        this.dragClip = null;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragOffsetX = 0;
        this.longPressTimer = null;

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
        this.fileInput.addEventListener('change', (e) => this.handleFileImport(e));

        // Header buttons
        this.backBtn.addEventListener('click', () => this.goBack());
        this.undoBtn.addEventListener('click', () => this.undo());
        this.redoBtn.addEventListener('click', () => this.redo());
        this.exportBtn.addEventListener('click', () => this.openExportModal());

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

        // Timeline click for scissor cursor
        this.tracksWrapper.addEventListener('click', (e) => this.handleTimelineClick(e));
        this.tracksWrapper.addEventListener('mousemove', (e) => this.handleTimelineMouseMove(e));
        this.tracksWrapper.addEventListener('mouseleave', () => this.hideScissorCursor());

        // Tools
        this.toolBtns.forEach(btn => {
            btn.addEventListener('click', () => this.handleTool(btn.dataset.tool));
        });

        this.panelToolBtns.forEach(btn => {
            btn.addEventListener('click', () => this.handleTool(btn.dataset.tool));
        });

        // More tools button
        this.moreToolsBtn.addEventListener('click', () => this.toggleToolsPanel());

        // Export modal
        this.closeExportBtn.addEventListener('click', () => this.closeExportModal());
        this.startExportBtn.addEventListener('click', () => this.startExport());
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
        let touchStartX = 0;
        let touchStartTime = 0;

        this.tracksWrapper.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartTime = Date.now();

            // Show scissor at touch position
            const rect = this.tracksWrapper.getBoundingClientRect();
            const x = e.touches[0].clientX - rect.left;
            this.showScissorCursor(x);
        }, { passive: true });

        this.tracksWrapper.addEventListener('touchmove', (e) => {
            const rect = this.tracksWrapper.getBoundingClientRect();
            const x = e.touches[0].clientX - rect.left;
            this.showScissorCursor(x);
        }, { passive: true });

        this.tracksWrapper.addEventListener('touchend', (e) => {
            const touchDuration = Date.now() - touchStartTime;

            // Short tap = position scissor, long press handled by clip
            if (touchDuration < 300) {
                // Keep scissor visible at this position
            }
        });

        // Touch for play button
        this.playBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.togglePlay();
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
            startTime: 0,           // Position on timeline
            sourceStart: 0,         // Start in source video
            sourceEnd: this.videoDuration,  // End in source video
            duration: this.videoDuration,
            speed: 1,
            name: this.videoFile.name.substring(0, 20)
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
        // Clear previous rulers
        this.timeRuler.innerHTML = '';

        if (!this.videoDuration) return;

        // Calculate timeline width
        const timelineWidth = this.videoDuration * this.pixelsPerSecond * this.zoom;
        this.timeRuler.style.width = `${timelineWidth}px`;
        this.tracksWrapper.style.width = `${timelineWidth}px`;

        // Create time markers
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
        // Clear all clips from tracks
        this.tracks.forEach(track => {
            const existingClips = track.querySelectorAll('.timeline-clip');
            existingClips.forEach(clip => clip.remove());
        });

        // Render each clip
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

        // Calculate position and width
        const left = clip.startTime * this.pixelsPerSecond * this.zoom;
        const width = clip.duration * this.pixelsPerSecond * this.zoom;

        clipEl.style.left = `${left}px`;
        clipEl.style.width = `${width}px`;

        // Clip content
        clipEl.innerHTML = `
            <div class="resize-handle left"></div>
            <div class="clip-content">
                <span class="clip-name">${clip.name}</span>
                ${clip.speed !== 1 ? `<span class="clip-speed">${clip.speed}x</span>` : ''}
            </div>
            <div class="resize-handle right"></div>
        `;

        // Selection
        if (this.selectedClip && this.selectedClip.id === clip.id) {
            clipEl.classList.add('selected');
        }

        // Click to select
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

        // Touch events for long press drag
        let longPressTimer = null;
        let touchStartPos = null;

        clipEl.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };

            // Select on touch
            this.selectClip(clip);

            // Start long press timer for drag
            longPressTimer = setTimeout(() => {
                clipEl.classList.add('dragging');
                this.startTouchDrag(clip, e);
                // Haptic feedback if available
                if (navigator.vibrate) navigator.vibrate(50);
            }, 500);
        }, { passive: false });

        clipEl.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            const dx = Math.abs(touch.clientX - touchStartPos.x);
            const dy = Math.abs(touch.clientY - touchStartPos.y);

            // Cancel long press if moved too much
            if (dx > 10 || dy > 10) {
                clearTimeout(longPressTimer);
            }

            // If dragging, handle move
            if (this.isDragging && this.dragClip && this.dragClip.id === clip.id) {
                e.preventDefault();
                this.handleTouchMove(e);
            }
        }, { passive: false });

        clipEl.addEventListener('touchend', (e) => {
            clearTimeout(longPressTimer);
            if (this.isDragging) {
                this.endDrag();
            }
        });

        track.appendChild(clipEl);
    }

    selectClip(clip) {
        // Deselect previous
        const prevSelected = document.querySelector('.timeline-clip.selected');
        if (prevSelected) prevSelected.classList.remove('selected');

        // Select new
        this.selectedClip = clip;
        const clipEl = document.querySelector(`[data-clip-id="${clip.id}"]`);
        if (clipEl) clipEl.classList.add('selected');
    }

    deselectClip() {
        const selected = document.querySelector('.timeline-clip.selected');
        if (selected) selected.classList.remove('selected');
        this.selectedClip = null;
    }

    // ==================== SCISSOR CURSOR ====================

    handleTimelineClick(e) {
        // If clicked on a clip, don't show scissor
        if (e.target.closest('.timeline-clip')) return;

        const rect = this.tracksWrapper.getBoundingClientRect();
        const x = e.clientX - rect.left;
        this.showScissorCursor(x);

        // Update video position to scissor time
        this.seekTo(this.scissorTime);
    }

    handleTimelineMouseMove(e) {
        if (this.isDragging) return;
        if (e.target.closest('.timeline-clip')) {
            this.hideScissorCursor();
            return;
        }

        const rect = this.tracksWrapper.getBoundingClientRect();
        const x = e.clientX - rect.left;
        this.showScissorCursor(x);
    }

    showScissorCursor(x) {
        this.scissorTime = x / (this.pixelsPerSecond * this.zoom);
        this.scissorTime = Math.max(0, Math.min(this.videoDuration, this.scissorTime));

        this.scissorCursor.style.left = `${x}px`;
        this.scissorCursor.classList.add('visible');
        this.scissorVisible = true;
    }

    hideScissorCursor() {
        this.scissorCursor.classList.remove('visible');
        this.scissorVisible = false;
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

        // Calculate new position
        const wrapperRect = this.tracksWrapper.getBoundingClientRect();
        const x = e.clientX - wrapperRect.left - this.dragOffsetX;
        const y = e.clientY - wrapperRect.top;

        // Update clip position visually
        clipEl.style.left = `${Math.max(0, x)}px`;

        // Determine which track we're over
        this.updateDropTarget(y);
    }

    handleTouchMove(e) {
        if (!this.isDragging || !this.dragClip) return;

        const touch = e.touches[0];
        const clipEl = document.querySelector(`[data-clip-id="${this.dragClip.id}"]`);
        if (!clipEl) return;

        const wrapperRect = this.tracksWrapper.getBoundingClientRect();
        const x = touch.clientX - wrapperRect.left - this.dragOffsetX;
        const y = touch.clientY - wrapperRect.top;

        clipEl.style.left = `${Math.max(0, x)}px`;
        this.updateDropTarget(y);
    }

    updateDropTarget(y) {
        // Clear previous drop target
        this.tracks.forEach(track => track.classList.remove('drop-target'));

        // Find which track we're over
        let trackIndex = Math.floor(y / 55);
        trackIndex = Math.max(0, Math.min(this.tracks.length - 1, trackIndex));

        this.tracks[trackIndex].classList.add('drop-target');
        this.dragClip.targetTrack = trackIndex;
    }

    handleMouseUp(e) {
        if (!this.isDragging) return;
        this.endDrag();
    }

    endDrag() {
        if (!this.dragClip) return;

        const clipEl = document.querySelector(`[data-clip-id="${this.dragClip.id}"]`);
        if (clipEl) {
            clipEl.classList.remove('dragging');

            // Get final position
            const left = parseFloat(clipEl.style.left);
            const newStartTime = left / (this.pixelsPerSecond * this.zoom);

            // Update clip data
            this.dragClip.startTime = Math.max(0, newStartTime);

            // Change track if needed
            if (this.dragClip.targetTrack !== undefined) {
                this.dragClip.trackIndex = this.dragClip.targetTrack;
                delete this.dragClip.targetTrack;
            }
        }

        // Clear drop targets
        this.tracks.forEach(track => track.classList.remove('drop-target'));

        this.isDragging = false;
        this.dragClip = null;

        // Re-render and save
        this.renderClips();
        this.saveState();
    }

    // ==================== TOOLS ====================

    handleTool(tool) {
        switch (tool) {
            case 'split':
                this.splitAtScissor();
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

    // ==================== SPLIT ====================

    splitAtScissor() {
        if (!this.scissorVisible) {
            this.showToast('Touchez la timeline pour positionner le curseur de coupe', 'warning');
            return;
        }

        const splitTime = this.scissorTime;

        // Find clip at scissor position
        let clipToSplit = null;
        for (const clip of this.clips) {
            const clipEnd = clip.startTime + clip.duration;
            if (splitTime > clip.startTime && splitTime < clipEnd) {
                clipToSplit = clip;
                break;
            }
        }

        if (!clipToSplit) {
            this.showToast('Positionnez le curseur sur un clip pour le diviser', 'warning');
            return;
        }

        // Calculate split point relative to clip
        const relativeTime = splitTime - clipToSplit.startTime;
        const sourceRelativeTime = (relativeTime / clipToSplit.duration) * (clipToSplit.sourceEnd - clipToSplit.sourceStart);

        // Create two new clips
        const clip1 = {
            id: this.clipIdCounter++,
            trackIndex: clipToSplit.trackIndex,
            startTime: clipToSplit.startTime,
            sourceStart: clipToSplit.sourceStart,
            sourceEnd: clipToSplit.sourceStart + sourceRelativeTime,
            duration: relativeTime,
            speed: clipToSplit.speed,
            name: clipToSplit.name + ' (1)'
        };

        const clip2 = {
            id: this.clipIdCounter++,
            trackIndex: clipToSplit.trackIndex,
            startTime: splitTime,
            sourceStart: clipToSplit.sourceStart + sourceRelativeTime,
            sourceEnd: clipToSplit.sourceEnd,
            duration: clipToSplit.duration - relativeTime,
            speed: clipToSplit.speed,
            name: clipToSplit.name + ' (2)'
        };

        // Remove original clip and add new ones
        const index = this.clips.findIndex(c => c.id === clipToSplit.id);
        this.clips.splice(index, 1, clip1, clip2);

        // Select the second clip
        this.selectClip(clip2);

        this.renderClips();
        this.saveState();
        this.showToast('Clip divisé en deux segments', 'success');
    }

    // ==================== DELETE ====================

    deleteSelectedClip() {
        if (!this.selectedClip) {
            this.showToast('Sélectionnez d\'abord un clip à supprimer', 'warning');
            return;
        }

        // Don't allow deleting the last clip
        if (this.clips.length === 1) {
            this.showToast('Impossible de supprimer le dernier clip', 'warning');
            return;
        }

        const index = this.clips.findIndex(c => c.id === this.selectedClip.id);
        if (index !== -1) {
            this.clips.splice(index, 1);
            this.selectedClip = null;
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

                // Update UI
                panel.querySelectorAll('.speed-preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                this.showToast(`Vitesse: ${newSpeed}x`, 'success');
            });
        });
    }

    setClipSpeed(clip, speed) {
        // Adjust duration based on speed
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
                <label>
                    <span>Luminosité</span>
                    <span id="brightness-value">100%</span>
                </label>
                <input type="range" id="brightness-slider" min="50" max="150" value="100">
            </div>
            <div class="slider-control">
                <label>
                    <span>Contraste</span>
                    <span id="contrast-value">100%</span>
                </label>
                <input type="range" id="contrast-slider" min="50" max="150" value="100">
            </div>
            <div class="slider-control">
                <label>
                    <span>Saturation</span>
                    <span id="saturation-value">100%</span>
                </label>
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

            this.video.style.filter = `
                brightness(${brightness}%)
                contrast(${contrast}%)
                saturate(${saturation}%)
            `;
        };

        panel.querySelectorAll('input[type="range"]').forEach(slider => {
            slider.addEventListener('input', updateFilters);
        });
    }

    showTransformPanel() {
        const panel = this.createToolPanel('Transformer', `
            <div class="speed-presets">
                <button class="speed-preset-btn" data-action="flip-h">
                    <i class="fas fa-arrows-alt-h"></i> Miroir H
                </button>
                <button class="speed-preset-btn" data-action="flip-v">
                    <i class="fas fa-arrows-alt-v"></i> Miroir V
                </button>
                <button class="speed-preset-btn" data-action="rotate-left">
                    <i class="fas fa-undo"></i> -90°
                </button>
                <button class="speed-preset-btn" data-action="rotate-right">
                    <i class="fas fa-redo"></i> +90°
                </button>
            </div>
        `);

        let rotation = 0;
        let scaleX = 1;
        let scaleY = 1;

        panel.querySelectorAll('.speed-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;

                switch (action) {
                    case 'flip-h':
                        scaleX *= -1;
                        break;
                    case 'flip-v':
                        scaleY *= -1;
                        break;
                    case 'rotate-left':
                        rotation -= 90;
                        break;
                    case 'rotate-right':
                        rotation += 90;
                        break;
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
            { name: 'Chaud', filter: 'saturate(120%) hue-rotate(-20deg)' },
            { name: 'Vif', filter: 'saturate(150%) contrast(110%)' },
            { name: 'Fondu', filter: 'contrast(80%) brightness(110%)' }
        ];

        const panel = this.createToolPanel('Filtres', `
            <div class="speed-presets" style="flex-wrap: wrap;">
                ${filters.map((f, i) => `
                    <button class="speed-preset-btn ${i === 0 ? 'active' : ''}" data-filter="${f.filter}">
                        ${f.name}
                    </button>
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
                <label>
                    <span>Volume</span>
                    <span id="volume-value">100%</span>
                </label>
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
            <div class="tool-options-body">
                ${content}
            </div>
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
        const format = this.exportFormat.value;
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

            const mimeType = 'video/webm;codecs=vp9';
            const stream = canvas.captureStream(30);
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: mimeType,
                videoBitsPerSecond: quality === '1080p' ? 8000000 : quality === '720p' ? 5000000 : 2500000
            });

            const chunks = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                await this.saveFile(blob, `video-export.webm`);

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
            this.showToast('Erreur lors de l\'export: ' + error.message, 'error');
            this.startExportBtn.disabled = false;
        }
    }

    async saveFile(blob, filename) {
        try {
            if ('showSaveFilePicker' in window) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{ description: 'Video File', accept: { 'video/*': ['.webm', '.mp4'] } }]
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
            }
        }
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
                    this.splitAtScissor();
                }
                break;
            case 'z':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.redo();
                    } else {
                        this.undo();
                    }
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

        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;

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
