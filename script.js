/* ========== Config ========== */
const IMAGES_DIR = 'images/';
const IMA2_DIR = 'ima2/';
// GALLERY_TIERS is loaded from manifest.js (run python generate_manifest.py after changes)
// ima2 images are loaded dynamically via /api/ima2 — no manifest needed, just drop files in

/* ========== DOM ========== */
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const galleryGrid = document.getElementById('galleryGrid');
const ringContainer = document.getElementById('ringContainer');
const ringScene = document.querySelector('.ring-scene');
const heroCanvas = document.getElementById('heroCanvas');
const lightbox = document.getElementById('lightbox');

/* ========== Hero Canvas: Particle Constellation ========== */
let canvasCtx, canvasW, canvasH, mouseX = -999, mouseY = -999;
const particles = [];
const feedbackRings = [];
const PARTICLE_COUNT = 70;
const CONNECT_DIST = 140;

function initCanvas() {
    if (!heroCanvas) return;
    canvasCtx = heroCanvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Track mouse in hero section
    const hero = document.getElementById('home');
    hero.addEventListener('mousemove', (e) => {
        const rect = heroCanvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });
    hero.addEventListener('mouseleave', () => { mouseX = -999; mouseY = -999; chargeParticle = null; });

    // Hold-to-explode on constellation particles
    hero.addEventListener('mousedown', (e) => {
        if (e.target.closest('a, button')) return;
        const rect = heroCanvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        let nearest = null, nearestDist = Infinity;
        for (const p of particles) {
            const dx = p.x - mx, dy = p.y - my;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 40 && dist < nearestDist) { nearest = p; nearestDist = dist; }
        }
        if (!nearest) return;
        chargeParticle = nearest;
        chargeStart = performance.now();
        // Click feedback ripple
        feedbackRings.push({ x: nearest.x, y: nearest.y, life: 1 });
        e.preventDefault();
    });

    window.addEventListener('mouseup', () => {
        if (!chargeParticle) return;
        const elapsed = performance.now() - chargeStart;
        const intensity = Math.min(elapsed / CHARGE_MAX, 1);
        const cx = chargeParticle.x, cy = chargeParticle.y;
        for (const p of particles) {
            if (p === chargeParticle) continue;
            const dx = p.x - cx, dy = p.y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < BLAST_RADIUS && dist > 0.1) {
                const force = (1 - dist / BLAST_RADIUS) * EXPLODE_RADIUS * intensity * 0.025;
                p.vx += (dx / dist) * force;
                p.vy += (dy / dist) * force;
            }
        }
        particles.push({
            x: cx, y: cy,
            vx: (Math.random() - 0.5) * 2 * intensity,
            vy: (Math.random() - 0.5) * 2 * intensity,
            size: 1.5 + intensity * 3,
            baseSize: 1.5 + intensity * 3,
            alpha: 0.3 + intensity * 0.5,
            gold: Math.random() > 0.3,
        });
        chargeParticle = null;
    });

    // Create particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
            x: Math.random() * canvasW,
            y: Math.random() * canvasH,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            size: Math.random() * 3 + 1.5,
            baseSize: 0,
            alpha: Math.random() * 0.5 + 0.25,
            gold: Math.random() > 0.2, // 80% gold, 20% white
        });
        particles[i].baseSize = particles[i].size;
    }

    drawCanvas();
}

function resizeCanvas() {
    canvasW = heroCanvas.offsetWidth;
    canvasH = heroCanvas.offsetHeight;
    heroCanvas.width = canvasW;
    heroCanvas.height = canvasH;
}

