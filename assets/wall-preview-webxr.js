// @ts-nocheck
class WebXRWallPreview {
  constructor() {
    this.modal = null;
    this.container = null;
    this.isActive = false;
    this.isXRSupported = false;
    
    // Three.js
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.artworkMesh = null;
    this.reticle = null;
    
    // WebXR
    this.xrSession = null;
    this.xrRefSpace = null;
    this.hitTestSource = null;
    this.hitTestSourceRequested = false;
    this.artworkAnchor = null;
    
    // Artwork data
    this.artworkImageURL = null;
    this.artworkTexture = null;
    this.artworkAspectRatio = 1;
    this.artworkScale = 0.5; // 50cm default width
    
    // State
    this.isPlaced = false;
    this.hasEverPlaced = false;
    
    this.init();
  }

  async init() {
    document.addEventListener('DOMContentLoaded', async () => {
      this.modal = document.querySelector('[data-webxr-modal]');
      this.container = document.querySelector('[data-webxr-container]');
      
      if (!this.modal || !this.container) return;
      
      // Check WebXR support
      if ('xr' in navigator) {
        this.isXRSupported = await navigator.xr.isSessionSupported('immersive-ar');
      }
      
      this.setupTriggers();
      this.setupControls();
      this.setupThreeJS();
    });
  }

  setupTriggers() {
    const triggers = document.querySelectorAll('[data-webxr-preview-trigger]');
    
    triggers.forEach(trigger => {
      trigger.addEventListener('click', async (e) => {
        e.preventDefault();
        const productImage = trigger.dataset.productImage;
        const productTitle = trigger.dataset.productTitle;
        
        if (productImage) {
          await this.open(productImage, productTitle);
        }
      });
    });
  }

  setupControls() {
    const closeBtn = document.querySelector('[data-webxr-close]');
    const sizeUpBtn = document.querySelector('[data-webxr-size-up]');
    const sizeDownBtn = document.querySelector('[data-webxr-size-down]');
    const resetBtn = document.querySelector('[data-webxr-reset]');
    const captureBtn = document.querySelector('[data-webxr-capture]');
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }
    
    if (sizeUpBtn) {
      sizeUpBtn.addEventListener('click', () => {
        this.artworkScale = Math.min(this.artworkScale + 0.1, 2.0);
        this.updateArtworkScale();
      });
    }
    
