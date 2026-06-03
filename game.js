const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const scoreDisplay = document.getElementById('score-display');
const highScoreDisplay = document.getElementById('high-score-display');
const finalScoreEl = document.getElementById('final-score');
const bestScoreEl = document.getElementById('best-score');
const soundBtn = document.getElementById('sound-btn');
const gameContainer = document.getElementById('game-container');

let canvasWidth, canvasHeight;
let gameRunning = false;
let score = 0;
let highScore = parseInt(localStorage.getItem('neonDashHighScore')) || 0;
let soundEnabled = true;
let gameSpeed = 4;
let difficulty = 1;

let currentWorld = parseInt(localStorage.getItem('neonDashCurrentWorld')) || 1;
let unlockedWorlds = JSON.parse(localStorage.getItem('neonDashWorlds')) || [1];
let showWorldSelect = false;
let worldTransitionFrames = 0;
let newWorldUnlocked = 0;
let gravityFlipFrames = 0;
let gravityInverted = false;
let gravityFlipWarning = false;

let audioCtx = null;
let masterGain = null;
let bgmGain = null;
let bgmPlaying = false;
let canDoubleJump = false;
let ytPlayer = null;
let ytPlayerReady = false;
let ytApiFailed = true;
let isTransitioning = false;

function isYTReady() {
  return ytPlayer && typeof ytPlayer.playVideo === 'function' && !ytApiFailed && ytPlayerReady;
}

const GRAVITY = 0.6;
const JUMP_FORCE = -13;
const DASH_FORCE = -8;
const MAX_FALL_SPEED = 15;
const MAX_SPEED = 12;
const COYOTE_FRAMES = 6;

const WORLD_UNLOCKS = [
  { world: 1, name: 'NEON CITY', threshold: 0 },
  { world: 2, name: 'CYBER DESERT', threshold: 20 },
  { world: 3, name: 'VOID SPACE', threshold: 40 },
  { world: 4, name: 'LAVA CORE', threshold: 70 },
  { world: 5, name: 'GLITCH REALM', threshold: 100 },
  { world: 6, name: 'OMEGA GRID', threshold: 150 }
];

const WORLDS = {
  1: {
    name: 'NEON CITY',
    bgColor: '#0a0a1a',
    groundColor: '#0ff',
    starColor: '#fff',
    particles: 'stars',
    speedBase: 4,
    speedMax: 10,
    gravityMod: 1.0,
    trackIndex: 0,
    obstacles: ['spike', 'orb'],
    enemies: []
  },
  2: {
    name: 'CYBER DESERT',
    bgColor: '#1a0f00',
    groundColor: '#ff8c00',
    starColor: '#c8a870',
    particles: 'sand',
    speedBase: 4.5,
    speedMax: 11,
    gravityMod: 1.0,
    trackIndex: 2,
    obstacles: ['pillar', 'diamond'],
    enemies: ['drone']
  },
  3: {
    name: 'VOID SPACE',
    bgColor: '#000000',
    groundColor: '#6600ff',
    starColor: '#aa00ff',
    particles: 'galaxy',
    speedBase: 3.5,
    speedMax: 9,
    gravityMod: 0.4,
    trackIndex: 4,
    obstacles: ['crystal', 'hexagon'],
    enemies: ['phantom']
  },
  4: {
    name: 'LAVA CORE',
    bgColor: '#120000',
    groundColor: '#ff2200',
    starColor: '#ff6600',
    particles: 'lava',
    speedBase: 5,
    speedMax: 12,
    gravityMod: 0.8,
    trackIndex: 5,
    obstacles: ['geyser', 'fireball'],
    enemies: ['golem']
  },
  5: {
    name: 'GLITCH REALM',
    bgColor: '#0a000a',
    groundColor: '#ff00ff',
    starColor: '#00ffff',
    particles: 'glitch',
    speedBase: 5.5,
    speedMax: 13,
    gravityMod: 1.0,
    trackIndex: 6,
    obstacles: ['glitchBlock', 'split'],
    enemies: ['mirror']
  },
  6: {
    name: 'OMEGA GRID',
    bgColor: '#0a0a0a',
    groundColor: '#ffd700',
    starColor: '#00bfff',
    particles: 'grid',
    speedBase: 6,
    speedMax: 14,
    gravityMod: 1.0,
    trackIndex: 7,
    obstacles: ['spike', 'orb', 'pillar', 'diamond', 'crystal', 'hexagon', 'geyser', 'glitchBlock'],
    enemies: ['drone', 'phantom', 'mirror', 'golem']
  }
};

let enemies = [];
let glitchOffsetX = 0;
let glitchOffsetY = 0;
let glitchLines = [];
let lavaDrips = [];
let nebulaRotation = 0;
let gridOffset = 0;

let flashRedFrames = 0;
let lastGroundedFrame = 0;
let playerScaleX = 1;
let playerScaleY = 1;

const player = {
  x: 0,
  y: 0,
  baseWidth: 30,
  baseHeight: 30,
  width: 30,
  height: 30,
  velocityY: 0,
  isJumping: false,
  isDashing: false,
  dashTime: 0,
  color: '#0ff',
  glowIntensity: 20,
  rotation: 0
};

let obstacles = [];
let powerups = [];
let particles = [];
let floatingTexts = [];

let hasShield = false;
let slowMotionFrames = 0;
let doublePointsFrames = 0;
let ghostFrames = 0;
let magnetFrames = 0;
let bgStars = [];
let groundY = 0;
let frameCount = 0;
let lastObstacleTime = 0;

const YT_VIDEO_ID = 'wOMwO5T3yT4';
const TRACKS = [0, 335, 646, 943, 1127, 1464, 1783, 2042];
const TRACK_ENDS = [328, 630, 938, 1123, 1456, 1782, 2038, 2245];
let currentTrackIndex = 0;
let trackCheckInterval = null;
let fadeTicker = null;

function onYouTubeIframeAPIReady() {
  try {
    ytPlayer = new YT.Player('yt-player', {
      height: '1',
      width: '1',
      videoId: YT_VIDEO_ID,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
        mute: 0
      },
      events: {
        onReady: function() {
          ytPlayerReady = true;
        },
        onError: function() {
          ytApiFailed = true;
        }
      }
    });
  } catch (e) {
    ytApiFailed = true;
  }
}

if (typeof window !== 'undefined') {
  window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
}

function fadeYTVolume(targetVol, durationMs) {
  if (fadeTicker) clearInterval(fadeTicker);
  if (!ytPlayer || typeof ytPlayer.getVolume !== 'function') return;
  if (!soundEnabled) return;
  
  const steps = 30;
  const interval = Math.max(16, durationMs / steps);
  const startVol = ytPlayer.getVolume();
  const delta = (targetVol - startVol) / steps;
  let step = 0;
  
  fadeTicker = setInterval(() => {
    if (!soundEnabled) {
      clearInterval(fadeTicker);
      return;
    }
    step++;
    const v = Math.round(startVol + delta * step);
    ytPlayer.setVolume(Math.max(0, Math.min(100, v)));
    if (step >= steps) clearInterval(fadeTicker);
  }, interval);
}

function startYouTubeMusic(startTrack) {
  if (!isYTReady()) return;
  if (!soundEnabled) return;
  
  if (startTrack === undefined) {
    startTrack = WORLDS[currentWorld].trackIndex;
  }
  currentTrackIndex = startTrack;
  const seekTime = TRACKS[currentTrackIndex % TRACKS.length];
  
  try {
    ytPlayer.seekTo(seekTime, true);
    ytPlayer.setVolume(0);
    ytPlayer.playVideo();
    setTimeout(() => fadeYTVolume(80, 1500), 200);
    startTrackCheck();
  } catch (e) {}
}

