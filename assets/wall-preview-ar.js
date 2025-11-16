class ARWallPreview {
  constructor() {
    this.modal = null;
    this.video = null;
    this.canvas = null;
    this.ctx = null;
    this.segmentationModel = null;
    this.artworkImage = null;
    this.artworkAspectRatio = 1;
    this.isActive = false;
    this.isProcessing = false;
    this.processingInterval = null;
    this.stream = null;
    this.artworkScale = 0.25;
    
    this.init();
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      this.modal = document.querySelector('[data-ar-modal]');
      this.video = document.querySelector('[data-ar-video]');
      this.canvas = document.querySelector('[data-ar-canvas]');
      
      if (!this.modal || !this.video || !this.canvas) return;
      
      this.ctx = this.canvas.getContext('2d');
      
      this.setupTriggers();
      this.setupControls();
    });
  }

  setupTriggers() {
    const triggers = document.querySelectorAll('[data-ar-preview-trigger]');
    
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
    const closeBtn = document.querySelector('[data-ar-close]');
    const sizeUpBtn = document.querySelector('[data-ar-size-up]');
    const sizeDownBtn = document.querySelector('[data-ar-size-down]');
    const captureBtn = document.querySelector('[data-ar-capture]');
    const retryBtn = document.querySelector('[data-ar-retry]');
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }
    
    if (sizeUpBtn) {
      sizeUpBtn.addEventListener('click', () => {
        this.artworkScale = Math.min(this.artworkScale + 0.05, 0.8);
      });
    }
    
    if (sizeDownBtn) {
      sizeDownBtn.addEventListener('click', () => {
        this.artworkScale = Math.max(this.artworkScale - 0.05, 0.1);
      });
    }
    
    if (captureBtn) {
      captureBtn.addEventListener('click', () => this.capture());
    }
    
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.retry());
    }
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isActive) {
        this.close();
      }
    });
  }

  async open(productImageURL, productTitle) {
    try {
      this.modal.classList.add('active');
      this.isActive = true;
      document.body.style.overflow = 'hidden';
      
      this.showLoading();
      
      await this.loadArtwork(productImageURL);
      
      await this.setupCamera();
      
      await this.loadModels();
      
      this.hideLoading();
      this.showHelp();
      this.showControls();
      
      this.startProcessing();
      
    } catch (error) {
      console.error('Error opening AR:', error);
      this.showError(this.getErrorMessage(error));
    }
  }

  async loadArtwork(imageURL) {
    return new Promise((resolve, reject) => {
      this.artworkImage = new Image();
      this.artworkImage.crossOrigin = 'anonymous';
      
      this.artworkImage.onload = () => {
        this.artworkAspectRatio = this.artworkImage.height / this.artworkImage.width;
        resolve();
      };
      
      this.artworkImage.onerror = () => {
        reject(new Error('Failed to load artwork image'));
      };
      
      this.artworkImage.src = imageURL;
    });
  }

  async setupCamera() {
    try {
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      
      return new Promise((resolve) => {
        this.video.onloadedmetadata = () => {
          this.video.play();
          
          this.canvas.width = this.video.videoWidth;
          this.canvas.height = this.video.videoHeight;
          
          resolve();
        };
      });
    } catch (error) {
      console.error('Camera error:', error);
      throw new Error('CAMERA_DENIED');
    }
  }

  async loadModels() {
    try {
      this.updateProgress('Cargando modelo de IA...', 0);
      
      if (!window.bodyPix) {
        throw new Error('BodyPix library not loaded');
      }
      
      this.segmentationModel = await bodyPix.load({
        architecture: 'MobileNetV1',
        outputStride: 16,
        multiplier: 0.75,
        quantBytes: 2
      });
      
      this.updateProgress('Modelo cargado', 100);
      
    } catch (error) {
      console.error('Model loading error:', error);
      throw new Error('MODEL_LOAD_FAILED');
    }
  }

  async detectFreeSpace() {
    if (!this.segmentationModel || !this.video.readyState === 4) {
      return null;
    }
    
    try {
      const segmentation = await this.segmentationModel.segmentPerson(this.video, {
        flipHorizontal: false,
        internalResolution: 'medium',
        segmentationThreshold: 0.7
      });
      
      const regions = this.createGrid(10, 10);
      
      const bestRegion = this.findBestRegion(regions, segmentation);
      
      return bestRegion;
      
    } catch (error) {
      console.error('Segmentation error:', error);
      return null;
    }
  }

  createGrid(rows, cols) {
    const regions = [];
    const regionWidth = this.canvas.width / cols;
    const regionHeight = this.canvas.height / rows;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        regions.push({
          x: col * regionWidth,
          y: row * regionHeight,
          width: regionWidth,
          height: regionHeight,
          row,
          col
        });
      }
    }
    
    return regions;
  }

  findBestRegion(regions, segmentation) {
    const pixels = segmentation.data;
    const width = segmentation.width;
    const height = segmentation.height;
    
    let bestRegion = null;
    let bestScore = 0;
    
    regions.forEach(region => {
      const scaleX = width / this.canvas.width;
      const scaleY = height / this.canvas.height;
      
      const startX = Math.floor(region.x * scaleX);
      const startY = Math.floor(region.y * scaleY);
      const endX = Math.floor((region.x + region.width) * scaleX);
      const endY = Math.floor((region.y + region.height) * scaleY);
      
      let backgroundPixels = 0;
      let totalPixels = 0;
      
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const index = y * width + x;
          if (pixels[index] === 0) {
            backgroundPixels++;
          }
          totalPixels++;
        }
      }
      
      const backgroundPercent = backgroundPixels / totalPixels;
      
      const centerBonus = this.calculateCenterBonus(region);
      
      const minSize = region.width > this.canvas.width * 0.15 && 
                     region.height > this.canvas.height * 0.15 ? 1 : 0.5;
      
      const score = backgroundPercent * 0.7 + centerBonus * 0.2 + minSize * 0.1;
      
      if (score > bestScore) {
        bestScore = score;
        bestRegion = region;
      }
    });
    
    return bestRegion;
  }

  calculateCenterBonus(region) {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    const regionCenterX = region.x + region.width / 2;
    const regionCenterY = region.y + region.height / 2;
    
    const distanceX = Math.abs(regionCenterX - centerX) / (this.canvas.width / 2);
    const distanceY = Math.abs(regionCenterY - centerY) / (this.canvas.height / 2);
    
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
    
    return 1 - Math.min(distance, 1);
  }

  async renderFrame() {
    if (!this.isActive || this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
      
      const region = await this.detectFreeSpace();
      
      if (region) {
        this.hideHelp();
        
        const centerX = region.x + region.width / 2;
        const centerY = region.y + region.height / 2;
        
        const size = Math.min(region.width, region.height) * this.artworkScale * 2;
        
        this.drawShadow(centerX, centerY, size);
        
        this.ctx.drawImage(
          this.artworkImage,
          centerX - size / 2,
          centerY - size / 2,
          size,
          size * this.artworkAspectRatio
        );
        
      } else {
        this.showHelp();
      }
      
    } catch (error) {
      console.error('Render error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  drawShadow(centerX, centerY, size) {
    this.ctx.save();
    
    const shadowBlur = 15;
    const shadowOffsetX = 5;
    const shadowOffsetY = 5;
    
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    this.ctx.shadowBlur = shadowBlur;
    this.ctx.shadowOffsetX = shadowOffsetX;
    this.ctx.shadowOffsetY = shadowOffsetY;
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    this.ctx.fillRect(
      centerX - size / 2,
      centerY - size / 2,
      size,
      size * this.artworkAspectRatio
    );
    
    this.ctx.restore();
  }

  startProcessing() {
    this.processingInterval = setInterval(() => {
      this.renderFrame();
    }, 100);
  }

  stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  capture() {
    const dataURL = this.canvas.toDataURL('image/png');
    
    const link = document.createElement('a');
    link.download = 'artwork-preview.png';
    link.href = dataURL;
    link.click();
  }

  async retry() {
    this.hideError();
    await this.open(this.artworkImage.src, '');
  }

  close() {
    this.isActive = false;
    this.stopProcessing();
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.modal.classList.remove('active');
    document.body.style.overflow = '';
    
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  showLoading() {
    const loading = document.querySelector('[data-ar-loading]');
    if (loading) loading.style.display = 'block';
  }

  hideLoading() {
    const loading = document.querySelector('[data-ar-loading]');
    if (loading) loading.style.display = 'none';
  }

  updateProgress(text, percent) {
    const loadingText = document.querySelector('.ar-modal__loading-text');
    const progress = document.querySelector('[data-ar-progress]');
    
    if (loadingText) loadingText.textContent = text;
    if (progress) progress.textContent = `${Math.round(percent)}%`;
  }

  showHelp() {
    const help = document.querySelector('[data-ar-help]');
    if (help) help.style.display = 'block';
  }

  hideHelp() {
    const help = document.querySelector('[data-ar-help]');
    if (help) help.style.display = 'none';
  }

  showControls() {
    const controls = document.querySelector('[data-ar-controls]');
    if (controls) controls.style.display = 'flex';
  }

  hideControls() {
    const controls = document.querySelector('[data-ar-controls]');
    if (controls) controls.style.display = 'none';
  }

  showError(message) {
    const error = document.querySelector('[data-ar-error]');
    const errorText = document.querySelector('[data-ar-error-text]');
    
    if (error) error.style.display = 'block';
    if (errorText) errorText.textContent = message;
    
    this.hideLoading();
    this.hideControls();
  }

  hideError() {
    const error = document.querySelector('[data-ar-error]');
    if (error) error.style.display = 'none';
  }

  getErrorMessage(error) {
    const errorCode = error.message;
    
    const messages = {
      'CAMERA_DENIED': 'No se pudo acceder a la cámara. Por favor, permite el acceso en la configuración de tu navegador.',
      'MODEL_LOAD_FAILED': 'Error al cargar el modelo de IA. Verifica tu conexión a internet.',
      'default': 'Ocurrió un error. Por favor, intenta de nuevo.'
    };
    
    return messages[errorCode] || messages['default'];
  }
}

new ARWallPreview();

