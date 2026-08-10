const SHAPES = [
  { id: "circle", label: "⚪", cls: "shape-circle" },
  { id: "square", label: "◼️", cls: "shape-square" },
  { id: "triangle", label: "🔺", cls: "shape-triangle" },
  { id: "heart", label: "❤️", cls: "shape-heart" },
  { id: "octagon", label: "🛑", cls: "shape-octagon" },
];

// Mandatory roster — must always appear at least once among the visible
// bubbles whenever there's room. Reassigned fresh on every board rebuild
// (size/frame/shape change), and overlaid on top of whatever bubble shape
// and color are currently active rather than replacing them.
const ANIMALS = [
  { id: "panda", emoji: "🐼" },
  { id: "rabbit", emoji: "🐰" },
  { id: "chicken", emoji: "🐔" },
  { id: "horse", emoji: "🐴" },
  { id: "frog", emoji: "🐸" },
  { id: "cow", emoji: "🐮" },
  { id: "lion", emoji: "🦁" },
  { id: "owl", emoji: "🦉" },
  { id: "duck", emoji: "🦆" },
  { id: "dog", emoji: "🐶" },
  { id: "cat", emoji: "🐱" },
  { id: "octopus", emoji: "🐙" },
];

// Extra variety used to fill boards larger than the 12 mandatory animals,
// so duplicates only start repeating after ALL of these are used too.
const EXTRA_ANIMALS = [
  { id: "tiger", emoji: "🐯" },
  { id: "koala", emoji: "🐨" },
  { id: "monkey", emoji: "🐵" },
  { id: "fox", emoji: "🦊" },
  { id: "pig", emoji: "🐷" },
  { id: "mouse", emoji: "🐭" },
  { id: "hamster", emoji: "🐹" },
  { id: "turtle", emoji: "🐢" },
  { id: "penguin", emoji: "🐧" },
  { id: "giraffe", emoji: "🦒" },
  { id: "elephant", emoji: "🐘" },
  { id: "zebra", emoji: "🦓" },
  { id: "hedgehog", emoji: "🦔" },
  { id: "squirrel", emoji: "🐿️" },
  { id: "bat", emoji: "🦇" },
  { id: "bee", emoji: "🐝" },
  { id: "butterfly", emoji: "🦋" },
  { id: "whale", emoji: "🐳" },
  { id: "shark", emoji: "🦈" },
  { id: "wolf", emoji: "🐺" },
  { id: "deer", emoji: "🦌" },
  { id: "crocodile", emoji: "🐊" },
  { id: "kangaroo", emoji: "🦘" },
  { id: "camel", emoji: "🐫" },
];

const ANIMAL_ROSTER = ANIMALS.concat(EXTRA_ANIMALS);
let animalOrder = ANIMAL_ROSTER.slice();