    if (sizeDownBtn) {
      sizeDownBtn.addEventListener('click', () => {
        this.artworkScale = Math.max(this.artworkScale - 0.1, 0.2);
        this.updateArtworkScale();
      });
    }
    
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetPlacement();
      });
    }
    
    if (captureBtn) {
      captureBtn.addEventListener('click', () => {
        this.capture();
      });
    }
  }

  setupThreeJS() {
    // Scene
    this.scene = new THREE.Scene();
    
    // Camera (will be controlled by XR)
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      preserveDrawingBuffer: true // For screenshots
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 5, 5);
    this.scene.add(directionalLight);
    
    // Reticle (placement indicator)
    this.createReticle();
    
    // Handle window resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  createReticle() {
    const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x667eea,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    
    this.reticle = new THREE.Mesh(geometry, material);
    this.reticle.matrixAutoUpdate = false;
    this.reticle.visible = false;
    this.scene.add(this.reticle);
  }

  async createArtworkMesh(imageURL) {
    return new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      
      loader.load(
        imageURL,
        (texture) => {
          this.artworkTexture = texture;
          
          // Calculate aspect ratio
          this.artworkAspectRatio = texture.image.height / texture.image.width;
          
          // Create plane geometry
          const width = this.artworkScale;
          const height = this.artworkScale * this.artworkAspectRatio;
          
          const geometry = new THREE.PlaneGeometry(width, height);
          const material = new THREE.MeshStandardMaterial({ 
            map: texture,
            side: THREE.DoubleSide,
            metalness: 0.1,
            roughness: 0.8
          });
          
          this.artworkMesh = new THREE.Mesh(geometry, material);
          this.artworkMesh.visible = false;
          
          // Add frame/shadow effect
          const frameMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff,
            side: THREE.BackSide
          });
          const frameGeometry = new THREE.PlaneGeometry(width + 0.05, height + 0.05);
          const frame = new THREE.Mesh(frameGeometry, frameMaterial);
          frame.position.z = -0.01;
          this.artworkMesh.add(frame);
          
          this.scene.add(this.artworkMesh);
          resolve();
        },
        undefined,
        (error) => {
          console.error('Error loading artwork texture:', error);
          reject(error);
        }
      );
    });
  }

  updateArtworkScale() {
    if (!this.artworkMesh) return;
    
    const width = this.artworkScale;
    const height = this.artworkScale * this.artworkAspectRatio;
    
    this.artworkMesh.scale.set(width / 0.5, height / (0.5 * this.artworkAspectRatio), 1);
  }

  async open(productImageURL, productTitle) {
    try {
      if (!this.isXRSupported) {
        this.showError('AR no está disponible en este dispositivo. Necesitas un dispositivo compatible con ARCore (Android 7+) o ARKit (iOS 13+).');
        return;
      }
      
      this.modal.classList.add('active');
      this.isActive = true;
      document.body.style.overflow = 'hidden';
      
      this.showLoading('Cargando...');
      
      // Load artwork
      this.artworkImageURL = productImageURL;
      await this.createArtworkMesh(productImageURL);
      
      this.hideLoading();
      this.showInfo('Toca una pared para colocar el cuadro');
      
      // Start XR session
      await this.startXRSession();
      
    } catch (error) {
      console.error('Error opening WebXR:', error);
      this.showError(this.getErrorMessage(error));
    }
  }

  async startXRSession() {
    try {
      // Request XR session
      this.xrSession = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test', 'anchors'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: this.modal }
      });
      
      // Setup renderer for XR
      await this.renderer.xr.setSession(this.xrSession);
      
      // Append canvas to container
      this.container.innerHTML = '';
      this.container.appendChild(this.renderer.domElement);
      
      // Get reference space
      this.xrRefSpace = await this.xrSession.requestReferenceSpace('local-floor');
      
      // Setup hit testing
      this.setupHitTesting();
      
      // Handle session end
      this.xrSession.addEventListener('end', () => {
        this.onXRSessionEnd();
      });
      
      // Handle select (tap to place)
      this.xrSession.addEventListener('select', (event) => {
        this.onSelect(event);
      });
      
      // Start render loop
      this.renderer.setAnimationLoop((time, frame) => {
        this.onXRFrame(time, frame);
      });
      
      this.showControls();
      
    } catch (error) {
      console.error('Error starting XR session:', error);
      throw new Error('XR_SESSION_FAILED');
    }
  }

  async setupHitTesting() {
    this.hitTestSourceRequested = true;
    
    this.xrSession.requestReferenceSpace('viewer').then((referenceSpace) => {
      this.xrSession.requestHitTestSource({ space: referenceSpace }).then((source) => {
        this.hitTestSource = source;
      });
    });
  }

  onXRFrame(time, frame) {
    if (!frame) return;
    
    const pose = frame.getViewerPose(this.xrRefSpace);
    
    if (pose) {
      // Hit testing for placement indicator
      if (this.hitTestSource && !this.isPlaced) {
        const hitTestResults = frame.getHitTestResults(this.hitTestSource);
        
        if (hitTestResults.length > 0) {
          const hit = hitTestResults[0];
          const hitPose = hit.getPose(this.xrRefSpace);
          
          if (hitPose) {
            this.reticle.visible = true;
            this.reticle.matrix.fromArray(hitPose.transform.matrix);
          }
        } else {
          this.reticle.visible = false;
        }
      }
      
      // Update artwork position from anchor
      if (this.artworkAnchor && this.artworkMesh) {
        const anchorPose = frame.getPose(this.artworkAnchor.anchorSpace, this.xrRefSpace);
        
        if (anchorPose) {
          this.artworkMesh.matrix.fromArray(anchorPose.transform.matrix);
          this.artworkMesh.matrixAutoUpdate = false;
        }
      }
      
      // Render
      this.renderer.render(this.scene, this.camera);
    }
  }

  async onSelect(event) {
    if (!this.hitTestSource || !this.artworkMesh) return;
    
    const frame = event.frame;
    const hitTestResults = frame.getHitTestResults(this.hitTestSource);
    
    if (hitTestResults.length > 0) {
      const hit = hitTestResults[0];
      const hitPose = hit.getPose(this.xrRefSpace);
      
      if (hitPose) {
        // Create anchor at hit position
        if (this.xrSession.createAnchor) {
          try {
            const anchor = await this.xrSession.createAnchor(
              hitPose.transform,
              this.xrRefSpace
            );
            
            // Remove old anchor if exists
            if (this.artworkAnchor) {
              this.artworkAnchor.delete();
            }
            
            this.artworkAnchor = anchor;
            
            // Show artwork at anchor position
            this.artworkMesh.visible = true;
            this.artworkMesh.matrix.fromArray(hitPose.transform.matrix);
            
            // Rotate to face camera (perpendicular to wall)
            const matrix = new THREE.Matrix4().fromArray(hitPose.transform.matrix);
            const normal = new THREE.Vector3(0, 0, 1);
            normal.applyMatrix4(matrix);
            
            // Adjust rotation so artwork faces outward from wall
            this.artworkMesh.rotation.x = 0;
            
            this.isPlaced = true;
            this.hasEverPlaced = true;
            this.reticle.visible = false;
            
            this.hideInfo();
            this.showInfo('Cuadro colocado! Usa los botones para ajustar');
            
            setTimeout(() => this.hideInfo(), 3000);
            
          } catch (error) {
            console.error('Error creating anchor:', error);
          }
        }
      }
    }
  }

  resetPlacement() {
    if (this.artworkMesh) {
      this.artworkMesh.visible = false;
    }
    
    if (this.artworkAnchor) {
      this.artworkAnchor.delete();
      this.artworkAnchor = null;
    }
    
    this.isPlaced = false;
    this.reticle.visible = true;
    
    this.showInfo('Toca una pared para colocar el cuadro');
  }

  capture() {
    if (!this.renderer) return;
    
    try {
      const dataURL = this.renderer.domElement.toDataURL('image/png');
      
      const link = document.createElement('a');
      link.download = 'artwork-ar-webxr.png';
      link.href = dataURL;
      link.click();
    } catch (error) {
      console.error('Capture error:', error);
    }
  }

  onXRSessionEnd() {
    this.xrSession = null;
    this.hitTestSource = null;
    this.hitTestSourceRequested = false;
    
    if (this.artworkAnchor) {
      this.artworkAnchor.delete();
      this.artworkAnchor = null;
    }
    
    this.isPlaced = false;
    this.hasEverPlaced = false;
    
    if (this.artworkMesh) {
      this.artworkMesh.visible = false;
    }
    
    if (this.reticle) {
      this.reticle.visible = false;
    }
    
    this.renderer.setAnimationLoop(null);
  }

  async close() {
    this.isActive = false;
    
    if (this.xrSession) {
      await this.xrSession.end();
    }
    
    this.modal.classList.remove('active');
    document.body.style.overflow = '';
    
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  showLoading(message = 'Cargando...') {
    const loading = document.querySelector('[data-webxr-loading]');
    const loadingText = document.querySelector('[data-webxr-loading-text]');
    
    if (loading) loading.style.display = 'block';
    if (loadingText) loadingText.textContent = message;
  }

  hideLoading() {
    const loading = document.querySelector('[data-webxr-loading]');
    if (loading) loading.style.display = 'none';
  }

  showControls() {
    const controls = document.querySelector('[data-webxr-controls]');
    if (controls) controls.style.display = 'flex';
  }

  hideControls() {
    const controls = document.querySelector('[data-webxr-controls]');
    if (controls) controls.style.display = 'none';
  }

  showInfo(message) {
    const info = document.querySelector('[data-webxr-info]');
    const infoText = info?.querySelector('span');
    
    if (info) info.style.display = 'block';
    if (infoText) infoText.textContent = message;
  }

  hideInfo() {
    const info = document.querySelector('[data-webxr-info]');
    if (info) info.style.display = 'none';
  }

  showError(message) {
    const error = document.querySelector('[data-webxr-error]');
    const errorText = document.querySelector('[data-webxr-error-text]');
    
    if (error) error.style.display = 'block';
    if (errorText) errorText.textContent = message;
    
    this.hideLoading();
    this.hideControls();
  }

  hideError() {
    const error = document.querySelector('[data-webxr-error]');
    if (error) error.style.display = 'none';
  }

  getErrorMessage(error) {
    const errorCode = error.message;
    
    const messages = {
      'XR_SESSION_FAILED': 'No se pudo iniciar la sesión AR. Asegúrate de estar usando Chrome o Safari en un dispositivo compatible.',
      'default': 'Ocurrió un error. Por favor, intenta de nuevo.'
    };
    
    return messages[errorCode] || messages['default'];
  }
}

// Initialize when Three.js is loaded
if (typeof THREE !== 'undefined') {
  new WebXRWallPreview();
} else {
  console.warn('Three.js not loaded, WebXR preview will not be available');
}

