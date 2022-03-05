/**
 * Template Used: https://gist.github.com/arnav-kr/0ad065605d2fe20967a6da383aef8b72
 */

// TODO: Update the cacheName Everytime you want to update your cache
const cacheName = "v1.0.0";
const cacheKeepList = [cacheName] // Add Other names of cache that you don't want to delete


// TODO: Add the default response URL
// When the User is offline and the requested resource is not in the cache then this response will be returned. This needs to be in the cache
defaultResponseURL = "/offline.html";


// TODO: Add your resource's URLs that you want to precache
const preCacheURLs = [
  defaultResponseURL,
  // "./",
  "./favicon.png",
  "./favicon.svg"
];


// Service Worker "install" event listener
self.addEventListener("install", (event) => {
  event.waitUntil(
    // Put the preCache resources in cache on install
    caches.open(cacheName).then((cache) => {
      return cache.addAll(preCacheURLs);
    })
  );
});


// Service Worker "activate" event listener
self.addEventListener("activate", (event) => {
  event.waitUntil(
    // Iterate over the Keys of Cache
    caches.keys().then((keyList) => {
      // Remove the Cache if the name is is not in the cacheKeepList
      return Promise.all(keyList.map((key) => {
        if (cacheKeepList.indexOf(key) === -1) {
          return caches.delete(key);
        }
      }));
    })
  );
});


// Service Worker "fetch" event listener
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' &&
    url.pathname === '/import') {
    event.respondWith((async () => {
      const formData = await event.request.formData();
      const files = formData.get('files') || [];
      if (files.length > 0) {
        const file = files[0];
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        return new Response(reader.result, {
          headers: {
            'Content-Type': file.type,
            'Content-Disposition': `attachment; filename="${file.name}"`
          }
        });
      }
      return Response.redirect(responseUrl, 303);
    })());
  }
  else {
    event.respondWith(
      caches.match(event.request).then((resp) => {
        return resp || fetch(event.request).then((response) => {
          let responseClone = response.clone();
          caches.open(cacheName).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        }).catch(() => {
          return caches.match(defaultResponseURL);
        })
      })
    );
  }
});