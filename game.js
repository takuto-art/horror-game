/*
  Beginner-friendly horror MVP
  - Input / Update loop / Rendering / Collision / Interaction separated
  - Human-like player sprite (drawn only with Canvas shapes)
  - Dialogue manager with typewriter effect
*/

// ------------------------------------------------------------
// 1) Basic setup
// ------------------------------------------------------------
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.addEventListener("click", () => {
  canvas.focus();
  activateAudioSystems();
});

const inventoryText = document.getElementById("inventoryText");
const objectiveText = document.getElementById("objectiveText");
const memoText = document.getElementById("memoText");
const emotionText = document.getElementById("emotionText");
const pauseAudioPanel = document.getElementById("pauseAudioPanel");
const bgmVolumeSlider = document.getElementById("bgmVolume");
const bgmVolumeValue = document.getElementById("bgmVolumeValue");
const ambientVolumeSlider = document.getElementById("ambientVolume");
const ambientVolumeValue = document.getElementById("ambientVolumeValue");
const muteAudioButton = document.getElementById("muteAudioButton");
const darknessStrengthSlider = document.getElementById("darknessStrength");
const darknessStrengthValue = document.getElementById("darknessStrengthValue");
const reduceFlashCheckbox = document.getElementById("reduceFlash");

const endingScreen = document.getElementById("endingScreen");
const endingTitle = document.getElementById("endingTitle");
const endingText = document.getElementById("endingText");
const titleScreen = document.getElementById("titleScreen");
const startGameButton = document.getElementById("startGameButton");

const WORLD = {
  width: 960,
  height: 540,
};
const darknessCanvas = document.createElement("canvas");
darknessCanvas.width = 960;
darknessCanvas.height = 540;
const darknessCtx = darknessCanvas.getContext("2d");

const INTERACT_RANGE = 28;
const PLAYER_SPRITE_W = 16;
const PLAYER_SPRITE_H = 24;
const HITBOX_INSET_X = 3;
const HITBOX_INSET_Y = 5;
// Chaser tuning: playerより少し遅めにして、理不尽にしすぎない。
const CHASER_SPRITE_W = 18;
const CHASER_SPRITE_H = 26;
const CHASER_HITBOX_INSET = 4;
const CHASER_BASE_SPEED = 138;
const CHASER_RUSH_SPEED = 160;
const CHASER_SPAWN_DELAY = 1.5;
const RESCUE_HOLD_SECONDS = 0.6;
const BLOOD_FLASH_DURATION = 0.18;
const SHAKE_DURATION = 0.25;
const SHADOW_HINT_DURATION = 0.15;
const ESCAPE_CINEMATIC_DURATION = 2.2;
const ENDROLL_DURATION = 8.5;

const ASSET_PATHS = {
  img: {
    player: "assets/img/player.png",
    portraitYuto: "assets/img/portrait_yuto.png",
    portraitMemo: "assets/img/portrait_memo.png",
  },
  bgm: {
    main: "assets/bgm/main.mp3",
  },
  sfx: {
    pickup: "assets/sfx/pickup.wav",
    door: "assets/sfx/door.wav",
    step: "assets/sfx/step.wav",
    scare: "assets/sfx/scare.wav",
    clock: "assets/sfx/clock.mp3",
    title: "assets/sfx/title.mp3",
    dissonance: "assets/sfx/dissonance.mp3",
    bird: "assets/sfx/bird.mp3",
    bite: "assets/sfx/bite.mp3",
    eat: "assets/sfx/eat.mp3",
    menaaa: "assets/sfx/menaaa.mp3",
  },
};

// ------------------------------------------------------------
// 1.5) Assets / Audio (safe fallback)
// ------------------------------------------------------------
class ImageAssets {
  constructor(pathMap) {
    this.records = {};
    for (const [key, src] of Object.entries(pathMap)) {
      const img = new Image();
      const record = { img, loaded: false, failed: false };
      img.onload = () => {
        record.loaded = true;
      };
      img.onerror = () => {
        record.failed = true;
      };
      img.src = src;
      this.records[key] = record;
    }
  }

  get(key) {
    const record = this.records[key];
    if (!record || !record.loaded) return null;
    return record.img;
  }
}

class AudioManager {
  constructor(pathConfig) {
    this.activated = false;
    this.bgmVolume = 0.5;
    this.muted = false;
    this.currentBgmKey = null;
    this.stepCooldown = 0;

    this.bgm = {};
    this.sfx = {};

    for (const [key, src] of Object.entries(pathConfig.bgm)) {
      this.bgm[key] = this.createAudioRecord(src, true);
    }
    for (const [key, src] of Object.entries(pathConfig.sfx)) {
      this.sfx[key] = this.createAudioRecord(src, false);
    }
  }

  createAudioRecord(src, loop) {
    const audio = new Audio();
    const record = { audio, available: true };

    audio.src = src;
    audio.preload = "auto";
    audio.loop = loop;
    audio.onerror = () => {
      record.available = false;
    };

    return record;
  }

  activateByUserGesture() {
    if (this.activated) return;
    this.activated = true;

    if (this.currentBgmKey) {
      this.playBGM(this.currentBgmKey);
    }
  }

  playBGM(key) {
    this.currentBgmKey = key;
    const record = this.bgm[key];
    if (!record || !record.available || !this.activated) return;

    record.audio.volume = this.muted ? 0 : this.bgmVolume;
    record.audio.play().catch(() => {});
  }

  setBGMVolume(value) {
    this.bgmVolume = value;
    if (!this.currentBgmKey) return;
    const record = this.bgm[this.currentBgmKey];
    if (!record) return;
    record.audio.volume = this.muted ? 0 : value;
  }

  setMuted(muted) {
    this.muted = muted;
    if (!this.currentBgmKey) return;
    const record = this.bgm[this.currentBgmKey];
    if (!record) return;
    record.audio.volume = muted ? 0 : this.bgmVolume;
  }

  stopBGM() {
    if (!this.currentBgmKey) return;
    const record = this.bgm[this.currentBgmKey];
    if (!record) return;
    record.audio.pause();
  }

  playSE(name) {
    const record = this.sfx[name];
    if (!record || !record.available || !this.activated || this.muted) return;

    record.audio.currentTime = 0;
    record.audio.play().catch(() => {});
  }
}

/*
  AmbientAudioManager uses WebAudio fallback ambience so the game still feels alive
  even when external audio files are missing.
*/
class AmbientAudioManager {
  constructor() {
    this.activated = false;
    this.volume = 0.35;
    this.muted = false;
    this.context = null;
    this.masterGain = null;
    this.humOsc = null;
    this.humLfo = null;
    this.humGain = null;
    this.noiseNode = null;
    this.noiseFilter = null;
    this.noiseGain = null;
    this.footstepTimer = 0;
    this.footstepInterval = 7;
    this.highTensionFootsteps = false;
  }

  activateByUserGesture() {
    if (this.activated) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      this.activated = true;
      return;
    }

    try {
      this.context = new AudioCtx();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.context.destination);

      this.setupLowHum();
      this.setupNoise();
      this.activated = true;
    } catch {
      this.activated = true;
    }
  }

  setupLowHum() {
    if (!this.context || !this.masterGain) return;
    this.humOsc = this.context.createOscillator();
    this.humOsc.type = "sine";
    this.humOsc.frequency.value = 52;

    this.humGain = this.context.createGain();
    this.humGain.gain.value = 0.02;

    this.humLfo = this.context.createOscillator();
    this.humLfo.type = "sine";
    this.humLfo.frequency.value = 0.12;
    const lfoGain = this.context.createGain();
    lfoGain.gain.value = 0.008;

    this.humLfo.connect(lfoGain);
    lfoGain.connect(this.humGain.gain);
    this.humOsc.connect(this.humGain);
    this.humGain.connect(this.masterGain);

    this.humOsc.start();
    this.humLfo.start();
  }

  setupNoise() {
    if (!this.context || !this.masterGain) return;

    const buffer = this.context.createBuffer(1, this.context.sampleRate * 2, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * 0.22;
    }

    this.noiseNode = this.context.createBufferSource();
    this.noiseNode.buffer = buffer;
    this.noiseNode.loop = true;

    this.noiseFilter = this.context.createBiquadFilter();
    this.noiseFilter.type = "bandpass";
    this.noiseFilter.frequency.value = 140;
    this.noiseFilter.Q.value = 0.7;

    this.noiseGain = this.context.createGain();
    this.noiseGain.gain.value = 0;

    this.noiseNode.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);
    this.noiseNode.start();
  }

  setVolume(v) {
    this.volume = v;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : v, this.context.currentTime);
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.masterGain && this.context) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.volume, this.context.currentTime);
    }
  }

  setHighTensionFootsteps(enabled) {
    this.highTensionFootsteps = enabled;
  }

  update(dt, mapId) {
    if (!this.activated || !this.context) return;

    if (this.context.state === "suspended") {
      this.context.resume().catch(() => {});
    }

    // Map-based ambience intensity
    if (this.humGain) {
      const baseHum = mapId === "map1" ? 0.018 : mapId === "map2" ? 0.025 : 0.03;
      this.humGain.gain.setTargetAtTime(baseHum, this.context.currentTime, 0.25);
    }

    if (this.noiseGain) {
      const noiseAmount = mapId === "map3" ? 0.022 : 0.004;
      this.noiseGain.gain.setTargetAtTime(noiseAmount, this.context.currentTime, 0.2);
      if (this.noiseFilter) {
        this.noiseFilter.frequency.setTargetAtTime(mapId === "map3" ? 240 : 140, this.context.currentTime, 0.4);
      }
    }

    // Random distant footsteps on 2F only.
    if (mapId === "map2") {
      this.footstepTimer += dt;
      const min = this.highTensionFootsteps ? 2.2 : 4.8;
      const max = this.highTensionFootsteps ? 4.2 : 8.2;
      if (this.footstepTimer >= this.footstepInterval) {
        this.playDistantStep();
        this.footstepTimer = 0;
        this.footstepInterval = min + Math.random() * (max - min);
      }
    } else {
      this.footstepTimer = 0;
    }
  }

  playDistantStep() {
    if (!this.context || !this.masterGain) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = "triangle";
    osc.frequency.value = 85 + Math.random() * 25;
    gain.gain.value = 0.0001;
    gain.gain.exponentialRampToValueAtTime(0.022, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  playNoiseHit() {
    if (!this.context || !this.masterGain) return;
    const now = this.context.currentTime;
    const buffer = this.context.createBuffer(1, this.context.sampleRate * 0.15, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = this.context.createBufferSource();
    src.buffer = buffer;
    const hp = this.context.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 900;
    const gain = this.context.createGain();
    gain.gain.value = 0.08;
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    src.connect(hp);
    hp.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.2);
  }
}

const imageAssets = new ImageAssets(ASSET_PATHS.img);
const audioManager = new AudioManager(ASSET_PATHS);
const ambientAudio = new AmbientAudioManager();
let isAudioMuted = false;

function activateAudioSystems() {
  audioManager.activateByUserGesture();
  ambientAudio.activateByUserGesture();
}

function setAudioMuted(muted) {
  isAudioMuted = muted;
  audioManager.setMuted(muted);
  ambientAudio.setMuted(muted);
  if (muteAudioButton) {
    muteAudioButton.textContent = muted ? "ミュート解除" : "音声ミュート";
    muteAudioButton.classList.toggle("is-muted", muted);
  }
}

if (bgmVolumeSlider) {
  const initialVolume = Number.parseFloat(bgmVolumeSlider.value) || 0.5;
  audioManager.setBGMVolume(initialVolume);
  if (bgmVolumeValue) {
    bgmVolumeValue.textContent = `${Math.round(initialVolume * 100)}%`;
  }

  bgmVolumeSlider.addEventListener("input", () => {
    const volume = Number.parseFloat(bgmVolumeSlider.value) || 0;
    audioManager.setBGMVolume(volume);
    if (bgmVolumeValue) {
      bgmVolumeValue.textContent = `${Math.round(volume * 100)}%`;
    }
  });
}

if (ambientVolumeSlider) {
  const initialAmbient = Number.parseFloat(ambientVolumeSlider.value) || 0.35;
  ambientAudio.setVolume(initialAmbient);
  if (ambientVolumeValue) {
    ambientVolumeValue.textContent = `${Math.round(initialAmbient * 100)}%`;
  }
  ambientVolumeSlider.addEventListener("input", () => {
    const volume = Number.parseFloat(ambientVolumeSlider.value) || 0;
    ambientAudio.setVolume(volume);
    if (ambientVolumeValue) {
      ambientVolumeValue.textContent = `${Math.round(volume * 100)}%`;
    }
  });
}

if (darknessStrengthSlider) {
  const initialDarkness = Number.parseFloat(darknessStrengthSlider.value) || 0.9;
  if (darknessStrengthValue) {
    darknessStrengthValue.textContent = initialDarkness.toFixed(2);
  }
  darknessStrengthSlider.addEventListener("input", () => {
    const value = Number.parseFloat(darknessStrengthSlider.value) || 0.9;
    if (game) {
      game.settings.darknessMultiplier = value;
    }
    if (darknessStrengthValue) {
      darknessStrengthValue.textContent = value.toFixed(2);
    }
  });
}

if (reduceFlashCheckbox) {
  reduceFlashCheckbox.addEventListener("change", () => {
    if (game) {
      game.settings.reduceFlash = reduceFlashCheckbox.checked;
    }
  });
}

if (muteAudioButton) {
  muteAudioButton.addEventListener("click", () => {
    activateAudioSystems();
    setAudioMuted(!isAudioMuted);
  });
}
setAudioMuted(false);

function playPickupSE() {
  audioManager.playSE("pickup");
}

function playDoorSE() {
  audioManager.playSE("door");
}

function playStepSE() {
  audioManager.playSE("step");
}

function playScareSE() {
  audioManager.playSE("scare");
}

function playClockSE() {
  audioManager.playSE("clock");
}

function playTitleSE() {
  audioManager.playSE("title");
}

function playDissonanceSE() {
  audioManager.playSE("dissonance");
}

function playBirdSE() {
  audioManager.playSE("bird");
}

function playBiteSE() {
  audioManager.playSE("bite");
}

function playEatSE() {
  audioManager.playSE("eat");
}

function playMenaaaSE() {
  audioManager.playSE("menaaa");
}

// ------------------------------------------------------------
// 2) Input system
// ------------------------------------------------------------
const input = {
  held: new Set(),
  justPressed: new Set(),
  move: {
    up: false,
    down: false,
    left: false,
    right: false,
  },
};

function normalizeKey(rawKey) {
  if (rawKey === " ") return "space";
  return rawKey.toLowerCase();
}

function refreshDirectionInputs() {
  input.move.up = input.held.has("w") || input.held.has("arrowup");
  input.move.down = input.held.has("s") || input.held.has("arrowdown");
  input.move.left = input.held.has("a") || input.held.has("arrowleft");
  input.move.right = input.held.has("d") || input.held.has("arrowright");
}

window.addEventListener("keydown", (event) => {
  const key = normalizeKey(event.key);
  activateAudioSystems();

  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "space"].includes(key)) {
    event.preventDefault();
  }

  if (!input.held.has(key)) {
    input.justPressed.add(key);
  }

  input.held.add(key);
  refreshDirectionInputs();
});

