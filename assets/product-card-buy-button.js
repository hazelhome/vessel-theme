// JavaScript para integrar el botón de compra con el sistema de quick add existente
class ProductCardBuyButton {
  constructor() {
    this.init();
  }

  init() {
    // Buscar todos los botones de quick add en la parte inferior
    const quickAddButtons = document.querySelectorAll('[data-quick-add-trigger]');
    
    quickAddButtons.forEach(button => {
      button.addEventListener('click', (e) => this.handleQuickAddClick(e));
    });
  }

  handleQuickAddClick(event) {
    event.preventDefault();
    
    const button = event.currentTarget;
    const productId = button.getAttribute('data-product-id');
    const productCard = button.closest('product-card');
    
    if (!productCard) {
      console.error('No se encontró la tarjeta de producto');
      return;
    }

    // Buscar el botón de quick add original en la tarjeta
    const originalQuickAddButton = productCard.querySelector('.quick-add button, [data-quick-add]');
    
    if (originalQuickAddButton) {
      // Simular click en el botón de quick add original
      console.log('Activando quick add original...');
      originalQuickAddButton.click();
    } else {
      // Fallback: buscar otros posibles selectores de quick add
      this.tryAlternativeQuickAdd(productCard, productId);
    }
  }

  tryAlternativeQuickAdd(productCard, productId) {
    // Intentar con diferentes selectores que podrían ser el quick add
    const alternativeSelectors = [
      '[data-product-id="' + productId + '"] .quick-add__button',
      '.quick-add__button--add',
      '.quick-add__button--choose',
      'add-to-cart-component button',
      '.product-form button[type="submit"]'
    ];

    let quickAddFound = false;

    for (const selector of alternativeSelectors) {
      const quickAddElement = productCard.querySelector(selector);
      if (quickAddElement) {
        console.log('Encontrado quick add alternativo:', selector);
        quickAddElement.click();
        quickAddFound = true;
        break;
      }
    }

    if (!quickAddFound) {
      console.log('No se encontró quick add, usando fallback...');
      this.fallbackToProductPage(productCard);
    }
  }

  fallbackToProductPage(productCard) {
    // Como último recurso, redirigir a la página del producto
    const productLink = productCard.querySelector('.product-card__link, a[href*="/products/"]');
    
    if (productLink && productLink.href) {
      window.location.href = productLink.href;
    } else {
      console.error('No se pudo encontrar enlace al producto');
    }
  }

  // Método para mostrar estados de carga si es necesario
  setLoadingState(button, isLoading) {
    const buttonText = button.querySelector('.button__text');
    const spinner = button.querySelector('.loading__spinner');
    
    if (isLoading) {
      button.disabled = true;
      if (buttonText) buttonText.textContent = 'Agregando...';
      if (spinner) spinner.classList.remove('hidden');
    } else {
      button.disabled = false;
      if (buttonText) buttonText.textContent = 'Agregar al carrito';
      if (spinner) spinner.classList.add('hidden');
    }
  }

  // Escuchar eventos del sistema de quick add para sincronizar estados
  listenToQuickAddEvents() {
    // Escuchar cuando se abre el modal de quick add
    document.addEventListener('quick-add:opened', (event) => {
      console.log('Modal de agregar al carrito abierto');
    });

    // Escuchar cuando se agrega un producto al carrito
    document.addEventListener('cart:item-added', (event) => {
      console.log('Producto agregado al carrito:', event.detail);
    });
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  const buyButton = new ProductCardBuyButton();
  buyButton.listenToQuickAddEvents();
});

// Reinicializar cuando se carguen nuevas secciones (para colecciones con paginación)
document.addEventListener('shopify:section:load', () => {
  const buyButton = new ProductCardBuyButton();
  buyButton.listenToQuickAddEvents();
});
