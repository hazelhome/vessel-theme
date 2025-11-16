// @ts-nocheck
class ARWallPreview {
  constructor() {
    this.modal = null;
    this.video = null;
    this.canvas = null;
    this.ctx = null;
    this.artworkImage = null;
    this.artworkAspectRatio = 1;
    this.isActive = false;
    this.stream = null;
    this.artworkScale = 0.3;
    
    // Position tracking
    this.artworkX = null;
    this.artworkY = null;
    this.targetX = null;
    this.targetY = null;
    this.velocity = { x: 0, y: 0 };
    
    // Touch controls
    this.isDragging = false;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.lastTouchX = 0;
    this.lastTouchY = 0;
    this.hasEverDragged = false;
    
    // Wall detection
    this.detectionInterval = null;
    this.suggestedPositions = [];
    
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
        this.artworkScale = Math.max(this.artworkScale - 0.05, 0.15);
      });
    }
    
    if (captureBtn) {
      captureBtn.addEventListener('click', () => this.capture());
    }
    
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.retry());
    }
    
    // Touch controls para mover el cuadro
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    
    // Mouse controls para desktop
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isActive) {
        this.close();
      }
    });
  }

  handleTouchStart(e) {
    if (!this.artworkX) return;
    
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = (touch.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (touch.clientY - rect.top) * (this.canvas.height / rect.height);
    
    const size = this.canvas.width * this.artworkScale;
    const halfWidth = size / 2;
    const halfHeight = (size * this.artworkAspectRatio) / 2;
    
    if (x >= this.artworkX - halfWidth && x <= this.artworkX + halfWidth &&
        y >= this.artworkY - halfHeight && y <= this.artworkY + halfHeight) {
      this.isDragging = true;
      this.touchStartX = x;
      this.touchStartY = y;
      this.lastTouchX = x;
      this.lastTouchY = y;
      
      if (!this.hasEverDragged) {
        this.hasEverDragged = true;
        this.hideInfo();
      }
      
      e.preventDefault();
    }
  }

  handleTouchMove(e) {
    if (!this.isDragging) return;
    
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = (touch.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (touch.clientY - rect.top) * (this.canvas.height / rect.height);
    
    const deltaX = x - this.lastTouchX;
    const deltaY = y - this.lastTouchY;
    
    this.artworkX += deltaX;
    this.artworkY += deltaY;
    this.targetX = this.artworkX;
    this.targetY = this.artworkY;
    
    this.lastTouchX = x;
    this.lastTouchY = y;
    
    e.preventDefault();
  }

  handleTouchEnd(e) {
    this.isDragging = false;
  }

  handleMouseDown(e) {
    if (!this.artworkX) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    
    const size = this.canvas.width * this.artworkScale;
    const halfWidth = size / 2;
    const halfHeight = (size * this.artworkAspectRatio) / 2;
    
    if (x >= this.artworkX - halfWidth && x <= this.artworkX + halfWidth &&
        y >= this.artworkY - halfHeight && y <= this.artworkY + halfHeight) {
      this.isDragging = true;
      this.lastTouchX = x;
      this.lastTouchY = y;
      
      if (!this.hasEverDragged) {
        this.hasEverDragged = true;
        this.hideInfo();
      }
    }
  }

  handleMouseMove(e) {
    if (!this.isDragging) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    
    const deltaX = x - this.lastTouchX;
    const deltaY = y - this.lastTouchY;
    
    this.artworkX += deltaX;
    this.artworkY += deltaY;
    this.targetX = this.artworkX;
    this.targetY = this.artworkY;
    
    this.lastTouchX = x;
    this.lastTouchY = y;
  }

  handleMouseUp(e) {
    this.isDragging = false;
  }

  async open(productImageURL, productTitle) {
    try {
      this.modal.classList.add('active');
      this.isActive = true;
      document.body.style.overflow = 'hidden';
      
      this.showLoading();
      
      await this.loadArtwork(productImageURL);
      await this.setupCamera();
      
      // Inicializar posición central
      this.artworkX = this.canvas.width / 2;
      this.artworkY = this.canvas.height / 2;
      this.targetX = this.artworkX;
      this.targetY = this.artworkY;
      
      this.hideLoading();
      this.showControls();
      this.showInfo();
      
      this.startRendering();
      this.startWallDetection();
      
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

  startRendering() {
    const render = () => {
      if (!this.isActive) return;
      
      // Auto-snap to best wall position if not dragging and hasn't dragged yet
      if (!this.isDragging && !this.hasEverDragged && this.suggestedPositions.length > 0) {
        const best = this.suggestedPositions[0];
        this.targetX = best.x;
        this.targetY = best.y;
      }
      
      // Smooth interpolation
      if (this.targetX !== null) {
        const smoothing = this.isDragging ? 1 : 0.15;
        this.artworkX += (this.targetX - this.artworkX) * smoothing;
        this.artworkY += (this.targetY - this.artworkY) * smoothing;
      }
      
      // Clear and draw video
      this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
      
      // Draw artwork with effects
      if (this.artworkX !== null) {
        this.drawArtworkWithEffects();
      }
      
      requestAnimationFrame(render);
    };
    
    render();
  }
  
  startWallDetection() {
    this.detectionInterval = setInterval(() => {
      if (!this.isActive || this.hasEverDragged) return;
      this.detectWallAreas();
    }, 1000);
  }
  
  detectWallAreas() {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    const sampleWidth = 160;
    const sampleHeight = 120;
    tempCanvas.width = sampleWidth;
    tempCanvas.height = sampleHeight;
    
    tempCtx.drawImage(this.video, 0, 0, sampleWidth, sampleHeight);
    
    const imageData = tempCtx.getImageData(0, 0, sampleWidth, sampleHeight);
    const data = imageData.data;
    
    const gridSize = 8;
    const cellWidth = Math.floor(sampleWidth / gridSize);
    const cellHeight = Math.floor(sampleHeight / gridSize);
    
    const regions = [];
    
    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        const cellX = gx * cellWidth;
        const cellY = gy * cellHeight;
        
        let totalR = 0, totalG = 0, totalB = 0;
        let variance = 0;
        let pixelCount = 0;
        
        for (let y = cellY; y < cellY + cellHeight; y++) {
          for (let x = cellX; x < cellX + cellWidth; x++) {
            const idx = (y * sampleWidth + x) * 4;
            totalR += data[idx];
            totalG += data[idx + 1];
            totalB += data[idx + 2];
            pixelCount++;
          }
        }
        
        const avgR = totalR / pixelCount;
        const avgG = totalG / pixelCount;
        const avgB = totalB / pixelCount;
        
        for (let y = cellY; y < cellY + cellHeight; y++) {
          for (let x = cellX; x < cellX + cellWidth; x++) {
            const idx = (y * sampleWidth + x) * 4;
            const diffR = data[idx] - avgR;
            const diffG = data[idx + 1] - avgG;
            const diffB = data[idx + 2] - avgB;
            variance += (diffR * diffR + diffG * diffG + diffB * diffB);
          }
        }
        
        variance = variance / pixelCount;
        
        const uniformity = 1 / (1 + variance / 1000);
        
        const centerX = (cellX + cellWidth / 2) / sampleWidth;
        const centerY = (cellY + cellHeight / 2) / sampleHeight;
        
        const distanceFromCenter = Math.sqrt(
          Math.pow(centerX - 0.5, 2) + Math.pow(centerY - 0.5, 2)
        );
        const centerScore = 1 - distanceFromCenter;
        
        const brightness = (avgR + avgG + avgB) / 3;
        const brightnessScore = brightness > 80 && brightness < 220 ? 1 : 0.5;
        
        const score = uniformity * 0.6 + centerScore * 0.3 + brightnessScore * 0.1;
        
        regions.push({
          x: (cellX + cellWidth / 2) * (this.canvas.width / sampleWidth),
          y: (cellY + cellHeight / 2) * (this.canvas.height / sampleHeight),
          score: score,
          variance: variance
        });
      }
    }
    
    regions.sort((a, b) => b.score - a.score);
    this.suggestedPositions = regions.slice(0, 3);
  }

  drawArtworkWithEffects() {
    const size = this.canvas.width * this.artworkScale;
    const width = size;
    const height = size * this.artworkAspectRatio;
    
    this.ctx.save();
    
    // Shadow layers para profundidad
    this.drawMultiLayerShadow(this.artworkX, this.artworkY, width, height);
    
    // Border/frame efecto
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    this.ctx.shadowBlur = 20;
    this.ctx.shadowOffsetX = 5;
    this.ctx.shadowOffsetY = 5;
    
    // Artwork
    this.ctx.drawImage(
      this.artworkImage,
      this.artworkX - width / 2,
      this.artworkY - height / 2,
      width,
      height
    );
    
    // Frame effect
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(
      this.artworkX - width / 2,
      this.artworkY - height / 2,
      width,
      height
    );
    
    // Inner shadow para profundidad
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(
      this.artworkX - width / 2 + 3,
      this.artworkY - height / 2 + 3,
      width - 6,
      height - 6
    );
    
    this.ctx.restore();
    
    // Indicador visual cuando se arrastra
    if (this.isDragging) {
      this.drawDragIndicator();
    }
  }

  drawMultiLayerShadow(x, y, width, height) {
    // Capa 1: Sombra difusa lejana
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    this.ctx.fillRect(
      x - width / 2 + 15,
      y - height / 2 + 15,
      width,
      height
    );
    
    // Capa 2: Sombra media
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    this.ctx.fillRect(
      x - width / 2 + 10,
      y - height / 2 + 10,
      width,
      height
    );
    
    // Capa 3: Sombra cercana
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.fillRect(
      x - width / 2 + 5,
      y - height / 2 + 5,
      width,
      height
    );
  }

  drawDragIndicator() {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([10, 5]);
    
    const size = this.canvas.width * this.artworkScale;
    const width = size;
    const height = size * this.artworkAspectRatio;
    
    this.ctx.strokeRect(
      this.artworkX - width / 2 - 5,
      this.artworkY - height / 2 - 5,
      width + 10,
      height + 10
    );
    
    this.ctx.restore();
  }

  capture() {
    const dataURL = this.canvas.toDataURL('image/png');
    
    const link = document.createElement('a');
    link.download = 'artwork-ar-preview.png';
    link.href = dataURL;
    link.click();
  }

  async retry() {
    this.hideError();
    await this.open(this.artworkImage.src, '');
  }

  close() {
    this.isActive = false;
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
    
    this.modal.classList.remove('active');
    document.body.style.overflow = '';
    
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    this.artworkX = null;
    this.artworkY = null;
    this.targetX = null;
    this.targetY = null;
    this.hasEverDragged = false;
    this.suggestedPositions = [];
  }

  showLoading() {
    const loading = document.querySelector('[data-ar-loading]');
    if (loading) loading.style.display = 'block';
  }

  hideLoading() {
    const loading = document.querySelector('[data-ar-loading]');
    if (loading) loading.style.display = 'none';
  }

  showControls() {
    const controls = document.querySelector('[data-ar-controls]');
    if (controls) controls.style.display = 'flex';
  }

  hideControls() {
    const controls = document.querySelector('[data-ar-controls]');
    if (controls) controls.style.display = 'none';
  }

  showInfo() {
    const info = document.querySelector('[data-ar-info]');
    if (info) {
      info.style.display = 'block';
      const helpText = info.querySelector('.ar-modal__info-item span');
      if (helpText) helpText.textContent = 'Arrastra el cuadro';
    }
  }
  
  hideInfo() {
    const info = document.querySelector('[data-ar-info]');
    if (info) {
      info.style.display = 'none';
    }
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
      'default': 'Ocurrió un error. Por favor, intenta de nuevo.'
    };
    
    return messages[errorCode] || messages['default'];
  }
}

new ARWallPreview();