window.addEventListener("keyup", (event) => {
  const key = normalizeKey(event.key);
  input.held.delete(key);
  refreshDirectionInputs();
});

window.addEventListener("blur", () => {
  input.held.clear();
  input.justPressed.clear();
  refreshDirectionInputs();
});

function wasJustPressed(...keys) {
  return keys.some((k) => input.justPressed.has(k));
}

function isHeld(...keys) {
  return keys.some((k) => input.held.has(k));
}

// ------------------------------------------------------------
// 3) Dialogue system
// ------------------------------------------------------------
/*
  DialogueManager draws a dialogue box directly on the canvas.
  - Typewriter text animation
  - Space / Enter to advance
  - Optional auto advance timer
*/
class DialogueManager {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;

    this.active = false;
    this.lines = [];
    this.index = 0;

    this.charTimer = 0;
    this.charsPerSecond = 36;
    this.visibleChars = 0;

    this.autoAdvanceMs = 0;
    this.autoTimer = 0;

    this.onComplete = null;
  }

  start(lines, options = {}) {
    if (!lines || lines.length === 0) return;

    this.lines = lines;
    this.index = 0;
    this.visibleChars = 0;
    this.charTimer = 0;

    this.autoAdvanceMs = options.autoAdvanceMs ?? 0;
    this.autoTimer = 0;
    this.onComplete = options.onComplete || null;

    this.active = true;
  }

  getCurrentLine() {
    if (!this.active) return null;
    return this.lines[this.index];
  }

  isTyping() {
    const line = this.getCurrentLine();
    if (!line) return false;
    return this.visibleChars < line.text.length;
  }

  update(dt) {
    if (!this.active) return;

    const line = this.getCurrentLine();
    if (!line) {
      this.finish();
      return;
    }

    // Advance the typewriter effect.
    if (this.visibleChars < line.text.length) {
      this.charTimer += dt * this.charsPerSecond;
      const nextCount = Math.floor(this.charTimer);

      if (nextCount > this.visibleChars) {
        this.visibleChars = Math.min(nextCount, line.text.length);
      }
    }

    const wantsAdvance = wasJustPressed("space", "enter");

    if (wantsAdvance) {
      // If still typing, reveal full line immediately.
      if (this.isTyping()) {
        this.visibleChars = line.text.length;
      } else {
        this.advance();
      }
      return;
    }

    // Auto-advance is useful for short monologue beats.
    if (!this.isTyping() && this.autoAdvanceMs > 0) {
      this.autoTimer += dt * 1000;
      if (this.autoTimer >= this.autoAdvanceMs) {
        this.advance();
      }
    }
  }

  advance() {
    this.index += 1;
    this.visibleChars = 0;
    this.charTimer = 0;
    this.autoTimer = 0;

    if (this.index >= this.lines.length) {
      this.finish();
    }
  }

  finish() {
    this.active = false;
    this.lines = [];
    this.index = 0;

    if (this.onComplete) {
      const callback = this.onComplete;
      this.onComplete = null;
      callback();
    }
  }

  render() {
    if (!this.active) return;

    const line = this.getCurrentLine();
    if (!line) return;

    const boxX = 22;
    const boxY = this.height - 148;
    const boxW = this.width - 44;
    const boxH = 126;

    // Window background
    this.ctx.fillStyle = "rgba(8, 8, 12, 0.84)";
    this.roundRect(boxX, boxY, boxW, boxH, 12);
    this.ctx.fill();

    this.ctx.strokeStyle = "rgba(210, 210, 230, 0.35)";
    this.ctx.lineWidth = 2;
    this.roundRect(boxX, boxY, boxW, boxH, 12);
    this.ctx.stroke();

    // Portrait area (left side)
    const portraitX = boxX + 14;
    const portraitY = boxY + 14;
    const portraitSize = 92;

    this.ctx.fillStyle = "rgba(30, 30, 42, 0.95)";
    this.roundRect(portraitX, portraitY, portraitSize, portraitSize, 10);
    this.ctx.fill();

    this.drawPortrait(portraitX, portraitY, portraitSize, line.speaker);

    // Speaker name and text
    const textX = portraitX + portraitSize + 18;
    const textY = portraitY + 18;
    const textW = boxW - (textX - boxX) - 18;

    this.ctx.fillStyle = "#f5f5f8";
    this.ctx.font = "bold 18px sans-serif";
    this.ctx.textAlign = "left";
    this.ctx.fillText(line.speaker, textX, textY);

    const visibleText = line.text.slice(0, this.visibleChars);
    this.ctx.fillStyle = "#ececf3";
    this.ctx.font = "20px sans-serif";
    this.wrapText(visibleText, textX, textY + 28, textW, 30);

    this.ctx.fillStyle = "#b9b9c7";
    this.ctx.font = "14px sans-serif";
    this.ctx.fillText("Space/Enter: 次へ", textX, boxY + boxH - 12);
  }

  drawPortrait(x, y, size, speaker) {
    const portraitImage = speaker === "メモ"
      ? imageAssets.get("portraitMemo")
      : imageAssets.get("portraitYuto");

    if (portraitImage) {
      this.ctx.drawImage(portraitImage, x + 8, y + 8, size - 16, size - 16);
      return;
    }

    // Very simple face icon drawn with rectangles/circles.
    const cx = x + size / 2;
    const cy = y + size / 2;

    this.ctx.fillStyle = speaker === "メモ" ? "#515166" : "#3c557a";
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, 34, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = "#f0d3bb";
    this.ctx.beginPath();
    this.ctx.arc(cx, cy - 2, 22, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = "#242431";
    this.ctx.fillRect(cx - 14, cy - 16, 28, 10);

    this.ctx.fillStyle = "#111";
    this.ctx.fillRect(cx - 10, cy - 4, 4, 4);
    this.ctx.fillRect(cx + 6, cy - 4, 4, 4);
    this.ctx.fillRect(cx - 4, cy + 8, 8, 2);
  }

  wrapText(text, x, y, maxWidth, lineHeight) {
    const chars = Array.from(text);
    let line = "";
    let drawY = y;

    for (let i = 0; i < chars.length; i += 1) {
      const testLine = line + chars[i];
      const testWidth = this.ctx.measureText(testLine).width;

      if (testWidth > maxWidth && line.length > 0) {
        this.ctx.fillText(line, x, drawY);
        line = chars[i];
        drawY += lineHeight;
      } else {
        line = testLine;
      }
    }

    this.ctx.fillText(line, x, drawY);
  }

  roundRect(x, y, w, h, r) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }
}

const dialogue = new DialogueManager(ctx, WORLD.width, WORLD.height);

// ------------------------------------------------------------
// 4) Map data
// ------------------------------------------------------------
/*
  MapManager keeps multiple floors in one Canvas game.
  - map1: 1F lobby floor
  - map2: 2F guest floor
  - map3: B1 mechanical floor
*/
class MapManager {
  constructor() {
    this.maps = {};
    this.resetMaps();
    this.transition = {
      active: false,
      elapsed: 0,
      duration: 0.3,
      fromMapId: null,
      toMapId: null,
      spawnKey: "default",
      switched: false,
    };
  }

  resetMaps() {
    this.maps = {
      map1: createMap1LobbyData(),
      map2: createMap2GuestFloorData(),
      map3: createMap3BasementData(),
    };
  }

  getMap(mapId) {
    return this.maps[mapId];
  }

  startTransition(gameState, toMapId, spawnKey) {
    if (this.transition.active) return;
    this.transition.active = true;
    this.transition.elapsed = 0;
    this.transition.fromMapId = gameState.mapId;
    this.transition.toMapId = toMapId;
    this.transition.spawnKey = spawnKey || "default";
    this.transition.switched = false;
  }

  update(dt, gameState) {
    if (!this.transition.active) return;

    this.transition.elapsed += dt;
    const progress = this.transition.elapsed / this.transition.duration;

    if (!this.transition.switched && progress >= 0.5) {
      this.switchMapNow(gameState, this.transition.toMapId, this.transition.spawnKey);
      this.transition.switched = true;
    }

    if (progress >= 1) {
      this.transition.active = false;
    }
  }

  switchMapNow(gameState, toMapId, spawnKey) {
    // マップ切替時は必ず安全位置へ補正し、壁埋まりを防ぐ。
    const fromMapId = gameState.mapId;
    gameState.mapId = toMapId;
    gameState.world = this.getMap(toMapId);
    const desiredSpawn = gameState.world.spawns[spawnKey] || gameState.world.spawns.default;
    const safeSpawn = spawnSafePosition(gameState.world, desiredSpawn);
    gameState.player.x = safeSpawn.x;
    gameState.player.y = safeSpawn.y;
    gameState.safeSpot = { x: safeSpawn.x, y: safeSpawn.y };
    gameState.interaction.nearest = null;
    gameState.interaction.hold.reset();

    // 追跡者はマップをまたぐと見失う演出にする。
    if (gameState.flags.chaserAwakened && !gameState.flags.chaserGone && fromMapId !== toMapId) {
      gameState.flags.chaserGone = true;
      gameState.chaser.active = false;
      dialogue.start([
        { speaker: "悠斗", text: "……足音が消えた。" },
        { speaker: "悠斗", text: "まいたのか？ 今は、追ってこない。" },
      ], { autoAdvanceMs: 1400 });
    }
  }

  getFadeAlpha() {
    if (!this.transition.active) return 0;
    const p = Math.max(0, Math.min(1, this.transition.elapsed / this.transition.duration));
    return p < 0.5 ? p * 2 : (1 - p) * 2;
  }
}

const mapManager = new MapManager();

/*
  HoldToInteract lets players interact while moving by holding E/Space.
  - If hold reaches threshold, interaction fires once.
*/
class HoldToInteract {
  constructor(thresholdSec) {
    this.thresholdSec = thresholdSec;
    this.progressSec = 0;
    this.targetId = null;
    this.triggered = false;
  }

  reset() {
    this.progressSec = 0;
    this.targetId = null;
    this.triggered = false;
  }

  update(dt, canHold, isHolding, targetId) {
    if (!canHold || !isHolding || !targetId) {
      this.reset();
      return false;
    }

    if (this.targetId !== targetId) {
      this.progressSec = 0;
      this.triggered = false;
      this.targetId = targetId;
    }

    if (this.triggered) return false;

    this.progressSec += dt;
    if (this.progressSec >= this.thresholdSec) {
      this.triggered = true;
      return true;
    }

    return false;
  }

  getProgressRatio() {
    return Math.max(0, Math.min(1, this.progressSec / this.thresholdSec));
  }
}

