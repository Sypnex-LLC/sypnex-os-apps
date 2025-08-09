// Audio Player App JavaScript

class AudioPlayer {
    constructor() {
        this.currentAudioPath = null;
        this.isPlaying = false;
        this.isRepeatEnabled = false;
        
        this.initElements();
        this.bindEvents();
        
        // Check for pending intents AFTER everything is fully initialized
        this.checkForAppIntent();
    }
    
    initElements() {
        this.elements = {
            openFileBtn: document.getElementById('openFileBtn'),
            repeatBtn: document.getElementById('repeatBtn'),
            playerContainer: document.getElementById('playerContainer'),
            noAudioMessage: document.getElementById('noAudioMessage'),
            audioPlayer: document.getElementById('audioPlayer'),
            audioElement: document.getElementById('audioElement'),
            albumArt: document.getElementById('albumArt'),
            trackTitle: document.getElementById('trackTitle'),
            trackArtist: document.getElementById('trackArtist'),
            trackAlbum: document.getElementById('trackAlbum'),
            currentTime: document.getElementById('currentTime'),
            duration: document.getElementById('duration'),
            progressBar: document.getElementById('progressBar'),
            playPauseBtn: document.getElementById('playPauseBtn'),
            volumeSlider: document.getElementById('volumeSlider'),
            audioInfo: document.getElementById('audioInfo'),
            fileName: document.getElementById('fileName'),
            fileSize: document.getElementById('fileSize'),
            audioDuration: document.getElementById('audioDuration'),
            audioFormat: document.getElementById('audioFormat')
        };
    }
    
    bindEvents() {
        // Button events
        this.elements.openFileBtn.addEventListener('click', () => this.showFileBrowser());
        this.elements.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.elements.repeatBtn.addEventListener('click', () => this.toggleRepeat());
        
        // Audio element events
        this.elements.audioElement.addEventListener('loadedmetadata', () => this.onAudioLoad());
        this.elements.audioElement.addEventListener('timeupdate', () => this.updateProgress());
        this.elements.audioElement.addEventListener('ended', () => this.onAudioEnded());
        this.elements.audioElement.addEventListener('error', () => this.onAudioError());
        
        // Progress bar events
        this.elements.progressBar.addEventListener('input', () => this.onProgressChange());
        
        // Volume control
        this.elements.volumeSlider.addEventListener('input', () => this.onVolumeChange());
        
        // Set initial volume
        this.elements.audioElement.volume = 0.5;
    }
    
    async showFileBrowser() {
        try {
            const filePath = await sypnexAPI.showFileExplorer({
                mode: 'open',
                title: 'Select an Audio File',
                initialPath: '/',
                onSelect: (selectedPath) => {
                },
                onCancel: () => {
                }
            });

            if (!filePath) {
                return; // User cancelled
            }

            // Check if selected file is an audio file
            if (!this.isAudioFile(filePath)) {
                this.showError('Please select a valid audio file');
                return;
            }

            // Load the selected audio
            await this.loadAudio(filePath);

        } catch (error) {
            console.error('Error showing file browser:', error);
            this.showError('Failed to open file browser');
        }
    }
    
    isAudioFile(filePath) {
        const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma'];
        const extension = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
        return audioExtensions.includes(extension);
    }
    
    async loadAudio(filePath) {
        try {
            // Get the audio as a blob
            const blob = await sypnexAPI.readVirtualFileBlob(filePath);
            
            // Create object URL for the blob
            const audioUrl = URL.createObjectURL(blob);
            
            // Update UI
            this.elements.noAudioMessage.style.display = 'none';
            this.elements.audioPlayer.style.display = 'flex';
            this.elements.audioInfo.style.display = 'flex';
            
            // Set audio source
            this.elements.audioElement.src = audioUrl;
            this.currentAudioPath = filePath;
            
            // Update file info
            const fileName = filePath.split('/').pop();
            this.elements.fileName.textContent = fileName;
            this.elements.fileSize.textContent = this.formatFileSize(blob.size);
            
            // Extract basic info from filename
            this.updateTrackInfo(fileName);
            
            // Enable controls
            this.elements.repeatBtn.disabled = false;
            
            // Reset play state
            this.isPlaying = false;
            this.updatePlayPauseButton();
            
        } catch (error) {
            console.error('Error loading audio:', error);
            this.showError('Failed to load audio file');
        }
    }
    
