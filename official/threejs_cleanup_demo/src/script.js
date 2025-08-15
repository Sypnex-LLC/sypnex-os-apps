// Three.js Cleanup Demo JavaScript

console.log('Three.js Cleanup Demo loading...');

// Global variables for Three.js scene
let scene, camera, renderer, cube;
let animationId;
let gameRunning = false;
let frameCount = 0;
let lastTime = Date.now();
let fpsCounter = 0;

// Proof of cleanup variables
let backgroundLogger;
let loggerRunning = false;
let ENABLE_CLEANUP = true; // Set to false to test without cleanup

// Initialize when DOM is ready
function initApp() {
    console.log('🎮 Three.js Cleanup Demo initialized');

    // Check if SypnexAPI is available
    if (typeof sypnexAPI === 'undefined' || !sypnexAPI) {
        console.warn('SypnexAPI not available - running in standalone mode');
        updateStatus('Error: API not available');
        return;
    }

    console.log('🔧 SypnexAPI available:', sypnexAPI);
    console.log('📱 App ID:', sypnexAPI.getAppId());

    // Register cleanup functions FIRST - this is the key part!
    registerCleanupHooks();

    // Start background logger to prove cleanup works
    startBackgroundLogger();

    // Load Three.js library dynamically
    loadThreeJS().then(() => {
        // Initialize Three.js scene
        initThreeJSScene();
        
        // Setup UI controls
        setupControls();
        
        // Start the animation loop
        startAnimationLoop();
        
        updateStatus('Running');
        
        sypnexAPI.showNotification('Three.js Demo started! Close the app to see cleanup in console.', 'success');
    }).catch(error => {
        console.error('Failed to load Three.js:', error);
        updateStatus('Error: Failed to load Three.js');
    });
}