function drawCanvas() {
    if (!canvasCtx) return;
    const ctx = canvasCtx;

    // Semi-transparent clear for trailing effect
    ctx.clearRect(0, 0, canvasW, canvasH);
    ctx.fillStyle = 'rgba(6, 6, 10, 0.12)';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Update & draw particles
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Gentle mouse attraction
        if (mouseX > 0 && mouseY > 0) {
            const dx = mouseX - p.x;
            const dy = mouseY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 200) {
                const force = (200 - dist) / 200 * 0.008;
                p.vx += dx / dist * force;
                p.vy += dy / dist * force;
            }
        }

        // Apply velocity with damping
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.995;
        p.vy *= 0.995;

        // Wrap around edges
        if (p.x < -20) p.x = canvasW + 20;
        if (p.x > canvasW + 20) p.x = -20;
        if (p.y < -20) p.y = canvasH + 20;
        if (p.y > canvasH + 20) p.y = -20;

        // Breathing size
        p.size = p.baseSize + Math.sin(Date.now() * 0.002 + i) * 0.3;
    }

    // Draw connections first (behind particles)
    ctx.strokeStyle = 'rgba(201, 169, 110, 0.06)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < CONNECT_DIST) {
                const alpha = (1 - dist / CONNECT_DIST) * 0.15;
                ctx.strokeStyle = `rgba(201, 169, 110, ${alpha})`;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }

    // Draw particles (no glow)
    for (const p of particles) {
        const isCharged = p === chargeParticle;
        const alpha = isCharged ? p.alpha * 1.4 : p.alpha;
        const sz = isCharged ? p.size * 1.6 : p.size;
        const color = p.gold
            ? `rgba(201, 169, 110, ${alpha})`
            : `rgba(255, 255, 255, ${alpha * 0.7})`;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw feedback rings
    for (let r = feedbackRings.length - 1; r >= 0; r--) {
        const ring = feedbackRings[r];
        ring.life -= 0.03;
        if (ring.life <= 0) { feedbackRings.splice(r, 1); continue; }
        ring.radius = (ring.radius || 4) + 1.2;
        ctx.strokeStyle = `rgba(255, 255, 255, ${ring.life * 0.7})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.stroke();
        // Inner contraction ring
        const innerR = ring.radius * 0.3;
        if (innerR > 1) {
            ctx.strokeStyle = `rgba(255, 255, 220, ${ring.life * 0.5})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.arc(ring.x, ring.y, innerR, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    requestAnimationFrame(drawCanvas);
}

/* ========== Particle Explosion on Hold ========== */
let chargeParticle = null;
let chargeStart = 0;
const CHARGE_MAX = 1500;
const EXPLODE_RADIUS = 300;
const BLAST_RADIUS = 200;

const lbImg = document.getElementById('lbImg');
const lbClose = document.getElementById('lbClose');
const lbPrev = document.getElementById('lbPrev');
const lbNext = document.getElementById('lbNext');

/* ========== Build Gallery ========== */
const TIER_COLORS = {
    '幻章': 'linear-gradient(135deg, #f0c060, #c88040)',
    '逸境': 'linear-gradient(135deg, #e8b850, #b07030)',
    '灵构': 'linear-gradient(135deg, #b890f0, #7c5ce0)',
    '臻描': 'linear-gradient(135deg, #60c0c8, #3a8090)',
    '浅绘': 'linear-gradient(135deg, #8888a0, #5a5a70)',
    '初叙': 'linear-gradient(135deg, #666680, #404050)',
    '未分类': 'linear-gradient(135deg, #555568, #333344)',
};
const TIER_ICONS = {
    '幻章': '✦', '逸境': '◆', '灵构': '◇',
    '臻描': '○', '浅绘': '·', '初叙': '—', '未分类': '?',
};

let globalIdx = 0;

function buildGallery() {
    galleryGrid.innerHTML = '';
    globalIdx = 0;

    if (typeof GALLERY_TIERS === 'undefined' || GALLERY_TIERS.length === 0) {
        galleryGrid.innerHTML = '<div style="color:var(--text-3);text-align:center;padding:60px;">运行 generate_manifest.py 加载作品</div>';
        return;
    }

    GALLERY_TIERS.forEach((tier) => {
        if (tier.images.length === 0) return;

        // Tier header
        const header = document.createElement('div');
        header.className = 'tier-header';
        header.innerHTML = `
            <div class="tier-divider"></div>
            <div class="tier-badge" style="background:${TIER_COLORS[tier.label] || TIER_COLORS['未分类']}">
                <span class="tier-icon">${TIER_ICONS[tier.label] || '?'}</span>
                <span class="tier-label">${tier.label}</span>
            </div>
            <div class="tier-divider"></div>`;
        galleryGrid.appendChild(header);

        tier.images.forEach((name) => {
            const src = tier.folder
                ? `${IMAGES_DIR}${tier.folder}/${name}`
                : `${IMAGES_DIR}${name}`;
            const div = document.createElement('div');
            div.className = 'gallery-item';
            div.style.animationDelay = `${globalIdx * 0.03}s`;
            div.innerHTML = `
                <img src="${src}" alt="" loading="lazy">
                <div class="item-hover">
                    <div class="item-hover-inner">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M11 8v6M8 11h6"/></svg>
                    </div>
                </div>`;
            galleryGrid.appendChild(div);
            globalIdx++;
        });
    });
}

/* ========== Build 3D Ring Carousel ========== */
const RING_RADIUS = 360;
let ringAngle = 0;
let ringAutoRotate = true;
let ringRAF = null;
let resumeTimer = null;
let ima2Images = [];  // loaded dynamically from /api/ima2

async function buildRing() {
    ringContainer.innerHTML = '';

    // Fetch image list dynamically from server API (no manifest needed)
    try {
        const resp = await fetch('/api/ima2');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        ima2Images = data.images || [];
    } catch (err) {
        console.warn('Failed to load ima2 images:', err);
        ima2Images = [];
        // Fallback: try manifest.js CAROUSEL_IMAGES
        if (typeof CAROUSEL_IMAGES !== 'undefined' && CAROUSEL_IMAGES.length > 0) {
            ima2Images = CAROUSEL_IMAGES;
        }
    }

    if (ima2Images.length === 0) {
        ringContainer.innerHTML = '<div style="color:var(--text-3);text-align:center;padding:80px 0;letter-spacing:0.05em;">将图片放入 ima2/ 文件夹后刷新页面</div>';
        return;
    }

    const N = ima2Images.length;
    const angleStep = 360 / N;

    const ring = document.createElement('div');
    ring.className = 'ring-3d';

    ima2Images.forEach((name, i) => {
        const item = document.createElement('div');
        item.className = 'ring-item';
        item.innerHTML = `<img src="${IMA2_DIR}${name}" alt="" loading="lazy">`;

        const deg = i * angleStep;
        item.style.transform = `rotateY(${deg}deg) translateZ(${RING_RADIUS}px)`;

        item.addEventListener('click', () => {
            lbImg.src = IMA2_DIR + name;
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        });

        ring.appendChild(item);
    });

    ringContainer.appendChild(ring);
    startRingAnimation();
}

function startRingAnimation() {
    if (ringRAF) cancelAnimationFrame(ringRAF);
    (function loop() {
        if (ringAutoRotate) {
            ringAngle += 0.06;
        }
        const ring = ringContainer.querySelector('.ring-3d');
        if (ring) {
            ring.style.transform = `rotateY(${ringAngle}deg)`;
        }
        ringRAF = requestAnimationFrame(loop);
    })();
}

function pauseAutoRotate() {
    ringAutoRotate = false;
    clearTimeout(resumeTimer);
}

function resumeAutoRotate() {
    resumeTimer = setTimeout(() => { ringAutoRotate = true; }, 2200);
}

// Mouse wheel — only on ring area center band, capped speed
const WHEEL_MAX_DELTA = 100;
ringContainer.addEventListener('wheel', (e) => {
    if (ima2Images.length === 0) return;
    // Narrow trigger zone: only middle 55% of container width
    const rect = ringContainer.getBoundingClientRect();
    const cx = e.clientX;
    const centerX = rect.left + rect.width / 2;
    const halfZone = rect.width * 0.275;
    if (cx < centerX - halfZone || cx > centerX + halfZone) return;

    e.preventDefault();
    e.stopPropagation();
    pauseAutoRotate();
    const raw = e.deltaY + e.deltaX;
    const clamped = Math.max(-WHEEL_MAX_DELTA, Math.min(WHEEL_MAX_DELTA, raw));
    ringAngle += clamped * 0.16;
    resumeAutoRotate();
}, { passive: false });

// Mouse drag — only on ring area
let dragStartX = 0;
let dragAngle = 0;
let isDragging = false;

ringContainer.addEventListener('mousedown', (e) => {
    isDragging = true;
    pauseAutoRotate();
    dragStartX = e.clientX;
    dragAngle = ringAngle;
});

window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    ringAngle = dragAngle + Math.max(-400, Math.min(400, dx)) * 0.35;
});