function startTrackCheck() {
  if (trackCheckInterval) clearInterval(trackCheckInterval);
  trackCheckInterval = setInterval(() => {
    if (!gameRunning || ytApiFailed || !ytPlayerReady) {
      clearInterval(trackCheckInterval);
      return;
    }
    try {
      const ct = ytPlayer.getCurrentTime();
      if (ct >= TRACK_ENDS[currentTrackIndex]) {
        currentTrackIndex = (currentTrackIndex + 1) % 8;
        ytPlayer.seekTo(TRACKS[currentTrackIndex], true);
      }
    } catch (e) {}
  }, 5000);
}

function stopTrackCheck() {
  if (trackCheckInterval) {
    clearInterval(trackCheckInterval);
    trackCheckInterval = null;
  }
}

function nextTrack() {
  if (ytApiFailed || !ytPlayer || !ytPlayerReady) return;
  const worldTrackBase = WORLDS[currentWorld].trackIndex;
  currentTrackIndex = ((currentTrackIndex - worldTrackBase + 1) % 4) + worldTrackBase;
  try {
    ytPlayer.seekTo(TRACKS[currentTrackIndex], true);
    ytPlayer.playVideo();
    ytPlayer.setVolume(0);
    fadeYTVolume(80, 1000);
  } catch (e) {}
}

function pauseYouTubeMusic() {
  if (ytApiFailed || !ytPlayer || !ytPlayerReady) return;
  try {
    ytPlayer.pauseVideo();
  } catch (e) {}
}

function toggleYouTubeMute() {
  if (ytApiFailed || !ytPlayer || !ytPlayerReady) return;
  try {
    if (soundEnabled) {
      ytPlayer.unMute();
      ytPlayer.setVolume(70);
    } else {
      ytPlayer.mute();
    }
  } catch (e) {}
}

function playIntroJingle() {
  if (!soundEnabled || !audioCtx) {
    playIntroBGM();
    return;
  }
  
  isTransitioning = true;
  const now = audioCtx.currentTime;
  
  const notes = [130.81, 164.81, 196.00, 261.63];
  const noteInterval = 0.12;
  
  for (let i = 0; i < notes.length; i++) {
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc1.type = 'sawtooth';
    osc2.type = 'sine';
    osc1.frequency.value = notes[i];
    osc2.frequency.value = notes[i] * 2;
    
    gain.gain.setValueAtTime(0.3, now + i * noteInterval);
    gain.gain.exponentialRampToValueAtTime(0.01, now + i * noteInterval + 0.15);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(masterGain);
    
    osc1.start(now + i * noteInterval);
    osc2.start(now + i * noteInterval);
    osc1.stop(now + i * noteInterval + 0.15);
    osc2.stop(now + i * noteInterval + 0.15);
  }
  
  setTimeout(() => {
    isTransitioning = false;
    playIntroBGM();
  }, 2000);
}

function playGameOverSound() {
  if (!soundEnabled || !audioCtx) return;
  
  const now = audioCtx.currentTime;
  
  const osc1 = audioCtx.createOscillator();
  const gain1 = audioCtx.createGain();
  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(300, now);
  osc1.frequency.exponentialRampToValueAtTime(60, now + 0.6);
  gain1.gain.setValueAtTime(0.4, now);
  gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
  osc1.connect(gain1);
  gain1.connect(masterGain);
  osc1.start(now);
  osc1.stop(now + 0.6);
  
  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(80, now);
  gain2.gain.setValueAtTime(0.5, now);
  gain2.gain.linearRampToValueAtTime(0.3, now + 0.2);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
  osc2.connect(gain2);
  gain2.connect(masterGain);
  osc2.start(now);
  osc2.stop(now + 0.4);
  
  setTimeout(() => {
    if (!audioCtx) return;
    const now2 = audioCtx.currentTime;
    const hintOsc = audioCtx.createOscillator();
    const hintGain = audioCtx.createGain();
    hintOsc.type = 'sine';
    hintOsc.frequency.setValueAtTime(400, now2);
    hintOsc.frequency.linearRampToValueAtTime(600, now2 + 0.3);
    hintGain.gain.setValueAtTime(0.15, now2);
    hintGain.gain.exponentialRampToValueAtTime(0.01, now2 + 0.4);
    hintOsc.connect(hintGain);
    hintGain.connect(masterGain);
    hintOsc.start(now2);
    hintOsc.stop(now2 + 0.4);
  }, 800);
}

function playReadySound(isRetry) {
  if (!soundEnabled || !audioCtx) {
    startGameFlow(isRetry);
    return;
  }
  
  isTransitioning = true;
  const notes = [523.25, 659.25, 783.99];
  let startTime = audioCtx.currentTime;
  
  for (let i = 0; i < notes.length; i++) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = notes[i];
    gain.gain.setValueAtTime(0.25, startTime + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + i * 0.08 + 0.08);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(startTime + i * 0.08);
    osc.stop(startTime + i * 0.08 + 0.08);
  }
  
  setTimeout(() => {
    isTransitioning = false;
    startGameFlow(isRetry);
  }, 300);
}

function startGameFlow(isRetry) {
  initAudio();
  initGame();
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  gameRunning = true;
  gameStartBgmPlayed = false;
  
  if (isRetry) {
    nextTrack();
    startTrackCheck();
  } else {
    playIntroJingle();
    startTrackCheck();
  }
}

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(audioCtx.destination);
    
    bgmGain = audioCtx.createGain();
    bgmGain.gain.value = 0.15;
    bgmGain.connect(masterGain);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSound(type) {
  if (!soundEnabled || !audioCtx) return;
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.connect(gain);
  gain.connect(masterGain);
  
  const now = audioCtx.currentTime;
  
  switch(type) {
    case 'jump':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
      break;
    case 'dash':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;
    case 'score':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      break;
    case 'die':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.4);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
      break;
  }
}

const BGM_START = [
  130.81, 164.81, 196.00, 261.63,
  196.00, 164.81, 130.81, 98.00,
  130.81, 164.81, 196.00, 246.94,
  246.94, 196.00, 164.81, 130.81
];

const BGM_LEVEL_1 = [
  261.63, 329.63, 392.00, 329.63,
  261.63, 329.63, 392.00, 523.25,
  196.00, 246.94, 293.66, 246.94,
  196.00, 246.94, 293.66, 329.63
];

const BGM_LEVEL_2 = [
  293.66, 349.23, 392.00, 440.00,
  349.23, 293.66, 349.23, 392.00,
  220.00, 261.63, 293.66, 349.23,
  261.63, 220.00, 261.63, 293.66
];

const BGM_LEVEL_3 = [
  329.63, 392.00, 440.00, 523.25,
  392.00, 440.00, 523.25, 587.33,
  246.94, 293.66, 329.63, 392.00,
  293.66, 329.63, 392.00, 440.00
];

const BGM_LEVEL_4 = [
  440.00, 523.25, 587.33, 659.25,
  523.25, 440.00, 523.25, 587.33,
  329.63, 392.00, 440.00, 523.25,
  392.00, 329.63, 392.00, 440.00
];

const BGM_LEVEL_5 = [
  523.25, 587.33, 659.25, 783.99,
  587.33, 523.25, 587.33, 659.25,
  392.00, 440.00, 523.25, 587.33,
  440.00, 392.00, 440.00, 523.25
];

const BGM_SONGS = [BGM_LEVEL_1, BGM_LEVEL_2, BGM_LEVEL_3, BGM_LEVEL_4, BGM_LEVEL_5];
let gameStartBgmPlayed = false;

let bgmNoteIndex = 0;
let bgmInterval = null;
let currentBgmSong = [];

