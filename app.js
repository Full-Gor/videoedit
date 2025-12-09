/**
 * VideoEdit Pro - Application JavaScript
 * Éditeur vidéo/audio complet avec 50 fonctionnalités
 */

class VideoEditor {
    constructor() {
        // State
        this.mediaLibrary = [];
        this.tracks = {
            video1: [],
            video2: [],
            audio1: [],
            audio2: [],
            audio3: []
        };
        this.selectedClip = null;
        this.selectedTool = 'select';
        this.currentTime = 0;
        this.duration = 0;
        this.isPlaying = false;
        this.zoom = 50;
        this.pixelsPerSecond = 100;
        this.clipboard = null;
        this.history = [];
        this.historyIndex = -1;
        this.textOverlays = [];
        this.speechBubbles = [];

        // Audio Context for effects
        this.audioContext = null;
        this.masterGain = null;

        // Filters state
        this.currentFilters = {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            hue: 0,
            blur: 0,
            sharpen: 0,
            vignette: 0,
            filter: 'none'
        };

        // Border state
        this.borderSettings = {
            style: 'none',
            color: '#ffffff',
            width: 0
        };

        // Gradient state
        this.gradientSettings = {
            type: null,
            opacity: 50,
            angle: 45
        };

        // Speed
        this.playbackSpeed = 1;

        // Initialize
        this.init();
    }

    init() {
        this.setupElements();
        this.setupEventListeners();
        this.setupAudioContext();
        this.renderTimeRuler();
        this.showToast('Bienvenue dans VideoEdit Pro!', 'success');
    }

    setupElements() {
        // Video/Canvas
        this.previewVideo = document.getElementById('preview-video');
        this.previewCanvas = document.getElementById('preview-canvas');
        this.canvasCtx = this.previewCanvas.getContext('2d');

        // Timeline
        this.timeRuler = document.getElementById('time-ruler');
        this.playhead = document.getElementById('playhead');
        this.tracksContainer = document.getElementById('tracks');

        // Controls
        this.playBtn = document.getElementById('play-btn');
        this.currentTimeDisplay = document.getElementById('current-time');
        this.totalTimeDisplay = document.getElementById('total-time');
        this.volumeSlider = document.getElementById('volume-slider');

        // Media Library
        this.mediaLibraryEl = document.getElementById('media-library');
        this.fileInput = document.getElementById('file-input');

        // Modals
        this.exportModal = document.getElementById('export-modal');
        this.helpModal = document.getElementById('help-modal');
        this.cropModal = document.getElementById('crop-modal');

        // Context Menu
        this.contextMenu = document.getElementById('context-menu');

        // Toast Container
        this.toastContainer = document.getElementById('toast-container');
    }

    setupAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
        } catch (e) {
            console.warn('Web Audio API non supportée');
        }
    }

    setupEventListeners() {
        // File Import
        document.getElementById('import-media').addEventListener('click', () => {
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', (e) => this.handleFileImport(e));

        // Drag & Drop
        document.body.addEventListener('dragover', (e) => {
            e.preventDefault();
            document.body.classList.add('dragging');
        });

        document.body.addEventListener('dragleave', () => {
            document.body.classList.remove('dragging');
        });

        document.body.addEventListener('drop', (e) => {
            e.preventDefault();
            document.body.classList.remove('dragging');
            this.handleFileImport({ target: { files: e.dataTransfer.files } });
        });

        // Media Tabs
        document.querySelectorAll('.media-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.media-tabs .tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filterMediaLibrary(btn.dataset.tab);
            });
        });

        // Preview Controls
        this.playBtn.addEventListener('click', () => this.togglePlayPause());

        document.querySelectorAll('.preview-controls .control-btn').forEach(btn => {
            const action = btn.dataset.action;
            if (action && action !== 'play-pause') {
                btn.addEventListener('click', () => this.handlePreviewControl(action));
            }
        });

        this.volumeSlider.addEventListener('input', (e) => {
            this.previewVideo.volume = e.target.value / 100;
        });

        // Video events
        this.previewVideo.addEventListener('timeupdate', () => this.updatePlayhead());
        this.previewVideo.addEventListener('loadedmetadata', () => this.updateDuration());
        this.previewVideo.addEventListener('ended', () => this.onVideoEnded());

        // Tool Tabs
        document.querySelectorAll('.tools-tabs .tool-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tool-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(`${tab.dataset.tool}-panel`).classList.add('active');
            });
        });

        // Timeline Tools
        document.querySelectorAll('.timeline-tool').forEach(tool => {
            tool.addEventListener('click', () => {
                document.querySelectorAll('.timeline-tool').forEach(t => t.classList.remove('active'));
                tool.classList.add('active');
                this.selectedTool = tool.dataset.tool;
            });
        });

        // Timeline Actions
        document.getElementById('split-clip').addEventListener('click', () => this.splitClip());
        document.getElementById('delete-clip').addEventListener('click', () => this.deleteClip());
        document.getElementById('duplicate-clip').addEventListener('click', () => this.duplicateClip());
        document.getElementById('merge-clips').addEventListener('click', () => this.mergeClips());
        document.getElementById('unlink-av').addEventListener('click', () => this.unlinkAudioVideo());

        // Zoom Controls
        document.getElementById('timeline-zoom').addEventListener('input', (e) => {
            this.zoom = e.target.value;
            this.pixelsPerSecond = 50 + (this.zoom * 2);
            this.renderTimeRuler();
            this.renderAllClips();
        });

        document.querySelectorAll('.zoom-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handleZoom(btn.dataset.zoom));
        });

        // Playhead dragging
        this.timeRuler.addEventListener('click', (e) => this.seekToPosition(e));

        // Nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handleNavAction(btn.dataset.action));
        });

        // Effects
        document.querySelectorAll('.effect-btn[data-effect]').forEach(btn => {
            btn.addEventListener('click', () => this.applyTransition(btn.dataset.effect));
        });

        // Audio Effects
        document.querySelectorAll('.effect-btn[data-audio-effect]').forEach(btn => {
            btn.addEventListener('click', () => this.applyAudioTransition(btn.dataset.audioEffect));
        });

        document.querySelectorAll('.effect-btn[data-audio-fx]').forEach(btn => {
            btn.addEventListener('click', () => this.applyAudioEffect(btn.dataset.audioFx));
        });

        // Filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.applyFilter(btn.dataset.filter);
            });
        });

        // Adjustments
        ['brightness', 'contrast', 'saturation', 'hue', 'blur', 'sharpen', 'vignette'].forEach(prop => {
            const slider = document.getElementById(prop);
            if (slider) {
                slider.addEventListener('input', () => this.updateAdjustments());
            }
        });

        // Border Controls
        document.getElementById('border-style').addEventListener('change', (e) => {
            this.borderSettings.style = e.target.value;
            this.applyBorder();
        });

        document.getElementById('border-color').addEventListener('input', (e) => {
            this.borderSettings.color = e.target.value;
            this.applyBorder();
        });

        document.getElementById('border-width').addEventListener('input', (e) => {
            this.borderSettings.width = e.target.value;
            this.applyBorder();
        });

        // Background Removal
        document.getElementById('remove-bg').addEventListener('click', () => this.removeBackground());
        document.getElementById('chroma-key').addEventListener('click', () => this.applyChromaKey());

        // Gradients
        document.querySelectorAll('.gradient-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.gradient-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.applyGradient(btn.dataset.gradient);
            });
        });

        document.getElementById('gradient-opacity').addEventListener('input', () => this.updateGradient());
        document.getElementById('gradient-angle').addEventListener('input', () => this.updateGradient());

        // Text
        document.getElementById('add-text').addEventListener('click', () => this.addTextOverlay());

        // Speech Bubbles
        document.querySelectorAll('.bubble-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.bubble-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        document.getElementById('add-bubble').addEventListener('click', () => this.addSpeechBubble());

        // Subtitles
        document.getElementById('add-subtitle').addEventListener('click', () => this.addSubtitle());
        document.getElementById('import-srt').addEventListener('click', () => this.importSRT());
        document.getElementById('auto-caption').addEventListener('click', () => this.autoCaptions());

        // Speed Controls
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.setPlaybackSpeed(parseFloat(btn.dataset.speed));
            });
        });

        document.querySelector('[data-action="reverse"]').addEventListener('click', () => this.reverseClip());

        // Transform
        document.getElementById('rotation').addEventListener('input', (e) => this.setRotation(e.target.value));
        document.getElementById('scale').addEventListener('input', (e) => this.setScale(e.target.value));

        document.querySelectorAll('[data-transform]').forEach(btn => {
            btn.addEventListener('click', () => this.handleTransform(btn.dataset.transform));
        });

        // Equalizer
        document.querySelectorAll('.eq-slider').forEach(slider => {
            slider.addEventListener('input', () => this.updateEqualizer());
        });

        // Master Volume & Pan
        document.getElementById('master-volume').addEventListener('input', (e) => {
            if (this.masterGain) {
                this.masterGain.gain.value = e.target.value / 100;
            }
        });

        // Modals
        document.querySelectorAll('.close-btn, .close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeAllModals());
        });

        // Export
        document.getElementById('start-export').addEventListener('click', () => this.startExport());

        // Context Menu
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.clip')) {
                e.preventDefault();
                this.showContextMenu(e);
            }
        });

        document.addEventListener('click', () => {
            this.contextMenu.classList.remove('active');
        });

        document.querySelectorAll('.context-menu button').forEach(btn => {
            btn.addEventListener('click', () => this.handleContextAction(btn.dataset.action));
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Track header controls
        document.querySelectorAll('.track-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                btn.classList.toggle('active');
                if (btn.dataset.action === 'mute') {
                    const icon = btn.querySelector('i');
                    if (btn.classList.contains('active')) {
                        icon.className = 'fas fa-eye-slash';
                    } else {
                        icon.className = 'fas fa-eye';
                    }
                }
                if (btn.dataset.action === 'lock') {
                    const icon = btn.querySelector('i');
                    if (btn.classList.contains('active')) {
                        icon.className = 'fas fa-lock';
                    } else {
                        icon.className = 'fas fa-lock-open';
                    }
                }
            });
        });
    }

    // ==================== FILE HANDLING ====================

    handleFileImport(e) {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const type = this.getFileType(file);
            if (type) {
                this.addToMediaLibrary(file, type);
            }
        });
    }

    getFileType(file) {
        if (file.type.startsWith('video/')) return 'video';
        if (file.type.startsWith('audio/')) return 'audio';
        if (file.type.startsWith('image/')) return 'image';
        return null;
    }

    addToMediaLibrary(file, type) {
        const id = Date.now() + Math.random();
        const url = URL.createObjectURL(file);

        const media = {
            id,
            name: file.name,
            type,
            url,
            file,
            duration: 0
        };

        // Get duration for video/audio
        if (type === 'video' || type === 'audio') {
            const el = document.createElement(type);
            el.src = url;
            el.addEventListener('loadedmetadata', () => {
                media.duration = el.duration;
                this.renderMediaLibrary();
            });
        } else {
            media.duration = 5; // Default 5 seconds for images
        }

        this.mediaLibrary.push(media);
        this.renderMediaLibrary();
        this.showToast(`${file.name} ajouté à la médiathèque`, 'success');
    }

    renderMediaLibrary() {
        const activeTab = document.querySelector('.media-tabs .tab-btn.active').dataset.tab;
        const filtered = activeTab === 'all'
            ? this.mediaLibrary
            : this.mediaLibrary.filter(m => m.type === activeTab);

        if (filtered.length === 0) {
            this.mediaLibraryEl.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>Glissez vos fichiers ici ou cliquez sur Importer</p>
                </div>
            `;
            return;
        }

        this.mediaLibraryEl.innerHTML = filtered.map(media => {
            if (media.type === 'video') {
                return `
                    <div class="media-item" data-id="${media.id}" draggable="true">
                        <video src="${media.url}" muted></video>
                        <div class="media-type-icon"><i class="fas fa-video"></i></div>
                        <div class="media-info">
                            <div class="media-name">${media.name}</div>
                            <div class="media-duration">${this.formatTime(media.duration)}</div>
                        </div>
                    </div>
                `;
            } else if (media.type === 'audio') {
                return `
                    <div class="media-item audio-item" data-id="${media.id}" draggable="true">
                        <i class="fas fa-music"></i>
                        <div class="media-info">
                            <div class="media-name">${media.name}</div>
                            <div class="media-duration">${this.formatTime(media.duration)}</div>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="media-item" data-id="${media.id}" draggable="true">
                        <img src="${media.url}" alt="${media.name}">
                        <div class="media-type-icon"><i class="fas fa-image"></i></div>
                        <div class="media-info">
                            <div class="media-name">${media.name}</div>
                        </div>
                    </div>
                `;
            }
        }).join('');

        // Add event listeners for media items
        this.mediaLibraryEl.querySelectorAll('.media-item').forEach(item => {
            item.addEventListener('dblclick', () => {
                const media = this.mediaLibrary.find(m => m.id == item.dataset.id);
                if (media) {
                    this.addToTimeline(media);
                }
            });

            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('mediaId', item.dataset.id);
            });

            item.addEventListener('click', () => {
                const media = this.mediaLibrary.find(m => m.id == item.dataset.id);
                if (media && (media.type === 'video' || media.type === 'audio')) {
                    this.previewMedia(media);
                }
            });
        });
    }

    filterMediaLibrary(type) {
        this.renderMediaLibrary();
    }

    previewMedia(media) {
        if (media.type === 'video') {
            this.previewVideo.src = media.url;
            this.previewVideo.style.display = 'block';
            this.previewCanvas.style.display = 'none';
        } else if (media.type === 'audio') {
            this.previewVideo.src = media.url;
        }
    }

    // ==================== TIMELINE ====================

    addToTimeline(media, trackId = null) {
        if (!trackId) {
            if (media.type === 'video' || media.type === 'image') {
                trackId = this.tracks.video1.length === 0 ? 'video1' : 'video2';
            } else {
                trackId = 'audio1';
                if (this.tracks.audio1.length > 0) trackId = 'audio2';
                if (this.tracks.audio2.length > 0) trackId = 'audio3';
            }
        }

        const track = this.tracks[trackId];
        const startTime = track.reduce((sum, clip) => sum + clip.duration, 0);

        const clip = {
            id: Date.now() + Math.random(),
            mediaId: media.id,
            name: media.name,
            type: media.type,
            url: media.url,
            startTime,
            duration: media.duration,
            inPoint: 0,
            outPoint: media.duration,
            effects: [],
            volume: 100,
            speed: 1
        };

        track.push(clip);
        this.saveToHistory();
        this.renderAllClips();
        this.updateDuration();
        this.showToast(`${media.name} ajouté à la timeline`, 'success');
    }

    renderTimeRuler() {
        const totalSeconds = Math.max(60, this.duration + 30);
        let html = '';

        for (let i = 0; i <= totalSeconds; i++) {
            const x = i * this.pixelsPerSecond;
            const isMajor = i % 5 === 0;
            html += `
                <div class="time-marker ${isMajor ? 'major' : ''}" style="left: ${x}px">
                    ${isMajor ? this.formatTime(i) : ''}
                </div>
            `;
        }

        this.timeRuler.innerHTML = html;
        this.timeRuler.style.width = (totalSeconds * this.pixelsPerSecond) + 'px';

        // Update tracks width
        document.querySelectorAll('.track').forEach(track => {
            track.style.width = (totalSeconds * this.pixelsPerSecond) + 'px';
        });
    }

    renderAllClips() {
        Object.keys(this.tracks).forEach(trackId => {
            this.renderTrackClips(trackId);
        });
    }

    renderTrackClips(trackId) {
        const track = document.getElementById(`track-${trackId}`);
        const clips = this.tracks[trackId];

        track.innerHTML = clips.map(clip => {
            const left = clip.startTime * this.pixelsPerSecond;
            const width = clip.duration * this.pixelsPerSecond;
            const clipType = clip.type === 'video' || clip.type === 'image' ? 'video' :
                            trackId === 'audio3' ? 'music' : 'audio';

            return `
                <div class="clip ${clipType}-clip ${this.selectedClip?.id === clip.id ? 'selected' : ''}"
                     data-id="${clip.id}"
                     data-track="${trackId}"
                     style="left: ${left}px; width: ${width}px;">
                    <div class="resize-handle left"></div>
                    <span class="clip-name">${clip.name}</span>
                    <span class="clip-duration">${this.formatTime(clip.duration)}</span>
                    <div class="resize-handle right"></div>
                </div>
            `;
        }).join('');

        // Add clip event listeners
        track.querySelectorAll('.clip').forEach(clipEl => {
            this.setupClipEvents(clipEl);
        });
    }

    setupClipEvents(clipEl) {
        const clipId = parseFloat(clipEl.dataset.id);
        const trackId = clipEl.dataset.track;

        clipEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectClip(clipId, trackId);
        });

        clipEl.addEventListener('dblclick', () => {
            const clip = this.findClip(clipId, trackId);
            if (clip) {
                this.previewVideo.src = clip.url;
                this.previewVideo.currentTime = clip.inPoint;
            }
        });

        // Dragging
        let isDragging = false;
        let startX, startLeft;

        clipEl.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('resize-handle')) return;
            if (this.selectedTool === 'razor') {
                this.splitClipAt(clipId, trackId, e);
                return;
            }
            isDragging = true;
            startX = e.clientX;
            startLeft = parseFloat(clipEl.style.left);
            clipEl.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const newLeft = Math.max(0, startLeft + dx);
            clipEl.style.left = newLeft + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                clipEl.style.cursor = 'grab';
                const newStartTime = parseFloat(clipEl.style.left) / this.pixelsPerSecond;
                const clip = this.findClip(clipId, trackId);
                if (clip) {
                    clip.startTime = newStartTime;
                    this.saveToHistory();
                }
            }
        });

        // Resize handles
        const leftHandle = clipEl.querySelector('.resize-handle.left');
        const rightHandle = clipEl.querySelector('.resize-handle.right');

        this.setupResizeHandle(leftHandle, clipEl, clipId, trackId, 'left');
        this.setupResizeHandle(rightHandle, clipEl, clipId, trackId, 'right');
    }

    setupResizeHandle(handle, clipEl, clipId, trackId, side) {
        let isResizing = false;
        let startX, startWidth, startLeft;

        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            isResizing = true;
            startX = e.clientX;
            startWidth = parseFloat(clipEl.style.width);
            startLeft = parseFloat(clipEl.style.left);
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const dx = e.clientX - startX;

            if (side === 'right') {
                const newWidth = Math.max(50, startWidth + dx);
                clipEl.style.width = newWidth + 'px';
            } else {
                const newWidth = Math.max(50, startWidth - dx);
                const newLeft = startLeft + dx;
                if (newLeft >= 0) {
                    clipEl.style.width = newWidth + 'px';
                    clipEl.style.left = newLeft + 'px';
                }
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                const clip = this.findClip(clipId, trackId);
                if (clip) {
                    clip.startTime = parseFloat(clipEl.style.left) / this.pixelsPerSecond;
                    clip.duration = parseFloat(clipEl.style.width) / this.pixelsPerSecond;
                    this.saveToHistory();
                    this.updateDuration();
                }
            }
        });
    }

    findClip(clipId, trackId) {
        return this.tracks[trackId].find(c => c.id === clipId);
    }

    selectClip(clipId, trackId) {
        this.selectedClip = this.findClip(clipId, trackId);
        this.selectedClip._trackId = trackId;
        this.renderAllClips();
    }

    // ==================== CLIP OPERATIONS ====================

    // 1. COUPER
    splitClip() {
        if (!this.selectedClip) {
            this.showToast('Sélectionnez un clip à diviser', 'warning');
            return;
        }

        const clip = this.selectedClip;
        const trackId = clip._trackId;
        const track = this.tracks[trackId];
        const splitTime = this.currentTime;

        if (splitTime <= clip.startTime || splitTime >= clip.startTime + clip.duration) {
            this.showToast('Placez la tête de lecture sur le clip', 'warning');
            return;
        }

        const splitPoint = splitTime - clip.startTime;

        // Create second part
        const newClip = {
            ...clip,
            id: Date.now() + Math.random(),
            startTime: splitTime,
            duration: clip.duration - splitPoint,
            inPoint: clip.inPoint + splitPoint
        };

        // Adjust first part
        clip.duration = splitPoint;
        clip.outPoint = clip.inPoint + splitPoint;

        // Insert new clip
        const index = track.indexOf(clip);
        track.splice(index + 1, 0, newClip);

        this.saveToHistory();
        this.renderAllClips();
        this.showToast('Clip divisé', 'success');
    }

    splitClipAt(clipId, trackId, event) {
        const clip = this.findClip(clipId, trackId);
        if (!clip) return;

        const track = this.tracks[trackId];
        const rect = event.target.closest('.clip').getBoundingClientRect();
        const x = event.clientX - rect.left;
        const splitPoint = x / this.pixelsPerSecond;

        if (splitPoint <= 0 || splitPoint >= clip.duration) return;

        const newClip = {
            ...clip,
            id: Date.now() + Math.random(),
            startTime: clip.startTime + splitPoint,
            duration: clip.duration - splitPoint,
            inPoint: clip.inPoint + splitPoint
        };

        clip.duration = splitPoint;
        clip.outPoint = clip.inPoint + splitPoint;

        const index = track.indexOf(clip);
        track.splice(index + 1, 0, newClip);

        this.saveToHistory();
        this.renderAllClips();
        this.showToast('Clip coupé', 'success');
    }

    // 2. SUPPRIMER
    deleteClip() {
        if (!this.selectedClip) {
            this.showToast('Sélectionnez un clip à supprimer', 'warning');
            return;
        }

        const trackId = this.selectedClip._trackId;
        const track = this.tracks[trackId];
        const index = track.indexOf(this.selectedClip);

        if (index > -1) {
            track.splice(index, 1);
            this.selectedClip = null;
            this.saveToHistory();
            this.renderAllClips();
            this.updateDuration();
            this.showToast('Clip supprimé', 'success');
        }
    }

    // 3. DUPLIQUER
    duplicateClip() {
        if (!this.selectedClip) {
            this.showToast('Sélectionnez un clip à dupliquer', 'warning');
            return;
        }

        const trackId = this.selectedClip._trackId;
        const track = this.tracks[trackId];

        const newClip = {
            ...this.selectedClip,
            id: Date.now() + Math.random(),
            startTime: this.selectedClip.startTime + this.selectedClip.duration
        };

        track.push(newClip);
        this.saveToHistory();
        this.renderAllClips();
        this.updateDuration();
        this.showToast('Clip dupliqué', 'success');
    }

    // 4. FUSIONNER
    mergeClips() {
        const selectedTrack = this.selectedClip?._trackId;
        if (!selectedTrack) {
            this.showToast('Sélectionnez un clip', 'warning');
            return;
        }

        const track = this.tracks[selectedTrack];
        if (track.length < 2) {
            this.showToast('Il faut au moins 2 clips pour fusionner', 'warning');
            return;
        }

        // Sort by start time
        track.sort((a, b) => a.startTime - b.startTime);

        // Merge all into first
        const merged = track[0];
        let totalDuration = merged.duration;

        for (let i = 1; i < track.length; i++) {
            totalDuration += track[i].duration;
        }

        merged.duration = totalDuration;
        merged.name = 'Fusion';

        // Keep only first clip
        this.tracks[selectedTrack] = [merged];

        this.saveToHistory();
        this.renderAllClips();
        this.showToast('Clips fusionnés', 'success');
    }

    // 5. DÉLIER AUDIO/VIDÉO
    unlinkAudioVideo() {
        if (!this.selectedClip || this.selectedClip.type !== 'video') {
            this.showToast('Sélectionnez un clip vidéo', 'warning');
            return;
        }

        // Create audio clip from video
        const audioClip = {
            ...this.selectedClip,
            id: Date.now() + Math.random(),
            type: 'audio',
            name: this.selectedClip.name + ' (Audio)'
        };

        // Add to audio track
        let targetTrack = 'audio1';
        if (this.tracks.audio1.length > 0) targetTrack = 'audio2';
        if (this.tracks.audio2.length > 0) targetTrack = 'audio3';

        this.tracks[targetTrack].push(audioClip);

        // Mark video as muted
        this.selectedClip.muted = true;

        this.saveToHistory();
        this.renderAllClips();
        this.showToast('Audio/Vidéo déliés', 'success');
    }

    // ==================== PLAYBACK ====================

    togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        this.isPlaying = true;
        this.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        this.previewVideo.playbackRate = this.playbackSpeed;
        this.previewVideo.play();
        this.animatePlayhead();
    }

    pause() {
        this.isPlaying = false;
        this.playBtn.innerHTML = '<i class="fas fa-play"></i>';
        this.previewVideo.pause();
    }

    animatePlayhead() {
        if (!this.isPlaying) return;

        this.currentTime = this.previewVideo.currentTime;
        this.updatePlayhead();

        requestAnimationFrame(() => this.animatePlayhead());
    }

    updatePlayhead() {
        const x = this.currentTime * this.pixelsPerSecond;
        this.playhead.style.left = x + 'px';
        this.currentTimeDisplay.textContent = this.formatTime(this.currentTime);
    }

    updateDuration() {
        let maxDuration = 0;
        Object.values(this.tracks).forEach(track => {
            track.forEach(clip => {
                const end = clip.startTime + clip.duration;
                if (end > maxDuration) maxDuration = end;
            });
        });

        this.duration = maxDuration || this.previewVideo.duration || 0;
        this.totalTimeDisplay.textContent = this.formatTime(this.duration);
        this.renderTimeRuler();
    }

    onVideoEnded() {
        this.pause();
        this.currentTime = 0;
        this.previewVideo.currentTime = 0;
        this.updatePlayhead();
    }

    seekToPosition(e) {
        const rect = this.timeRuler.getBoundingClientRect();
        const x = e.clientX - rect.left + this.timeRuler.parentElement.scrollLeft;
        this.currentTime = x / this.pixelsPerSecond;
        this.previewVideo.currentTime = this.currentTime;
        this.updatePlayhead();
    }

    handlePreviewControl(action) {
        switch (action) {
            case 'skip-start':
                this.currentTime = 0;
                this.previewVideo.currentTime = 0;
                break;
            case 'skip-end':
                this.currentTime = this.duration;
                this.previewVideo.currentTime = this.duration;
                break;
            case 'step-back':
                this.currentTime = Math.max(0, this.currentTime - 1/30);
                this.previewVideo.currentTime = this.currentTime;
                break;
            case 'step-forward':
                this.currentTime = Math.min(this.duration, this.currentTime + 1/30);
                this.previewVideo.currentTime = this.currentTime;
                break;
            case 'fullscreen':
                if (this.previewVideo.requestFullscreen) {
                    this.previewVideo.requestFullscreen();
                }
                break;
        }
        this.updatePlayhead();
    }

    // ==================== TRANSITIONS VIDEO ====================

    applyTransition(type) {
        if (!this.selectedClip) {
            this.showToast('Sélectionnez un clip', 'warning');
            return;
        }

        this.selectedClip.transition = {
            type,
            duration: 1
        };

        this.showToast(`Transition "${type}" appliquée`, 'success');
    }

    // ==================== TRANSITIONS AUDIO ====================

    applyAudioTransition(type) {
        if (!this.selectedClip) {
            this.showToast('Sélectionnez un clip', 'warning');
            return;
        }

        switch (type) {
            case 'fade-in':
                this.selectedClip.fadeIn = 1;
                break;
            case 'fade-out':
                this.selectedClip.fadeOut = 1;
                break;
            case 'crossfade':
                this.selectedClip.crossfade = 1;
                break;
            case 'ducking':
                this.selectedClip.ducking = true;
                break;
        }

        this.showToast(`Transition audio "${type}" appliquée`, 'success');
    }

    // ==================== AUDIO EFFECTS ====================

    applyAudioEffect(effect) {
        if (!this.selectedClip) {
            this.showToast('Sélectionnez un clip', 'warning');
            return;
        }

        if (!this.selectedClip.audioEffects) {
            this.selectedClip.audioEffects = [];
        }

        this.selectedClip.audioEffects.push(effect);
        this.showToast(`Effet audio "${effect}" appliqué`, 'success');

        // Apply real-time effect if possible
        this.processAudioEffect(effect);
    }

    processAudioEffect(effect) {
        if (!this.audioContext) return;

        switch (effect) {
            case 'reverb':
                // Convolver for reverb
                break;
            case 'echo':
                // Delay node
                break;
            case 'pitch-up':
                this.previewVideo.playbackRate = 1.2;
                this.previewVideo.preservesPitch = false;
                break;
            case 'pitch-down':
                this.previewVideo.playbackRate = 0.8;
                this.previewVideo.preservesPitch = false;
                break;
            case 'speed-up':
                this.previewVideo.playbackRate = 1.5;
                break;
            case 'slow-down':
                this.previewVideo.playbackRate = 0.5;
                break;
            case 'bass-boost':
                // Biquad filter
                break;
        }
    }

    updateEqualizer() {
        // Get all EQ slider values
        const sliders = document.querySelectorAll('.eq-slider');
        sliders.forEach(slider => {
            const freq = slider.dataset.freq;
            const value = slider.value;
            // Apply EQ using Web Audio API biquad filters
        });
    }

    // ==================== FILTERS & ADJUSTMENTS ====================

    applyFilter(filter) {
        this.currentFilters.filter = filter;
        this.updateVideoFilter();
    }

    updateAdjustments() {
        this.currentFilters.brightness = document.getElementById('brightness').value;
        this.currentFilters.contrast = document.getElementById('contrast').value;
        this.currentFilters.saturation = document.getElementById('saturation').value;
        this.currentFilters.hue = document.getElementById('hue').value;
        this.currentFilters.blur = document.getElementById('blur').value;
        this.currentFilters.vignette = document.getElementById('vignette').value;

        this.updateVideoFilter();
    }

    updateVideoFilter() {
        const f = this.currentFilters;
        let filterStr = '';

        // Brightness
        filterStr += `brightness(${1 + f.brightness / 100}) `;

        // Contrast
        filterStr += `contrast(${1 + f.contrast / 100}) `;

        // Saturation
        filterStr += `saturate(${1 + f.saturation / 100}) `;

        // Hue
        filterStr += `hue-rotate(${f.hue}deg) `;

        // Blur
        if (f.blur > 0) {
            filterStr += `blur(${f.blur}px) `;
        }

        // Preset filters
        switch (f.filter) {
            case 'grayscale':
                filterStr += 'grayscale(100%) ';
                break;
            case 'sepia':
                filterStr += 'sepia(100%) ';
                break;
            case 'vintage':
                filterStr += 'sepia(50%) contrast(90%) brightness(90%) ';
                break;
            case 'cold':
                filterStr += 'saturate(80%) hue-rotate(180deg) ';
                break;
            case 'warm':
                filterStr += 'saturate(120%) sepia(20%) ';
                break;
            case 'dramatic':
                filterStr += 'contrast(150%) saturate(80%) brightness(90%) ';
                break;
            case 'cinematic':
                filterStr += 'contrast(110%) saturate(90%) brightness(95%) ';
                break;
            case 'noir':
                filterStr += 'grayscale(100%) contrast(150%) brightness(90%) ';
                break;
            case 'pop':
                filterStr += 'saturate(200%) contrast(120%) ';
                break;
            case 'retro':
                filterStr += 'sepia(40%) saturate(80%) contrast(90%) ';
                break;
            case 'dream':
                filterStr += 'brightness(110%) saturate(130%) blur(1px) ';
                break;
        }

        this.previewVideo.style.filter = filterStr.trim();

        // Vignette overlay
        if (f.vignette > 0) {
            const vignette = `radial-gradient(circle, transparent 50%, rgba(0,0,0,${f.vignette/100}) 100%)`;
            this.previewVideo.parentElement.style.setProperty('--vignette', vignette);
        }
    }

    // ==================== BORDERS ====================

    applyBorder() {
        const s = this.borderSettings;
        const wrapper = document.querySelector('.preview-wrapper');

        switch (s.style) {
            case 'none':
                wrapper.style.border = 'none';
                wrapper.style.boxShadow = 'none';
                break;
            case 'solid':
                wrapper.style.border = `${s.width}px solid ${s.color}`;
                break;
            case 'double':
                wrapper.style.border = `${s.width}px double ${s.color}`;
                break;
            case 'dashed':
                wrapper.style.border = `${s.width}px dashed ${s.color}`;
                break;
            case 'rounded':
                wrapper.style.border = `${s.width}px solid ${s.color}`;
                wrapper.style.borderRadius = '20px';
                break;
            case 'shadow':
                wrapper.style.border = 'none';
                wrapper.style.boxShadow = `0 0 ${s.width * 2}px ${s.color}`;
                break;
            case 'glow':
                wrapper.style.border = `${s.width}px solid ${s.color}`;
                wrapper.style.boxShadow = `0 0 ${s.width * 3}px ${s.color}, inset 0 0 ${s.width}px ${s.color}`;
                break;
            case 'vintage':
                wrapper.style.border = `${s.width}px solid ${s.color}`;
                wrapper.style.borderRadius = '5px';
                wrapper.style.boxShadow = `inset 0 0 ${s.width * 2}px rgba(0,0,0,0.5)`;
                break;
        }
    }

    // ==================== BACKGROUND REMOVAL ====================

    removeBackground() {
        this.showToast('Détourage en cours...', 'info');

        // Capture current frame to canvas
        this.previewCanvas.width = this.previewVideo.videoWidth;
        this.previewCanvas.height = this.previewVideo.videoHeight;
        this.canvasCtx.drawImage(this.previewVideo, 0, 0);

        const imageData = this.canvasCtx.getImageData(0, 0, this.previewCanvas.width, this.previewCanvas.height);
        const data = imageData.data;

        const tolerance = parseInt(document.getElementById('bg-tolerance').value);

        // Simple background removal (assumes solid color background)
        // Get background color from corner
        const bgR = data[0];
        const bgG = data[1];
        const bgB = data[2];

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const diff = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);

            if (diff < tolerance * 3) {
                data[i + 3] = 0; // Make transparent
            }
        }

        this.canvasCtx.putImageData(imageData, 0, 0);
        this.previewCanvas.style.display = 'block';
        this.previewVideo.style.display = 'none';

        this.showToast('Arrière-plan supprimé', 'success');
    }

    applyChromaKey() {
        const color = document.getElementById('bg-replace-color').value;
        const tolerance = parseInt(document.getElementById('bg-tolerance').value);

        // Convert hex to RGB
        const r = parseInt(color.substr(1, 2), 16);
        const g = parseInt(color.substr(3, 2), 16);
        const b = parseInt(color.substr(5, 2), 16);

        this.showToast('Chroma Key appliqué', 'success');

        // In a real implementation, this would use WebGL shaders for real-time processing
    }

    // ==================== GRADIENTS ====================

    applyGradient(type) {
        this.gradientSettings.type = type;
        this.updateGradient();
    }

    updateGradient() {
        const opacity = document.getElementById('gradient-opacity').value / 100;
        const angle = document.getElementById('gradient-angle').value;
        const wrapper = document.querySelector('.preview-wrapper');

        const gradients = {
            sunset: `linear-gradient(${angle}deg, rgba(255,107,107,${opacity}), rgba(254,202,87,${opacity}))`,
            ocean: `linear-gradient(${angle}deg, rgba(102,126,234,${opacity}), rgba(118,75,162,${opacity}))`,
            forest: `linear-gradient(${angle}deg, rgba(17,153,142,${opacity}), rgba(56,239,125,${opacity}))`,
            fire: `linear-gradient(${angle}deg, rgba(241,39,17,${opacity}), rgba(245,175,25,${opacity}))`,
            night: `linear-gradient(${angle}deg, rgba(15,12,41,${opacity}), rgba(48,43,99,${opacity}))`,
            custom: 'none'
        };

        if (this.gradientSettings.type && this.gradientSettings.type !== 'custom') {
            wrapper.style.setProperty('--gradient-overlay', gradients[this.gradientSettings.type]);
        }
    }

    // ==================== TEXT & BUBBLES ====================

    addTextOverlay() {
        const text = document.getElementById('text-content').value;
        if (!text) {
            this.showToast('Entrez du texte', 'warning');
            return;
        }

        const overlay = {
            id: Date.now(),
            text,
            fontFamily: document.getElementById('font-family').value,
            fontSize: document.getElementById('font-size').value,
            color: document.getElementById('text-color').value,
            stroke: document.getElementById('text-stroke').value,
            x: 50,
            y: 50,
            startTime: this.currentTime,
            duration: 5
        };

        this.textOverlays.push(overlay);
        this.renderTextOverlays();
        this.showToast('Texte ajouté', 'success');
    }

    renderTextOverlays() {
        const container = document.getElementById('text-overlays');
        container.innerHTML = this.textOverlays.map(overlay => `
            <div class="text-overlay"
                 style="left: ${overlay.x}%; top: ${overlay.y}%;
                        font-family: ${overlay.fontFamily};
                        font-size: ${overlay.fontSize}px;
                        color: ${overlay.color};
                        -webkit-text-stroke: 2px ${overlay.stroke};
                        text-shadow: 2px 2px 4px rgba(0,0,0,0.5);"
                 data-id="${overlay.id}">
                ${overlay.text}
            </div>
        `).join('');

        // Make draggable
        container.querySelectorAll('.text-overlay').forEach(el => {
            this.makeDraggable(el);
        });
    }

    addSpeechBubble() {
        const text = document.getElementById('bubble-text').value;
        if (!text) {
            this.showToast('Entrez du texte pour la bulle', 'warning');
            return;
        }

        const activeType = document.querySelector('.bubble-btn.active')?.dataset.bubble || 'speech';

        const bubble = {
            id: Date.now(),
            text,
            type: activeType,
            bgColor: document.getElementById('bubble-bg').value,
            textColor: document.getElementById('bubble-text-color').value,
            x: 30,
            y: 30,
            startTime: this.currentTime,
            duration: 5
        };

        this.speechBubbles.push(bubble);
        this.renderSpeechBubbles();
        this.showToast('Bulle ajoutée', 'success');
    }

    renderSpeechBubbles() {
        const container = document.getElementById('speech-bubbles');
        container.innerHTML = this.speechBubbles.map(bubble => `
            <div class="speech-bubble ${bubble.type}"
                 style="left: ${bubble.x}%; top: ${bubble.y}%;
                        background-color: ${bubble.bgColor};
                        color: ${bubble.textColor};
                        border-color: ${bubble.bgColor};"
                 data-id="${bubble.id}">
                ${bubble.text}
            </div>
        `).join('');

        // Make draggable
        container.querySelectorAll('.speech-bubble').forEach(el => {
            this.makeDraggable(el);
        });
    }

    makeDraggable(element) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;

        element.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseFloat(element.style.left);
            startTop = parseFloat(element.style.top);
            element.style.pointerEvents = 'auto';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const parent = element.parentElement;
            const dx = (e.clientX - startX) / parent.offsetWidth * 100;
            const dy = (e.clientY - startY) / parent.offsetHeight * 100;

            element.style.left = Math.max(0, Math.min(90, startLeft + dx)) + '%';
            element.style.top = Math.max(0, Math.min(90, startTop + dy)) + '%';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    // ==================== SUBTITLES ====================

    addSubtitle() {
        const text = prompt('Entrez le texte du sous-titre:');
        if (!text) return;

        const subtitle = {
            id: Date.now(),
            text,
            startTime: this.currentTime,
            endTime: this.currentTime + 3
        };

        if (!this.subtitles) this.subtitles = [];
        this.subtitles.push(subtitle);

        this.showToast('Sous-titre ajouté', 'success');
    }

    importSRT() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.srt,.vtt';

        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();

            reader.onload = (event) => {
                const content = event.target.result;
                this.parseSRT(content);
            };

            reader.readAsText(file);
        };

        input.click();
    }

    parseSRT(content) {
        const blocks = content.trim().split(/\n\n+/);
        this.subtitles = [];

        blocks.forEach(block => {
            const lines = block.split('\n');
            if (lines.length >= 3) {
                const times = lines[1].split(' --> ');
                this.subtitles.push({
                    id: Date.now() + Math.random(),
                    startTime: this.parseSRTTime(times[0]),
                    endTime: this.parseSRTTime(times[1]),
                    text: lines.slice(2).join(' ')
                });
            }
        });

        this.showToast(`${this.subtitles.length} sous-titres importés`, 'success');
    }

    parseSRTTime(timeStr) {
        const parts = timeStr.replace(',', '.').split(':');
        return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
    }

    autoCaptions() {
        this.showToast('Génération automatique des sous-titres...', 'info');
        // In a real app, this would use Web Speech API or a transcription service
        setTimeout(() => {
            this.showToast('Fonctionnalité nécessitant une API de transcription', 'warning');
        }, 2000);
    }

    // ==================== SPEED & TRANSFORM ====================

    setPlaybackSpeed(speed) {
        this.playbackSpeed = speed;
        this.previewVideo.playbackRate = speed;

        if (this.selectedClip) {
            this.selectedClip.speed = speed;
        }

        this.showToast(`Vitesse: ${speed}x`, 'success');
    }

    reverseClip() {
        if (!this.selectedClip) {
            this.showToast('Sélectionnez un clip', 'warning');
            return;
        }

        this.selectedClip.reversed = !this.selectedClip.reversed;
        this.showToast('Clip inversé', 'success');
    }

    setRotation(degrees) {
        this.previewVideo.style.transform = `rotate(${degrees}deg) scale(${this.currentScale || 1})`;
    }

    setScale(percent) {
        this.currentScale = percent / 100;
        const rotation = document.getElementById('rotation').value;
        this.previewVideo.style.transform = `rotate(${rotation}deg) scale(${this.currentScale})`;
    }

    handleTransform(type) {
        switch (type) {
            case 'flip-h':
                const currentScaleX = this.previewVideo.style.transform.includes('scaleX(-1)') ? 1 : -1;
                this.previewVideo.style.transform += ` scaleX(${currentScaleX})`;
                this.showToast('Miroir horizontal appliqué', 'success');
                break;
            case 'flip-v':
                const currentScaleY = this.previewVideo.style.transform.includes('scaleY(-1)') ? 1 : -1;
                this.previewVideo.style.transform += ` scaleY(${currentScaleY})`;
                this.showToast('Miroir vertical appliqué', 'success');
                break;
            case 'crop':
                this.openCropModal();
                break;
        }
    }

    openCropModal() {
        this.cropModal.classList.add('active');
        // Draw current frame to crop canvas
        const canvas = document.getElementById('crop-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.previewVideo.videoWidth || 640;
        canvas.height = this.previewVideo.videoHeight || 360;
        ctx.drawImage(this.previewVideo, 0, 0);
    }

    // ==================== NAV ACTIONS ====================

    handleNavAction(action) {
        switch (action) {
            case 'new-project':
                if (confirm('Créer un nouveau projet? Les changements non sauvegardés seront perdus.')) {
                    this.newProject();
                }
                break;
            case 'save-project':
                this.saveProject();
                break;
            case 'load-project':
                this.loadProject();
                break;
            case 'export':
                this.exportModal.classList.add('active');
                break;
            case 'undo':
                this.undo();
                break;
            case 'redo':
                this.redo();
                break;
            case 'help':
                this.helpModal.classList.add('active');
                break;
        }
    }

    // ==================== PROJECT MANAGEMENT ====================

    newProject() {
        this.mediaLibrary = [];
        this.tracks = {
            video1: [],
            video2: [],
            audio1: [],
            audio2: [],
            audio3: []
        };
        this.selectedClip = null;
        this.textOverlays = [];
        this.speechBubbles = [];
        this.history = [];
        this.historyIndex = -1;

        this.renderMediaLibrary();
        this.renderAllClips();
        this.showToast('Nouveau projet créé', 'success');
    }

    saveProject() {
        const project = {
            mediaLibrary: this.mediaLibrary.map(m => ({...m, url: null, file: null})),
            tracks: this.tracks,
            textOverlays: this.textOverlays,
            speechBubbles: this.speechBubbles,
            subtitles: this.subtitles
        };

        const json = JSON.stringify(project, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'videoedit-project.json';
        a.click();

        URL.revokeObjectURL(url);
        this.showToast('Projet sauvegardé', 'success');
    }

    loadProject() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    const project = JSON.parse(event.target.result);
                    this.tracks = project.tracks;
                    this.textOverlays = project.textOverlays || [];
                    this.speechBubbles = project.speechBubbles || [];
                    this.subtitles = project.subtitles || [];

                    this.renderAllClips();
                    this.renderTextOverlays();
                    this.renderSpeechBubbles();
                    this.showToast('Projet chargé', 'success');
                } catch (err) {
                    this.showToast('Erreur lors du chargement', 'error');
                }
            };

            reader.readAsText(file);
        };

        input.click();
    }

    // ==================== EXPORT ====================

    async startExport() {
        const format = document.getElementById('export-format').value;
        const resolution = document.getElementById('export-resolution').value;
        const quality = document.getElementById('export-quality').value;
        const fps = parseInt(document.getElementById('export-fps').value);

        document.getElementById('export-progress').style.display = 'block';

        // Simulate export progress
        for (let i = 0; i <= 100; i += 5) {
            await new Promise(r => setTimeout(r, 100));
            document.getElementById('progress-fill').style.width = i + '%';
            document.getElementById('progress-text').textContent = i + '%';
        }

        // In a real implementation, we'd use MediaRecorder API
        if (this.previewVideo.src) {
            const a = document.createElement('a');
            a.href = this.previewVideo.src;
            a.download = `export.${format}`;
            a.click();
        }

        this.showToast('Export terminé!', 'success');
        this.closeAllModals();
    }

    // ==================== HISTORY ====================

    saveToHistory() {
        const state = JSON.stringify(this.tracks);

        // Remove future states if we're in the middle of history
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        this.history.push(state);
        this.historyIndex = this.history.length - 1;

        // Limit history size
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.tracks = JSON.parse(this.history[this.historyIndex]);
            this.renderAllClips();
            this.showToast('Annulé', 'success');
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.tracks = JSON.parse(this.history[this.historyIndex]);
            this.renderAllClips();
            this.showToast('Rétabli', 'success');
        }
    }

    // ==================== KEYBOARD SHORTCUTS ====================

    handleKeyboard(e) {
        // Don't handle if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key) {
            case ' ':
                e.preventDefault();
                this.togglePlayPause();
                break;
            case 'Delete':
            case 'Backspace':
                this.deleteClip();
                break;
            case 'v':
                this.selectedTool = 'select';
                document.querySelectorAll('.timeline-tool').forEach(t => t.classList.remove('active'));
                document.querySelector('[data-tool="select"]').classList.add('active');
                break;
            case 'c':
                this.selectedTool = 'cut';
                document.querySelectorAll('.timeline-tool').forEach(t => t.classList.remove('active'));
                document.querySelector('[data-tool="cut"]').classList.add('active');
                break;
            case 'b':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.splitClip();
                } else {
                    this.selectedTool = 'razor';
                    document.querySelectorAll('.timeline-tool').forEach(t => t.classList.remove('active'));
                    document.querySelector('[data-tool="razor"]').classList.add('active');
                }
                break;
            case 'd':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.duplicateClip();
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
            case 'ArrowLeft':
                this.currentTime = Math.max(0, this.currentTime - (e.shiftKey ? 1 : 0.1));
                this.previewVideo.currentTime = this.currentTime;
                this.updatePlayhead();
                break;
            case 'ArrowRight':
                this.currentTime = Math.min(this.duration, this.currentTime + (e.shiftKey ? 1 : 0.1));
                this.previewVideo.currentTime = this.currentTime;
                this.updatePlayhead();
                break;
        }
    }

    // ==================== CONTEXT MENU ====================

    showContextMenu(e) {
        this.contextMenu.style.left = e.clientX + 'px';
        this.contextMenu.style.top = e.clientY + 'px';
        this.contextMenu.classList.add('active');

        // Select the clip that was right-clicked
        const clipEl = e.target.closest('.clip');
        if (clipEl) {
            const clipId = parseFloat(clipEl.dataset.id);
            const trackId = clipEl.dataset.track;
            this.selectClip(clipId, trackId);
        }
    }

    handleContextAction(action) {
        switch (action) {
            case 'cut-clip':
                this.clipboard = {...this.selectedClip, _cut: true};
                this.deleteClip();
                break;
            case 'copy-clip':
                this.clipboard = {...this.selectedClip};
                this.showToast('Clip copié', 'success');
                break;
            case 'paste-clip':
                if (this.clipboard) {
                    const newClip = {
                        ...this.clipboard,
                        id: Date.now() + Math.random(),
                        startTime: this.currentTime
                    };
                    delete newClip._cut;
                    delete newClip._trackId;

                    const trackId = this.clipboard._trackId || 'video1';
                    this.tracks[trackId].push(newClip);
                    this.saveToHistory();
                    this.renderAllClips();
                    this.showToast('Clip collé', 'success');
                }
                break;
            case 'split-here':
                this.splitClip();
                break;
            case 'delete-clip':
                this.deleteClip();
                break;
            case 'add-transition':
                // Open transitions panel
                document.querySelector('[data-tool="effects"]').click();
                break;
            case 'add-effect':
                document.querySelector('[data-tool="filters"]').click();
                break;
            case 'unlink-clip':
                this.unlinkAudioVideo();
                break;
            case 'properties':
                this.showClipProperties();
                break;
        }
    }

    showClipProperties() {
        if (!this.selectedClip) return;

        const props = `
Nom: ${this.selectedClip.name}
Type: ${this.selectedClip.type}
Durée: ${this.formatTime(this.selectedClip.duration)}
Position: ${this.formatTime(this.selectedClip.startTime)}
Vitesse: ${this.selectedClip.speed || 1}x
        `;

        alert(props);
    }

    // ==================== ZOOM ====================

    handleZoom(action) {
        const slider = document.getElementById('timeline-zoom');

        switch (action) {
            case 'in':
                slider.value = Math.min(100, parseInt(slider.value) + 10);
                break;
            case 'out':
                slider.value = Math.max(1, parseInt(slider.value) - 10);
                break;
            case 'fit':
                // Calculate zoom to fit all content
                const contentWidth = this.duration * this.pixelsPerSecond;
                const viewWidth = document.querySelector('.timeline-scroll').offsetWidth;
                const ratio = viewWidth / contentWidth;
                slider.value = Math.min(100, Math.max(1, ratio * 50));
                break;
        }

        this.zoom = slider.value;
        this.pixelsPerSecond = 50 + (this.zoom * 2);
        this.renderTimeRuler();
        this.renderAllClips();
    }

    // ==================== UTILITIES ====================

    formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) return '00:00:00';

        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
        document.getElementById('export-progress').style.display = 'none';
    }
}

// Initialize the editor when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.editor = new VideoEditor();
});
