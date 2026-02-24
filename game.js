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
const mobileControls = document.getElementById("mobileControls");
const mobileJoystickBase = document.getElementById("mobileJoystickBase");
const mobileStatusTask = document.getElementById("mobileStatusTask");
const mobileStatusObjective = document.getElementById("mobileStatusObjective");

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
const CHASER_BASE_SPEED = 118;
const CHASER_RUSH_SPEED = 138;
const CHASER_SPAWN_DELAY = 1.5;
const RESCUE_HOLD_SECONDS = 0.6;
const LIGHT_MAX_CHARGE = 100;
const LIGHT_DRAIN_PER_SEC = 1.35;
const LIGHT_RECOVER_PER_SEC = 1.65;
const BLOOD_FLASH_DURATION = 0.18;
const SHAKE_DURATION = 0.25;
const SHADOW_HINT_DURATION = 0.15;
const ESCAPE_CINEMATIC_DURATION = 2.2;
const ENDROLL_DURATION = 58;
const ROOM203_DOOR = { x: 822, y: 170, w: 56, h: 20 };
const ROOM2_DOORS = [
  { id: "room201", x: 102, y: 170, w: 56, h: 20 },
  { id: "room202", x: 282, y: 170, w: 56, h: 20 },
  { id: "room204", x: 462, y: 170, w: 56, h: 20 },
  { id: "room205", x: 642, y: 170, w: 56, h: 20 },
  { id: "room203", x: ROOM203_DOOR.x, y: ROOM203_DOOR.y, w: ROOM203_DOOR.w, h: ROOM203_DOOR.h },
];
const STORY_FRAGMENT_BY_OBJECT = {
  room201_wardrobe: {
    key: "diary",
    title: "日記の切れ端",
    lines: [
      "『23:10 チェックイン。終電を逃した。』",
      "『約束の相手は203にいるはずだった。』",
      "『顔を見るまでは帰れない。話さなきゃいけない。』",
    ],
  },
  room202_desk: {
    key: "receipt",
    title: "レシート",
    lines: [
      "『ビジネスホテル 1泊 / 支払者: YUTO T. / 時刻 23:48』",
      "『自販機 水 / レジ担当: 203?』",
      "印字の最後が滲んでいて、部屋番号だけ読める。",
    ],
  },
  room204_bath: {
    key: "photo",
    title: "写真",
    lines: [
      "ホテル前で笑う悠斗と、もう一人の男の写真。",
      "男の顔だけが強く擦り潰されている。",
      "裏面に『203で会う。逃げるな』と走り書き。",
    ],
  },
  room205_wardrobe: {
    key: "memo",
    title: "メモ片",
    lines: [
      "『終電を逃した夜、203で待つ。』",
      "『お前は忘れたふりをする。だから証拠を残す。』",
      "『もし俺が消えても、記録を拾え。』",
    ],
  },
  front_flower_wood: {
    key: "entry_photo",
    title: "エントランス写真",
    lines: [
      "ロビー入口の記念写真。日付は今日のはずなのに、時刻が空欄になっている。",
      "写真の端に『203は同じ顔を二度通す』と薄く書かれている。",
      "写っている悠斗の影だけが二重にブレている。",
    ],
  },
  machine_room: {
    key: "maintenance_log",
    title: "保守ログ",
    lines: [
      "『非常電源切替 00:13 / 担当: YUTO』",
      "『監視対象: 203 コピー進行 83%』",
      "最終行だけ手書きで『本体優先。外部搬出禁止』。",
    ],
  },
  drain_tunnel: {
    key: "wet_note",
    title: "濡れたメモ",
    lines: [
      "水で滲んだ走り書き。",
      "『もし記録がズレたら、先に部屋を全部見ること。203を最後に』",
      "『隠れる時はライトを消せ。3秒でも点けると見つかる』",
      "『本物の俺は、先に気づけなかった』",
    ],
  },
  back_office: {
    key: "staff_note",
    title: "スタッフメモ",
    lines: [
      "『夜間は203を優先監視。対象が自分の記録を照合し始めたら地下へ誘導』",
      "『フロントに人は置くな。反応すると学習が乱れる』",
      "署名欄は空白。日付だけが明日のまま更新され続けている。",
    ],
  },
  vending: {
    key: "vending_slip",
    title: "自販機売上票",
    lines: [
      "売上票の最新行に『水 1本 / 23:48 / 203』とある。",
      "その下に同じ行が同じ時刻で3回連続で印字されている。",
      "『同じ夜を繰り返している』という走り書きが端に残っている。",
    ],
  },
  service_room_a: {
    key: "service_tag",
    title: "作業員タグ",
    lines: [
      "汚れた名札タグ:『YUTO / B1保守当番』。",
      "裏面に『顔が同じでも歩幅が違う。見分けろ』とメモ。",
      "紐は新しい。最近ここに置かれたようだ。",
    ],
  },
};

function createEmptyFragmentsState() {
  const state = {};
  for (const frag of Object.values(STORY_FRAGMENT_BY_OBJECT)) {
    state[frag.key] = false;
  }
  return state;
}

function normalizeFragmentsState(source) {
  const base = createEmptyFragmentsState();
  if (!source) return base;
  for (const key of Object.keys(base)) {
    base[key] = !!source[key];
  }
  return base;
}

function getFragmentEntries() {
  return Object.values(STORY_FRAGMENT_BY_OBJECT);
}

function getTotalFragmentCount() {
  return getFragmentEntries().length;
}

function getCollectedFragmentCount() {
  const entries = getFragmentEntries();
  let count = 0;
  for (const frag of entries) {
    if (game.fragments && game.fragments[frag.key]) count += 1;
  }
  return count;
}

