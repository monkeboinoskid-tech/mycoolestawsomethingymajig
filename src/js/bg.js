(function () {
    const canvas = document.getElementById("bgCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0, h = 0;
    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;

    const LAYERS = [
        { count: 120, minR: 0.4, maxR: 0.9, minA: 0.3, maxA: 0.8 },
        { count: 80,  minR: 0.8, maxR: 1.4, minA: 0.2, maxA: 0.5 },
        { count: 40,  minR: 1.2, maxR: 2.2, minA: 0.1, maxA: 0.3 }
    ];

    const stars = [];
    function generateStars(countScale = 1.0) {
        stars.length = 0;
        LAYERS.forEach((layer, li) => {
            const count = Math.round(layer.count * countScale);
            for (let i = 0; i < count; i++) {
                stars.push({
                    layer: li,
                    x: Math.random(),
                    y: Math.random(),
                    r: layer.minR + Math.random() * (layer.maxR - layer.minR),
                    baseA: layer.minA + Math.random() * (layer.maxA - layer.minA),
                    phase: Math.random() * Math.PI * 2,
                    phaseSpeed: 0.002 + Math.random() * 0.004,
                    drift: (Math.random() - 0.5) * 0.0001
                });
            }
        });
    }

    const savedDensity = parseInt(localStorage.getItem("nocturne-star-density") || "100", 10);
    generateStars(savedDensity / 100);

    function resize() {
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    window.addEventListener("pointermove", e => {
        targetX = (e.clientX / w - 0.5) * 2;
        targetY = (e.clientY / h - 0.5) * 2;
    }, { passive: true });

    let enabled = true;
    window.addEventListener("nocturne:bgfx", e => { enabled = !!e.detail; });
    window.addEventListener("nocturne:stardensity", e => {
        generateStars(parseInt(e.detail, 10) / 100);
    });

    let t = 0;
    function render() {
        t += 0.004;
        mouseX += (targetX - mouseX) * 0.05;
        mouseY += (targetY - mouseY) * 0.05;

        ctx.clearRect(0, 0, w, h);

        if (!enabled) { requestAnimationFrame(render); return; }

        const cx = w * (0.5 + Math.sin(t * 0.3) * 0.04);
        const cy = h * (0.35 + Math.cos(t * 0.23) * 0.05);
        const nebula = ctx.createRadialGradient(cx, cy, 40, cx, cy, Math.max(w, h) * 0.8);
        nebula.addColorStop(0, "rgba(79, 70, 229, 0.08)");
        nebula.addColorStop(0.5, "rgba(124, 58, 237, 0.03)");
        nebula.addColorStop(1, "rgba(2, 3, 8, 0)");
        ctx.fillStyle = nebula;
        ctx.fillRect(0, 0, w, h);

        const cx2 = w * (0.85 + Math.sin(t * 0.17 + 2) * 0.04);
        const cy2 = h * (0.8 + Math.cos(t * 0.21 + 1) * 0.04);
        const nebula2 = ctx.createRadialGradient(cx2, cy2, 60, cx2, cy2, Math.max(w, h) * 0.6);
        nebula2.addColorStop(0, "rgba(201, 193, 255, 0.05)");
        nebula2.addColorStop(0.6, "rgba(201, 193, 255, 0.01)");
        nebula2.addColorStop(1, "rgba(2, 3, 8, 0)");
        ctx.fillStyle = nebula2;
        ctx.fillRect(0, 0, w, h);

        for (const s of stars) {
            const layer = LAYERS[s.layer];
            s.phase += s.phaseSpeed;
            s.x += s.drift || 0;
            if (s.x > 1) s.x = 0;
            if (s.x < 0) s.x = 1;
            
            const px = s.x * w + mouseX * 18 * (s.layer + 1) * 0.3;
            const py = s.y * h + mouseY * 14 * (s.layer + 1) * 0.3;

            let alpha = s.baseA * (0.6 + 0.4 * Math.sin(s.phase));
            alpha = Math.max(0.02, alpha);

            ctx.beginPath();
            ctx.arc(px, py, s.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(201, 193, 255, ${alpha})`;
            ctx.fill();

            if (s.r > 1.2) {
                ctx.beginPath();
                ctx.arc(px, py, s.r * 2.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(124, 58, 237, ${alpha * 0.15})`;
                ctx.fill();
            }
        }

        const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75);
        vg.addColorStop(0, "rgba(5, 6, 13, 0)");
        vg.addColorStop(1, "rgba(5, 6, 13, 0.45)");
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, w, h);

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
})();