window.addEventListener('mouseup', () => {
    if (isDragging) { isDragging = false; resumeAutoRotate(); }
});

// Touch drag — only on ring area
let touchStartX = 0;
let touchAngle = 0;

ringContainer.addEventListener('touchstart', (e) => {
    pauseAutoRotate();
    touchStartX = e.touches[0].clientX;
    touchAngle = ringAngle;
}, { passive: true });

ringContainer.addEventListener('touchmove', (e) => {
    const dx = e.touches[0].clientX - touchStartX;
    ringAngle = touchAngle + Math.max(-300, Math.min(300, dx)) * 0.35;
}, { passive: true });

ringContainer.addEventListener('touchend', () => {
    resumeAutoRotate();
});

/* ========== Navbar Scroll ========== */
window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
    updateActiveLink();
});

/* ========== Mobile Nav ========== */
navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => navLinks.classList.remove('open'));
});
document.addEventListener('click', (e) => {
    if (!navLinks.contains(e.target) && !navToggle.contains(e.target))
        navLinks.classList.remove('open');
});

/* ========== Active Link ========== */
function updateActiveLink() {
    const sections = document.querySelectorAll('section[id]');
    const scrollY = window.scrollY + 200;
    sections.forEach(sec => {
        const id = sec.id;
        if (scrollY >= sec.offsetTop && scrollY < sec.offsetTop + sec.offsetHeight) {
            navLinks.querySelectorAll('a').forEach(a => a.classList.remove('active'));
            const link = navLinks.querySelector(`a[href="#${id}"]`);
            if (link) link.classList.add('active');
        }
    });
}