function startBGM() {
  if (!soundEnabled || !audioCtx || bgmPlaying) return;
  
  bgmPlaying = true;
  bgmNoteIndex = 0;
  
  const songIndex = Math.min(difficulty - 1, BGM_SONGS.length - 1);
  currentBgmSong = BGM_SONGS[Math.max(0, songIndex)];
  
  const tempo = 160 - (difficulty * 8);
  
  bgmInterval = setInterval(() => {
    if (!soundEnabled || !bgmPlaying) return;
    
    const freq = currentBgmSong[bgmNoteIndex % currentBgmSong.length];
    const now = audioCtx.currentTime;
    
    const leadOsc = audioCtx.createOscillator();
    const leadGain = audioCtx.createGain();
    leadOsc.type = 'sawtooth';
    leadOsc.frequency.value = freq;
    leadGain.gain.setValueAtTime(0.25, now);
    leadGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    leadOsc.connect(leadGain);
    leadGain.connect(bgmGain);
    leadOsc.start(now);
    leadOsc.stop(now + 0.2);
    
    const bassOsc = audioCtx.createOscillator();
    const bassGain = audioCtx.createGain();
    bassOsc.type = 'square';
    bassOsc.frequency.value = freq * 0.25;
    bassGain.gain.setValueAtTime(0.3, now);
    bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    bassOsc.connect(bassGain);
    bassGain.connect(bgmGain);
    bassOsc.start(now);
    bassOsc.stop(now + 0.25);
    
    if (bgmNoteIndex % 2 === 0) {
      const arpOsc = audioCtx.createOscillator();
      const arpGain = audioCtx.createGain();
      arpOsc.type = 'square';
      arpOsc.frequency.value = freq * 2;
      arpGain.gain.setValueAtTime(0.1, now);
      arpGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      arpOsc.connect(arpGain);
      arpGain.connect(bgmGain);
      arpOsc.start(now);
      arpOsc.stop(now + 0.08);
    }
    
    bgmNoteIndex++;
  }, Math.max(90, tempo));
}

function stopBGM() {
  bgmPlaying = false;
  if (bgmInterval) {
    clearInterval(bgmInterval);
    bgmInterval = null;
  }
}

function resize() {
  canvasWidth = gameContainer.clientWidth;
  canvasHeight = gameContainer.clientHeight;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  groundY = canvasHeight - 80;
  player.x = canvasWidth * 0.2;
  if (!gameRunning) {
    player.y = groundY - player.height;
    player.rotation = 0;
  }
  initStars();
}

function initStars() {
  bgStars = [];
  for (let i = 0; i < 50; i++) {
    bgStars.push({
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight * 0.7,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 0.5 + 0.2,
      alpha: Math.random() * 0.5 + 0.3
    });
  }
}

function initGame() {
  player.y = groundY - player.height;
  player.velocityY = 0;
  player.isJumping = false;
  player.isDashing = false;
  player.dashTime = 0;
  player.glowIntensity = 20;
  player.rotation = 0;
  playerScaleX = 1;
  playerScaleY = 1;
  lastGroundedFrame = 0;
  flashRedFrames = 0;
  
  obstacles = [];
  enemies = [];
  particles = [];
  floatingTexts = [];
  glitchLines = [];
  lavaDrips = [];
  score = 0;
  gameSpeed = WORLDS[currentWorld].speedBase;
  difficulty = 1;
  frameCount = 0;
  lastObstacleTime = 0;
  gravityFlipFrames = 0;
  gravityFlipWarning = false;
  gravityInverted = false;
  
  scoreDisplay.textContent = '0';
  highScoreDisplay.textContent = `BEST: ${highScore}`;
}

function spawnObstacle() {
  const world = WORLDS[currentWorld];
  const obsTypes = world.obstacles;
  const obsType = obsTypes[Math.floor(Math.random() * obsTypes.length)];
  
  const isGround = ['spike', 'pillar', 'crystal', 'geyser', 'glitchBlock'].includes(obsType);
  
  if (obsType === 'spike') {
    const spikes = Math.random() < 0.5 ? 1 : 2;
    const baseWidth = 30 + Math.random() * 15;
    const height = 35 + Math.random() * 20;
    obstacles.push({
      x: canvasWidth + 50,
      y: groundY - height,
      width: baseWidth * spikes,
      height: height,
      type: 'spike',
      spikes: spikes,
      color: Math.random() < 0.5 ? '#f0f' : '#f00',
      worldColor: '#f0f'
    });
  } else if (obsType === 'orb') {
    const size = 25 + Math.random() * 10;
    obstacles.push({
      x: canvasWidth + 50,
      y: groundY - 100 - Math.random() * 80,
      width: size,
      height: size,
      type: 'orb',
      color: Math.random() < 0.5 ? '#ff0' : '#0f0',
      worldColor: '#ff0'
    });
  } else if (obsType === 'pillar') {
    const height = 50 + Math.random() * 40;
    obstacles.push({
      x: canvasWidth + 50,
      y: groundY - height,
      width: 20,
      height: height,
      type: 'pillar',
      color: '#c8a870',
      worldColor: '#c8a870'
    });
  } else if (obsType === 'diamond') {
    const size = 30 + Math.random() * 10;
    obstacles.push({
      x: canvasWidth + 50,
      y: groundY - 80 - Math.random() * 60,
      width: size,
      height: size,
      type: 'diamond',
      rotation: 0,
      color: '#ff8c00',
      worldColor: '#ff8c00'
    });
  } else if (obsType === 'crystal') {
    const width = 25 + Math.random() * 15;
    const height = 40 + Math.random() * 25;
    obstacles.push({
      x: canvasWidth + 50,
      y: groundY - height,
      width: width,
      height: height,
      type: 'crystal',
      color: '#6600ff',
      worldColor: '#6600ff'
    });
  } else if (obsType === 'hexagon') {
    const size = 25 + Math.random() * 10;
    obstacles.push({
      x: canvasWidth + 50,
      y: groundY - 90 - Math.random() * 70,
      width: size,
      height: size,
      type: 'hexagon',
      rotation: 0,
      color: '#aa00ff',
      worldColor: '#aa00ff'
    });
  } else if (obsType === 'geyser') {
    const height = 45 + Math.random() * 20;
    obstacles.push({
      x: canvasWidth + 50,
      y: groundY - height,
      width: 30,
      height: height,
      type: 'geyser',
      pulsePhase: Math.random() * Math.PI * 2,
      color: '#ff2200',
      worldColor: '#ff2200'
    });
  } else if (obsType === 'fireball') {
    const size = 20 + Math.random() * 8;
    obstacles.push({
      x: canvasWidth + 50,
      y: groundY - 70 - Math.random() * 80,
      width: size,
      height: size,
      type: 'fireball',
      trail: [],
      color: '#ff6600',
      worldColor: '#ff6600'
    });
  } else if (obsType === 'glitchBlock') {
    const size = 30 + Math.random() * 15;
    obstacles.push({
      x: canvasWidth + 50,
      y: groundY - size,
      width: size,
      height: size,
      type: 'glitchBlock',
      glitchTimer: 0,
      offsetX: 0,
      color: '#ff00ff',
      worldColor: '#ff00ff'
    });
  } else if (obsType === 'split') {
    const size = 25 + Math.random() * 10;
    obstacles.push({
      x: canvasWidth + 50,
      y: groundY - 80 - Math.random() * 60,
      width: size,
      height: size,
      type: 'split',
      offsetX: 8,
      color: '#00ffff',
      worldColor: '#00ffff'
    });
  }
}

function spawnEnemy() {
  const world = WORLDS[currentWorld];
  if (world.enemies.length === 0) return;
  
  const enemyType = world.enemies[Math.floor(Math.random() * world.enemies.length)];
  
  if (enemyType === 'drone') {
    enemies.push({
      type: 'drone',
      x: canvasWidth + 30,
      y: groundY - 80 - Math.random() * 60,
      width: 25,
      height: 15,
      vx: -2 - Math.random(),
      vy: 0,
      sineOffset: Math.random() * Math.PI * 2,
      color: '#ff8c00'
    });
  } else if (enemyType === 'phantom') {
    enemies.push({
      type: 'phantom',
      x: canvasWidth + 30,
      y: groundY - 90 - Math.random() * 60,
      width: 30,
      height: 30,
      vx: -2.5,
      alpha: 0,
      fadeIn: true,
      color: '#6600ff'
    });
  } else if (enemyType === 'golem') {
    enemies.push({
      type: 'golem',
      x: canvasWidth + 50,
      y: groundY - 70,
      width: 50,
      height: 70,
      vx: -1.5,
      warningTimer: 60,
      shadowLine: canvasWidth + 200,
      color: '#ff2200'
    });
  } else if (enemyType === 'mirror') {
    enemies.push({
      type: 'mirror',
      x: -40,
      y: groundY - 40 - Math.random() * 40,
      width: 30,
      height: 30,
      vx: 3 + Math.random() * 0.5,
      color: '#00ffff'
    });
  }
}

