import { DialogComponent } from '@theme/dialog';

const STORAGE_KEY = 'hasSubscribedToNewsletter';
const COOKIE_NAME = 'hasSubscribedToNewsletter';
const COOKIE_DURATION_DAYS = 365;

const DISMISSED_STORAGE_KEY = 'hasDismissedPopup';
const DISMISSED_COOKIE_NAME = 'hasDismissedPopup';
const DISMISSED_DURATION_DAYS = 7;

/**
 * Set a cookie
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {number} days - Number of days until expiration
 */
function setCookie(name, value, days) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
}

/**
 * Get a cookie value
 * @param {string} name - Cookie name
 * @returns {string|null} Cookie value or null if not found
 */
function getCookie(name) {
  const nameEQ = `${name}=`;
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    const cookie = ca[i];
    if (!cookie) continue;
    let c = cookie;
    while (c.charAt(0) === ' ') {
      c = c.substring(1, c.length);
    }
    if (c.indexOf(nameEQ) === 0) {
      const value = c.substring(nameEQ.length, c.length);
      return value;
    }
  }
  return null;
}

/**
 * Set subscription status in both localStorage and cookie (permanent)
 */
function setSubscriptionStatus() {
  localStorage.setItem(STORAGE_KEY, 'true');
  setCookie(COOKIE_NAME, 'true', COOKIE_DURATION_DAYS);
}

/**
 * Set dismissed status in both localStorage and cookie (7 days)
 */
function setDismissedStatus() {
  localStorage.setItem(DISMISSED_STORAGE_KEY, 'true');
  setCookie(DISMISSED_COOKIE_NAME, 'true', DISMISSED_DURATION_DAYS);
}

/**
 * Get subscription status from localStorage or cookie
 * @returns {boolean} True if user has subscribed
 */
function getSubscriptionStatus() {
  const localStorageValue = localStorage.getItem(STORAGE_KEY);
  if (localStorageValue === 'true') {
    return true;
  }

  const cookieValue = getCookie(COOKIE_NAME);
  if (cookieValue === 'true') {
    localStorage.setItem(STORAGE_KEY, 'true');
    return true;
  }

  return false;
}

/**
 * Check if popup was dismissed (within 7 days)
 * @returns {boolean} True if user dismissed the popup recently
 */
function isPopupDismissed() {
  const localStorageValue = localStorage.getItem(DISMISSED_STORAGE_KEY);
  if (localStorageValue === 'true') {
    const cookieValue = getCookie(DISMISSED_COOKIE_NAME);
    if (cookieValue === 'true') {
      return true;
    } else {
      localStorage.removeItem(DISMISSED_STORAGE_KEY);
      return false;
    }
  }

  const cookieValue = getCookie(DISMISSED_COOKIE_NAME);
  if (cookieValue === 'true') {
    localStorage.setItem(DISMISSED_STORAGE_KEY, 'true');
    return true;
  }

  return false;
}

/**
 * Check if form submission was successful via URL parameters
 * @returns {boolean} True if success parameters are detected
 */
function checkUrlForSuccess() {
  const urlParams = new URLSearchParams(window.location.search);
  const hasCustomerPosted = urlParams.has('customer_posted');
  const hasFormType = urlParams.has('form_type');
  const contactPosted = urlParams.get('contact_posted') === 'true';
  return hasCustomerPosted || hasFormType || contactPosted;
}

/**
 * Subscription Popup Component
 * Manages the subscription popup modal with dual persistence
 */
class SubscriptionPopup extends DialogComponent {
  constructor() {
    super();
    this.handleClose = this.handleClose.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();

    const formSuccessAttr = this.dataset.formSuccess === 'true';
    const urlSuccess = checkUrlForSuccess();
    const formSuccess = formSuccessAttr || urlSuccess;
    const discountUrl = this.dataset.discountUrl;
    
    if (formSuccess) {
      setSubscriptionStatus();
      localStorage.removeItem(DISMISSED_STORAGE_KEY);
      if (window.location.search) {
        const url = new URL(window.location.href);
        url.search = '';
        window.history.replaceState({}, '', url);
      }
      if (discountUrl) {
        setTimeout(() => {
          window.location.href = discountUrl;
        }, 2000);
      }
      return;
    }

    const form = this.querySelector('#SubscriptionPopupForm');
    if (form instanceof HTMLFormElement) {
      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton instanceof HTMLButtonElement && submitButton.textContent) {
        form.dataset.originalButtonText = submitButton.textContent.trim();
      }
      form.addEventListener('submit', this.handleFormSubmit.bind(this));
    }