/* ========== Lightbox ========== */
function getGalleryItems() { return Array.from(galleryGrid.querySelectorAll('.gallery-item')); }
let lbIdx = 0;

function openLB(i) {
    lbIdx = i;
    const all = getGalleryItems();
    lbImg.src = all[lbIdx].querySelector('img').src;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}
function closeLB() { lightbox.classList.remove('active'); document.body.style.overflow = ''; }
function navLB(dir) {
    const all = getGalleryItems();
    lbIdx = (lbIdx + dir + all.length) % all.length;
    lbImg.src = all[lbIdx].querySelector('img').src;
}

galleryGrid.addEventListener('click', (e) => {
    const item = e.target.closest('.gallery-item');
    if (!item || item.classList.contains('veiled')) return;
    openLB(getGalleryItems().indexOf(item));
});
lbClose.addEventListener('click', closeLB);
lbPrev.addEventListener('click', () => navLB(-1));
lbNext.addEventListener('click', () => navLB(1));
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLB(); });
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (drawModal.classList.contains('active')) closeDrawModal();
        else if (lightbox.classList.contains('active')) closeLB();
    }
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'ArrowLeft') navLB(-1);
    if (e.key === 'ArrowRight') navLB(1);
});

/* ========== Draw System: 幻艺拾遗 ========== */
let veiledIndices = [];
let revealedIndices = [];
const drawBtn = document.getElementById('drawBtn');
const drawCount = document.getElementById('drawCount');
const drawModal = document.getElementById('drawModal');
const dmImg = document.getElementById('dmImg');
const dmClose = document.getElementById('dmClose');
const dmBackdrop = document.getElementById('dmBackdrop');
const DRAW_KEY = 'nailong_revealed';

