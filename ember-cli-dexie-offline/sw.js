!function(){"use strict";self.CACHE_BUSTER="1599817937157|0.49553838609821743",self.addEventListener("install",(function(e){return self.skipWaiting()})),self.addEventListener("activate",(function(e){return self.clients.claim()}));var e=function(e,t){return caches.keys().then((function(n){n.forEach((function(n){0===n.indexOf(e)&&n!==t&&caches.delete(n)}))}))},t="".concat("esw-asset-cache","-").concat("1"),n=["assets/dummy-8b41508331a17a39af9791f0d6d2e499.css","assets/dummy-2048d28cd043b6cdad000aac6aa6be77.js","assets/vendor-a87e0d8165cba65724c04d0f43cf51a0.css","assets/vendor-9b55be2dc11f4d3349a0f75c3201668a.js"].map((function(e){return new URL(e,self.location).toString()}));self.addEventListener("install",(function(e){e.waitUntil(caches.open(t).then((function(e){return Promise.all(n.map((function(t){var n=new Request(t,{mode:"cors"});return fetch(n).then((function(n){if(n.status>=400)throw new Error("Request for ".concat(t," failed with status ").concat(n.statusText));return e.put(t,n)})).catch((function(e){console.error("Not caching ".concat(t," due to ").concat(e))}))})))})))})),self.addEventListener("activate",(function(c){c.waitUntil(Promise.all([e("esw-asset-cache",t),void caches.open(t).then((function(e){return e.keys().then((function(t){t.forEach((function(t){-1===n.indexOf(t.url)&&e.delete(t)}))}))}))]))})),self.addEventListener("fetch",(function(e){var c="GET"===e.request.method,r=-1!==n.indexOf(e.request.url);c&&r&&e.respondWith(caches.match(e.request,{cacheName:t}).then((function(t){return t||fetch(e.request.url,{mode:"cors"})})))}));function c(e,t){return!!t.find((function(t){return t.test(decodeURI(e))}))}var r="".concat("esw-cache-fallback","-").concat("1"),s=["https://emberjs.com/images/brand/ember_Ember-Light.png","https://love2dev.com/img/basic-service-worker-caching-980x552.jpg"].map((function(e){var t=function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:self.location;return decodeURI(new URL(encodeURI(e),t).toString())}(e);return new RegExp("^".concat(t,"$"))}));self.addEventListener("fetch",(function(e){var t=e.request;"GET"===t.method&&/^https?/.test(t.url)&&c(t.url,s)&&e.respondWith(caches.open(r).then((function(n){return fetch(t).then((function(e){return n.put(t,e.clone()),e})).catch((function(){return caches.match(e.request)}))})))})),self.addEventListener("activate",(function(t){t.waitUntil(e("esw-cache-fallback",r))}));var a=[],i=[];self.INDEX_FILE_HASH="e6c5ef053eb8dcabeb63f8ed7cf445f5";var o="".concat("esw-index","-").concat("1"),u=new URL("index.html",self.location).toString();self.addEventListener("install",(function(e){e.waitUntil(fetch(u,{credentials:"include"}).then((function(e){return caches.open(o).then((function(t){return t.put(u,e)}))})))})),self.addEventListener("activate",(function(t){t.waitUntil(e("esw-index",o))})),self.addEventListener("fetch",(function(e){var t=e.request,n=new URL(t.url),r="GET"===t.method,s=-1!==t.headers.get("accept").indexOf("text/html"),f=n.origin===location.origin,l=c(t.url,a),h=!i.length||c(t.url,i);!("/tests"===n.pathname&&!1)&&r&&s&&f&&h&&!l&&e.respondWith(caches.match(u,{cacheName:o}).then((function(e){return e||fetch(u,{credentials:"include"}).then((function(e){return caches.open(o).then((function(t){return t.put(u,e)})),e.clone()}))})))}))}();
//# sourceMappingURL=sw-d5d550e610e7ac0da31c49835341c1d4.map