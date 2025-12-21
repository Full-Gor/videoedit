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
        this.previewArea = document.getElementById('preview-area');
        this.orientationBtn = document.getElementById('orientation-btn');
        this.isPortrait = false;

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

        // FAB Menu
        this.fabMain = document.getElementById('fab-main');
        this.fabMenu = document.getElementById('fab-menu');
        this.fabContainer = document.getElementById('fab-container');
        this.fabItems = document.querySelectorAll('.fab-item');
        this.fabOpen = false;
        this.fabRotation = 0; // Angle de rotation actuel
        this.fabRadius = 75; // Rayon du cercle
        this.fabDragging = false;
        this.fabStartAngle = 0;
        this.fabDidRotate = false; // Pour différencier rotation et clic

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
        this.clipboardClip = null; // Presse-papier pour copier/coller

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

        // Split mode state
        this.splitMode = false;
        this.splitStartTime = null;
        this.splitEndTime = null;
        this.splitStartMarker = null;
        this.splitEndMarker = null;
        this.splitSelection = null;
        this.splitInstruction = null;

        // Speed mode state
        this.speedMode = false;
        this.speedStartTime = null;
        this.speedEndTime = null;
        this.speedStartMarker = null;
        this.speedEndMarker = null;
        this.speedSelection = null;

        // Text overlays state
        this.textOverlays = [];
        this.textIdCounter = 0;
        this.selectedTextOverlay = null;
        this.textOverlaysContainer = document.getElementById('text-overlays');
        this.isDraggingText = false;
        this.isResizingText = false;
        this.textDragOffset = { x: 0, y: 0 };

        // Current playback clip index
        this.currentClipIndex = 0;

        // Timeline touch state (pour différencier scroll et tap)
        this.timelineTouchStart = null;
        this.timelineTouchMoved = false;

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

        // Orientation toggle
        this.orientationBtn.addEventListener('click', () => this.toggleOrientation());
        this.orientationBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.toggleOrientation();
        });

        // Video events
        this.video.addEventListener('loadedmetadata', () => this.onVideoLoaded());
        this.video.addEventListener('timeupdate', () => this.onTimeUpdate());
        this.video.addEventListener('ended', () => this.onVideoEnded());
        this.video.addEventListener('click', () => this.togglePlay());

        // Deselect text when clicking on preview area
        this.previewArea.addEventListener('click', (e) => {
            if (!e.target.closest('.text-overlay') && !e.target.closest('.fab-container')) {
                this.deselectTextOverlays();
            }
        });

        // Zoom controls
        this.zoomInBtn.addEventListener('click', () => this.zoomIn());
        this.zoomOutBtn.addEventListener('click', () => this.zoomOut());
        this.zoomFitBtn.addEventListener('click', () => this.zoomFit());

        // Timeline click to position cut cursor
        this.tracksWrapper.addEventListener('click', (e) => this.handleTimelineClick(e));

        // FAB Menu
        this.fabMain.addEventListener('click', () => this.toggleFabMenu());
        this.fabMain.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.toggleFabMenu();
        });

        // FAB Items - seulement si pas de rotation
        this.fabItems.forEach(item => {
            item.addEventListener('click', (e) => {
                if (this.fabDidRotate) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                this.handleTool(item.dataset.tool);
                this.closeFabMenu();
            });
            item.addEventListener('touchend', (e) => {
                if (this.fabDidRotate) {
                    e.preventDefault();
                    return;
                }
                e.preventDefault();
                this.handleTool(item.dataset.tool);
                this.closeFabMenu();
            });
        });

        // Close FAB when clicking outside
        document.addEventListener('click', (e) => {
            if (this.fabOpen && !e.target.closest('.fab-container')) {
                this.closeFabMenu();
            }
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
        // Touch events for timeline - différencier scroll et tap
        this.tracksWrapper.addEventListener('touchstart', (e) => {
            if (!e.target.closest('.timeline-clip')) {
                this.timelineTouchStart = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY,
                    time: Date.now()
                };
                this.timelineTouchMoved = false;
            }
        }, { passive: true });

        this.tracksWrapper.addEventListener('touchmove', (e) => {
            if (this.timelineTouchStart) {
                const dx = Math.abs(e.touches[0].clientX - this.timelineTouchStart.x);
                const dy = Math.abs(e.touches[0].clientY - this.timelineTouchStart.y);
                // Si mouvement > 10px, c'est un scroll
                if (dx > 10 || dy > 10) {
                    this.timelineTouchMoved = true;
                }
            }
        }, { passive: true });

        this.tracksWrapper.addEventListener('touchend', (e) => {
            if (!e.target.closest('.timeline-clip') && this.timelineTouchStart) {
                const elapsed = Date.now() - this.timelineTouchStart.time;

                // Seulement si c'est un tap (pas de mouvement, < 300ms)
                if (!this.timelineTouchMoved && elapsed < 300) {
                    // Utiliser le conteneur pour le calcul (comme handleTimelineClick)
                    const containerRect = this.timelineContainer.getBoundingClientRect();
                    const scrollLeft = this.timelineContainer.scrollLeft;
                    const x = this.timelineTouchStart.x - containerRect.left + scrollLeft;
                    const time = x / (this.pixelsPerSecond * this.zoom);
                    const clampedTime = Math.max(0, Math.min(this.videoDuration, time));

                    if (this.splitMode) {
                        this.handleSplitClick(clampedTime);
                    } else if (this.speedMode) {
                        this.handleSpeedClick(clampedTime);
                    } else {
                        this.positionCutCursor(x);
                        this.seekTo(clampedTime);
                    }
                }

                this.timelineTouchStart = null;
                this.timelineTouchMoved = false;
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
        if (file) {
            // Vérifier par extension si le type MIME n'est pas défini
            const validExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.m4v'];
            const fileName = file.name.toLowerCase();
            const isVideo = file.type.startsWith('video/') ||
                           validExtensions.some(ext => fileName.endsWith(ext));

            if (isVideo) {
                this.loadVideo(file);
            } else {
                this.showToast('Format de fichier non supporté', 'error');
            }
        }
    }

    loadVideo(file) {
        this.videoFile = file;
        this.videoUrl = URL.createObjectURL(file);
        this.video.src = this.videoUrl;

        // Gestion des erreurs de chargement vidéo
        this.video.onerror = () => {
            this.showToast('Erreur lors du chargement de la vidéo', 'error');
            console.error('Video load error:', this.video.error);
        };

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

    // ==================== FAB MENU ROTATIF ====================

    toggleFabMenu() {
        this.fabOpen = !this.fabOpen;
        this.fabMain.classList.toggle('active', this.fabOpen);
        this.fabMenu.classList.toggle('active', this.fabOpen);

        if (this.fabOpen) {
            this.updateFabPositions();
            this.setupFabRotation();
        } else {
            this.cleanupFabRotation();
        }
    }

    closeFabMenu() {
        this.fabOpen = false;
        this.fabMain.classList.remove('active');
        this.fabMenu.classList.remove('active');
        this.cleanupFabRotation();
    }

    updateFabPositions() {
        const itemCount = this.fabItems.length;
        const angleStep = (2 * Math.PI) / itemCount;
        // Commence en haut à droite (pour éviter le coin)
        const startAngle = -Math.PI / 2;

        this.fabItems.forEach((item, index) => {
            const angle = startAngle + (index * angleStep) + (this.fabRotation * Math.PI / 180);
            const x = Math.cos(angle) * this.fabRadius;
            const y = Math.sin(angle) * this.fabRadius;

            item.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(1)`;
        });
    }

    setupFabRotation() {
        // Mouse events
        this.fabRotateMouseMove = (e) => this.handleFabRotateMove(e.clientX, e.clientY);
        this.fabRotateMouseUp = () => this.handleFabRotateEnd();

        // Touch events
        this.fabRotateTouchMove = (e) => {
            if (e.touches.length === 1) {
                this.handleFabRotateMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        };
        this.fabRotateTouchEnd = () => this.handleFabRotateEnd();

        // Add listeners to fab items for rotation drag
        this.fabItems.forEach(item => {
            item.addEventListener('mousedown', this.handleFabRotateStart.bind(this));
            item.addEventListener('touchstart', this.handleFabRotateTouchStart.bind(this), { passive: true });
        });
    }

    cleanupFabRotation() {
        document.removeEventListener('mousemove', this.fabRotateMouseMove);
        document.removeEventListener('mouseup', this.fabRotateMouseUp);
        document.removeEventListener('touchmove', this.fabRotateTouchMove);
        document.removeEventListener('touchend', this.fabRotateTouchEnd);
    }

    handleFabRotateStart(e) {
        if (e.target.closest('.fab-item')) {
            this.fabDragging = true;
            this.fabDidRotate = false;
            this.fabStartAngle = this.getAngleFromCenter(e.clientX, e.clientY);
            this.fabStartRotation = this.fabRotation;

            document.addEventListener('mousemove', this.fabRotateMouseMove);
            document.addEventListener('mouseup', this.fabRotateMouseUp);

            e.preventDefault();
        }
    }

    handleFabRotateTouchStart(e) {
        if (e.target.closest('.fab-item') && e.touches.length === 1) {
            this.fabDragging = true;
            this.fabDidRotate = false;
            this.fabStartAngle = this.getAngleFromCenter(e.touches[0].clientX, e.touches[0].clientY);
            this.fabStartRotation = this.fabRotation;

            document.addEventListener('touchmove', this.fabRotateTouchMove, { passive: true });
            document.addEventListener('touchend', this.fabRotateTouchEnd);
        }
    }

    handleFabRotateMove(clientX, clientY) {
        if (!this.fabDragging) return;

        const currentAngle = this.getAngleFromCenter(clientX, clientY);
        const angleDiff = (currentAngle - this.fabStartAngle) * (180 / Math.PI);

        // Si rotation significative, marquer comme rotation (pas clic)
        if (Math.abs(angleDiff) > 5) {
            this.fabDidRotate = true;
        }

        this.fabRotation = this.fabStartRotation + angleDiff;
        this.updateFabPositions();
    }

    handleFabRotateEnd() {
        if (this.fabDragging) {
            this.fabDragging = false;
            document.removeEventListener('mousemove', this.fabRotateMouseMove);
            document.removeEventListener('mouseup', this.fabRotateMouseUp);
            document.removeEventListener('touchmove', this.fabRotateTouchMove);
            document.removeEventListener('touchend', this.fabRotateTouchEnd);

            // Reset après un court délai pour permettre au clic de vérifier
            setTimeout(() => {
                this.fabDidRotate = false;
            }, 100);
        }
    }

    getAngleFromCenter(clientX, clientY) {
        const rect = this.fabMain.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        return Math.atan2(clientY - centerY, clientX - centerX);
    }

    setActiveFabItem(tool) {
        this.fabItems.forEach(item => {
            item.classList.toggle('active', item.dataset.tool === tool);
        });
    }

    clearActiveFabItems() {
        this.fabItems.forEach(item => item.classList.remove('active'));
    }

    // ==================== PLAYBACK ====================

    onTimeUpdate() {
        this.updateTimeDisplay();
        this.updatePlayhead();
        this.checkClipBoundaries();
        this.updateTextOverlaysVisibility();
    }

    updateTextOverlaysVisibility() {
        const currentTime = this.video.currentTime;

        this.textOverlays.forEach(textData => {
            const overlay = document.querySelector(`[data-text-id="${textData.id}"]`);
            if (!overlay) return;

            const isVisible = currentTime >= textData.startTime && currentTime <= textData.endTime;
            overlay.style.display = isVisible ? 'block' : 'none';
        });
    }

    // Vérifie si on doit sauter à un autre segment et applique la vitesse
    checkClipBoundaries() {
        if (!this.isPlaying) return;

        const currentTime = this.video.currentTime;
        const sortedClips = this.getSortedClips();

        // Trouver le clip actuel basé sur sourceStart/sourceEnd
        let currentClip = null;
        for (const clip of sortedClips) {
            if (currentTime >= clip.sourceStart && currentTime < clip.sourceEnd) {
                currentClip = clip;
                break;
            }
        }

        // Appliquer la vitesse du clip actuel
        if (currentClip) {
            const targetRate = currentClip.speed || 1;
            if (this.video.playbackRate !== targetRate) {
                this.video.playbackRate = targetRate;
            }
        } else {
            // Reset à vitesse normale si pas dans un clip
            if (this.video.playbackRate !== 1) {
                this.video.playbackRate = 1;
            }
        }

        // Si on n'est pas dans un clip, sauter au prochain
        if (!currentClip && sortedClips.length > 0) {
            // Trouver le prochain clip après currentTime
            for (const clip of sortedClips) {
                if (clip.sourceStart > currentTime) {
                    this.video.currentTime = clip.sourceStart;
                    return;
                }
            }
            // Si aucun clip après, on a fini
            this.video.pause();
            this.isPlaying = false;
            this.updatePlayButton();
        }
    }

    getSortedClips() {
        return [...this.clips].sort((a, b) => a.startTime - b.startTime);
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
            // Commencer au premier clip si nécessaire
            if (this.clips.length > 0) {
                const sortedClips = this.getSortedClips();
                const firstClip = sortedClips[0];
                if (this.video.currentTime < firstClip.sourceStart) {
                    this.video.currentTime = firstClip.sourceStart;
                }
            }
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
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            this.previewArea.requestFullscreen();
        }
    }

    toggleOrientation() {
        this.isPortrait = !this.isPortrait;

        if (this.isPortrait) {
            this.previewArea.classList.remove('landscape');
            this.previewArea.classList.add('portrait');
            this.orientationBtn.classList.add('portrait');
            this.showToast('Mode portrait', 'success');
        } else {
            this.previewArea.classList.remove('portrait');
            this.previewArea.classList.add('landscape');
            this.orientationBtn.classList.remove('portrait');
            this.showToast('Mode paysage', 'success');
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

        const pixelsPerSecondZoomed = this.pixelsPerSecond * this.zoom;

        // Calculer les intervalles selon le zoom
        let majorInterval, labelInterval, tickInterval, showMs;

        if (pixelsPerSecondZoomed >= 500) {
            // Très zoomé : labels chaque seconde, ticks chaque 100ms
            majorInterval = 5;
            labelInterval = 1;
            tickInterval = 0.1;
            showMs = true;
        } else if (pixelsPerSecondZoomed >= 200) {
            // Zoomé : labels chaque seconde, ticks chaque 500ms
            majorInterval = 5;
            labelInterval = 1;
            tickInterval = 0.5;
            showMs = true;
        } else if (pixelsPerSecondZoomed >= 100) {
            // Normal : labels chaque seconde, ticks chaque seconde
            majorInterval = 10;
            labelInterval = 1;
            tickInterval = 1;
            showMs = false;
        } else if (pixelsPerSecondZoomed >= 50) {
            // Dézoomé : labels chaque 5 secondes
            majorInterval = 30;
            labelInterval = 5;
            tickInterval = 5;
            showMs = false;
        } else {
            // Très dézoomé : labels chaque 10 secondes
            majorInterval = 60;
            labelInterval = 10;
            tickInterval = 10;
            showMs = false;
        }

        // Créer tous les marqueurs
        for (let t = 0; t <= this.videoDuration; t += tickInterval) {
            // Arrondir pour éviter les erreurs de floating point
            const time = Math.round(t * 1000) / 1000;
            const position = time * pixelsPerSecondZoomed;

            // Déterminer le type de marqueur
            const isMajor = Math.abs(time % majorInterval) < 0.01;
            const isLabeled = Math.abs(time % labelInterval) < 0.01;

            // Trait
            const tick = document.createElement('div');
            tick.className = isMajor ? 'time-tick major' : 'time-tick minor';
            tick.style.left = `${position}px`;
            this.timeRuler.appendChild(tick);

            // Label si nécessaire
            if (isLabeled) {
                const label = document.createElement('span');
                label.className = isMajor ? 'time-marker major' : 'time-marker minor';
                label.textContent = showMs ? this.formatTimeMs(time) : this.formatTimeShort(time);
                label.style.left = `${position}px`;
                this.timeRuler.appendChild(label);
            }
        }
    }

    formatTimeMs(seconds) {
        if (isNaN(seconds)) return '0:00.0';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 10);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
    }

    formatTimeShort(seconds) {
        if (isNaN(seconds)) return '0s';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        if (mins > 0) {
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }
        return `${secs}s`;
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
            const touch = e.touches[0];
            touchStartPos = { x: touch.clientX, y: touch.clientY };

            // Select on touch
            this.selectClip(clip);

            // Long press for drag - store touch position for later use
            longPressTimer = setTimeout(() => {
                clipEl.classList.add('dragging');
                // Use stored position instead of stale event
                this.startTouchDragAtPosition(clip, touchStartPos.x, touchStartPos.y, clipEl);
                if (navigator.vibrate) navigator.vibrate(50);
            }, 300); // Reduced from 500ms to 300ms for faster response
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

        // Utiliser le conteneur de la timeline pour le calcul
        const containerRect = this.timelineContainer.getBoundingClientRect();
        const scrollLeft = this.timelineContainer.scrollLeft;

        // Position X relative au début de la timeline (pas de la zone visible)
        const x = e.clientX - containerRect.left + scrollLeft;
        const time = x / (this.pixelsPerSecond * this.zoom);
        const clampedTime = Math.max(0, Math.min(this.videoDuration, time));

        // Si en mode découpe, gérer les marqueurs
        if (this.splitMode) {
            this.handleSplitClick(clampedTime);
        } else if (this.speedMode) {
            this.handleSpeedClick(clampedTime);
        } else {
            this.positionCutCursor(x);
            this.seekTo(clampedTime);
        }
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

    // ==================== SPLIT MODE ====================

    toggleSplitMode() {
        if (this.splitMode) {
            this.exitSplitMode();
        } else {
            this.enterSplitMode();
        }
    }

    enterSplitMode() {
        this.splitMode = true;
        this.splitStartTime = null;
        this.splitEndTime = null;

        // Activer le bouton
        const splitBtn = document.querySelector('[data-tool="split"]');
        if (splitBtn) splitBtn.classList.add('active');

        // Afficher l'instruction
        this.showSplitInstruction('Cliquez sur le DÉBUT de la zone à découper');

        this.showToast('Mode découpe activé', 'success');
    }

    exitSplitMode() {
        this.splitMode = false;
        this.splitStartTime = null;
        this.splitEndTime = null;

        // Désactiver le bouton
        const splitBtn = document.querySelector('[data-tool="split"]');
        if (splitBtn) splitBtn.classList.remove('active');

        // Supprimer les marqueurs
        this.clearSplitMarkers();

        // Supprimer l'instruction
        this.hideSplitInstruction();
    }

    showSplitInstruction(text) {
        this.hideSplitInstruction();
        this.splitInstruction = document.createElement('div');
        this.splitInstruction.className = 'split-instruction';
        this.splitInstruction.textContent = text;
        document.body.appendChild(this.splitInstruction);
    }

    hideSplitInstruction() {
        if (this.splitInstruction) {
            this.splitInstruction.remove();
            this.splitInstruction = null;
        }
    }

    handleSplitClick(time) {
        if (!this.splitMode) return;

        if (this.splitStartTime === null) {
            // Premier clic - définir le début
            this.splitStartTime = time;
            this.createSplitMarker(time, 'start');
            this.showSplitInstruction('Cliquez sur la FIN de la zone à découper');
            this.showToast('Début marqué', 'success');
        } else if (this.splitEndTime === null) {
            // Deuxième clic - définir la fin
            if (time <= this.splitStartTime) {
                this.showToast('La fin doit être après le début', 'warning');
                return;
            }

            this.splitEndTime = time;
            this.createSplitMarker(time, 'end');
            this.createSplitSelection();
            this.hideSplitInstruction();

            // Créer le segment sélectionné
            this.performSplit();
        }
    }

    createSplitMarker(time, type) {
        const marker = document.createElement('div');
        marker.className = `split-marker ${type}`;
        const position = time * this.pixelsPerSecond * this.zoom;
        marker.style.left = `${position}px`;

        if (type === 'start') {
            this.splitStartMarker = marker;
        } else {
            this.splitEndMarker = marker;
        }

        this.tracksWrapper.appendChild(marker);
    }

    createSplitSelection() {
        if (this.splitStartTime === null || this.splitEndTime === null) return;

        this.splitSelection = document.createElement('div');
        this.splitSelection.className = 'split-selection';

        const startPos = this.splitStartTime * this.pixelsPerSecond * this.zoom;
        const endPos = this.splitEndTime * this.pixelsPerSecond * this.zoom;

        this.splitSelection.style.left = `${startPos}px`;
        this.splitSelection.style.width = `${endPos - startPos}px`;

        this.tracksWrapper.appendChild(this.splitSelection);
    }

    clearSplitMarkers() {
        if (this.splitStartMarker) {
            this.splitStartMarker.remove();
            this.splitStartMarker = null;
        }
        if (this.splitEndMarker) {
            this.splitEndMarker.remove();
            this.splitEndMarker = null;
        }
        if (this.splitSelection) {
            this.splitSelection.remove();
            this.splitSelection = null;
        }
    }

    performSplit() {
        // Trouver le clip qui contient la zone de sélection
        const clip = this.clips.find(c => {
            const clipEnd = c.startTime + c.duration;
            return c.startTime <= this.splitStartTime && clipEnd >= this.splitEndTime;
        });

        if (!clip) {
            this.showToast('Aucun clip dans cette zone', 'warning');
            this.exitSplitMode();
            return;
        }

        const clipEnd = clip.startTime + clip.duration;

        // Calculer les 3 segments
        const newClips = [];
        const index = this.clips.findIndex(c => c.id === clip.id);

        // Segment 1: Avant la sélection (si existe)
        if (this.splitStartTime > clip.startTime) {
            const duration1 = this.splitStartTime - clip.startTime;
            const sourceRelative1 = (duration1 / clip.duration) * (clip.sourceEnd - clip.sourceStart);
            newClips.push({
                id: this.clipIdCounter++,
                trackIndex: clip.trackIndex,
                startTime: clip.startTime,
                sourceStart: clip.sourceStart,
                sourceEnd: clip.sourceStart + sourceRelative1,
                duration: duration1,
                speed: clip.speed,
                name: clip.name
            });
        }

        // Segment 2: La sélection (zone découpée)
        const duration2 = this.splitEndTime - this.splitStartTime;
        const sourceRelativeStart = ((this.splitStartTime - clip.startTime) / clip.duration) * (clip.sourceEnd - clip.sourceStart);
        const sourceRelativeEnd = ((this.splitEndTime - clip.startTime) / clip.duration) * (clip.sourceEnd - clip.sourceStart);

        const selectedSegment = {
            id: this.clipIdCounter++,
            trackIndex: clip.trackIndex,
            startTime: this.splitStartTime,
            sourceStart: clip.sourceStart + sourceRelativeStart,
            sourceEnd: clip.sourceStart + sourceRelativeEnd,
            duration: duration2,
            speed: clip.speed,
            name: clip.name + ' (sélection)'
        };
        newClips.push(selectedSegment);

        // Segment 3: Après la sélection (si existe)
        if (this.splitEndTime < clipEnd) {
            const duration3 = clipEnd - this.splitEndTime;
            newClips.push({
                id: this.clipIdCounter++,
                trackIndex: clip.trackIndex,
                startTime: this.splitEndTime,
                sourceStart: clip.sourceStart + sourceRelativeEnd,
                sourceEnd: clip.sourceEnd,
                duration: duration3,
                speed: clip.speed,
                name: clip.name
            });
        }

        // Remplacer le clip original
        this.clips.splice(index, 1, ...newClips);

        // Sélectionner le segment découpé
        this.selectedClip = selectedSegment;

        this.renderClips();
        this.saveState();
        this.showToast('Zone découpée ! Vous pouvez la supprimer ou la déplacer', 'success');

        // Nettoyer les marqueurs et quitter le mode
        this.clearSplitMarkers();
        this.splitMode = false;
        this.splitStartTime = null;
        this.splitEndTime = null;
        const splitBtn = document.querySelector('[data-tool="split"]');
        if (splitBtn) splitBtn.classList.remove('active');
    }

    deleteSelectedSegment() {
        if (!this.selectedClip) {
            this.showToast('Sélectionnez d\'abord un segment', 'warning');
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
            this.clearSplitMarkers();
            this.renderClips();
            this.saveState();
            this.showToast('Segment supprimé', 'success');
        }
    }

    // Ancienne fonction pour le bouton scissor (maintenant utilise le nouveau workflow)
    splitAtCursor() {
        if (!this.splitMode) {
            this.enterSplitMode();
        }
    }

    // ==================== SPEED MODE ====================

    toggleSpeedMode() {
        if (this.speedMode) {
            this.exitSpeedMode();
        } else {
            this.enterSpeedMode();
        }
    }

    enterSpeedMode() {
        this.speedMode = true;
        this.speedStartTime = null;
        this.speedEndTime = null;

        this.showSplitInstruction('Cliquez sur le DÉBUT de la zone à modifier');
        this.showToast('Mode vitesse activé', 'success');
    }

    exitSpeedMode() {
        this.speedMode = false;
        this.speedStartTime = null;
        this.speedEndTime = null;
        this.clearSpeedMarkers();
        this.hideSplitInstruction();
        this.clearActiveFabItems();
    }

    handleSpeedClick(time) {
        if (!this.speedMode) return;

        if (this.speedStartTime === null) {
            this.speedStartTime = time;
            this.createSpeedMarker(time, 'start');
            this.showSplitInstruction('Cliquez sur la FIN de la zone à modifier');
            this.showToast('Début marqué', 'success');
        } else if (this.speedEndTime === null) {
            if (time <= this.speedStartTime) {
                this.showToast('La fin doit être après le début', 'warning');
                return;
            }

            this.speedEndTime = time;
            this.createSpeedMarker(time, 'end');
            this.createSpeedSelection();
            this.hideSplitInstruction();

            // Afficher le panneau de vitesse
            this.showSpeedOptionsPanel();
        }
    }

    createSpeedMarker(time, type) {
        const marker = document.createElement('div');
        marker.className = `split-marker ${type}`;
        marker.style.background = type === 'start' ? 'var(--accent)' : 'var(--accent)';
        const position = time * this.pixelsPerSecond * this.zoom;
        marker.style.left = `${position}px`;

        if (type === 'start') {
            this.speedStartMarker = marker;
        } else {
            this.speedEndMarker = marker;
        }

        this.tracksWrapper.appendChild(marker);
    }

    createSpeedSelection() {
        if (this.speedStartTime === null || this.speedEndTime === null) return;

        this.speedSelection = document.createElement('div');
        this.speedSelection.className = 'split-selection';
        this.speedSelection.style.background = 'rgba(108, 92, 231, 0.3)';
        this.speedSelection.style.borderColor = 'var(--accent)';

        const startPos = this.speedStartTime * this.pixelsPerSecond * this.zoom;
        const endPos = this.speedEndTime * this.pixelsPerSecond * this.zoom;

        this.speedSelection.style.left = `${startPos}px`;
        this.speedSelection.style.width = `${endPos - startPos}px`;

        this.tracksWrapper.appendChild(this.speedSelection);
    }

    clearSpeedMarkers() {
        if (this.speedStartMarker) {
            this.speedStartMarker.remove();
            this.speedStartMarker = null;
        }
        if (this.speedEndMarker) {
            this.speedEndMarker.remove();
            this.speedEndMarker = null;
        }
        if (this.speedSelection) {
            this.speedSelection.remove();
            this.speedSelection = null;
        }
    }

    showSpeedOptionsPanel() {
        // Supprimer les anciens panneaux
        const oldPanel = document.querySelector('.speed-options-panel');
        if (oldPanel) oldPanel.remove();

        const panel = document.createElement('div');
        panel.className = 'speed-options-panel';
        panel.innerHTML = `
            <div class="speed-panel-header">
                <h4>Choisir la vitesse</h4>
                <button class="close-speed-panel">&times;</button>
            </div>
            <div class="speed-buttons">
                <button class="speed-btn" data-speed="0.25">0.25x</button>
                <button class="speed-btn" data-speed="0.5">0.5x</button>
                <button class="speed-btn" data-speed="0.75">0.75x</button>
                <button class="speed-btn active" data-speed="1">1x</button>
                <button class="speed-btn" data-speed="1.5">1.5x</button>
                <button class="speed-btn" data-speed="2">2x</button>
                <button class="speed-btn" data-speed="3">3x</button>
                <button class="speed-btn" data-speed="4">4x</button>
            </div>
            <button class="apply-speed-btn">Appliquer</button>
        `;

        document.body.appendChild(panel);

        // Événements
        let selectedSpeed = 1;

        panel.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                panel.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedSpeed = parseFloat(btn.dataset.speed);
            });
        });

        panel.querySelector('.close-speed-panel').addEventListener('click', () => {
            panel.remove();
            this.exitSpeedMode();
        });

        panel.querySelector('.apply-speed-btn').addEventListener('click', () => {
            this.applySpeedToSelection(selectedSpeed);
            panel.remove();
        });
    }

    applySpeedToSelection(speed) {
        // Trouver le clip qui contient la zone
        const clip = this.clips.find(c => {
            const clipEnd = c.startTime + c.duration;
            return c.startTime <= this.speedStartTime && clipEnd >= this.speedEndTime;
        });

        if (!clip) {
            this.showToast('Aucun clip dans cette zone', 'warning');
            this.exitSpeedMode();
            return;
        }

        // Appliquer la vitesse au clip (ou créer un segment avec cette vitesse)
        const index = this.clips.findIndex(c => c.id === clip.id);
        const newClips = [];
        const clipEnd = clip.startTime + clip.duration;

        // Calculer les positions source
        const sourceRatio = (clip.sourceEnd - clip.sourceStart) / clip.duration;
        const speedSourceStart = clip.sourceStart + (this.speedStartTime - clip.startTime) * sourceRatio;
        const speedSourceEnd = clip.sourceStart + (this.speedEndTime - clip.startTime) * sourceRatio;

        // Calculer la nouvelle durée du segment avec vitesse
        const originalSpeedDuration = this.speedEndTime - this.speedStartTime;
        const newSpeedDuration = originalSpeedDuration / speed;

        let currentStartTime = clip.startTime;

        // Avant la zone
        if (this.speedStartTime > clip.startTime) {
            const duration = this.speedStartTime - clip.startTime;
            newClips.push({
                id: this.clipIdCounter++,
                trackIndex: clip.trackIndex,
                startTime: currentStartTime,
                sourceStart: clip.sourceStart,
                sourceEnd: speedSourceStart,
                duration: duration,
                speed: clip.speed,
                name: clip.name
            });
            currentStartTime += duration;
        }

        // Zone avec nouvelle vitesse
        newClips.push({
            id: this.clipIdCounter++,
            trackIndex: clip.trackIndex,
            startTime: currentStartTime,
            sourceStart: speedSourceStart,
            sourceEnd: speedSourceEnd,
            duration: newSpeedDuration,
            speed: speed,
            name: `${clip.name} (${speed}x)`
        });
        currentStartTime += newSpeedDuration;

        // Après la zone
        if (this.speedEndTime < clipEnd) {
            const afterDuration = clipEnd - this.speedEndTime;
            newClips.push({
                id: this.clipIdCounter++,
                trackIndex: clip.trackIndex,
                startTime: currentStartTime,
                sourceStart: speedSourceEnd,
                sourceEnd: clip.sourceEnd,
                duration: afterDuration,
                speed: clip.speed,
                name: clip.name
            });
        }

        this.clips.splice(index, 1, ...newClips);
        this.renderClips();
        this.saveState();
        this.showToast(`Vitesse ${speed}x appliquée`, 'success');
        this.exitSpeedMode();
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
        const touch = e.touches[0];
        const clipEl = document.querySelector(`[data-clip-id="${clip.id}"]`);
        this.startTouchDragAtPosition(clip, touch.clientX, touch.clientY, clipEl);
    }

    startTouchDragAtPosition(clip, clientX, clientY, clipEl) {
        this.isDragging = true;
        this.dragClip = clip;
        this.dragStartX = clientX;
        this.dragStartY = clientY;

        if (clipEl) {
            const rect = clipEl.getBoundingClientRect();
            this.dragOffsetX = clientX - rect.left;
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
        // Désactiver les autres modes
        if (tool !== 'split' && this.splitMode) {
            this.exitSplitMode();
        }
        if (tool !== 'speed' && this.speedMode) {
            this.exitSpeedMode();
        }

        switch (tool) {
            case 'split':
                this.toggleSplitMode();
                if (this.splitMode) {
                    this.setActiveFabItem('split');
                } else {
                    this.clearActiveFabItems();
                }
                break;
            case 'adjust':
                this.showAdjustPanel();
                break;
            case 'speed':
                this.toggleSpeedMode();
                if (this.speedMode) {
                    this.setActiveFabItem('speed');
                } else {
                    this.clearActiveFabItems();
                }
                break;
            case 'delete':
                this.deleteSelectedSegment();
                break;
            case 'copy':
                this.copySelectedClip();
                break;
            case 'paste':
                this.pasteClip();
                break;
            case 'transform':
                this.showTransformPanel();
                break;
            case 'filters':
                this.showFiltersPanel();
                break;
            case 'text':
                this.addTextOverlay();
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

    // ==================== COPY / PASTE ====================

    copySelectedClip() {
        if (!this.selectedClip) {
            this.showToast('Sélectionnez d\'abord un segment à copier', 'warning');
            return;
        }

        // Stocker une copie dans le presse-papier
        this.clipboardClip = {
            sourceStart: this.selectedClip.sourceStart,
            sourceEnd: this.selectedClip.sourceEnd,
            duration: this.selectedClip.duration,
            speed: this.selectedClip.speed,
            name: this.selectedClip.name
        };

        this.showToast('Segment copié dans le presse-papier', 'success');
    }

    pasteClip() {
        if (!this.clipboardClip) {
            this.showToast('Rien à coller. Copiez d\'abord un segment.', 'warning');
            return;
        }

        // Coller à la position actuelle du curseur ou après le dernier clip
        const pasteTime = this.cutTime || this.getLastClipEndTime();

        const newClip = {
            id: this.clipIdCounter++,
            trackIndex: 0,
            startTime: pasteTime,
            sourceStart: this.clipboardClip.sourceStart,
            sourceEnd: this.clipboardClip.sourceEnd,
            duration: this.clipboardClip.duration,
            speed: this.clipboardClip.speed,
            name: this.clipboardClip.name + ' (collé)'
        };

        this.clips.push(newClip);
        this.selectedClip = newClip;

        this.renderClips();
        this.saveState();
        this.showToast('Segment collé', 'success');
    }

    getLastClipEndTime() {
        if (this.clips.length === 0) return 0;
        let maxEnd = 0;
        this.clips.forEach(clip => {
            const end = clip.startTime + clip.duration;
            if (end > maxEnd) maxEnd = end;
        });
        return maxEnd + 0.1;
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

    // ==================== TEXT OVERLAYS ====================

    addTextOverlay() {
        const textId = this.textIdCounter++;
        const currentTime = this.video.currentTime || 0;
        const defaultDuration = 5; // 5 secondes par défaut

        const textData = {
            id: textId,
            text: 'Votre texte',
            x: 50, // pourcentage
            y: 50, // pourcentage
            fontSize: 24,
            fontFamily: 'Inter',
            color: '#ffffff',
            backgroundColor: 'transparent',
            bold: false,
            italic: false,
            startTime: currentTime,
            endTime: Math.min(currentTime + defaultDuration, this.videoDuration)
        };

        this.textOverlays.push(textData);
        this.renderTextOverlay(textData);
        this.selectTextOverlay(textId);
        this.showTextEditPanel(textData);
        this.updateTextOverlaysVisibility();
        this.showToast(`Texte ajouté (${this.formatTime(currentTime)} - ${this.formatTime(textData.endTime)})`, 'success');
    }

    renderTextOverlay(textData) {
        const overlay = document.createElement('div');
        overlay.className = 'text-overlay';
        overlay.dataset.textId = textData.id;

        overlay.style.left = `${textData.x}%`;
        overlay.style.top = `${textData.y}%`;
        overlay.style.transform = 'translate(-50%, -50%)';

        overlay.innerHTML = `
            <div class="text-overlay-content" contenteditable="false"
                 style="font-size: ${textData.fontSize}px;
                        font-family: ${textData.fontFamily};
                        color: ${textData.color};
                        background-color: ${textData.backgroundColor};
                        font-weight: ${textData.bold ? 'bold' : 'normal'};
                        font-style: ${textData.italic ? 'italic' : 'normal'};">
                ${textData.text}
            </div>
            <div class="resize-handle nw"></div>
            <div class="resize-handle ne"></div>
            <div class="resize-handle sw"></div>
            <div class="resize-handle se"></div>
        `;

        // Events
        this.setupTextEvents(overlay, textData);

        this.textOverlaysContainer.appendChild(overlay);
    }

    setupTextEvents(overlay, textData) {
        // Click to select
        overlay.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectTextOverlay(textData.id);
            this.showTextEditPanel(textData);
        });

        // Drag to move
        overlay.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('resize-handle')) return;
            e.preventDefault();
            this.startTextDrag(textData, e);
        });

        overlay.addEventListener('touchstart', (e) => {
            if (e.target.classList.contains('resize-handle')) return;
            this.startTextDrag(textData, e.touches[0]);
        }, { passive: true });

        // Resize handles
        overlay.querySelectorAll('.resize-handle').forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.startTextResize(textData, e, handle.className.split(' ')[1]);
            });

            handle.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                this.startTextResize(textData, e.touches[0], handle.className.split(' ')[1]);
            }, { passive: true });
        });

        // Double click to edit text directly
        overlay.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            const content = overlay.querySelector('.text-overlay-content');
            content.contentEditable = true;
            content.focus();

            // Select all text
            const range = document.createRange();
            range.selectNodeContents(content);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        });

        // Save on blur
        const content = overlay.querySelector('.text-overlay-content');
        content.addEventListener('blur', () => {
            content.contentEditable = false;
            textData.text = content.textContent;
        });
    }

    startTextDrag(textData, e) {
        this.isDraggingText = true;
        this.selectedTextOverlay = textData;

        const overlay = document.querySelector(`[data-text-id="${textData.id}"]`);
        const rect = this.textOverlaysContainer.getBoundingClientRect();
        const overlayRect = overlay.getBoundingClientRect();

        this.textDragOffset = {
            x: (e.clientX - overlayRect.left) / rect.width * 100,
            y: (e.clientY - overlayRect.top) / rect.height * 100
        };

        const moveHandler = (moveE) => {
            const clientX = moveE.touches ? moveE.touches[0].clientX : moveE.clientX;
            const clientY = moveE.touches ? moveE.touches[0].clientY : moveE.clientY;

            const newX = ((clientX - rect.left) / rect.width) * 100;
            const newY = ((clientY - rect.top) / rect.height) * 100;

            // Clamp values
            textData.x = Math.max(5, Math.min(95, newX));
            textData.y = Math.max(5, Math.min(95, newY));

            overlay.style.left = `${textData.x}%`;
            overlay.style.top = `${textData.y}%`;
        };

        const upHandler = () => {
            this.isDraggingText = false;
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('mouseup', upHandler);
            document.removeEventListener('touchmove', moveHandler);
            document.removeEventListener('touchend', upHandler);
        };

        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
        document.addEventListener('touchmove', moveHandler, { passive: true });
        document.addEventListener('touchend', upHandler);
    }

    startTextResize(textData, e, corner) {
        this.isResizingText = true;
        const overlay = document.querySelector(`[data-text-id="${textData.id}"]`);
        const content = overlay.querySelector('.text-overlay-content');
        const startFontSize = textData.fontSize;
        const startY = e.clientY;

        const moveHandler = (moveE) => {
            const clientY = moveE.touches ? moveE.touches[0].clientY : moveE.clientY;
            const delta = clientY - startY; // Inversé : tirer vers le bas = agrandir

            // Resize based on vertical drag
            const newSize = Math.max(12, Math.min(120, startFontSize + delta / 2));
            textData.fontSize = Math.round(newSize);
            content.style.fontSize = `${textData.fontSize}px`;
        };

        const upHandler = () => {
            this.isResizingText = false;
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('mouseup', upHandler);
            document.removeEventListener('touchmove', moveHandler);
            document.removeEventListener('touchend', upHandler);
        };

        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
        document.addEventListener('touchmove', moveHandler, { passive: true });
        document.addEventListener('touchend', upHandler);
    }

    selectTextOverlay(textId) {
        // Deselect all
        document.querySelectorAll('.text-overlay').forEach(el => {
            el.classList.remove('selected');
        });

        // Select this one
        const overlay = document.querySelector(`[data-text-id="${textId}"]`);
        if (overlay) {
            overlay.classList.add('selected');
            this.selectedTextOverlay = this.textOverlays.find(t => t.id === textId);
        }
    }

    deselectTextOverlays() {
        document.querySelectorAll('.text-overlay').forEach(el => {
            el.classList.remove('selected');
        });
        this.selectedTextOverlay = null;
        this.hideTextEditPanel();
    }

    showTextEditPanel(textData) {
        this.hideTextEditPanel();

        const panel = document.createElement('div');
        panel.className = 'text-edit-panel';
        panel.id = 'text-edit-panel';

        panel.innerHTML = `
            <input type="text" id="text-input" value="${textData.text}" placeholder="Votre texte">
            <select id="font-select">
                <option value="Inter" ${textData.fontFamily === 'Inter' ? 'selected' : ''}>Inter</option>
                <option value="Arial" ${textData.fontFamily === 'Arial' ? 'selected' : ''}>Arial</option>
                <option value="Georgia" ${textData.fontFamily === 'Georgia' ? 'selected' : ''}>Georgia</option>
                <option value="Verdana" ${textData.fontFamily === 'Verdana' ? 'selected' : ''}>Verdana</option>
                <option value="Courier New" ${textData.fontFamily === 'Courier New' ? 'selected' : ''}>Courier</option>
                <option value="Impact" ${textData.fontFamily === 'Impact' ? 'selected' : ''}>Impact</option>
                <option value="Comic Sans MS" ${textData.fontFamily === 'Comic Sans MS' ? 'selected' : ''}>Comic Sans</option>
            </select>
            <input type="number" id="font-size" value="${textData.fontSize}" min="12" max="120" style="width: 60px;">
            <input type="color" id="text-color" value="${textData.color}">
            <div class="timing-controls">
                <label>Début: <input type="number" id="text-start" value="${textData.startTime.toFixed(1)}" min="0" max="${this.videoDuration}" step="0.1" style="width: 55px;">s</label>
                <label>Fin: <input type="number" id="text-end" value="${textData.endTime.toFixed(1)}" min="0" max="${this.videoDuration}" step="0.1" style="width: 55px;">s</label>
            </div>
            <button class="btn-done" id="text-done">OK</button>
            <button class="btn-delete" id="text-delete"><i class="fas fa-trash"></i></button>
        `;

        document.body.appendChild(panel);

        // Events
        const textInput = panel.querySelector('#text-input');
        const fontSelect = panel.querySelector('#font-select');
        const fontSize = panel.querySelector('#font-size');
        const textColor = panel.querySelector('#text-color');
        const textStart = panel.querySelector('#text-start');
        const textEnd = panel.querySelector('#text-end');

        const updateText = () => {
            textData.text = textInput.value;
            textData.fontFamily = fontSelect.value;
            textData.fontSize = parseInt(fontSize.value);
            textData.color = textColor.value;
            textData.startTime = parseFloat(textStart.value) || 0;
            textData.endTime = parseFloat(textEnd.value) || textData.startTime + 5;
            this.updateTextOverlayDisplay(textData);
            this.updateTextOverlaysVisibility();
        };

        textInput.addEventListener('input', updateText);
        fontSelect.addEventListener('change', updateText);
        fontSize.addEventListener('input', updateText);
        textColor.addEventListener('input', updateText);
        textStart.addEventListener('input', updateText);
        textEnd.addEventListener('input', updateText);

        panel.querySelector('#text-done').addEventListener('click', () => {
            this.hideTextEditPanel();
            this.deselectTextOverlays();
        });

        panel.querySelector('#text-delete').addEventListener('click', () => {
            this.deleteTextOverlay(textData.id);
        });
    }

    hideTextEditPanel() {
        const panel = document.getElementById('text-edit-panel');
        if (panel) panel.remove();
    }

    updateTextOverlayDisplay(textData) {
        const overlay = document.querySelector(`[data-text-id="${textData.id}"]`);
        if (!overlay) return;

        const content = overlay.querySelector('.text-overlay-content');
        content.textContent = textData.text;
        content.style.fontSize = `${textData.fontSize}px`;
        content.style.fontFamily = textData.fontFamily;
        content.style.color = textData.color;
        content.style.fontWeight = textData.bold ? 'bold' : 'normal';
        content.style.fontStyle = textData.italic ? 'italic' : 'normal';
    }

    deleteTextOverlay(textId) {
        const index = this.textOverlays.findIndex(t => t.id === textId);
        if (index !== -1) {
            this.textOverlays.splice(index, 1);
        }

        const overlay = document.querySelector(`[data-text-id="${textId}"]`);
        if (overlay) overlay.remove();

        this.hideTextEditPanel();
        this.showToast('Texte supprimé', 'success');
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
        // Permet de zoomer jusqu'à 10x pour voir les millisecondes
        this.zoom = Math.min(10, this.zoom * 1.5);
        this.applyZoom();
        this.showToast(`Zoom: ${Math.round(this.zoom * 100)}%`, 'info');
    }

    zoomOut() {
        this.zoom = Math.max(0.1, this.zoom / 1.5);
        this.applyZoom();
        this.showToast(`Zoom: ${Math.round(this.zoom * 100)}%`, 'info');
    }

    zoomFit() {
        // Ajuster le zoom pour voir toute la vidéo
        const containerWidth = this.timelineContainer.clientWidth - 40;
        this.zoom = containerWidth / (this.videoDuration * this.pixelsPerSecond);
        this.zoom = Math.max(0.1, Math.min(10, this.zoom));
        this.applyZoom();
        this.showToast('Zoom ajusté', 'info');
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
            // Dimensions selon qualité, en préservant l'aspect ratio
            const videoAspect = this.video.videoWidth / this.video.videoHeight;
            let width, height, bitrate;

            switch (quality) {
                case '4k': height = 2160; bitrate = 35000000; break;
                case '1080p': height = 1080; bitrate = 8000000; break;
                case '720p': height = 720; bitrate = 5000000; break;
                case '480p': height = 480; bitrate = 2500000; break;
                default: height = 1080; bitrate = 8000000;
            }
            width = Math.round(height * videoAspect);
            // S'assurer que la largeur est paire (requis pour certains codecs)
            width = width % 2 === 0 ? width : width + 1;

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            // Créer un stream vidéo depuis le canvas
            const canvasStream = canvas.captureStream(30);

            // Créer une vidéo temporaire avec audio
            const tempVideo = document.createElement('video');
            tempVideo.src = this.video.src;
            tempVideo.volume = this.video.volume;
            tempVideo.muted = false;

            await new Promise(resolve => { tempVideo.onloadeddata = resolve; });

            // Essayer de capturer l'audio
            let combinedStream;
            try {
                const audioCtx = new AudioContext();
                const source = audioCtx.createMediaElementSource(tempVideo);
                const dest = audioCtx.createMediaStreamDestination();
                source.connect(dest);
                source.connect(audioCtx.destination);

                // Combiner vidéo canvas + audio
                combinedStream = new MediaStream([
                    ...canvasStream.getVideoTracks(),
                    ...dest.stream.getAudioTracks()
                ]);
            } catch (audioError) {
                console.warn('Audio capture failed, exporting without audio:', audioError);
                combinedStream = canvasStream;
            }

            const mediaRecorder = new MediaRecorder(combinedStream, {
                mimeType: 'video/webm;codecs=vp9',
                videoBitsPerSecond: bitrate
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

            const duration = this.videoDuration;
            const startTime = Date.now();

            const renderFrame = () => {
                const currentTime = tempVideo.currentTime;
                const progress = Math.min(currentTime / duration, 1);

                this.progressFill.style.width = `${Math.round(progress * 100)}%`;
                this.progressText.textContent = `${Math.round(progress * 100)}%`;

                // Dessiner la vidéo avec filtres
                ctx.filter = this.video.style.filter || 'none';
                ctx.drawImage(tempVideo, 0, 0, width, height);
                ctx.filter = 'none';

                // Dessiner les textes visibles à ce moment
                this.textOverlays.forEach(textData => {
                    if (currentTime >= textData.startTime && currentTime <= textData.endTime) {
                        const x = (textData.x / 100) * width;
                        const y = (textData.y / 100) * height;
                        const fontSize = (textData.fontSize / 1080) * height; // Scale font size

                        ctx.font = `${textData.bold ? 'bold ' : ''}${textData.italic ? 'italic ' : ''}${fontSize}px ${textData.fontFamily}`;
                        ctx.fillStyle = textData.color;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';

                        // Ombre du texte
                        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
                        ctx.shadowBlur = 4;
                        ctx.shadowOffsetX = 2;
                        ctx.shadowOffsetY = 2;

                        ctx.fillText(textData.text, x, y);

                        // Reset shadow
                        ctx.shadowColor = 'transparent';
                        ctx.shadowBlur = 0;
                        ctx.shadowOffsetX = 0;
                        ctx.shadowOffsetY = 0;
                    }
                });

                if (!tempVideo.ended && currentTime < duration) {
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
            case 'c':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.copySelectedClip();
                }
                break;
            case 'v':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.pasteClip();
                }
                break;
            case 'Escape':
                this.closeExportModal();
                this.deselectClip();
                this.exitSplitMode();
                this.exitSpeedMode();
                this.deselectTextOverlays();
                this.closeFabMenu();
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
        }, 800);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.videoEditor = new VideoEditor();
});