function registerCleanupHooks() {
    console.log('🔧 Registering cleanup hooks...');
    console.log('🧪 CLEANUP ENABLED:', ENABLE_CLEANUP);
    
    // Only register cleanup if enabled (for testing)
    if (!ENABLE_CLEANUP) {
        console.warn('⚠️ CLEANUP DISABLED - App will leave processes running!');
        console.warn('⚠️ Background logger will continue after app close!');
        return;
    }
    
    // Primary Three.js cleanup hook
    sypnexAPI.onBeforeClose(() => {
        console.log('🧹 === CLEANUP STARTED ===');
        console.log('🛑 Stopping animation loop...');
        
        // Stop the animation loop
        gameRunning = false;
        if (animationId) {
            sypnexAPI.getAppWindow().cancelAnimationFrame(animationId);
            console.log('✅ Animation frame cancelled (ID: ' + animationId + ')');
        }
        
        // Stop background logger - this is the proof!
        stopBackgroundLogger();
        
        // Dispose of Three.js resources
        if (renderer) {
            console.log('🔥 Disposing renderer...');
            renderer.dispose();
            console.log('✅ Renderer disposed');
        }
        
        if (scene) {
            console.log('🔥 Disposing scene materials and geometries...');
            // Dispose of geometries and materials
            scene.traverse((object) => {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            console.log('✅ Scene materials and geometries disposed');
        }
        
        // Clear DOM references
        const container = document.getElementById('canvas-container');
        if (container && renderer && renderer.domElement) {
            container.removeChild(renderer.domElement);
            console.log('✅ Canvas removed from DOM');
        }
        
        console.log('🎉 Three.js cleanup completed successfully!');
        console.log('🧹 === CLEANUP FINISHED ===');
    }, 'Three.js scene cleanup');
    
    // Save demo state
    sypnexAPI.onBeforeClose(() => {
        const sessionData = {
            lastFrameCount: frameCount,
            lastSession: Date.now(),
            totalRuntime: Math.round((Date.now() - lastTime) / 1000),
            cleanupEnabled: ENABLE_CLEANUP
        };
        
        sypnexAPI.setSetting('sessionData', JSON.stringify(sessionData));
        console.log('✅ Demo state saved:', sessionData);
    }, 'Save demo state');
    
    console.log('✅ Cleanup hooks registered successfully');
}

async function loadThreeJS() {
    return new Promise((resolve, reject) => {
        if (typeof THREE !== 'undefined') {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        script.onload = () => {
            console.log('✅ Three.js library loaded');
            resolve();
        };
        script.onerror = () => {
            reject(new Error('Failed to load Three.js library'));
        };
        
        // In SYPNEX OS sandbox, append to document body instead
        document.body.appendChild(script);
    });
}

function initThreeJSScene() {
    console.log('🎨 Initializing Three.js scene...');
    
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    
    // Get container dimensions
    const container = document.getElementById('canvas-container');
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Add canvas to container
    container.appendChild(renderer.domElement);
    
    // Create cube
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshPhongMaterial({ 
        color: 0x007acc,
        shininess: 100
    });
    cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;
    scene.add(cube);
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    console.log('✅ Three.js scene initialized');
}

function startAnimationLoop() {
    gameRunning = true;
    lastTime = Date.now();
    animate();
    console.log('▶️ Animation loop started');
}

function animate() {
    if (!gameRunning) {
        console.log('⏹️ Animation loop stopped');
        return;
    }
    
    // Update frame counter
    frameCount++;
    
    // Calculate FPS
    const currentTime = Date.now();
    if (currentTime - lastTime >= 1000) {
        document.getElementById('fps').textContent = fpsCounter;
        document.getElementById('frame-count').textContent = frameCount;
        fpsCounter = 0;
        lastTime = currentTime;
    }
    fpsCounter++;
    
    // Rotate cube
    if (cube) {
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
    }
    
    // Render scene
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
    
    // Continue animation loop
    animationId = sypnexAPI.getAppWindow().requestAnimationFrame(animate);
}

function setupControls() {
    console.log('🎮 Setting up controls...');
    
    document.getElementById('play-pause').addEventListener('click', () => {
        if (gameRunning) {
            gameRunning = false;
            updateStatus('Paused');
            document.getElementById('play-pause').textContent = '▶️ Play';
            console.log('⏸️ Animation paused');
        } else {
            startAnimationLoop();
            updateStatus('Running');
            document.getElementById('play-pause').textContent = '⏸️ Pause';
            console.log('▶️ Animation resumed');
        }
    });
    
    document.getElementById('reset').addEventListener('click', () => {
        if (cube) {
            cube.rotation.x = 0;
            cube.rotation.y = 0;
            frameCount = 0;
            console.log('🔄 Cube reset');
        }
        if (sypnexAPI) {
            sypnexAPI.showNotification('Cube reset!', 'info');
        }
    });
    
    document.getElementById('color-change').addEventListener('click', () => {
        if (cube && cube.material) {
            const colors = [0x007acc, 0xff5722, 0x4caf50, 0x9c27b0, 0xff9800, 0xf44336];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            cube.material.color.setHex(randomColor);
            console.log('🎨 Cube color changed to:', '#' + randomColor.toString(16));
            
            if (sypnexAPI) {
                sypnexAPI.showNotification('Color changed!', 'success');
            }
        }
    });
    
    console.log('✅ Controls setup complete');
}

function updateStatus(status) {
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.textContent = status;
    }
}

// Proof-of-cleanup functions
function startBackgroundLogger() {
    if (loggerRunning) return;
    
    loggerRunning = true;
    let logCount = 0;
    
    console.log('🚀 Starting background animation loop logger (proof cleanup works)...');
    
    // Use requestAnimationFrame instead of setInterval - this won't be auto-cleaned by sandbox
    function backgroundAnimationLoop() {
        if (!loggerRunning) return;
        
        logCount++;
        console.log(`📋 Background animation loop still running... (${logCount}) - App ID: ${sypnexAPI.getAppId()}`);
        
        // Update UI to show logger is running
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = `Running (AnimLoop: ${logCount})`;
        }
        
        // Schedule next frame - this is what keeps running without cleanup!
        backgroundLogger = sypnexAPI.getAppWindow().requestAnimationFrame(backgroundAnimationLoop);
    }
    
    backgroundAnimationLoop();
    console.log('✅ Background animation loop started - this should STOP when app is closed if cleanup works');
}

function stopBackgroundLogger() {
    if (!loggerRunning) return;
    
    console.log('🛑 Stopping background animation loop...');
    if (backgroundLogger) {
        sypnexAPI.getAppWindow().cancelAnimationFrame(backgroundLogger);
        backgroundLogger = null;
    }
    loggerRunning = false;
    console.log('✅ Background animation loop stopped - cleanup working correctly!');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

console.log('🎮 Three.js Cleanup Demo script loaded');
