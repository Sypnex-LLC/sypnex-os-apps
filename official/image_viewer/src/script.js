// Image Viewer App JavaScript



class ImageViewer {
    constructor() {
        this.currentImagePath = null;
        this.currentZoom = 1.0;
        this.isDragging = false;
        this.lastMousePos = { x: 0, y: 0 };
        this.imageOffset = { x: 0, y: 0 };
        this.supportedFormats = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
        
        this.initializeElements();
        this.bindEvents();
        
        // Check for pending intents AFTER everything is fully initialized
        this.checkForAppIntent();
    }
    
    initializeElements() {
        // Get all DOM elements
        this.elements = {
            openFileBtn: document.getElementById('openFileBtn'),
            zoomInBtn: document.getElementById('zoomInBtn'),
            zoomOutBtn: document.getElementById('zoomOutBtn'),
            resetZoomBtn: document.getElementById('resetZoomBtn'),
            imageContainer: document.getElementById('imageContainer'),
            noImageMessage: document.getElementById('noImageMessage'),
            imageDisplay: document.getElementById('imageDisplay'),
            imageInfo: document.getElementById('imageInfo'),
            fileName: document.getElementById('fileName'),
            fileSize: document.getElementById('fileSize'),
            imageDimensions: document.getElementById('imageDimensions'),
            zoomLevel: document.getElementById('zoomLevel')
        };
    }
    
    bindEvents() {
        // Button events
        this.elements.openFileBtn.addEventListener('click', () => this.showFileBrowser());
        this.elements.zoomInBtn.addEventListener('click', () => this.zoomIn());
        this.elements.zoomOutBtn.addEventListener('click', () => this.zoomOut());
        this.elements.resetZoomBtn.addEventListener('click', () => this.resetZoom());
        
        // Image drag events
        this.elements.imageContainer.addEventListener('mousedown', (e) => this.startDrag(e));
        this.elements.imageContainer.addEventListener('mousemove', (e) => this.drag(e));
        this.elements.imageContainer.addEventListener('mouseup', () => this.endDrag());
        this.elements.imageContainer.addEventListener('mouseleave', () => this.endDrag());
        
        // Wheel zoom
        this.elements.imageContainer.addEventListener('wheel', (e) => this.handleWheel(e));
        
        // Image load event
        this.elements.imageDisplay.addEventListener('load', () => this.onImageLoad());
        this.elements.imageDisplay.addEventListener('error', () => this.onImageError());
    }
    
    async showFileBrowser() {
        try {
            const filePath = await sypnexAPI.showFileExplorer({
                mode: 'open',
                title: 'Select an Image',
                initialPath: '/',
                onSelect: (selectedPath) => {
                },
                onCancel: () => {
                }
            });

            if (!filePath) {
                return; // User cancelled
            }

            // Check if selected file is an image
            if (!this.isImageFile(filePath)) {
                this.showError('Please select a valid image file');
                return;
            }

            // Load the selected image
            await this.loadImage(filePath);

        } catch (error) {
            console.error('Error showing file browser:', error);
            this.showError('Failed to open file browser');
        }
    }
    
    isImageFile(filePath) {
        const filename = filePath.split('/').pop();
        const ext = filename.toLowerCase().split('.').pop();
        return this.supportedFormats.includes(ext);
    }
    
    async loadImage(filePath) {
        try {

            
            // Get the image as a blob
            const blob = await sypnexAPI.readVirtualFileBlob(filePath);
            
            // Create object URL for the blob
            const imageUrl = URL.createObjectURL(blob);
            
            // Update UI
            this.elements.noImageMessage.style.display = 'none';
            this.elements.imageDisplay.style.display = 'block';
            this.elements.imageInfo.style.display = 'flex';
            
            // Set image source
            this.elements.imageDisplay.src = imageUrl;
            this.currentImagePath = filePath;
            
            // Update file info
            const fileName = filePath.split('/').pop();
            this.elements.fileName.textContent = fileName;
            this.elements.fileSize.textContent = this.formatFileSize(blob.size);
            
            // Enable controls
            this.elements.zoomInBtn.disabled = false;
            this.elements.zoomOutBtn.disabled = false;
            this.elements.resetZoomBtn.disabled = false;
            
            // Reset zoom and position
            this.currentZoom = 1.0;
            this.imageOffset = { x: 0, y: 0 };
            this.updateImageTransform();
            
        } catch (error) {
            console.error('Error loading image:', error);
            this.showError('Failed to load image');
        }
    }
    