function initDrawSystem() {
    const items = galleryGrid.querySelectorAll('.gallery-item');
    if (items.length === 0) return;

    const total = items.length;
    const saved = loadRevealed();

    // Rebuild state from saved
    revealedIndices = saved.filter(i => i < total);
    veiledIndices = [];
    for (let i = 0; i < total; i++) {
        if (!revealedIndices.includes(i)) veiledIndices.push(i);
    }

    // Apply veil
    items.forEach((item, i) => {
        item.classList.toggle('veiled', veiledIndices.includes(i));
    });

    updateDrawCount();

    drawBtn.addEventListener('click', drawRandom);
    drawBtn.addEventListener('touchend', (e) => { e.preventDefault(); drawRandom(); });

    dmClose.addEventListener('click', closeDrawModal);
    dmBackdrop.addEventListener('click', closeDrawModal);
    document.querySelector('.dm-image').addEventListener('click', closeDrawModal);

    if (veiledIndices.length === 0) showAllRevealed();
}

function loadRevealed() {
    try { return JSON.parse(localStorage.getItem(DRAW_KEY)) || []; }
    catch { return []; }
}
function saveRevealed() {
    localStorage.setItem(DRAW_KEY, JSON.stringify(revealedIndices));
}

function drawRandom() {
    if (veiledIndices.length === 0) return;
    const randomIdx = Math.floor(Math.random() * veiledIndices.length);
    const globalIdx = veiledIndices.splice(randomIdx, 1)[0];
    revealedIndices.push(globalIdx);
    saveRevealed();

    const item = galleryGrid.querySelectorAll('.gallery-item')[globalIdx];
    if (!item) return;

    const imgSrc = item.querySelector('img').src;
    item.classList.remove('veiled');

    dmImg.src = imgSrc;
    drawModal.classList.add('active');
    document.body.style.overflow = 'hidden';

    updateDrawCount();

    if (veiledIndices.length === 0) showAllRevealed();
}

function closeDrawModal() {
    drawModal.classList.remove('active');
    document.body.style.overflow = '';
}

function updateDrawCount() {
    const el = document.getElementById('drawCount');
    if (el) el.textContent = veiledIndices.length;
}

function showAllRevealed() {
    drawBtn.innerHTML = '<span>全部揭晓 ✦</span>';
    drawBtn.style.pointerEvents = 'none';
    drawBtn.style.opacity = '0.5';
    // Add reshuffle button
    if (!document.getElementById('reshuffleBtn')) {
        const reshuffle = document.createElement('button');
        reshuffle.id = 'reshuffleBtn';
        reshuffle.className = 'draw-btn';
        reshuffle.style.cssText = 'margin-top:16px;';
        reshuffle.innerHTML = '<span>重新洗牌</span>';
        reshuffle.addEventListener('click', reshuffleAll);
        drawBtn.parentNode.appendChild(reshuffle);
    }
    document.querySelector('.draw-hint').textContent = '所有作品已从迷雾中苏醒';
}

function reshuffleAll() {
    revealedIndices = [];
    localStorage.removeItem(DRAW_KEY);
    const items = galleryGrid.querySelectorAll('.gallery-item');
    veiledIndices = [];
    items.forEach((item, i) => {
        veiledIndices.push(i);
        item.classList.add('veiled');
    });
    updateDrawCount();
    drawBtn.innerHTML = '<span>触碰抽取</span><span class="draw-count" id="drawCount">--</span>';
    drawBtn.style.pointerEvents = '';
    drawBtn.style.opacity = '';
    document.querySelector('.draw-hint').textContent = '展厅中尚有许多被迷雾笼罩的作品，触碰星核将其唤醒';
    const reshuffle = document.getElementById('reshuffleBtn');
    if (reshuffle) reshuffle.remove();
    updateDrawCount();
}

/* ========== Scroll Animations ========== */
const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); obs.unobserve(entry.target); }
    });
}, { threshold: 0.1 });

function observeItems() {
    document.querySelectorAll('.fade-in').forEach(el => obs.observe(el));
}

/* ========== Smooth Scroll ========== */
document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(a.getAttribute('href'));
        if (target) window.scrollTo({ top: target.offsetTop - 70, behavior: 'smooth' });
    });
});

