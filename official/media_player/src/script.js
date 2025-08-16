// Video Player App JavaScript



class VideoPlayer {
    constructor() {
        this.elements = {};
        this.currentFile = null;
        this.isDragging = false;
        this.isFullscreen = false;
        
        this.initElements();
        this.initEventListeners();
        this.checkForAppIntent();
        

    }
    
    initElements() {
        this.elements.openFileBtn = document.querySelector('#openFileBtn');
        this.elements.video = document.querySelector('#videoElement');
        this.elements.videoSource = document.querySelector('#video-source');
        this.elements.noVideoMessage = document.querySelector('#noVideoMessage');
        this.elements.videoInfo = document.querySelector('#videoInfo');
        this.elements.videoControls = document.querySelector('#videoControls');
        this.elements.fileName = document.querySelector('#fileName');
        this.elements.fileSize = document.querySelector('#fileSize');
        this.elements.videoDuration = document.querySelector('#videoDuration');
        this.elements.playPauseBtn = document.querySelector('.play-pause-btn');
        this.elements.progressBar = document.querySelector('.progress-bar');
        this.elements.timeDisplay = document.querySelector('.time-display');
        this.elements.volumeBtn = document.querySelector('.volume-btn');
        this.elements.volumeSlider = document.querySelector('.volume-slider');
        this.elements.fullscreenBtn = document.querySelector('.fullscreen-btn');
    }
    
    initEventListeners() {
        // Browse button
        this.elements.openFileBtn.addEventListener('click', () => this.browseFiles());
        
        // Video controls
        this.elements.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.elements.video.addEventListener('click', () => this.togglePlayPause());
        
        // Progress bar
        this.elements.progressBar.addEventListener('input', () => this.seekVideo());
        this.elements.progressBar.addEventListener('mousedown', () => this.isDragging = true);
        this.elements.progressBar.addEventListener('mouseup', () => this.isDragging = false);
        
        // Volume controls
        this.elements.volumeBtn.addEventListener('click', () => this.toggleMute());
        this.elements.volumeSlider.addEventListener('input', () => this.changeVolume());
        
        // Fullscreen
        this.elements.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        
        // Video events
        this.elements.video.addEventListener('loadedmetadata', () => this.onVideoLoaded());
        this.elements.video.addEventListener('timeupdate', () => this.updateProgress());
        this.elements.video.addEventListener('ended', () => this.onVideoEnded());
        this.elements.video.addEventListener('error', (e) => this.onVideoError(e));
        
        // Register keyboard shortcuts using new SypnexAPI
        this.setupKeyboardShortcuts();
        
        // Fullscreen change events
        document.addEventListener('fullscreenchange', () => this.onFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.onFullscreenChange());
        document.addEventListener('mozfullscreenchange', () => this.onFullscreenChange());
        document.addEventListener('MSFullscreenChange', () => this.onFullscreenChange());
    }
    
    async browseFiles() {
        try {
            if (typeof sypnexAPI === 'undefined' || !sypnexAPI) {
                this.showError('SypnexAPI not available');
                return;
            }
            
            const filePath = await sypnexAPI.showFileExplorer({
                title: 'Select Video File',
                fileFilter: {
                    extensions: ['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv'],
                    description: 'Video Files'
                }
            });
            
            if (filePath) {
                await this.loadVideo(filePath);
            }
        } catch (error) {
            console.error('Error browsing files:', error);
            this.showError('Failed to browse files');
        }
    }
    
