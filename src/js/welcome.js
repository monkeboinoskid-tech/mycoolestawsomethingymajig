const WELCOME_KEY = "nocturne-welcome-shown-v1";

export function initWelcome() {
    const welcomeBanner = document.getElementById("welcomeBanner");
    const okBtn = document.querySelector(".welcome-ok-btn");

    if (!welcomeBanner || !okBtn) {
        console.warn("Welcome banner elements missing");
        return;
    }

    console.log("Welcome banner initializing");

    const hasShownWelcome = localStorage.getItem(WELCOME_KEY) === "true";

    if (hasShownWelcome) {
        welcomeBanner.classList.add("hidden");
        return;
    }

    function closeWelcome() {
        console.log("Welcome banner closing");
        welcomeBanner.style.animation = "slideDown 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) reverse forwards";
        setTimeout(() => {
            welcomeBanner.classList.add("hidden");
            localStorage.setItem(WELCOME_KEY, "true");
        }, 300);
    }

    okBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeWelcome();
    });
}