function updateEnemies() {
  const world = WORLDS[currentWorld];
  
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const effectiveSpeed = slowMotionFrames > 0 ? gameSpeed * 0.4 : gameSpeed;
    
    if (e.type === 'drone') {
      e.x -= effectiveSpeed;
      e.sineOffset += 0.05;
      e.y += Math.sin(e.sineOffset) * 2;
      e.vy = Math.sin(e.sineOffset) * 2;
      
      if (e.y < groundY - 150) e.y = groundY - 150;
      if (e.y > groundY - 30) e.y = groundY - 30;
      
      if (e.x + e.width < 0) enemies.splice(i, 1);
    } else if (e.type === 'phantom') {
      e.x -= effectiveSpeed;
      
      if (e.fadeIn) {
        e.alpha += 0.02;
        if (e.alpha >= 1) e.fadeIn = false;
      } else {
        e.alpha = 0.7 + Math.sin(frameCount * 0.1) * 0.3;
      }
      
      if (e.x + e.width < 0) enemies.splice(i, 1);
    } else if (e.type === 'golem') {
      if (e.warningTimer > 0) {
        e.warningTimer--;
        e.shadowLine -= effectiveSpeed;
      } else {
        e.x -= e.vx;
        if (e.x + e.width < 0) enemies.splice(i, 1);
      }
    } else if (e.type === 'mirror') {
      e.x += e.vx;
      if (e.x > canvasWidth + 50) enemies.splice(i, 1);
    }
    
    if (e.warningTimer <= 0 && checkCollision(player, e)) {
      if (ghostFrames > 0 || currentWorld === 5 && frameCount % 6 === 0) continue;
      if (hasShield) {
        hasShield = false;
        enemies.splice(i, 1);
        spawnParticles(player.x + player.width/2, player.y + player.height/2, 20, '#00ffff');
        continue;
      }
      gameOver();
      return;
    }
  }
  
  if (world.enemies.includes('drone') && frameCount % 150 === 0) spawnEnemy();
  if (world.enemies.includes('phantom') && frameCount % 200 === 0) spawnEnemy();
  if (world.enemies.includes('golem') && frameCount % 300 === 0) spawnEnemy();
  if (world.enemies.includes('mirror') && frameCount % (25 + Math.random() * 15) === 0) spawnEnemy();
}

function drawEnemies() {
  for (const e of enemies) {
    ctx.save();
    
    if (e.type === 'drone') {
      // DRONE - Cuadrado metálico con ojo
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#00ff00';
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(e.x, e.y, e.width, e.height);
      
      // Border distintivo para drone
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      ctx.strokeRect(e.x - 2, e.y - 2, e.width + 4, e.height + 4);
      
      // Ojo blanco
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(e.x + e.width - 8, e.y + e.height/2, 4, 0, Math.PI * 2);
      ctx.fill();
      
      // Estudiante del ojo
      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.arc(e.x + e.width - 8, e.y + e.height/2, 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Etiqueta "DRONE"
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 10px Orbitron';
      ctx.textAlign = 'center';
      ctx.fillText('DRONE', e.x + e.width/2, e.y - 8);
      
    } else if (e.type === 'phantom') {
      // PHANTOM - Círculo fantasmal con alpha variable y más distintivo
      ctx.globalAlpha = Math.max(e.alpha, 0.4);
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#aa00ff';
      ctx.fillStyle = '#aa00ff';
      ctx.beginPath();
      ctx.arc(e.x + e.width/2, e.y + e.height/2, e.width/2, 0, Math.PI * 2);
      ctx.fill();
      
      // Borde pulsante del phantom
      ctx.globalAlpha = Math.max(e.alpha * 0.8, 0.3);
      ctx.strokeStyle = '#ff00ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x + e.width/2, e.y + e.height/2, e.width/2 + 3, 0, Math.PI * 2);
      ctx.stroke();
      
      // Etiqueta "PHANTOM"
      ctx.globalAlpha = Math.max(e.alpha, 0.4);
      ctx.fillStyle = '#ff00ff';
      ctx.font = 'bold 10px Orbitron';
      ctx.textAlign = 'center';
      ctx.fillText('PHANTOM', e.x + e.width/2, e.y - 8);
      
    } else if (e.type === 'golem') {
      // GOLEM - Bloque grande con advertencia visual clara
      if (e.warningTimer > 0) {
        // Pulsing warning línea
        const pulseAlpha = Math.sin(e.warningTimer / 10) * 0.5 + 0.5;
        ctx.strokeStyle = `rgba(255, 34, 0, ${pulseAlpha})`;
        ctx.lineWidth = 6;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(e.shadowLine, groundY);
        ctx.lineTo(e.shadowLine, groundY - 100);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Advertencia de texto
        ctx.fillStyle = 'rgba(255, 34, 0, ' + pulseAlpha + ')';
        ctx.font = 'bold 14px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText('⚠', e.shadowLine, groundY - 110);
      } else {
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#ff6600';
        ctx.fillStyle = '#ff6600';
        ctx.fillRect(e.x, e.y, e.width, e.height);
        
        // Ojos del Golem
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(e.x + 8, e.y + 10, 20, 20);
        ctx.fillRect(e.x + 38, e.y + 10, 20, 20);
        
        // Pupilas
        ctx.fillStyle = '#000';
        ctx.fillRect(e.x + 12, e.y + 14, 10, 10);
        ctx.fillRect(e.x + 42, e.y + 14, 10, 10);
        
        // Etiqueta "GOLEM"
        ctx.fillStyle = '#ffaa00';
        ctx.font = 'bold 10px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText('GOLEM', e.x + e.width/2, e.y - 8);
      }
      
    } else if (e.type === 'mirror') {
      // MIRROR - Rectángulo con reflejos
      ctx.shadowBlur = 25;
      ctx.shadowColor = '#00ffff';
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(e.x, e.y, e.width, e.height);
      
      // Reflejos dentro del espejo
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(e.x + 5, e.y + 5, e.width - 10, 8);
      ctx.fillRect(e.x + 5, e.y + e.height - 13, e.width - 10, 8);
      
      // Border distintivo
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 3;
      ctx.strokeRect(e.x - 2, e.y - 2, e.width + 4, e.height + 4);
      
      // Etiqueta "MIRROR"
      ctx.fillStyle = '#00ffff';
      ctx.font = 'bold 10px Orbitron';
      ctx.textAlign = 'center';
      ctx.fillText('MIRROR', e.x + e.width/2, e.y - 8);
    }
    
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

const POWERUP_TYPES = [
  { type: 'shield', color: '#00ffff', symbol: 'S', duration: 1 },
  { type: 'slowmo', color: '#ffff00', symbol: 'T', duration: 180 },
  { type: 'doublePoints', color: '#ff00ff', symbol: '2X', duration: 300 },
  { type: 'ghost', color: '#ffffff', symbol: 'G', duration: 120 },
  { type: 'magnet', color: '#ff6600', symbol: 'M', duration: 240 }
];

function spawnPowerup() {
  const pu = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
  const y = groundY - 60 - Math.random() * 100;
  powerups.push({
    x: canvasWidth + 50,
    y: y,
    width: 28,
    height: 28,
    type: pu.type,
    color: pu.color,
    symbol: pu.symbol,
    duration: pu.duration
  });
}

function activatePowerup(type) {
  switch(type) {
    case 'shield':
      hasShield = true;
      spawnFloatingText('SHIELD!', player.x, player.y - 20, '#00ffff');
      break;
    case 'slowmo':
      slowMotionFrames = 180;
      spawnFloatingText('SLOW!', player.x, player.y - 20, '#ffff00');
      break;
    case 'doublePoints':
      doublePointsFrames = 300;
      spawnFloatingText('2X!', player.x, player.y - 20, '#ff00ff');
      break;
    case 'ghost':
      ghostFrames = 120;
      spawnFloatingText('GHOST!', player.x, player.y - 20, '#ffffff');
      break;
    case 'magnet':
      magnetFrames = 240;
      spawnFloatingText('MAGNET!', player.x, player.y - 20, '#ff6600');
      break;
  }
  playSound('score');
}

function spawnParticles(x, y, count, color, spread = 20) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 2;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      size: Math.random() * 4 + 2,
      color: color,
      life: 1,
      decay: 0.02 + Math.random() * 0.02
    });
  }
}