    async loadVideo(filePath) {
        try {
            // Reset video state first
            this.elements.video.pause();
            this.elements.video.currentTime = 0;
            
            // Get the video as a blob
            const blob = await sypnexAPI.readVirtualFileBlob(filePath);
            
            // Create object URL for the blob
            const url = URL.createObjectURL(blob);
            
            // Set video source and remove built-in controls
            this.elements.videoSource.src = url;
            this.elements.videoSource.type = this.getVideoMimeType(this.getFileExtension(filePath));
            this.elements.video.controls = false; // Hide built-in controls
            
            // Load the video and wait for it to be ready
            this.elements.video.load();
            
            // Wait for loadedmetadata before showing controls
            await new Promise((resolve) => {
                const onLoaded = () => {
                    this.elements.video.removeEventListener('loadedmetadata', onLoaded);
                    resolve();
                };
                this.elements.video.addEventListener('loadedmetadata', onLoaded);
            });
            
            // Show video elements, hide no-video message
            this.elements.noVideoMessage.style.display = 'none';
            this.elements.video.style.display = 'block';
            this.elements.videoInfo.style.display = 'block';
            this.elements.videoControls.style.display = 'flex';
            
            // Update file info
            const fileName = filePath.split('/').pop();
            this.elements.fileName.textContent = fileName;
            this.elements.fileSize.textContent = this.formatFileSize(blob.size);
            
            this.currentFile = filePath;

        } catch (error) {
            console.error('Error loading video:', error);
            this.showError('Failed to load video file');
        }
    }
    
    getFileExtension(filePath) {
        return filePath.split('.').pop().toLowerCase();
    }
    
    getVideoMimeType(extension) {
        const types = {
            mp4: 'video/mp4',
            webm: 'video/webm',
            ogg: 'video/ogg',
            avi: 'video/x-msvideo',
            mov: 'video/quicktime',
            wmv: 'video/x-ms-wmv',
            flv: 'video/x-flv',
            mkv: 'video/x-matroska'
        };
        return types[extension.toLowerCase()] || 'video/mp4';
    }
    
    // Check for app intents (e.g., file to open from VFS)
    async checkForAppIntent() {
        try {
            // Check if SypnexAPI is available
            if (typeof sypnexAPI === 'undefined' || !sypnexAPI) {
                return;
            }
            
            // Read intent from user preferences (where it's stored)
            const intentData = await sypnexAPI.getPreference(sypnexAPI.getAppId(), '_pending_intent', null);
            
            if (intentData && intentData.action === 'open_file') {
                
                // Clear the intent immediately after reading it, regardless of success/failure
                await sypnexAPI.setPreference(sypnexAPI.getAppId(), '_pending_intent', null);
                
                const fileData = intentData.data;
                if (fileData && fileData.filePath) {
                    
                    // Use existing file loading logic instead of duplicating it
                    await this.loadVideo(fileData.filePath);
                    
                } else {
                    console.warn('Video Player: Invalid file data in intent:', fileData);
                }
            }
        } catch (error) {
            console.error('Video Player: Error checking for app intent:', error);
        }
    }
    
