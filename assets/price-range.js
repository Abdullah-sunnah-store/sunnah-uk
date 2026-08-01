/**
 * Price Range Slider implementation for faceted filtering
 * 
 * Uses noUiSlider library for range slider functionality.
 * This script loads the noUiSlider library dynamically if not already present.
 */

class PriceRange extends HTMLElement {
  constructor() {
    super();
    this.initNoUiSlider();
  }

  /**
   * Load noUiSlider library dynamically if not already loaded
   */
  async initNoUiSlider() {
    if (window.noUiSlider) {
      this.setupSliders();
    } else {
      // Load noUiSlider CSS
      const noUiSliderStyles = document.createElement('link');
      noUiSliderStyles.rel = 'stylesheet';
      noUiSliderStyles.href = 'https://cdnjs.cloudflare.com/ajax/libs/noUiSlider/15.7.1/nouislider.min.css';
      document.head.appendChild(noUiSliderStyles);

      // Load noUiSlider JS
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/noUiSlider/15.7.1/nouislider.min.js';
      script.onload = () => this.setupSliders();
      
      document.head.appendChild(script);
    }
  }

  /**
   * Initialize all price range sliders on the page
   */
  setupSliders() {
    document.querySelectorAll('.price-range__slider').forEach(slider => {
      this.initSlider(slider);
    });
  }

  /**
   * Initialize a single slider instance
   * @param {HTMLElement} sliderElement - The slider container element
   */
  initSlider(sliderElement) {
    // Get parent form to access input elements
    const form = sliderElement.closest('form');
    if (!form) return;
    
    // Get input elements associated with this slider
    const inputMin = form.querySelector(`#${sliderElement.id.replace('-slider', '')}-min_price`);
    const inputMax = form.querySelector(`#${sliderElement.id.replace('-slider', '')}-max_price`);
    
    if (!inputMin || !inputMax) return;
    
    // Get min and max values
    const minValue = parseInt(inputMin.value || inputMin.getAttribute('placeholder') || 0);
    const maxValue = parseInt(inputMax.value || inputMax.getAttribute('placeholder') || inputMax.getAttribute('max'));
    const rangeMax = parseInt(inputMax.getAttribute('max') || maxValue);
    
    // Initialize noUiSlider
    noUiSlider.create(sliderElement, {
      start: [
        inputMin.value ? parseInt(inputMin.value) : 0,
        inputMax.value ? parseInt(inputMax.value) : rangeMax
      ],
      connect: true,
      step: 1,
      range: {
        'min': 0,
        'max': rangeMax
      }
    });
    
    // Update input values when slider changes
    sliderElement.noUiSlider.on('update', (values, handle) => {
      const value = parseInt(values[handle]);
      
      if (handle === 0) {
        inputMin.value = value;
      } else {
        inputMax.value = value;
      }
    });
    
    // Update slider when inputs change
    inputMin.addEventListener('change', () => {
      sliderElement.noUiSlider.set([inputMin.value, null]);
    });
    
    inputMax.addEventListener('change', () => {
      sliderElement.noUiSlider.set([null, inputMax.value]);
    });
    
    // Submit form when slider finishes moving (optional - for instant filtering)
    sliderElement.noUiSlider.on('set', () => {
      // Uncomment to enable auto-submit when price range changes
      // setTimeout(() => form.dispatchEvent(new Event('submit')), 0);
    });
  }
}

// Register the custom element
customElements.define('price-range', PriceRange);