function spawnScoreParticles() {
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 8) + Math.random() * (Math.PI * 3 / 4);
    const speed = Math.random() * 4 + 3;
    particles.push({
      x: player.x + player.width / 2,
      y: player.y,
      vx: Math.cos(angle) * speed * (Math.random() < 0.5 ? 1 : -1),
      vy: -Math.random() * 4 - 2,
      size: Math.random() * 3 + 2,
      color: '#0ff',
      life: 1,
      decay: 0.03
    });
  }
}

function spawnFloatingText(text, x, y, color) {
  floatingTexts.push({
    text: text,
    x: x,
    y: y,
    vy: -2,
    life: 1,
    color: color
  });
}

function jump() {
  const canCoyoteJump = frameCount - lastGroundedFrame <= COYOTE_FRAMES;
  
  if (!player.isJumping || canCoyoteJump) {
    player.velocityY = JUMP_FORCE;
    player.isJumping = true;
    player.isDashing = false;
    canDoubleJump = true;
    playerScaleX = 0.8;
    playerScaleY = 1.3;
    playSound('jump');
    spawnParticles(player.x + player.width/2, player.y + player.height, 10, '#0ff');
  } else if (canDoubleJump) {
    player.velocityY = JUMP_FORCE * 0.85;
    canDoubleJump = false;
    playerScaleX = 0.8;
    playerScaleY = 1.3;
    playSound('jump');
    spawnParticles(player.x + player.width/2, player.y + player.height, 15, '#ff0');
  }
}

function dash() {
  if (player.isJumping && !player.isDashing) {
    player.velocityY = DASH_FORCE;
    player.isDashing = true;
    player.dashTime = 15;
    playerScaleX = 1.3;
    playerScaleY = 0.7;
    playSound('dash');
    spawnParticles(player.x + player.width/2, player.y + player.height/2, 15, '#f0f');
  }
}

function handleInput(e) {
  e.preventDefault();
  
  if (e.type === 'keydown' && e.code !== 'Space') return;
  if (e.type === 'keydown' && e.repeat) return;
  
  if (showWorldSelect) {
    showWorldSelect = false;
    gameOverScreen.classList.remove('hidden');
    return;
  }
  
  if (!gameRunning) return;
  
  if (e.type === 'mousedown' || e.type === 'touchstart' || e.code === 'Space') {
    if (player.dashTime > 0) {
      dash();
    } else {
      jump();
    }
  }
}

function update() {
  if (!gameRunning) return;
  
  frameCount++;
  const world = WORLDS[currentWorld];
  
  playerScaleX += (1 - playerScaleX) * 0.2;
  playerScaleY += (1 - playerScaleY) * 0.2;
  
  if (player.dashTime > 0) {
    player.dashTime--;
  }
  
  const gravityMod = gravityInverted ? -world.gravityMod : world.gravityMod;
  player.velocityY += GRAVITY * gravityMod;
  if (player.velocityY > MAX_FALL_SPEED) player.velocityY = MAX_FALL_SPEED;
  if (player.velocityY < -MAX_FALL_SPEED) player.velocityY = -MAX_FALL_SPEED;
  player.y += player.velocityY;
  
  const groundLine = gravityInverted ? 80 : groundY - player.height;
  const ceilingLine = gravityInverted ? groundY - player.height : 80;
  
  if (gravityInverted) {
    if (player.y <= ceilingLine) {
      player.y = ceilingLine;
      player.velocityY = 0;
      player.isJumping = false;
      lastGroundedFrame = frameCount;
    }
    if (player.y >= groundLine) {
      player.y = groundLine;
      player.velocityY = 0;
      player.isDashing = false;
    }
  } else {
    if (player.y >= groundLine) {
      player.y = groundLine;
      player.velocityY = 0;
      player.isJumping = false;
      player.isDashing = false;
      lastGroundedFrame = frameCount;
      
      if (playerScaleY > 1.1) {
        playerScaleX = 1.2;
        playerScaleY = 0.8;
      }
      
      if (frameCount % 8 === 0) {
        spawnParticles(player.x + player.width/2, player.y + player.height, 2, '#0ff', 10);
      }
    }
  }
  
  if (currentWorld === 5 && frameCount % 3 === 0) {
    glitchOffsetX = (Math.random() - 0.5) * 4;
    glitchOffsetY = (Math.random() - 0.5) * 4;
    if (Math.random() < 0.3) {
      glitchLines.push({ y: Math.random() * canvasHeight, color: `rgb(${Math.random()*255},${Math.random()*255},${Math.random()*255})`, alpha: 0.3 + Math.random() * 0.3 });
    }
  } else {
    glitchOffsetX = 0;
    glitchOffsetY = 0;
  }
  glitchLines = glitchLines.filter(l => { l.alpha -= 0.02; return l.alpha > 0; });
  
  if (currentWorld === 4) {
    if (Math.random() < 0.05) {
      lavaDrips.push({ x: Math.random() * canvasWidth, y: 0, speed: 0.5 + Math.random() * 0.5, size: 3 + Math.random() * 4 });
    }
    lavaDrips = lavaDrips.filter(d => { d.y += d.speed; return d.y < groundY; });
  }
  
  if (currentWorld === 3) nebulaRotation += 0.002;
  if (currentWorld === 6) gridOffset = (gridOffset + gameSpeed) % 40;
  
  if (currentWorld === 6 && frameCount % 400 === 0 && !gravityFlipWarning && gravityFlipFrames === 0) {
    gravityFlipWarning = true;
    gravityFlipFrames = 180;
  }
  
  if (gravityFlipFrames > 0) {
    gravityFlipFrames--;
    if (gravityFlipFrames === 90) {
      gravityInverted = !gravityInverted;
      gravityFlipWarning = false;
    }
    if (gravityFlipFrames === 0 && gravityInverted) {
      gravityInverted = false;
    }
  }
  
  const speedIncrease = Math.min(0.1 * difficulty, 0.5);
  gameSpeed = Math.min(world.speedBase + speedIncrease * difficulty, world.speedMax);
  difficulty = Math.floor(score / 10) + 1;
  
  const minGap = Math.max(50, 100 - difficulty * 4);
  if (frameCount - lastObstacleTime > minGap && Math.random() < 0.015 * difficulty) {
    spawnObstacle();
    lastObstacleTime = frameCount;
  }
  
  if (Math.random() < 0.003) {
    spawnPowerup();
  }
  
  const effectiveSpeed = slowMotionFrames > 0 ? gameSpeed * 0.4 : gameSpeed;
  
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.x -= effectiveSpeed;
    
    if (obs.x + obs.width < 0) {
      const points = obs.type === 'spike' ? (obs.spikes > 1 ? 3 : 2) : 4;
      score += points * (doublePointsFrames > 0 ? 2 : 1);
      scoreDisplay.textContent = score;
      obstacles.splice(i, 1);
      continue;
    }
    
    if (checkCollision(player, obs)) {
      if (ghostFrames > 0) {
        continue;
      }
      if (hasShield) {
        hasShield = false;
        obstacles.splice(i, 1);
        spawnParticles(player.x + player.width/2, player.y + player.height/2, 20, '#00ffff');
        continue;
      }
      gameOver();
      return;
    }
  }
  
  for (let i = powerups.length - 1; i >= 0; i--) {
    const pu = powerups[i];
    pu.x -= effectiveSpeed;
    
    if (pu.x + pu.width < 0) {
      powerups.splice(i, 1);
      continue;
    }
    
    if (checkCollision(player, pu)) {
      activatePowerup(pu.type);
      powerups.splice(i, 1);
    }
  }
  
  if (magnetFrames > 0) {
    for (const obs of obstacles) {
      const dx = (player.x + player.width/2) - (obs.x + obs.width/2);
      const dy = (player.y + player.height/2) - (obs.y + obs.height/2);
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 150 && dist > 0) {
        obs.x += (dx / dist) * 2;
        obs.y += (dy / dist) * 2;
      }
    }
  }
  
  updateEnemies();
  
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1;
    p.life -= p.decay;
    
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
  
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y += ft.vy;
    ft.life -= 0.02;
    
    if (ft.life <= 0) {
      floatingTexts.splice(i, 1);
    }
  }
  
  for (const star of bgStars) {
    star.x -= star.speed * (gameSpeed / 4);
    if (star.x < 0) {
      star.x = canvasWidth;
      star.y = Math.random() * canvasHeight * 0.7;
    }
  }
  
  player.rotation += 0.1 * (gameSpeed / 4);
  player.glowIntensity = 20 + Math.sin(frameCount * 0.1) * 5;
  
  if (score > 0 && score % 10 === 0 && frameCount % 10 === 0) {
    playSound('score');
    spawnScoreParticles();
    spawnFloatingText(score + '!', player.x + player.width, player.y - 20, '#ff0');
  }
  
  if (slowMotionFrames > 0) slowMotionFrames--;
  if (doublePointsFrames > 0) doublePointsFrames--;
  if (ghostFrames > 0) ghostFrames--;
  if (magnetFrames > 0) magnetFrames--;
}

