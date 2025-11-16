// @ts-nocheck
class ModelViewerARPreview {
  constructor() {
    this.modal = null;
    this.modelViewer = null;
    this.isActive = false;
    this.currentProductImage = null;
    
    this.init();
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      this.modal = document.querySelector('[data-model-viewer-modal]');
      this.modelViewer = document.querySelector('[data-model-viewer]');
      
      if (!this.modal || !this.modelViewer) return;
      
      this.setupTriggers();
      this.setupControls();
      this.setupModelViewerEvents();
    });
  }

  setupTriggers() {
    const triggers = document.querySelectorAll('[data-model-viewer-trigger]');
    
    triggers.forEach(trigger => {
      trigger.addEventListener('click', async (e) => {
        e.preventDefault();
        const productImage = trigger.dataset.productImage;
        const productTitle = trigger.dataset.productTitle;
        
        console.log('Model Viewer AR triggered', productImage);
        
        if (productImage) {
          await this.open(productImage, productTitle);
        }
      });
    });
  }

  setupControls() {
    const closeBtn = document.querySelector('[data-model-viewer-close]');
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }
  }

  setupModelViewerEvents() {
    if (!this.modelViewer) return;
    
    // Progress events
    this.modelViewer.addEventListener('progress', (event) => {
      const progressBar = document.querySelector('.model-viewer-ar-modal__progress-bar-fill');
      if (progressBar) {
        const progress = event.detail.totalProgress * 100;
        progressBar.style.width = `${progress}%`;
      }
    });
    
    // Load complete
    this.modelViewer.addEventListener('load', () => {
      console.log('Model loaded successfully');
      this.hideLoading();
    });
    
    // Error handling
    this.modelViewer.addEventListener('error', (event) => {
      console.error('Model Viewer error:', event);
      this.showError('No se pudo cargar el modelo 3D. Por favor, intenta de nuevo.');
    });
  }

  async open(productImageURL, productTitle) {
    try {
      console.log('Opening Model Viewer AR with image:', productImageURL);
      
      this.modal.classList.add('active');
      this.isActive = true;
      document.body.style.overflow = 'hidden';
      
      this.showLoading();
      this.currentProductImage = productImageURL;
      
      // Generate GLB model with the artwork texture
      await this.generateArtworkModel(productImageURL);
      
    } catch (error) {
      console.error('Error opening Model Viewer AR:', error);
      this.showError('Ocurrió un error al cargar la vista AR.');
    }
  }

  async generateArtworkModel(imageURL) {
    try {
      console.log('Generating 3D model for artwork...');
      
      // Load image to get dimensions
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageURL;
      });
      
      const aspectRatio = img.height / img.width;
      
      console.log('Image loaded, aspect ratio:', aspectRatio);
      
      // Wait for Three.js to be available
      if (typeof THREE === 'undefined') {
        console.log('Three.js not loaded, waiting...');
        await new Promise(resolve => {
          const checkThree = setInterval(() => {
            if (typeof THREE !== 'undefined') {
              clearInterval(checkThree);
              resolve();
            }
          }, 100);
        });
      }
      
      // Generate GLB with Three.js
      const glbBlob = await this.createGLBWithThreeJS(imageURL, aspectRatio);
      
      // Create object URL
      const glbURL = URL.createObjectURL(glbBlob);
      
      console.log('GLB created successfully:', glbURL);
      
      // Set the model
      this.modelViewer.src = glbURL;
      
      // Set poster
      this.modelViewer.poster = imageURL;
      
      this.hideLoading();
      
    } catch (error) {
      console.error('Error generating model:', error);
      this.showError('No se pudo preparar el modelo 3D del cuadro.');
    }
  }

  async createGLBWithThreeJS(imageURL, aspectRatio) {
    console.log('Creating GLB with Three.js...');
    
    // Create scene
    const scene = new THREE.Scene();
    
    // Load texture
    const textureLoader = new THREE.TextureLoader();
    const texture = await new Promise((resolve, reject) => {
      textureLoader.load(imageURL, resolve, undefined, reject);
    });
    
    // Create plane geometry with correct aspect ratio
    const width = 1.0;
    const height = width * aspectRatio;
    const geometry = new THREE.PlaneGeometry(width, height);
    
    // Create material with texture
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      side: THREE.DoubleSide,
      metalness: 0,
      roughness: 1
    });
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    
    // Add frame (white border)
    const frameThickness = 0.02;
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.8
    });
    
    // Frame edges
    const frameDepth = 0.01;
    
    // Top frame
    const topFrame = new THREE.BoxGeometry(width + frameThickness * 2, frameThickness, frameDepth);
    const topFrameMesh = new THREE.Mesh(topFrame, frameMaterial);
    topFrameMesh.position.y = height / 2 + frameThickness / 2;
    topFrameMesh.position.z = -frameDepth / 2;
    scene.add(topFrameMesh);
    
    // Bottom frame
    const bottomFrameMesh = new THREE.Mesh(topFrame, frameMaterial);
    bottomFrameMesh.position.y = -height / 2 - frameThickness / 2;
    bottomFrameMesh.position.z = -frameDepth / 2;
    scene.add(bottomFrameMesh);
    
    // Left frame
    const sideFrame = new THREE.BoxGeometry(frameThickness, height, frameDepth);
    const leftFrameMesh = new THREE.Mesh(sideFrame, frameMaterial);
    leftFrameMesh.position.x = -width / 2 - frameThickness / 2;
    leftFrameMesh.position.z = -frameDepth / 2;
    scene.add(leftFrameMesh);
    
    // Right frame
    const rightFrameMesh = new THREE.Mesh(sideFrame, frameMaterial);
    rightFrameMesh.position.x = width / 2 + frameThickness / 2;
    rightFrameMesh.position.z = -frameDepth / 2;
    scene.add(rightFrameMesh);
    
    console.log('Scene created, exporting to GLB...');
    
    // Export to GLB
    const exporter = new THREE.GLTFExporter();
    
    const glb = await new Promise((resolve, reject) => {
      exporter.parse(
        scene,
        (result) => {
          console.log('GLB export successful');
          resolve(new Blob([result], { type: 'model/gltf-binary' }));
        },
        (error) => {
          console.error('GLB export error:', error);
          reject(error);
        },
        { binary: true }
      );
    });
    
    return glb;
  }

  close() {
    this.isActive = false;
    this.modal.classList.remove('active');
    document.body.style.overflow = '';
    
    if (this.modelViewer) {
      this.modelViewer.src = '';
    }
  }

  showLoading() {
    const loading = document.querySelector('[data-model-viewer-loading]');
    if (loading) loading.style.display = 'block';
  }

  hideLoading() {
    const loading = document.querySelector('[data-model-viewer-loading]');
    if (loading) loading.style.display = 'none';
  }

  showError(message) {
    const error = document.querySelector('[data-model-viewer-error]');
    const errorText = document.querySelector('[data-model-viewer-error-text]');
    
    if (error) error.style.display = 'block';
    if (errorText) errorText.textContent = message;
    
    this.hideLoading();
  }

  hideError() {
    const error = document.querySelector('[data-model-viewer-error]');
    if (error) error.style.display = 'none';
  }
}

// Initialize when model-viewer is loaded
if (customElements.get('model-viewer')) {
  new ModelViewerARPreview();
} else {
  window.addEventListener('load', () => {
    setTimeout(() => {
      if (customElements.get('model-viewer')) {
        new ModelViewerARPreview();
      }
    }, 1000);
  });
}