/*
  Map1 (1F Lobby Floor) layout:
  - Bottom: Entrance + lobby seating
  - Mid: Front desk + back office (staff only)
  - Right/back: Elevator hall + vending + emergency exit
  - Left side: Public restroom
*/
function createMap1LobbyData() {
  const walls = [
    // 外周
    rect(0, 0, WORLD.width, 20),
    rect(0, WORLD.height - 20, WORLD.width, 20),
    rect(0, 0, 20, WORLD.height),
    rect(WORLD.width - 20, 0, 20, WORLD.height),

    // 受付エリア上壁（左右は開けて入れるようにする）
    rect(250, 120, 260, 20),

    // エレベーターホール（上・右のみ。左は開けてロビーから入れる）
    rect(620, 80, 280, 20),
    rect(880, 80, 20, 210),
  ];

  const exitDoor = {
    x: 920,
    y: 260,
    w: 18,
    h: 80,
    unlocked: false,
  };

  const interactables = [
    {
      id: "entrance",
      label: "入口",
      x: 410,
      y: 500,
      w: 140,
      h: 20,
      color: "#455366",
      blocking: false,
      interaction: [{ speaker: "悠斗", text: "入口は、いつの間にか開かない。" }],
    },
    {
      id: "lobby_sofa",
      label: "ロビー",
      x: 290,
      y: 380,
      w: 170,
      h: 50,
      color: "#49607a",
      blocking: false,
      interaction: [
        { speaker: "悠斗", text: "ソファに何かが染み込んでいる。黒い。…血、か？" },
        { speaker: "悠斗", text: "でも乾いている。ずっと前から、ここにある。" },
      ],
    },
    {
      id: "frontdesk_ledger",
      label: "受付",
      x: 270,
      y: 240,
      w: 220,
      h: 52,
      color: "#6c5a4e",
      blocking: false,
      interaction: [{ speaker: "悠斗", text: "宿泊台帳を調べる。" }],
    },
    {
      id: "back_office",
      label: "従業員用ドア",
      x: 300,
      y: 140,
      w: 160,
      h: 60,
      color: "#4d4c56",
      blocking: false,
      interaction: [
        { speaker: "悠斗", text: "ドアの隙間から紙切れが落ちている。" },
        { speaker: "悠斗", text: "『逃げるな。お前はもうチェックインしている』" },
      ],
    },
    {
      id: "public_restroom",
      label: "共用トイレ",
      x: 70,
      y: 210,
      w: 90,
      h: 80,
      color: "#5b666f",
      blocking: false,
      interaction: [
        { speaker: "悠斗", text: "鏡に文字が書いてある。口紅で。" },
        { speaker: "悠斗", text: "『まだいるの』" },
        { speaker: "悠斗", text: "…俺のことか？" },
      ],
    },
    {
      id: "elevator_to_2f",
      label: "エレベーター",
      x: 690,
      y: 110,
      w: 130,
      h: 100,
      color: "#5a5a67",
      blocking: true,
      mapChange: { toMapId: "map2", spawnKey: "fromMap1" },
      interaction: [{ speaker: "悠斗", text: "2Fへ上がる。" }],
    },
    {
      id: "service_stairs_to_b1",
      label: "従業員用ドア",
      x: 540,
      y: 130,
      w: 70,
      h: 90,
      color: "#4f5a47",
      blocking: true,
      mapChange: { toMapId: "map3", spawnKey: "fromMap1" },
      interaction: [{ speaker: "悠斗", text: "スタッフ通路の先にB1がある。" }],
    },
    {
      id: "vending",
      label: "自販機",
      x: 840,
      y: 245,
      w: 62,
      h: 100,
      color: "#3f4b66",
      blocking: false,
      interaction: [
        { speaker: "悠斗", text: "ディスプレイが死んでいる…と思ったら。" },
        { speaker: "悠斗", text: "一瞬、俺の顔が映った。" },
        { speaker: "悠斗", text: "…笑っていた。俺じゃない顔で。" },
      ],
    },
    {
      id: "emergency_exit_1f",
      label: "非常口",
      x: 900,
      y: 250,
      w: 40,
      h: 100,
      color: "#55655a",
      blocking: false,
      interaction: [{ speaker: "悠斗", text: "非常口。今はまだ開かない。" }],
    },
  ];

  return {
    id: "map1",
    name: "1F Lobby",
    walls,
    keys: [],
    exitDoor,
    interactables,
    spawns: {
      default: { x: 470, y: 450 },
      fromMap2: { x: 740, y: 300 },
      fromMap3: { x: 560, y: 300 },
    },
  };
}

/*
  Map2 (2F Guest Floor) layout:
  - One long corridor
  - Rooms 201-205 on the upper side
  - Elevator in the center
  - Linen closet near corridor end
*/
function createMap2GuestFloorData() {
  const walls = [
    // 外周
    rect(0, 0, WORLD.width, 20),
    rect(0, WORLD.height - 20, WORLD.width, 20),
    rect(0, 0, 20, WORLD.height),
    rect(WORLD.width - 20, 0, 20, WORLD.height),

    // 廊下の上壁（客室ドア位置に開口を作る）
    rect(20, 170, 90, 20),
    rect(150, 170, 140, 20),
    rect(330, 170, 140, 20),
    rect(510, 170, 140, 20),
    rect(690, 170, 140, 20),
    rect(870, 170, 70, 20),

    // 部屋の仕切り（廊下上壁より上のみ。廊下には突き出さない）
    rect(200, 20, 20, 150),
    rect(380, 20, 20, 150),
    rect(560, 20, 20, 150),
    rect(740, 20, 20, 150),
  ];

  const interactables = [
    {
      id: "room201",
      label: "客室201",
      x: 70,
      y: 60,
      w: 120,
      h: 80,
      color: "#4f566d",
      blocking: false,
      interaction: [
        { speaker: "悠斗", text: "ドアノブが内側から押さえられているような抵抗感がある。" },
        { speaker: "悠斗", text: "…気のせいだ。誰もいない。" },
      ],
    },
    {
      id: "room202",
      label: "客室202",
      x: 250,
      y: 60,
      w: 120,
      h: 80,
      color: "#4f566d",
      blocking: false,
      interaction: [
        { speaker: "悠斗", text: "床に子供の靴が片方だけ置いてある。" },
        { speaker: "悠斗", text: "サイズは小さい。でもまだ、温かい。" },
      ],
    },
    { id: "room203_task", label: "客室203", x: 430, y: 60, w: 120, h: 80, color: "#5d4f6d", blocking: false, interaction: [{ speaker: "悠斗", text: "203号室だ。" }] },
    {
      id: "room204",
      label: "客室204",
      x: 610,
      y: 60,
      w: 120,
      h: 80,
      color: "#4f566d",
      blocking: false,
      interaction: [
        { speaker: "悠斗", text: "204号室のドアに耳を当てると、微かに音がする。" },
        { speaker: "悠斗", text: "テレビの砂嵐…いや、違う。" },
        { speaker: "悠斗", text: "呼吸だ。" },
      ],
    },
    {
      id: "room205",
      label: "客室205",
      x: 790,
      y: 60,
      w: 120,
      h: 80,
      color: "#4f566d",
      blocking: false,
      interaction: [
        { speaker: "悠斗", text: "205は鍵穴から覗ける。" },
        { speaker: "悠斗", text: "真っ暗の中に、椅子が一つ。" },
        { speaker: "悠斗", text: "誰かが座っている。こっちを向いている。" },
      ],
    },
    {
      id: "shadow_figure",
      label: "",
      x: 150,
      y: 200,
      w: 16,
      h: 30,
      color: "#1a1a2e",
      blocking: false,
      interaction: [
        { speaker: "悠斗", text: "…いた。人がいる。" },
        { speaker: "悠斗", text: "「すみません！」" },
        { speaker: "悠斗", text: "…消えた。最初からいなかったように。" },
      ],
    },
    {
      id: "elevator_to_1f",
      label: "エレベーター",
      x: 430,
      y: 360,
      w: 110,
      h: 110,
      color: "#5a5a67",
      blocking: true,
      mapChange: { toMapId: "map1", spawnKey: "fromMap2" },
      interaction: [{ speaker: "悠斗", text: "1Fへ戻る。" }],
    },
    {
      id: "linen_closet",
      label: "リネン室",
      x: 820,
      y: 360,
      w: 100,
      h: 110,
      color: "#5d6749",
      blocking: true,
      interaction: [
        { speaker: "悠斗", text: "タオルがすべて床に落ちている。" },
        { speaker: "悠斗", text: "棚の奥に制服がある。名札に『悠斗』と書いてある。" },
        { speaker: "悠斗", text: "俺の名前だ。なんで…？" },
      ],
    },
  ];

  return {
    id: "map2",
    name: "2F Guest Floor",
    walls,
    keys: [],
    exitDoor: null,
    interactables,
    spawns: {
      default: { x: 840, y: 430 },
      fromMap1: { x: 840, y: 430 },
    },
  };
}

/*
  Map3 (B1 Mechanical Floor) layout:
  - Narrow corridor
  - Machine room and breaker panel
  - Return route to 1F
*/
function createMap3BasementData() {
  const walls = [
    rect(0, 0, WORLD.width, 20),
    rect(0, WORLD.height - 20, WORLD.width, 20),
    rect(0, 0, 20, WORLD.height),
    rect(WORLD.width - 20, 0, 20, WORLD.height),
    // メイン廊下の上壁（開口を2つ作って上段区画へ出入り可能）
    rect(20, 140, 80, 20),
    rect(200, 140, 460, 20),
    rect(760, 140, 180, 20),
    // メイン廊下の下壁（開口を2つ作って下段区画へ出入り可能）
    rect(20, 400, 240, 20),
    rect(340, 400, 420, 20),
    rect(840, 400, 100, 20),
    // 上段の区画仕切り
    rect(320, 20, 20, 120),
    rect(620, 20, 20, 120),
    // 下段の区画仕切り
    rect(260, 420, 20, 100),
    rect(560, 420, 20, 100),
    rect(820, 420, 20, 100),
  ];

  const interactables = [
    {
      id: "machine_room",
      label: "機械室",
      x: 260,
      y: 190,
      w: 180,
      h: 120,
      color: "#5a4f3b",
      blocking: true,
      interaction: [{ speaker: "悠斗", text: "熱い空気。機械だけが生きている。" }],
    },
    {
      id: "breaker_task",
      label: "分電盤",
      x: 80,
      y: 210,
      w: 110,
      h: 120,
      color: "#58654f",
      blocking: true,
      interaction: [{ speaker: "悠斗", text: "非常電源盤。ここを上げれば…。" }],
    },
    {
      id: "generator_bank",
      label: "発電機列",
      x: 660,
      y: 220,
      w: 170,
      h: 90,
      color: "#4f5968",
      blocking: true,
      interaction: [{ speaker: "悠斗", text: "重低音で震えている。耳の奥に響く。" }],
    },
    {
      id: "service_room_a",
      label: "補機室A",
      x: 90,
      y: 40,
      w: 160,
      h: 80,
      color: "#46505f",
      blocking: true,
      interaction: [{ speaker: "悠斗", text: "古いポンプが並んでいる。錆の匂いが強い。" }],
    },
    {
      id: "wiring_room",
      label: "配線室",
      x: 390,
      y: 40,
      w: 170,
      h: 80,
      color: "#4e4a61",
      blocking: true,
      interaction: [{ speaker: "悠斗", text: "束ねられたケーブルが天井に消えていく。" }],
    },
    {
      id: "drain_tunnel",
      label: "排水通路",
      x: 320,
      y: 440,
      w: 220,
      h: 60,
      color: "#41505a",
      blocking: true,
      interaction: [{ speaker: "悠斗", text: "水音だけが反響している。妙に近い。" }],
    },
    {
      id: "pipe_rack",
      label: "配管ラック",
      x: 250,
      y: 330,
      w: 190,
      h: 45,
      color: "#4a6261",
      blocking: true,
      interaction: [{ speaker: "悠斗", text: "配管の継ぎ目から、冷たい水滴が落ちる。" }],
    },
    {
      id: "control_console",
      label: "制御卓",
      x: 650,
      y: 330,
      w: 140,
      h: 45,
      color: "#5a5f4f",
      blocking: true,
      interaction: [{ speaker: "悠斗", text: "警告ランプだけが点滅している。" }],
    },
    {
      id: "stairs_to_1f",
      label: "階段/リフト",
      x: 760,
      y: 200,
      w: 120,
      h: 120,
      color: "#4d5f77",
      blocking: true,
      mapChange: { toMapId: "map1", spawnKey: "fromMap3" },
      interaction: [{ speaker: "悠斗", text: "1Fへ戻る。" }],
    },
  ];

  return {
    id: "map3",
    name: "B1 Mechanical",
    walls,
    keys: [],
    exitDoor: null,
    interactables,
    spawns: {
      default: { x: 840, y: 340 },
      fromMap1: { x: 840, y: 340 },
    },
  };
}

function rect(x, y, w, h) {
  return { x, y, w, h };
}

function item(x, y, name, memo, whisper) {
  return {
    x,
    y,
    radius: 10,
    name,
    memo,
    whisper,
    collected: false,
  };
}

// ------------------------------------------------------------
// 5) Game state
// ------------------------------------------------------------
let game;
let hasStartedGame = false;

function createInitialGameState() {
  // 1プレイ分の状態をここで初期化する。
  const mapId = "map1";
  const startMap = mapManager.getMap(mapId);
  const startSpawn = startMap.spawns.default;
  const safeSpawn = spawnSafePosition(startMap, startSpawn);
  return {
    player: {
      x: safeSpawn.x,
      y: safeSpawn.y,
      w: PLAYER_SPRITE_W,
      h: PLAYER_SPRITE_H,
      speed: 180,
      facing: "down",
    },
    chaser: {
      x: safeSpawn.x + 80,
      y: safeSpawn.y + 40,
      w: CHASER_SPRITE_W,
      h: CHASER_SPRITE_H,
      mapId,
      active: false,
      spawnDelay: CHASER_SPAWN_DELAY,
    },
    mapId,
    world: startMap,
    inventory: [],
    tasks: {
      taskAFrontDesk: false,
      taskBRoom203: false,
      taskCBreaker: false,
    },
    emotion: "安心",
    ending: false,
    endingType: null,
    paused: false,
    debug: false,
    latestMemo: "まだ何も見つかっていない。",
    debugCollisions: [],
    stepTimer: 0,
    lightOn: true,
    settings: {
      darknessMultiplier: darknessStrengthSlider ? Number.parseFloat(darknessStrengthSlider.value) || 0.9 : 0.9,
      reduceFlash: reduceFlashCheckbox ? reduceFlashCheckbox.checked : false,
    },
    effects: {
      bloodFlashTimer: 0,
      shakeTimer: 0,
      shadowHintTimer: 0,
      shadowHintSide: "left",
      escapeCinematicTimer: 0,
      escapeCinematicActive: false,
      endrollTimer: 0,
      endrollActive: false,
    },
    flags: {
      taskBFlashPlayed: false,
      taskCShadowPlayed: false,
      chaserAwakened: false,
      chaserGone: false,
    },
    audioEvents: {
      clockTimer: 0,
      nextClockAt: 18 + Math.random() * 12,
      birdTimer: 0,
      nextBirdAt: 12 + Math.random() * 10,
    },
    whisperTimer: 0,
    nextWhisperAt: 25,
    whisperIndex: 0,
    safeSpot: { x: safeSpawn.x, y: safeSpawn.y },
    safeSpotTimer: 0,
    rescueHoldTimer: 0,
    rescueTriggered: false,
    interaction: {
      nearest: null,
      hold: new HoldToInteract(0.35),
    },
    checkpoint: null,
  };
}