function checkCollision(a, b) {
  const buffer = 5;
  if (b.type === 'spike') {
    const spikeWidth = b.width / b.spikes;
    for (let i = 0; i < b.spikes; i++) {
      const sx = b.x + i * spikeWidth;
      const triLeft = sx + buffer;
      const triRight = sx + spikeWidth - buffer;
      const triTop = b.y + buffer;
      const triBottom = b.y + b.height - buffer;
      
      const cx = a.x + a.width / 2;
      const cy = a.y + a.height / 2;
      
      if (cx > triLeft && cx < triRight && cy > triTop && cy < triBottom) {
        if (cy < triTop + (triBottom - triTop) * ((cx - triLeft) / (triRight - triLeft))) {
          return true;
        }
        if (cy < triTop + (triBottom - triTop) * ((triRight - cx) / (triRight - triLeft))) {
          return true;
        }
      }
    }
    return false;
  } else if (b.type === 'orb') {
    const orbRadius = b.width / 2;
    const orbCenterX = b.x + orbRadius;
    const orbCenterY = b.y + orbRadius;
    const playerCenterX = a.x + a.width / 2;
    const playerCenterY = a.y + a.height / 2;
    const minDist = orbRadius + Math.min(a.width, a.height) / 2 - buffer;
    const dist = Math.sqrt((playerCenterX - orbCenterX) ** 2 + (playerCenterY - orbCenterY) ** 2);
    return dist < minDist;
  }
  return a.x < b.x + b.width - buffer &&
         a.x + a.width > b.x + buffer &&
         a.y < b.y + b.height - buffer &&
         a.y + a.height > b.y + buffer;
}

function drawGround() {
  const world = WORLDS[currentWorld];
  
  ctx.strokeStyle = 'rgba(30, 30, 50, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(canvasWidth, groundY);
  ctx.stroke();
  
  ctx.shadowBlur = 15;
  ctx.shadowColor = world.groundColor;
  ctx.strokeStyle = world.groundColor;
  ctx.lineWidth = 3;
  
  if (currentWorld === 4) {
    ctx.beginPath();
    for (let x = 0; x <= canvasWidth; x += 10) {
      const wave = Math.sin((x + frameCount * 2) * 0.05) * 5;
      if (x === 0) ctx.moveTo(x, groundY + wave);
      else ctx.lineTo(x, groundY + wave);
    }
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvasWidth, groundY);
    ctx.stroke();
  }
  
  if (currentWorld === 6 && gravityFlipWarning) {
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 4;
    ctx.setLineDash([20, 10]);
    ctx.beginPath();
    ctx.moveTo(0, groundY - 20);
    ctx.lineTo(canvasWidth, groundY - 20);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  
  if (gravityInverted) {
    ctx.strokeStyle = world.groundColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 80);
    ctx.lineTo(canvasWidth, 80);
    ctx.stroke();
  }
  
  ctx.shadowBlur = 0;
}

function drawSpike(obs) {
  const spikeWidth = obs.width / obs.spikes;
  
  ctx.save();
  ctx.shadowBlur = 20;
  ctx.shadowColor = obs.color;
  ctx.fillStyle = obs.color;
  
  for (let i = 0; i < obs.spikes; i++) {
    const sx = obs.x + i * spikeWidth;
    ctx.beginPath();
    ctx.moveTo(sx, obs.y + obs.height);
    ctx.lineTo(sx + spikeWidth / 2, obs.y);
    ctx.lineTo(sx + spikeWidth, obs.y + obs.height);
    ctx.closePath();
    ctx.fill();
  }
  
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  for (let i = 0; i < obs.spikes; i++) {
    const sx = obs.x + i * spikeWidth;
    ctx.beginPath();
    ctx.moveTo(sx, obs.y + obs.height);
    ctx.lineTo(sx + spikeWidth / 2, obs.y);
    ctx.lineTo(sx + spikeWidth, obs.y + obs.height);
    ctx.closePath();
    ctx.stroke();
  }
  
  ctx.font = 'bold 10px Orbitron';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.shadowBlur = 5;
  ctx.shadowColor = '#fff';
  const label = obs.spikes > 1 ? 'x2' : 'x1';
  ctx.fillText(label, obs.x + obs.width/2, obs.y - 8);
  
  ctx.restore();
}

function drawOrb(obs) {
  const cx = obs.x + obs.width / 2;
  const cy = obs.y + obs.height / 2;
  const radius = obs.width / 2;
  
  ctx.save();
  ctx.shadowBlur = 25;
  ctx.shadowColor = obs.color;
  
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  gradient.addColorStop(0, '#fff');
  gradient.addColorStop(0.3, obs.color);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.7, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  
  ctx.font = 'bold 10px Orbitron';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.shadowBlur = 5;
  ctx.shadowColor = '#fff';
  ctx.fillText('ORB', cx, cy + radius + 12);
  
  ctx.restore();
}

function drawPillar(obs) {
  ctx.save();
  ctx.shadowBlur = 15;
  ctx.shadowColor = obs.color;
  ctx.fillStyle = obs.color;
  ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
  ctx.restore();
}

