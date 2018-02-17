/**
 * This class represents a google library service singleton.
 * It loads the google maps library by appending a <script> tag to the document body
 * and awaits the load event of said script tag.
 * If the google maps library is already embedded in the document the global window.google
 * object is returned.
 * @class GoogleLibraryService
 */
let GoogleLibraryServiceInstance = null;
export default class GoogleLibraryService {
  constructor(props) {
    // Make sure we only every use one instance (singleton)
    if (!GoogleLibraryServiceInstance) {
      GoogleLibraryServiceInstance = this;
    }

    this.options = props || {};

    // Validate gmaps license
    if (!this.options.apiKey && !this.options.client) {
      throw new Error('You must provide an API Key OR ClientID!');
    }
    if (this.options.apiKey && this.options.client) {
      throw new Error('API Key AND ClientID given, please use only one of the two!');
    }

    return GoogleLibraryServiceInstance.init();
  }

  /**
   * Create a google maps api url.
   * @returns {string} Google maps api url.
   */
  createGoogleMapsApiUrl = () => {
    const url = 'https://maps.googleapis.com/maps/api/js';
    const params = {
      key: this.options.apiKey,
      client: this.options.client || null,
      callback: this.options.cb || null,
      libraries: (this.options.libraries && this.options.libraries.join(',')) || ['places'],
      v: this.options.version || '3',
      channel: this.options.channel || null,
      language: this.options.language || null,
      region: this.options.region || null
    };
    const paramStr = Object.keys(params)
      .filter(key => !!params[key])
      .map(key => `${key}=${params[key]}`)
      .join('&');

    return `${url}?${paramStr}`;
  };

  /**
   * Start the script loading.
   * If the window.google object is already ready to be used, return it.
   * Else inject the <script> tag and await the load callback.
   * @returns {Object} - The window.google object.
   */
  init = () => {
    if (window.google) {
      return window.google;
    }
    return this.loadScript();
  };

  /**
   * Create a script tag and append load and error event listeners.
   * If the script tag is already created, only listen for the load and error events.
   * @return {promise} - Returns a promise of the load events.
   */
  loadScript = () => {
    // create google maps api url
    const src = this.createGoogleMapsApiUrl();
    if (!this.script) {
      return new Promise((resolve, reject) => {
        this.script = document.createElement('script');
        this.script.src = src;
        this.script.addEventListener('error', reject, { once: true });
        this.script.addEventListener('load', () => resolve(window.google), { once: true });
        document.body.appendChild(this.script);
      });
    }
    return new Promise((resolve, reject) => {
      this.script.addEventListener('error', reject, { once: true });
      this.script.addEventListener('load', () => resolve(window.google), { once: true });
    });
  };
}