function playIntroDialogue() {
  playTitleSE();
  dialogue.start([
    {
      speaker: "悠斗",
      text: "……やば。寝ぼけて部屋のカードキー落としたっぽい",
    },
    {
      speaker: "悠斗",
      text: "フロント、誰もいない。…このホテル、さっきまで人いたよな？",
    },
    {
      speaker: "悠斗",
      text: "まずはフロントを調べる。俺の部屋がどこか、確認しないと。",
    },
  ]);
}

function resetGame() {
  // 完全初期化: マップ/状態/演出を初期値に戻して開始会話へ。
  mapManager.resetMaps();
  game = createInitialGameState();
  mapManager.transition.active = false;
  mapManager.transition.elapsed = 0;
  endingScreen.classList.add("hidden");
  ambientAudio.setHighTensionFootsteps(false);
  audioManager.playBGM("main");
  playIntroDialogue();
  saveCheckpoint();
  refreshHUD();
}

function startGameFromTitle() {
  if (hasStartedGame) return;
  hasStartedGame = true;
  if (titleScreen) {
    titleScreen.classList.add("hidden");
  }
  activateAudioSystems();
  resetGame();
}

if (startGameButton) {
  startGameButton.addEventListener("click", startGameFromTitle);
}

// ------------------------------------------------------------
// 6) Update loop (game logic)
// ------------------------------------------------------------
let lastTime = 0;

function gameLoop(timestamp) {
  const deltaSeconds = Math.min((timestamp - lastTime) / 1000, 0.033);
  lastTime = timestamp;

  update(deltaSeconds);
  render();

  input.justPressed.clear();
  requestAnimationFrame(gameLoop);
}

function update(dt) {
  // 毎フレームの進行順: 入力処理 -> 状態更新 -> 移動/衝突 -> UI更新。
  if (!hasStartedGame) {
    refreshHUD();
    return;
  }

  if (wasJustPressed("h")) {
    game.debug = !game.debug;
  }
  if (wasJustPressed("l", "shift")) {
    game.lightOn = !game.lightOn;
  }

  mapManager.update(dt, game);
  updateHorrorEffects(dt);
  ambientAudio.update(dt, game.mapId);

  if (game.ending) {
    // Caught時だけ「最初から」ではなく、直前タスクのチェックポイントへ戻す。
    if (wasJustPressed("r")) {
      if (game.endingType === "Caught") {
        restoreFromCheckpoint();
      } else {
        resetGame();
      }
    }
    refreshHUD();
    return;
  }

  if (game.effects.endrollActive) {
    objectiveText.textContent = `${buildObjectiveChecklistText()}\n\nエンドロール再生中…`;
    return;
  }

  if (game.effects.escapeCinematicActive) {
    updateEscapeCinematic(dt);
    refreshHUD();
    return;
  }

  if (game.effects.endrollActive) {
    updateEndroll(dt);
    refreshHUD();
    return;
  }

  // During dialogue, movement stops and only dialogue input is processed.
  if (dialogue.active) {
    game.interaction.hold.reset();
    game.interaction.nearest = null;
    dialogue.update(dt);
    refreshHUD();
    return;
  }

  if (mapManager.transition.active) {
    game.interaction.hold.reset();
    game.interaction.nearest = null;
    refreshHUD();
    return;
  }

  if (wasJustPressed("p")) {
    game.paused = !game.paused;
  }

  if (game.paused) {
    game.interaction.hold.reset();
    game.interaction.nearest = null;
    refreshHUD();
    return;
  }

  updateWorldSfx(dt);

  // Hold R to escape from stuck positions by warping to recent safe spot.
  updateRescueHold(dt);

  movePlayer(dt);
  updateSafeSpot(dt);
  updateChaser(dt);
  if (game.ending) {
    refreshHUD();
    return;
  }

  // Decide nearest interactable once per frame for highlight/UI/hotkeys.
  game.interaction.nearest = findNearestInteractable();
  processInteractionInput(dt);

  if (game.world.exitDoor) {
    game.world.exitDoor.unlocked = areAllTasksComplete();
  }
  refreshHUD();
}

function movePlayer(dt) {
  // 斜め移動を正規化し、X/Y別々に衝突判定して引っかかりを減らす。
  game.debugCollisions = [];

  let dx = 0;
  let dy = 0;

  if (input.move.up) dy -= 1;
  if (input.move.down) dy += 1;
  if (input.move.left) dx -= 1;
  if (input.move.right) dx += 1;
  const isMoving = dx !== 0 || dy !== 0;

  // Remember facing for sprite orientation.
  if (isMoving) {
    if (Math.abs(dx) > Math.abs(dy)) {
      game.player.facing = dx > 0 ? "right" : "left";
    } else {
      game.player.facing = dy > 0 ? "down" : "up";
    }
  }

  const length = Math.hypot(dx, dy);
  if (length > 0) {
    dx /= length;
    dy /= length;
  }

  const moveAmount = game.player.speed * dt;
  const nextX = game.player.x + dx * moveAmount;
  const nextY = game.player.y + dy * moveAmount;

  tryMovePlayer(nextX, game.player.y);
  tryMovePlayer(game.player.x, nextY);

  if (isMoving) {
    game.stepTimer += dt;
    if (game.stepTimer >= 0.36) {
      playStepSE();
      game.stepTimer = 0;
    }
  } else {
    game.stepTimer = 0;
  }
}

function updateChaser(dt) {
  // 追跡者は Task B 後に有効化。デバッグ中も動作する（挙動確認しやすくするため）。
  if (!game.tasks.taskBRoom203) {
    game.chaser.active = false;
    return;
  }
  if (game.flags.chaserGone) {
    game.chaser.active = false;
    return;
  }

  if (!game.flags.chaserAwakened) {
    game.flags.chaserAwakened = true;
    game.latestMemo = "背後に気配。何かが、ついてきている。";
    playScareSE();
    playMenaaaSE();
  }

  if (game.chaser.mapId !== game.mapId) {
    placeChaserInCurrentMap(CHASER_SPAWN_DELAY);
  }

  if (game.chaser.spawnDelay > 0) {
    game.chaser.spawnDelay = Math.max(0, game.chaser.spawnDelay - dt);
    return;
  }

  game.chaser.active = true;

  const playerCenter = getCenter(game.player);
  const chaserCenter = getCenter(game.chaser);
  const dx = playerCenter.x - chaserCenter.x;
  const dy = playerCenter.y - chaserCenter.y;
  const distance = Math.hypot(dx, dy) || 1;
  const speed = distance > 180 ? CHASER_RUSH_SPEED : CHASER_BASE_SPEED;
  const step = speed * dt;
  const moveX = (dx / distance) * step;
  const moveY = (dy / distance) * step;

  tryMoveChaser(game.chaser.x + moveX, game.chaser.y);
  tryMoveChaser(game.chaser.x, game.chaser.y + moveY);

  const playerHitbox = getPlayerHitbox(game.player.x, game.player.y);
  const chaserHitbox = getChaserHitbox(game.chaser.x, game.chaser.y);
  if (rectsOverlap(playerHitbox, chaserHitbox)) {
    triggerCaughtEnding();
  }
}

function placeChaserInCurrentMap(spawnDelay) {
  // 候補地点の中で「プレイヤーから最も遠い位置」に出し、即死を避ける。
  const candidateSpawns = [
    { x: 48, y: 48 },
    { x: WORLD.width - 80, y: 48 },
    { x: 48, y: WORLD.height - 92 },
    { x: WORLD.width - 80, y: WORLD.height - 92 },
    { x: WORLD.width / 2 - 40, y: 48 },
  ];

  const playerCenter = getCenter(game.player);
  let best = null;

  for (const desired of candidateSpawns) {
    const safe = spawnSafePosition(game.world, desired);
    const center = { x: safe.x + CHASER_SPRITE_W / 2, y: safe.y + CHASER_SPRITE_H / 2 };
    const dist = Math.hypot(playerCenter.x - center.x, playerCenter.y - center.y);
    if (!best || dist > best.dist) {
      best = { point: safe, dist };
    }
  }

  if (!best) return;
  game.chaser.x = best.point.x;
  game.chaser.y = best.point.y;
  game.chaser.mapId = game.mapId;
  game.chaser.spawnDelay = spawnDelay;
  game.chaser.active = false;
}

function tryMoveChaser(nextX, nextY) {
  const hitbox = getChaserHitbox(nextX, nextY);
  const wallHit = getFirstCollisionWall(hitbox, getBlockingRects());
  if (wallHit) return;
  if (game.world.exitDoor && !game.world.exitDoor.unlocked && rectsOverlap(hitbox, game.world.exitDoor)) {
    return;
  }
  game.chaser.x = nextX;
  game.chaser.y = nextY;
}

function triggerCaughtEnding() {
  if (game.ending) return;
  // 捕食系SEを重ねて、Caughtの印象をはっきりさせる。
  playBiteSE();
  playEatSE();
  playMenaaaSE();
  playScareSE();
  setEmotion("恐怖");
  triggerEnding("Caught", "何かに追いつかれ、食い殺された。");
}

function tryMovePlayer(nextX, nextY) {
  const candidateHitbox = getPlayerHitbox(nextX, nextY);
  const wallHit = getFirstCollisionWall(candidateHitbox, getBlockingRects());
  if (wallHit) {
    game.debugCollisions.push(wallHit);
    return;
  }

  if (game.world.exitDoor && !game.world.exitDoor.unlocked && rectsOverlap(candidateHitbox, game.world.exitDoor)) {
    game.debugCollisions.push(game.world.exitDoor);
    return;
  }

  game.player.x = nextX;
  game.player.y = nextY;
}

// ------------------------------------------------------------
// 7) Interaction
// ------------------------------------------------------------
function processInteractionInput(dt) {
  // 短押し(E/Space)と長押しの両方を受け付ける。
  const nearest = game.interaction.nearest;

  // Quick press (E or Space) still works.
  if (wasJustPressed("e", "space") && nearest) {
    triggerInteractable(nearest);
    game.interaction.hold.reset();
    return;
  }

  // Hold interaction for easier moving interaction.
  const didHoldTrigger = game.interaction.hold.update(
    dt,
    !dialogue.active && !game.paused && !mapManager.transition.active,
    isHeld("e", "space"),
    nearest ? nearest.id : null
  );

  if (didHoldTrigger && nearest) {
    triggerInteractable(nearest);
    game.interaction.hold.reset();
  }
}

function findNearestInteractable() {
  // 範囲内の候補から最も近い1つだけを採用する。
  const pCenter = getCenter(game.player);
  const candidates = buildInteractableCandidates();
  let nearest = null;

  for (const candidate of candidates) {
    const distance = getDistanceToCandidate(pCenter, candidate);
    if (distance > candidate.range) continue;

    if (!nearest || distance < nearest.distance) {
      nearest = {
        ...candidate,
        distance,
      };
    }
  }

  return nearest;
}

function buildInteractableCandidates() {
  const candidates = [];

  for (const keyItem of game.world.keys) {
    if (keyItem.collected) continue;
    candidates.push({
      id: `key:${keyItem.name}`,
      kind: "key",
      x: keyItem.x,
      y: keyItem.y,
      radius: keyItem.radius,
      range: INTERACT_RANGE,
      prompt: "E / Space: 調べる",
      ref: keyItem,
    });
  }

  for (const obj of game.world.interactables) {
    if (!obj.interaction && !obj.mapChange) continue;
    candidates.push({
      id: `obj:${obj.id}`,
      kind: "object",
      x: obj.x,
      y: obj.y,
      w: obj.w,
      h: obj.h,
      range: INTERACT_RANGE + 16,
      prompt: obj.mapChange ? "E / Space: 移動" : "E / Space: 調べる",
      ref: obj,
    });
  }

  return candidates;
}

function getDistanceToCandidate(point, candidate) {
  if (candidate.kind === "key") {
    return Math.hypot(point.x - candidate.x, point.y - candidate.y);
  }
  return distancePointToRect(point, candidate);
}

