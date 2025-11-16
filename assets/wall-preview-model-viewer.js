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
      
      // Create a simple GLB with a plane
      const glb = this.createSimpleGLB(imageURL, aspectRatio);
      
      // Set the model
      this.modelViewer.src = glb;
      
      // Set poster
      this.modelViewer.poster = imageURL;
      
      this.hideLoading();
      
    } catch (error) {
      console.error('Error generating model:', error);
      this.showError('No se pudo preparar el modelo 3D del cuadro.');
    }
  }

  createSimpleGLB(textureURL, aspectRatio) {
    // For now, we'll use a data URI with a simple plane
    // In production, you'd want to generate a proper GLB server-side
    
    // Simple workaround: Use model-viewer's ability to show images
    // We'll create a minimal GLTF with a textured plane
    
    const width = 1.0;
    const height = width * aspectRatio;
    
    const gltf = {
      asset: {
        version: "2.0",
        generator: "HazelHome AR Generator"
      },
      scene: 0,
      scenes: [{
        nodes: [0]
      }],
      nodes: [{
        mesh: 0,
        scale: [width, height, 1]
      }],
      meshes: [{
        primitives: [{
          attributes: {
            POSITION: 0,
            TEXCOORD_0: 1,
            NORMAL: 2
          },
          indices: 3,
          material: 0
        }]
      }],
      materials: [{
        pbrMetallicRoughness: {
          baseColorTexture: {
            index: 0
          },
          metallicFactor: 0,
          roughnessFactor: 1
        },
        doubleSided: true
      }],
      textures: [{
        source: 0
      }],
      images: [{
        uri: textureURL
      }],
      accessors: [
        {
          bufferView: 0,
          componentType: 5126,
          count: 4,
          type: "VEC3",
          max: [0.5, 0.5, 0],
          min: [-0.5, -0.5, 0]
        },
        {
          bufferView: 1,
          componentType: 5126,
          count: 4,
          type: "VEC2"
        },
        {
          bufferView: 2,
          componentType: 5126,
          count: 4,
          type: "VEC3"
        },
        {
          bufferView: 3,
          componentType: 5123,
          count: 6,
          type: "SCALAR"
        }
      ],
      bufferViews: [
        { buffer: 0, byteOffset: 0, byteLength: 48 },
        { buffer: 0, byteOffset: 48, byteLength: 32 },
        { buffer: 0, byteOffset: 80, byteLength: 48 },
        { buffer: 0, byteOffset: 128, byteLength: 12 }
      ],
      buffers: [{
        byteLength: 140,
        uri: "data:application/octet-stream;base64," + btoa(String.fromCharCode(
          // Positions
          ...new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]).reduce((arr, val) => {
            const buffer = new ArrayBuffer(4);
            new Float32Array(buffer)[0] = val;
            return arr.concat(Array.from(new Uint8Array(buffer)));
          }, []),
          // UVs
          ...new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]).reduce((arr, val) => {
            const buffer = new ArrayBuffer(4);
            new Float32Array(buffer)[0] = val;
            return arr.concat(Array.from(new Uint8Array(buffer)));
          }, []),
          // Normals
          ...new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]).reduce((arr, val) => {
            const buffer = new ArrayBuffer(4);
            new Float32Array(buffer)[0] = val;
            return arr.concat(Array.from(new Uint8Array(buffer)));
          }, []),
          // Indices
          ...new Uint16Array([0, 1, 2, 0, 2, 3]).reduce((arr, val) => {
            const buffer = new ArrayBuffer(2);
            new Uint16Array(buffer)[0] = val;
            return arr.concat(Array.from(new Uint8Array(buffer)));
          }, [])
        ))
      }]
    };
    
    const gltfString = JSON.stringify(gltf);
    const gltfBase64 = btoa(unescape(encodeURIComponent(gltfString)));
    
    return `data:model/gltf+json;base64,${gltfBase64}`;
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

