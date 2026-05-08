// Lightweight one-shot update notice. Bumps the storage key when the version changes
// so a new release re-shows the toast for everyone.
(function () {
    const VERSION = 'v1.2.1';
    const KEY = 'updateDismissed_' + VERSION;
    if (localStorage.getItem(KEY) === '1') return;

    const toast = document.getElementById('updateToast');
    if (!toast) return;

    const dismiss = () => {
        toast.classList.add('dismissing');
        setTimeout(() => {
            toast.classList.remove('visible', 'dismissing');
            localStorage.setItem(KEY, '1');
        }, 300);
    };

    toast.querySelector('.ut-close').addEventListener('click', dismiss);

    // Slight delay so the page settles before the toast slides in.
    setTimeout(() => toast.classList.add('visible'), 800);
})();