function triggerInteractable(candidate) {
  // インタラクトの中心分岐。idごとにイベントを切り替える。
  if (candidate.kind === "key") {
    const keyItem = candidate.ref;
    if (keyItem.collected) return;
    keyItem.collected = true;
    game.inventory.push(keyItem.name);
    game.latestMemo = keyItem.memo;
    playPickupSE();

    dialogue.start([
      { speaker: "メモ", text: keyItem.memo },
      { speaker: "悠斗", text: keyItem.whisper },
    ], { autoAdvanceMs: 1500 });
    return;
  }

  if (candidate.kind === "exit") {
    playDoorSE();
    if (candidate.ref.unlocked) {
      triggerEscapeCinematic();
    } else {
      dialogue.start([{ speaker: "悠斗", text: "必要な作業が終わっていない。まだ開かない。" }]);
    }
    return;
  }

  const obj = candidate.ref;

  if (obj.id === "shadow_figure") {
    dialogue.start(obj.interaction, {
      onComplete: () => {
        obj.blocking = false;
        obj.interaction = [];
        obj.w = 0;
        obj.h = 0;
      },
    });
    playScareSE();
    return;
  }

  // Task A: only at 1F front desk ledger.
  if (obj.id === "frontdesk_ledger") {
    if (!game.tasks.taskAFrontDesk) {
      game.tasks.taskAFrontDesk = true;
      saveCheckpoint();
      setEmotion("違和感");
      game.latestMemo = "台帳: 悠斗 / Room203 / 日付が明日になっている";
      dialogue.start([
        { speaker: "メモ", text: "『宿泊台帳: 悠斗 203号室。チェックイン日: 明日』" },
        { speaker: "悠斗", text: "明日…？ 今日じゃない。俺はまだ、チェックインしていない？" },
        { speaker: "悠斗", text: "でもここにいる。鍵もある。部屋番号も知っている。" },
        { speaker: "悠斗", text: "……なんで俺はここにいるんだ。" },
      ]);
    } else {
      dialogue.start([{ speaker: "悠斗", text: "台帳には確かに203と書かれている。" }]);
    }
    return;
  }

  // Task B: Room203 on 2F.
  if (obj.id === "room203_task") {
    if (!game.tasks.taskAFrontDesk && !game.debug) {
      dialogue.start([{ speaker: "悠斗", text: "203号室…まずは1Fフロントで手掛かりを確認しよう。" }]);
      return;
    }
    if (!game.tasks.taskBRoom203) {
      game.tasks.taskBRoom203 = true;
      saveCheckpoint();
      setEmotion("確信");
      if (!game.flags.taskBFlashPlayed) {
        triggerBloodFlashAndShake();
        ambientAudio.playNoiseHit();
        playDissonanceSE();
        playScareSE();
        playBiteSE();
        game.flags.taskBFlashPlayed = true;
      }
      game.inventory.push("Card Key 203");
      game.latestMemo = "Room203メモ: 非常口の解錠には電源が必要";
      playPickupSE();
      dialogue.start([
        { speaker: "悠斗", text: "部屋の中は、生活の痕跡があった。" },
        { speaker: "悠斗", text: "着替え。財布。スマホの充電器。" },
        { speaker: "悠斗", text: "全部、俺のものだ。" },
        { speaker: "悠斗", text: "でも…俺はここにいた記憶がない。" },
        { speaker: "メモ", text: "『カードキー回収。非常口の解錠には非常電源が必要』" },
        { speaker: "悠斗", text: "考えるな。今は出ることだけ考えろ。B1へ行け。" },
      ]);
    } else {
      dialogue.start([{ speaker: "悠斗", text: "203から回収したカードキーは手元にある。" }]);
    }
    return;
  }

  // Task C: Breaker on B1.
  if (obj.id === "breaker_task") {
    if (!game.tasks.taskBRoom203 && !game.debug) {
      dialogue.start([{ speaker: "悠斗", text: "まず2Fの203で状況を確認する必要がある。" }]);
      return;
    }
    if (!game.tasks.taskCBreaker) {
      game.tasks.taskCBreaker = true;
      saveCheckpoint();
      setEmotion("脱出の執念");
      if (!game.flags.taskCShadowPlayed) {
        triggerShadowHint();
        playEatSE();
        game.flags.taskCShadowPlayed = true;
        ambientAudio.setHighTensionFootsteps(true);
      }
      game.latestMemo = "非常電源をON。1F非常口のロックが解除された。";
      dialogue.start([
        { speaker: "悠斗", text: "スイッチを上げた瞬間、ホテル全体が震えた。" },
        { speaker: "悠斗", text: "照明が一斉に点いて…そして全部消えた。" },
        { speaker: "悠斗", text: "暗闇の中で、誰かが笑う声がした。" },
        { speaker: "悠斗", text: "走れ。1F非常口まで。今すぐ。" },
      ]);
    } else {
      dialogue.start([{ speaker: "悠斗", text: "非常電源はすでに入っている。" }]);
    }
    return;
  }

  // Escape check at 1F emergency exit.
  if (obj.id === "emergency_exit_1f") {
    playDoorSE();
    if (areAllTasksComplete() && game.world.exitDoor && game.world.exitDoor.unlocked) {
      triggerEscapeCinematic();
    } else {
      dialogue.start([{ speaker: "悠斗", text: "非常口はまだ開かない。必要な作業を終えるんだ。" }]);
    }
    return;
  }

  if (obj.id === "elevator_to_2f" && !game.tasks.taskAFrontDesk && !game.debug) {
    dialogue.start([{ speaker: "悠斗", text: "…なんとなく、まずフロントを確認しないといけない気がする。" }]);
    return;
  }

  if (obj.id === "service_stairs_to_b1" && !game.tasks.taskBRoom203 && !game.debug) {
    dialogue.start([{ speaker: "悠斗", text: "B1に何があるかはわかってる。でも今は…2Fを先に確認しないといけない。" }]);
    return;
  }

  if (obj.mapChange) {
    if (obj.id === "stairs_to_1f" && !game.tasks.taskCBreaker) {
      dialogue.start([
        { speaker: "悠斗", text: "……待て。電源をまだ入れていない。" },
        { speaker: "悠斗", text: "戻っても意味がない。ブレーカーを先に操作しないと。" },
      ]);
      return;
    }

    playDoorSE();
    const lines = getMapChangeDialogue(obj);
    dialogue.start(lines, {
      onComplete: () => {
        mapManager.startTransition(game, obj.mapChange.toMapId, obj.mapChange.spawnKey);
      },
    });
    return;
  }

  if (obj.interaction && obj.interaction.length > 0) {
    dialogue.start(obj.interaction, { autoAdvanceMs: 0 });
  }
}

function getMapChangeDialogue(obj) {
  if (obj.id === "elevator_to_2f") {
    setEmotion("不安");
    if (game.tasks.taskAFrontDesk && !game.tasks.taskBRoom203) {
      return [
        { speaker: "悠斗", text: "2Fへ。203号室に俺の手掛かりがある。" },
      ];
    }
    if (game.tasks.taskBRoom203) {
      return [
        { speaker: "悠斗", text: "もう用はない。1Fへ戻ろう。" },
      ];
    }
    return [
      { speaker: "悠斗", text: "2Fへ上がる。203、すぐ見つかるはずだ。" },
      { speaker: "悠斗", text: "……なのに、足が重い。" },
    ];
  }

  if (obj.id === "elevator_to_1f") {
    if (game.tasks.taskBRoom203) {
      return [
        { speaker: "悠斗", text: "1Fへ戻る。B1のスタッフ通路から地下へ向かわないと。" },
      ];
    }
    return [
      { speaker: "悠斗", text: "1Fへ戻る。次の行き先を決めないと。" },
    ];
  }

  if (obj.id === "service_stairs_to_b1") {
    setEmotion("恐怖");
    return [
      { speaker: "悠斗", text: "B1だ。電源を入れれば、非常口が開く。" },
      { speaker: "悠斗", text: "急げ。" },
    ];
  }

  if (obj.id === "stairs_to_1f") {
    return [
      { speaker: "悠斗", text: "1Fへ戻る。非常口まで一直線だ。" },
    ];
  }

  return obj.interaction && obj.interaction.length > 0
    ? obj.interaction
    : [{ speaker: "悠斗", text: "移動する。" }];
}

function triggerEnding(title, text) {
  game.ending = true;
  game.endingType = title;
  if (title === "Caught") {
    setEmotion("恐怖");
  } else {
    setEmotion("脱出の執念");
  }
  endingTitle.textContent = title;
  endingText.textContent = text;
  endingScreen.classList.remove("hidden");
}

function triggerEscapeCinematic() {
  if (game.effects.escapeCinematicActive || game.ending) return;
  game.effects.escapeCinematicActive = true;
  game.effects.escapeCinematicTimer = 0;
  playDoorSE();
}

function setEmotion(nextEmotion) {
  game.emotion = nextEmotion;
}

function areAllTasksComplete() {
  return game.tasks.taskAFrontDesk && game.tasks.taskBRoom203 && game.tasks.taskCBreaker;
}

function getDoneTaskCount() {
  let count = 0;
  if (game.tasks.taskAFrontDesk) count += 1;
  if (game.tasks.taskBRoom203) count += 1;
  if (game.tasks.taskCBreaker) count += 1;
  return count;
}

function buildObjectiveChecklistText() {
  const markA = game.tasks.taskAFrontDesk ? "[x]" : "[ ]";
  const markB = game.tasks.taskBRoom203 ? "[x]" : "[ ]";
  const markC = game.tasks.taskCBreaker ? "[x]" : "[ ]";
  const markEscape = areAllTasksComplete() ? "[x]" : "[ ]";
  let nextAction = "";

  if (!game.tasks.taskAFrontDesk) {
    nextAction = "→ まず1Fフロントの受付を調べよう";
  } else if (game.tasks.taskAFrontDesk && !game.tasks.taskBRoom203) {
    nextAction = "→ エレベーターで2Fへ。客室203を探そう";
  } else if (game.tasks.taskBRoom203 && !game.tasks.taskCBreaker) {
    nextAction = "→ 1Fに戻り、スタッフ通路からB1へ";
  } else if (game.tasks.taskCBreaker && !game.ending) {
    nextAction = "→ 1F非常口へ向かえ";
  }

  const lines = [
    "目的（ホテルタスク）",
    `${markA} Task A: 1Fフロントで宿泊台帳を調べる`,
    `${markB} Task B: 2F客室203でカードキーを回収`,
    `${markC} Task C: B1で非常電源(ブレーカー)をON`,
    `${markEscape} 1F非常口から脱出`,
  ];
  if (nextAction) {
    lines.push(nextAction);
  }

  return lines.join("\n");
}

function updateHorrorEffects(dt) {
  game.effects.bloodFlashTimer = Math.max(0, game.effects.bloodFlashTimer - dt);
  game.effects.shakeTimer = Math.max(0, game.effects.shakeTimer - dt);
  game.effects.shadowHintTimer = Math.max(0, game.effects.shadowHintTimer - dt);
}

function updateEscapeCinematic(dt) {
  game.effects.escapeCinematicTimer += dt;
  if (game.effects.escapeCinematicTimer >= ESCAPE_CINEMATIC_DURATION) {
    game.effects.escapeCinematicActive = false;
    startEndroll();
  }
}

function startEndroll() {
  if (game.effects.endrollActive) return;
  game.effects.endrollActive = true;
  game.effects.endrollTimer = 0;
  playDissonanceSE();
}

function updateEndroll(dt) {
  game.effects.endrollTimer += dt;
  if (game.effects.endrollTimer >= ENDROLL_DURATION) {
    game.effects.endrollActive = false;
    triggerEnding("Escaped", "やっと…外だ。");
  }
}

function updateWorldSfx(dt) {
  // 1F: ominous clock bell at long intervals
  if (game.mapId === "map1") {
    game.audioEvents.clockTimer += dt;
    if (game.audioEvents.clockTimer >= game.audioEvents.nextClockAt) {
      playClockSE();
      game.audioEvents.clockTimer = 0;
      game.audioEvents.nextClockAt = 18 + Math.random() * 16;
    }
  } else {
    game.audioEvents.clockTimer = 0;
  }

  // 2F: occasional ominous bird call
  if (game.mapId === "map2") {
    game.audioEvents.birdTimer += dt;
    if (game.audioEvents.birdTimer >= game.audioEvents.nextBirdAt) {
      playBirdSE();
      game.audioEvents.birdTimer = 0;
      const min = game.tasks.taskCBreaker ? 6 : 10;
      const max = game.tasks.taskCBreaker ? 12 : 18;
      game.audioEvents.nextBirdAt = min + Math.random() * (max - min);
    }
  } else {
    game.audioEvents.birdTimer = 0;
  }

  // 独り言イベント（ゲーム全体を通して一定間隔で発生）
  if (!dialogue.active && !game.paused && !game.ending) {
    game.whisperTimer += dt;
    if (game.whisperTimer >= game.nextWhisperAt) {
      game.whisperTimer = 0;
      game.nextWhisperAt = 30 + Math.random() * 20;
      triggerWhisperEvent();
    }
  }
}

function triggerWhisperEvent() {
  const map1Lines = [
    [{ speaker: "悠斗", text: "…静かすぎる。ホテルってこんなに静かだったか？" }],
    [{ speaker: "悠斗", text: "さっき、廊下の奥で何かが動いた気がした。" }, { speaker: "悠斗", text: "…獣か。そうだ。野良猫でも入り込んだんだろう。" }],
    [{ speaker: "悠斗", text: "俺、ここに何泊してるんだっけ。" }, { speaker: "悠斗", text: "……思い出せない。" }],
  ];
  const map2Lines = [
    [{ speaker: "悠斗", text: "この廊下、ずっと同じ長さに感じる。" }, { speaker: "悠斗", text: "歩いても歩いても、端が見えない。" }],
    [{ speaker: "悠斗", text: "…誰かの足音が聞こえる。俺の後ろから。" }, { speaker: "悠斗", text: "振り返るな。振り返ったら…。" }, { speaker: "悠斗", text: "何もいない。当たり前だ。" }],
    [{ speaker: "悠斗", text: "203のドアに、もう一度触れた。" }, { speaker: "悠斗", text: "あの部屋には、俺の何かが残っている気がする。" }],
  ];
  const map3Lines = [
    [{ speaker: "悠斗", text: "機械の音だけが聞こえる。それが、なぜか安心する。" }, { speaker: "悠斗", text: "…いや、違う。これは呼吸だ。" }],
    [{ speaker: "悠斗", text: "出口まで、何メートルあるんだろう。" }, { speaker: "悠斗", text: "感覚が、おかしくなってきた。" }],
    [{ speaker: "悠斗", text: "電源を入れたら。出られる。絶対に。" }, { speaker: "悠斗", text: "……本当に、出られるのか？" }],
  ];

  let pool;
  if (game.mapId === "map1") pool = map1Lines;
  else if (game.mapId === "map2") pool = map2Lines;
  else pool = map3Lines;

  const lines = pool[game.whisperIndex % pool.length];
  game.whisperIndex += 1;
  dialogue.start(lines, { autoAdvanceMs: 2800 });
}