function shuffleArray(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const FRAMES = [
  { id: "square", label: "▢ Квадрат", cls: "frame-square" },
  { id: "circle", label: "◯ Круг", cls: "frame-circle" },
  { id: "octagon", label: "⯃ Восьмиугольник", cls: "frame-octagon" },
  { id: "heart", label: "♡ Сердце", cls: "frame-heart" },
];

const SIZES = [
  { id: "small", label: "Small 4×4", n: 4 },
  { id: "medium", label: "Medium 6×6", n: 6 },
  { id: "large", label: "Large 10×10", n: 10 },
];

const PALETTES = {
  rainbow: ["#ff5f6d", "#ff9a44", "#ffd93d", "#6bdc7b", "#3fd6c5", "#4aa8ff", "#8a6bff", "#ff6bd6"],
  pastel: ["#ff9ecf", "#ffb199", "#ffe08a", "#c8f2a9", "#9be8d8", "#9ecbff", "#c6a9f2", "#f2a9d9"],
  neon: ["#ff2ec4", "#ff6b00", "#ffe600", "#39ff14", "#00fff2", "#2e6bff", "#b026ff", "#ff0090"],
  mono: ["#3a3a4a", "#52526a", "#6a6a85", "#82829f", "#9a9ab9", "#b2b2d3", "#cacaea", "#e2e2fa"],
};

const PAINT_COLORS = [
  "#ff5f6d", "#ff9ecf", "#ffd93d", "#6bdc7b", "#3fd6c5",
  "#4aa8ff", "#8a6bff", "#ff6bd6", "#ffffff", "#3a3a4a",
];

const board = document.getElementById("board");
const popCountEl = document.getElementById("popCount");
const resetBtn = document.getElementById("resetBtn");
const musicToggle = document.getElementById("musicToggle");
const settingsToggle = document.getElementById("settingsToggle");
const shuffleAnimalsBtn = document.getElementById("shuffleAnimalsBtn");
const controls = document.getElementById("controls");
const shapeRow = document.getElementById("shapeRow");
const animalsToggle = document.getElementById("animalsToggle");
const frameRow = document.getElementById("frameRow");
const sizeRow = document.getElementById("sizeRow");
const paletteRow = document.getElementById("paletteRow");
const paintRow = document.getElementById("paintRow");
const paintToggle = document.getElementById("paintToggle");

let state = {
  shape: SHAPES[0],
  frame: FRAMES[0],
  size: SIZES[1],
  palette: "pastel",
  paintMode: false,
  paintColor: PAINT_COLORS[0],
  animalsOn: false,
};

let popCount = 0;
let bubbles = [];

/* ================= AUDIO ================= */

let audioCtx = null;
let noiseBuffer = null;
let musicOn = false;
let musicTimer = null;
let nextNoteTime = 0;
let musicStep = 0;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

// Mobile browsers (especially iOS Safari) create AudioContext in a
// "suspended" state and only let it start inside a direct user gesture, and
// only after resume() has actually settled — scheduling sound before that
// resolves gets silently dropped. This runs the given function once the
// context is guaranteed to be running.
function ensureAudioReady(run) {
  const ctx = getAudioCtx();
  if (ctx.state === "suspended") {
    ctx.resume().then(run);
  } else {
    run();
  }
}

// Standard mobile unlock trick: play a silent buffer during the very first
// touch/click anywhere on the page so the audio hardware path opens up
// before we ever need it for a pop or the music.
function unlockAudioOnce() {
  const ctx = getAudioCtx();
  if (ctx.state === "suspended") ctx.resume();
  const buffer = ctx.createBuffer(1, 1, 22050);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);
  src.start(0);
}
["touchstart", "pointerdown", "click"].forEach((evt) => {
  document.addEventListener(evt, unlockAudioOnce, { once: true, capture: true });
});

function getNoiseBuffer(ctx) {
  if (!noiseBuffer) {
    const bufferSize = ctx.sampleRate * 0.3;
    noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

// Satisfying "pop": a filtered noise click (the "thock") + a fast
// pitch-dropping sub tone (the "body") + a bright upward chirp "sparkle"
// tail, so each pop has a little addictive shimmer instead of a flat blip.
// Pitch varies slightly per bubble so a popping streak feels lively.
function playPop(index) {
  ensureAudioReady(() => firePop(index));
}

function firePop(index) {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;

  const semitoneShift = ((index % 8) - 4) * 0.6 + (Math.random() - 0.5) * 1.5;
  const pitchMul = Math.pow(2, semitoneShift / 12);

  // Noise transient (the "click/thock")
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = getNoiseBuffer(ctx);
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 1400 * pitchMul;
  bandpass.Q.value = 1.1;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.9, now + 0.004);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

  noiseSrc.connect(bandpass);
  bandpass.connect(noiseGain);
  noiseGain.connect(ctx.destination);

  // Low "body" thump with a fast pitch drop
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(260 * pitchMul, now);
  osc.frequency.exponentialRampToValueAtTime(85 * pitchMul, now + 0.07);
  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.0001, now);
  oscGain.gain.exponentialRampToValueAtTime(0.55, now + 0.006);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

  osc.connect(oscGain);
  oscGain.connect(ctx.destination);

  // Bright chirp sparkle — a quick upward sweep that decays away, giving the
  // pop a satisfying, slightly playful "twinkle" right after the thock.
  const chirp = ctx.createOscillator();
  chirp.type = "triangle";
  chirp.frequency.setValueAtTime(900 * pitchMul, now + 0.012);
  chirp.frequency.exponentialRampToValueAtTime(2200 * pitchMul, now + 0.06);
  const chirpGain = ctx.createGain();
  chirpGain.gain.setValueAtTime(0.0001, now + 0.012);
  chirpGain.gain.exponentialRampToValueAtTime(0.16, now + 0.022);
  chirpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

  chirp.connect(chirpGain);
  chirpGain.connect(ctx.destination);

  noiseSrc.start(now);
  noiseSrc.stop(now + 0.05);
  osc.start(now);
  osc.stop(now + 0.11);
  chirp.start(now + 0.012);
  chirp.stop(now + 0.11);
}

