try {
    importScripts("https://cdn.jsdelivr.net/gh/MercuryWorkshop/scramjet-builds@main/scramjet.all.js");
} catch (e) {}
if (typeof ScramjetWorker === "undefined") {
    importScripts("https://cdn.jsdelivr.net/gh/MercuryWorkshop/scramjet-builds@main/scramjet.code.js");
}

const scramjet = new ScramjetWorker();

self.addEventListener("fetch", (event) => {
    event.respondWith(scramjet.handleFetch(event));
});