    const tryShowDialog = () => {
      if (!this.refs?.dialog) {
        setTimeout(tryShowDialog, 100);
        return;
      }

      const subscriptionStatus = getSubscriptionStatus();
      const dismissedStatus = isPopupDismissed();
      
      if (!subscriptionStatus && !dismissedStatus) {
        const delayMs = this.dataset.popupDelay ? parseInt(this.dataset.popupDelay, 10) : 1000;
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (this.refs?.dialog) {
              this.showDialog();
            }
          }, delayMs);
        });
      }
    };

    requestAnimationFrame(() => {
      tryShowDialog();
    });

    this.addEventListener('dialog:close', this.handleClose);
  }

  /**
   * Handle form submission via AJAX to avoid redirect
   * @param {SubmitEvent} event - The submit event
   */
  async handleFormSubmit(event) {
    event.preventDefault();
    event.stopPropagation();

    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    const submitButton = form.querySelector('button[type="submit"]');
    const emailInput = form.querySelector('#SubscriptionPopupEmail');
    
    if (!(submitButton instanceof HTMLButtonElement) || !(emailInput instanceof HTMLInputElement)) return;

    const email = emailInput.value.trim();
    if (!email) return;

    const originalText = form.dataset.originalButtonText || submitButton.textContent || '';
    submitButton.disabled = true;
    submitButton.textContent = 'Enviando...';

    const errorMessage = form.querySelector('#SubscriptionPopup-error');
    if (errorMessage) {
      errorMessage.remove();
    }

    try {
      const formData = new FormData(form);
      
      const response = await fetch('/contact', {
        method: 'POST',
        body: formData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const responseForm = doc.querySelector('#SubscriptionPopupForm');
      const hasErrors = responseForm?.querySelector('.subscription-popup__message--error');
      const hasSuccess = responseForm?.querySelector('.subscription-popup__message--success') || 
                        html.includes('customer_posted') || 
                        response.ok;

      if (hasSuccess && !hasErrors) {
        setSubscriptionStatus();
        localStorage.removeItem(DISMISSED_STORAGE_KEY);
        
        this.showSuccessMessage(form);
        
        const discountUrl = this.dataset.discountUrl;
        if (discountUrl) {
          setTimeout(() => {
            window.location.href = discountUrl;
          }, 2000);
        } else {
          setTimeout(() => {
            if (this.refs?.dialog) {
              this.closeDialog();
            }
          }, 3000);
        }
      } else {
        const errorMsg = hasErrors && hasErrors.textContent ? hasErrors.textContent.trim() : 'Error al procesar la suscripción';
        this.showErrorMessage(form, errorMsg);
        submitButton.disabled = false;
        submitButton.textContent = form.dataset.originalButtonText || originalText;
      }
    } catch (error) {
      this.showErrorMessage(form, 'Error al procesar la suscripción. Por favor, inténtalo de nuevo.');
      submitButton.disabled = false;
      submitButton.textContent = form.dataset.originalButtonText || originalText;
    }
  }

  /**
   * Show success message after form submission
   * @param {HTMLFormElement} form - The form element
   */
  showSuccessMessage(form) {
    const formInputs = form.querySelector('.subscription-popup__form-inputs');
    const existingMessages = form.querySelectorAll('.subscription-popup__message');
    existingMessages.forEach((msg) => msg.remove());

    const discountCode = this.dataset.discountCode || '';
    const successText = this.dataset.successMessage || '¡Gracias por suscribirte!';

    const successDiv = document.createElement('div');
    successDiv.className = 'subscription-popup__message subscription-popup__message--success';
    successDiv.setAttribute('tabindex', '-1');
    
    successDiv.innerHTML = `
      <span class="svg-wrapper icon-success">
        <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
        </svg>
      </span>
      <div class="subscription-popup__success-content">
        <p class="subscription-popup__message-text">${successText}</p>
        ${discountCode ? `
          <div class="subscription-popup__discount-code-wrapper">
            <p class="subscription-popup__discount-label">Tu código de descuento:</p>
            <copy-to-clipboard-component class="subscription-popup__discount-code" text-to-copy="${discountCode}">
              <span class="subscription-popup__discount-code-text">${discountCode}</span>
              <button type="button" class="subscription-popup__copy-button" aria-label="Copiar código de descuento">
                Copiar
              </button>
            </copy-to-clipboard-component>
          </div>
        ` : ''}
      </div>
    `;

    formInputs?.parentNode?.insertBefore(successDiv, formInputs);
    if (formInputs instanceof HTMLElement) {
      formInputs.style.setProperty('display', 'none');
    }
    
    successDiv.focus();
  }

  /**
   * Show error message after form submission failure
   * @param {HTMLFormElement} form - The form element
   * @param {string} message - The error message to display
   */
  showErrorMessage(form, message) {
    const formInputs = form.querySelector('.subscription-popup__form-inputs');
    const existingMessages = form.querySelectorAll('.subscription-popup__message');
    existingMessages.forEach((msg) => msg.remove());

    const errorDiv = document.createElement('div');
    errorDiv.id = 'SubscriptionPopup-error';
    errorDiv.className = 'subscription-popup__message subscription-popup__message--error';
    errorDiv.setAttribute('tabindex', '-1');
    errorDiv.innerHTML = `
      <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true" class="icon-error">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
      </svg>
      ${message}
    `;

    formInputs?.parentNode?.insertBefore(errorDiv, formInputs);
    errorDiv.focus();
  }


  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('dialog:close', this.handleClose);
  }

  handleClose() {
    setDismissedStatus();
  }
}

if (!customElements.get('subscription-popup')) {
  customElements.define('subscription-popup', SubscriptionPopup);
}