// Procedurally generated lo-fi funk style loop (bass + soft chord pad + hats),
// entirely synthesized so no external audio files are needed.
const CHORD_PROGRESSION = [
  [220.0, 261.63, 329.63], // Am
  [174.61, 220.0, 261.63], // F
  [196.0, 246.94, 293.66], // G
  [164.81, 220.0, 261.63], // Em-ish
];
const BASS_PATTERN = [1, 0, 0.7, 0, 1, 0, 0.6, 0];

function scheduleMusic() {
  const ctx = getAudioCtx();
  const beatDur = 60 / getTempo() / 2; // 8th notes

  while (nextNoteTime < ctx.currentTime + 0.2) {
    const barIndex = Math.floor(musicStep / 8) % CHORD_PROGRESSION.length;
    const chord = CHORD_PROGRESSION[barIndex];
    const stepInBar = musicStep % 8;

    // bass
    const bassAmt = BASS_PATTERN[stepInBar];
    if (bassAmt > 0) {
      const bassOsc = ctx.createOscillator();
      bassOsc.type = "triangle";
      bassOsc.frequency.value = chord[0] / 2;
      const bassGain = ctx.createGain();
      bassGain.gain.setValueAtTime(0.0001, nextNoteTime);
      bassGain.gain.exponentialRampToValueAtTime(0.18 * bassAmt, nextNoteTime + 0.01);
      bassGain.gain.exponentialRampToValueAtTime(0.0001, nextNoteTime + beatDur * 0.9);
      bassOsc.connect(bassGain);
      bassGain.connect(ctx.destination);
      bassOsc.start(nextNoteTime);
      bassOsc.stop(nextNoteTime + beatDur);
    }

    // chord pad on downbeat of each bar
    if (stepInBar === 0) {
      chord.forEach((freq) => {
        const padOsc = ctx.createOscillator();
        padOsc.type = "sine";
        padOsc.frequency.value = freq;
        const padGain = ctx.createGain();
        padGain.gain.setValueAtTime(0.0001, nextNoteTime);
        padGain.gain.exponentialRampToValueAtTime(0.05, nextNoteTime + 0.4);
        padGain.gain.exponentialRampToValueAtTime(0.0001, nextNoteTime + beatDur * 8 * 0.95);
        padOsc.connect(padGain);
        padGain.connect(ctx.destination);
        padOsc.start(nextNoteTime);
        padOsc.stop(nextNoteTime + beatDur * 8);
      });
    }

    // hi-hat tick on off-beats
    if (stepInBar % 2 === 1) {
      const hatSrc = ctx.createBufferSource();
      hatSrc.buffer = getNoiseBuffer(ctx);
      const hatFilter = ctx.createBiquadFilter();
      hatFilter.type = "highpass";
      hatFilter.frequency.value = 6000;
      const hatGain = ctx.createGain();
      hatGain.gain.setValueAtTime(0.0001, nextNoteTime);
      hatGain.gain.exponentialRampToValueAtTime(0.04, nextNoteTime + 0.002);
      hatGain.gain.exponentialRampToValueAtTime(0.0001, nextNoteTime + 0.03);
      hatSrc.connect(hatFilter);
      hatFilter.connect(hatGain);
      hatGain.connect(ctx.destination);
      hatSrc.start(nextNoteTime);
      hatSrc.stop(nextNoteTime + 0.03);
    }

    nextNoteTime += beatDur;
    musicStep++;
  }

  musicTimer = setTimeout(scheduleMusic, 100);
}

function getTempo() {
  // Speeds up gently as more bubbles get popped — energy grows with play.
  return Math.min(90 + Math.floor(popCount / 15) * 4, 130);
}

function startMusic() {
  ensureAudioReady(() => {
    nextNoteTime = audioCtx.currentTime + 0.1;
    musicStep = 0;
    scheduleMusic();
  });
}

function stopMusic() {
  clearTimeout(musicTimer);
  musicTimer = null;
}

musicToggle.addEventListener("click", () => {
  musicOn = !musicOn;
  musicToggle.classList.toggle("muted", !musicOn);
  musicToggle.textContent = musicOn ? "🎵" : "🔇";
  if (musicOn) startMusic();
  else stopMusic();
});

/* ================= FRAME-FIT GEOMETRY ================= */
// The board's frame shape is applied via CSS clip-path/border-radius on the
// board element itself. Grid cells near the edges can end up only partially
// inside that clip, rendering as ugly half-cut bubbles. Instead we test each
// bubble against the same shape (in the board's own 0..1 normalized space)
// and fully hide any bubble that isn't entirely inside it.

