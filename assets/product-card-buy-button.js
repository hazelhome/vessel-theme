// JavaScript para integrar el botón de compra con el sistema de quick add existente
class ProductCardBuyButton {
  constructor() {
    this.init();
  }

  init() {
    console.log('🚀 Inicializando ProductCardBuyButton...');
    
    // Buscar todos los botones de compra en la parte inferior
    const buyButtons = document.querySelectorAll('.product-card__buy-button.quick-add__button');
    console.log(`📍 Encontrados ${buyButtons.length} botones de compra`);
    
    buyButtons.forEach((button, index) => {
      console.log(`🔘 Configurando botón ${index + 1}:`, button);
      button.addEventListener('click', (e) => this.handleQuickAddClick(e));
    });

    // También buscar botones sin la clase quick-add__button por si acaso
    const allBuyButtons = document.querySelectorAll('.product-card__buy-button');
    console.log(`📍 Total de botones encontrados: ${allBuyButtons.length}`);
    
    allBuyButtons.forEach((button, index) => {
      if (!button.classList.contains('quick-add__button')) {
        console.log(`🔘 Configurando botón adicional ${index + 1}:`, button);
        button.addEventListener('click', (e) => this.handleQuickAddClick(e));
      }
    });
  }

  handleQuickAddClick(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const button = event.currentTarget;
    const productId = button.getAttribute('data-product-id');
    const productUrl = button.getAttribute('data-product-url');
    const productCard = button.closest('product-card');
    
    if (!productCard) {
      console.error('No se encontró la tarjeta de producto');
      return;
    }

    console.log('🛒 Intentando abrir quick add para producto:', productId);

    // Buscar el botón de quick add original en diferentes ubicaciones
    const quickAddSelectors = [
      '.quick-add button',
      '.quick-add__button',
      '[data-quick-add]',
      'quick-add button',
      '.card-gallery .quick-add button'
    ];

    let quickAddButton = null;
    
    for (const selector of quickAddSelectors) {
      quickAddButton = productCard.querySelector(selector);
      if (quickAddButton) {
        console.log('✅ Encontrado quick add con selector:', selector);
        break;
      }
    }
    
    if (quickAddButton && !quickAddButton.disabled) {
      // Simular click en el botón de quick add original
      console.log('🎯 Activando quick add original...');
      quickAddButton.click();
    } else {
      console.log('⚠️ No se encontró quick add, usando fallback...');
      // Fallback: redirigir a la página del producto
      if (productUrl) {
        window.location.href = productUrl;
      } else {
        this.tryAlternativeQuickAdd(productCard, productId);
      }
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
