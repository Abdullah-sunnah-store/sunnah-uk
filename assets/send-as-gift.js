/**
 * Send as Gift
 * - Opens modal, collects gift details, adds item to cart with line item properties
 * - Sets cart attribute gift_order=true for order management
 */

(function () {
  'use strict';

  // Prevent double-init if script loads more than once
  if (window.__sendAsGiftReady) return;
  window.__sendAsGiftReady = true;

  // ── Modal helpers ──────────────────────────────────────────────────────────

  function getModal() {
    return document.getElementById('send-as-gift-modal');
  }

  function openModal(variantId, quantity) {
    const modal = getModal();
    if (!modal) {
      console.error('[Send as Gift] Modal element not found in DOM.');
      return;
    }

    // Store values on the modal itself (avoids hidden field issues)
    modal.dataset.variantId = variantId;
    modal.dataset.quantity = quantity || 1;

    // Reset form
    const form = modal.querySelector('#send-as-gift-form');
    form.reset();
    modal.querySelectorAll('.gift-modal__error').forEach((el) => el.classList.add('hidden'));
    modal.querySelectorAll('.gift-modal__input').forEach((el) => el.classList.remove('gift-modal__input--error'));

    const generalError = modal.querySelector('#gift-general-error');
    generalError.classList.add('hidden');
    generalError.textContent = '';

    modal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      const first = modal.querySelector('input:not([type="hidden"])');
      if (first) first.focus();
    }, 60);
  }

  function closeModal() {
    const modal = getModal();
    if (!modal) return;
    modal.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  // ── Form validation ────────────────────────────────────────────────────────

  function validateForm(form) {
    let valid = true;
    const fields = ['recipient_name', 'recipient_contact'];

    fields.forEach((name) => {
      const input = form.querySelector(`[name="${name}"]`);
      const errorEl = form.querySelector(`[data-error="${name}"]`);
      if (!input || !input.value.trim()) {
        input && input.classList.add('gift-modal__input--error');
        errorEl && errorEl.classList.remove('hidden');
        valid = false;
      } else {
        input.classList.remove('gift-modal__input--error');
        errorEl && errorEl.classList.add('hidden');
      }
    });

    return valid;
  }

  // ── Cart operations ────────────────────────────────────────────────────────

  async function addGiftItemToCart(variantId, quantity, recipientName, recipientContact, senderName, giftMessage, hideAmount) {
    const properties = {
      '_Gift Order': 'Yes',
      'Recipient Name': recipientName,
      'Recipient Contact': recipientContact,
    };
    if (senderName) properties['From'] = senderName;
    if (giftMessage) properties['Gift Message'] = giftMessage;
    if (hideAmount) properties['Hide Amount'] = 'Yes';

    // Collect section IDs from all cart-items-components so Shopify returns
    // their rendered HTML in the response — same approach as the product form.
    const sectionIds = [...document.querySelectorAll('cart-items-component[data-section-id]')]
      .map((el) => el.dataset.sectionId)
      .filter(Boolean);

    const body = JSON.stringify({
      id: parseInt(variantId, 10),
      quantity: parseInt(quantity, 10) || 1,
      properties,
      sections: sectionIds,
    });

    const res = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body,
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || data.description || 'Could not add item to cart.');
    }

    return data;
  }

  async function updateCartForGiftOrder() {
    await fetch('/cart/update.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ attributes: { gift_order: 'true' } }),
    });
  }

  // ── Form submit handler ────────────────────────────────────────────────────

  async function handleGiftFormSubmit(event) {
    event.preventDefault();
    event.stopPropagation();

    const form = event.currentTarget;
    if (!validateForm(form)) return;

    const modal = getModal();
    const variantId = modal.dataset.variantId;
    const quantity = modal.dataset.quantity || 1;

    if (!variantId || variantId === '0' || variantId === 'undefined') {
      showGeneralError(form, 'Product variant not found. Please refresh the page and try again.');
      return;
    }

    const submitBtn = form.querySelector('#gift-modal-submit-btn');
    const recipientName = form.querySelector('[name="recipient_name"]').value.trim();
    const recipientContact = form.querySelector('[name="recipient_contact"]').value.trim();
    const senderName = form.querySelector('[name="sender_name"]').value.trim();
    const giftMessage = form.querySelector('[name="gift_message"]').value.trim();
    const hideAmount = form.querySelector('[name="hide_amount"]').checked;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding to cart…';

    try {
      const cartData = await addGiftItemToCart(variantId, quantity, recipientName, recipientContact, senderName, giftMessage, hideAmount);
      await updateCartForGiftOrder();

      // Fetch updated cart for the item_count used by the cart icon badge
      const cart = await fetch('/cart.js', { headers: { 'Accept': 'application/json' } }).then((r) => r.json()).catch(() => null);

      closeModal();

      // Pass sections from the /cart/add.js response so cart-items-component
      // uses morphSection (synchronous DOM update) instead of an extra network fetch.
      document.dispatchEvent(new CustomEvent('cart:update', {
        bubbles: true,
        detail: {
          resource: cart,
          sourceId: 'send-as-gift',
          data: {
            source: 'send-as-gift',
            sections: cartData.sections || {},
          },
        },
      }));

      // Open the cart drawer (safety net when auto-open is not set on the element)
      const cartDrawer = document.querySelector('cart-drawer-component');
      if (cartDrawer) cartDrawer.showDialog?.();

    } catch (err) {
      console.error('[Send as Gift] Cart add error:', err);
      showGeneralError(form, err.message || 'Something went wrong. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add Gift to Cart';
    }
  }

  function showGeneralError(form, message) {
    const el = form.querySelector('#gift-general-error');
    if (el) {
      el.textContent = message;
      el.classList.remove('hidden');
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  function init() {
    const modal = getModal();
    if (!modal) {
      console.error('[Send as Gift] Cannot find #send-as-gift-modal — script may have loaded before DOM.');
      return;
    }

    // Prevent double-binding on the modal itself
    if (modal.dataset.bound === 'true') return;
    modal.dataset.bound = 'true';

    // Close triggers
    modal.querySelectorAll('[data-gift-modal-close]').forEach((el) => {
      el.addEventListener('click', closeModal);
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hasAttribute('hidden')) closeModal();
    });

    // Form submit
    const form = modal.querySelector('#send-as-gift-form');
    if (form) form.addEventListener('submit', handleGiftFormSubmit);

    // "Send as Gift" button — delegated click on document
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-send-as-gift]');
      if (!btn) return;

      // Get variant ID: try hidden input first, then button's own data attribute
      let variantId = btn.dataset.variantId;

      // Also try to get the live selected variant from the product form
      const productFormComponent = btn.closest('product-form-component');
      if (productFormComponent) {
        const variantInput = productFormComponent.querySelector('input[name="id"]');
        if (variantInput && variantInput.value) {
          variantId = variantInput.value;
        }
      }

      // Fallback: read from URL query param
      if (!variantId) {
        const urlVariant = new URLSearchParams(window.location.search).get('variant');
        if (urlVariant) variantId = urlVariant;
      }

      // Get quantity
      let quantity = 1;
      const qtyInput = document.querySelector(
        'quantity-selector-component input[type="number"], input[name="quantity"]'
      );
      if (qtyInput && qtyInput.value) quantity = qtyInput.value;

      openModal(variantId, quantity);
    });

  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
