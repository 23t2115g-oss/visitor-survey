/* Offline support: always try the network first (so updates arrive), fall back to the saved copy. */
var CACHE="visitor-survey-v1";
var ASSETS=["./","./index.html","./manifest.webmanifest","./icon-180.png","./icon-192.png","./icon-512.png"];
self.addEventListener("install",function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(ASSETS);}).then(function(){return self.skipWaiting();}));
});
self.addEventListener("activate",function(e){
  e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));}).then(function(){return self.clients.claim();}));
});
self.addEventListener("fetch",function(e){
  var req=e.request;
  if(req.method!=="GET")return;
  if(new URL(req.url).origin!==self.location.origin)return;
  e.respondWith(networkFirst(req));
});
function fromCache(req){return caches.match(req,{ignoreSearch:true});}
function networkFirst(req){
  return new Promise(function(resolve){
    var settled=false;
    function give(r){if(!settled&&r){settled=true;resolve(r);}}
    /* weak Wi-Fi: after 3 seconds use the saved copy instead of waiting */
    var timer=setTimeout(function(){fromCache(req).then(give);},3000);
    fetch(req,{cache:"no-cache"}).then(function(res){
      clearTimeout(timer);
      if(res&&res.ok){var copy=res.clone();caches.open(CACHE).then(function(c){c.put(req,copy);});}
      give(res);
    }).catch(function(){
      clearTimeout(timer);
      fromCache(req).then(function(r){ if(r)give(r); else if(!settled){settled=true;resolve(Response.error());} });
    });
  });
}
