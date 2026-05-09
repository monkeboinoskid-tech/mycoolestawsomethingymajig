try {
    importScripts("https://cdn.jsdelivr.net/gh/MercuryWorkshop/scramjet@v3/dist/scramjet.all.js");
} catch (e) {}
if (typeof ScramjetWorker === "undefined") {
    importScripts("https://cdn.jsdelivr.net/gh/MercuryWorkshop/scramjet@v3/dist/scramjet.code.js");
}

const scramjet = new ScramjetWorker();

self.addEventListener("fetch", (event) => {
    event.respondWith(scramjet.handleFetch(event));
});
