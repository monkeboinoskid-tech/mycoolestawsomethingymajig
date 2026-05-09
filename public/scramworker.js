try {
    importScripts("https://cdn.jsdelivr.net/gh/MercuryWorkshop/scramjet-builds@latest/dist/scramjet.all.js");
} catch (e) {}
if (typeof ScramjetWorker === "undefined") {
    importScripts("https://cdn.jsdelivr.net/gh/MercuryWorkshop/scramjet-builds@latest/dist/scramjet.code.js");
}

const scramjet = new ScramjetWorker();

self.addEventListener("fetch", (event) => {
    event.respondWith(scramjet.handleFetch(event));
});