function triggerBloodFlashAndShake() {
  const flashDuration = game.settings.reduceFlash ? BLOOD_FLASH_DURATION * 0.5 : BLOOD_FLASH_DURATION;
  const shakeDuration = game.settings.reduceFlash ? SHAKE_DURATION * 0.5 : SHAKE_DURATION;
  game.effects.bloodFlashTimer = flashDuration;
  game.effects.shakeTimer = shakeDuration;
}

function triggerShadowHint() {
  game.effects.shadowHintTimer = SHADOW_HINT_DURATION;
  game.effects.shadowHintSide = Math.random() > 0.5 ? "left" : "right";
}

function getShakeOffset() {
  if (game.effects.shakeTimer <= 0) return { x: 0, y: 0 };
  const intensity = game.settings.reduceFlash ? 2.2 : 4.0;
  return {
    x: (Math.random() * 2 - 1) * intensity,
    y: (Math.random() * 2 - 1) * intensity,
  };
}

function updateRescueHold(dt) {
  const holdingR = isHeld("r");
  if (!holdingR) {
    game.rescueHoldTimer = 0;
    game.rescueTriggered = false;
    return;
  }

  game.rescueHoldTimer += dt;
  if (!game.rescueTriggered && game.rescueHoldTimer >= RESCUE_HOLD_SECONDS) {
    warpToSafeSpot();
    game.rescueTriggered = true;
  }
}

function updateSafeSpot(dt) {
  game.safeSpotTimer += dt;
  if (game.safeSpotTimer < 1.2) return;
  game.safeSpotTimer = 0;

  if (!isPlayerCollidingAt(game.player.x, game.player.y, game.world)) {
    game.safeSpot = { x: game.player.x, y: game.player.y };
  }
}

function warpToSafeSpot() {
  if (!game.safeSpot) return;
  const safe = spawnSafePosition(game.world, game.safeSpot);
  game.player.x = safe.x;
  game.player.y = safe.y;
  game.latestMemo = "詰まりを解除した。落ち着いて進もう。";
}

function refreshHUD() {
  const doneCount = getDoneTaskCount();
  inventoryText.textContent = `${doneCount} / 3`;
  memoText.textContent = `メモ: ${game.latestMemo}`;
  if (emotionText) {
    emotionText.textContent = `感情: ${game.emotion}`;
  }
  const shouldShowAudioPanel = game.paused && !game.ending && !dialogue.active;
  if (pauseAudioPanel) {
    pauseAudioPanel.classList.toggle("hidden", !shouldShowAudioPanel);
  }

  objectiveText.textContent = buildObjectiveChecklistText();

  if (game.ending) {
    const endingGuide = game.endingType === "Caught"
      ? "Rで直前タスクのチェックポイントから再開。"
      : "Rで最初からやり直す。";
    objectiveText.textContent = `${buildObjectiveChecklistText()}\n\n${endingGuide}`;
    return;
  }

  if (dialogue.active) {
    objectiveText.textContent = `${buildObjectiveChecklistText()}\n\n会話中: Space / Enter で進める。`;
    return;
  }

  if (game.paused) {
    objectiveText.textContent = `${buildObjectiveChecklistText()}\n\n一時停止中。Pで再開。`;
  }
}

// ------------------------------------------------------------
// 8) Rendering
// ------------------------------------------------------------
function render() {
  // 描画順を固定することで、重なり順のバグを防ぐ。
  clearCanvas();
  const shakeOffset = getShakeOffset();
  ctx.save();
  ctx.translate(shakeOffset.x, shakeOffset.y);
  drawFloor();
  drawOminousDetails();
  drawMapObjects();
  drawWalls();
  drawRoomLabels();
  drawKeys();
  drawExitDoor();
  drawInteractHint();
  drawChaser();
  drawPlayerSprite();
  drawHoldInteractGauge();
  drawShadowHint();
  drawDarknessOverlay();
  drawChaseDangerOverlay();
  ctx.restore();

  if (game.paused && !game.ending && !dialogue.active) {
    drawPauseOverlay();
  }

  dialogue.render();
  drawMapFadeOverlay();
  drawBloodFlashOverlay();
  drawEscapeCinematicOverlay();
  drawEndrollOverlay();

  if (game.debug) {
    drawCollisionDebug();
    drawDebugOverlay();
  }
}

function drawEscapeCinematicOverlay() {
  if (!game.effects.escapeCinematicActive) return;
  const t = game.effects.escapeCinematicTimer;
  const p = Math.max(0, Math.min(1, t / ESCAPE_CINEMATIC_DURATION));

  // White bloom that quickly rises and then settles.
  const flash = p < 0.25 ? p / 0.25 : Math.max(0, 1 - (p - 0.25) / 0.75) * 0.55;
  ctx.fillStyle = `rgba(240, 245, 255, ${flash})`;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  // Black letterbox fade for cinematic feel.
  const barAlpha = Math.min(0.72, 0.25 + p * 0.55);
  ctx.fillStyle = `rgba(0, 0, 0, ${barAlpha})`;
  ctx.fillRect(0, 0, WORLD.width, 88);
  ctx.fillRect(0, WORLD.height - 88, WORLD.width, 88);

  ctx.textAlign = "center";
  ctx.fillStyle = `rgba(245, 245, 250, ${Math.min(1, p * 1.4)})`;
  ctx.font = "bold 30px sans-serif";
  ctx.fillText("非常口の先に、夜風が流れ込む。", WORLD.width / 2, WORLD.height / 2 - 16);
  ctx.font = "20px sans-serif";
  ctx.fillText("やっと…外だ。", WORLD.width / 2, WORLD.height / 2 + 26);
}

function drawEndrollOverlay() {
  if (!game.effects.endrollActive) return;
  const t = game.effects.endrollTimer;
  const p = Math.max(0, Math.min(1, t / ENDROLL_DURATION));

  ctx.fillStyle = "rgba(0, 0, 0, 0.88)";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  const lines = [
    "深夜ホテル: Corridor Escape",
    "",
    "主人公: 悠斗",
    "舞台: 深夜のビジネスホテル",
    "",
    "Task A  受付で台帳を確認",
    "Task B  203号室でカードキー回収",
    "Task C  B1で非常電源をON",
    "",
    "静寂は、終わらない。",
    "それでも、今夜は外へ出られた。",
    "",
    "Thank you for playing",
  ];

  const startY = WORLD.height + 40;
  const endY = -lines.length * 34;
  const y = startY + (endY - startY) * p;

  ctx.textAlign = "center";
  ctx.fillStyle = "#f1f2f7";
  for (let i = 0; i < lines.length; i += 1) {
    const lineY = y + i * 34;
    if (lineY < -40 || lineY > WORLD.height + 40) continue;
    ctx.font = i === 0 ? "bold 34px sans-serif" : i === lines.length - 1 ? "bold 28px sans-serif" : "22px sans-serif";
    ctx.fillText(lines[i], WORLD.width / 2, lineY);
  }
}

function clearCanvas() {
  ctx.clearRect(0, 0, WORLD.width, WORLD.height);
}

function drawFloor() {
  if (game.mapId === "map1") {
    // 1F lobby floor
    ctx.fillStyle = "#1a1a22";
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    ctx.fillStyle = "#222a35";
    ctx.fillRect(20, 340, WORLD.width - 40, 180); // lobby
    ctx.fillStyle = "#2d2530";
    ctx.fillRect(240, 120, 280, 200); // desk + office zone
    ctx.fillStyle = "#27333f";
    ctx.fillRect(620, 80, 280, 260); // elevator hall
    ctx.fillStyle = "#25303c";
    ctx.fillRect(40, 180, 140, 150); // restroom zone
  } else if (game.mapId === "map2") {
    // 2F guest corridor floor
    ctx.fillStyle = "#1c1e28";
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.fillStyle = "#2a3140";
    ctx.fillRect(20, 170, WORLD.width - 40, 150); // main corridor
    ctx.fillStyle = "#2b2533";
    ctx.fillRect(40, 40, 900, 110); // room line
    ctx.fillStyle = "#263443";
    ctx.fillRect(380, 350, 220, 140); // elevator hall
  } else {
    // B1 mechanical floor
    ctx.fillStyle = "#161a20";
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    // 上段区画（補機室・配線室エリア）
    ctx.fillStyle = "#1f2731";
    ctx.fillRect(20, 20, WORLD.width - 40, 120);
    // メイン廊下
    ctx.fillStyle = "#273344";
    ctx.fillRect(20, 160, WORLD.width - 40, 240);
    // 下段区画（排水通路・保守レーン）
    ctx.fillStyle = "#1b232d";
    ctx.fillRect(20, 420, WORLD.width - 40, 100);

    ctx.fillStyle = "#2a3341";
    ctx.fillRect(230, 190, 320, 165); // machine room area
    ctx.fillStyle = "#1d232e";
    ctx.fillRect(60, 190, 200, 165); // breaker approach
    ctx.fillStyle = "#202a36";
    ctx.fillRect(560, 190, 360, 165); // service lane

    // Main maintenance route line (stairs -> breaker).
    ctx.strokeStyle = "rgba(220, 185, 90, 0.32)";
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.moveTo(840, 350);
    ctx.lineTo(650, 350);
    ctx.lineTo(650, 260);
    ctx.lineTo(155, 260);
    ctx.stroke();
    ctx.setLineDash([]);

    // 上下開口の誘導マーク
    ctx.fillStyle = "rgba(190, 200, 220, 0.14)";
    ctx.fillRect(118, 145, 64, 10);
    ctx.fillRect(678, 145, 64, 10);
    ctx.fillRect(270, 405, 64, 10);
    ctx.fillRect(770, 405, 64, 10);
  }
}

function drawOminousDetails() {
  if (game.mapId === "map1") {
    drawBloodStain(335, 418, 42, 22, 0.35);
    drawBloodStain(458, 442, 28, 14, -0.2);
    drawBloodTrail(300, 300, 370, 252, 8, "rgba(90, 12, 18, 0.28)");

    ctx.fillStyle = "rgba(130, 30, 42, 0.55)";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("DON'T LOOK", 72, 208);
  } else if (game.mapId === "map2") {
    drawBloodStain(205, 240, 24, 12, -0.1);
    drawBloodStain(545, 216, 32, 15, 0.2);
    drawBloodTrail(640, 228, 705, 200, 6, "rgba(110, 16, 24, 0.24)");

    ctx.fillStyle = "rgba(200, 200, 210, 0.08)";
    ctx.fillRect(110, 178, 760, 2);
    ctx.fillRect(110, 318, 760, 2);
  } else {
    drawBloodStain(295, 286, 55, 26, 0.1);
    drawBloodStain(180, 250, 24, 12, -0.2);
    drawBloodStain(725, 300, 20, 10, 0.3);
    drawBloodTrail(470, 330, 535, 280, 10, "rgba(120, 15, 22, 0.26)");
    drawBloodTrail(760, 360, 700, 320, 7, "rgba(100, 10, 20, 0.22)");
    drawBloodTrail(210, 265, 245, 330, 6, "rgba(90, 8, 16, 0.22)");

    ctx.fillStyle = "rgba(255, 80, 70, 0.35)";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("RUN", 612, 205);
  }
}

function drawBloodStain(x, y, w, h, rotation) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  const gradient = ctx.createRadialGradient(0, 0, 2, 0, 0, Math.max(w, h) * 0.7);
  gradient.addColorStop(0, "rgba(130, 10, 22, 0.5)");
  gradient.addColorStop(1, "rgba(40, 8, 14, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBloodTrail(x1, y1, x2, y2, width, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo((x1 + x2) / 2 + 8, (y1 + y2) / 2 - 6);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawWalls() {
  ctx.fillStyle = "#4a4a63";
  for (const wall of game.world.walls) {
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
  }
}

function drawMapObjects() {
  // オブジェクト固有の見た目は drawObjectShape に委譲する。
  for (const obj of game.world.interactables) {
    // 人影は細長い黒いシルエットとして描画し、周囲にわずかに滲むような描画にする
    if (obj.id === "shadow_figure") {
      ctx.save();
      ctx.shadowColor = "rgba(80, 0, 120, 0.6)";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "rgba(10, 5, 20, 0.92)";
      ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
      ctx.restore();
      continue; // 通常の描画をスキップ
    }

    drawObjectShape(obj);

    // Label plate with offset to avoid overlapping wall tops.
    const labelY = game.mapId === "map3"
      ? Math.min(WORLD.height - 8, obj.y + obj.h + 14)
      : Math.max(16, obj.y - 12);
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    const labelWidth = ctx.measureText(obj.label).width + 10;
    ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
    ctx.fillRect(obj.x + obj.w / 2 - labelWidth / 2, labelY - 12, labelWidth, 16);
    ctx.fillStyle = "#f0f0f5";
    ctx.fillText(obj.label, obj.x + obj.w / 2, labelY);
  }
}