function drawDiamond(obs) {
  obs.rotation = (obs.rotation || 0) + 0.05;
  const cx = obs.x + obs.width / 2;
  const cy = obs.y + obs.height / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(obs.rotation);
  ctx.shadowBlur = 20;
  ctx.shadowColor = obs.color;
  ctx.fillStyle = obs.color;
  ctx.beginPath();
  ctx.moveTo(0, -obs.height/2);
  ctx.lineTo(obs.width/2, 0);
  ctx.lineTo(0, obs.height/2);
  ctx.lineTo(-obs.width/2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawCrystal(obs) {
  ctx.save();
  ctx.shadowBlur = 20;
  ctx.shadowColor = obs.color;
  ctx.fillStyle = obs.color;
  ctx.beginPath();
  ctx.moveTo(obs.x, obs.y + obs.height);
  ctx.lineTo(obs.x + obs.width/2, obs.y);
  ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawHexagon(obs) {
  obs.rotation = (obs.rotation || 0) + 0.03;
  const cx = obs.x + obs.width / 2;
  const cy = obs.y + obs.height / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(obs.rotation);
  ctx.shadowBlur = 20;
  ctx.shadowColor = obs.color;
  ctx.fillStyle = obs.color;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = Math.cos(angle) * obs.width/2;
    const y = Math.sin(angle) * obs.height/2;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawGeyser(obs) {
  const pulse = Math.sin(frameCount * 0.1 + obs.pulsePhase) * 0.3 + 0.7;
  const h = obs.height * pulse;
  ctx.save();
  ctx.shadowBlur = 25;
  ctx.shadowColor = obs.color;
  ctx.fillStyle = obs.color;
  ctx.beginPath();
  ctx.moveTo(obs.x, obs.y + h);
  ctx.lineTo(obs.x + obs.width/2, obs.y);
  ctx.lineTo(obs.x + obs.width, obs.y + h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawFireball(obs) {
  obs.trail = obs.trail || [];
  obs.trail.push({ x: obs.x + obs.width/2, y: obs.y + obs.height/2 });
  if (obs.trail.length > 8) obs.trail.shift();
  
  ctx.save();
  for (let i = 0; i < obs.trail.length; i++) {
    const t = obs.trail[i];
    const alpha = (i / obs.trail.length) * 0.5;
    ctx.fillStyle = `rgba(255, 100, 0, ${alpha})`;
    ctx.beginPath();
    ctx.arc(t.x + (obs.width/2 - obs.trail[0].x) * (i/obs.trail.length), t.y, 5 - i*0.5, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.shadowBlur = 25;
  ctx.shadowColor = obs.color;
  ctx.fillStyle = obs.color;
  ctx.beginPath();
  ctx.arc(obs.x + obs.width/2, obs.y + obs.height/2, obs.width/2, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function drawGlitchBlock(obs) {
  obs.glitchTimer = (obs.glitchTimer || 0) + 1;
  if (obs.glitchTimer % 15 === 0) {
    obs.offsetX = (Math.random() - 0.5) * 20;
  }
  if (obs.glitchTimer % 15 === 14) obs.offsetX = 0;
  
  ctx.save();
  ctx.shadowBlur = 20;
  ctx.shadowColor = obs.color;
  ctx.fillStyle = obs.color;
  ctx.fillRect(obs.x + obs.offsetX, obs.y, obs.width, obs.height);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(obs.x + obs.offsetX, obs.y, obs.width, obs.height);
  ctx.restore();
}

function drawSplitObstacle(obs) {
  ctx.save();
  ctx.shadowBlur = 20;
  ctx.shadowColor = obs.color;
  ctx.fillStyle = obs.color;
  ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(obs.x + obs.offsetX, obs.y + obs.offsetX, obs.width, obs.height);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
  ctx.restore();
}

function drawPlayer() {
  let px = player.x + glitchOffsetX;
  let py = player.y + glitchOffsetY;
  const cx = px + player.width / 2;
  const cy = py + player.height / 2;
  
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(player.rotation);
  ctx.scale(playerScaleX, playerScaleY);
  
  const size = player.baseWidth;
  const half = size / 2;
  
  const glowSpeed = currentWorld === 6 ? 0.3 : 0.1;
  const glowMod = currentWorld === 6 ? 3 : 1;
  const glowPulse = player.glowIntensity + Math.sin(frameCount * glowSpeed) * 5 * glowMod;
  ctx.shadowBlur = glowPulse;
  ctx.shadowColor = player.color;
  
  ctx.fillStyle = player.color;
  ctx.fillRect(-half, -half, size, size);
  
  ctx.fillStyle = '#0aa';
  ctx.fillRect(-half + 6, -half + 6, size - 12, size - 12);
  
  ctx.strokeStyle = '#0ff';
  ctx.lineWidth = 2;
  ctx.strokeRect(-half, -half, size, size);
  
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-half + 4, -half + 4);
  ctx.lineTo(half - 4, half - 4);
  ctx.moveTo(half - 4, -half + 4);
  ctx.lineTo(-half + 4, half - 4);
  ctx.stroke();
  
  ctx.fillStyle = '#fff';
  const dotSize = 3;
  ctx.fillRect(-half + 4, -half + 4, dotSize, dotSize);
  ctx.fillRect(half - 7, -half + 4, dotSize, dotSize);
  ctx.fillRect(-half + 4, half - 7, dotSize, dotSize);
  ctx.fillRect(half - 7, half - 7, dotSize, dotSize);
  
  ctx.restore();
}

function draw() {
  const world = WORLDS[currentWorld];
  
  ctx.fillStyle = world.bgColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  if (currentWorld === 3) {
    for (let i = 0; i < 5; i++) {
      const gradient = ctx.createRadialGradient(
        canvasWidth * (0.2 + i * 0.15), canvasHeight * 0.3, 0,
        canvasWidth * (0.2 + i * 0.15), canvasHeight * 0.3, 200
      );
      gradient.addColorStop(0, `rgba(102, 0, 255, ${0.03 + i * 0.01})`);
      gradient.addColorStop(1, 'transparent');
      ctx.save();
      ctx.translate(canvasWidth * (0.2 + i * 0.15), canvasHeight * 0.3);
      ctx.rotate(nebulaRotation + i);
      ctx.fillStyle = gradient;
      ctx.fillRect(-200, -200, 400, 400);
      ctx.restore();
    }
  }
  
  if (currentWorld === 6) {
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    for (let x = -gridOffset; x < canvasWidth; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y < canvasHeight; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }
  }
  
  if (currentWorld === 4) {
    for (const drop of lavaDrops) {
      ctx.fillStyle = `rgba(255, ${100 + Math.random() * 100}, 0, 0.8)`;
      ctx.beginPath();
      ctx.arc(drop.x, drop.y, drop.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  for (const star of bgStars) {
    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = world.starColor;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  
  for (const line of glitchLines) {
    ctx.globalAlpha = line.alpha;
    ctx.fillStyle = line.color;
    ctx.fillRect(0, line.y, canvasWidth, 2 + Math.random() * 4);
  }
  ctx.globalAlpha = 1;
  
  drawGround();
  
  for (const obs of obstacles) {
    if (obs.type === 'spike') drawSpike(obs);
    else if (obs.type === 'orb') drawOrb(obs);
    else if (obs.type === 'pillar') drawPillar(obs);
    else if (obs.type === 'diamond') drawDiamond(obs);
    else if (obs.type === 'crystal') drawCrystal(obs);
    else if (obs.type === 'hexagon') drawHexagon(obs);
    else if (obs.type === 'geyser') drawGeyser(obs);
    else if (obs.type === 'fireball') drawFireball(obs);
    else if (obs.type === 'glitchBlock') drawGlitchBlock(obs);
    else if (obs.type === 'split') drawSplitObstacle(obs);
  }
  
  drawEnemies();
  
  for (const pu of powerups) {
    const cx = pu.x + pu.width / 2;
    const cy = pu.y + pu.height / 2;
    
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = pu.color;
    ctx.fillStyle = pu.color;
    ctx.beginPath();
    ctx.arc(cx, cy, pu.width / 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Orbitron';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pu.symbol, cx, cy);
    ctx.restore();
  }
  
  drawPlayer();
  
  for (const p of particles) {
    ctx.globalAlpha = p.life;
    ctx.shadowBlur = 10;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  
  for (const ft of floatingTexts) {
    ctx.globalAlpha = ft.life;
    ctx.font = 'bold 16px Orbitron';
    ctx.fillStyle = ft.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  
  if (flashRedFrames > 0) {
    ctx.fillStyle = `rgba(255, 0, 0, ${flashRedFrames * 0.1})`;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    flashRedFrames--;
  }
  
  if (showWorldSelect) {
    drawWorldSelect();
  }
  
  if (newWorldUnlocked > 0) {
    drawUnlockBanner();
  }
}

let worldSelectAnim = 0;

function drawWorldSelect() {
  worldSelectAnim += 0.05;
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  ctx.save();
  ctx.shadowBlur = 30;
  ctx.shadowColor = '#0ff';
  ctx.fillStyle = '#0ff';
  ctx.font = 'bold 32px Orbitron';
  ctx.textAlign = 'center';
  ctx.fillText('WORLD SELECT', canvasWidth/2, 80);
  ctx.restore();
  
  const worldSize = 100;
  const startX = (canvasWidth - worldSize * 3 - 20 * 2) / 2;
  const startY = 150;
  
  for (let i = 0; i < 6; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const wx = startX + col * (worldSize + 20);
    const wy = startY + row * (worldSize + 30);
    const worldNum = i + 1;
    const worldData = WORLD_UNLOCKS.find(w => w.world === worldNum);
    const isUnlocked = unlockedWorlds.includes(worldNum);
    const isCurrent = currentWorld === worldNum;
    
    ctx.fillStyle = isUnlocked ? WORLDS[worldNum].bgColor : '#111';
    ctx.fillRect(wx, wy, worldSize, worldSize);
    
    ctx.strokeStyle = isCurrent ? '#fff' : (isUnlocked ? WORLDS[worldNum].groundColor : '#333');
    ctx.lineWidth = isCurrent ? 4 : 2;
    ctx.strokeRect(wx, wy, worldSize, worldSize);
    
    ctx.fillStyle = isUnlocked ? '#fff' : '#444';
    ctx.font = 'bold 12px Orbitron';
    ctx.textAlign = 'center';
    ctx.fillText(worldData.name.split(' ')[0], wx + worldSize/2, wy + 25);
    ctx.font = '10px Orbitron';
    ctx.fillText(worldData.name.split(' ')[1] || '', wx + worldSize/2, wy + 40);
    
    if (!isUnlocked) {
      ctx.fillStyle = '#444';
      ctx.font = 'bold 10px Orbitron';
      ctx.fillText(`Score ${worldData.threshold}`, wx + worldSize/2, wy + worldSize - 15);
    }
    
    if (isCurrent) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px Orbitron';
      ctx.fillText('SELECTED', wx + worldSize/2, wy + worldSize - 10);
    }
  }
  
  ctx.fillStyle = '#fff';
  ctx.font = '14px Orbitron';
  ctx.textAlign = 'center';
  ctx.fillText('Click a world to select', canvasWidth/2, canvasHeight - 50);
  ctx.fillText('Press SPACE or click to continue', canvasWidth/2, canvasHeight - 25);
}

function drawUnlockBanner() {
  if (newWorldUnlocked === 0) return;
  
  const worldData = WORLD_UNLOCKS.find(w => w.world === newWorldUnlocked);
  const alpha = Math.min(1, (180 - (animationFrame % 180)) / 30);
  
  if (alpha <= 0) {
    newWorldUnlocked = 0;
    return;
  }
  
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, canvasHeight/2 - 40, canvasWidth, 80);
  ctx.strokeStyle = '#ff0';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, canvasHeight/2 - 35, canvasWidth - 20, 70);
  
  ctx.shadowBlur = 20;
  ctx.shadowColor = '#ff0';
  ctx.fillStyle = '#ff0';
  ctx.font = 'bold 24px Orbitron';
  ctx.textAlign = 'center';
  ctx.fillText('NEW WORLD UNLOCKED!', canvasWidth/2, canvasHeight/2);
  
  ctx.fillStyle = '#fff';
  ctx.font = '16px Orbitron';
  ctx.fillText(worldData.name, canvasWidth/2, canvasHeight/2 + 25);
  ctx.restore();
}

function handleWorldSelectClick(x, y) {
  const worldSize = 100;
  const startX = (canvasWidth - worldSize * 3 - 20 * 2) / 2;
  const startY = 150;
  
  for (let i = 0; i < 6; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const wx = startX + col * (worldSize + 20);
    const wy = startY + row * (worldSize + 30);
    const worldNum = i + 1;
    
    if (unlockedWorlds.includes(worldNum) && 
        x >= wx && x <= wx + worldSize && y >= wy && y <= wy + worldSize) {
      currentWorld = worldNum;
      localStorage.setItem('neonDashCurrentWorld', currentWorld);
      showWorldSelect = false;
      return;
    }
  }
}

let animationFrame = 0;

function gameLoop() {
  animationFrame++;
  if (gameRunning) {
    update();
  }
  draw();
  requestAnimationFrame(gameLoop);
}

function gameOver() {
  gameRunning = false;
  flashRedFrames = 10;
  stopBGM();
  stopTrackCheck();
  playGameOverSound();
  
  fadeYTVolume(15, 300);
  
  playSound('die');
  
  gameContainer.classList.add('shake');
  setTimeout(() => gameContainer.classList.remove('shake'), 300);
  
  spawnParticles(player.x + player.width/2, player.y + player.height/2, 30, '#f0f');
  
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('neonDashHighScore', highScore);
  }
  
  let newlyUnlocked = 0;
  for (const unlock of WORLD_UNLOCKS) {
    if (!unlockedWorlds.includes(unlock.world) && highScore >= unlock.threshold) {
      unlockedWorlds.push(unlock.world);
      newlyUnlocked = unlock.world;
    }
  }
  if (newlyUnlocked > 0) {
    localStorage.setItem('neonDashWorlds', JSON.stringify(unlockedWorlds));
    newWorldUnlocked = newlyUnlocked;
  }
  
  finalScoreEl.textContent = score;
  bestScoreEl.textContent = highScore;
  
  showWorldSelect = newlyUnlocked > 0;
  
  setTimeout(() => {
    fadeYTVolume(0, 800);
  }, 1200);
  
  gameOverScreen.classList.remove('hidden');
}

function startGame(isRetry) {
  playReadySound(isRetry);
}

function playIntroBGM() {
  if (!soundEnabled || !audioCtx) {
    startBGM();
    return;
  }
  
  stopBGM();
  bgmPlaying = true;
  let introNote = 0;
  const introSong = BGM_START;
  const introSpeed = 150;
  
  const introInterval = setInterval(() => {
    if (!soundEnabled || !gameRunning) {
      clearInterval(introInterval);
      return;
    }
    
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc1.type = 'sawtooth';
    osc2.type = 'square';
    
    const freq = introSong[introNote % introSong.length];
    osc1.frequency.value = freq;
    osc2.frequency.value = freq * 0.5;
    
    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(bgmGain);
    
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.2);
    osc2.stop(now + 0.2);
    
    introNote++;
    
    if (introNote >= 16) {
      clearInterval(introInterval);
      gameStartBgmPlayed = true;
      bgmPlaying = false;
      startBGM();
    }
  }, introSpeed);
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  soundBtn.textContent = soundEnabled ? 'ON' : 'OFF';
  soundBtn.className = `toggle-btn ${soundEnabled ? 'on' : 'off'}`;
  
  if (soundEnabled && !audioCtx) {
    initAudio();
  }
  
  if (soundEnabled) {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    if (gameRunning) {
      fadeYTVolume(80, 300);
    }
  } else {
    if (audioCtx) {
      audioCtx.suspend();
    }
    fadeYTVolume(0, 300);
  }
}

startBtn.addEventListener('click', () => startGame(false));
startBtn.addEventListener('touchend', (e) => { e.preventDefault(); startGame(false); });
restartBtn.addEventListener('click', () => startGame(true));
restartBtn.addEventListener('touchend', (e) => { e.preventDefault(); startGame(true); });
soundBtn.addEventListener('click', toggleSound);
soundBtn.addEventListener('touchend', (e) => { e.preventDefault(); toggleSound(); });

canvas.addEventListener('click', (e) => {
  if (showWorldSelect) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    handleWorldSelectClick(x, y);
  }
});

document.addEventListener('keydown', handleInput);
canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('touchstart', handleInput, { passive: false });

window.addEventListener('resize', resize);

resize();
highScoreDisplay.textContent = `BEST: ${highScore}`;

gameLoop();