const ASSET_PATHS = {
  img: {
    player: "assets/img/player.png",
    yutoStand: "assets/img/yuto.png",
    portraitYuto: "assets/img/portrait_yuto.png",
    portraitMemo: "assets/img/portrait_memo.png",
  },
  bgm: {
    main: "assets/bgm/main.mp3",
    horror: "assets/bgm/horror.mp3",
    ending: "assets/bgm/ending.mp3",
  },
  sfx: {
    pickup: "assets/sfx/pickup.wav",
    door: "assets/sfx/door.wav",
    doorOld: "assets/sfx/door.mp3",
    step: "assets/sfx/step.wav",
    scare: "assets/sfx/scare.wav",
    shower: "assets/sfx/shower.mp3",
    water: "assets/sfx/water.mp3",
    clock: "assets/sfx/clock.mp3",
    title: "assets/sfx/title.mp3",
    dissonance: "assets/sfx/dissonance.mp3",
    bird: "assets/sfx/bird.mp3",
    bite: "assets/sfx/bite.mp3",
    eat: "assets/sfx/eat.mp3",
    menaaa: "assets/sfx/menaaa.mp3",
    toru: "assets/sfx/toru.mp3",
    heartbeatSlow: "assets/sfx/Heartbeat(Slow-Reverb).wav",
    heartbeatFast: "assets/sfx/Heartbeat(Fast-Reverb).wav",
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
    this.horrorBgmBoost = 1.25;
    this.bgmDuckMultiplier = 1;
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
    const record = this.bgm[key];
    if (!record || !record.available || !this.activated) return;

    // If already playing this BGM, don't restart every frame.
    if (this.currentBgmKey === key && !record.audio.paused) return;

    // Stop any other BGM track before switching.
    for (const [otherKey, otherRecord] of Object.entries(this.bgm)) {
      if (otherKey === key) continue;
      otherRecord.audio.pause();
    }

    this.currentBgmKey = key;
    record.audio.volume = this.getEffectiveBgmVolume(key);
    if (record.audio.paused) {
      record.audio.currentTime = 0;
    }
    record.audio.play().catch(() => {});
  }

  setBGMVolume(value) {
    this.bgmVolume = value;
    if (!this.currentBgmKey) return;
    const record = this.bgm[this.currentBgmKey];
    if (!record) return;
    record.audio.volume = this.getEffectiveBgmVolume(this.currentBgmKey);
  }

  setBGMDuckMultiplier(value) {
    this.bgmDuckMultiplier = Math.max(0, Math.min(1, value));
    if (!this.currentBgmKey) return;
    const record = this.bgm[this.currentBgmKey];
    if (!record) return;
    record.audio.volume = this.getEffectiveBgmVolume(this.currentBgmKey);
  }

  setMuted(muted) {
    this.muted = muted;
    if (!this.currentBgmKey) return;
    const record = this.bgm[this.currentBgmKey];
    if (!record) return;
    record.audio.volume = this.getEffectiveBgmVolume(this.currentBgmKey);
  }

  stopBGM() {
    if (!this.currentBgmKey) return;
    const record = this.bgm[this.currentBgmKey];
    if (!record) return;
    record.audio.pause();
  }

  playSE(name) {
    const record = this.sfx[name];
    if (!record || !record.available || !this.activated || this.muted) return false;

    record.audio.currentTime = 0;
    record.audio.play().catch(() => {});
    return true;
  }

  playSEIfStopped(name) {
    const record = this.sfx[name];
    if (!record || !record.available || !this.activated || this.muted) return false;
    if (!record.audio.paused && !record.audio.ended) return true;
    record.audio.currentTime = 0;
    record.audio.play().catch(() => {});
    return true;
  }

  stopSE(name) {
    const record = this.sfx[name];
    if (!record) return;
    record.audio.pause();
    record.audio.currentTime = 0;
  }

  getEffectiveBgmVolume(key) {
    if (this.muted) return 0;
    const boost = key === "horror" ? this.horrorBgmBoost : 1;
    return Math.max(0, Math.min(1, this.bgmVolume * boost * this.bgmDuckMultiplier));
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

  playHeartbeat() {
    if (!this.context || !this.masterGain) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(56, now);
    osc.frequency.exponentialRampToValueAtTime(44, now + 0.16);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.075, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.24);
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

function playOldDoorSE() {
  audioManager.playSE("doorOld");
}

function playStepSE() {
  audioManager.playSE("step");
}

function stopStepSE() {
  audioManager.stopSE("step");
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

function playShowerSE() {
  audioManager.playSE("shower");
}

function playWaterDropSE() {
  return audioManager.playSE("water");
}

function playFragmentSE() {
  audioManager.playSE("toru");
}

function playHeartbeatSlowSE() {
  return audioManager.playSEIfStopped("heartbeatSlow");
}

function playHeartbeatFastSE() {
  return audioManager.playSEIfStopped("heartbeatFast");
}

function stopHeartbeatSEs() {
  audioManager.stopSE("heartbeatSlow");
  audioManager.stopSE("heartbeatFast");
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
  analog: {
    active: false,
    x: 0,
    y: 0,
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
  input.analog.active = false;
  input.analog.x = 0;
  input.analog.y = 0;
  mobileTouchState.pointerToKey.clear();
  mobileTouchState.activeKeys.clear();
  mobileTouchState.joystickPointerId = null;
  resetMobileJoystick();
  if (mobileControls) {
    const activeButtons = mobileControls.querySelectorAll(".is-active");
    for (const btn of activeButtons) {
      btn.classList.remove("is-active");
    }
  }
  refreshDirectionInputs();
});

function wasJustPressed(...keys) {
  return keys.some((k) => input.justPressed.has(k));
}

function isHeld(...keys) {
  return keys.some((k) => input.held.has(k));
}

// Mobile touch buttons map into the same input set as keyboard.
const mobileTouchState = {
  pointerToKey: new Map(),
  activeKeys: new Set(),
  joystickPointerId: null,
};

function setMobileKeyHeld(key, pressed, pointerId, element) {
  if (!key) return;
  if (pressed) {
    activateAudioSystems();
    if (!input.held.has(key)) {
      input.justPressed.add(key);
    }
    input.held.add(key);
    mobileTouchState.activeKeys.add(key);
    if (element) element.classList.add("is-active");
    if (typeof pointerId === "number") {
      mobileTouchState.pointerToKey.set(pointerId, key);
    }
  } else {
    input.held.delete(key);
    mobileTouchState.activeKeys.delete(key);
    if (element) element.classList.remove("is-active");
    if (typeof pointerId === "number") {
      mobileTouchState.pointerToKey.delete(pointerId);
    }
  }
  refreshDirectionInputs();
}

function bindMobileControls() {
  if (!mobileControls) return;
  const buttons = mobileControls.querySelectorAll("[data-key]");
  for (const button of buttons) {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      const key = button.dataset.key;
      setMobileKeyHeld(key, true, event.pointerId, button);
      if (button.setPointerCapture) {
        button.setPointerCapture(event.pointerId);
      }
    });
    const release = (event) => {
      event.preventDefault();
      const keyFromPointer = mobileTouchState.pointerToKey.get(event.pointerId) || button.dataset.key;
      setMobileKeyHeld(keyFromPointer, false, event.pointerId, button);
    };
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
    button.addEventListener("contextmenu", (event) => event.preventDefault());
  }
}

bindMobileControls();

function bindMobileJoystick() {
  if (!mobileJoystickBase) return;

  const onDown = (event) => {
    event.preventDefault();
    activateAudioSystems();
    mobileTouchState.joystickPointerId = event.pointerId;
    if (mobileJoystickBase.setPointerCapture) {
      mobileJoystickBase.setPointerCapture(event.pointerId);
    }
    updateMobileJoystickFromEvent(event);
  };

  const onMove = (event) => {
    if (mobileTouchState.joystickPointerId !== event.pointerId) return;
    event.preventDefault();
    updateMobileJoystickFromEvent(event);
  };

  const onUp = (event) => {
    if (mobileTouchState.joystickPointerId !== event.pointerId) return;
    event.preventDefault();
    mobileTouchState.joystickPointerId = null;
    resetMobileJoystick();
  };

  mobileJoystickBase.addEventListener("pointerdown", onDown);
  mobileJoystickBase.addEventListener("pointermove", onMove);
  mobileJoystickBase.addEventListener("pointerup", onUp);
  mobileJoystickBase.addEventListener("pointercancel", onUp);
  mobileJoystickBase.addEventListener("lostpointercapture", onUp);
  mobileJoystickBase.addEventListener("contextmenu", (event) => event.preventDefault());
}

function updateMobileJoystickFromEvent(event) {
  if (!mobileJoystickBase) return;
  const rect = mobileJoystickBase.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const rawX = event.clientX - cx;
  const rawY = event.clientY - cy;
  const maxRadius = rect.width * 0.34;
  const dist = Math.hypot(rawX, rawY);
  const scale = dist > maxRadius ? maxRadius / dist : 1;
  const dx = rawX * scale;
  const dy = rawY * scale;

  mobileJoystickBase.style.setProperty("--jx", `${dx}px`);
  mobileJoystickBase.style.setProperty("--jy", `${dy}px`);

  const nx = dx / maxRadius;
  const ny = dy / maxRadius;
  const mag = Math.hypot(nx, ny);
  if (mag < 0.14) {
    input.analog.active = false;
    input.analog.x = 0;
    input.analog.y = 0;
    return;
  }
  input.analog.active = true;
  input.analog.x = nx;
  input.analog.y = ny;
}

function resetMobileJoystick() {
  if (mobileJoystickBase) {
    mobileJoystickBase.style.setProperty("--jx", "0px");
    mobileJoystickBase.style.setProperty("--jy", "0px");
  }
  input.analog.active = false;
  input.analog.x = 0;
  input.analog.y = 0;
}

bindMobileJoystick();

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
    this.holdAdvanceTimer = 0;
    this.holdAdvancePrimed = false;
    this.holdAdvanceDelay = 0.52;
    this.holdAdvanceInterval = 0.42;

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
    this.holdAdvanceTimer = 0;
    this.holdAdvancePrimed = false;
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
    const holdAdvance = isHeld("space", "enter");

    if (wantsAdvance) {
      // If still typing, reveal full line immediately.
      if (this.isTyping()) {
        this.visibleChars = line.text.length;
      } else {
        this.advance();
      }
      this.holdAdvanceTimer = 0;
      this.holdAdvancePrimed = false;
      return;
    }

    // Long-press: keep advancing lines continuously while Space/Enter is held.
    if (holdAdvance) {
      if (!this.isTyping()) {
        this.holdAdvanceTimer += dt;
        const required = this.holdAdvancePrimed ? this.holdAdvanceInterval : this.holdAdvanceDelay;
        if (this.holdAdvanceTimer >= required) {
          this.holdAdvanceTimer = 0;
          this.holdAdvancePrimed = true;
          this.advance();
          return;
        }
      }
    } else {
      this.holdAdvanceTimer = 0;
      this.holdAdvancePrimed = false;
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
    if (speaker === "メモ") {
      return;
    }

    const portraitImage = speaker === "メモ"
      ? imageAssets.get("portraitMemo")
      : imageAssets.get("portraitYuto");

    if (portraitImage) {
      // 歪み防止: アスペクト比を保持して表示（必要なら左右に余白）。
      drawImageContainTop(this.ctx, portraitImage, x + 4, y + 4, size - 8, size - 8);
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
    if (gameState.flags.chaserAwakened && !gameState.flags.chaserGone && fromMapId !== toMapId && !gameState.tasks.taskCBreaker) {
      gameState.flags.chaserGone = true;
      gameState.chaser.active = false;
      dialogue.start([
        { speaker: "悠斗", text: "……足音が消えた。" },
        { speaker: "悠斗", text: "まいたのか？ 今は、追ってこない。" },
      ], { autoAdvanceMs: 1400 });
    }

    if (toMapId === "map3" && !gameState.flags.b1EntryForeshadowPlayed) {
      gameState.flags.b1EntryForeshadowPlayed = true;
      gameState.latestMemo = "地下に入った瞬間、胸騒ぎがした。";
      setEmotion("不安");
      dialogue.start([
        { speaker: "悠斗", text: "……地下。なんで俺、ここに来てる。" },
        { speaker: "悠斗", text: "帰るべきだろ。……でも、戻ったら“あれ”がいる。" },
        { speaker: "悠斗", text: "……選択肢がない。" },
      ], { autoAdvanceMs: 1700 });
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

    // 受付エリア上壁（受付オブジェクトと重ならないように少し短く）
    rect(220, 80, 320, 20),

    // エレベーターホール（上・右のみ。左は開けてロビーから入れる）
    rect(620, 80, 280, 20),
    rect(880, 80, 20, 210),
  ];

  const exitDoor = {
    x: 920,
    y: 110,
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
      x: 620,
      y: 380,
      w: 170,
      h: 50,
      color: "#49607a",
      blocking: true,
      interaction: [
        { speaker: "悠斗", text: "ソファに何かが染み込んでいる。黒い。…血、か？" },
        { speaker: "悠斗", text: "でも乾いている。ずっと前から、ここにある。" },
      ],
    },
    {
      id: "frontdesk_ledger",
      label: "受付",
      x: 240,
      y: 110,
      w: 280,
      h: 58,
      color: "#6c5a4e",
      blocking: true,
      interaction: [{ speaker: "悠斗", text: "宿泊台帳を調べる。" }],
    },
    {
      id: "back_office",
      label: "従業員用ドア",
      x: 320,
      y: 22,
      w: 140,
      h: 52,
      color: "#4d4c56",
      blocking: true,
      interaction: [
        { speaker: "悠斗", text: "ドアの隙間から紙切れが落ちている。" },
        { speaker: "悠斗", text: "『逃げるな。お前はもうチェックインしている』" },
      ],
    },
    {
      id: "public_restroom_m",
      label: "男性用トイレ",
      x: 60,
      y: 200,
      w: 95,
      h: 85,
      color: "#5b666f",
      blocking: true,
      interaction: [
        { speaker: "悠斗", text: "鏡に文字が書いてある。口紅で。" },
        { speaker: "悠斗", text: "『まだいるの』" },
        { speaker: "悠斗", text: "…俺のことか？" },
      ],
    },
    {
      id: "public_restroom_f",
      label: "女性用トイレ",
      x: 60,
      y: 300,
      w: 95,
      h: 85,
      color: "#5c6074",
      blocking: true,
      interaction: [{ speaker: "悠斗", text: "個室の奥から水音だけが続いている。" }],
    },
    {
      id: "elevator_to_2f",
      label: "EV→2F",
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
      label: "階段→B1",
      x: 60,
      y: 410,
      w: 70,
      h: 90,
      color: "#4f5a47",
      blocking: true,
      mapChange: { toMapId: "map3", spawnKey: "fromMap1" },
      interaction: [{ speaker: "悠斗", text: "スタッフ通路の先にB1がある。" }],
    },
    {
      id: "lobby_hide_wardrobe",
      label: "清掃ロッカー",
      x: 28,
      y: 425,
      w: 24,
      h: 90,
      color: "#4b5564",
      blocking: true,
      interaction: [{ speaker: "悠斗", text: "清掃ロッカー。身を隠せそうだ。" }],
    },
    {
      id: "lobby_table",
      label: "ロビー机",
      x: 620,
      y: 455,
      w: 170,
      h: 34,
      color: "#6a5b4d",
      blocking: true,
      interaction: [{ speaker: "悠斗", text: "観光パンフレットが古いまま積まれている。" }],
    },
    {
      id: "front_flower_wood",
      label: "置物",
      x: 540,
      y: 175,
      w: 80,
      h: 34,
      color: "#6d5a48",
      blocking: true,
      interaction: [{ speaker: "悠斗", text: "木の鉢に花が挿してある。妙に新しい。" }],
    },
    {
      id: "front_silent_staff",
      label: "受付係",
      x: 372,
      y: 100,
      w: 24,
      h: 34,
      color: "#2a2d3b",
      blocking: true,
      interaction: [{ speaker: "悠斗", text: "目は合っているのに、まったく反応しない。" }],
    },
    {
      id: "lobby_guest",
      label: "宿泊客",
      x: 705,
      y: 402,
      w: 22,
      h: 30,
      color: "#2a2d3b",
      blocking: true,
      interaction: [{ speaker: "悠斗", text: "……反応がない。微動だにしない。" }],
    },
    {
      id: "vending",
      label: "自販機",
      x: 840,
      y: 245,
      w: 62,
      h: 100,
      color: "#3f4b66",
      blocking: true,
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
      y: 100,
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
      fromMap2: { x: 740, y: 230 },
      fromMap3: { x: 87, y: 496 },
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
    rect(20, 170, 82, 20),
    rect(158, 170, 124, 20),
    rect(338, 170, 124, 20),
    rect(518, 170, 124, 20),
    rect(698, 170, 124, 20),
    rect(878, 170, 62, 20),

    // 部屋の仕切り（廊下上壁より上のみ。廊下には突き出さない）
    rect(200, 20, 20, 150),
    rect(380, 20, 20, 150),
    rect(560, 20, 20, 150),
    rect(740, 20, 20, 150),

    // 下側の部屋列（客室206/207 + リネン室）
    rect(300, 320, 72, 20),
    rect(428, 320, 154, 20),
    rect(638, 320, 164, 20),
    rect(858, 320, 82, 20),
    rect(300, 320, 20, 200),
    rect(500, 320, 20, 200),
    rect(720, 320, 20, 200),
  ];

  const interactables = [
    {
      id: "room201",
      label: "",
      x: 102,
      y: 170,
      w: 56,
      h: 20,
      color: "#7b5a3b",
      blocking: false,
      interaction: [{ speaker: "悠斗", text: "201号室のドアを開けた。" }],
    },
    {
      id: "room202",
      label: "",
      x: 282,
      y: 170,
      w: 56,
      h: 20,
      color: "#7b5a3b",
      blocking: false,
      interaction: [{ speaker: "悠斗", text: "202号室のドアを開けた。" }],
    },
    {
      id: "room204",
      label: "",
      x: 462,
      y: 170,
      w: 56,
      h: 20,
      color: "#7b5a3b",
      blocking: false,
      interaction: [{ speaker: "悠斗", text: "204号室のドアを開けた。" }],
    },
    {
      id: "room205",
      label: "",
      x: 642,
      y: 170,
      w: 56,
      h: 20,
      color: "#7b5a3b",
      blocking: false,
      interaction: [{ speaker: "悠斗", text: "205号室のドアを開けた。" }],
    },
    { id: "room203_door", label: "", x: 822, y: 170, w: 56, h: 20, color: "#7b5a3b", blocking: false, interaction: [{ speaker: "悠斗", text: "203号室のドアだ。" }] },
    { id: "room203_task", label: "", x: 762, y: 22, w: 76, h: 38, color: "#4f5563", blocking: false, interaction: [{ speaker: "悠斗", text: "203号室のベッドを調べる。" }] },
    { id: "room201_bed", label: "", x: 20, y: 22, w: 76, h: 38, color: "#6d6f88", blocking: true, interaction: null },
    { id: "room201_wardrobe", label: "", x: 184, y: 22, w: 16, h: 56, color: "#5a4f49", blocking: true, interaction: [{ speaker: "悠斗", text: "クローゼットを開けると、湿った制服の匂いがした。" }] },
    { id: "room201_desk", label: "", x: 20, y: 140, w: 24, h: 28, color: "#63564a", blocking: true, interaction: null },
    { id: "room201_bath", label: "", x: 150, y: 104, w: 50, h: 64, color: "#4f6071", blocking: true, interaction: null },
    { id: "room202_bed", label: "", x: 222, y: 22, w: 76, h: 38, color: "#6d6f88", blocking: true, interaction: null },
    { id: "room202_wardrobe", label: "", x: 358, y: 22, w: 16, h: 56, color: "#5a4f49", blocking: true, interaction: null },
    { id: "room202_desk", label: "", x: 222, y: 140, w: 24, h: 28, color: "#63564a", blocking: true, interaction: [{ speaker: "悠斗", text: "机の引き出しは空だ。内側に爪で引っかいた跡だけがある。" }] },
    { id: "room202_bath", label: "", x: 328, y: 104, w: 50, h: 64, color: "#4f6071", blocking: true, interaction: null },
    { id: "room204_bed", label: "", x: 402, y: 22, w: 76, h: 38, color: "#6d6f88", blocking: true, interaction: null },
    { id: "room204_wardrobe", label: "", x: 538, y: 22, w: 16, h: 56, color: "#5a4f49", blocking: true, interaction: null },
    { id: "room204_desk", label: "", x: 402, y: 140, w: 24, h: 28, color: "#63564a", blocking: true, interaction: null },
    { id: "room204_bath", label: "", x: 508, y: 104, w: 50, h: 64, color: "#4f6071", blocking: true, interaction: [{ speaker: "悠斗", text: "浴室の鏡が曇っている。指でなぞると『みてる』の文字が出た。" }] },
    { id: "room205_bed", label: "", x: 582, y: 22, w: 76, h: 38, color: "#6d6f88", blocking: true, interaction: null },
    { id: "room205_wardrobe", label: "", x: 718, y: 22, w: 16, h: 56, color: "#5a4f49", blocking: true, interaction: [{ speaker: "悠斗", text: "クローゼットの中で、ハンガーだけがゆっくり揺れている。" }] },
    { id: "room205_desk", label: "", x: 582, y: 140, w: 24, h: 28, color: "#63564a", blocking: true, interaction: null },
    { id: "room205_bath", label: "", x: 688, y: 104, w: 50, h: 64, color: "#4f6071", blocking: true, interaction: null },
    { id: "room203_bed", label: "", x: 762, y: 22, w: 76, h: 38, color: "#6d6f88", blocking: true, interaction: [{ speaker: "悠斗", text: "ここが…俺の寝床だったのか。" }] },
    { id: "room203_wardrobe", label: "", x: 922, y: 22, w: 16, h: 56, color: "#5a4f49", blocking: true, interaction: null },
    { id: "room203_desk", label: "", x: 762, y: 140, w: 24, h: 28, color: "#63564a", blocking: true, interaction: null },
    { id: "room203_bath", label: "", x: 888, y: 104, w: 50, h: 64, color: "#4f6071", blocking: true, interaction: null },
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
      label: "EV→1F",
      x: 70,
      y: 360,
      w: 110,
      h: 110,
      color: "#5a5a67",
      blocking: true,
      mapChange: { toMapId: "map1", spawnKey: "fromMap2" },
      interaction: [{ speaker: "悠斗", text: "1Fへ戻る。" }],
    },
    {
      id: "room206_door",
      label: "",
      x: 372,
      y: 320,
      w: 56,
      h: 20,
      color: "#7b5a3b",
      blocking: true,
      interaction: [{ speaker: "悠斗", text: "206号室は施錠されている。" }],
    },
    {
      id: "room207_door",
      label: "",
      x: 582,
      y: 320,
      w: 56,
      h: 20,
      color: "#7b5a3b",
      blocking: true,
      interaction: [{ speaker: "悠斗", text: "207号室は施錠されている。" }],
    },
    {
      id: "linen_room_door",
      label: "",
      x: 802,
      y: 320,
      w: 56,
      h: 20,
      color: "#7b5a3b",
      blocking: false,
      interaction: [{ speaker: "悠斗", text: "リネン室のドアを開けた。" }],
    },
    { id: "room206_bed", label: "", x: 324, y: 344, w: 76, h: 38, color: "#6d6f88", blocking: true, interaction: null },
    { id: "room206_wardrobe", label: "", x: 482, y: 344, w: 16, h: 56, color: "#5a4f49", blocking: true, interaction: null },
    { id: "room206_desk", label: "", x: 324, y: 490, w: 24, h: 28, color: "#63564a", blocking: true, interaction: null },
    { id: "room206_bath", label: "", x: 448, y: 454, w: 50, h: 64, color: "#4f6071", blocking: true, interaction: null },
    { id: "room207_bed", label: "", x: 524, y: 344, w: 76, h: 38, color: "#6d6f88", blocking: true, interaction: null },
    { id: "room207_wardrobe", label: "", x: 702, y: 344, w: 16, h: 56, color: "#5a4f49", blocking: true, interaction: null },
    { id: "room207_desk", label: "", x: 524, y: 490, w: 24, h: 28, color: "#63564a", blocking: true, interaction: null },
    { id: "room207_bath", label: "", x: 668, y: 454, w: 50, h: 64, color: "#4f6071", blocking: true, interaction: null },
  ];

  return {
    id: "map2",
    name: "2F Guest Floor",
    walls,
    keys: [],
    exitDoor: null,
    interactables,
    spawns: {
      default: { x: 100, y: 476 },
      fromMap1: { x: 100, y: 476 },
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
    // メイン廊下の上壁（ドア開口とぴったり合わせる）
    rect(20, 140, 130, 20),
    rect(190, 140, 265, 20),
    rect(495, 140, 165, 20),
    rect(760, 140, 180, 20),
    // メイン廊下の下壁（階段上は開放。ドア開口と位置を一致）
    rect(20, 400, 50, 20),
    rect(200, 400, 80, 20),
    rect(320, 400, 350, 20),
    rect(710, 400, 140, 20),
    rect(890, 400, 50, 20),
    // 上段の縦仕切り
    rect(320, 20, 20, 120),
    rect(620, 20, 20, 120),
    // 下段の縦仕切り
    rect(260, 420, 20, 100),
    rect(560, 420, 20, 100),
    rect(820, 420, 20, 100),
  ];

  const interactables = [
    {
      id: "machine_room",
      label: "機械室",
      x: 450,
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
      x: 790,
      y: 40,
      w: 110,
      h: 90,
      color: "#58654f",
      blocking: true,
      interaction: [{ speaker: "悠斗", text: "非常電源盤。ここを上げれば…。" }],
    },
    {
      id: "generator_bank",
      label: "発電機列",
      x: 240,
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
      id: "b1_door_service_a",
      label: "",
      x: 150,
      y: 140,
      w: 40,
      h: 20,
      color: "#6b5846",
      blocking: true,
      interaction: [{ speaker: "悠斗", text: "重いドアだが開く。" }],
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
      id: "b1_door_wiring",
      label: "",
      x: 455,
      y: 140,
      w: 40,
      h: 20,
      color: "#6b5846",
      blocking: true,
      interaction: [{ speaker: "悠斗", text: "配線室のドアが軋む音を立てた。" }],
    },
    {
      id: "b1_door_lower_left",
      label: "",
      x: 280,
      y: 400,
      w: 40,
      h: 20,
      color: "#6b5846",
      blocking: true,
      interaction: [{ speaker: "悠斗", text: "下段区画へ降りる。" }],
    },
    {
      id: "b1_door_lower_right",
      label: "",
      x: 670,
      y: 400,
      w: 40,
      h: 20,
      color: "#6b5846",
      blocking: true,
      interaction: [{ speaker: "悠斗", text: "右下区画へ続くドアだ。" }],
    },
    {
      id: "b1_door_lower_right_2",
      label: "",
      x: 850,
      y: 400,
      w: 40,
      h: 20,
      color: "#6b5846",
      blocking: true,
      interaction: [{ speaker: "悠斗", text: "向こう側で、何かが軋む音がした。" }],
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
      x: 430,
      y: 330,
      w: 190,
      h: 45,
      color: "#4a6261",
      blocking: true,
      interaction: [{ speaker: "悠斗", text: "配管の継ぎ目から、冷たい水滴が落ちる。" }],
    },
    {
      id: "b1_hide_wardrobe_a",
      label: "工具ロッカー",
      x: 22,
      y: 240,
      w: 26,
      h: 96,
      color: "#4b5564",
      blocking: true,
      interaction: [{ speaker: "悠斗", text: "金属ロッカー。中に隠れられる。" }],
    },
    {
      id: "b1_hide_wardrobe_b",
      label: "保守ロッカー",
      x: 912,
      y: 250,
      w: 26,
      h: 96,
      color: "#4b5564",
      blocking: true,
      interaction: [{ speaker: "悠斗", text: "ここも身を隠せる。息を整えよう。" }],
    },
    {
      id: "control_console",
      label: "制御卓",
      x: 900,
      y: 270,
      w: 40,
      h: 120,
      color: "#5a5f4f",
      blocking: true,
      interaction: [{ speaker: "悠斗", text: "警告ランプだけが点滅している。" }],
    },
    {
      id: "stairs_to_1f",
      label: "階段→1F",
      x: 90,
      y: 430,
      w: 90,
      h: 70,
      color: "#4d5f77",
      blocking: true,
      mapChange: { toMapId: "map1", spawnKey: "fromMap3" },
      interaction: [{ speaker: "悠斗", text: "1Fへ戻る。" }],
    },
    {
      id: "feeding_scene",
      label: "血の跡",
      x: 850,
      y: 430,
      w: 74,
      h: 76,
      color: "#3a2328",
      blocking: true,
      interaction: [
        { speaker: "悠斗", text: "隣の部屋の小窓から、黒い影が何かを貪っているのが見えた。" },
        { speaker: "悠斗", text: "骨を噛む音だ。見つかる前に離れろ。" },
      ],
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
      default: { x: 130, y: 340 },
      fromMap1: { x: 120, y: 496 },
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
      detourSign: 1,
      detourLockTimer: 0,
      introLockTimer: 0,
      hitLockTimer: 0,
      stuckTimer: 0,
      lastX: safeSpawn.x + 80,
      lastY: safeSpawn.y + 40,
    },
    mapId,
    world: startMap,
    inventory: [],
    tasks: {
      taskAFrontDesk: false,
      taskBRoom203: false,
      taskCBreaker: false,
    },
    roomChecks: {
      room201: false,
      room202: false,
      room204: false,
      room205: false,
    },
    roomDoorsOpened: {
      room201: false,
      room202: false,
      room204: false,
      room205: false,
      room203: false,
    },
    emotion: "安心",
    ending: false,
    endingType: null,
    paused: false,
    debug: false,
    latestMemo: "まだ何も見つかっていない。",
    debugCollisions: [],
    stepTimer: 0,
    lightOn: false,
    light: {
      charge: LIGHT_MAX_CHARGE,
      maxCharge: LIGHT_MAX_CHARGE,
    },
    settings: {
      darknessMultiplier: darknessStrengthSlider ? Number.parseFloat(darknessStrengthSlider.value) || 0.9 : 0.9,
      reduceFlash: reduceFlashCheckbox ? reduceFlashCheckbox.checked : false,
    },
    effects: {
      bloodFlashTimer: 0,
      shakeTimer: 0,
      shadowHintTimer: 0,
      shadowHintSide: "left",
      chaserSpawnCueTimer: 0,
      chaserSpawnCueX: 0,
      chaserSpawnCueY: 0,
      escapeCinematicTimer: 0,
      escapeCinematicActive: false,
      endrollTimer: 0,
      endrollActive: false,
    },
    endroll: {
      lines: [],
      unlockedCount: 0,
      totalCount: 0,
    },
    flags: {
      taskBFlashPlayed: false,
      taskCShadowPlayed: false,
      chaserAwakened: false,
      chaserGone: false,
      breakerRoomUnlocked: false,
      forceChaseActive: false,
      b1FeedingNoticed: false,
      b1FeedingRetreatWarned: false,
      b1FeedingChaseTriggered: false,
      b1DoorAmbushTriggered: false,
      room203ExitAmbushTriggered: false,
      room203HideSurvived: false,
      room204205ReappearTriggered: false,
      lastCaughtByLockerLight: false,
      b1EntryForeshadowPlayed: false,
      b1ReturnTalkPlayed: false,
      linenDoorOpened: false,
      linenCenterTalkPlayed: false,
      finalChasePending: false,
      lightTutorialShown: false,
      lightEmptyWarned: false,
      lightFirstOnExplained: false,
      pauseGuideShown: false,
      fragmentPauseHint3Shown: false,
      fragmentPauseHint6Shown: false,
      fragmentPauseHint10Shown: false,
    },
    b1DoorAmbush: {
      active: false,
      timer: 0,
      secondSpawnDone: false,
    },
    fragments: createEmptyFragmentsState(),
    stats: {
      runTimeSec: 0,
      caughtCount: 0,
      rescueCount: 0,
      chaseStartCount: 0,
      usedDebug: false,
      mapVisited: { map1: true, map2: false, map3: false },
      escapedWithLightOff: false,
    },
    audioEvents: {
      clockTimer: 0,
      nextClockAt: 18 + Math.random() * 12,
      birdTimer: 0,
      nextBirdAt: 12 + Math.random() * 10,
      waterTimer: 0,
      nextWaterAt: 6 + Math.random() * 8,
      chaseSeTimer: 0,
      nextChaseSeAt: 1.8,
      chaseSeFlip: false,
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
    pauseView: "help",
    checkpoint: null,
    hide: {
      active: false,
      sourceId: "",
      startedUnderThreat: false,
      mode: "normal",
      timer: 0,
      duration: 0,
      heartbeatTimer: 0,
      footstepTimer: 0,
      tensionSeTimer: 0,
      monologueStage: 0,
      monologueTimer: 0,
    },
    hallucination: {
      // カメラ外の端を横切る影
      edgeShadowActive: false,
      edgeShadowX: -40,
      edgeShadowY: 220,
      edgeShadowDir: 1,
      edgeShadowSpeed: 260,
      edgeShadowTimer: 0,
      nextEdgeShadowAt: 6 + Math.random() * 8,
      // 一瞬だけ立つ幻覚NPC
      standNpcActive: false,
      standNpcX: 480,
      standNpcY: 228,
      standNpcLife: 0,
      standNpcSeen: false,
      standNpcCloseFade: false,
      nextStandNpcAt: 8 + Math.random() * 10,
      monologueCooldown: 0,
      anxietyTimer: 0,
      nextAnxietyAt: 18 + Math.random() * 14,
    },
  };
}

function playIntroDialogue() {
  playTitleSE();
  // ライト説明を導入会話に統合して、後段トリガー時の体感ラグを避ける。
  game.flags.lightTutorialShown = true;
  dialogue.start([
    {
      speaker: "悠斗",
      text: "『203号室の宿泊者』",
    },
    {
      speaker: "悠斗",
      text: "……やっと着いた。今日はさすがにキツい。",
    },
    {
      speaker: "悠斗",
      text: "チェックイン……したよな。鍵、受け取った記憶ある。なのに、フロント……誰もいない。",
    },
    {
      speaker: "悠斗",
      text: "まぁ、夜勤の人が裏にいるだけか。……いるよな？",
    },
    {
      speaker: "悠斗",
      text: "……いや、静かすぎる。空調の音、こんなに小さかったっけ。",
    },
    {
      speaker: "悠斗",
      text: "……暗い。まずライトをつける。Shift か L で切り替えられるはずだ。",
    },
    {
      speaker: "悠斗",
      text: "状況を整理したい時はPで一時停止できる。ポーズ中に操作説明も見返せる。",
    },
    {
      speaker: "悠斗",
      text: "とりあえず部屋。寝て、起きて、明日をやる。それだけ。",
    },
    {
      speaker: "悠斗",
      text: "……入口が開かない？ 落ち着け。フロントに非常解錠があるはずだ。",
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
  stopHeartbeatSEs();
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
    stopStepSE();
    stopHeartbeatSEs();
    refreshHUD();
    return;
  }

  if (wasJustPressed("h")) {
    game.debug = !game.debug;
    if (game.debug) {
      game.stats.usedDebug = true;
    }
  }
  if (wasJustPressed("l", "shift")) {
    toggleLight();
  }

  mapManager.update(dt, game);
  if (game.stats && game.stats.mapVisited) {
    game.stats.mapVisited[game.mapId] = true;
  }
  updateHorrorEffects(dt);
  ambientAudio.update(dt, game.mapId);
  updateBGMByState();

  if (!game.ending && !game.paused) {
    game.stats.runTimeSec += dt;
  }

  if (game.ending) {
    stopStepSE();
    stopHeartbeatSEs();
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

  if (game.effects.escapeCinematicActive) {
    stopStepSE();
    stopHeartbeatSEs();
    updateEscapeCinematic(dt);
    refreshHUD();
    return;
  }

  if (game.effects.endrollActive) {
    stopStepSE();
    stopHeartbeatSEs();
    objectiveText.textContent = `${buildObjectiveChecklistText()}\n\nエンドロール再生中…`;
    updateEndroll(dt);
    refreshHUD();
    return;
  }

  // During dialogue, movement stops and only dialogue input is processed.
  if (dialogue.active) {
    stopStepSE();
    if (!game.hide.active) {
      stopHeartbeatSEs();
    }
    game.interaction.hold.reset();
    game.interaction.nearest = null;
    dialogue.update(dt);
    refreshHUD();
    return;
  }

  if (mapManager.transition.active) {
    stopStepSE();
    stopHeartbeatSEs();
    game.interaction.hold.reset();
    game.interaction.nearest = null;
    refreshHUD();
    return;
  }

  updateLightTutorialHint();

  if (wasJustPressed("p")) {
    game.paused = !game.paused;
  }

  if (game.paused) {
    stopStepSE();
    stopHeartbeatSEs();
    if (wasJustPressed("1")) game.pauseView = "help";
    if (wasJustPressed("2")) game.pauseView = "fragments";
    if (wasJustPressed("3")) game.pauseView = "achievements";
    game.interaction.hold.reset();
    game.interaction.nearest = null;
    refreshHUD();
    return;
  }

  updateLightCharge(dt);
  updateWorldSfx(dt);
  updateHallucinationEvents(dt);

  // Hold R to escape from stuck positions by warping to recent safe spot.
  updateRescueHold(dt);

  if (game.hide.active) {
    stopStepSE();
    updateHideState(dt);
    refreshHUD();
    return;
  }
  stopHeartbeatSEs();

  movePlayer(dt);
  updateB1FeedingEvent();
  updateB1TaskCAutoAmbush();
  updateFinalChaseTrigger();
  updateSafeSpot(dt);
  updateChaser(dt);
  updateB1DoorAmbush(dt);
  updateRoom203AutoExitAmbush();
  updateRoom204205ReappearTrigger();
  updateLinenRoomEvent();
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

function toggleLight() {
  if (game.lightOn) {
    game.lightOn = false;
    return;
  }

  if (game.light.charge <= 0.5) {
    if (!game.flags.lightEmptyWarned) {
      game.flags.lightEmptyWarned = true;
      game.latestMemo = "ライトの電池が切れている。少し待てば回復する。";
    }
    return;
  }
  game.lightOn = true;
  if (!game.flags.lightFirstOnExplained) {
    game.flags.lightFirstOnExplained = true;
    dialogue.start([
      { speaker: "悠斗", text: "……手回しの非常ライトしかない。電池式じゃない。" },
      { speaker: "悠斗", text: "点けっぱなしだとすぐ弱る。切っていれば少しずつ回復するはずだ。" },
    ]);
  }
}

function updateLightCharge(dt) {
  const light = game.light;
  if (!light) return;
  // ロッカー内ではライトの消耗/回復を止める（現状維持）。
  if (game.hide && game.hide.active) return;

  if (game.lightOn) {
    light.charge = Math.max(0, light.charge - LIGHT_DRAIN_PER_SEC * dt);
    if (light.charge <= 0.01) {
      game.lightOn = false;
      game.latestMemo = "ライトが消えた。いったん消灯して回復を待とう。";
      game.flags.lightEmptyWarned = true;
    }
  } else {
    light.charge = Math.min(light.maxCharge, light.charge + LIGHT_RECOVER_PER_SEC * dt);
    if (light.charge >= light.maxCharge * 0.2) {
      game.flags.lightEmptyWarned = false;
    }
  }
}

function updateLightTutorialHint() {
  if (game.flags.lightTutorialShown) return;
  if (game.mapId !== "map1" || game.ending || game.paused || dialogue.active || mapManager.transition.active) return;
  game.flags.lightTutorialShown = true;
  dialogue.start([
    { speaker: "悠斗", text: "……暗い。まずライトをつける。Shift か L で切り替えられるはずだ。" },
  ], { autoAdvanceMs: 1300 });
}

function updateHideState(dt) {
  const hide = game.hide;
  if (wasJustPressed("space")) {
    // 隠れ中はいつでも自分の意思で出られる。
    const wasUnderThreat = hide.startedUnderThreat;
    hide.active = false;
    hide.sourceId = "";
    hide.startedUnderThreat = false;
    hide.mode = "normal";
    hide.timer = 0;
    hide.duration = 0;
    hide.heartbeatTimer = 0;
    hide.footstepTimer = 0;
    hide.tensionSeTimer = 0;
    hide.monologueStage = 0;
    hide.monologueTimer = 0;
    stopHeartbeatSEs();
    if (wasUnderThreat) {
      game.latestMemo = "早く出すぎた。まだ近くにいるかもしれない。";
    } else {
      game.latestMemo = "隠れ場所から出た。";
    }
    return;
  }

  hide.timer += dt;
  hide.heartbeatTimer += dt;
  hide.footstepTimer += dt;
  hide.tensionSeTimer += dt;
  hide.monologueTimer += dt;

  // クローゼット内演出: 心音と遠い足音だけが聞こえる。
  const heartbeatInterval = hide.mode === "room203_escape"
    ? 0.45
    : hide.startedUnderThreat
      ? 0.56
      : 1.02;
  if (hide.heartbeatTimer >= heartbeatInterval) {
    hide.heartbeatTimer = 0;
    if (hide.startedUnderThreat) {
      audioManager.stopSE("heartbeatSlow");
    } else {
      audioManager.stopSE("heartbeatFast");
    }
    const played = hide.startedUnderThreat ? playHeartbeatFastSE() : playHeartbeatSlowSE();
    if (!played) {
      ambientAudio.playHeartbeat();
    }
  }
  // 隠れ中は足音SEを鳴らさない（不自然さ回避）。
  hide.footstepTimer = 0;
  if (hide.tensionSeTimer >= (hide.mode === "room203_escape" ? 2.0 : 2.6)) {
    hide.tensionSeTimer = 0;
    playWaterDropSE();
  }

  // 隠れ中の独り言（短い間を置いて2回まで）
  if (!dialogue.active) {
    if (hide.mode === "room203_escape") {
      if (hide.monologueStage === 0 && hide.monologueTimer >= 1.8) {
        hide.monologueStage = 1;
        dialogue.start([
          { speaker: "悠斗", text: "……目の前にいる気がする。" },
          { speaker: "悠斗", text: "息を殺せ。ここで見つかったら終わる。" },
        ], { autoAdvanceMs: 1100 });
      } else if (hide.monologueStage === 1 && hide.monologueTimer >= 5.2) {
        hide.monologueStage = 2;
        dialogue.start([
          { speaker: "悠斗", text: "ロッカー越しに影が動いた……まだいる。" },
          { speaker: "悠斗", text: "あと少し、耐えろ……。" },
        ], { autoAdvanceMs: 1100 });
      }
    } else if (hide.monologueStage === 0 && hide.monologueTimer >= 2.1) {
      hide.monologueStage = 1;
      dialogue.start([
        { speaker: "悠斗", text: "……鼓動がうるさい。落ち着け、まだ動くな。" },
      ], { autoAdvanceMs: 1200 });
    } else if (hide.monologueStage === 1 && hide.monologueTimer >= 5.0) {
      hide.monologueStage = 2;
      dialogue.start([
        { speaker: "悠斗", text: "息が浅い……。ここで音を立てたら終わる。" },
      ], { autoAdvanceMs: 1200 });
    }
  }

  if (game.lightOn && hide.timer >= 3) {
    const wasRoom203Escape = hide.mode === "room203_escape";
    hide.active = false;
    hide.sourceId = "";
    hide.startedUnderThreat = false;
    hide.mode = "normal";
    hide.timer = 0;
    hide.duration = 0;
    hide.heartbeatTimer = 0;
    hide.footstepTimer = 0;
    hide.tensionSeTimer = 0;
    hide.monologueStage = 0;
    hide.monologueTimer = 0;
    stopHeartbeatSEs();
    game.flags.chaserGone = false;
    game.flags.forceChaseActive = true;
    if (wasRoom203Escape) {
      game.flags.room203HideSurvived = false;
    }
    game.flags.lastCaughtByLockerLight = true;
    playOldDoorSE();
    playScareSE();
    playBiteSE();
    playEatSE();
    dialogue.start([
      { speaker: "悠斗", text: "……ライトを点けたままだった。" },
      { speaker: "悠斗", text: "扉が急に開いた――しまった、気づかれた！" },
    ], {
      autoAdvanceMs: 820,
      onComplete: () => {
        triggerCaughtEnding();
      },
    });
    return;
  }

  if (hide.timer < hide.duration) return;

  const wasUnderThreat = hide.startedUnderThreat;
  const wasRoom203Escape = hide.mode === "room203_escape";
  hide.active = false;
  hide.sourceId = "";
  hide.startedUnderThreat = false;
  hide.mode = "normal";
  hide.timer = 0;
  hide.duration = 0;
  hide.heartbeatTimer = 0;
  hide.footstepTimer = 0;
  hide.tensionSeTimer = 0;
  hide.monologueStage = 0;
  hide.monologueTimer = 0;
  stopHeartbeatSEs();

  if (wasUnderThreat) {
    // 追跡中に隠れた場合: やり過ごし成功で追跡者を離脱扱いにする。
    game.flags.chaserGone = true;
    game.flags.forceChaseActive = false;
    game.chaser.active = false;
    game.chaser.mapId = "map1";
    if (wasRoom203Escape) {
      game.flags.room203HideSurvived = true;
      game.flags.room204205ReappearTriggered = false;
    }
    game.latestMemo = "息を殺してやり過ごした。今のうちに進む。";
    dialogue.start([
      { speaker: "悠斗", text: "……行ったか。" },
      { speaker: "悠斗", text: wasRoom203Escape ? "大丈夫だ。今だけは離れた……落ち着いて動け。" : "今のうちに、ここを離れる。" },
    ], { autoAdvanceMs: 900 });
    return;
  }

  game.latestMemo = "しばらく隠れて呼吸を整えた。";
  dialogue.start([
    { speaker: "悠斗", text: "……少し、落ち着いた。" },
    { speaker: "悠斗", text: "まだ安心はできない。慎重に進む。" },
  ], { autoAdvanceMs: 900 });
}

function updateBGMByState() {
  const hideDuck = game.hide && game.hide.active ? 0.22 : 1;
  audioManager.setBGMDuckMultiplier(hideDuck);

  if (game.effects.escapeCinematicActive || game.effects.endrollActive || (game.ending && game.endingType === "Escaped")) {
    audioManager.playBGM("ending");
    return;
  }

  // Chase BGM is used only while the chaser is actively pursuing on the same map.
  const isChasingNow = (
    game.chaser &&
    game.chaser.active &&
    game.chaser.mapId === game.mapId &&
    game.chaser.spawnDelay <= 0 &&
    !game.ending &&
    !game.effects.escapeCinematicActive &&
    !game.effects.endrollActive
  );

  audioManager.playBGM(isChasingNow ? "horror" : "main");
}

function updateHallucinationEvents(dt) {
  const h = game.hallucination;
  if (!h) return;
  h.monologueCooldown = Math.max(0, h.monologueCooldown - dt);

  if (dialogue.active || game.paused || mapManager.transition.active || game.ending || (game.hide && game.hide.active) || isChaseActiveNow()) {
    h.edgeShadowActive = false;
    h.standNpcActive = false;
    return;
  }

  // ライトOFFの時だけ、低頻度で幻覚/不安音を出す。
  if (game.lightOn) {
    h.edgeShadowActive = false;
    h.standNpcActive = false;
    h.edgeShadowTimer = 0;
    return;
  }

  h.anxietyTimer += dt;
  if (h.anxietyTimer >= h.nextAnxietyAt) {
    h.anxietyTimer = 0;
    h.nextAnxietyAt = 20 + Math.random() * 18;
    if (Math.random() < 0.6) {
      playDissonanceSE();
    } else if (Math.random() < 0.5) {
      playWaterDropSE();
    } else {
      playBirdSE();
    }
  }

  // 1) カメラ外の影が横切る演出
  if (!h.edgeShadowActive) {
    h.edgeShadowTimer += dt;
    if (h.edgeShadowTimer >= h.nextEdgeShadowAt) {
      h.edgeShadowActive = true;
      h.edgeShadowTimer = 0;
      h.nextEdgeShadowAt = 16 + Math.random() * 16;
      h.edgeShadowDir = Math.random() > 0.5 ? 1 : -1;
      h.edgeShadowY = 170 + Math.random() * 190;
      h.edgeShadowX = h.edgeShadowDir > 0 ? -30 : WORLD.width + 30;
      triggerHallucinationMonologue("なんだ今……影が横切った？ 気のせいか。");
    }
  } else {
    h.edgeShadowX += h.edgeShadowDir * h.edgeShadowSpeed * dt;
    const playerCenter = getCenter(game.player);
    const distToShadow = Math.hypot(playerCenter.x - h.edgeShadowX, playerCenter.y - h.edgeShadowY);
    if (distToShadow <= 62) {
      // ぶつかった感を出さないため、近づいたら即フェードアウト。
      h.edgeShadowActive = false;
    }
    if (h.edgeShadowX > WORLD.width + 36 || h.edgeShadowX < -36) {
      h.edgeShadowActive = false;
    }
  }

  // 2) 一瞬だけ立つNPC（近づくと消える）
  if (!h.standNpcActive) {
    h.nextStandNpcAt -= dt;
    if (h.nextStandNpcAt <= 0) {
      const spots = getHallucinationStandSpots(game.mapId);
      const pick = spots[Math.floor(Math.random() * spots.length)];
      h.standNpcX = pick.x;
      h.standNpcY = pick.y;
      h.standNpcLife = 2.4;
      h.standNpcActive = true;
      h.standNpcCloseFade = false;
      h.nextStandNpcAt = 22 + Math.random() * 20;
      triggerHallucinationMonologue("……誰か立ってる？ いや、見間違いか。");
    }
  }

  if (h.standNpcActive) {
    h.standNpcLife -= dt;
    const playerCenter = getCenter(game.player);
    const dist = Math.hypot(playerCenter.x - h.standNpcX, playerCenter.y - h.standNpcY);
    if (dist <= 84) {
      h.standNpcCloseFade = true;
      h.standNpcLife = Math.min(h.standNpcLife, 0.35);
      game.latestMemo = "……今、誰か立っていた気がした。気のせいか？";
    }
    if (dist <= 48) {
      h.standNpcLife = 0;
    }
    if (h.standNpcLife <= 0) {
      h.standNpcActive = false;
    }
  }
}

function getHallucinationStandSpots(mapId) {
  if (mapId === "map1") {
    return [
      { x: 210, y: 340 },
      { x: 510, y: 340 },
      { x: 760, y: 330 },
    ];
  }
  if (mapId === "map3") {
    return [
      { x: 170, y: 270 },
      { x: 470, y: 272 },
      { x: 790, y: 268 },
    ];
  }
  return [
    { x: 132, y: 236 },
    { x: 322, y: 234 },
    { x: 548, y: 238 },
    { x: 782, y: 236 },
  ];
}

function triggerHallucinationMonologue(text) {
  const h = game.hallucination;
  if (!h || h.monologueCooldown > 0) return;
  if (dialogue.active || game.paused || game.ending || mapManager.transition.active || isChaseActiveNow()) return;
  h.monologueCooldown = 7.5;
  dialogue.start([{ speaker: "悠斗", text }], { autoAdvanceMs: 900 });
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
  if (input.analog.active) {
    dx += input.analog.x;
    dy += input.analog.y;
  }
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
    stopStepSE();
  }
}

function updateChaser(dt) {
  // 追跡者は Task B 後に有効化。デバッグ中も動作する（挙動確認しやすくするため）。
  if (!game.tasks.taskBRoom203 && !game.flags.forceChaseActive) {
    game.chaser.active = false;
    game.audioEvents.chaseSeTimer = 0;
    return;
  }
  if (game.flags.chaserGone) {
    game.chaser.active = false;
    game.audioEvents.chaseSeTimer = 0;
    game.chaser.stuckTimer = 0;
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
    game.chaser.stuckTimer = 0;
    game.chaser.lastX = game.chaser.x;
    game.chaser.lastY = game.chaser.y;
    return;
  }

  game.chaser.active = true;
  // 出現演出直後は少し硬直させ、理不尽な即死を防ぐ。
  if (game.chaser.introLockTimer > 0) {
    game.chaser.introLockTimer = Math.max(0, game.chaser.introLockTimer - dt);
    return;
  }
  if (game.chaser.hitLockTimer > 0) {
    game.chaser.hitLockTimer = Math.max(0, game.chaser.hitLockTimer - dt);
  }
  game.chaser.detourLockTimer = Math.max(0, game.chaser.detourLockTimer - dt);

  const playerCenter = getCenter(game.player);
  const chaserCenter = getCenter(game.chaser);
  const dx = playerCenter.x - chaserCenter.x;
  const dy = playerCenter.y - chaserCenter.y;
  const distance = Math.hypot(dx, dy) || 1;
  const speed = game.player.speed;
  const step = speed * dt;
  const moveX = (dx / distance) * step;
  const moveY = (dy / distance) * step;
  const beforeX = game.chaser.x;
  const beforeY = game.chaser.y;
  moveChaserWithDetour(moveX, moveY);
  const moved = Math.hypot(game.chaser.x - beforeX, game.chaser.y - beforeY);
  if (moved < 0.2) {
    game.chaser.stuckTimer += dt;
    if (game.chaser.stuckTimer >= 0.9) {
      rescueChaserFromStuck();
      game.chaser.stuckTimer = 0;
    }
  } else {
    game.chaser.stuckTimer = 0;
  }
  game.chaser.lastX = game.chaser.x;
  game.chaser.lastY = game.chaser.y;
  updateChaseSfx(dt, distance);

  const playerHitbox = getPlayerHitbox(game.player.x, game.player.y);
  const chaserHitbox = getChaserHitbox(game.chaser.x, game.chaser.y);
  if (game.chaser.hitLockTimer <= 0 && rectsOverlap(playerHitbox, chaserHitbox)) {
    triggerCaughtEnding();
  }
}

function updateRoom204205ReappearTrigger() {
  if (game.mapId !== "map2") return;
  if (!game.tasks.taskBRoom203) return;
  if (!game.flags.room203HideSurvived) return;
  // 2回目出現は「1回目をやり過ごして一度消えた状態」の時だけ許可する。
  if (!game.flags.chaserGone) return;
  if (game.flags.room204205ReappearTriggered) return;
  if (game.ending || game.paused || dialogue.active || mapManager.transition.active || game.hide.active) return;

  const center = getCenter(game.player);
  const passedBetween204And205 =
    center.x >= 585 &&
    center.x <= 670 &&
    center.y >= 194 &&
    center.y <= 318;
  if (!passedBetween204And205) return;

  game.flags.room204205ReappearTriggered = true;
  game.flags.chaserGone = false;
  game.flags.forceChaseActive = true;
  game.flags.chaserAwakened = true;
  const spawn = spawnSafePosition(game.world, { x: 908, y: 222 });
  game.chaser.x = spawn.x;
  game.chaser.y = spawn.y;
  game.chaser.mapId = "map2";
  game.chaser.spawnDelay = 0.18;
  game.chaser.active = false;
  game.chaser.detourSign = -1;
  game.chaser.detourLockTimer = 0;
  game.chaser.stuckTimer = 0;
  game.chaser.lastX = game.chaser.x;
  game.chaser.lastY = game.chaser.y;
  triggerChaserSpawnCue();
  setEmotion("恐怖");
  game.latestMemo = "右側の暗がりから影が出た。まだ終わっていない。";
  dialogue.start([
    { speaker: "悠斗", text: "……まだいたのか！" },
    { speaker: "悠斗", text: "1階に行くか、隠れろ……！" },
  ], { autoAdvanceMs: 880 });
  playScareSE();
  playMenaaaSE();
}

function updateRoom203AutoExitAmbush() {
  // Task B後、203ドアを再インタラクトしなくても「廊下へ出た瞬間」に追跡を開始する。
  if (game.mapId !== "map2") return;
  if (!game.tasks.taskBRoom203) return;
  // 1回目をロッカーでやり過ごした後は、203退出アンブッシュを再発させない。
  if (game.flags.room203HideSurvived) return;
  if (game.flags.room203ExitAmbushTriggered) return;
  if (game.ending || game.paused || dialogue.active || mapManager.transition.active || game.hide.active) return;

  const center = getCenter(game.player);
  const near203DoorX = center.x >= ROOM203_DOOR.x - 80 && center.x <= ROOM203_DOOR.x + ROOM203_DOOR.w + 80;
  const enteredHallwaySide = center.y >= ROOM203_DOOR.y + ROOM203_DOOR.h + 6;
  if (!near203DoorX || !enteredHallwaySide) return;

  startRoom203DoorAmbushChase();
}

function rescueChaserFromStuck() {
  const playerCenter = getCenter(game.player);
  const radius = 165;
  const offsets = [
    { x: radius, y: 0 },
    { x: -radius, y: 0 },
    { x: 0, y: radius },
    { x: 0, y: -radius },
    { x: radius * 0.75, y: radius * 0.75 },
    { x: -radius * 0.75, y: radius * 0.75 },
    { x: radius * 0.75, y: -radius * 0.75 },
    { x: -radius * 0.75, y: -radius * 0.75 },
  ];

  for (const o of offsets) {
    const desired = {
      x: playerCenter.x + o.x - CHASER_SPRITE_W / 2,
      y: playerCenter.y + o.y - CHASER_SPRITE_H / 2,
    };
    const safe = spawnSafePosition(game.world, desired);
    const dist = Math.hypot((safe.x + CHASER_SPRITE_W / 2) - playerCenter.x, (safe.y + CHASER_SPRITE_H / 2) - playerCenter.y);
    if (dist < 95) continue;
    game.chaser.x = safe.x;
    game.chaser.y = safe.y;
    game.chaser.detourLockTimer = 0;
    game.chaser.detourSign *= -1;
    return;
  }
}

function updateFinalChaseTrigger() {
  // Task C後の最終追跡は、1Fロビー中央付近に来た時に開始する。
  if (!game.tasks.taskCBreaker || !game.flags.finalChasePending) return;
  if (game.mapId !== "map1") return;
  if (game.ending || game.paused || dialogue.active || mapManager.transition.active) return;

  const center = getCenter(game.player);
  const reachedLobbyMiddle = center.y <= 420;
  if (!reachedLobbyMiddle) return;

  game.flags.finalChasePending = false;
  game.flags.forceChaseActive = true;
  game.flags.chaserGone = false;
  game.flags.chaserAwakened = true;
  placeChaserInCurrentMap(0.55);
  setEmotion("恐怖");
  game.latestMemo = "ロビーの空気が変わった。来る。";
}

function updateChaseSfx(dt, distanceToPlayer) {
  // 追跡中SE: 距離が近いほど頻度を上げる。
  const audio = game.audioEvents;
  audio.chaseSeTimer += dt;
  const min = distanceToPlayer < 120 ? 0.65 : distanceToPlayer < 220 ? 1.0 : 1.5;
  const max = distanceToPlayer < 120 ? 1.2 : distanceToPlayer < 220 ? 1.8 : 2.4;

  if (audio.chaseSeTimer >= audio.nextChaseSeAt) {
    audio.chaseSeTimer = 0;
    audio.nextChaseSeAt = min + Math.random() * (max - min);
    if (audio.chaseSeFlip) {
      playMenaaaSE();
    } else {
      playScareSE();
    }
    if (distanceToPlayer < 130) {
      playBiteSE();
    }
    audio.chaseSeFlip = !audio.chaseSeFlip;
  }
}

function placeChaserInCurrentMap(spawnDelay) {
  // 候補地点の中で「プレイヤーから最も遠い位置」に出し、即死を避ける。
  const candidateSpawns = game.mapId === "map2"
    ? [
      // 2F: リネン室ドア正面（下側）に寄せて統一スポーン
      { x: 822, y: 348 },
      { x: 808, y: 352 },
      { x: 836, y: 352 },
    ]
    : [
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
  game.chaser.detourSign = Math.random() > 0.5 ? 1 : -1;
  game.chaser.detourLockTimer = 0;
  game.chaser.stuckTimer = 0;
  game.chaser.lastX = game.chaser.x;
  game.chaser.lastY = game.chaser.y;
  if (game.stats) {
    game.stats.chaseStartCount += 1;
  }
  triggerChaserSpawnCue();
}

function awakenB1FeedingChase() {
  game.flags.forceChaseActive = true;
  game.flags.chaserGone = false;
  game.flags.chaserAwakened = true;
  const spawn = spawnSafePosition(game.world, { x: 835, y: 360 });
  game.chaser.x = spawn.x;
  game.chaser.y = spawn.y;
  game.chaser.mapId = game.mapId;
  game.chaser.spawnDelay = 0.6;
  game.chaser.active = false;
  game.chaser.detourSign = 1;
  game.chaser.detourLockTimer = 0;
  game.chaser.stuckTimer = 0;
  game.chaser.lastX = game.chaser.x;
  game.chaser.lastY = game.chaser.y;
  triggerChaserSpawnCue();
  setEmotion("恐怖");
  game.latestMemo = "気づかれた。逃げろ。";
  playScareSE();
  playMenaaaSE();
}

function startB1DoorAmbushChase() {
  game.flags.forceChaseActive = true;
  game.flags.chaserGone = false;
  game.flags.chaserAwakened = true;
  game.flags.b1DoorAmbushTriggered = true;
  game.b1DoorAmbush.active = true;
  game.b1DoorAmbush.timer = 0;
  game.b1DoorAmbush.secondSpawnDone = false;

  // 1体目は右下区画の中に出現（右端寄りにして即接触を避ける）。
  const firstSpawn = spawnSafePosition(game.world, { x: 930, y: 500 });
  game.chaser.x = firstSpawn.x;
  game.chaser.y = firstSpawn.y;
  game.chaser.mapId = "map3";
  game.chaser.spawnDelay = 0.22;
  game.chaser.active = false;
  game.chaser.detourSign = -1;
  game.chaser.detourLockTimer = 0;
  game.chaser.stuckTimer = 0;
  game.chaser.lastX = game.chaser.x;
  game.chaser.lastY = game.chaser.y;
  triggerChaserSpawnCue(1.25);
  game.chaser.introLockTimer = 1.0;
  game.chaser.hitLockTimer = 1.35;
  setEmotion("恐怖");
  game.latestMemo = "影が形を持って現れた……今のうちに走れ。";
  playScareSE();
  playMenaaaSE();
}

function startRoom203DoorAmbushChase() {
  game.flags.forceChaseActive = true;
  game.flags.chaserGone = false;
  game.flags.chaserAwakened = true;
  game.flags.room203ExitAmbushTriggered = true;

  // Task B後は、リネン室ドア正面（下側）から出現させる。
  const spawn = spawnSafePosition(game.world, { x: 822, y: 348 });
  game.chaser.x = spawn.x;
  game.chaser.y = spawn.y;
  game.chaser.mapId = "map2";
  game.chaser.spawnDelay = 0.18;
  game.chaser.active = false;
  game.chaser.detourSign = -1;
  game.chaser.detourLockTimer = 0;
  game.chaser.stuckTimer = 0;
  game.chaser.lastX = game.chaser.x;
  game.chaser.lastY = game.chaser.y;
  triggerChaserSpawnCue();
  setEmotion("恐怖");
  game.latestMemo = "203の外に影がいる。ロッカーでやり過ごすしかない。";
  playScareSE();
  playMenaaaSE();
}

function updateB1DoorAmbush(dt) {
  const ambush = game.b1DoorAmbush;
  if (!ambush || !ambush.active) return;
  if (game.mapId !== "map3" || game.ending || mapManager.transition.active) {
    ambush.active = false;
    return;
  }

  ambush.timer += dt;
  if (!ambush.secondSpawnDone && ambush.timer >= 3.8) {
    ambush.secondSpawnDone = true;
    // 2体目は左上から出現。
    const secondSpawn = spawnSafePosition(game.world, { x: 48, y: 60 });
    game.chaser.x = secondSpawn.x;
    game.chaser.y = secondSpawn.y;
    game.chaser.mapId = "map3";
    game.chaser.spawnDelay = 0.15;
    game.chaser.active = false;
    game.chaser.detourSign = 1;
    game.chaser.detourLockTimer = 0;
    game.chaser.stuckTimer = 0;
    game.chaser.lastX = game.chaser.x;
    game.chaser.lastY = game.chaser.y;
    triggerChaserSpawnCue(1.1);
    game.chaser.introLockTimer = 0.8;
    game.chaser.hitLockTimer = 1.0;
    game.latestMemo = "左側にも影が出た。挟まれる。";
    playScareSE();
    playMenaaaSE();
  }

  if (ambush.timer >= 8.5) {
    ambush.active = false;
  }
}

function updateB1TaskCAutoAmbush() {
  // Cタスク後、右下区画の中央 or 通路中央に来たら自動で同じ挟み込み演出を発火する。
  if (game.mapId !== "map3") return;
  if (!game.tasks.taskCBreaker) return;
  if (game.flags.b1DoorAmbushTriggered) return;
  if (game.ending || game.paused || dialogue.active || mapManager.transition.active || game.hide.active) return;

  const center = getCenter(game.player);
  const inLowerRightRoomCenter =
    center.x >= 835 &&
    center.x <= 915 &&
    center.y >= 450 &&
    center.y <= 510;
  const inB1CorridorMiddle =
    center.x >= 440 &&
    center.x <= 540 &&
    center.y >= 240 &&
    center.y <= 320;
  if (!inLowerRightRoomCenter && !inB1CorridorMiddle) return;

  game.flags.b1FeedingChaseTriggered = true;
  game.flags.b1FeedingNoticed = true;
  dialogue.start([
    { speaker: "悠斗", text: "……まずい。ここ、静かすぎる。" },
    { speaker: "悠斗", text: "気配が近い……来る！" },
  ], {
    autoAdvanceMs: 900,
    onComplete: () => {
      startB1DoorAmbushChase();
    },
  });
}

function updateLinenRoomEvent() {
  // 2Fリネン室の中央に入った時の一回きりイベント。
  if (game.mapId !== "map2") return;
  if (!game.flags.linenDoorOpened || game.flags.linenCenterTalkPlayed) return;
  if (game.ending || game.paused || dialogue.active || mapManager.transition.active) return;

  const center = getCenter(game.player);
  const inLinenRoomCenter =
    center.x >= 812 &&
    center.x <= 928 &&
    center.y >= 386 &&
    center.y <= 502;
  if (!inLinenRoomCenter) return;

  game.flags.linenCenterTalkPlayed = true;
  dialogue.start([
    { speaker: "悠斗", text: "……この部屋、違和感がする。" },
    { speaker: "悠斗", text: "早く出たほうがいい。見られてるような気がする。" },
  ], { autoAdvanceMs: 1000 });
}

function triggerChaserSpawnCue(duration = 0.7) {
  // 出現演出後に一瞬消えるのを防ぐため、演出時点で即表示させる。
  if (game.chaser.spawnDelay > 0) {
    game.chaser.spawnDelay = 0;
  }
  game.chaser.active = true;
  game.effects.chaserSpawnCueTimer = duration;
  game.effects.chaserSpawnCueX = game.chaser.x + game.chaser.w / 2;
  game.effects.chaserSpawnCueY = game.chaser.y + game.chaser.h / 2;
  playDissonanceSE();
}

function moveChaserWithDetour(moveX, moveY) {
  const amount = Math.hypot(moveX, moveY);
  if (amount <= 0.001) return;

  const ux = moveX / amount;
  const uy = moveY / amount;
  const px = -uy;
  const py = ux;

  const tryMoveSplit = (dx, dy, slices = 3) => {
    const sx = dx / slices;
    const sy = dy / slices;
    let moved = false;
    for (let i = 0; i < slices; i += 1) {
      const mx = tryMoveChaser(game.chaser.x + sx, game.chaser.y);
      const my = tryMoveChaser(game.chaser.x, game.chaser.y + sy);
      if (mx || my) moved = true;
    }
    return moved;
  };

  const dir = (x, y) => {
    const len = Math.hypot(x, y) || 1;
    return { x: x / len, y: y / len };
  };

  const sign = game.chaser.detourSign || 1;
  const primaryDetour = dir(ux + px * sign * 0.85, uy + py * sign * 0.85);
  const secondaryDetour = dir(ux - px * sign * 0.85, uy - py * sign * 0.85);
  const sideA = dir(px * sign, py * sign);
  const sideB = dir(-px * sign, -py * sign);

  // 候補方向を順番に試す。成功した方向をしばらく固定してジッターを抑える。
  const candidates = [
    { ...dir(ux, uy), lock: false },
    { ...primaryDetour, lock: true, sign },
    { ...secondaryDetour, lock: true, sign: -sign },
    { ...sideA, lock: true, sign },
    { ...sideB, lock: true, sign: -sign },
  ];

  for (const c of candidates) {
    if (tryMoveSplit(c.x * amount, c.y * amount, 3)) {
      if (c.lock) {
        game.chaser.detourSign = c.sign;
        game.chaser.detourLockTimer = 0.26;
      }
      return;
    }
  }
}

function tryMoveChaser(nextX, nextY) {
  const hitbox = getChaserHitbox(nextX, nextY);
  const wallHit = getFirstCollisionWall(hitbox, getBlockingRects());
  if (wallHit) return false;
  if (!game.debug && isBreakerRoomGateLocked() && rectsOverlap(hitbox, getBreakerRoomGateRect())) {
    return false;
  }
  if (game.world.exitDoor && !game.world.exitDoor.unlocked && rectsOverlap(hitbox, game.world.exitDoor)) {
    return false;
  }
  game.chaser.x = nextX;
  game.chaser.y = nextY;
  return true;
}

function triggerCaughtEnding() {
  if (game.ending) return;
  game.stats.caughtCount += 1;
  // 捕食系SEを重ねて、Caughtの印象をはっきりさせる。
  playBiteSE();
  playEatSE();
  playMenaaaSE();
  playScareSE();
  setEmotion("恐怖");
  const caughtLines = [
    "Game Over\n\n……やだ……死ぬの、やだ……\n……母さん……親父……ごめん……\n俺、まだ……何もしてない。まだ……生きたい……\n\n「大丈夫。――次は、うまくやる」",
    "Game Over\n\n痛い。痛い。やめろ……！\n息ができない。声が出ない。\n見えてるのに、体が動かない。\n\n「また203に戻ればいい」",
    "Game Over\n\nここで終わるのか……？\n帰るって、言ったのに。\nスマホの通知、まだ返してない……。\n\n「未完了のままは、気持ち悪いだろ？」",
    "Game Over\n\n暗い。近い。冷たい。\n誰か助けてくれ……！\nまだ外の空気を吸ってない。\n\n「次は、もっと上手く隠れろ」",
  ];
  const line = caughtLines[Math.floor(Math.random() * caughtLines.length)];
  triggerEnding("Caught", line);
}

function tryMovePlayer(nextX, nextY) {
  const candidateHitbox = getPlayerHitbox(nextX, nextY);
  const wallHit = getFirstCollisionWall(candidateHitbox, getBlockingRects());
  if (wallHit) {
    game.debugCollisions.push(wallHit);
    return;
  }

  if (!game.debug && isRoom203DoorLocked() && rectsOverlap(candidateHitbox, ROOM203_DOOR)) {
    game.debugCollisions.push(ROOM203_DOOR);
    return;
  }

  const closedRoomDoor = game.debug ? null : getFirstCollisionWall(candidateHitbox, getClosedRoomDoorRects());
  if (closedRoomDoor) {
    game.debugCollisions.push(closedRoomDoor);
    return;
  }

  if (!game.debug && isBreakerRoomGateLocked()) {
    const gate = getBreakerRoomGateRect();
    if (rectsOverlap(candidateHitbox, gate)) {
      game.debugCollisions.push(gate);
      return;
    }
  }

  if (!game.debug && game.world.exitDoor && !game.world.exitDoor.unlocked && rectsOverlap(candidateHitbox, game.world.exitDoor)) {
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
  // 短押し(Space)と長押しの両方を受け付ける。
  const nearest = game.interaction.nearest;

  // Quick press (Space) still works.
  if (wasJustPressed("space") && nearest) {
    triggerInteractable(nearest);
    game.interaction.hold.reset();
    return;
  }

  // Hold interaction for easier moving interaction.
  const didHoldTrigger = game.interaction.hold.update(
    dt,
    !dialogue.active && !game.paused && !mapManager.transition.active,
    isHeld("space"),
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
    if (!hasInteractionLineOfSight(pCenter, candidate)) continue;

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
      prompt: "Space: 調べる",
      ref: keyItem,
    });
  }

  for (const obj of game.world.interactables) {
    // 2F下段（入れないエリア）のオブジェクトは選択候補から外す。
    if (isNonSelectableLower2FObject(obj.id)) continue;
    const hasInteraction = Array.isArray(obj.interaction) ? obj.interaction.length > 0 : !!obj.interaction;
    if (!hasInteraction && !obj.mapChange && !obj.id.endsWith("_wardrobe")) continue;
    let movePrompt = "Space: 移動";
    if (obj.mapChange) {
      const mapLabel = obj.mapChange.toMapId === "map1"
        ? "1F"
        : obj.mapChange.toMapId === "map2"
          ? "2F"
          : "B1";
      movePrompt = `Space: ${mapLabel}へ移動`;
    }
    candidates.push({
      id: `obj:${obj.id}`,
      kind: "object",
      x: obj.x,
      y: obj.y,
      w: obj.w,
      h: obj.h,
      range: INTERACT_RANGE + 16,
      prompt: obj.mapChange ? movePrompt : "Space: 調べる",
      ref: obj,
    });
  }

  return candidates;
}

function isNonSelectableLower2FObject(id) {
  if (game.mapId !== "map2") return false;
  return (
    id.startsWith("room206_") ||
    id.startsWith("room207_") ||
    id === "room206_bed" ||
    id === "room206_wardrobe" ||
    id === "room206_desk" ||
    id === "room206_bath" ||
    id === "room207_bed" ||
    id === "room207_wardrobe" ||
    id === "room207_desk" ||
    id === "room207_bath"
  );
}

function getDistanceToCandidate(point, candidate) {
  if (candidate.kind === "key") {
    return Math.hypot(point.x - candidate.x, point.y - candidate.y);
  }
  return distancePointToRect(point, candidate);
}

function hasInteractionLineOfSight(fromPoint, candidate) {
  // 壁越しインタラクト防止: プレイヤーと対象の最短点を結ぶ線を簡易サンプリングする。
  const targetPoint = getCandidateTargetPoint(fromPoint, candidate);
  const blockers = getInteractionBlockingRects();
  const dx = targetPoint.x - fromPoint.x;
  const dy = targetPoint.y - fromPoint.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= 0.001) return true;
  const steps = Math.max(2, Math.ceil(distance / 6));

  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const px = fromPoint.x + dx * t;
    const py = fromPoint.y + dy * t;
    for (const wall of blockers) {
      if (pointInRect(px, py, wall)) {
        return false;
      }
    }
  }
  return true;
}

function getCandidateTargetPoint(fromPoint, candidate) {
  if (candidate.kind === "key") {
    return { x: candidate.x, y: candidate.y };
  }
  return {
    x: Math.max(candidate.x, Math.min(fromPoint.x, candidate.x + candidate.w)),
    y: Math.max(candidate.y, Math.min(fromPoint.y, candidate.y + candidate.h)),
  };
}

function getInteractionBlockingRects() {
  const blockers = [...getBlockingRects()];
  if (!game.debug && isRoom203DoorLocked()) {
    blockers.push(ROOM203_DOOR);
  }
  if (!game.debug) {
    blockers.push(...getClosedRoomDoorRects());
  }
  if (!game.debug && isBreakerRoomGateLocked()) {
    blockers.push(getBreakerRoomGateRect());
  }
  if (!game.debug && game.world.exitDoor && !game.world.exitDoor.unlocked) {
    blockers.push(game.world.exitDoor);
  }
  return blockers;
}

function pointInRect(x, y, rectEntity) {
  return (
    x >= rectEntity.x &&
    x <= rectEntity.x + rectEntity.w &&
    y >= rectEntity.y &&
    y <= rectEntity.y + rectEntity.h
  );
}

function canUseClosetHide(obj) {
  if (!obj || !obj.id || !obj.id.includes("_wardrobe")) return false;
  const dedicatedHideSpot = obj.id.startsWith("lobby_hide_") || obj.id.startsWith("b1_hide_");
  if (dedicatedHideSpot) return !game.hide.active;
  const isChased = (
    game.chaser.active &&
    game.chaser.mapId === game.mapId &&
    game.chaser.spawnDelay <= 0
  );
  if (isChased) return !game.hide.active;
  // 通常時は、会話を持たないワードローブのみ隠れ場所として扱う。
  const hasNarrativeInteraction = obj.interaction && obj.interaction.length > 0;
  if (hasNarrativeInteraction) return false;
  return !game.hide.active;
}

function enterClosetHide(obj) {
  game.hide.active = true;
  game.hide.sourceId = obj.id;
  game.hide.startedUnderThreat = (
    game.chaser.active &&
    game.chaser.mapId === game.mapId &&
    game.chaser.spawnDelay <= 0
  );
  game.hide.mode = (game.mapId === "map2" && obj.id === "room203_wardrobe" && game.tasks.taskBRoom203)
    ? "room203_escape"
    : "normal";
  game.hide.timer = 0;
  game.hide.duration = game.hide.mode === "room203_escape"
    ? 12.0 + Math.random() * 2.0
    : 7.2 + Math.random() * 2.4;
  game.hide.heartbeatTimer = 0;
  game.hide.footstepTimer = 0;
  game.hide.tensionSeTimer = 0;
  game.hide.monologueStage = 0;
  game.hide.monologueTimer = 0;
  game.latestMemo = game.hide.mode === "room203_escape"
    ? "ロッカーに隠れた。今は絶対に動くな。"
    : "クローゼットに隠れた。長く息を潜めろ。";
  dialogue.start(
    game.hide.mode === "room203_escape"
      ? [
        { speaker: "悠斗", text: "ロッカーに身を押し込む。" },
        { speaker: "悠斗", text: "ライトを消せ。点けたままだと見つかる……！" },
        { speaker: "悠斗", text: "……目の前にいる気がする。息を殺せ。" },
      ]
      : [
        { speaker: "悠斗", text: "ロッカーに身を押し込む。" },
        { speaker: "悠斗", text: "……まだ動くな。呼吸を殺せ。" },
      ],
    { autoAdvanceMs: 750 }
  );
}

function maybePromptPauseScenario(count) {
  const total = getTotalFragmentCount();
  let shouldPrompt = false;
  if (count >= 3 && !game.flags.fragmentPauseHint3Shown) {
    game.flags.fragmentPauseHint3Shown = true;
    shouldPrompt = true;
  }
  if (count >= 6 && !game.flags.fragmentPauseHint6Shown) {
    game.flags.fragmentPauseHint6Shown = true;
    shouldPrompt = true;
  }
  if (count >= total && !game.flags.fragmentPauseHint10Shown) {
    game.flags.fragmentPauseHint10Shown = true;
    shouldPrompt = true;
  }
  if (!shouldPrompt) return;

  game.latestMemo = `断片が集まってきた。Pでポーズ →「2:シナリオ整理」を確認しよう。(${count}/${total})`;
  if (!dialogue.active && !game.paused && !game.ending && !mapManager.transition.active) {
    dialogue.start([
      { speaker: "悠斗", text: "……断片が繋がってきた。" },
      { speaker: "悠斗", text: "Pでポーズを開いて『2:シナリオ整理』を見返そう。" },
    ], { autoAdvanceMs: 1100 });
  }
}

function applyStoryFragment(obj, baseLines) {
  const frag = STORY_FRAGMENT_BY_OBJECT[obj.id];
  if (!frag || game.fragments[frag.key]) return baseLines;

  game.fragments[frag.key] = true;
  const count = getCollectedFragmentCount();
  game.latestMemo = `断片を回収: ${count}/${getTotalFragmentCount()}`;
  maybePromptPauseScenario(count);
  playFragmentSE();
  const fragmentLines = (frag.lines || []).map((line) => ({
    speaker: "メモ",
    text: line,
  }));
  return [
    { speaker: "メモ", text: `【${frag.title}】` },
    ...fragmentLines,
    { speaker: "悠斗", text: "……これ、俺がここに来た理由に繋がってるのか？" },
    ...baseLines,
  ];
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
    if (candidate.ref.unlocked || game.debug) {
      triggerEscapeCinematic();
    } else {
      dialogue.start([{ speaker: "悠斗", text: "必要な作業が終わっていない。まだ開かない。" }]);
    }
    return;
  }

  const obj = candidate.ref;

  if (canUseClosetHide(obj)) {
    enterClosetHide(obj);
    return;
  }
  if (obj.id.includes("_wardrobe") && (!obj.interaction || obj.interaction.length === 0)) {
    dialogue.start([{ speaker: "悠斗", text: "クローゼットだ。今は何もない。" }], { autoAdvanceMs: 700 });
    return;
  }

  if (obj.id === "public_restroom_m" || obj.id === "public_restroom_f") {
    playShowerSE();
    playWaterDropSE();
  }

  if (obj.id === "back_office") {
    playOldDoorSE();
  }

  if (
    obj.id === "b1_door_service_a" ||
    obj.id === "b1_door_wiring" ||
    obj.id === "b1_door_lower_left" ||
    obj.id === "b1_door_lower_right"
  ) {
    playOldDoorSE();
    obj.blocking = false;
    obj.interaction = [];
  }

  if (obj.id === "drain_tunnel") {
    playWaterDropSE();
  }

  if (obj.id === "feeding_scene") {
    playEatSE();
    playBiteSE();
  }

  if (obj.id === "b1_door_lower_right_2") {
    playOldDoorSE();
    obj.blocking = false;
    if (!game.flags.b1FeedingChaseTriggered) {
      game.flags.b1FeedingChaseTriggered = true;
      game.flags.b1FeedingNoticed = true;
      obj.interaction = [];
      dialogue.start([
        { speaker: "悠斗", text: "……っ！ 嘘だろ……" },
        { speaker: "悠斗", text: "今の、……人……？ 食ってる……？ 胃が……やばい……吐く。" },
        { speaker: "悠斗", text: "……気づかれた。お願いだから……見失ってくれ！" },
      ], {
        autoAdvanceMs: 900,
        onComplete: () => {
          startB1DoorAmbushChase();
        },
      });
      return;
    }
    dialogue.start([{ speaker: "悠斗", text: "扉は開いている。ここから先には近づきたくない。" }], { autoAdvanceMs: 900 });
    return;
  }

  if (obj.id === "room201" || obj.id === "room202" || obj.id === "room204" || obj.id === "room205") {
    game.roomChecks[obj.id] = true;

    if (!game.roomDoorsOpened[obj.id]) {
      playOldDoorSE();
      game.roomDoorsOpened[obj.id] = true;
      dialogue.start(obj.interaction, { autoAdvanceMs: 700 });
      obj.interaction = [];
      return;
    }
    // 一度開いた共通ドアは再インタラクト不要。
    return;
  }

  if (obj.id === "room203_door") {
    if (!areAllPreRoomsChecked() && !game.debug) {
      const remaining = getUnseenPreRooms();
      dialogue.start([
        { speaker: "悠斗", text: "203はまだ開かない。先に他の部屋を見ないと。" },
        { speaker: "悠斗", text: `未確認: ${remaining.join(" / ")}` },
      ]);
      return;
    }
    if (!game.tasks.taskAFrontDesk && !game.debug) {
      dialogue.start([{ speaker: "悠斗", text: "203号室…まずは1Fフロントで手掛かりを確認しよう。" }]);
      return;
    }
    if (!game.roomDoorsOpened.room203) {
      playOldDoorSE();
      game.roomDoorsOpened.room203 = true;
      dialogue.start([
        { speaker: "悠斗", text: "203号室のドアを開けた。" },
        { speaker: "悠斗", text: "……閉まってない。誰かが……いる？ お願いだから、“人”であってくれ。" },
      ], { autoAdvanceMs: 900 });
      return;
    }

    playOldDoorSE();
    if (game.player.y + game.player.h / 2 < 170) {
      if (game.tasks.taskBRoom203 && !game.flags.room203ExitAmbushTriggered) {
        dialogue.start([
          { speaker: "悠斗", text: "203を出る。……まずい、気配が近い。" },
          { speaker: "悠斗", text: "廊下に出るのは危険だ。いったんロッカーに隠れろ……！" },
        ], {
          autoAdvanceMs: 900,
          onComplete: () => {
            startRoom203DoorAmbushChase();
          },
        });
      } else {
        dialogue.start([{ speaker: "悠斗", text: "203を出る。背中に視線が刺さる。急げ。" }], { autoAdvanceMs: 1200 });
      }
    } else {
      dialogue.start([{ speaker: "悠斗", text: "203号室のドアだ。" }], { autoAdvanceMs: 700 });
    }
    return;
  }

  if (obj.id === "linen_room_door") {
    playOldDoorSE();
    obj.blocking = false;
    if (!game.flags.linenDoorOpened) {
      game.flags.linenDoorOpened = true;
      dialogue.start([
        { speaker: "悠斗", text: "リネン室のドアを開けた。" },
        { speaker: "悠斗", text: "……空気が重い。ここ、妙に静かすぎる。" },
      ], { autoAdvanceMs: 900 });
      obj.interaction = [];
      return;
    }
    // 一度開いた共通ドアは再インタラクト不要。
    return;
  }

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
        { speaker: "悠斗", text: "……宿泊台帳。こんなの手書きで残してるの、今どき珍しいな。" },
        { speaker: "悠斗", text: "203……俺の部屋番号……。日付……明日？ ……冗談だろ。" },
        { speaker: "悠斗", text: "俺、今日ここに入ったよな。今の俺の存在が……“明日”扱い？ 意味わからん。" },
        { speaker: "悠斗", text: "……誰かいる？ 返事しろよ。さっきまで普通のホテルだっただろ。" },
      ]);
    } else {
      dialogue.start([{ speaker: "悠斗", text: "台帳には確かに203と書かれている。" }]);
    }
    return;
  }

  // Task B: Room203 on 2F.
  if (obj.id === "room203_task") {
    if (!areAllPreRoomsChecked() && !game.debug) {
      const remaining = getUnseenPreRooms();
      dialogue.start([
        { speaker: "悠斗", text: "203はまだ開かない。先に他の部屋を見ないと。" },
        { speaker: "悠斗", text: `未確認: ${remaining.join(" / ")}` },
      ]);
      return;
    }
    if (!game.tasks.taskAFrontDesk && !game.debug) {
      dialogue.start([{ speaker: "悠斗", text: "203号室…まずは1Fフロントで手掛かりを確認しよう。" }]);
      return;
    }
    if (!game.roomDoorsOpened.room203 && !game.debug) {
      dialogue.start([{ speaker: "悠斗", text: "まず203号室のドアを開けよう。" }], { autoAdvanceMs: 900 });
      return;
    }
    if (!game.tasks.taskBRoom203) {
      // R復帰後でもTask Bの流れを初回と同じにするため、B専用フラグを初期化する。
      game.flags.room203ExitAmbushTriggered = false;
      game.flags.room203HideSurvived = false;
      game.flags.room204205ReappearTriggered = false;
      game.flags.lastCaughtByLockerLight = false;
      game.flags.chaserGone = true;
      game.flags.forceChaseActive = false;
      game.chaser.active = false;
      game.chaser.spawnDelay = CHASER_SPAWN_DELAY;
      game.tasks.taskBRoom203 = true;
      // デバッグ時に先にTask Bを踏んだ場合でも、203退出トリガーが機能するようにする。
      game.roomDoorsOpened.room203 = true;
      saveCheckpoint();
      setEmotion("確信");
      game.inventory.push("Card Key 203");
      game.latestMemo = "Room203メモ: 非常口の解錠には電源が必要";
      playPickupSE();
      dialogue.start([
        { speaker: "悠斗", text: "俺の荷物……なのに、俺の部屋じゃないみたいだ。匂いが違う。空気が重い。" },
        { speaker: "悠斗", text: "あった……カードキー……。よし、これで――" },
      ], {
        onComplete: () => {
          if (!game.flags.taskBFlashPlayed) {
            triggerBloodFlashAndShake();
            ambientAudio.playNoiseHit();
            playDissonanceSE();
            playScareSE();
            playBiteSE();
            game.flags.taskBFlashPlayed = true;
          }
          dialogue.start([
            { speaker: "悠斗", text: "……っ、何だ今の。心臓、バグるだろ……。" },
            { speaker: "メモ", text: "『気づいたなら、もう遅い』" },
            { speaker: "悠斗", text: "ふざけんな。誰だよ。出てこいよ。" },
            { speaker: "悠斗", text: "……足音、増えた？ いや、俺しかいない。……いないはずだろ。" },
          ], {
            onComplete: () => {
              if (!game.flags.room203ExitAmbushTriggered) {
                startRoom203DoorAmbushChase();
              }
            },
          });
        },
      });
    } else {
      dialogue.start([{ speaker: "悠斗", text: "203から回収したカードキーは手元にある。" }]);
    }
    return;
  }

  if (obj.id === "control_console") {
    if (!game.flags.breakerRoomUnlocked) {
      game.flags.breakerRoomUnlocked = true;
      playDoorSE();
      dialogue.start([
        { speaker: "悠斗", text: "制御卓のロックを解除した。" },
        { speaker: "悠斗", text: "右上の保守室に入れるはずだ。" },
      ]);
      return;
    }
    dialogue.start([{ speaker: "悠斗", text: "右上保守室のロックは解除済みだ。" }], { autoAdvanceMs: 900 });
    return;
  }

  // Task C: Breaker on B1.
  if (obj.id === "breaker_task") {
    if (!game.flags.breakerRoomUnlocked && !game.debug) {
      dialogue.start([
        { speaker: "悠斗", text: "右上の保守室に入れない。" },
        { speaker: "悠斗", text: "先に制御卓でロックを解除しよう。" },
      ]);
      return;
    }
    if (!game.tasks.taskBRoom203 && !game.debug) {
      dialogue.start([{ speaker: "悠斗", text: "まず2Fの203で状況を確認する必要がある。" }]);
      return;
    }
    if (!game.tasks.taskCBreaker) {
      game.tasks.taskCBreaker = true;
      setEmotion("脱出の執念");
      // Task C後は1F中央到達で最終追跡開始。
      game.flags.finalChasePending = true;
      game.flags.chaserGone = true;
      game.flags.forceChaseActive = false;
      game.flags.chaserAwakened = true;
      saveCheckpoint();
      if (!game.flags.taskCShadowPlayed) {
        triggerShadowHint();
        playEatSE();
        game.flags.taskCShadowPlayed = true;
        ambientAudio.setHighTensionFootsteps(true);
      }
      game.latestMemo = "非常電源をON。1F非常口のロックが解除された。";
      dialogue.start([
        { speaker: "悠斗", text: "……電源。これを上げれば、非常口が開く。……開いてくれ。" },
        { speaker: "悠斗", text: "頼む。意味なんかいらない。開けばいい。" },
        { speaker: "悠斗", text: "……音が戻った。いや……戻ったんじゃない。“起動した”んだ。" },
        { speaker: "悠斗", text: "よし、非常口は開くはずだ。いったん1Fへ戻ろう。" },
      ]);
    } else {
      dialogue.start([{ speaker: "悠斗", text: "非常電源はすでに入っている。" }]);
    }
    return;
  }

  // Escape check at 1F emergency exit.
  if (obj.id === "emergency_exit_1f") {
    playDoorSE();
    if ((areAllTasksComplete() && game.world.exitDoor && game.world.exitDoor.unlocked) || game.debug) {
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

  // Elevator can be used only from its front side.
  if ((obj.id === "elevator_to_2f" || obj.id === "elevator_to_1f") && !isPlayerAtElevatorFront(obj) && !game.debug) {
    dialogue.start([{ speaker: "悠斗", text: "エレベーターの正面に立って操作しよう。" }], { autoAdvanceMs: 1000 });
    return;
  }

  if (obj.mapChange) {
    // Task B直後の初回追跡は、いったん隠れてやり過ごすまで2Fから離脱不可にする。
    if (
      game.mapId === "map2" &&
      game.tasks.taskBRoom203 &&
      !game.flags.room203HideSurvived &&
      !game.debug
    ) {
      dialogue.start([
        { speaker: "悠斗", text: "まだ出られない。いったん隠れて、気配をやり過ごすしかない。" },
      ], { autoAdvanceMs: 900 });
      return;
    }

    // 2回目追跡（204/205間通過後）は、ドア移動できた時点で逃げ切り扱いにする。
    if (
      game.mapId === "map2" &&
      game.flags.room204205ReappearTriggered &&
      !game.debug
    ) {
      game.flags.chaserGone = true;
      game.flags.forceChaseActive = false;
      game.chaser.active = false;
      game.chaser.spawnDelay = CHASER_SPAWN_DELAY;
      game.latestMemo = "ドアを越えて追跡を振り切った。";
    }

    if (obj.id === "service_stairs_to_b1" && !isPlayerAtStairsFront(obj) && !game.debug) {
      dialogue.start([{ speaker: "悠斗", text: "階段の正面（下側）から降りよう。" }], { autoAdvanceMs: 1000 });
      return;
    }

    if (obj.id === "stairs_to_1f" && !isPlayerAtStairsFront(obj) && !game.debug) {
      dialogue.start([{ speaker: "悠斗", text: "階段の正面に立って上がろう。" }], { autoAdvanceMs: 1000 });
      return;
    }

    if (obj.id === "stairs_to_1f" && !game.tasks.taskCBreaker && !game.debug) {
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
    if (obj.id === "room201" || obj.id === "room202" || obj.id === "room204" || obj.id === "room205") {
      game.roomChecks[obj.id] = true;
    }
    const lines = applyStoryFragment(obj, obj.interaction);
    dialogue.start(lines, { autoAdvanceMs: 0 });
  }
}

function getRoomExitMonologue(roomId) {
  const linesByRoom = {
    room201: "息が浅い。平気なふりをしてるだけだ。",
    room202: "足音が一つ多い気がする。考えるな、進め。",
    room204: "ドアを閉めても安心できない。まだ近い。",
    room205: "今のは気のせいじゃない。確実に何かいる。",
  };
  return linesByRoom[roomId] || "落ち着け。出口まで生きて戻るだけだ。";
}

function areAllPreRoomsChecked() {
  return (
    game.roomChecks.room201 &&
    game.roomChecks.room202 &&
    game.roomChecks.room204 &&
    game.roomChecks.room205
  );
}

function getUnseenPreRooms() {
  const remaining = [];
  if (!game.roomChecks.room201) remaining.push("201");
  if (!game.roomChecks.room202) remaining.push("202");
  if (!game.roomChecks.room204) remaining.push("204");
  if (!game.roomChecks.room205) remaining.push("205");
  return remaining;
}

function isRoom203DoorLocked() {
  return game.mapId === "map2" && (!areAllPreRoomsChecked() || !game.roomDoorsOpened.room203);
}

function getClosedRoomDoorRects() {
  if (game.mapId !== "map2") return [];
  const opened = game.roomDoorsOpened || {};
  return ROOM2_DOORS.filter((door) => {
    if (door.id === "room203") {
      return !opened.room203;
    }
    return !opened[door.id];
  });
}

function isBreakerRoomGateLocked() {
  return game.mapId === "map3" && !game.flags.breakerRoomUnlocked;
}

function getBreakerRoomGateRect() {
  // Gate on the upper-right room entrance (opening around x:660-760, y:140).
  return { x: 660, y: 140, w: 100, h: 20 };
}

function isPlayerAtElevatorFront(elevatorObj) {
  const p = game.player;
  const playerCenterX = p.x + p.w / 2;
  const playerBottomY = p.y + p.h;
  const frontXMin = elevatorObj.x - 12;
  const frontXMax = elevatorObj.x + elevatorObj.w + 12;
  const frontYMin = elevatorObj.y + elevatorObj.h - 4;
  const frontYMax = elevatorObj.y + elevatorObj.h + 78;

  return (
    playerCenterX >= frontXMin &&
    playerCenterX <= frontXMax &&
    playerBottomY >= frontYMin &&
    playerBottomY <= frontYMax &&
    p.facing === "up"
  );
}

function isPlayerAtStairsFront(stairsObj) {
  const p = game.player;
  const playerCenterX = p.x + p.w / 2;
  const playerBottomY = p.y + p.h;
  const frontXMin = stairsObj.x - 10;
  const frontXMax = stairsObj.x + stairsObj.w + 10;
  const frontYMin = stairsObj.y + stairsObj.h - 4;
  const frontYMax = stairsObj.y + stairsObj.h + 78;

  return (
    playerCenterX >= frontXMin &&
    playerCenterX <= frontXMax &&
    playerBottomY >= frontYMin &&
    playerBottomY <= frontYMax &&
    p.facing === "up"
  );
}

function getMapChangeDialogue(obj) {
  if (obj.id === "elevator_to_2f") {
    setEmotion("不安");
    if (game.tasks.taskAFrontDesk && !game.tasks.taskBRoom203) {
      return [
        { speaker: "悠斗", text: "エレベーターは……動く。動くのが逆に怖い。" },
        { speaker: "悠斗", text: "こういう時って、普通動かないだろ……。" },
        { speaker: "悠斗", text: "考えるな。部屋に行って、鍵を確認して、帰る方法を探す。" },
      ];
    }
    if (game.tasks.taskBRoom203) {
      return [
        { speaker: "悠斗", text: "息、落ち着け。1Fに戻る。まだ終わってない。" },
      ];
    }
    return [
      { speaker: "悠斗", text: "2Fへ上がる。……嫌な予感しかしない。" },
    ];
  }

  if (obj.id === "elevator_to_1f") {
    if (game.tasks.taskBRoom203) {
      return [
        { speaker: "悠斗", text: "1Fへ戻る。B1へ向かうしかない。" },
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
      { speaker: "悠斗", text: "急げ。ここで止まったら終わる。" },
    ];
  }

  if (obj.id === "stairs_to_1f") {
    if (game.tasks.taskCBreaker && !game.flags.b1ReturnTalkPlayed) {
      game.flags.b1ReturnTalkPlayed = true;
      return [
        { speaker: "悠斗", text: "……案外、楽勝だったかもな。あとは上に戻って帰るだけだ。" },
        { speaker: "悠斗", text: "いや、待て。台帳の日付も、203の痕跡も、全部おかしかった。" },
        { speaker: "悠斗", text: "ここは最初から俺を“見ていた”のかもしれない。" },
        { speaker: "悠斗", text: "考えるのは後だ。まず生きて外に出る。" },
      ];
    }
    return [
      { speaker: "悠斗", text: "戻ってきた……。さっきまでのロビーが、別物に見える。" },
      { speaker: "悠斗", text: "……いる。出口、非常口、そこまで――！" },
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
    setEmotion("安堵");
  }
  endingTitle.textContent = title;
  endingText.textContent = text;
  endingScreen.classList.remove("hidden");
}

function triggerEscapeCinematic() {
  if (game.effects.escapeCinematicActive || game.ending) return;
  game.stats.escapedWithLightOff = !game.lightOn;
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
  game.effects.chaserSpawnCueTimer = Math.max(0, game.effects.chaserSpawnCueTimer - dt);
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
  const achievementResult = evaluateHiddenAchievements();
  game.endroll.unlockedCount = achievementResult.unlockedCount;
  game.endroll.totalCount = achievementResult.totalCount;
  game.endroll.lines = buildEndrollLines(achievementResult.lines);
  game.effects.endrollActive = true;
  game.effects.endrollTimer = 0;
}

function updateEndroll(dt) {
  game.effects.endrollTimer += dt;
  if (game.effects.endrollTimer >= ENDROLL_DURATION) {
    game.effects.endrollActive = false;
    triggerEnding("Escaped", "……外。冷たい夜風が、やっと肺に入ってきた。\n\n怖かった。何度も諦めそうになった。\nそれでも、ここまで走ってきた。\n\n明日が来る。\n今度こそ、ちゃんと生きて帰る。");
  }
}

function evaluateHiddenAchievements() {
  const entries = getHiddenAchievementEntries();

  const lines = ["隠し実績（条件公開）"];
  let unlockedCount = 0;
  for (const entry of entries) {
    if (entry.unlocked) unlockedCount += 1;
    const mark = entry.unlocked ? "✓ 達成" : "□ 未達";
    lines.push(`${mark} ${entry.name}`);
    lines.push(`  条件: ${entry.description}`);
  }
  const percent = Math.round((unlockedCount / entries.length) * 100);
  lines.push(`達成度: ${percent}% (${unlockedCount}/${entries.length})`);
  return { lines, unlockedCount, totalCount: entries.length };
}

function buildEndrollLines(achievementLines) {
  const timeText = formatDuration(game.stats.runTimeSec);
  const mapVisitCount = Object.values(game.stats.mapVisited).filter(Boolean).length;
  const fragmentLines = buildFragmentRevealLines();
  return [
    "『203号室の宿泊者』",
    "",
    "主人公: 悠斗",
    "舞台: 深夜のビジネスホテル",
    "",
    "Task A  受付で台帳を確認",
    "Task B  203号室でカードキー回収",
    "Task C  B1で非常電源をON",
    "",
    "怖かった。",
    "それでも、足を止めなかった。",
    "今夜、悠斗は外へ出られた。",
    "",
    "今回の解説",
    `プレイ時間: ${timeText}`,
    `捕まった回数: ${game.stats.caughtCount}回`,
    `追跡発生: ${game.stats.chaseStartCount}回`,
    `救済ワープ使用: ${game.stats.rescueCount}回`,
    `探索したフロア: ${mapVisitCount}/3`,
    `デバッグ使用: ${game.stats.usedDebug ? "あり" : "なし"}`,
    "",
    ...fragmentLines,
    "",
    "スタッフロール",
    "監督: Takuto Taniho",
    "シナリオ: Takuto Taniho",
    "曲選: Takuto Taniho",
    "ゲーム開発: Takuto Taniho",
    "レベルデザイン: Takuto Taniho",
    "サウンド演出: Takuto Taniho",
    "デバッグ: Takuto Taniho",
    "ほぼ全部: Takuto Taniho",
    "",
    ...achievementLines,
    "",
    "Post-Credits",
    "この話は、噂でしかない。",
    "同じホテルを見た人は何人もいる。",
    "共通するのは『203』という数字だけだ。",
    "",
    "203号室は『コピーが完成する部屋』",
    "“それ”は人間を模倣する。声、癖、記憶の断片。",
    "コピーが完成すると、本物は“不要”になる。",
    "そして記録から消える。存在が上書きされる。",
    "",
    "ホテルが普通だったのは、観察と学習のため。",
    "地下での捕食は、肉体維持だけじゃない。",
    "人間の情報を取り込む儀式――という噂。",
    "",
    "主人公が脱出するとコピーが未完成になる。",
    "未完成のまま外に出せない。だから執拗に追う。",
    "",
    "あなたが外へ出たとしても、",
    "“あなたがあなたである証拠”は、どこにある？",
    "",
    "Thank you for playing",
    "おつかれさま。ここまで辿り着いてくれてありがとう。",
  ];
}

function buildFragmentRevealLines() {
  const entries = getFragmentEntries();
  const count = getCollectedFragmentCount();
  const total = entries.length;
  const hasAll = count === total;
  const lines = [
    "記憶の断片",
    `回収数: ${count}/${total}`,
  ];

  for (const entry of entries) {
    if (!game.fragments[entry.key]) {
      lines.push(`・未回収: ${entry.title}`);
    }
  }

  lines.push("");
  if (hasAll) {
    lines.push("断片の意味");
    lines.push("悠斗は“ただ終電を逃した”だけじゃなかった。");
    lines.push("203で“誰か”と会う約束があった。");
    lines.push("ロビーと地下で見つかった記録は、203が『人を上書きする場』だと示している。");
    lines.push("レシートや保守ログの時刻は、台帳の日付と噛み合わない。");
    lines.push("つまり『記録』そのものがずらされている。");
    lines.push("複数の断片は、悠斗自身が“忘れる前提”で証拠を残したことを示す。");
    lines.push("推理: 悠斗はここで真相を突き止めるため、最初から203を目指していた。");
  } else {
    lines.push("断片の意味（未解明）");
    lines.push("まだ足りない。");
    lines.push("このホテルに来た理由は、ただの偶然じゃない。");
    lines.push("回収できなかった断片の中に、決定的な証拠が残っている。");
  }
  return lines;
}

function formatDuration(totalSec) {
  const sec = Math.max(0, Math.floor(totalSec));
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${min}:${String(rem).padStart(2, "0")}`;
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

  // B1: occasional water drops for damp mechanical atmosphere.
  if (game.mapId === "map3") {
    game.audioEvents.waterTimer += dt;
    if (game.audioEvents.waterTimer >= game.audioEvents.nextWaterAt) {
      playWaterDropSE();
      game.audioEvents.waterTimer = 0;
      game.audioEvents.nextWaterAt = 6 + Math.random() * 10;
    }
  } else {
    game.audioEvents.waterTimer = 0;
  }

  // 独り言イベント（ゲーム全体を通して一定間隔で発生）
  if (!dialogue.active && !game.paused && !game.ending && !game.hide.active && !isChaseActiveNow()) {
    game.whisperTimer += dt;
    if (game.whisperTimer >= game.nextWhisperAt) {
      game.whisperTimer = 0;
      game.nextWhisperAt = 30 + Math.random() * 20;
      triggerWhisperEvent();
    }
  }
}

function updateB1FeedingEvent() {
  // B1右下の捕食イベント:
  // 1) 近づくと音と独り言で「引き返し」を示す
  // 2) さらに近づくと追跡開始
  if (game.mapId !== "map3" || game.ending || game.paused || dialogue.active || isChaseActiveNow()) return;
  if (!game.world) return;

  const scene = game.world.interactables.find((obj) => obj.id === "feeding_scene");
  if (!scene) return;

  const playerCenter = getCenter(game.player);
  const sceneCenter = { x: scene.x + scene.w / 2, y: scene.y + scene.h / 2 };
  const distance = Math.hypot(playerCenter.x - sceneCenter.x, playerCenter.y - sceneCenter.y);

  if (!game.flags.b1FeedingNoticed && distance <= 240) {
    game.flags.b1FeedingNoticed = true;
    game.latestMemo = "右下から、噛み砕く音がする。";
    playEatSE();
    dialogue.start([
      { speaker: "悠斗", text: "……何かを食べる音だ。" },
    ], { autoAdvanceMs: 1200 });
    return;
  }

  if (game.flags.b1FeedingNoticed && !game.flags.b1FeedingRetreatWarned && distance <= 180) {
    game.flags.b1FeedingRetreatWarned = true;
    playBiteSE();
    playWaterDropSE();
    dialogue.start([
      { speaker: "悠斗", text: "引き返せ。" },
      { speaker: "悠斗", text: "胸騒ぎが強い。このまま進んだらまずい。" },
    ], { autoAdvanceMs: 1450 });
    return;
  }

  // 追跡開始は「右下ドアを開けた時」に限定する。
}

function triggerWhisperEvent() {
  if (isChaseActiveNow()) return;
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

function isChaseActiveNow() {
  if (!game || !game.chaser) return false;
  return (
    game.chaser.active &&
    game.chaser.mapId === game.mapId &&
    game.chaser.spawnDelay <= 0 &&
    !game.flags.chaserGone &&
    !game.ending
  );
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
  if (game.stats) {
    game.stats.rescueCount += 1;
  }
  game.latestMemo = "詰まりを解除した。落ち着いて進もう。";
}

function buildPauseHelpText() {
  return [
    "一時停止チュートリアル",
    "1: 操作説明  2: シナリオ整理  3: 実績",
    "",
    "まずここを見ればOK",
    "・迷ったら 2 で『シナリオ整理』を開く",
    "・やることは画面上の Task A/B/C を順に進めるだけ",
    "・詰まったら R長押しで安全地点に戻れる",
    "",
    "操作の基本",
    "・移動: WASD / 矢印",
    "・調べる: Space（長押しで連続）",
    "・ライト: Shift / L",
    "・会話送り: Space / Enter（長押しで連続）",
    "・ポーズ切替: P",
    "",
    "ポーズ中の見方",
    "・1 = 操作説明（今ここ）",
    "・2 = シナリオ整理（断片/推察を確認）",
    "・3 = 実績（達成率と条件）",
    "",
    "ライトの仕様",
    "・手回し非常ライトなので、点灯中は残量が減る",
    "・消灯中はゆっくり回復する",
    "・ライトメーターは画面右下",
    "",
    "隠れる",
    "・ロッカー系オブジェクトで隠れられる",
    "・追跡中でなくても利用可能",
  ].join("\n");
}

function buildScenarioProgressLines() {
  const lines = ["シナリオ進行（現在地）"];
  const stepA = game.tasks.taskAFrontDesk;
  const stepB = game.tasks.taskBRoom203;
  const stepC = game.tasks.taskCBreaker;
  const escaped = game.tasks.escaped;

  lines.push(`${stepA ? "✓" : "→"} STEP1: 1Fフロントで台帳を調べる`);
  lines.push(`${stepB ? "✓" : stepA ? "→" : " "} STEP2: 2Fの203号室でカードキー回収`);
  lines.push(`${stepC ? "✓" : stepB ? "→" : " "} STEP3: B1で非常電源をON`);
  lines.push(`${escaped ? "✓" : stepC ? "→" : " "} STEP4: 1F非常口から脱出`);
  lines.push("");

  if (!stepA) {
    lines.push("次の行動: 1Fフロントの受付を調べる");
  } else if (!stepB) {
    lines.push("次の行動: 2Fへ移動して203号室を目指す");
  } else if (!stepC) {
    lines.push("次の行動: 1F経由でB1へ行き、分電盤を操作する");
  } else if (!escaped) {
    lines.push("次の行動: 1F非常口へ向かう");
  } else {
    lines.push("次の行動: 脱出済み。断片と実績を見返そう");
  }
  lines.push("");
  return lines;
}

function buildFragmentInferenceLines() {
  const count = getCollectedFragmentCount();
  const total = getTotalFragmentCount();
  const lines = [
    "推察ノート（断片で更新）",
    `解放段階: ${count}/${total}`,
  ];

  if (count === 0) {
    lines.push("・まだ材料がない。各部屋を調べて断片を集める。");
    return lines;
  }

  lines.push("・このホテルに来た理由は『終電を逃した』だけではない。");
  if (count >= 2) {
    lines.push("・台帳とレシートの時刻が噛み合わない。時間軸が1本ではない。");
  }
  if (count >= 4) {
    lines.push("・203は客室というより、記録を書き換える“装置”に近い。");
  }
  if (count >= 6) {
    lines.push("・地下の保守記録は『コピー進行』を示している。偶発事故ではない。");
  }
  if (count >= 8) {
    lines.push("・悠斗自身が証拠を散らし、未来の自分に回収させている可能性が高い。");
  }
  if (count >= total) {
    lines.push("・最終推察: このホテルは“本物”を置き換えるために203へ誘導する。");
    lines.push("・脱出できても、外に出た自分が本物かは確定できない。");
  }
  return lines;
}

function buildPauseFragmentsText() {
  const entries = getFragmentEntries();
  const collectedCount = getCollectedFragmentCount();
  const lines = [
    `シナリオ整理 (${collectedCount}/${entries.length})`,
    "1: 操作説明  2: シナリオ整理  3: 実績",
    "",
  ];
  lines.push(...buildScenarioProgressLines());
  lines.push("断片一覧（番号付き）");
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const no = String(i + 1).padStart(2, "0");
    const unlocked = !!game.fragments[entry.key];
    lines.push(`${no}. ${unlocked ? "✓ 回収済み" : "□ 未回収"} ${entry.title}`);
    if (unlocked) {
      for (const line of entry.lines) {
        lines.push(`  ${line}`);
      }
    } else {
      lines.push("  まだ見つけていない。");
    }
    lines.push("");
  }
  lines.push(...buildFragmentInferenceLines());
  return lines.join("\n");
}

function getHiddenAchievementEntries() {
  return [
    {
      name: "一息で駆け抜けた",
      description: "捕まらずに脱出する",
      unlocked: game.stats.caughtCount === 0,
    },
    {
      name: "観察者",
      description: "2Fの201/202/204/205をすべて確認",
      unlocked: areAllPreRoomsChecked(),
    },
    {
      name: "暗闇の意志",
      description: "ライトOFF状態で脱出する",
      unlocked: game.stats.escapedWithLightOff,
    },
    {
      name: "逃げ切る勘",
      description: "救済ワープを使わず脱出する",
      unlocked: game.stats.rescueCount === 0,
    },
    {
      name: "正規ルート",
      description: "デバッグ無しで脱出する",
      unlocked: !game.stats.usedDebug,
    },
  ];
}

function buildPauseAchievementsText() {
  const entries = getHiddenAchievementEntries();
  let unlockedCount = 0;
  const lines = [
    "実績一覧",
    "1: 操作説明  2: シナリオ整理  3: 実績",
    "",
  ];
  for (const entry of entries) {
    if (entry.unlocked) unlockedCount += 1;
    lines.push(`${entry.unlocked ? "✓ 達成" : "□ 未達"} ${entry.name}`);
    lines.push(`  条件: ${entry.description}`);
  }
  const percent = Math.round((unlockedCount / entries.length) * 100);
  lines.push("");
  lines.push(`達成度: ${percent}% (${unlockedCount}/${entries.length})`);
  return lines.join("\n");
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
    if (!game.flags.pauseGuideShown) {
      game.flags.pauseGuideShown = true;
      game.pauseView = "help";
    }
    if (game.pauseView === "fragments") {
      objectiveText.textContent = buildPauseFragmentsText();
      return;
    }
    if (game.pauseView === "achievements") {
      objectiveText.textContent = buildPauseAchievementsText();
      return;
    }
    objectiveText.textContent = buildPauseHelpText();
  }

  if (mobileStatusTask && mobileStatusObjective) {
    mobileStatusTask.textContent = `タスク ${doneCount} / 3`;
    mobileStatusObjective.textContent = `次: ${buildMobileNextActionText()}`;
  }
}

function buildMobileNextActionText() {
  if (!game.tasks.taskAFrontDesk) return "1Fフロントを調べる";
  if (!game.tasks.taskBRoom203) return "2Fの203へ向かう";
  if (!game.tasks.taskCBreaker) return "B1で分電盤をON";
  if (!game.tasks.escaped) return "1F非常口へ向かう";
  return "脱出完了";
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
  drawWalls();
  drawBreakerRoomGate();
  drawRoomDoors2F();
  drawRoom203Door();
  drawMapObjects();
  drawHallucinationEffects();
  drawRoomLabels();
  drawKeys();
  drawExitDoor();
  drawInteractHint();
  drawChaser();
  drawChaserSpawnCue();
  drawPlayerSprite();
  drawGuestFurnitureForegroundLabels();
  drawHoldInteractGauge();
  drawShadowHint();
  drawDarknessOverlay();
  drawHideOverlay();
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
  drawLightMeter();

  if (game.debug) {
    drawCollisionDebug();
    drawDebugOverlay();
  }
}

function drawHallucinationEffects() {
  if (!game.hallucination) return;
  const h = game.hallucination;

  // 端を横切る影（画面外〜端）
  if (h.edgeShadowActive) {
    ctx.save();
    ctx.shadowColor = "rgba(80, 0, 120, 0.55)";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "rgba(12, 7, 22, 0.88)";
    ctx.fillRect(h.edgeShadowX - 7, h.edgeShadowY - 18, 14, 30);
    ctx.restore();
  }

  // 一瞬立つNPC（近づくとすぐ消える）
  if (h.standNpcActive) {
    const alpha = Math.max(0, Math.min(1, h.standNpcLife / 2.4));
    const fade = h.standNpcCloseFade ? alpha * 0.35 : alpha;
    ctx.save();
    ctx.shadowColor = "rgba(120, 26, 26, 0.45)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = `rgba(18, 12, 26, ${0.86 * fade})`;
    ctx.fillRect(h.standNpcX - 8, h.standNpcY - 14, 16, 30);
    ctx.fillStyle = `rgba(12, 10, 18, ${0.95 * fade})`;
    ctx.fillRect(h.standNpcX - 5, h.standNpcY - 20, 10, 8);
    ctx.restore();
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
  ctx.fillText("非常口の向こうから、夜風が流れ込む。", WORLD.width / 2, WORLD.height / 2 - 16);
  ctx.font = "20px sans-serif";
  ctx.fillText("生きて、ここまで来た。", WORLD.width / 2, WORLD.height / 2 + 26);
}

function drawEndrollOverlay() {
  if (!game.effects.endrollActive) return;
  const t = game.effects.endrollTimer;
  const p = Math.max(0, Math.min(1, t / ENDROLL_DURATION));

  // 背景のマップが薄く見えるよう、黒を少し薄める。
  ctx.fillStyle = "rgba(0, 0, 0, 0.56)";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  const vignette = ctx.createRadialGradient(
    WORLD.width / 2,
    WORLD.height / 2,
    40,
    WORLD.width / 2,
    WORLD.height / 2,
    WORLD.width * 0.8
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0.15)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.38)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  const lines = game.endroll.lines && game.endroll.lines.length > 0
    ? game.endroll.lines
    : ["『203号室の宿泊者』"];

  const lineGap = 42;
  const startY = WORLD.height + 60;
  const endY = -lines.length * lineGap;
  const y = startY + (endY - startY) * p;

  ctx.textAlign = "center";
  ctx.fillStyle = "#f1f2f7";
  for (let i = 0; i < lines.length; i += 1) {
    const lineY = y + i * lineGap;
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
    // 1F lobby floor (hotel-like material layering)
    ctx.fillStyle = "#171a20";
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    // Marble-like lobby base
    ctx.fillStyle = "#252b34";
    ctx.fillRect(20, 330, WORLD.width - 40, 190);
    ctx.strokeStyle = "rgba(170, 182, 198, 0.10)";
    ctx.lineWidth = 1;
    for (let y = 342; y <= 506; y += 22) {
      ctx.beginPath();
      ctx.moveTo(28, y);
      ctx.lineTo(WORLD.width - 28, y);
      ctx.stroke();
    }

    // Front desk zone and back office tone
    ctx.fillStyle = "#322a28";
    ctx.fillRect(210, 20, 370, 170);
    ctx.fillStyle = "#3a302c";
    ctx.fillRect(220, 28, 350, 64);

    // Elevator hall floor tile
    ctx.fillStyle = "#2b323c";
    ctx.fillRect(620, 80, 280, 260);
    for (let x = 632; x <= 880; x += 36) {
      ctx.strokeStyle = "rgba(140, 150, 168, 0.12)";
      ctx.beginPath();
      ctx.moveTo(x, 88);
      ctx.lineTo(x, 334);
      ctx.stroke();
    }

    // Restroom side floor
    ctx.fillStyle = "#2a313a";
    ctx.fillRect(40, 180, 140, 220);

    // Carpet runner from entrance to front desk
    const carpetX = 432;
    const carpetW = 96;
    const carpetY = 212;
    const carpetH = 286;
    ctx.fillStyle = "#4e2d33";
    ctx.fillRect(carpetX, carpetY, carpetW, carpetH);
    ctx.strokeStyle = "rgba(95, 82, 74, 0.75)";
    ctx.lineWidth = 2;
    ctx.strokeRect(carpetX + 3, carpetY + 3, carpetW - 6, carpetH - 6);
    for (let y = carpetY + 16; y < carpetY + carpetH - 12; y += 28) {
      ctx.fillStyle = "rgba(125, 112, 98, 0.16)";
      ctx.fillRect(carpetX + 12, y, carpetW - 24, 8);
    }

    // Entrance mat
    ctx.fillStyle = "#2a2b32";
    ctx.fillRect(390, 470, 180, 30);
    ctx.fillStyle = "rgba(240, 240, 245, 0.28)";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("WELCOME", 480, 489);

    // Ceiling downlight glow spots
    const lightSpots = [
      { x: 300, y: 120, r: 120 },
      { x: 480, y: 120, r: 120 },
      { x: 760, y: 130, r: 128 },
      { x: 150, y: 240, r: 96 },
    ];
    for (const spot of lightSpots) {
      const grad = ctx.createRadialGradient(spot.x, spot.y, 4, spot.x, spot.y, spot.r);
      grad.addColorStop(0, "rgba(255, 240, 190, 0.12)");
      grad.addColorStop(1, "rgba(255, 240, 190, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(spot.x, spot.y, spot.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Wayfinding accents
    ctx.fillStyle = "rgba(210, 180, 115, 0.45)";
    ctx.fillRect(632, 104, 256, 3); // elevator hall accent
    ctx.fillRect(232, 104, 312, 3); // front desk accent
  } else if (game.mapId === "map2") {
    // 2F guest floor: wallpaper + corridor carpet + subtle warm lights.
    ctx.fillStyle = "#1c1f27";
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    // Wall zones (upper rooms / lower rooms) with slightly different tones.
    ctx.fillStyle = "#322b39";
    ctx.fillRect(20, 20, WORLD.width - 40, 150);
    ctx.fillStyle = "#2c2834";
    ctx.fillRect(20, 320, WORLD.width - 40, 200);

    // Corridor base.
    ctx.fillStyle = "#343b48";
    ctx.fillRect(20, 170, WORLD.width - 40, 150);

    // Carpet runner in the corridor.
    ctx.fillStyle = "#4a2f3d";
    ctx.fillRect(48, 218, WORLD.width - 96, 52);
    ctx.strokeStyle = "rgba(98, 88, 80, 0.72)";
    ctx.lineWidth = 2;
    ctx.strokeRect(52, 222, WORLD.width - 104, 44);
    for (let x = 78; x <= WORLD.width - 90; x += 62) {
      ctx.fillStyle = "rgba(120, 110, 102, 0.16)";
      ctx.fillRect(x, 236, 26, 10);
    }

    // Elevator hall tile.
    ctx.fillStyle = "#2d3745";
    ctx.fillRect(40, 350, 220, 140);
    ctx.strokeStyle = "rgba(165, 178, 198, 0.14)";
    for (let x = 52; x <= 244; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 358);
      ctx.lineTo(x, 482);
      ctx.stroke();
    }

    // Lower side rooms.
    ctx.fillStyle = "#342d3a";
    ctx.fillRect(320, 340, 180, 180); // room206
    ctx.fillStyle = "#322a37";
    ctx.fillRect(520, 340, 200, 180); // room207
    ctx.fillStyle = "#30323a";
    ctx.fillRect(740, 340, 200, 180); // linen room

    // Wooden skirting line (gives hotel hallway feel).
    // 上側はドア開口部を避けて描画し、入口上の線被りを防ぐ。
    ctx.fillStyle = "#5f4a3a";
    ctx.fillRect(20, 166, 90, 4);
    ctx.fillRect(150, 166, 140, 4);
    ctx.fillRect(330, 166, 140, 4);
    ctx.fillRect(510, 166, 140, 4);
    ctx.fillRect(690, 166, 140, 4);
    ctx.fillRect(870, 166, 70, 4);
    ctx.fillRect(20, 320, WORLD.width - 40, 4);

    // Ceiling downlight glow spots along corridor.
    const corridorLights = [
      { x: 120, y: 196, r: 76 },
      { x: 300, y: 196, r: 82 },
      { x: 480, y: 196, r: 86 },
      { x: 660, y: 196, r: 82 },
      { x: 840, y: 196, r: 76 },
    ];
    for (const light of corridorLights) {
      const grad = ctx.createRadialGradient(light.x, light.y, 4, light.x, light.y, light.r);
      grad.addColorStop(0, "rgba(255, 230, 170, 0.14)");
      grad.addColorStop(1, "rgba(255, 230, 170, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(light.x, light.y, light.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Floor grain for depth.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    for (let y = 176; y <= 312; y += 10) {
      ctx.beginPath();
      ctx.moveTo(24, y);
      ctx.lineTo(WORLD.width - 24, y);
      ctx.stroke();
    }

    drawGuestRoomFurniture();
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

    // Subtle grunge grid to make floor feel like industrial panels.
    ctx.strokeStyle = "rgba(140, 160, 190, 0.08)";
    ctx.lineWidth = 1;
    for (let x = 40; x < WORLD.width - 20; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 160);
      ctx.lineTo(x, 520);
      ctx.stroke();
    }
    for (let y = 176; y < 520; y += 34) {
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(WORLD.width - 20, y);
      ctx.stroke();
    }

    // Main maintenance route line (stairs -> breaker).
    ctx.strokeStyle = "rgba(220, 185, 90, 0.32)";
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.moveTo(130, 430);
    ctx.lineTo(130, 300);
    ctx.lineTo(710, 300);
    ctx.lineTo(710, 150);
    ctx.lineTo(845, 150);
    ctx.stroke();
    ctx.setLineDash([]);

    // 上下開口の誘導マーク
    ctx.fillStyle = "rgba(190, 200, 220, 0.14)";
    ctx.fillRect(148, 145, 44, 10);
    ctx.fillRect(453, 145, 44, 10);
    ctx.fillRect(270, 405, 64, 10);
    ctx.fillRect(668, 405, 44, 10);
    ctx.fillRect(848, 405, 44, 10);

    // Overhead cable lines.
    ctx.strokeStyle = "rgba(95, 120, 150, 0.24)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 70);
    ctx.lineTo(300, 70);
    ctx.lineTo(330, 90);
    ctx.lineTo(610, 90);
    ctx.lineTo(640, 70);
    ctx.lineTo(920, 70);
    ctx.stroke();

    // Warning posts / tiny utility lights.
    ctx.fillStyle = "rgba(230, 185, 85, 0.7)";
    ctx.fillRect(62, 158, 6, 6);
    ctx.fillRect(896, 158, 6, 6);
    ctx.fillRect(62, 398, 6, 6);
    ctx.fillRect(896, 398, 6, 6);
  }
}

function drawGuestRoomFurniture() {
  const roomLefts = [40, 220, 400, 580, 760];
  const roomTop = 20;
  const roomBottom = 170;
  for (let i = 0; i < roomLefts.length; i += 1) {
    const left = roomLefts[i];
    const bedX = i === 0 ? left - 20 : left + 2;
    const deskX = i === 0 ? left - 20 : left + 2;
    const wardrobeX = i === roomLefts.length - 1 ? left + 162 : left + 138;
    const bathX = i === roomLefts.length - 1 ? left + 128 : left + 108;
    // Bed (top-left corner, touching two walls)
    ctx.fillStyle = "#6d6f88";
    ctx.fillRect(bedX, roomTop + 2, 76, 38);
    ctx.fillStyle = "#cfd6e8";
    ctx.fillRect(bedX + 6, roomTop + 8, 24, 10);

    // Wardrobe (top-right corner)
    ctx.fillStyle = "#5a4f49";
    ctx.fillRect(wardrobeX, roomTop + 2, 16, 56);
    ctx.fillStyle = "#8b7a6d";
    ctx.fillRect(wardrobeX + 7, roomTop + 6, 2, 46);

    // Desk (bottom-left corner)
    ctx.fillStyle = "#63564a";
    ctx.fillRect(deskX, roomBottom - 30, 24, 28);
    ctx.fillStyle = "#42392f";
    ctx.fillRect(deskX + 2, roomBottom - 2, 5, 8);
    ctx.fillRect(deskX + 17, roomBottom - 2, 5, 8);

    // Bath + toilet (bottom-right corner, larger)
    ctx.fillStyle = "#4f6071";
    ctx.fillRect(bathX, roomBottom - 66, 50, 64);
    ctx.fillStyle = "#8aa1b8";
    ctx.fillRect(bathX + 2, roomBottom - 60, 22, 16); // tub
    ctx.fillStyle = "#d8e1eb";
    ctx.fillRect(bathX + 28, roomBottom - 58, 9, 9); // sink
    ctx.fillStyle = "#e8edf2";
    ctx.fillRect(bathX + 30, roomBottom - 40, 10, 14); // toilet
  }
}

function drawGuestFurnitureForegroundLabels() {
  if (game.mapId !== "map2") return;
  ctx.save();
  ctx.textAlign = "center";
  ctx.lineJoin = "round";
  for (const obj of game.world.interactables) {
    if (obj.id.endsWith("_bed")) {
      ctx.font = "bold 12px sans-serif";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.82)";
      ctx.strokeText("ベッド", obj.x + obj.w / 2, obj.y + obj.h / 2 + 4);
      ctx.fillStyle = "rgba(245, 245, 252, 0.98)";
      ctx.fillText("ベッド", obj.x + obj.w / 2, obj.y + obj.h / 2 + 4);
    }
    if (obj.id.endsWith("_bath")) {
      ctx.font = "bold 11px sans-serif";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.82)";
      ctx.strokeText("バス・トイレ", obj.x + obj.w / 2, obj.y + obj.h / 2 + 4);
      ctx.fillStyle = "rgba(245, 245, 252, 0.98)";
      ctx.fillText("バス・トイレ", obj.x + obj.w / 2, obj.y + obj.h / 2 + 4);
    }
  }
  ctx.restore();
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

function drawRoom203Door() {
  if (game.mapId !== "map2") return;
  const lockedByRule = !areAllPreRoomsChecked();
  const opened = game.roomDoorsOpened && game.roomDoorsOpened.room203;
  const woodBase = opened ? "rgba(112, 82, 56, 0.35)" : "#7b5a3b";
  ctx.fillStyle = woodBase;
  ctx.fillRect(ROOM203_DOOR.x, ROOM203_DOOR.y, ROOM203_DOOR.w, ROOM203_DOOR.h);
  ctx.fillStyle = "rgba(35, 22, 14, 0.25)";
  ctx.fillRect(ROOM203_DOOR.x + 4, ROOM203_DOOR.y + 5, ROOM203_DOOR.w - 8, 4);
  ctx.fillStyle = "rgba(220, 190, 120, 0.9)";
  ctx.fillRect(ROOM203_DOOR.x + ROOM203_DOOR.w - 8, ROOM203_DOOR.y + 8, 3, 3);
  if (lockedByRule && !opened) {
    ctx.fillStyle = "rgba(120, 24, 24, 0.35)";
    ctx.fillRect(ROOM203_DOOR.x, ROOM203_DOOR.y, ROOM203_DOOR.w, ROOM203_DOOR.h);
    ctx.fillStyle = "rgba(255, 220, 120, 0.85)";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("LOCK", ROOM203_DOOR.x + ROOM203_DOOR.w / 2, ROOM203_DOOR.y - 4);
  }
}

function drawBreakerRoomGate() {
  if (game.mapId !== "map3") return;
  const gate = getBreakerRoomGateRect();
  const locked = isBreakerRoomGateLocked();
  ctx.fillStyle = locked ? "#6f2f36" : "rgba(80, 120, 90, 0.45)";
  ctx.fillRect(gate.x, gate.y, gate.w, gate.h);
  if (locked) {
    ctx.fillStyle = "rgba(245, 220, 120, 0.9)";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("LOCK", gate.x + gate.w / 2, gate.y - 4);
  }
}

function drawRoomDoors2F() {
  if (game.mapId !== "map2") return;
  for (const door of ROOM2_DOORS) {
    if (door.id === "room203") continue;
    const opened = game.roomDoorsOpened && game.roomDoorsOpened[door.id];
    ctx.fillStyle = opened ? "rgba(112, 82, 56, 0.35)" : "#7b5a3b";
    ctx.fillRect(door.x, door.y, door.w, door.h);
    ctx.fillStyle = "rgba(35, 22, 14, 0.22)";
    ctx.fillRect(door.x + 4, door.y + 5, door.w - 8, 4);
    if (!opened) {
      ctx.fillStyle = "rgba(220, 190, 120, 0.9)";
      ctx.fillRect(door.x + door.w - 8, door.y + 8, 3, 3);
    }
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

    // デバッグ時のみ: 未回収の断片オブジェクトを光らせて場所を可視化。
    if (game.debug) {
      const frag = STORY_FRAGMENT_BY_OBJECT[obj.id];
      if (frag && !game.fragments[frag.key]) {
        const pulse = 0.5 + Math.sin(performance.now() * 0.012) * 0.5;
        ctx.save();
        ctx.strokeStyle = `rgba(255, 230, 120, ${0.5 + pulse * 0.45})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = "rgba(255, 230, 120, 0.85)";
        ctx.shadowBlur = 10 + pulse * 8;
        ctx.strokeRect(obj.x - 3, obj.y - 3, obj.w + 6, obj.h + 6);
        ctx.fillStyle = "rgba(255, 240, 170, 0.95)";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("断片", obj.x + obj.w / 2, Math.max(14, obj.y - 8));
        ctx.restore();
      }
    }

    // Label plate with offset to avoid overlapping wall tops.
    if (!obj.label) continue;
    const isLargeObject = obj.w >= 100 || obj.h >= 60;
    const labelY = (obj.id === "front_silent_staff" && game.mapId === "map1")
      ? Math.min(WORLD.height - 8, obj.y + obj.h + 14)
      : (obj.id === "elevator_to_2f" && game.mapId === "map1")
      ? Math.min(WORLD.height - 8, obj.y + obj.h + 14)
      : (obj.id === "frontdesk_ledger" || isLargeObject)
        ? Math.max(16, obj.y - 12)
        : game.mapId === "map3"
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

  if (obj.id === "lobby_table") {
    // Lobby table: wood top + legs.
    ctx.fillStyle = "#6a5b4d";
    ctx.fillRect(obj.x, obj.y, obj.w, 14);
    ctx.fillStyle = "#4a3f35";
    ctx.fillRect(obj.x + 8, obj.y + 14, 8, obj.h - 14);
    ctx.fillRect(obj.x + obj.w - 16, obj.y + 14, 8, obj.h - 14);
    return;
  }

  if (obj.id === "front_flower_wood") {
    // Wooden stand + flower vase.
    ctx.fillStyle = "#6d5a48";
    ctx.fillRect(obj.x, obj.y + 8, obj.w, obj.h - 8);
    ctx.fillStyle = "#4e3f33";
    ctx.fillRect(obj.x + 6, obj.y + obj.h - 8, obj.w - 12, 6);
    ctx.fillStyle = "#b7c8e6";
    ctx.fillRect(obj.x + obj.w / 2 - 6, obj.y, 12, 12);
    ctx.fillStyle = "#d07aa2";
    ctx.fillRect(obj.x + obj.w / 2 - 10, obj.y - 4, 6, 6);
    ctx.fillRect(obj.x + obj.w / 2 + 4, obj.y - 4, 6, 6);
    ctx.fillStyle = "#5ea06b";
    ctx.fillRect(obj.x + obj.w / 2 - 1, obj.y - 2, 2, 10);
    return;
  }

  if (obj.id === "front_silent_staff") {
    // Silent front staff silhouette.
    ctx.fillStyle = "#1f2230";
    ctx.fillRect(obj.x + 6, obj.y, 10, 10);
    ctx.fillRect(obj.x + 5, obj.y + 10, 12, 14);
    ctx.fillRect(obj.x + 4, obj.y + 24, 6, 10);
    ctx.fillRect(obj.x + 12, obj.y + 24, 6, 10);
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fillRect(obj.x + 8, obj.y + 4, 2, 2);
    return;
  }

  if (obj.id === "lobby_guest") {
    // Silent seated guest silhouette.
    ctx.fillStyle = "#1f2230";
    ctx.fillRect(obj.x + 6, obj.y, 10, 10); // head
    ctx.fillRect(obj.x + 5, obj.y + 10, 12, 12); // torso
    ctx.fillRect(obj.x + 4, obj.y + 22, 6, 8); // leg
    ctx.fillRect(obj.x + 12, obj.y + 22, 6, 8); // leg
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(obj.x + 6, obj.y + 4, 2, 2);
    return;
  }

  if (obj.id === "service_stairs_to_b1") {
    // Stairs: step-like stripes.
    ctx.fillStyle = "#4f5a47";
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    for (let i = 0; i < 6; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? "#6b785f" : "#3f473a";
      ctx.fillRect(obj.x + 8, obj.y + 10 + i * 12, obj.w - 16, 6);
    }
    return;
  }

  if (obj.id === "public_restroom_m" || obj.id === "public_restroom_f") {
    ctx.fillStyle = obj.id === "public_restroom_m" ? "#5b666f" : "#5c6074";
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(obj.x + obj.w / 2 - 8, obj.y + 8, 16, 16);
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
    // Generator bank: segmented modules with vents and gauges.
    ctx.fillStyle = "#4b5564";
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    for (let i = 0; i < 4; i += 1) {
      const sx = obj.x + 8 + i * 40;
      ctx.fillStyle = "#2a2f3b";
      ctx.fillRect(sx, obj.y + 8, 34, obj.h - 16);
      ctx.fillStyle = "#6f7d90";
      ctx.fillRect(sx + 4, obj.y + 14, 12, 3);
      ctx.fillRect(sx + 4, obj.y + 22, 12, 3);
      ctx.fillRect(sx + 4, obj.y + 30, 12, 3);
      ctx.fillStyle = "#9bb2ca";
      ctx.fillRect(sx + 22, obj.y + 14, 6, 6);
    }
    ctx.fillStyle = "#cc4444";
    ctx.fillRect(obj.x + obj.w - 14, obj.y + 10, 6, 6); // warning lamp
    return;
  }

  if (obj.id === "pipe_rack") {
    // Pipe rack: two-level pipe bundle and valves.
    ctx.fillStyle = "#43595f";
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    ctx.strokeStyle = "#8aa0a8";
    ctx.lineWidth = 4;
    for (let i = 0; i < 2; i += 1) {
      const y = obj.y + 12 + i * 18;
      ctx.beginPath();
      ctx.moveTo(obj.x + 8, y);
      ctx.lineTo(obj.x + obj.w - 8, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "#6f8790";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i += 1) {
      const x = obj.x + 26 + i * 52;
      ctx.beginPath();
      ctx.moveTo(x, obj.y + 8);
      ctx.lineTo(x, obj.y + obj.h - 8);
      ctx.stroke();
    }
    ctx.fillStyle = "#c57d3f";
    ctx.fillRect(obj.x + 18, obj.y + 8, 6, 6);
    ctx.fillRect(obj.x + obj.w - 24, obj.y + 26, 6, 6);
    return;
  }

  if (obj.id === "control_console") {
    // Control console: tall wall-mounted operation panel.
    ctx.fillStyle = "#5a5f4f";
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    ctx.fillStyle = "#2b2f28";
    ctx.fillRect(obj.x + 8, obj.y + 8, obj.w - 16, obj.h - 16);
    ctx.fillStyle = "#3f463a";
    ctx.fillRect(obj.x + 12, obj.y + 58, obj.w - 24, 18); // screen area
    ctx.fillStyle = "#6ad06a";
    ctx.fillRect(obj.x + obj.w / 2 - 2, obj.y + 16, 4, 4);
    ctx.fillStyle = "#d8bf5a";
    ctx.fillRect(obj.x + obj.w / 2 - 2, obj.y + 28, 4, 4);
    ctx.fillStyle = "#cc5a5a";
    ctx.fillRect(obj.x + obj.w / 2 - 2, obj.y + 40, 4, 4);
    ctx.fillStyle = "#95a8bc";
    ctx.fillRect(obj.x + obj.w / 2 - 7, obj.y + 86, 14, 18); // lever
    return;
  }

  if (obj.id === "machine_room") {
    // Machine room: heavy housing with hatches and caution marks.
    ctx.fillStyle = "#5a4f3b";
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    ctx.fillStyle = "#2b241c";
    ctx.fillRect(obj.x + 10, obj.y + 12, obj.w - 20, obj.h - 24);
    for (let i = 0; i < 3; i += 1) {
      const x = obj.x + 20 + i * 52;
      ctx.fillStyle = "#77715f";
      ctx.fillRect(x, obj.y + 24, 28, 4);
      ctx.fillRect(x, obj.y + 32, 28, 4);
      ctx.fillStyle = "#8c8570";
      ctx.fillRect(x + 8, obj.y + 50, 12, 12);
    }
    for (let i = 0; i < 8; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? "#d9b24a" : "#3a2f1d";
      ctx.fillRect(obj.x + 10 + i * 20, obj.y + obj.h - 12, 20, 4);
    }
    return;
  }

  if (obj.id === "breaker_task") {
    // Breaker panel: larger electrical cabinet with toggle row.
    ctx.fillStyle = "#58654f";
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    ctx.fillStyle = "#2d3528";
    ctx.fillRect(obj.x + 8, obj.y + 8, obj.w - 16, obj.h - 16);
    ctx.fillStyle = "#b7bcc7";
    ctx.fillRect(obj.x + obj.w - 20, obj.y + obj.h / 2 - 10, 4, 20);
    ctx.fillStyle = "#95a0ac";
    for (let i = 0; i < 4; i += 1) {
      ctx.fillRect(obj.x + 18 + i * 20, obj.y + obj.h - 26, 8, 10);
    }
    ctx.fillStyle = "#d56d4d";
    ctx.fillRect(obj.x + 14, obj.y + 14, 6, 6);
    return;
  }

  if (obj.id === "stairs_to_1f") {
    // Stair look: layered treads from front to back.
    ctx.fillStyle = "#42546a";
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    const steps = 7;
    const stepH = Math.floor((obj.h - 10) / steps);
    for (let i = 0; i < steps; i += 1) {
      const y = obj.y + 5 + i * stepH;
      ctx.fillStyle = i % 2 === 0 ? "#6f8193" : "#4f6175";
      ctx.fillRect(obj.x + 8, y, obj.w - 16, stepH - 1);
    }
    ctx.strokeStyle = "#223041";
    ctx.lineWidth = 2;
    ctx.strokeRect(obj.x + 1, obj.y + 1, obj.w - 2, obj.h - 2);
    ctx.fillStyle = "rgba(235, 220, 150, 0.9)";
    ctx.beginPath();
    ctx.moveTo(obj.x + obj.w / 2, obj.y + 10);
    ctx.lineTo(obj.x + obj.w / 2 - 6, obj.y + 20);
    ctx.lineTo(obj.x + obj.w / 2 + 6, obj.y + 20);
    ctx.closePath();
    ctx.fill();
    return;
  }

  if (obj.id === "service_room_a" || obj.id === "wiring_room") {
    // Utility rooms: thicker metal walls with conduit details.
    ctx.fillStyle = obj.color;
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    ctx.strokeStyle = "rgba(20, 20, 24, 0.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(obj.x + 1, obj.y + 1, obj.w - 2, obj.h - 2);
    ctx.fillStyle = "rgba(230, 238, 248, 0.10)";
    ctx.fillRect(obj.x + 8, obj.y + 8, obj.w - 16, 4);
    ctx.fillStyle = "rgba(140, 170, 200, 0.18)";
    ctx.fillRect(obj.x + 10, obj.y + obj.h - 16, obj.w - 20, 3);
    ctx.fillRect(obj.x + obj.w - 18, obj.y + 14, 4, obj.h - 28);
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

  if (obj.id === "feeding_scene") {
    // B1 right-bottom: adjacent-room peep window showing a feeding shadow.
    ctx.fillStyle = "#22242c";
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    // Wall panel around the window.
    ctx.strokeStyle = "#13151b";
    ctx.lineWidth = 2;
    ctx.strokeRect(obj.x + 1, obj.y + 1, obj.w - 2, obj.h - 2);
    // Window frame (player peeks through this).
    ctx.fillStyle = "#5a4a3c";
    ctx.fillRect(obj.x + 8, obj.y + 10, obj.w - 16, 28);
    ctx.fillStyle = "#0f1016";
    ctx.fillRect(obj.x + 12, obj.y + 14, obj.w - 24, 20);
    // Shadow figure seen behind the window.
    ctx.fillStyle = "rgba(10, 8, 16, 0.92)";
    ctx.fillRect(obj.x + 28, obj.y + 16, 10, 16);
    ctx.fillRect(obj.x + 24, obj.y + 24, 18, 10);
    // Blood traces below the window.
    drawBloodStain(obj.x + 24, obj.y + 52, 20, 10, 0.1);
    drawBloodStain(obj.x + 50, obj.y + 56, 16, 8, -0.25);
    ctx.fillStyle = "rgba(115, 10, 18, 0.65)";
    ctx.fillRect(obj.x + 36, obj.y + 46, 14, 6);
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
    ctx.fillText("男性用", 108, 238);
    ctx.fillText("女性用", 108, 338);
  } else if (game.mapId === "map2") {
    ctx.fillText("2F客室廊下", 470, 245);
    ctx.fillText("客室201", 130, 92);
    ctx.fillText("客室202", 310, 92);
    ctx.fillText("客室204", 490, 92);
    ctx.fillText("客室205", 670, 92);
    ctx.fillText("客室203", 850, 92);
    ctx.fillText("客室206", 410, 420);
    ctx.fillText("客室207", 620, 420);
    ctx.fillText("リネン室", 840, 420);
  } else if (game.mapId === "map3") {
    ctx.fillText("B1サービス廊下", 470, 260);
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
  ctx.fillText(door.unlocked ? "出口(Space)" : "施錠中", door.x - 8, door.y + door.h / 2);
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
  const text = target.prompt || "Space: 調べる";
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
  const pulse = 0.75 + Math.sin(performance.now() * 0.011) * 0.14;

  ctx.save();
  ctx.shadowColor = "rgba(80, 0, 120, 0.65)";
  ctx.shadowBlur = 16;

  // 追跡者は「黒い影」のまま動く見た目に統一。
  ctx.fillStyle = `rgba(8, 5, 16, ${0.92 * pulse})`;
  ctx.fillRect(x + 3, y + 2, 12, 24);
  ctx.fillRect(x + 1, y + 8, 16, 14);
  ctx.fillStyle = "rgba(18, 10, 30, 0.72)";
  ctx.fillRect(x + 5, y + 0, 8, 6);
  ctx.restore();
}

function drawChaserSpawnCue() {
  if (game.effects.chaserSpawnCueTimer <= 0 || game.chaser.mapId !== game.mapId) return;

  const ratio = game.effects.chaserSpawnCueTimer / 0.7;
  const cx = game.effects.chaserSpawnCueX;
  const cy = game.effects.chaserSpawnCueY;
  const radius = 18 + (1 - ratio) * 58;

  ctx.save();
  ctx.strokeStyle = `rgba(190, 32, 40, ${0.65 * ratio})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = `rgba(120, 0, 10, ${0.18 * ratio})`;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawChaseDangerOverlay() {
  if (!game.chaser.active || game.chaser.mapId !== game.mapId || game.chaser.spawnDelay > 0) return;
  const playerCenter = getCenter(game.player);
  const chaserCenter = getCenter(game.chaser);
  const distance = Math.hypot(playerCenter.x - chaserCenter.x, playerCenter.y - chaserCenter.y);
  if (distance > 170) return;

  const near = Math.max(0, Math.min(1, (170 - distance) / 170));
  const pulse = 0.5 + Math.sin(performance.now() * 0.018) * 0.5;
  const alpha = near * (0.18 + pulse * 0.12);
  ctx.fillStyle = `rgba(120, 0, 0, ${alpha})`;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  // Edge vignette gets stronger as distance gets closer.
  const edgeAlpha = Math.min(0.45, near * 0.5);
  const grad = ctx.createRadialGradient(
    WORLD.width / 2,
    WORLD.height / 2,
    Math.min(WORLD.width, WORLD.height) * 0.22,
    WORLD.width / 2,
    WORLD.height / 2,
    Math.max(WORLD.width, WORLD.height) * 0.72
  );
  grad.addColorStop(0, "rgba(0, 0, 0, 0)");
  grad.addColorStop(1, `rgba(55, 0, 0, ${edgeAlpha})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  if (distance < 120) {
    ctx.fillStyle = `rgba(255, 185, 185, ${0.28 + pulse * 0.22})`;
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("背後にいる", WORLD.width / 2, 72);
  }
}

function drawDarknessOverlay() {
  if (game.debug) return;

  const baseDarkness = getMapDarknessBase();
  const darknessMultiplierByLight = game.lightOn
    ? 1.08
    : game.mapId === "map2" || game.mapId === "map3"
      ? 1.20
      : 1.72;
  const darkness = Math.max(0, Math.min(1, baseDarkness * game.settings.darknessMultiplier * darknessMultiplierByLight));
  if (darkness <= 0.01) return;

  const centerX = game.player.x + game.player.w / 2;
  const centerY = game.player.y + game.player.h / 2;
  const offRadius = 64;
  const radius = game.hide.active ? 44 : game.lightOn ? 160 : offRadius;

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

function drawLightMeter() {
  if (!hasStartedGame || game.effects.endrollActive || game.ending) return;
  const meterW = 182;
  const meterH = 16;
  const x = WORLD.width - meterW - 18;
  const y = WORLD.height - meterH - 16;
  const ratio = Math.max(0, Math.min(1, game.light.charge / game.light.maxCharge));
  const fillW = Math.round((meterW - 4) * ratio);

  ctx.fillStyle = "rgba(10, 12, 20, 0.72)";
  ctx.fillRect(x - 8, y - 24, meterW + 16, meterH + 34);
  ctx.strokeStyle = "rgba(180, 190, 215, 0.65)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 8, y - 24, meterW + 16, meterH + 34);

  ctx.fillStyle = "rgba(20, 24, 35, 0.92)";
  ctx.fillRect(x, y, meterW, meterH);
  const grad = ctx.createLinearGradient(x, y, x + meterW, y);
  grad.addColorStop(0, "#c65252");
  grad.addColorStop(0.5, "#d8b65b");
  grad.addColorStop(1, "#5ccf83");
  ctx.fillStyle = grad;
  ctx.fillRect(x + 2, y + 2, fillW, meterH - 4);
  ctx.strokeStyle = "rgba(235, 240, 255, 0.55)";
  ctx.strokeRect(x + 0.5, y + 0.5, meterW - 1, meterH - 1);

  ctx.fillStyle = "rgba(240, 245, 255, 0.95)";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`LIGHT ${game.lightOn ? "ON" : "OFF"}`, x, y - 8);
}

function drawHideOverlay() {
  if (!game.hide.active) return;
  // 隠れ中は視界を強く狭め、緊張感を上げる。
  const pulse = 0.5 + Math.sin(performance.now() * 0.012) * 0.5;
  ctx.fillStyle = `rgba(0, 0, 0, ${0.72 + pulse * 0.12})`;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  const vignette = ctx.createRadialGradient(
    WORLD.width / 2,
    WORLD.height / 2,
    40,
    WORLD.width / 2,
    WORLD.height / 2,
    WORLD.width * 0.7
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.72)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  const slitY = WORLD.height / 2;
  const grad = ctx.createLinearGradient(0, slitY - 7, 0, slitY + 7);
  grad.addColorStop(0, "rgba(210, 210, 220, 0)");
  grad.addColorStop(0.5, "rgba(210, 210, 220, 0.36)");
  grad.addColorStop(1, "rgba(210, 210, 220, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, slitY - 7, WORLD.width, 14);

  // 203ロッカー専用: すき間の向こうを影が横切る。
  if (game.hide.mode === "room203_escape") {
    const t = game.hide.timer;
    const pass = Math.max(0, Math.min(1, (t - 2.0) / 4.0));
    if (pass > 0 && pass < 1) {
      const sx = WORLD.width * (0.74 - pass * 0.52);
      const sy = slitY - 18 + Math.sin(t * 4.8) * 1.5;
      ctx.save();
      ctx.shadowColor = "rgba(120, 0, 140, 0.6)";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "rgba(8, 6, 16, 0.85)";
      ctx.fillRect(sx, sy, 14, 28);
      ctx.fillRect(sx - 2, sy + 8, 18, 12);
      ctx.restore();
    }
  }

  ctx.fillStyle = "rgba(235, 235, 245, 0.85)";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "rgba(232, 232, 242, 0.86)";
  ctx.fillText("Spaceで隠れ場所から出る", WORLD.width / 2, WORLD.height - 30);
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

function drawImageContainTop(context, image, dx, dy, dw, dh) {
  const srcW = image.width;
  const srcH = image.height;
  if (!srcW || !srcH) {
    context.drawImage(image, dx, dy, dw, dh);
    return;
  }
  const scale = Math.min(dw / srcW, dh / srcH);
  const rw = srcW * scale;
  const rh = srcH * scale;
  const rx = dx + (dw - rw) * 0.5;
  const ry = dy; // 上寄せ
  context.drawImage(image, rx, ry, rw, rh);
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
    roomChecks: { ...game.roomChecks },
    roomDoorsOpened: { ...game.roomDoorsOpened },
    inventory: [...game.inventory],
    light: { ...game.light },
    lightOn: game.lightOn,
    latestMemo: game.latestMemo,
    emotion: game.emotion,
    flags: { ...game.flags },
    fragments: { ...game.fragments },
    stats: JSON.parse(JSON.stringify(game.stats)),
  };
}

function restoreFromCheckpoint() {
  if (!game || !game.checkpoint) {
    resetGame();
    return;
  }

  // 2Fで捕まった場合は、追跡が近すぎる再開を避けるため Task B前へ戻す。
  const shouldRollbackBeforeTaskB = (
    game.endingType === "Caught" &&
    game.mapId === "map2" &&
    game.tasks.taskBRoom203
  );

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
  game.roomChecks = { ...cp.roomChecks };
  game.roomDoorsOpened = cp.roomDoorsOpened
    ? { ...cp.roomDoorsOpened }
    : { room201: false, room202: false, room204: false, room205: false, room203: false };
  game.inventory = [...cp.inventory];
  if (cp.light) {
    game.light = { ...cp.light };
    game.lightOn = cp.lightOn && cp.light.charge > 0;
  }
  game.latestMemo = cp.latestMemo;
  game.emotion = cp.emotion;
  game.flags = { ...cp.flags };
  game.fragments = normalizeFragmentsState(cp.fragments);
  game.stats = cp.stats
    ? JSON.parse(JSON.stringify(cp.stats))
    : {
      runTimeSec: 0,
      caughtCount: 0,
      rescueCount: 0,
      chaseStartCount: 0,
      usedDebug: false,
      mapVisited: { map1: true, map2: false, map3: false },
      escapedWithLightOff: false,
    };
  if (typeof game.flags.forceChaseActive === "undefined") game.flags.forceChaseActive = false;
  if (typeof game.flags.b1FeedingNoticed === "undefined") game.flags.b1FeedingNoticed = false;
  if (typeof game.flags.b1FeedingRetreatWarned === "undefined") game.flags.b1FeedingRetreatWarned = false;
  if (typeof game.flags.b1FeedingChaseTriggered === "undefined") game.flags.b1FeedingChaseTriggered = false;
  if (typeof game.flags.b1DoorAmbushTriggered === "undefined") game.flags.b1DoorAmbushTriggered = false;
  if (typeof game.flags.b1EntryForeshadowPlayed === "undefined") game.flags.b1EntryForeshadowPlayed = false;
  if (typeof game.flags.b1ReturnTalkPlayed === "undefined") game.flags.b1ReturnTalkPlayed = false;
  if (typeof game.flags.room203ExitAmbushTriggered === "undefined") game.flags.room203ExitAmbushTriggered = false;
  if (typeof game.flags.room203HideSurvived === "undefined") game.flags.room203HideSurvived = false;
  if (typeof game.flags.room204205ReappearTriggered === "undefined") game.flags.room204205ReappearTriggered = false;
  if (typeof game.flags.lastCaughtByLockerLight === "undefined") game.flags.lastCaughtByLockerLight = false;
  if (typeof game.flags.linenDoorOpened === "undefined") game.flags.linenDoorOpened = false;
  if (typeof game.flags.linenCenterTalkPlayed === "undefined") game.flags.linenCenterTalkPlayed = false;
  if (typeof game.flags.finalChasePending === "undefined") game.flags.finalChasePending = false;
  if (typeof game.flags.lightTutorialShown === "undefined") game.flags.lightTutorialShown = false;
  if (typeof game.flags.lightFirstOnExplained === "undefined") game.flags.lightFirstOnExplained = false;
  if (typeof game.flags.pauseGuideShown === "undefined") game.flags.pauseGuideShown = false;
  if (typeof game.flags.fragmentPauseHint3Shown === "undefined") game.flags.fragmentPauseHint3Shown = false;
  if (typeof game.flags.fragmentPauseHint6Shown === "undefined") game.flags.fragmentPauseHint6Shown = false;
  if (typeof game.flags.fragmentPauseHint10Shown === "undefined") game.flags.fragmentPauseHint10Shown = false;
  if (!game.fragments) {
    game.fragments = createEmptyFragmentsState();
  } else {
    game.fragments = normalizeFragmentsState(game.fragments);
  }
  if (!game.b1DoorAmbush) {
    game.b1DoorAmbush = { active: false, timer: 0, secondSpawnDone: false };
  }
  if (typeof game.chaser.stuckTimer === "undefined") game.chaser.stuckTimer = 0;
  if (typeof game.chaser.hitLockTimer === "undefined") game.chaser.hitLockTimer = 0;
  if (typeof game.chaser.introLockTimer === "undefined") game.chaser.introLockTimer = 0;
  if (typeof game.chaser.lastX === "undefined") game.chaser.lastX = game.chaser.x;
  if (typeof game.chaser.lastY === "undefined") game.chaser.lastY = game.chaser.y;
  if (!game.pauseView) game.pauseView = "help";

  game.ending = false;
  game.endingType = null;
  game.paused = false;
  game.interaction.nearest = null;
  game.interaction.hold.reset();
  game.effects.bloodFlashTimer = 0;
  game.effects.shakeTimer = 0;
  game.effects.shadowHintTimer = 0;
  game.effects.chaserSpawnCueTimer = 0;
  game.effects.escapeCinematicTimer = 0;
  game.effects.escapeCinematicActive = false;
  game.effects.endrollTimer = 0;
  game.effects.endrollActive = false;
  stopHeartbeatSEs();
  game.hide.active = false;
  game.hide.sourceId = "";
  game.hide.startedUnderThreat = false;
  game.hide.timer = 0;
  game.hide.duration = 0;
  game.hide.heartbeatTimer = 0;
  game.hide.footstepTimer = 0;
  game.hide.tensionSeTimer = 0;
  game.hide.monologueStage = 0;
  game.hide.monologueTimer = 0;
  game.hide.mode = "normal";
  game.b1DoorAmbush.active = false;
  game.b1DoorAmbush.timer = 0;
  game.b1DoorAmbush.secondSpawnDone = false;

  if (shouldRollbackBeforeTaskB) {
    game.mapId = "map2";
    game.world = mapManager.getMap("map2");
    const preTaskSpawn = spawnSafePosition(game.world, game.world.spawns.fromMap1 || game.world.spawns.default);
    game.player.x = preTaskSpawn.x;
    game.player.y = preTaskSpawn.y;
    game.safeSpot = { x: preTaskSpawn.x, y: preTaskSpawn.y };
    game.tasks.taskBRoom203 = false;
    game.tasks.taskCBreaker = false;
    game.inventory = game.inventory.filter((name) => name !== "Card Key 203");
    game.flags.forceChaseActive = false;
    game.flags.chaserGone = true;
    game.flags.chaserAwakened = false;
    game.flags.room203ExitAmbushTriggered = false;
    game.flags.room203HideSurvived = false;
    game.flags.room204205ReappearTriggered = false;
    game.flags.finalChasePending = false;
    game.flags.taskBFlashPlayed = false;
    game.flags.lastCaughtByLockerLight = false;
    game.chaser.active = false;
    game.chaser.spawnDelay = CHASER_SPAWN_DELAY;
    game.latestMemo = "203号室の直前まで戻された。落ち着いて手順をやり直そう。";
    setEmotion("不安");
  }
  game.flags.lastCaughtByLockerLight = false;

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
    if (!game.flags.forceChaseActive) {
      game.chaser.spawnDelay = CHASER_SPAWN_DELAY;
    }
  }

  endingScreen.classList.add("hidden");
  saveCheckpoint();
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