function drawObjectShape(obj) {
  // Softer shadow for depth.
  ctx.fillStyle = "rgba(0, 0, 0, 0.20)";
  ctx.fillRect(obj.x + 4, obj.y + obj.h - 4, obj.w - 8, 6);

  if (obj.id === "frontdesk_ledger") {
    // Front desk: two-tone + border + base shadow.
    ctx.fillStyle = "#7c6859";
    ctx.fillRect(obj.x, obj.y, obj.w, Math.floor(obj.h * 0.42));
    ctx.fillStyle = "#5f4f43";
    ctx.fillRect(obj.x, obj.y + Math.floor(obj.h * 0.42), obj.w, Math.ceil(obj.h * 0.58));
    ctx.strokeStyle = "rgba(30, 20, 15, 0.8)";
    ctx.lineWidth = 2;
    ctx.strokeRect(obj.x + 1, obj.y + 1, obj.w - 2, obj.h - 2);
    return;
  }

  if (obj.id === "lobby_sofa") {
    // Sofa: backrest + seat.
    ctx.fillStyle = "#3f5874";
    ctx.fillRect(obj.x, obj.y, obj.w, 16);
    ctx.fillStyle = "#5d7d9d";
    ctx.fillRect(obj.x + 8, obj.y + 16, obj.w - 16, obj.h - 16);
    ctx.strokeStyle = "rgba(20, 30, 40, 0.85)";
    ctx.lineWidth = 2;
    ctx.strokeRect(obj.x + 1, obj.y + 1, obj.w - 2, obj.h - 2);
    return;
  }

  if (obj.id === "vending") {
    // Vending machine: button column + slot.
    ctx.fillStyle = "#3f4b66";
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    ctx.fillStyle = "#a8b7d9";
    ctx.fillRect(obj.x + 8, obj.y + 10, obj.w - 28, obj.h - 40);
    ctx.fillStyle = "#d9e2ff";
    for (let i = 0; i < 5; i += 1) {
      ctx.fillRect(obj.x + obj.w - 16, obj.y + 14 + i * 14, 6, 6);
    }
    ctx.fillStyle = "#222";
    ctx.fillRect(obj.x + 12, obj.y + obj.h - 18, obj.w - 24, 6);
    return;
  }

  if (obj.id === "generator_bank") {
    // Generator bank: dark body + vent lines.
    ctx.fillStyle = "#4d5566";
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    ctx.fillStyle = "#2a2f3b";
    for (let i = 0; i < 5; i += 1) {
      ctx.fillRect(obj.x + 10 + i * 22, obj.y + 16, 14, 4);
      ctx.fillRect(obj.x + 10 + i * 22, obj.y + 30, 14, 4);
    }
    ctx.fillStyle = "#cc4444";
    ctx.fillRect(obj.x + obj.w - 14, obj.y + 10, 6, 6);
    return;
  }

  if (obj.id === "pipe_rack") {
    // Pipe rack: horizontal pipes and valve dots.
    ctx.fillStyle = "#41585d";
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    ctx.strokeStyle = "#8aa0a8";
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i += 1) {
      const y = obj.y + 10 + i * 12;
      ctx.beginPath();
      ctx.moveTo(obj.x + 8, y);
      ctx.lineTo(obj.x + obj.w - 8, y);
      ctx.stroke();
    }
    ctx.fillStyle = "#c57d3f";
    ctx.fillRect(obj.x + 18, obj.y + 8, 5, 5);
    ctx.fillRect(obj.x + obj.w - 24, obj.y + 20, 5, 5);
    return;
  }

  if (obj.id === "control_console") {
    // Control console: panel and tiny status lights.
    ctx.fillStyle = "#5a5f4f";
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    ctx.fillStyle = "#2b2f28";
    ctx.fillRect(obj.x + 8, obj.y + 8, obj.w - 16, obj.h - 16);
    ctx.fillStyle = "#6ad06a";
    ctx.fillRect(obj.x + 16, obj.y + 14, 4, 4);
    ctx.fillStyle = "#d8bf5a";
    ctx.fillRect(obj.x + 26, obj.y + 14, 4, 4);
    ctx.fillStyle = "#cc5a5a";
    ctx.fillRect(obj.x + 36, obj.y + 14, 4, 4);
    return;
  }

  if (obj.id === "machine_room") {
    // Machine room block: heavy frame + vent + warning stripe.
    ctx.fillStyle = "#5a4f3b";
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    ctx.fillStyle = "#2b241c";
    ctx.fillRect(obj.x + 10, obj.y + 12, obj.w - 20, obj.h - 24);
    ctx.fillStyle = "#77715f";
    for (let i = 0; i < 4; i += 1) {
      ctx.fillRect(obj.x + 18 + i * 36, obj.y + 20, 18, 4);
    }
    ctx.fillStyle = "#d9b24a";
    ctx.fillRect(obj.x + 8, obj.y + obj.h - 12, obj.w - 16, 4);
    return;
  }

  if (obj.id === "breaker_task") {
    // Breaker panel: metal door + handle + alert lamp.
    ctx.fillStyle = "#58654f";
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    ctx.fillStyle = "#2d3528";
    ctx.fillRect(obj.x + 8, obj.y + 8, obj.w - 16, obj.h - 16);
    ctx.fillStyle = "#b7bcc7";
    ctx.fillRect(obj.x + obj.w - 20, obj.y + obj.h / 2 - 10, 4, 20);
    ctx.fillStyle = "#d56d4d";
    ctx.fillRect(obj.x + 14, obj.y + 14, 6, 6);
    return;
  }

  if (obj.id === "stairs_to_1f") {
    // Service lift: shutter door + hazard border.
    ctx.fillStyle = "#4d5f77";
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    ctx.fillStyle = "#2a3341";
    ctx.fillRect(obj.x + 12, obj.y + 14, obj.w - 24, obj.h - 26);
    ctx.strokeStyle = "#dbbe58";
    ctx.lineWidth = 2;
    ctx.strokeRect(obj.x + 8, obj.y + 10, obj.w - 16, obj.h - 20);
    for (let i = 0; i < 6; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? "#c7a640" : "#2a3341";
      ctx.fillRect(obj.x + 15 + i * 14, obj.y + 16, 10, 3);
    }
    return;
  }

  if (obj.id === "service_room_a" || obj.id === "wiring_room") {
    // Utility room block: reinforced panel style.
    ctx.fillStyle = obj.color;
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    ctx.strokeStyle = "rgba(20, 20, 24, 0.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(obj.x + 1, obj.y + 1, obj.w - 2, obj.h - 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fillRect(obj.x + 8, obj.y + 8, obj.w - 16, 4);
    return;
  }

  if (obj.id === "drain_tunnel") {
    // Drain tunnel: grate pattern.
    ctx.fillStyle = "#41505a";
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    ctx.strokeStyle = "#7e93a1";
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i += 1) {
      const x = obj.x + 10 + i * 24;
      ctx.beginPath();
      ctx.moveTo(x, obj.y + 8);
      ctx.lineTo(x, obj.y + obj.h - 8);
      ctx.stroke();
    }
    return;
  }

  if (obj.id === "elevator_to_2f" || obj.id === "elevator_to_1f") {
    // Elevator: split door + top lamp.
    ctx.fillStyle = "#6a6a74";
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    ctx.fillStyle = "#7f7f8d";
    ctx.fillRect(obj.x + 6, obj.y + 20, Math.floor((obj.w - 14) / 2), obj.h - 26);
    ctx.fillRect(obj.x + Math.ceil(obj.w / 2), obj.y + 20, Math.floor((obj.w - 14) / 2), obj.h - 26);
    ctx.strokeStyle = "#2e2e34";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(obj.x + obj.w / 2, obj.y + 20);
    ctx.lineTo(obj.x + obj.w / 2, obj.y + obj.h - 6);
    ctx.stroke();
    ctx.fillStyle = "#f2d46d";
    ctx.fillRect(obj.x + obj.w / 2 - 9, obj.y + 6, 18, 6);
    return;
  }

  // Default object style.
  ctx.fillStyle = obj.color;
  ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.fillRect(obj.x + 4, obj.y + 4, Math.max(10, obj.w - 8), 3);
}

function drawRoomLabels() {
  ctx.fillStyle = "#c6c6d4";
  ctx.font = "14px sans-serif";
  ctx.textAlign = "center";

  if (game.mapId === "map1") {
    ctx.fillText("1Fロビー", 470, 430);
    ctx.fillText("エレベーターホール", 760, 95);
    ctx.fillText("受付", 380, 110);
  } else if (game.mapId === "map2") {
    ctx.fillText("2F客室廊下", 470, 245);
    ctx.fillText("客室201", 130, 92);
    ctx.fillText("客室202", 310, 92);
    ctx.fillText("客室203", 490, 92);
    ctx.fillText("客室204", 670, 92);
    ctx.fillText("客室205", 850, 92);
  } else if (game.mapId === "map3") {
    ctx.fillText("B1サービス廊下", 470, 260);
    ctx.fillText("補機室", 165, 92);
    ctx.fillText("配線室", 475, 92);
    ctx.fillText("排水通路", 420, 490);
  }
}

