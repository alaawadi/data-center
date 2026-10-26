'use strict';

var CACHE_PREFIX = 'data-center-pwa-';
var CACHE_NAME = CACHE_PREFIX + 'v13';
var PRECACHE_ASSETS = __PRECACHE_ASSETS__;
var STATIC_PREFIX = __STATIC_PREFIX__;
var OFFLINE_URL = __OFFLINE_URL__;
var STATIC_PATH = new URL(STATIC_PREFIX, self.location.origin).pathname;
var PUBLIC_PAGE_PATHS = [
  /^\/$/,
  /^\/courses\/$/,
  /^\/courses\/[^/]+\/$/,
  /^\/courses\/[^/]+\/certificate\/$/,
  /^\/courses\/[^/]+\/playlist\/$/,
  /^\/projects\/$/,
  /^\/projects\/[^/]+\/$/,
  /^\/freelancers\/$/,
  /^\/freelancers\/[^/]+\/$/
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(PRECACHE_ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key.indexOf(CACHE_PREFIX) === 0 && key !== CACHE_NAME) {
          return caches.delete(key);
        }
        return Promise.resolve(false);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function isPublicPage(url) {
  return !url.search && PUBLIC_PAGE_PATHS.some(function (pattern) {
    return pattern.test(url.pathname);
  });
}

function isAuthenticatedHtml(response) {
  var cacheControl = (response.headers.get('Cache-Control') || '').toLowerCase();
  if (cacheControl.indexOf('no-store') >= 0 || cacheControl.indexOf('private') >= 0) return Promise.resolve(true);
  return response.clone().text().then(function (html) {
    return /authenticated\s*:\s*true/i.test(html);
  });
}

function networkFirstPage(request, url) {
  return fetch(request).then(function (response) {
    if (response.ok && !response.redirected && response.type === 'basic' && isPublicPage(url)) {
      return isAuthenticatedHtml(response).then(function (authenticated) {
        if (!authenticated) {
          return caches.open(CACHE_NAME).then(function (cache) {
            return cache.put(request, response.clone()).then(function () { return response; });
          });
        }
        return response;
      });
    }
    return response;
  }).catch(function () {
    return caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(request).then(function (cached) {
        if (cached) return cached;
        return cache.match(OFFLINE_URL);
      });
    });
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request, url));
    return;
  }

  if (!url.pathname.startsWith(STATIC_PATH)) return;
  event.respondWith(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(request, { ignoreSearch: true }).then(function (cached) {
        if (cached) return cached;
        return fetch(request).then(function (response) {
          if (response.ok && response.type === 'basic') {
            cache.put(request, response.clone());
          }
          return response;
        });
      });
    })
  );
});