    togglePlayPause() {
        if (!this.currentFile || this.elements.video.readyState < 2) return;
        
        if (this.elements.video.paused) {
            this.elements.video.play().catch(error => {

                // Don't show error to user, this is normal browser behavior
            });
            this.elements.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            this.elements.video.pause();
            this.elements.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    }
    
    seekVideo() {
        if (!this.currentFile || this.elements.video.duration === 0) return;
        
        const seekTime = (this.elements.progressBar.value / 100) * this.elements.video.duration;
        this.elements.video.currentTime = seekTime;
    }
    
    toggleMute() {
        this.elements.video.muted = !this.elements.video.muted;
        this.updateVolumeIcon();
        
        if (this.elements.video.muted) {
            this.elements.volumeSlider.value = 0;
        } else {
            this.elements.volumeSlider.value = this.elements.video.volume * 100;
        }
    }
    
    changeVolume() {
        const volume = this.elements.volumeSlider.value / 100;
        this.elements.video.volume = volume;
        this.elements.video.muted = volume === 0;
        this.updateVolumeIcon();
    }
    
    updateVolumeIcon() {
        const icon = this.elements.volumeBtn.querySelector('i');
        if (this.elements.video.muted || this.elements.video.volume === 0) {
            icon.className = 'fas fa-volume-mute';
        } else if (this.elements.video.volume < 0.5) {
            icon.className = 'fas fa-volume-down';
        } else {
            icon.className = 'fas fa-volume-up';
        }
    }
    
    toggleFullscreen() {
        if (!this.isFullscreen) {
            this.enterFullscreen();
        } else {
            this.exitFullscreen();
        }
    }
    
    enterFullscreen() {
        const element = this.elements.video;
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
    }
    
    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
    
    onFullscreenChange() {
        this.isFullscreen = !!(document.fullscreenElement || 
                             document.webkitFullscreenElement || 
                             document.mozFullScreenElement || 
                             document.msFullscreenElement);
        
        const icon = this.elements.fullscreenBtn.querySelector('i');
        icon.className = this.isFullscreen ? 'fas fa-compress' : 'fas fa-expand';
    }
    
    setupKeyboardShortcuts() {
        // Check if SypnexAPI keyboard functionality is available
        if (typeof sypnexAPI === 'undefined' || !sypnexAPI || !sypnexAPI.registerKeyboardShortcuts) {
            console.warn('SypnexAPI keyboard shortcuts not available');
            return;
        }
        
        // Register keyboard shortcuts using the new SypnexAPI
        sypnexAPI.registerKeyboardShortcuts({
            'space': () => {
                if (this.currentFile) this.togglePlayPause();
            },
            'f': () => {
                if (this.currentFile) this.toggleFullscreen();
            },
            'escape': () => {
                if (this.isFullscreen) this.exitFullscreen();
            },
            'm': () => {
                if (this.currentFile) this.toggleMute();
            },
            'arrowleft': () => {
                if (this.currentFile && this.elements.video.duration) {
                    this.elements.video.currentTime = Math.max(0, this.elements.video.currentTime - 10);
                }
            },
            'arrowright': () => {
                if (this.currentFile && this.elements.video.duration) {
                    this.elements.video.currentTime = Math.min(this.elements.video.duration, this.elements.video.currentTime + 10);
                }
            }
        }, {
            preventDefault: true,
            stopPropagation: false
        });
        

    }
    
    onVideoLoaded() {

        this.updateProgress();
        this.elements.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        
        // Update duration in info panel
        if (this.elements.videoDuration) {
            this.elements.videoDuration.textContent = this.formatTime(this.elements.video.duration);
        }
    }
    
    updateProgress() {
        if (!this.currentFile || this.isDragging) return;
        
        const progress = (this.elements.video.currentTime / this.elements.video.duration) * 100;
        this.elements.progressBar.value = progress || 0;
        
        this.elements.timeDisplay.textContent = 
            `${this.formatTime(this.elements.video.currentTime)} / ${this.formatTime(this.elements.video.duration)}`;
    }
    
    onVideoEnded() {
        this.elements.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        this.elements.progressBar.value = 100;
    }
    
    onVideoError(event) {
        console.error('Video error:', event);
        this.showError('Failed to play video file');
    }
    
    formatTime(seconds) {
        if (isNaN(seconds)) return '00:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    showError(message) {
        // Show error in the no-video message area
        this.elements.noVideoMessage.style.display = 'block';
        this.elements.video.style.display = 'none';
        this.elements.videoInfo.style.display = 'none';
        this.elements.videoControls.style.display = 'none';
        
        // Update message
        const messageP = this.elements.noVideoMessage.querySelector('p');
        if (messageP) {
            messageP.textContent = message;
        }
        
        console.error('Video Player Error:', message);
    }
}

// Initialize when DOM is ready
function initApp() {

    
    // Check if SypnexAPI is available
    if (typeof sypnexAPI === 'undefined' || !sypnexAPI) {
        console.warn('SypnexAPI not available - running in standalone mode');
        return;
    }
    
    // Initialize video player
    new VideoPlayer();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