function drawKeys() {
  for (const keyItem of game.world.keys) {
    if (keyItem.collected) continue;

    ctx.beginPath();
    ctx.arc(keyItem.x, keyItem.y, keyItem.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#f0d060";
    ctx.fill();

    ctx.fillStyle = "#111";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(keyItem.name.replace("Key", "K"), keyItem.x, keyItem.y + 4);
  }
}

function drawExitDoor() {
  const door = game.world.exitDoor;
  if (!door) return;

  ctx.fillStyle = door.unlocked ? "#4caf50" : "#9e2a2b";
  ctx.fillRect(door.x, door.y, door.w, door.h);

  ctx.fillStyle = "#f7f7f7";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(door.unlocked ? "出口(E)" : "施錠中", door.x - 8, door.y + door.h / 2);
}

function drawInteractHint() {
  if (dialogue.active || game.paused || mapManager.transition.active) return;
  const target = game.interaction.nearest;
  if (!target) return;

  // Highlight nearest target.
  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  ctx.lineWidth = 2;
  ctx.shadowColor = "rgba(255, 255, 255, 0.4)";
  ctx.shadowBlur = 8;

  if (target.kind === "key") {
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.strokeRect(target.x - 2, target.y - 2, target.w + 4, target.h + 4);
  }

  ctx.shadowBlur = 0;

  // Prompt UI near the target.
  const promptX = target.kind === "key" ? target.x : target.x + target.w / 2;
  const promptY = target.kind === "key" ? target.y - 22 : target.y - 12;
  const text = target.prompt || "E / Space: 調べる";
  ctx.font = "13px sans-serif";
  ctx.textAlign = "center";

  const textW = ctx.measureText(text).width + 14;
  ctx.fillStyle = "rgba(5, 5, 8, 0.8)";
  ctx.fillRect(promptX - textW / 2, promptY - 14, textW, 20);
  ctx.fillStyle = "#f2f2f7";
  ctx.fillText(text, promptX, promptY);
}

function drawHoldInteractGauge() {
  if (dialogue.active || game.paused || mapManager.transition.active) return;
  const target = game.interaction.nearest;
  if (!target) return;

  const ratio = game.interaction.hold.getProgressRatio();
  if (ratio <= 0) return;

  const centerX = game.player.x + game.player.w / 2;
  const centerY = game.player.y - 10;
  const radius = 10;

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
  ctx.strokeStyle = "#7de3ff";
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawShadowHint() {
  if (game.effects.shadowHintTimer <= 0) return;
  const alpha = (game.effects.shadowHintTimer / SHADOW_HINT_DURATION) * 0.65;
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;

  if (game.effects.shadowHintSide === "left") {
    ctx.beginPath();
    ctx.moveTo(0, 180);
    ctx.lineTo(90, 230);
    ctx.lineTo(80, 320);
    ctx.lineTo(0, 360);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(WORLD.width, 190);
    ctx.lineTo(WORLD.width - 100, 240);
    ctx.lineTo(WORLD.width - 85, 330);
    ctx.lineTo(WORLD.width, 375);
    ctx.closePath();
    ctx.fill();
  }
}

function drawChaser() {
  if (!game.chaser.active || game.chaser.mapId !== game.mapId || game.chaser.spawnDelay > 0) return;

  const x = Math.round(game.chaser.x);
  const y = Math.round(game.chaser.y);
  const pulse = 0.7 + Math.sin(performance.now() * 0.012) * 0.18;

  ctx.save();
  ctx.shadowColor = "rgba(80, 0, 120, 0.55)";
  ctx.shadowBlur = 14;

  ctx.fillStyle = `rgba(10, 6, 18, ${0.9 * pulse})`;
  ctx.fillRect(x + 4, y + 3, 10, 10); // head
  ctx.fillRect(x + 3, y + 13, 12, 10); // torso
  ctx.fillRect(x + 2, y + 18, 4, 8); // left arm
  ctx.fillRect(x + 12, y + 18, 4, 8); // right arm
  ctx.fillRect(x + 4, y + 23, 4, 3); // left leg
  ctx.fillRect(x + 10, y + 23, 4, 3); // right leg

  ctx.fillStyle = "rgba(215, 25, 35, 0.9)";
  ctx.fillRect(x + 7, y + 8, 2, 2);
  ctx.fillRect(x + 10, y + 8, 2, 2);
  ctx.restore();
}

function drawChaseDangerOverlay() {
  if (!game.chaser.active || game.chaser.mapId !== game.mapId || game.chaser.spawnDelay > 0) return;
  const playerCenter = getCenter(game.player);
  const chaserCenter = getCenter(game.chaser);
  const distance = Math.hypot(playerCenter.x - chaserCenter.x, playerCenter.y - chaserCenter.y);
  if (distance > 170) return;

  const alpha = Math.max(0, Math.min(0.25, (170 - distance) / 170 * 0.25));
  ctx.fillStyle = `rgba(120, 0, 0, ${alpha})`;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
}

function drawDarknessOverlay() {
  if (game.debug) return;

  const baseDarkness = getMapDarknessBase();
  const darkness = Math.max(0, Math.min(1, baseDarkness * game.settings.darknessMultiplier));
  if (darkness <= 0.01) return;

  const centerX = game.player.x + game.player.w / 2;
  const centerY = game.player.y + game.player.h / 2;
  const radius = game.lightOn ? 200 : 130;

  // 暗闇はオフスクリーンに作って最後に合成する。
  darknessCtx.clearRect(0, 0, 960, 540);
  darknessCtx.globalCompositeOperation = "source-over";
  darknessCtx.fillStyle = `rgba(0, 0, 0, ${darkness})`;
  darknessCtx.fillRect(0, 0, 960, 540);

  // プレイヤー周辺を切り抜く（中心が明るく、外が暗い）
  darknessCtx.globalCompositeOperation = "destination-out";
  const gradient = darknessCtx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, radius
  );
  gradient.addColorStop(0,   "rgba(0,0,0,1)");
  gradient.addColorStop(0.6, "rgba(0,0,0,0.7)");
  gradient.addColorStop(1,   "rgba(0,0,0,0)");
  darknessCtx.fillStyle = gradient;
  darknessCtx.beginPath();
  darknessCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  darknessCtx.fill();

  // メインcanvasに転写（ここではsource-overのまま）
  ctx.drawImage(darknessCanvas, 0, 0);
}

function getMapDarknessBase() {
  if (game.mapId === "map1") return 0.42; // weak dark
  if (game.mapId === "map2") return 0.60; // medium dark
  return 0.76; // B1 strong dark
}

function drawMapFadeOverlay() {
  const alpha = mapManager.getFadeAlpha();
  if (alpha <= 0) return;
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
}

function drawBloodFlashOverlay() {
  if (game.effects.bloodFlashTimer <= 0) return;
  const ratio = game.effects.bloodFlashTimer / (game.settings.reduceFlash ? BLOOD_FLASH_DURATION * 0.5 : BLOOD_FLASH_DURATION);
  const alphaMax = game.settings.reduceFlash ? 0.24 : 0.44;
  const alpha = Math.max(0, Math.min(alphaMax, alphaMax * ratio));
  ctx.fillStyle = `rgba(170, 0, 0, ${alpha})`;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
}

/*
  Draws a tiny human-like sprite with pixel blocks.
  Facing changes shirt color and limb placement slightly.
*/
function drawPlayerSprite() {
  const p = game.player;
  const x = Math.round(p.x);
  const y = Math.round(p.y);
  const playerImage = imageAssets.get("player");

  if (playerImage) {
    ctx.drawImage(playerImage, x, y, PLAYER_SPRITE_W, PLAYER_SPRITE_H);
    return;
  }

  const skin = "#f0c6a8";
  const hair = "#1d1c22";

  const shirtByFacing = {
    up: "#3f6bb2",
    down: "#6ea8ff",
    left: "#5f8fdf",
    right: "#5f8fdf",
  };

  const shirt = shirtByFacing[p.facing] || "#6ea8ff";
  const pants = "#2f3140";
  const shoes = "#111";

  // Head + hair
  ctx.fillStyle = skin;
  ctx.fillRect(x + 4, y, 8, 6);
  ctx.fillStyle = hair;
  ctx.fillRect(x + 3, y, 10, 2);

  // Eyes depend on facing
  if (p.facing === "down") {
    ctx.fillStyle = "#111";
    ctx.fillRect(x + 6, y + 3, 1, 1);
    ctx.fillRect(x + 9, y + 3, 1, 1);
  }

  // Body
  ctx.fillStyle = shirt;
  ctx.fillRect(x + 4, y + 6, 8, 8);

  // Arms (small facing variation)
  ctx.fillStyle = skin;
  if (p.facing === "left") {
    ctx.fillRect(x + 2, y + 7, 2, 6);
    ctx.fillRect(x + 11, y + 8, 2, 4);
  } else if (p.facing === "right") {
    ctx.fillRect(x + 3, y + 8, 2, 4);
    ctx.fillRect(x + 12, y + 7, 2, 6);
  } else {
    ctx.fillRect(x + 2, y + 7, 2, 5);
    ctx.fillRect(x + 12, y + 7, 2, 5);
  }

  // Legs + shoes
  ctx.fillStyle = pants;
  ctx.fillRect(x + 4, y + 14, 3, 8);
  ctx.fillRect(x + 9, y + 14, 3, 8);

  ctx.fillStyle = shoes;
  ctx.fillRect(x + 4, y + 22, 3, 2);
  ctx.fillRect(x + 9, y + 22, 3, 2);
}

function drawPauseOverlay() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.fillStyle = "#ffffff";
  ctx.font = "28px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("PAUSED", WORLD.width / 2, WORLD.height / 2);
  ctx.font = "16px sans-serif";
  ctx.fillText("Pキーで再開", WORLD.width / 2, WORLD.height / 2 + 30);
}

function drawDebugOverlay() {
  const p = game.player;
  const objective = objectiveText.textContent;
  const keysState = `U:${input.move.up} D:${input.move.down} L:${input.move.left} R:${input.move.right}`;
  const hitbox = getPlayerHitbox(p.x, p.y);

  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(10, 10, 580, 136);

  ctx.fillStyle = "#9fffa1";
  ctx.font = "14px monospace";
  ctx.textAlign = "left";
  ctx.fillText("Debug: ON", 18, 30);
  ctx.fillText(`Map: ${game.world.name} (${game.mapId})`, 18, 50);
  ctx.fillText(`Player: x=${p.x.toFixed(1)} y=${p.y.toFixed(1)} facing=${p.facing}`, 18, 70);
  ctx.fillText(`Keys: ${keysState}`, 18, 90);
  ctx.fillText(`Hitbox: x=${hitbox.x.toFixed(1)} y=${hitbox.y.toFixed(1)} w=${hitbox.w} h=${hitbox.h}`, 18, 110);
  ctx.fillText(`Objective: ${objective}`, 18, 130);
}

function drawCollisionDebug() {
  // Draw wall rectangles in debug mode.
  for (const wall of game.world.walls) {
    ctx.fillStyle = "rgba(255, 60, 60, 0.20)";
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
  }

  // Highlight current collision rectangles more strongly.
  for (const wall of game.debugCollisions) {
    ctx.fillStyle = "rgba(255, 60, 60, 0.48)";
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
  }

  // Also draw the actual collision hitbox used for physics.
  const hitbox = getPlayerHitbox(game.player.x, game.player.y);
  ctx.strokeStyle = "rgba(80, 220, 255, 0.9)";
  ctx.lineWidth = 2;
  ctx.strokeRect(hitbox.x, hitbox.y, hitbox.w, hitbox.h);
}

// ------------------------------------------------------------
// 9) Collision + helpers
// ------------------------------------------------------------
function rectsOverlap(a, b) {
  // AABB（軸平行矩形）同士のシンプルな当たり判定。
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function getBlockingRects() {
  return getBlockingRectsForMap(game.world);
}

function getBlockingRectsForMap(world) {
  // 壁 + blockingオブジェクト = 通行不可の集合。
  const blockingObjects = world.interactables.filter((obj) => obj.blocking);
  return [...world.walls, ...blockingObjects];
}

function getFirstCollisionWall(candidate, walls) {
  for (const wall of walls) {
    if (rectsOverlap(candidate, wall)) {
      return wall;
    }
  }
  return null;
}

function getPlayerHitbox(nextX, nextY) {
  // player.x/y is top-left of the sprite. Hitbox is inset for smoother movement.
  return {
    x: nextX + HITBOX_INSET_X,
    y: nextY + HITBOX_INSET_Y,
    w: PLAYER_SPRITE_W - HITBOX_INSET_X * 2,
    h: PLAYER_SPRITE_H - HITBOX_INSET_Y * 2,
  };
}

function getChaserHitbox(nextX, nextY) {
  return {
    x: nextX + CHASER_HITBOX_INSET,
    y: nextY + CHASER_HITBOX_INSET,
    w: CHASER_SPRITE_W - CHASER_HITBOX_INSET * 2,
    h: CHASER_SPRITE_H - CHASER_HITBOX_INSET * 2,
  };
}

function isPlayerCollidingAt(x, y, world) {
  const hitbox = getPlayerHitbox(x, y);
  const wallHit = getFirstCollisionWall(hitbox, getBlockingRectsForMap(world));
  if (wallHit) return true;
  if (world.exitDoor && !world.exitDoor.unlocked && rectsOverlap(hitbox, world.exitDoor)) {
    return true;
  }
  return false;
}

function spawnSafePosition(world, desiredSpawn) {
  // 希望座標が危険なら、外側へ広げながら近い安全座標を探す。
  if (!isPlayerCollidingAt(desiredSpawn.x, desiredSpawn.y, world)) {
    return { x: desiredSpawn.x, y: desiredSpawn.y };
  }

  const step = 6;
  const maxRadius = 220;
  for (let r = step; r <= maxRadius; r += step) {
    for (let dx = -r; dx <= r; dx += step) {
      const candidateTop = { x: desiredSpawn.x + dx, y: desiredSpawn.y - r };
      const candidateBottom = { x: desiredSpawn.x + dx, y: desiredSpawn.y + r };
      if (isSpawnCandidateSafe(world, candidateTop)) return candidateTop;
      if (isSpawnCandidateSafe(world, candidateBottom)) return candidateBottom;
    }
    for (let dy = -r + step; dy <= r - step; dy += step) {
      const candidateLeft = { x: desiredSpawn.x - r, y: desiredSpawn.y + dy };
      const candidateRight = { x: desiredSpawn.x + r, y: desiredSpawn.y + dy };
      if (isSpawnCandidateSafe(world, candidateLeft)) return candidateLeft;
      if (isSpawnCandidateSafe(world, candidateRight)) return candidateRight;
    }
  }

  // Last resort: keep desired location instead of crashing.
  return { x: desiredSpawn.x, y: desiredSpawn.y };
}

function isSpawnCandidateSafe(world, point) {
  const minX = 20;
  const minY = 20;
  const maxX = WORLD.width - 20 - PLAYER_SPRITE_W;
  const maxY = WORLD.height - 20 - PLAYER_SPRITE_H;
  if (point.x < minX || point.y < minY || point.x > maxX || point.y > maxY) {
    return false;
  }
  return !isPlayerCollidingAt(point.x, point.y, world);
}

function getCenter(entity) {
  // 中心座標は距離計算・追跡計算で使う基本ヘルパー。
  return {
    x: entity.x + entity.w / 2,
    y: entity.y + entity.h / 2,
  };
}

function distancePointToRect(point, rectEntity) {
  const closestX = Math.max(rectEntity.x, Math.min(point.x, rectEntity.x + rectEntity.w));
  const closestY = Math.max(rectEntity.y, Math.min(point.y, rectEntity.y + rectEntity.h));
  const dx = point.x - closestX;
  const dy = point.y - closestY;
  return Math.hypot(dx, dy);
}

function saveCheckpoint() {
  if (!game) return;
  // 復帰に必要な最小データだけ保存（マップ/位置/タスク進行など）。
  game.checkpoint = {
    mapId: game.mapId,
    spawn: { x: game.player.x, y: game.player.y },
    tasks: { ...game.tasks },
    inventory: [...game.inventory],
    latestMemo: game.latestMemo,
    emotion: game.emotion,
    flags: { ...game.flags },
  };
}

function restoreFromCheckpoint() {
  if (!game || !game.checkpoint) {
    resetGame();
    return;
  }

  // 1) マップを再構築 -> 2) セーブ位置を安全座標に補正 -> 3) 進行状態を復元
  const cp = game.checkpoint;
  mapManager.resetMaps();
  mapManager.transition.active = false;
  mapManager.transition.elapsed = 0;

  game.mapId = cp.mapId;
  game.world = mapManager.getMap(cp.mapId);
  const safe = spawnSafePosition(game.world, cp.spawn);
  game.player.x = safe.x;
  game.player.y = safe.y;
  game.safeSpot = { x: safe.x, y: safe.y };

  game.tasks = { ...cp.tasks };
  game.inventory = [...cp.inventory];
  game.latestMemo = cp.latestMemo;
  game.emotion = cp.emotion;
  game.flags = { ...cp.flags };

  game.ending = false;
  game.endingType = null;
  game.paused = false;
  game.interaction.nearest = null;
  game.interaction.hold.reset();
  game.effects.bloodFlashTimer = 0;
  game.effects.shakeTimer = 0;
  game.effects.shadowHintTimer = 0;
  game.effects.escapeCinematicTimer = 0;
  game.effects.escapeCinematicActive = false;
  game.effects.endrollTimer = 0;
  game.effects.endrollActive = false;

  if (game.world.exitDoor) {
    game.world.exitDoor.unlocked = areAllTasksComplete();
  }

  if (game.tasks.taskCBreaker) {
    ambientAudio.setHighTensionFootsteps(true);
    if (!game.flags.chaserGone) {
      placeChaserInCurrentMap(CHASER_SPAWN_DELAY);
    }
  } else {
    ambientAudio.setHighTensionFootsteps(false);
    game.chaser.active = false;
  }

  endingScreen.classList.add("hidden");
  refreshHUD();
}

// ------------------------------------------------------------
// 10) Start
// ------------------------------------------------------------
game = createInitialGameState();
refreshHUD();
requestAnimationFrame((timestamp) => {
  lastTime = timestamp;
  requestAnimationFrame(gameLoop);
});
