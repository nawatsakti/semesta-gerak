(() => {
  'use strict';

  const canvas = document.getElementById('universe');
  const ctx = canvas.getContext('2d', { alpha: false });
  const hero = document.getElementById('hero');
  const startBtn = document.getElementById('startBtn');
  const hud = document.getElementById('hud');
  const legend = document.getElementById('legend');
  const energy = document.getElementById('energy');
  const energyFill = document.getElementById('energyFill');
  const energyValue = document.getElementById('energyValue');
  const loading = document.getElementById('loading');
  const cameraWrap = document.getElementById('cameraWrap');
  const cameraEl = document.getElementById('camera');
  const cameraOverlay = document.getElementById('cameraOverlay');
  const overlayCtx = cameraOverlay.getContext('2d');
  const nameBtn = document.getElementById('nameBtn');
  const shapeBtn = document.getElementById('shapeBtn');
  const captureBtn = document.getElementById('captureBtn');
  const namePanel = document.getElementById('namePanel');
  const shapePanel = document.getElementById('shapePanel');
  const shapeGrid = document.getElementById('shapeGrid');
  const customShapeForm = document.getElementById('customShapeForm');
  const customShapeInput = document.getElementById('customShapeInput');
  const uploadShapeBtn = document.getElementById('uploadShapeBtn');
  const shapeFileInput = document.getElementById('shapeFileInput');
  const drawShapeBtn = document.getElementById('drawShapeBtn');
  const drawZone = document.getElementById('drawZone');
  const drawCanvas = document.getElementById('drawCanvas');
  const drawCtx = drawCanvas.getContext('2d', { willReadFrequently: true });
  const clearDrawBtn = document.getElementById('clearDrawBtn');
  const cancelDrawBtn = document.getElementById('cancelDrawBtn');
  const useDrawBtn = document.getElementById('useDrawBtn');
  const nameForm = document.getElementById('nameForm');
  const nameInput = document.getElementById('nameInput');
  const nameCancel = document.getElementById('nameCancel');
  const shapeClose = document.getElementById('shapeClose');
  const nameBadge = document.getElementById('nameBadge');
  const nameBadgeText = document.getElementById('nameBadgeText');
  const nameBadgeKicker = document.getElementById('nameBadgeKicker');
  const idleBadge = document.getElementById('idleBadge');
  const holdRing = document.getElementById('holdRing');
  const holdProgress = document.getElementById('holdProgress');
  const cameraBtn = document.getElementById('cameraBtn');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const resetBtn = document.getElementById('resetBtn');
  const gestureText = document.getElementById('gestureText');
  const modeText = document.getElementById('modeText');
  const hint = document.getElementById('hint');
  const statusDot = document.getElementById('statusDot');
  const toast = document.getElementById('toast');
  const flash = document.getElementById('flash');

  let W = innerWidth, H = innerHeight, DPR = Math.min(devicePixelRatio || 1, 1.65);
  let particles = [], farStars = [], shockwaves = [], handTrail = [], meteors = [];
  let running = false, camera = null, hands = null, lastVideoTime = -1;
  let mouseMode = true, t = 0, lastExplosion = 0, cameraVisible = false, shake = 0;
  let energyLevel = 0, smoothScale = 1;
  let textMode = false, currentName = '', currentShapeId = '', targetPoints = [];
  let currentFormationLabel = '', currentFormationKicker = 'CONSTELLATION', currentFormationType = 'galaxy';
  let lastInteraction = performance.now(), lastPresence = performance.now();
  let idleActive = false, idleStep = 0, idleStepAt = 0;
  let twoHandsHeld = 0, lastFrameTime = performance.now(), logoHoldTriggered = false;

  const pointer = {
    x: W*.5, y: H*.5, active: false,
    gesture: 'idle', pinch: false, open: false, fist: false,
    twoHands: false, spread: 1, vx: 0, vy: 0, lastX: W*.5, lastY: H*.5,
    secondX: W*.5, secondY: H*.5
  };

  const palette = [
    [129, 98, 255], [76, 194, 255], [157, 117, 255],
    [86, 231, 255], [255, 255, 255], [255, 120, 207], [190, 181, 255]
  ];

  function markInteraction(){
    const now = performance.now();
    lastInteraction = now;
    lastPresence = now;
    if (idleActive) deactivateIdle();
  }

  function resize() {
    W = innerWidth; H = innerHeight; DPR = Math.min(devicePixelRatio || 1, 1.65);
    canvas.width = Math.floor(W*DPR); canvas.height = Math.floor(H*DPR);
    canvas.style.width = W+'px'; canvas.style.height = H+'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);
    const rect = cameraWrap.getBoundingClientRect();
    cameraOverlay.width = Math.max(1, Math.round(rect.width*DPR));
    cameraOverlay.height = Math.max(1, Math.round(rect.height*DPR));
    overlayCtx.setTransform(DPR,0,0,DPR,0,0);
    initFarStars();
    if (!particles.length) initParticles();
    if (textMode && currentFormationType === 'name' && currentName) buildNameTargets(currentName, true);
    if (textMode && currentFormationType === 'shape' && currentShapeId) buildShapeTargets(currentShapeId, true);
  }

  function particleCount() {
    const area = W*H;
    const mobile = matchMedia('(max-width: 820px)').matches;
    const lowPower = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
    let n = Math.round(area/760);
    return Math.max(850, Math.min(n, mobile || lowPower ? 1500 : 2800));
  }

  function initFarStars() {
    const count = Math.max(120, Math.min(420, Math.round((W*H)/5200)));
    farStars = Array.from({length:count}, () => ({
      x:Math.random()*W, y:Math.random()*H,
      r:.25+Math.random()*1.15, a:.12+Math.random()*.55,
      tw:Math.random()*Math.PI*2, speed:.25+Math.random()*.8
    }));
  }

  function initParticles() {
    const n = particleCount();
    const maxR = Math.min(W,H)*.45;
    particles = Array.from({length:n}, () => {
      const angle = Math.random()*Math.PI*2;
      const radius = Math.pow(Math.random(), .66)*maxR;
      const armOffset = Math.sin(angle*2.75 + radius*.021) * (15 + radius*.045);
      const flatten = .56 + Math.random()*.14;
      const x = W*.5 + Math.cos(angle)*radius + Math.cos(angle+Math.PI/2)*armOffset;
      const y = H*.5 + Math.sin(angle)*radius*flatten + Math.sin(angle+Math.PI/2)*armOffset*.45;
      return {
        x,y,px:x,py:y,bx:x,by:y,
        vx:(Math.random()-.5)*.12, vy:(Math.random()-.5)*.12,
        size:.35+Math.random()*1.8,
        alpha:.22+Math.random()*.78,
        phase:Math.random()*Math.PI*2,
        color:palette[(Math.random()*palette.length)|0],
        depth:.45+Math.random()*1.25,
        angle,radius,
        sparkle:Math.random()>.88
      };
    });
  }

  function toTargetPoints(pts, sourceW, sourceH, focusY=.48) {
    if (!pts.length) return false;
    for (let i = pts.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [pts[i], pts[j]] = [pts[j], pts[i]];
    }
    const maxWidth = Math.min(W*.74, 1180);
    const maxHeight = Math.min(H*.39, 380);
    const scale = Math.min(maxWidth/sourceW, maxHeight/sourceH);
    const used = Math.floor(particles.length * .88);
    targetPoints = Array.from({length:used}, (_,i) => {
      const q = pts[i % pts.length];
      const jitter = i >= pts.length ? 2.2 : 1.0;
      return {
        x: W*.5 + (q.x-sourceW*.5)*scale + (Math.random()-.5)*jitter,
        y: H*focusY + (q.y-sourceH*.5)*scale + (Math.random()-.5)*jitter,
        phase: Math.random()*Math.PI*2
      };
    });
    return true;
  }

  function buildFromCanvas(drawFn, options = {}) {
    const ow = options.width || 1500;
    const oh = options.height || 500;
    const off = document.createElement('canvas');
    off.width = ow; off.height = oh;
    const ox = off.getContext('2d', { willReadFrequently: true });
    ox.clearRect(0,0,ow,oh);
    ox.fillStyle = '#fff';
    ox.strokeStyle = '#fff';
    ox.lineCap = 'round';
    ox.lineJoin = 'round';
    drawFn(ox, ow, oh);
    const data = ox.getImageData(0, 0, ow, oh).data;
    const pts = [];
    const step = options.step || 5;
    for (let y = 10; y < oh - 10; y += step) {
      for (let x = 10; x < ow - 10; x += step) {
        if (data[(y * ow + x) * 4 + 3] > 70) pts.push({x,y});
      }
    }
    return toTargetPoints(pts, ow, oh, options.focusY ?? .48);
  }

  function showBadge(kicker, label) {
    currentFormationKicker = kicker;
    currentFormationLabel = label;
    nameBadgeKicker.textContent = kicker;
    nameBadgeText.textContent = label;
    nameBadge.classList.remove('hidden');
  }

  function buildNameTargets(rawName, silent = false) {
    const name = (rawName || '').trim().toUpperCase().replace(/\s+/g, ' ').slice(0, 16);
    if (!name) return false;
    let fontSize = 245;
    const ok = buildFromCanvas((ox, ow, oh) => {
      ox.textAlign = 'center';
      ox.textBaseline = 'middle';
      ox.font = `900 ${fontSize}px Arial, Helvetica, sans-serif`;
      while (ox.measureText(name).width > ow * .88 && fontSize > 92) {
        fontSize -= 8;
        ox.font = `900 ${fontSize}px Arial, Helvetica, sans-serif`;
      }
      ox.fillText(name, ow/2, oh/2 + 4);
    }, { width: 1500, height: 430, step: fontSize > 170 ? 5 : 4, focusY: .48 });
    if (!ok) return false;
    currentName = name;
    currentShapeId = '';
    textMode = true;
    currentFormationType = 'name';
    showBadge('CONSTELLATION', name);
    modeText.textContent = 'NAME CONSTELLATION';
    hint.textContent = `✨ ${name} — gerakkan tanganmu untuk menghidupkan namamu`;
    if (!silent) markInteraction();
    return true;
  }

  function shapeLabel(type){
    return ({ heart:'HEART', butterfly:'BUTTERFLY', dna:'DNA', code:'CODE', logo:'LOGO INFORMATIKA' })[type] || 'SHAPE';
  }

  function buildCustomShape(value) {
    const content = (value || '').trim().slice(0, 24);
    if (!content) return false;

    let fontSize = 260;
    const ok = buildFromCanvas((ox, ow, oh) => {
      ox.textAlign = 'center';
      ox.textBaseline = 'middle';
      ox.font = `900 ${fontSize}px "Segoe UI Emoji", "Segoe UI", Arial, sans-serif`;
      while (ox.measureText(content).width > ow * .88 && fontSize > 76) {
        fontSize -= 8;
        ox.font = `900 ${fontSize}px "Segoe UI Emoji", "Segoe UI", Arial, sans-serif`;
      }
      ox.fillText(content, ow / 2, oh / 2);
    }, { width: 1500, height: 520, step: 5, focusY: .48 });

    if (!ok) return false;
    textMode = true;
    currentName = '';
    currentShapeId = '';
    currentFormationType = 'custom';
    showBadge('CUSTOM UNIVERSE', content);
    modeText.textContent = 'CUSTOM PARTICLE FORM';
    hint.textContent = `✨ ${content} — bentuk pilihan pengunjung`;
    markInteraction();
    return true;
  }

  function buildImageShape(img, label = 'CUSTOM IMAGE') {
    const ow = 1000, oh = 700;
    const off = document.createElement('canvas');
    off.width = ow; off.height = oh;
    const ox = off.getContext('2d', { willReadFrequently: true });
    ox.clearRect(0, 0, ow, oh);

    const scale = Math.min((ow * .82) / img.width, (oh * .82) / img.height);
    const dw = img.width * scale, dh = img.height * scale;
    ox.drawImage(img, (ow - dw) / 2, (oh - dh) / 2, dw, dh);

    const data = ox.getImageData(0, 0, ow, oh).data;
    const step = 6;
    let opaque = 0, sampled = 0;
    for (let y = 0; y < oh; y += step) {
      for (let x = 0; x < ow; x += step) {
        const i = (y * ow + x) * 4;
        sampled++;
        if (data[i + 3] > 220) opaque++;
      }
    }
    const mostlyOpaque = opaque / Math.max(1, sampled) > .80;
    const pts = [];
    for (let y = 5; y < oh - 5; y += step) {
      for (let x = 5; x < ow - 5; x += step) {
        const i = (y * ow + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        const brightness = r * .299 + g * .587 + b * .114;
        const usePixel = mostlyOpaque ? (a > 40 && brightness < 225) : a > 55;
        if (usePixel) pts.push({ x, y });
      }
    }
    if (!pts.length) return false;

    toTargetPoints(pts, ow, oh, .49);
    textMode = true;
    currentFormationType = 'custom';
    currentName = '';
    currentShapeId = '';
    showBadge('CUSTOM IMAGE', (label || 'IMAGE').slice(0, 22).toUpperCase());
    modeText.textContent = 'IMAGE CONSTELLATION';
    hint.textContent = '🖼 Gerakkan tanganmu untuk menghidupkan gambar';
    markInteraction();
    return true;
  }

  let drawing = false;

  function resetDrawCanvas() {
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    drawCtx.strokeStyle = '#ffffff';
    drawCtx.lineWidth = 18;
    drawCtx.lineCap = 'round';
    drawCtx.lineJoin = 'round';
  }

  function drawPosition(event) {
    const rect = drawCanvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (drawCanvas.width / rect.width),
      y: (event.clientY - rect.top) * (drawCanvas.height / rect.height)
    };
  }

  function stopDrawing() { drawing = false; }

  function useDrawingAsShape() {
    const data = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height).data;
    const pts = [];
    const step = 4;
    for (let y = 0; y < drawCanvas.height; y += step) {
      for (let x = 0; x < drawCanvas.width; x += step) {
        const i = (y * drawCanvas.width + x) * 4;
        if (data[i + 3] > 40) pts.push({ x, y });
      }
    }
    if (!pts.length) {
      showToast('Gambar sesuatu terlebih dahulu');
      return false;
    }
    toTargetPoints(pts, drawCanvas.width, drawCanvas.height, .49);
    textMode = true;
    currentFormationType = 'custom';
    currentName = '';
    currentShapeId = '';
    showBadge('YOUR DRAWING', 'CUSTOM ART');
    modeText.textContent = 'DRAWING CONSTELLATION';
    hint.textContent = '✍ Gambarmu sekarang menjadi semesta';
    markInteraction();
    return true;
  }

  function buildShapeTargets(type, silent = false) {
    const t = (type || '').toLowerCase();
    let ok = false;
    if (t === 'heart') {
      ok = buildFromCanvas((ox, ow, oh) => {
        ox.translate(ow/2, oh/2+10);
        const s = Math.min(ow, oh) * .19;
        ox.beginPath();
        ox.moveTo(0, s*.82);
        ox.bezierCurveTo(s*1.6, -s*.22, s*1.45, -s*1.45, 0, -s*.52);
        ox.bezierCurveTo(-s*1.45, -s*1.45, -s*1.6, -s*.22, 0, s*.82);
        ox.closePath();
        ox.fill();
      }, { width: 1200, height: 700, step: 5, focusY: .49 });
    } else if (t === 'butterfly') {
      ok = buildFromCanvas((ox, ow, oh) => {
        ox.translate(ow/2, oh/2);
        ox.lineWidth = 36;
        ox.beginPath(); ox.moveTo(0, -160); ox.lineTo(0, 180); ox.stroke();
        ox.beginPath(); ox.arc(-150,-90,140,Math.PI*1.1,Math.PI*0.08,true); ox.fill();
        ox.beginPath(); ox.arc(150,-90,140,Math.PI*0.92,Math.PI*1.9,false); ox.fill();
        ox.beginPath(); ox.arc(-138,118,104,Math.PI*1.26,Math.PI*0.22,true); ox.fill();
        ox.beginPath(); ox.arc(138,118,104,Math.PI*0.78,Math.PI*1.74,false); ox.fill();
        ox.lineWidth = 14;
        ox.beginPath(); ox.moveTo(-18,-150); ox.quadraticCurveTo(-70,-228,-118,-250); ox.stroke();
        ox.beginPath(); ox.moveTo(18,-150); ox.quadraticCurveTo(70,-228,118,-250); ox.stroke();
      }, { width: 1200, height: 800, step: 6, focusY: .50 });
    } else if (t === 'dna') {
      ok = buildFromCanvas((ox, ow, oh) => {
        ox.translate(ow/2, oh/2);
        ox.lineWidth = 24;
        ox.beginPath();
        for (let y=-220;y<=220;y+=10){
          const x = Math.sin(y/55)*110;
          if (y===-220) ox.moveTo(x,y); else ox.lineTo(x,y);
        }
        ox.stroke();
        ox.beginPath();
        for (let y=-220;y<=220;y+=10){
          const x = -Math.sin(y/55)*110;
          if (y===-220) ox.moveTo(x,y); else ox.lineTo(x,y);
        }
        ox.stroke();
        ox.lineWidth = 14;
        for (let y=-190;y<=190;y+=38){
          const x = Math.sin(y/55)*110;
          ox.beginPath(); ox.moveTo(x,y); ox.lineTo(-x,y); ox.stroke();
        }
      }, { width: 1200, height: 800, step: 6, focusY: .50 });
    } else if (t === 'code') {
      ok = buildFromCanvas((ox, ow, oh) => {
        ox.textAlign = 'center';
        ox.textBaseline = 'middle';
        ox.font = '900 290px Arial, Helvetica, sans-serif';
        ox.fillText('{ }', ow/2, oh/2);
      }, { width: 1200, height: 520, step: 5, focusY: .48 });
    } else if (t === 'logo') {
      ok = buildFromCanvas((ox, ow, oh) => {
        ox.translate(ow/2, oh/2+10);
        ox.lineWidth = 24;
        ox.beginPath(); ox.arc(0,0,210,0,Math.PI*2); ox.stroke();
        ox.beginPath(); ox.moveTo(-70,-150); ox.lineTo(-70,150); ox.stroke();
        ox.beginPath(); ox.moveTo(-165,-150); ox.lineTo(20,-150); ox.stroke();
        ox.beginPath(); ox.moveTo(80,-150); ox.lineTo(80,150); ox.stroke();
        ox.beginPath(); ox.moveTo(20,-150); ox.lineTo(140,-150); ox.stroke();
        ox.beginPath(); ox.moveTo(20,150); ox.lineTo(140,150); ox.stroke();
        ox.lineWidth = 16;
        [[-170,-170], [170,-170], [170,170], [-170,170]].forEach(([x,y])=>{ ox.beginPath(); ox.arc(x,y,18,0,Math.PI*2); ox.fill();});
        [[-170,-170,-210,-210], [170,-170,210,-210], [170,170,210,210], [-170,170,-210,210]].forEach(([x1,y1,x2,y2])=>{ ox.beginPath(); ox.moveTo(x1,y1); ox.lineTo(x2,y2); ox.stroke(); });
      }, { width: 1200, height: 800, step: 6, focusY: .50 });
    }
    if (!ok) return false;
    textMode = true;
    currentFormationType = 'shape';
    currentName = '';
    currentShapeId = t;
    showBadge('SHAPE MORPH', shapeLabel(t));
    hint.textContent = `⬡ ${shapeLabel(t)} — semesta berubah bentuk, teruskan dengan gesture tanganmu`;
    if (!silent) markInteraction();
    return true;
  }

  function openNamePanel() { namePanel.classList.remove('hidden'); nameInput.value = currentName || ''; setTimeout(()=>nameInput.focus(), 40); }
  function closeNamePanel() { namePanel.classList.add('hidden'); }
  function openShapePanel() { shapePanel.classList.remove('hidden'); }
  function closeShapePanel() { shapePanel.classList.add('hidden'); }

  function leaveFormationMode() {
    textMode = false;
    currentName = '';
    currentShapeId = '';
    targetPoints = [];
    currentFormationLabel = '';
    currentFormationKicker = 'CONSTELLATION';
    currentFormationType = 'galaxy';
    nameBadge.classList.add('hidden');
    modeText.textContent = 'NEBULA GALAXY';
  }

  function resetUniverse() {
    initParticles(); shockwaves.length = 0; handTrail.length = 0; meteors.length = 0;
    pointer.gesture = 'idle'; shake = 0; smoothScale = 1;
    leaveFormationMode(); deactivateIdle(true); logoHoldTriggered = false; twoHandsHeld = 0;
    showToast('Kembali ke Nebula Galaxy');
  }

  function showToast(msg) {
    toast.textContent = msg; toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  function setGesture(name, text, helper) {
    pointer.gesture = name;
    gestureText.textContent = text;
    hint.textContent = helper;
    document.querySelectorAll('.legend > div').forEach(el => el.classList.toggle('active', el.dataset.gesture === name));
  }

  function drawBackground() {
    const sx = shake ? (Math.random()-.5)*shake : 0;
    const sy = shake ? (Math.random()-.5)*shake : 0;
    if (shake > .12) shake *= .9; else shake = 0;
    ctx.setTransform(DPR,0,0,DPR,sx*DPR,sy*DPR);

    const base = ctx.createRadialGradient(W*.5,H*.48,0,W*.5,H*.5,Math.max(W,H)*.72);
    base.addColorStop(0,'#10173b');
    base.addColorStop(.35,'#080d25');
    base.addColorStop(.68,'#040713');
    base.addColorStop(1,'#010208');
    ctx.fillStyle = base; ctx.fillRect(-20,-20,W+40,H+40);

    const nebulae = [
      [W*.30+Math.sin(t*.17)*90,H*.43+Math.cos(t*.13)*35, Math.min(W,H)*.52,'rgba(107,71,255,.10)'],
      [W*.68+Math.cos(t*.14)*70,H*.36+Math.sin(t*.11)*46, Math.min(W,H)*.45,'rgba(46,190,255,.075)'],
      [W*.54+Math.sin(t*.09)*40,H*.66+Math.cos(t*.12)*38, Math.min(W,H)*.40,'rgba(255,75,181,.045)']
    ];
    nebulae.forEach(([x,y,r,c]) => {
      const g=ctx.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,c); g.addColorStop(.46,c.replace(/\.(\d+)\)/,'.025)')); g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g; ctx.fillRect(x-r,y-r,r*2,r*2);
    });

    ctx.save(); ctx.globalCompositeOperation='screen';
    farStars.forEach(s => {
      const a = s.a*(.72+Math.sin(t*s.speed+s.tw)*.28);
      ctx.fillStyle=`rgba(195,214,255,${a})`;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
    });
    ctx.restore();

    if (Math.random() < .008 && meteors.length < 2) {
      meteors.push({x:Math.random()*W*.75,y:-30,vx:7+Math.random()*4,vy:4+Math.random()*2,life:1});
    }
    ctx.save(); ctx.globalCompositeOperation='screen';
    meteors = meteors.filter(m => m.life > 0);
    meteors.forEach(m => {
      m.x+=m.vx; m.y+=m.vy; m.life-=.009;
      const grad=ctx.createLinearGradient(m.x,m.y,m.x-m.vx*10,m.y-m.vy*10);
      grad.addColorStop(0,`rgba(220,240,255,${m.life*.75})`); grad.addColorStop(1,'rgba(80,160,255,0)');
      ctx.strokeStyle=grad; ctx.lineWidth=1.3; ctx.beginPath(); ctx.moveTo(m.x,m.y); ctx.lineTo(m.x-m.vx*12,m.y-m.vy*12); ctx.stroke();
    });
    ctx.restore();
  }

  function drawCore(cx,cy) {
    ctx.save(); ctx.globalCompositeOperation='screen';
    const halo=ctx.createRadialGradient(cx,cy,0,cx,cy,110+Math.sin(t*1.4)*8);
    halo.addColorStop(0,'rgba(255,255,255,.95)');
    halo.addColorStop(.035,'rgba(114,225,255,.72)');
    halo.addColorStop(.10,'rgba(125,91,255,.32)');
    halo.addColorStop(.38,'rgba(103,79,255,.08)');
    halo.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=halo; ctx.fillRect(cx-130,cy-130,260,260);
    ctx.strokeStyle='rgba(135,175,255,.12)';
    ctx.lineWidth=1;
    for(let i=0;i<3;i++){
      ctx.beginPath();
      ctx.ellipse(cx,cy,65+i*20,23+i*8,t*.04+i*.5,0,Math.PI*2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawShockwaves() {
    ctx.save(); ctx.globalCompositeOperation='screen';
    shockwaves = shockwaves.filter(w => w.life > 0);
    shockwaves.forEach(w => {
      w.r += w.speed; w.life -= .022;
      ctx.strokeStyle=`rgba(${w.color},${w.life*.55})`;
      ctx.lineWidth=1.5 + w.life*3;
      ctx.beginPath(); ctx.arc(w.x,w.y,w.r,0,Math.PI*2); ctx.stroke();
      const g=ctx.createRadialGradient(w.x,w.y,Math.max(0,w.r-18),w.x,w.y,w.r+20);
      g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(.5,`rgba(${w.color},${w.life*.08})`); g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g; ctx.fillRect(w.x-w.r-22,w.y-w.r-22,(w.r+22)*2,(w.r+22)*2);
    });
    ctx.restore();
  }

  function drawHandEffects() {
    if (!pointer.active) return;
    handTrail.push({x:pointer.x,y:pointer.y,life:1});
    if (handTrail.length>24) handTrail.shift();

    ctx.save(); ctx.globalCompositeOperation='screen';
    for(let i=1;i<handTrail.length;i++){
      const a=handTrail[i-1], b=handTrail[i];
      a.life*=.91;
      ctx.strokeStyle=`rgba(102,205,255,${a.life*.14})`;
      ctx.lineWidth=1+a.life*2;
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    }

    let rad = pointer.pinch ? 120 : pointer.fist ? 78 : 96;
    const g=ctx.createRadialGradient(pointer.x,pointer.y,0,pointer.x,pointer.y,rad);
    if(pointer.pinch){ g.addColorStop(0,'rgba(82,223,255,.30)'); g.addColorStop(.28,'rgba(95,112,255,.12)'); }
    else if(pointer.fist){ g.addColorStop(0,'rgba(255,120,213,.25)'); g.addColorStop(.28,'rgba(139,87,255,.10)'); }
    else { g.addColorStop(0,'rgba(145,112,255,.24)'); g.addColorStop(.32,'rgba(67,203,255,.08)'); }
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g; ctx.fillRect(pointer.x-rad,pointer.y-rad,rad*2,rad*2);

    const pulse = 28 + Math.sin(t*8)*6;
    ctx.strokeStyle = pointer.pinch ? 'rgba(92,228,255,.48)' : 'rgba(151,124,255,.42)';
    ctx.lineWidth=1.2; ctx.beginPath(); ctx.arc(pointer.x,pointer.y,pulse,0,Math.PI*2); ctx.stroke();

    if(pointer.pinch){
      for(let k=0;k<3;k++){
        ctx.beginPath(); ctx.arc(pointer.x,pointer.y,43+k*18,(t*2+k)*.9,(t*2+k)*.9+Math.PI*.82); ctx.stroke();
      }
    }

    if(pointer.twoHands){
      const mx=(pointer.x+pointer.secondX)/2, my=(pointer.y+pointer.secondY)/2;
      const d=Math.hypot(pointer.secondX-pointer.x,pointer.secondY-pointer.y);
      const r=Math.max(36,d*.28);
      const pg=ctx.createRadialGradient(mx,my,r*.1,mx,my,r*1.7);
      pg.addColorStop(0,'rgba(255,255,255,.10)'); pg.addColorStop(.25,'rgba(85,225,255,.16)'); pg.addColorStop(.55,'rgba(133,87,255,.12)'); pg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=pg; ctx.fillRect(mx-r*2,my-r*2,r*4,r*4);
      ctx.strokeStyle='rgba(104,224,255,.52)'; ctx.lineWidth=1.7;
      ctx.beginPath(); ctx.ellipse(mx,my,r*1.35,r*.45,t*.24,0,Math.PI*2); ctx.stroke();
      ctx.strokeStyle='rgba(166,111,255,.38)';
      ctx.beginPath(); ctx.ellipse(mx,my,r*.92,r*.30,-t*.31,0,Math.PI*2); ctx.stroke();
      ctx.strokeStyle='rgba(158,181,255,.16)'; ctx.beginPath(); ctx.moveTo(pointer.x,pointer.y); ctx.lineTo(pointer.secondX,pointer.secondY); ctx.stroke();
    }
    ctx.restore();
  }

  function baseModeLabel(){
    if (idleActive) return 'ATTRACTION MODE';
    if (currentFormationType === 'shape') return 'SHAPE MORPH';
    if (currentFormationType === 'name') return 'NAME CONSTELLATION';
    if (currentFormationType === 'custom') return currentFormationKicker || 'CUSTOM UNIVERSE';
    return 'NEBULA GALAXY';
  }

  function simulate() {
    const now = performance.now();
    const dt = Math.min(34, now - lastFrameTime);
    lastFrameTime = now;
    t += .011;
    updateIdleMode(now);
    updateTwoHandHold(dt);
    drawBackground();

    const cx = W*.5 + (pointer.active ? (pointer.x-W*.5)*.028 : Math.sin(t*.2)*6);
    const cy = H*.5 + (pointer.active ? (pointer.y-H*.5)*.018 : Math.cos(t*.18)*5);
    const targetScale = pointer.twoHands ? Math.max(.68, Math.min(1.82,pointer.spread)) : 1;
    smoothScale += (targetScale-smoothScale)*.06;

    drawCore(cx,cy);
    ctx.save(); ctx.globalCompositeOperation='lighter';

    let nearLines=0;
    for(let i=0;i<particles.length;i++){
      const p=particles[i]; p.px=p.x; p.py=p.y;
      const orbit=t*(.032+p.depth*.021);
      const a=p.angle+orbit;
      const r=p.radius*smoothScale;
      const flatten=.60;
      const arm=Math.sin(a*2.7+r*.016+p.phase)*(14+r*.045);
      const tiltX = pointer.active ? (pointer.x-W*.5)*.018*p.depth : 0;
      const tiltY = pointer.active ? (pointer.y-H*.5)*.012*p.depth : 0;

      if(textMode && i < targetPoints.length){
        const nt=targetPoints[i];
        const breathe=1 + Math.sin(t*.82+nt.phase)*.006;
        p.bx = W*.5 + (nt.x-W*.5)*smoothScale*breathe + tiltX*.35;
        p.by = H*.48 + (nt.y-H*.48)*smoothScale*breathe + tiltY*.35;
      } else {
        p.bx=cx+Math.cos(a)*r+Math.cos(a+Math.PI/2)*arm+tiltX;
        p.by=cy+Math.sin(a)*r*flatten+Math.sin(a+Math.PI/2)*arm*.43+tiltY;
      }

      const spring = textMode && i < targetPoints.length ? .0085 : .0027;
      let fx=(p.bx-p.x)*spring, fy=(p.by-p.y)*spring;
      if(pointer.active){
        const dx=pointer.x-p.x, dy=pointer.y-p.y;
        const d=Math.sqrt(dx*dx+dy*dy)+.001;
        const radius=Math.min(W,H)*.40;
        if(d<radius){
          const fall=1-d/radius;
          if(pointer.open){
            const pull=.18*fall*fall; fx+=dx/d*pull; fy+=dy/d*pull;
            if(d<150 && nearLines<24 && p.alpha>.58){
              ctx.strokeStyle=`rgba(${p.color[0]},${p.color[1]},${p.color[2]},${fall*.075})`;
              ctx.lineWidth=.7; ctx.beginPath(); ctx.moveTo(pointer.x,pointer.y); ctx.lineTo(p.x,p.y); ctx.stroke(); nearLines++;
            }
          } else if(pointer.pinch){
            const pull=.15*fall; fx+=dx/d*pull; fy+=dy/d*pull;
            const swirl=.55*fall; fx+=-dy/d*swirl; fy+=dx/d*swirl;
          }
        }
      }

      p.vx=(p.vx+fx)*.971; p.vy=(p.vy+fy)*.971;
      p.x+=p.vx; p.y+=p.vy;

      const speed=Math.hypot(p.vx,p.vy);
      const tw=.70+Math.sin(t*3+p.phase)*.30;
      const alpha=p.alpha*tw;
      const [rr,gg,bb]=p.color;

      if(speed>.55){
        ctx.strokeStyle=`rgba(${rr},${gg},${bb},${Math.min(.20,alpha*.16)})`;
        ctx.lineWidth=Math.max(.35,p.size*.55);
        ctx.beginPath(); ctx.moveTo(p.px,p.py); ctx.lineTo(p.x,p.y); ctx.stroke();
      }

      ctx.fillStyle=`rgba(${rr},${gg},${bb},${Math.min(.96,alpha)})`;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size*Math.min(2,1+speed*.18),0,Math.PI*2); ctx.fill();

      if((p.size>1.45 && alpha>.55) || p.sparkle){
        ctx.fillStyle=`rgba(${rr},${gg},${bb},${alpha*.095})`;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.size*5.2,0,Math.PI*2); ctx.fill();
        if(p.sparkle && alpha>.7){
          ctx.strokeStyle=`rgba(${rr},${gg},${bb},${alpha*.24})`; ctx.lineWidth=.6;
          ctx.beginPath(); ctx.moveTo(p.x-5,p.y); ctx.lineTo(p.x+5,p.y); ctx.moveTo(p.x,p.y-5); ctx.lineTo(p.x,p.y+5); ctx.stroke();
        }
      }
    }
    ctx.restore();

    drawShockwaves(); drawHandEffects();

    const targetEnergy = pointer.twoHands ? 92 : pointer.fist ? 100 : pointer.pinch ? 82 : pointer.open ? 62 : pointer.active ? 36 : 8;
    energyLevel += (targetEnergy-energyLevel)*.085;
    energyFill.style.width=`${energyLevel.toFixed(0)}%`;
    energyValue.textContent=`${energyLevel.toFixed(0)}%`;

    if(pointer.twoHands) modeText.textContent = `${baseModeLabel()} • REVEAL`;
    else if(pointer.pinch) modeText.textContent = `${baseModeLabel()} • VORTEX`;
    else if(pointer.fist) modeText.textContent = `${baseModeLabel()} • BURST`;
    else modeText.textContent = baseModeLabel();

    requestAnimationFrame(simulate);
  }

  function explode(x,y,power=9.5){
    const now=performance.now(); if(now-lastExplosion<700) return; lastExplosion=now;
    particles.forEach(p=>{
      const dx=p.x-x,dy=p.y-y,d=Math.sqrt(dx*dx+dy*dy)+4;
      if(d<Math.min(W,H)*.58){
        const f=power*Math.pow(1-d/(Math.min(W,H)*.58),1.35);
        p.vx+=dx/d*f; p.vy+=dy/d*f;
      }
    });
    shockwaves.push({x,y,r:8,speed:11,life:1,color:'131,102,255'});
    shockwaves.push({x,y,r:3,speed:7,life:.85,color:'90,223,255'});
    shake=12;
    flash.style.setProperty('--fx',`${(x/W)*100}%`); flash.style.setProperty('--fy',`${(y/H)*100}%`);
    flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');
  }

  function dist(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }
  function fingerExtended(lm,tip,pip,mcp){ return dist(lm[tip],lm[0])>dist(lm[pip],lm[0])*1.08 && dist(lm[tip],lm[mcp])>dist(lm[pip],lm[mcp]); }
  function classifyGesture(lm){
    const index=fingerExtended(lm,8,6,5), middle=fingerExtended(lm,12,10,9), ring=fingerExtended(lm,16,14,13), pinky=fingerExtended(lm,20,18,17);
    const thumbOpen=dist(lm[4],lm[5])>dist(lm[3],lm[5])*1.14;
    const pinch=dist(lm[4],lm[8])<.055;
    const openCount=[index,middle,ring,pinky,thumbOpen].filter(Boolean).length;
    if(pinch) return 'pinch'; if(openCount>=4) return 'open'; if(openCount<=1) return 'fist'; return 'neutral';
  }

  function onResults(results){
    overlayCtx.clearRect(0,0,cameraOverlay.width/DPR,cameraOverlay.height/DPR);
    const list=results.multiHandLandmarks||[];
    pointer.twoHands=list.length>=2;
    if(!list.length){
      pointer.active=false; pointer.open=pointer.pinch=pointer.fist=false;
      statusDot.classList.remove('ok'); setGesture('idle','MENCARI TANGAN...','✋ Buka telapak tangan di depan kamera');
      if(cameraVisible) drawCameraOverlay(list);
      return;
    }

    markInteraction();
    statusDot.classList.add('ok');
    const lm=list[0], palm=lm[9];
    const x=(1-palm.x)*W, y=palm.y*H;
    pointer.vx=x-pointer.lastX; pointer.vy=y-pointer.lastY; pointer.lastX=x; pointer.lastY=y;
    pointer.x+=(x-pointer.x)*.42; pointer.y+=(y-pointer.y)*.42; pointer.active=true;

    const gesture=classifyGesture(lm);
    pointer.open=gesture==='open'; pointer.pinch=gesture==='pinch'; pointer.fist=gesture==='fist';

    if(pointer.twoHands){
      const a=list[0][9], b=list[1][9];
      const d=Math.hypot(a.x-b.x,a.y-b.y);
      pointer.spread=.62+d*2.45;
      pointer.secondX+=( (1-b.x)*W-pointer.secondX)*.42;
      pointer.secondY+=( b.y*H-pointer.secondY)*.42;
      setGesture('two','WORMHOLE / LOGO REVEAL','👐 Tahan dua tangan ±2 detik untuk memunculkan logo');
    } else if(gesture==='open') setGesture('open','GRAVITY PALM','✋ Gerakkan telapak — bintang akan mengikutimu');
    else if(gesture==='pinch') setGesture('pinch','GRAVITY VORTEX','🤏 Cubit ibu jari + telunjuk untuk memutar semesta');
    else if(gesture==='fist'){ setGesture('fist','SUPERNOVA BURST','✊ Kepalkan tangan untuk meledakkan galaksi'); explode(pointer.x,pointer.y); }
    else setGesture('neutral','HAND DETECTED','Gerakkan tanganmu dan coba gesture lainnya');

    if(cameraVisible) drawCameraOverlay(list);
  }

  function updateTwoHandHold(dt){
    if (!running || idleActive) { twoHandsHeld = 0; holdRing.classList.add('hidden'); return; }
    if (pointer.twoHands && pointer.active) {
      twoHandsHeld += dt;
      const progress = Math.min(1, twoHandsHeld / 1800);
      holdProgress.style.setProperty('--p', `${progress*360}deg`);
      holdRing.classList.remove('hidden');
      if (progress >= 1 && !logoHoldTriggered) {
        logoHoldTriggered = true;
        buildShapeTargets('logo');
        showToast('Logo Informatika muncul');
        explode((pointer.x + pointer.secondX) * .5, (pointer.y + pointer.secondY) * .5, 8.5);
      }
    } else {
      twoHandsHeld = 0;
      logoHoldTriggered = false;
      holdRing.classList.add('hidden');
    }
  }

  function drawCameraOverlay(handsList){
    const w=cameraWrap.clientWidth,h=cameraWrap.clientHeight;
    overlayCtx.clearRect(0,0,w,h); overlayCtx.save();
    overlayCtx.strokeStyle='rgba(97,230,255,.88)'; overlayCtx.fillStyle='rgba(158,114,255,.98)'; overlayCtx.lineWidth=1.25;
    const links=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
    handsList.forEach(lm=>{
      links.forEach(([a,b])=>{ overlayCtx.beginPath(); overlayCtx.moveTo((1-lm[a].x)*w,lm[a].y*h); overlayCtx.lineTo((1-lm[b].x)*w,lm[b].y*h); overlayCtx.stroke(); });
      lm.forEach((p,i)=>{ overlayCtx.beginPath(); overlayCtx.arc((1-p.x)*w,p.y*h,i===9?3.2:2.1,0,Math.PI*2); overlayCtx.fill(); });
    });
    overlayCtx.restore();
  }

  async function initHands(){
    if(!window.Hands||!window.Camera) throw new Error('MediaPipe gagal dimuat. Periksa koneksi internet.');
    hands=new Hands({locateFile:file=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
    hands.setOptions({maxNumHands:2,modelComplexity:0,minDetectionConfidence:.62,minTrackingConfidence:.56,selfieMode:true});
    hands.onResults(onResults);
    camera=new Camera(cameraEl,{onFrame:async()=>{
      if(!running||cameraEl.readyState<2) return;
      if(cameraEl.currentTime===lastVideoTime) return;
      lastVideoTime=cameraEl.currentTime; await hands.send({image:cameraEl});
    },width:640,height:480});
    await camera.start(); mouseMode=false;
  }

  async function startExperience(){
    loading.classList.remove('hidden');
    try{
      running=true;
      await initHands();
      hero.classList.add('exit'); hud.classList.remove('hidden'); legend.classList.remove('hidden'); energy.classList.remove('hidden');
      setTimeout(()=>hero.classList.add('hidden'),650);
      showToast('Kamera aktif — angkat tanganmu');
    }catch(err){
      console.error(err); running=true; mouseMode=true;
      hero.classList.add('exit'); hud.classList.remove('hidden'); legend.classList.remove('hidden'); energy.classList.remove('hidden');
      setTimeout(()=>hero.classList.add('hidden'),650);
      statusDot.classList.remove('ok'); setGesture('mouse','MODE MOUSE','Kamera tidak tersedia. Gerakkan mouse • klik untuk supernova.');
      showToast(err?.message||'Kamera tidak bisa diaktifkan');
    }finally{ loading.classList.add('hidden'); }
  }

  function saveCapture(){
    try {
      const out = document.createElement('canvas');
      out.width = Math.round(W * 1.2);
      out.height = Math.round(H * 1.2);
      const ox = out.getContext('2d');
      ox.drawImage(canvas, 0, 0, out.width, out.height);
      ox.fillStyle = 'rgba(6,10,23,.78)';
      ox.fillRect(36, 28, 420, 110);
      ox.strokeStyle = 'rgba(116,218,255,.28)';
      ox.strokeRect(36.5, 28.5, 420, 110);
      ox.fillStyle = '#ffffff';
      ox.font = '700 26px Arial';
      ox.fillText('SEMESTA GERAK', 62, 68);
      ox.fillStyle = '#8adfff';
      ox.font = '700 13px Arial';
      const line = currentFormationLabel || 'NEBULA GALAXY';
      ox.fillText(line, 62, 98);
      ox.fillStyle = 'rgba(217,225,255,.92)';
      ox.font = '500 12px Arial';
      ox.fillText('Gesture Universe • dibuat di browser', 62, 122);
      const a = document.createElement('a');
      const safe = (currentFormationLabel || 'semesta-gerak').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
      a.href = out.toDataURL('image/png');
      a.download = `${safe || 'semesta-gerak'}-${Date.now()}.png`;
      a.click();
      showToast('Capture berhasil disimpan');
    } catch (e) {
      console.error(e);
      showToast('Capture gagal dibuat');
    }
  }

  function deactivateIdle(silent = false){
    if (!idleActive) return;
    idleActive = false;
    idleBadge.classList.add('hidden');
    if (currentFormationType === 'idle') leaveFormationMode();
    if (!silent) {
      hint.textContent = '✋ Buka telapak tangan di depan kamera';
      setGesture('idle','HAND TRACKING SIAP','✋ Buka telapak tangan di depan kamera');
    }
  }

  function activateIdle(){
    idleActive = true;
    idleStep = 0;
    idleStepAt = performance.now();
    idleBadge.classList.remove('hidden');
    currentFormationType = 'idle';
    nextIdleScene();
  }

  function nextIdleScene(){
    const step = idleStep % 4;
    if (step === 0) {
      leaveFormationMode();
      currentFormationType = 'idle';
      hint.textContent = '🎬 Dekatkan tanganmu untuk memulai';
      showBadge('ATTRACTION', 'NEBULA GALAXY');
    } else if (step === 1) {
      buildFromCanvas((ox, ow, oh) => {
        ox.textAlign='center'; ox.textBaseline='middle';
        ox.font='900 180px Arial, Helvetica, sans-serif';
        ox.fillText('DEKATKAN', ow/2, oh/2-40);
        ox.font='900 168px Arial, Helvetica, sans-serif';
        ox.fillText('TANGANMU', ow/2, oh/2+120);
      }, { width: 1400, height: 620, step: 5, focusY: .48 });
      textMode = true; currentFormationType = 'idle';
      showBadge('ATTRACTION', 'DEKATKAN TANGANMU');
      hint.textContent = '🎬 Dekatkan tanganmu untuk mengendalikan partikel';
    } else if (step === 2) {
      buildShapeTargets('logo', true);
      currentFormationType = 'idle';
      showBadge('ATTRACTION', 'LOGO INFORMATIKA');
      hint.textContent = '🎬 Tahan dua tangan untuk memunculkan logo';
    } else {
      buildFromCanvas((ox, ow, oh) => {
        ox.textAlign='center'; ox.textBaseline='middle';
        ox.font='900 210px Arial, Helvetica, sans-serif';
        ox.fillText('SEMESTA', ow/2, oh/2-10);
        ox.font='900 200px Arial, Helvetica, sans-serif';
        ox.fillText('GERAK', ow/2, oh/2+170);
      }, { width: 1400, height: 620, step: 5, focusY: .48 });
      textMode = true; currentFormationType = 'idle';
      showBadge('ATTRACTION', 'SEMESTA GERAK');
      hint.textContent = '🎬 Gerakkan tanganmu. Bentuk semestamu.';
    }
    idleStep += 1;
  }

  function updateIdleMode(now){
    if (!running || !hero.classList.contains('hidden')) return;
    const noPanels = namePanel.classList.contains('hidden') && shapePanel.classList.contains('hidden');
    const noInput = (!pointer.active || now - lastPresence > 1400) && noPanels;
    if (!idleActive && noInput && now - lastInteraction > 9000) activateIdle();
    if (idleActive && now - idleStepAt > 3800) { idleStepAt = now; nextIdleScene(); }
  }

  customShapeForm.addEventListener('submit', event => {
    event.preventDefault();
    if (buildCustomShape(customShapeInput.value)) {
      closeShapePanel();
      showToast('Bentuk custom berhasil dibuat');
    } else {
      showToast('Masukkan teks atau emoji');
    }
  });

  uploadShapeBtn.addEventListener('click', () => shapeFileInput.click());
  shapeFileInput.addEventListener('change', () => {
    const file = shapeFileInput.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const ok = buildImageShape(img, file.name.replace(/\.[^.]+$/, ''));
      URL.revokeObjectURL(url);
      shapeFileInput.value = '';
      if (ok) {
        closeShapePanel();
        showToast('Gambar berubah menjadi partikel');
      } else {
        showToast('Gambar tidak dapat dibaca');
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      shapeFileInput.value = '';
      showToast('File gambar tidak bisa dibuka');
    };
    img.src = url;
  });

  drawShapeBtn.addEventListener('click', () => {
    resetDrawCanvas();
    drawZone.classList.remove('hidden');
  });
  clearDrawBtn.addEventListener('click', resetDrawCanvas);
  cancelDrawBtn.addEventListener('click', () => drawZone.classList.add('hidden'));
  useDrawBtn.addEventListener('click', () => {
    if (useDrawingAsShape()) {
      drawZone.classList.add('hidden');
      closeShapePanel();
      showToast('Gambarmu berubah menjadi partikel');
    }
  });

  drawCanvas.addEventListener('pointerdown', event => {
    drawing = true;
    drawCanvas.setPointerCapture(event.pointerId);
    const p = drawPosition(event);
    drawCtx.beginPath();
    drawCtx.moveTo(p.x, p.y);
  });
  drawCanvas.addEventListener('pointermove', event => {
    if (!drawing) return;
    const p = drawPosition(event);
    drawCtx.lineTo(p.x, p.y);
    drawCtx.stroke();
  });
  drawCanvas.addEventListener('pointerup', stopDrawing);
  drawCanvas.addEventListener('pointercancel', stopDrawing);
  resetDrawCanvas();

  nameBtn.addEventListener('click',()=>{ markInteraction(); openNamePanel(); });
  shapeBtn.addEventListener('click',()=>{ markInteraction(); openShapePanel(); });
  captureBtn.addEventListener('click',()=>{ markInteraction(); saveCapture(); });
  nameCancel.addEventListener('click',closeNamePanel);
  shapeClose.addEventListener('click',closeShapePanel);
  namePanel.addEventListener('pointerdown',e=>{ if(e.target===namePanel) closeNamePanel(); });
  shapePanel.addEventListener('pointerdown',e=>{ if(e.target===shapePanel) closeShapePanel(); });
  nameForm.addEventListener('submit',e=>{
    e.preventDefault();
    if(buildNameTargets(nameInput.value)){
      closeNamePanel();
      showToast(`Konstelasi ${currentName} terbentuk`);
    } else { showToast('Masukkan nama terlebih dahulu'); }
  });
  shapeGrid.addEventListener('click', e => {
    const btn = e.target.closest('button[data-shape]');
    if (!btn) return;
    if (buildShapeTargets(btn.dataset.shape)) {
      closeShapePanel();
      showToast(`${shapeLabel(btn.dataset.shape)} terbentuk`);
    }
  });
  cameraBtn.addEventListener('click',()=>{ cameraVisible=!cameraVisible; cameraWrap.classList.toggle('hidden',!cameraVisible); });
  fullscreenBtn.addEventListener('click',async()=>{ try{ if(!document.fullscreenElement) await document.documentElement.requestFullscreen(); else await document.exitFullscreen(); }catch(_){} });
  resetBtn.addEventListener('click',()=>{ markInteraction(); resetUniverse(); });
  startBtn.addEventListener('click',startExperience);

  addEventListener('pointermove',e=>{
    if(!mouseMode&&!hero.classList.contains('hidden')) return;
    if(mouseMode){
      markInteraction();
      pointer.active=true; pointer.open=true; pointer.pinch=pointer.fist=false; pointer.twoHands=false;
      pointer.x+=(e.clientX-pointer.x)*.5; pointer.y+=(e.clientY-pointer.y)*.5;
      if(running) setGesture('open','MODE MOUSE','Gerakkan mouse • klik untuk supernova');
    }
  },{passive:true});
  addEventListener('pointerdown',e=>{ if(mouseMode&&running){ markInteraction(); explode(e.clientX,e.clientY,10.5); } });
  addEventListener('keydown',e=>{
    if(!namePanel.classList.contains('hidden')){ if(e.key==='Escape') closeNamePanel(); return; }
    if(!shapePanel.classList.contains('hidden')){ if(e.key==='Escape') closeShapePanel(); return; }
    const k=e.key.toLowerCase();
    if(k==='f') fullscreenBtn.click();
    if(k==='r') resetBtn.click();
    if(k==='c') cameraBtn.click();
    if(k==='n') nameBtn.click();
    if(k==='b') shapeBtn.click();
    if(k==='s') captureBtn.click();
  });
  addEventListener('resize',resize);

  resize();
  requestAnimationFrame(simulate);
})();
