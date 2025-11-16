class WallPreview {
  constructor() {
    this.modal = null;
    this.previewContainer = null;
    this.artwork = null;
    this.wallUpload = null;
    this.sizeSlider = null;
    this.closeButtons = null;
    this.currentWallURL = null;
    this.originalAspectRatio = 1;
    
    this.isDragging = false;
    this.currentX = 0;
    this.currentY = 0;
    this.initialX = 0;
    this.initialY = 0;
    this.xOffset = 0;
    this.yOffset = 0;

    this.init();
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      this.modal = document.querySelector('[data-wall-preview-modal]');
      this.previewContainer = document.querySelector('[data-preview-container]');
      this.wallUpload = document.querySelector('[data-wall-upload]');
      this.sizeSlider = document.querySelector('[data-size-slider]');
      this.closeButtons = document.querySelectorAll('[data-wall-preview-close]');

      if (!this.modal) return;

      this.setupTriggers();
      this.setupUpload();
      this.setupCloseButtons();
    });
  }

  setupTriggers() {
    const triggers = document.querySelectorAll('[data-wall-preview-trigger]');
    
    triggers.forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const productImage = trigger.dataset.productImage;
        const productTitle = trigger.dataset.productTitle;
        
        if (productImage) {
          this.openModal(productImage, productTitle);
        }
      });
    });
  }

  setupUpload() {
    if (!this.wallUpload) return;

    this.wallUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (this.currentWallURL) {
        URL.revokeObjectURL(this.currentWallURL);
      }

      this.currentWallURL = URL.createObjectURL(file);
      this.previewContainer.style.backgroundImage = `url(${this.currentWallURL})`;
      this.previewContainer.classList.add('has-wall');
    });
  }

  setupCloseButtons() {
    if (!this.closeButtons) return;

    this.closeButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.closeModal();
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal && this.modal.classList.contains('active')) {
        this.closeModal();
      }
    });
  }

  openModal(productImage, productTitle) {
    if (!this.modal || !productImage) return;

    this.modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    this.createArtwork(productImage);
  }

  closeModal() {
    if (!this.modal) return;

    this.modal.classList.remove('active');
    document.body.style.overflow = '';

    if (this.artwork && this.artwork.parentNode) {
      this.artwork.parentNode.removeChild(this.artwork);
      this.artwork = null;
    }

    if (this.currentWallURL) {
      URL.revokeObjectURL(this.currentWallURL);
      this.currentWallURL = null;
    }

    this.previewContainer.style.backgroundImage = '';
    this.previewContainer.classList.remove('has-wall');
    
    if (this.wallUpload) {
      this.wallUpload.value = '';
    }
    
    if (this.sizeSlider) {
      this.sizeSlider.value = 25;
    }

    this.xOffset = 0;
    this.yOffset = 0;
  }

  createArtwork(imageURL) {
    if (this.artwork && this.artwork.parentNode) {
      this.artwork.parentNode.removeChild(this.artwork);
    }

    this.artwork = document.createElement('img');
    this.artwork.id = 'artwork';
    this.artwork.src = imageURL;
    this.artwork.style.position = 'absolute';
    this.artwork.style.width = '25%';
    this.artwork.style.left = '37.5%';
    this.artwork.style.top = '30%';

    this.artwork.onload = () => {
      this.originalAspectRatio = this.artwork.naturalHeight / this.artwork.naturalWidth;
      this.updateArtworkHeight();
    };

    this.previewContainer.appendChild(this.artwork);

    this.setupDragAndDrop();
    this.setupSlider();
  }

  setupDragAndDrop() {
    if (!this.artwork) return;

    this.artwork.addEventListener('mousedown', this.dragStart.bind(this));
    document.addEventListener('mousemove', this.drag.bind(this));
    document.addEventListener('mouseup', this.dragEnd.bind(this));

    this.artwork.addEventListener('touchstart', this.dragStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.drag.bind(this), { passive: false });
    document.addEventListener('touchend', this.dragEnd.bind(this));
  }

  setupSlider() {
    if (!this.sizeSlider || !this.artwork) return;

    this.sizeSlider.addEventListener('input', (e) => {
      const newWidth = e.target.value;
      this.artwork.style.width = newWidth + '%';
      this.updateArtworkHeight();
    });
  }

  updateArtworkHeight() {
    if (!this.artwork) return;
    
    const currentWidth = parseFloat(this.artwork.style.width);
    const containerWidth = this.previewContainer.offsetWidth;
    const artworkWidthPx = (currentWidth / 100) * containerWidth;
    const artworkHeightPx = artworkWidthPx * this.originalAspectRatio;
    const containerHeight = this.previewContainer.offsetHeight;
    const heightPercentage = (artworkHeightPx / containerHeight) * 100;
    
    this.artwork.style.height = 'auto';
  }

  dragStart(e) {
    if (!this.artwork) return;

    if (e.type === 'touchstart') {
      this.initialX = e.touches[0].clientX - this.xOffset;
      this.initialY = e.touches[0].clientY - this.yOffset;
    } else {
      this.initialX = e.clientX - this.xOffset;
      this.initialY = e.clientY - this.yOffset;
    }

    if (e.target === this.artwork) {
      this.isDragging = true;
      this.artwork.classList.add('dragging');
    }
  }

  drag(e) {
    if (!this.isDragging || !this.artwork) return;

    e.preventDefault();

    if (e.type === 'touchmove') {
      this.currentX = e.touches[0].clientX - this.initialX;
      this.currentY = e.touches[0].clientY - this.initialY;
    } else {
      this.currentX = e.clientX - this.initialX;
      this.currentY = e.clientY - this.initialY;
    }

    this.xOffset = this.currentX;
    this.yOffset = this.currentY;

    const containerRect = this.previewContainer.getBoundingClientRect();
    const artworkRect = this.artwork.getBoundingClientRect();

    let newLeft = this.currentX;
    let newTop = this.currentY;

    const maxLeft = containerRect.width - artworkRect.width;
    const maxTop = containerRect.height - artworkRect.height;

    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    newTop = Math.max(0, Math.min(newTop, maxTop));

    this.artwork.style.left = newLeft + 'px';
    this.artwork.style.top = newTop + 'px';
  }

  dragEnd() {
    if (!this.artwork) return;

    this.isDragging = false;
    this.artwork.classList.remove('dragging');
  }
}

new WallPreview();

