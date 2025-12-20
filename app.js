/**
 * VideoEdit - Simple Video Editor (Clideo Style)
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
        this.timeRuler = document.getElementById('time-ruler');
        this.timelineTrack = document.getElementById('timeline-track');
        this.playhead = document.getElementById('playhead');

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
        this.videoDuration = 0;
        this.isPlaying = false;
        this.zoom = 1;
        this.clips = [];
        this.history = [];
        this.historyIndex = -1;

        // Timeline state
        this.trimStart = 0;
        this.trimEnd = 0;
        this.playbackSpeed = 1;

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

        // Timeline click to seek
        this.timelineTrack.addEventListener('click', (e) => this.seekToPosition(e));
        this.timeRuler.addEventListener('click', (e) => this.seekToPosition(e));

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

        // Drag and drop
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => this.handleDrop(e));
    }

    setupTouchEvents() {
        // Touch events for timeline seeking
        let isTouchingTimeline = false;

        const handleTimelineTouch = (e) => {
            if (!this.videoDuration) return;
            const rect = this.timelineTrack.getBoundingClientRect();
            const touch = e.touches[0];
            const x = touch.clientX - rect.left;
            const percent = Math.max(0, Math.min(1, x / rect.width));
            const time = percent * this.videoDuration;
            this.seekTo(time);
        };

        this.timelineTrack.addEventListener('touchstart', (e) => {
            e.preventDefault();
            isTouchingTimeline = true;
            handleTimelineTouch(e);
        }, { passive: false });

        this.timelineTrack.addEventListener('touchmove', (e) => {
            if (isTouchingTimeline) {
                e.preventDefault();
                handleTimelineTouch(e);
            }
        }, { passive: false });

        this.timelineTrack.addEventListener('touchend', () => {
            isTouchingTimeline = false;
        });

        // Touch for play button
        this.playBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.togglePlay();
        });
    }

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
        const url = URL.createObjectURL(file);
        this.video.src = url;
        this.video.load();

        // Switch to editor
        this.homeScreen.classList.add('hidden');
        this.editorScreen.classList.add('active');

        this.showToast('Vidéo chargée avec succès', 'success');
    }

    onVideoLoaded() {
        this.videoDuration = this.video.duration;
        this.trimStart = 0;
        this.trimEnd = this.videoDuration;

        this.updateTimeDisplay();
        this.renderTimeline();
        this.saveState();
    }

    onTimeUpdate() {
        this.updateTimeDisplay();
        this.updatePlayhead();

        // Check if we reached the trim end
        if (this.video.currentTime >= this.trimEnd) {
            this.video.pause();
            this.video.currentTime = this.trimStart;
            this.isPlaying = false;
            this.updatePlayButton();
        }
    }

    onVideoEnded() {
        this.isPlaying = false;
        this.updatePlayButton();
        this.video.currentTime = this.trimStart;
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
            // Start from trim start if at beginning or before
            if (this.video.currentTime < this.trimStart) {
                this.video.currentTime = this.trimStart;
            }
            this.video.playbackRate = this.playbackSpeed;
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
        time = Math.max(this.trimStart, Math.min(this.trimEnd, time));
        this.video.currentTime = time;
        this.updatePlayhead();
    }

    seekToPosition(e) {
        if (!this.videoDuration) return;

        const rect = this.timelineTrack.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, x / rect.width));
        const time = percent * this.videoDuration;

        this.seekTo(time);
    }

    updatePlayhead() {
        if (!this.videoDuration) return;

        const percent = (this.video.currentTime / this.videoDuration) * 100;
        this.playhead.style.left = `${percent}%`;
    }

    renderTimeline() {
        // Clear previous
        this.timeRuler.innerHTML = '';

        // Remove existing clip
        const existingClip = this.timelineTrack.querySelector('.timeline-clip');
        if (existingClip) existingClip.remove();

        if (!this.videoDuration) return;

        // Create time markers
        const duration = this.videoDuration;
        const markerInterval = this.calculateMarkerInterval(duration);

        for (let t = 0; t <= duration; t += markerInterval) {
            const marker = document.createElement('span');
            marker.className = 'time-marker';
            marker.textContent = this.formatTime(t);
            marker.style.left = `${(t / duration) * 100}%`;
            this.timeRuler.appendChild(marker);
        }

        // Create video clip on timeline
        const clip = document.createElement('div');
        clip.className = 'timeline-clip';

        const startPercent = (this.trimStart / duration) * 100;
        const clipWidth = ((this.trimEnd - this.trimStart) / duration) * 100;

        clip.style.left = `${startPercent}%`;
        clip.style.width = `${clipWidth}%`;

        // Add thumbnail preview (simplified - just gradient)
        clip.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

        this.timelineTrack.appendChild(clip);

        // Update playhead position
        this.updatePlayhead();
    }

    calculateMarkerInterval(duration) {
        if (duration <= 10) return 1;
        if (duration <= 30) return 5;
        if (duration <= 60) return 10;
        if (duration <= 300) return 30;
        return 60;
    }

    zoomIn() {
        this.zoom = Math.min(4, this.zoom * 1.5);
        this.applyZoom();
    }

    zoomOut() {
        this.zoom = Math.max(0.5, this.zoom / 1.5);
        this.applyZoom();
    }

    zoomFit() {
        this.zoom = 1;
        this.applyZoom();
    }

    applyZoom() {
        // Apply zoom to timeline
        this.timelineTrack.style.transform = `scaleX(${this.zoom})`;
        this.timelineTrack.style.transformOrigin = 'left center';
        this.timeRuler.style.transform = `scaleX(${this.zoom})`;
        this.timeRuler.style.transformOrigin = 'left center';
    }

    handleTool(tool) {
        switch (tool) {
            case 'split':
                this.splitClip();
                break;
            case 'adjust':
                this.showAdjustPanel();
                break;
            case 'speed':
                this.showSpeedPanel();
                break;
            case 'delete':
                this.deleteClip();
                break;
            case 'transform':
                this.showTransformPanel();
                break;
            case 'filters':
                this.showFiltersPanel();
                break;
            case 'text':
                this.showTextPanel();
                break;
            case 'audio':
                this.showAudioPanel();
                break;
            case 'rotate':
                this.rotateVideo();
                break;
        }
    }

    splitClip() {
        const currentTime = this.video.currentTime;

        if (currentTime <= this.trimStart || currentTime >= this.trimEnd) {
            this.showToast('Positionnez le curseur dans la vidéo pour couper', 'warning');
            return;
        }

        // Create two clips from the split
        this.clips = [
            { start: this.trimStart, end: currentTime },
            { start: currentTime, end: this.trimEnd }
        ];

        this.showToast('Vidéo divisée à ' + this.formatTime(currentTime), 'success');
        this.saveState();
    }

    deleteClip() {
        const currentTime = this.video.currentTime;

        // If we have clips, delete the one at current time
        if (this.clips.length > 0) {
            const clipIndex = this.clips.findIndex(c =>
                currentTime >= c.start && currentTime <= c.end
            );

            if (clipIndex !== -1) {
                this.clips.splice(clipIndex, 1);
                this.showToast('Segment supprimé', 'success');
                this.saveState();
                return;
            }
        }

        // If no clips or no clip at current time, offer to delete all
        if (confirm('Voulez-vous supprimer toute la vidéo et recommencer ?')) {
            this.goBack();
        }
    }

    showSpeedPanel() {
        const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
        const currentSpeed = this.playbackSpeed;

        const panel = this.createToolPanel('Vitesse', `
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
                this.playbackSpeed = parseFloat(btn.dataset.speed);
                this.video.playbackRate = this.playbackSpeed;

                // Update active state
                panel.querySelectorAll('.speed-preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                this.showToast(`Vitesse: ${this.playbackSpeed}x`, 'success');
                this.saveState();
            });
        });
    }

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
            { name: 'Noir & Blanc', filter: 'grayscale(100%)' },
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

    showTextPanel() {
        this.showToast('Fonctionnalité texte à venir', 'info');
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
        // Remove existing panel
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

    goBack() {
        if (confirm('Voulez-vous vraiment quitter l\'éditeur ?')) {
            // Reset state
            this.video.src = '';
            this.video.style.filter = '';
            this.video.style.transform = '';
            this.videoFile = null;
            this.videoDuration = 0;
            this.clips = [];
            this.trimStart = 0;
            this.trimEnd = 0;
            this.playbackSpeed = 1;
            this.isPlaying = false;

            // Clear timeline
            this.timeRuler.innerHTML = '';
            const clip = this.timelineTrack.querySelector('.timeline-clip');
            if (clip) clip.remove();

            // Switch screens
            this.editorScreen.classList.remove('active');
            this.homeScreen.classList.remove('hidden');

            // Reset file input
            this.fileInput.value = '';
        }
    }

    // History (Undo/Redo)
    saveState() {
        const state = {
            trimStart: this.trimStart,
            trimEnd: this.trimEnd,
            clips: [...this.clips],
            playbackSpeed: this.playbackSpeed
        };

        // Remove future states if we're in the middle of history
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
        this.trimStart = state.trimStart;
        this.trimEnd = state.trimEnd;
        this.clips = [...state.clips];
        this.playbackSpeed = state.playbackSpeed;
        this.video.playbackRate = this.playbackSpeed;

        this.renderTimeline();
        this.updateHistoryButtons();
    }

    updateHistoryButtons() {
        this.undoBtn.style.opacity = this.historyIndex > 0 ? '1' : '0.5';
        this.redoBtn.style.opacity = this.historyIndex < this.history.length - 1 ? '1' : '0.5';
    }

    // Export
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
            // Get video dimensions based on quality
            let width, height;
            switch (quality) {
                case '1080p':
                    width = 1920;
                    height = 1080;
                    break;
                case '720p':
                    width = 1280;
                    height = 720;
                    break;
                case '480p':
                    width = 854;
                    height = 480;
                    break;
            }

            // Create canvas for export
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            // Setup MediaRecorder
            const mimeType = format === 'webm' ? 'video/webm;codecs=vp9' : 'video/webm';
            const stream = canvas.captureStream(30);
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: mimeType,
                videoBitsPerSecond: quality === '1080p' ? 8000000 : quality === '720p' ? 5000000 : 2500000
            });

            const chunks = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                await this.saveFile(blob, `video-export.${format === 'webm' ? 'webm' : 'webm'}`);

                this.progressFill.style.width = '100%';
                this.progressText.textContent = '100% - Terminé!';
                this.showToast('Export terminé!', 'success');

                setTimeout(() => {
                    this.closeExportModal();
                    this.startExportBtn.disabled = false;
                }, 1500);
            };

            // Start recording
            mediaRecorder.start(100);

            // Play video and render to canvas
            const tempVideo = document.createElement('video');
            tempVideo.src = this.video.src;
            tempVideo.muted = true;
            tempVideo.currentTime = this.trimStart;

            await new Promise(resolve => {
                tempVideo.onloadeddata = resolve;
            });

            const duration = this.trimEnd - this.trimStart;
            const startTime = Date.now();

            const renderFrame = () => {
                const elapsed = (Date.now() - startTime) / 1000;
                const progress = Math.min(elapsed / duration, 1);

                this.progressFill.style.width = `${Math.round(progress * 100)}%`;
                this.progressText.textContent = `${Math.round(progress * 100)}%`;

                // Apply any filters
                ctx.filter = this.video.style.filter || 'none';

                // Draw video frame
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
            // Try using File System Access API
            if ('showSaveFilePicker' in window) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: 'Video File',
                        accept: { 'video/*': ['.webm', '.mp4'] }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
            } else {
                // Fallback to download
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                // Fallback to download if picker was cancelled
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
            }
        }
    }

    handleKeyboard(e) {
        // Don't handle shortcuts when typing in inputs
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
            case 's':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.openExportModal();
                }
                break;
            case 'Escape':
                this.closeExportModal();
                const panel = document.querySelector('.tool-options-panel');
                if (panel) panel.remove();
                break;
        }
    }

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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.videoEditor = new VideoEditor();
});
