export default class ServiceWorkerManager {
  constructor(filePath, options) {
    this.sw = null;
    this.newSw = null;
    this.filePath = filePath;
    this.options = options;
  }
  init() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(this.filePath, {
        scope: "/",
        ...this.options
      }).then(reg => {
        this.sw = reg;
        reg.addEventListener('updatefound', () => {
          this.newSw = reg.installing;
          this.newSw.addEventListener('statechange', () => {
            console.log(this.newSw.state);
            switch (this.newSw.state) {
              case 'installed':
                if (navigator.serviceWorker.controller) {
                  let updateEvent = new CustomEvent('updatefound', { currentWorker: this.sw, newWorker: this.newSw });
                  this.newSw.postMessage({ action: "skipWaiting" });
                  window.dispatchEvent(updateEvent);
                  console.log('%c[ServiceWorker] %cNew Update Available!', "font-weight:bold;color:purple;", "", "color:blue;font-weight:bold;font-style:italic;");
                }
                break;
            }
          });
        });
        console.log('%c[ServiceWorker] %cregistration successful with scope: %c' + this.sw.scope, "font-weight:bold;color:purple;", "", "color:blue;font-weight:bold;font-style:italic;");
      })
        .catch(function (err) {
          console.log('%c[ServiceWorker] %cregistration failed', "font-weight:bold;color:purple;", "");
          console.error(err);
        });
    }
  }
}