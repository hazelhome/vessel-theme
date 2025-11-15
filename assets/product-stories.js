class ProductStories {
  constructor(container) {
    this.container = container;
    this.modal = container.querySelector('[data-stories-modal]');
    this.stories = Array.from(container.querySelectorAll('.product-stories__story'));
    this.progressBars = Array.from(container.querySelectorAll('.product-stories__progress-bar'));
    this.circleTriggers = Array.from(container.querySelectorAll('[data-story-trigger]'));
    this.closeTriggers = Array.from(container.querySelectorAll('[data-close-modal]'));
    this.currentIndex = 0;
    this.isPlaying = false;
    this.duration = 5000; // 5 seconds per story
    this.progressInterval = null;
    this.currentVideo = null;
    
    this.init();
  }

  init() {
    this.setupCircles();
    this.setupModal();
    this.setupNavigation();
    this.setupToggle();
    this.setupVideoEvents();
  }

  setupCircles() {
    this.circleTriggers.forEach((trigger, index) => {
      trigger.addEventListener('click', () => {
        this.openModal(index);
      });
    });
  }

  setupModal() {
    this.closeTriggers.forEach(trigger => {
      trigger.addEventListener('click', () => {
        this.closeModal();
      });
    });

    // Cerrar con tecla Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('active')) {
        this.closeModal();
      }
    });
  }

  openModal(index = 0) {
    this.modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Bajar z-index de TODOS los headers y elementos sticky
    const elementsToLower = document.querySelectorAll('#header-group, #header-component, header, .header, [class*="header"]');
    this.originalZIndexes = [];
    
    elementsToLower.forEach((element, idx) => {
      this.originalZIndexes[idx] = {
        element: element,
        zIndex: element.style.zIndex
      };
      element.style.setProperty('z-index', '1', 'important');
    });
    
    // Forzar z-index del modal
    this.modal.style.setProperty('z-index', '999999', 'important');
    
    this.showStory(index);
  }

  closeModal() {
    this.pause();
    this.modal.classList.remove('active');
    document.body.style.overflow = '';
    
    // Restaurar z-index de todos los elementos
    if (this.originalZIndexes) {
      this.originalZIndexes.forEach(item => {
        if (item.element) {
          item.element.style.zIndex = item.zIndex;
        }
      });
    }
  }

  setupNavigation() {
    const prevBtn = this.container.querySelector('[data-story-nav="prev"]');
    const nextBtn = this.container.querySelector('[data-story-nav="next"]');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.prevStory());
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.nextStory());
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      // Solo funcionar si el modal está abierto
      if (!this.modal || !this.modal.classList.contains('active')) return;
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.prevStory();
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.nextStory();
      }
      if (e.key === ' ') {
        e.preventDefault();
        this.togglePlay();
      }
    });

    // Touch/click areas for navigation - SOLO PAUSA/PLAY, NO NAVEGAR
    const viewer = this.container.querySelector('.product-stories__viewer');
    if (viewer) {
      viewer.addEventListener('click', (e) => {
        // Ignorar clicks en botones (flechas y play/pause)
        if (e.target.closest('button')) return;
        
        // Solo pausar/reproducir, no navegar
        this.togglePlay();
      });
    }
  }

  setupToggle() {
    const toggleBtn = this.container.querySelector('[data-story-toggle]');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.togglePlay());
    }
  }

  setupVideoEvents() {
    this.stories.forEach((story, index) => {
      const deferredMedia = story.querySelector('deferred-media');
      if (deferredMedia) {
        // Auto-load first video
        if (index === 0) {
          this.loadDeferredMedia(deferredMedia);
        }

        const video = this.getVideoElement(story);
        if (video) {
          video.addEventListener('ended', () => {
            if (index === this.currentIndex) {
              this.nextStory();
            }
          });

          video.addEventListener('loadedmetadata', () => {
            if (index === this.currentIndex && video.duration) {
              this.duration = video.duration * 1000;
              this.updateProgressDuration();
            }
          });
        }
      }
    });
  }

  showStory(index) {
    if (index < 0 || index >= this.stories.length) return;

    // Stop current video
    this.pause();

    // Update current index
    this.currentIndex = index;

    // Hide all stories
    this.stories.forEach(story => {
      story.classList.remove('active');
    });

    // Show current story
    this.stories[index].classList.add('active');

    // Update progress bars
    this.updateProgressBars();

    // Load video
    const story = this.stories[index];
    const deferredMedia = story.querySelector('deferred-media');
    
    if (deferredMedia) {
      this.loadDeferredMedia(deferredMedia);
      
      // Bandera para evitar múltiples reproducciones
      if (this.loadingVideo) return;
      this.loadingVideo = true;
      
      // Esperar a que el video se cargue y reproducir UNA SOLA VEZ
      setTimeout(() => {
        const video = this.getVideoElement(story);
        if (video && video.readyState >= 2) {
          // Video ya está listo, reproducir desde el inicio
          this.loadingVideo = false;
          this.play(true);
        } else if (video) {
          // Esperar a que se cargue
          video.addEventListener('loadeddata', () => {
            this.loadingVideo = false;
            if (this.modal && this.modal.classList.contains('active') && !this.isPlaying) {
              this.play(true);
            }
          }, { once: true });
        } else {
          this.loadingVideo = false;
        }
      }, 200);
    }
  }

  loadDeferredMedia(deferredMedia) {
    // Usar el método nativo de deferred-media de Shopify
    const button = deferredMedia.querySelector('.deferred-media__poster-button');
    if (button && !deferredMedia.classList.contains('loaded')) {
      button.click();
    }
  }

  getVideoElement(story) {
    return story.querySelector('video');
  }

  play(restart = false) {
    // Prevenir múltiples llamadas simultáneas
    if (this.isPlaying && !restart) return;
    if (this.playingPromise) return; // Ya hay una reproducción en curso
    
    const video = this.getVideoElement(this.stories[this.currentIndex]);
    
    if (video) {
      // Solo reiniciar si se solicita explícitamente
      if (restart) {
        video.pause();
        video.currentTime = 0;
        video.muted = true; // Mutear para permitir autoplay solo al inicio
      }
      
      video.setAttribute('playsinline', '');
      
      this.playingPromise = video.play();
      
      if (this.playingPromise !== undefined) {
        this.playingPromise
          .then(() => {
            this.isPlaying = true;
            this.updatePlayButton();
            this.startProgress();
            this.playingPromise = null;
            
            // Después de empezar, intentar desmutear (solo si es restart)
            if (restart) {
              setTimeout(() => {
                video.muted = false;
              }, 100);
            }
          })
          .catch(error => {
            console.log('Autoplay prevented:', error);
            this.isPlaying = false;
            this.updatePlayButton();
            this.playingPromise = null;
          });
      }
    } else {
      // If no video, just start progress
      this.isPlaying = true;
      this.updatePlayButton();
      this.startProgress();
    }
  }

  pause() {
    const story = this.stories[this.currentIndex];
    if (!story) return;
    
    const video = this.getVideoElement(story);
    
    if (video) {
      video.pause();
    }
    
    this.isPlaying = false;
    this.stopProgress();
    this.updatePlayButton();
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      // Cuando se reanuda, NO reiniciar desde el principio
      this.play(false);
    }
  }

  startProgress() {
    this.stopProgress();
    
    const progressBar = this.progressBars[this.currentIndex];
    const progressFill = progressBar.querySelector('.product-stories__progress-fill');
    
    progressBar.classList.add('active');
    
    // Set CSS variable for animation duration
    this.container.style.setProperty('--story-duration', `${this.duration}ms`);
    
    // Auto advance after duration
    this.progressInterval = setTimeout(() => {
      this.nextStory();
    }, this.duration);
  }

  stopProgress() {
    if (this.progressInterval) {
      clearTimeout(this.progressInterval);
      this.progressInterval = null;
    }
    
    this.progressBars.forEach(bar => {
      bar.classList.remove('active');
    });
  }

  updateProgressBars() {
    this.progressBars.forEach((bar, index) => {
      bar.classList.remove('active', 'completed');
      const fill = bar.querySelector('.product-stories__progress-fill');
      fill.style.width = '0%';
      
      if (index < this.currentIndex) {
        bar.classList.add('completed');
      }
    });
  }

  updateProgressDuration() {
    this.container.style.setProperty('--story-duration', `${this.duration}ms`);
  }

  updatePlayButton() {
    const toggleBtn = this.container.querySelector('[data-story-toggle]');
    if (toggleBtn) {
      toggleBtn.classList.remove('playing', 'paused');
      toggleBtn.classList.add(this.isPlaying ? 'playing' : 'paused');
    }
  }

  nextStory() {
    if (this.currentIndex < this.stories.length - 1) {
      this.showStory(this.currentIndex + 1);
    } else {
      // Loop back to start
      this.showStory(0);
    }
  }

  prevStory() {
    if (this.currentIndex > 0) {
      this.showStory(this.currentIndex - 1);
    } else {
      // Go to last story
      this.showStory(this.stories.length - 1);
    }
  }

  isVisible() {
    const rect = this.container.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }

  destroy() {
    this.pause();
    this.stopProgress();
  }
}

// Initialize all product stories on page
document.addEventListener('DOMContentLoaded', () => {
  const containers = document.querySelectorAll('[data-product-stories]');
  const instances = [];
  
  containers.forEach(container => {
    instances.push(new ProductStories(container));
  });

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    instances.forEach(instance => instance.destroy());
  });
});