/* ========== Dark Mode Toggle ========== */
const darkOverlay = document.getElementById('darkOverlay');
const darkModeBtn = document.getElementById('darkModeBtn');
let darkMode = false;

darkModeBtn.addEventListener('click', () => {
    darkMode = !darkMode;
    darkOverlay.classList.toggle('on', darkMode);
    darkModeBtn.classList.toggle('active', darkMode);
});

document.addEventListener('mousemove', (e) => {
    if (!darkMode) return;
    darkOverlay.style.setProperty('--mx', e.clientX + 'px');
    darkOverlay.style.setProperty('--my', e.clientY + 'px');
});

document.addEventListener('touchmove', (e) => {
    if (!darkMode) return;
    darkOverlay.style.setProperty('--mx', e.touches[0].clientX + 'px');
    darkOverlay.style.setProperty('--my', e.touches[0].clientY + 'px');
}, { passive: true });

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && darkMode) {
        darkMode = false;
        darkOverlay.classList.remove('on');
        darkModeBtn.classList.remove('active');
    }
});

/* ========== Guestbook ========== */
const gbName = document.getElementById('gbName');
const gbMsg = document.getElementById('gbMsg');
const gbSubmit = document.getElementById('gbSubmit');
const gbList = document.getElementById('gbList');
const GB_KEY = 'nailong_guestbook';
const GB_CHUNK = 6;
let gbVisible = GB_CHUNK;
let gbBtnEl = null;

function loadMessages() {
    try { return JSON.parse(localStorage.getItem(GB_KEY)) || []; }
    catch { return []; }
}
function saveMessages(msgs) {
    localStorage.setItem(GB_KEY, JSON.stringify(msgs));
}

function renderMessages(reset = false) {
    if (reset) gbVisible = GB_CHUNK;
    const msgs = loadMessages();
    gbList.innerHTML = '';
    gbList.classList.remove('expanded');

    if (msgs.length === 0) {
        gbList.innerHTML = '<div class="gb-empty">还没有留言，成为第一个留下足迹的人 ✦</div>';
        if (gbBtnEl) { gbBtnEl.remove(); gbBtnEl = null; }
        return;
    }

    const show = Math.min(gbVisible, msgs.length);
    for (let i = 0; i < show; i++) {
        const m = msgs[i];
        const card = document.createElement('div');
        card.className = 'gb-card';
        card.innerHTML = `
            <div class="gb-card-header">
                <span class="gb-card-name">${escapeHtml(m.name)}</span>
                <span class="gb-card-time">${m.time}</span>
            </div>
            <div class="gb-card-body">${escapeHtml(m.msg)}</div>`;
        gbList.appendChild(card);
    }

    // Show more button
    if (show < msgs.length) {
        if (!gbBtnEl) {
            gbBtnEl = document.createElement('div');
            gbBtnEl.className = 'gb-more';
            gbBtnEl.innerHTML = '<button class="gb-more-btn">展开更多</button>';
            gbList.parentNode.appendChild(gbBtnEl);
            gbBtnEl.querySelector('button').addEventListener('click', () => {
                gbVisible += GB_CHUNK;
                renderMessages();
            });
        } else {
            gbBtnEl.classList.remove('hidden');
        }
    } else {
        gbList.classList.add('expanded');
        if (gbBtnEl) gbBtnEl.classList.add('hidden');
    }

    // If all messages visible already, expand
    if (gbVisible >= msgs.length) {
        gbList.classList.add('expanded');
    }
}

function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

gbSubmit.addEventListener('click', () => {
    const name = gbName.value.trim();
    const msg = gbMsg.value.trim();
    if (!name || !msg) return;
    const now = new Date();
    const time = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const msgs = loadMessages();
    msgs.unshift({ name, msg, time });
    saveMessages(msgs);
    gbName.value = '';
    gbMsg.value = '';
    renderMessages(true);
});

gbMsg.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); gbSubmit.click(); }
});

renderMessages();

/* ========== Init ========== */
buildGallery();
buildRing();
initCanvas();
initDrawSystem();
observeItems();