    updateTrackInfo(fileName) {
        // Remove extension and try to parse artist - title
        const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
        
        if (nameWithoutExt.includes(' - ')) {
            const parts = nameWithoutExt.split(' - ');
            this.elements.trackArtist.textContent = parts[0].trim();
            this.elements.trackTitle.textContent = parts[1].trim();
        } else {
            this.elements.trackTitle.textContent = nameWithoutExt;
            this.elements.trackArtist.textContent = 'Unknown Artist';
        }
        
        this.elements.trackAlbum.textContent = 'Unknown Album';
    }
    
    onAudioLoad() {
        const duration = this.elements.audioElement.duration;
        this.elements.duration.textContent = this.formatTime(duration);
        this.elements.audioDuration.textContent = this.formatTime(duration);
        
        // Update format info
        const fileExtension = this.currentAudioPath.substring(this.currentAudioPath.lastIndexOf('.') + 1).toUpperCase();
        this.elements.audioFormat.textContent = fileExtension;
    }
    
    togglePlayPause() {
        if (this.isPlaying) {
            this.elements.audioElement.pause();
            this.isPlaying = false;
        } else {
            this.elements.audioElement.play();
            this.isPlaying = true;
        }
        this.updatePlayPauseButton();
    }
    
    updatePlayPauseButton() {
        const icon = this.elements.playPauseBtn.querySelector('i');
        if (this.isPlaying) {
            icon.className = 'fas fa-pause';
        } else {
            icon.className = 'fas fa-play';
        }
    }
    
    updateProgress() {
        if (this.elements.audioElement.duration) {
            const progress = (this.elements.audioElement.currentTime / this.elements.audioElement.duration) * 100;
            this.elements.progressBar.value = progress;
            this.elements.currentTime.textContent = this.formatTime(this.elements.audioElement.currentTime);
        }
    }
    
    onProgressChange() {
        if (this.elements.audioElement.duration) {
            const time = (this.elements.progressBar.value / 100) * this.elements.audioElement.duration;
            this.elements.audioElement.currentTime = time;
        }
    }
    
    onVolumeChange() {
        this.elements.audioElement.volume = this.elements.volumeSlider.value / 100;
    }
    
    onAudioEnded() {
        this.isPlaying = false;
        this.updatePlayPauseButton();
        
        if (this.isRepeatEnabled) {
            this.elements.audioElement.currentTime = 0;
            this.elements.audioElement.play();
            this.isPlaying = true;
            this.updatePlayPauseButton();
        }
    }
    
    onAudioError() {
        this.showError('Failed to play audio file');
        this.clearAudio();
    }
    
    toggleRepeat() {
        this.isRepeatEnabled = !this.isRepeatEnabled;
        this.elements.repeatBtn.style.opacity = this.isRepeatEnabled ? '1' : '0.6';
    }
    
    clearAudio() {
        this.elements.audioPlayer.style.display = 'none';
        this.elements.audioInfo.style.display = 'none';
        this.elements.noAudioMessage.style.display = 'block';
        
        // Disable controls
        this.elements.repeatBtn.disabled = true;
        
        this.currentAudioPath = null;
        this.isPlaying = false;
        this.updatePlayPauseButton();
    }
    
    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return Math.floor(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
    }
    
    // Check for app intents (e.g., file to open from VFS)
    async checkForAppIntent() {
        try {
            // Check if SypnexAPI is available
            if (typeof sypnexAPI === 'undefined' || !sypnexAPI) {
                return;
            }
            
            // Read intent from user preferences (where it's stored)
            const intentData = await sypnexAPI.getPreference('audio_player', '_pending_intent', null);
            
            if (intentData && intentData.action === 'open_file') {
                
                // Clear the intent immediately after reading it, regardless of success/failure
                await sypnexAPI.setPreference('audio_player', '_pending_intent', null);
                
                const fileData = intentData.data;
                if (fileData && fileData.filePath) {
                    
                    // Use existing file loading logic instead of duplicating it
                    await this.loadAudio(fileData.filePath);
                    
                } else {
                    console.warn('Audio Player: Invalid file data in intent:', fileData);
                }
            }
        } catch (error) {
            console.error('Audio Player: Error checking for app intent:', error);
        }
    }
    
    showError(message) {
        console.error(message);
        if (typeof sypnexAPI !== 'undefined' && sypnexAPI.showNotification) {
            sypnexAPI.showNotification(message, 'error');
        } else {
            alert(message);
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new AudioPlayer();
    });
} else {
    new AudioPlayer();
}