    onImageLoad() {
        // Update dimensions
        const img = this.elements.imageDisplay;
        this.elements.imageDimensions.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
    }
    
    onImageError() {
        this.showError('Failed to display image');
        this.clearImage();
    }
    
    clearImage() {
        this.elements.imageDisplay.style.display = 'none';
        this.elements.imageInfo.style.display = 'none';
        this.elements.noImageMessage.style.display = 'block';
        
        // Disable controls
        this.elements.zoomInBtn.disabled = true;
        this.elements.zoomOutBtn.disabled = true;
        this.elements.resetZoomBtn.disabled = true;
        
        this.currentImagePath = null;
        this.currentZoom = 1.0;
    }
    
    zoomIn() {
        this.currentZoom *= 1.2;
        this.updateImageTransform();
    }
    
    zoomOut() {
        this.currentZoom /= 1.2;
        this.updateImageTransform();
    }
    
    resetZoom() {
        this.currentZoom = 1.0;
        this.imageOffset = { x: 0, y: 0 };
        this.updateImageTransform();
    }
    
    updateImageTransform() {
        const img = this.elements.imageDisplay;
        
        // Disable transitions during dragging for smooth performance
        if (this.isDragging) {
            img.style.transition = 'none';
        } else {
            img.style.transition = 'transform 0.2s ease';
        }
        
        const transform = `translate(${this.imageOffset.x}px, ${this.imageOffset.y}px) scale(${this.currentZoom})`;
        img.style.transform = transform;
        
        // Enable overflow when zoomed beyond 1.0, disable otherwise
        if (this.currentZoom > 1.0) {
            this.elements.imageContainer.style.overflow = 'auto';
        } else {
            this.elements.imageContainer.style.overflow = 'hidden';
        }
        
        // Update zoom level display
        const zoomPercent = Math.round(this.currentZoom * 100);
        this.elements.zoomLevel.textContent = `${zoomPercent}%`;
    }
    
    startDrag(e) {
        if (!this.currentImagePath) return;
        
        this.isDragging = true;
        this.lastMousePos = { x: e.clientX, y: e.clientY };
        this.elements.imageContainer.style.cursor = 'grabbing';
        e.preventDefault();
    }
    
    drag(e) {
        if (!this.isDragging) return;
        
        const deltaX = e.clientX - this.lastMousePos.x;
        const deltaY = e.clientY - this.lastMousePos.y;
        
        this.imageOffset.x += deltaX;
        this.imageOffset.y += deltaY;
        
        this.updateImageTransform();
        
        this.lastMousePos = { x: e.clientX, y: e.clientY };
    }
    
    endDrag() {
        this.isDragging = false;
        this.elements.imageContainer.style.cursor = 'grab';
    }
    
    handleWheel(e) {
        if (!this.currentImagePath) return;
        
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.currentZoom *= delta;
        
        // Clamp zoom levels
        this.currentZoom = Math.max(0.1, Math.min(10, this.currentZoom));
        
        this.updateImageTransform();
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
                    await this.loadImage(fileData.filePath);
                    
                } else {
                    console.warn('Image Viewer: Invalid file data in intent:', fileData);
                }
            }
        } catch (error) {
            console.error('Image Viewer: Error checking for app intent:', error);
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
function initApp() {

    
    // Check if SypnexAPI is available
    if (typeof sypnexAPI === 'undefined' || !sypnexAPI) {
        console.warn('SypnexAPI not available - running in standalone mode');
        return;
    }


    
    // Initialize the image viewer
    const imageViewer = new ImageViewer();
    
    // Make it globally accessible for debugging
    sypnexAPI.getAppWindow().imageViewer = imageViewer;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // DOM is already loaded
    initApp();
}