const OCTAGON_POLY = [
  [0.28, 0], [0.72, 0], [1, 0.28], [1, 0.72],
  [0.72, 1], [0.28, 1], [0, 0.72], [0, 0.28],
];

const HEART_PATH_D =
  "M0.5,0.9 C0.1,0.62 -0.05,0.32 0.15,0.13 C0.3,-0.02 0.48,0.05 0.5,0.22 " +
  "C0.52,0.05 0.7,-0.02 0.85,0.13 C1.05,0.32 0.9,0.62 0.5,0.9 Z";
let heartPolyCache = null;

function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function getHeartPolygon() {
  if (!heartPolyCache) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", HEART_PATH_D);
    const len = path.getTotalLength();
    const samples = 96;
    heartPolyCache = [];
    for (let i = 0; i <= samples; i++) {
      const pt = path.getPointAtLength((len * i) / samples);
      heartPolyCache.push([pt.x, pt.y]);
    }
  }
  return heartPolyCache;
}

function pointInFrame(frameId, x, y) {
  if (frameId === "circle") {
    const dx = x - 0.5;
    const dy = y - 0.5;
    return dx * dx + dy * dy <= 0.25;
  }
  if (frameId === "octagon") return pointInPolygon(x, y, OCTAGON_POLY);
  if (frameId === "heart") return pointInPolygon(x, y, getHeartPolygon());
  return true; // square frame never clips
}

function applyFrameClipping() {
  if (state.frame.id === "square") return;
  const boardRect = board.getBoundingClientRect();
  if (!boardRect.width || !boardRect.height) return;

  bubbles.forEach((btn) => {
    const r = btn.getBoundingClientRect();
    const cx = (r.left + r.width / 2 - boardRect.left) / boardRect.width;
    const cy = (r.top + r.height / 2 - boardRect.top) / boardRect.height;
    const hw = r.width / 2 / boardRect.width;
    const hh = r.height / 2 / boardRect.height;
    const samplePoints = [
      [cx, cy],
      [cx - hw, cy],
      [cx + hw, cy],
      [cx, cy - hh],
      [cx, cy + hh],
    ];
    const fits = samplePoints.every(([x, y]) => pointInFrame(state.frame.id, x, y));
    btn.classList.toggle("bubble-hidden", !fits);
  });
}

function applyAnimalFaces() {
  bubbles.forEach((btn) => {
    if (!state.animalsOn) {
      btn.classList.remove("has-animal");
      btn.textContent = "";
      btn.style.fontSize = "";
    }
  });
  if (!state.animalsOn) return;

  const visible = bubbles.filter((btn) => !btn.classList.contains("bubble-hidden"));
  if (!visible.length) return;

  // All bubbles share one fixed aspect-ratio square size, so measure it once
  // (not per-bubble mid-loop) — otherwise assigning text/font-size to earlier
  // bubbles could shift layout before later ones are measured, producing
  // mismatched sizes row to row. The bubble itself clips overflow, so we can
  // size well past 100% and let it crop cleanly to the full circle.
  const cellSize = visible[0].getBoundingClientRect().width;
  const fontSize = Math.round(cellSize * 1.15) + "px";

  visible.forEach((btn, i) => {
    btn.textContent = animalOrder[i % animalOrder.length].emoji;
    btn.classList.add("has-animal");
    btn.style.fontSize = fontSize;
  });
}

function shuffleAnimals() {
  if (!state.animalsOn) return;
  animalOrder = shuffleArray(ANIMAL_ROSTER);
  applyAnimalFaces();
}

/* ================= BOARD ================= */

function buildBoard() {
  board.innerHTML = "";
  board.className = `board ${state.frame.cls}`;
  const n = state.size.n;
  board.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
  bubbles = [];

  const palette = PALETTES[state.palette];

  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const btn = document.createElement("button");
      btn.className = `bubble up ${state.shape.cls}`;
      btn.style.background = palette[(row + col) % palette.length];
      btn.dataset.popped = "false";
      const noteIndex = row + col;

      btn.addEventListener("pointerdown", () => {
        if (state.paintMode) {
          btn.style.background = state.paintColor;
          return;
        }
        if (btn.dataset.popped === "true") return;
        btn.dataset.popped = "true";
        btn.classList.remove("up");
        btn.classList.add("down", "pressed");
        setTimeout(() => btn.classList.remove("pressed"), 90);

        playPop(noteIndex);
        popCount++;
        popCountEl.textContent = popCount;
        maybeAutoReset();
      });

      board.appendChild(btn);
      bubbles.push(btn);
    }
  }

  applyFrameClipping();
  applyAnimalFaces();
}

