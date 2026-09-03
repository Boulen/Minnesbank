// SERVICE-WORKER.JS — minimal service worker, enda syftet är att göra sidan installerbar
// som en riktig app (Chrome kräver en registrerad service worker med en riktig
// fetch-hanterare för att visa "Installera"-valet, inte bara ett manifest.json).
//
// Medveten strategi: "network-first" (alltid försöka hämta färskt först) för allt.
// Cache används BARA som reservlösning om nätverket är helt nere - aldrig som förstahandskälla.
// Detta är avsiktligt försiktigt eftersom js/-filerna ändras ofta under utveckling;
// en mer aggressiv cache-first-strategi skulle kunna visa gammal, trasig kod efter en
// uppdatering. Ingen förladdning/pre-cache av filer heller, av samma anledning.

var CACHE_NAME="minnesbank-shell-v1";

self.addEventListener("install",function(e){
  self.skipWaiting();
});

self.addEventListener("activate",function(e){
  e.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(names.filter(function(n){return n!==CACHE_NAME;}).map(function(n){return caches.delete(n);}));
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch",function(e){
  // Rör aldrig Google/Drive-API-anrop eller andra externa domäner - bara appens egna filer.
  if(e.request.method!=="GET")return;
  var url=new URL(e.request.url);
  if(url.origin!==location.origin)return;

  e.respondWith(
    fetch(e.request).then(function(response){
      var copy=response.clone();
      caches.open(CACHE_NAME).then(function(cache){cache.put(e.request,copy);});
      return response;
    }).catch(function(){
      return caches.match(e.request);
    })
  );
});
