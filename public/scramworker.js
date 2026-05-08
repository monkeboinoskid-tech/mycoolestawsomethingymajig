importScripts("https://cdn.jsdelivr.net/gh/MercuryWorkshop/scramjet-builds@master/dist/scramjet.all.js");

const scramjet = new ScramjetWorker();

self.addEventListener("fetch", (event) => {
    event.respondWith(scramjet.handleFetch(event));
});