function resetBoard() {
  bubbles.forEach((btn) => {
    btn.dataset.popped = "false";
    btn.classList.remove("down");
    btn.classList.add("up");
  });
}

// Once every poppable bubble has been popped, return the whole board on its
// own after a short beat so the player never has to reach for the reset
// button mid-flow.
function maybeAutoReset() {
  const poppable = bubbles.filter((btn) => !btn.classList.contains("bubble-hidden"));
  const allPopped = poppable.length > 0 && poppable.every((btn) => btn.dataset.popped === "true");
  if (allPopped) {
    setTimeout(resetBoard, 550);
  }
}

/* ================= CONTROLS ================= */

function buildShapeRow() {
  shapeRow.innerHTML = "";
  SHAPES.forEach((shape) => {
    const btn = document.createElement("button");
    btn.className = "opt-btn" + (shape.id === state.shape.id ? " active" : "");
    btn.textContent = shape.label;
    btn.title = shape.id;
    btn.addEventListener("click", () => {
      state.shape = shape;
      buildBoard();
      [...shapeRow.children].forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
    });
    shapeRow.appendChild(btn);
  });

  animalsToggle.addEventListener("click", () => {
    state.animalsOn = !state.animalsOn;
    animalsToggle.classList.toggle("on", state.animalsOn);
    animalsToggle.textContent = state.animalsOn ? "🐾 Животные вкл." : "🐾 Животные выкл.";
    shuffleAnimalsBtn.classList.toggle("hidden", !state.animalsOn);
    buildBoard();
  });
}

function buildFrameRow() {
  frameRow.innerHTML = "";
  FRAMES.forEach((frame) => {
    const btn = document.createElement("button");
    btn.className = "opt-btn" + (frame.id === state.frame.id ? " active" : "");
    btn.textContent = frame.label;
    btn.addEventListener("click", () => {
      state.frame = frame;
      buildBoard();
      [...frameRow.children].forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
    });
    frameRow.appendChild(btn);
  });
}

function buildSizeRow() {
  sizeRow.innerHTML = "";
  SIZES.forEach((size) => {
    const btn = document.createElement("button");
    btn.className = "opt-btn" + (size.id === state.size.id ? " active" : "");
    btn.textContent = size.label;
    btn.addEventListener("click", () => {
      state.size = size;
      buildBoard();
      [...sizeRow.children].forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
    });
    sizeRow.appendChild(btn);
  });
}

function buildPaletteRow() {
  paletteRow.innerHTML = "";
  const labels = { rainbow: "🌈 Радуга", pastel: "🍬 Пастель", neon: "⚡ Неон", mono: "⬛ Моно" };
  Object.keys(PALETTES).forEach((key) => {
    const btn = document.createElement("button");
    btn.className = "opt-btn" + (key === state.palette ? " active" : "");
    btn.textContent = labels[key];
    btn.addEventListener("click", () => {
      state.palette = key;
      buildBoard();
      [...paletteRow.children].forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
    });
    paletteRow.appendChild(btn);
  });
}

function buildPaintRow() {
  paintRow.innerHTML = "";
  PAINT_COLORS.forEach((color) => {
    const btn = document.createElement("button");
    btn.className = "swatch-btn" + (color === state.paintColor ? " active" : "");
    btn.style.background = color;
    btn.addEventListener("click", () => {
      state.paintColor = color;
      [...paintRow.children].forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
    });
    paintRow.appendChild(btn);
  });

  paintToggle.addEventListener("click", () => {
    state.paintMode = !state.paintMode;
    paintToggle.classList.toggle("on", state.paintMode);
    paintToggle.textContent = state.paintMode ? "Кисть вкл. 🎨" : "Кисть выкл.";
  });
}

settingsToggle.addEventListener("click", () => {
  const isOpen = !controls.classList.contains("collapsed");
  controls.classList.toggle("collapsed", isOpen);
  settingsToggle.classList.toggle("open", !isOpen);
});

resetBtn.addEventListener("click", resetBoard);
shuffleAnimalsBtn.addEventListener("click", shuffleAnimals);

buildShapeRow();
buildFrameRow();
buildSizeRow();
buildPaletteRow();
buildPaintRow();
buildBoard();
