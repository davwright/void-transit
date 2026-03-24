/**
 * VOID TRANSIT Audio System
 *
 * Generates atmospheric synth music and sound effects using Web Audio API.
 * No external audio files needed — everything is procedurally generated.
 *
 * Design philosophy:
 * - Ambient, minimal, unsettling — think Alien (1979), 2001: A Space Odyssey
 * - Low drones for the void, higher tones for tension
 * - Mechanical sounds for the ship (hums, clicks, pressure releases)
 * - Musical cues tied to emotional beats, not just rooms
 * - Silence is a tool — the absence of sound after a drone stops is powerful
 */

(function () {
  'use strict';

  let ctx = null;
  let masterGain = null;
  let currentDrone = null;
  let currentTheme = null;
  let enabled = true;
  let volume = 0.3;

  // Note frequencies (Hz)
  const NOTES = {
    C2: 65.41, D2: 73.42, Eb2: 77.78, E2: 82.41, F2: 87.31, G2: 98.00, Ab2: 103.83, A2: 110.00, Bb2: 116.54,
    C3: 130.81, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, G3: 196.00, Ab3: 207.65, A3: 220.00, Bb3: 233.08,
    C4: 261.63, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, G4: 392.00, Ab4: 415.30, A4: 440.00, Bb4: 466.16,
    C5: 523.25, D5: 587.33, Eb5: 622.25, E5: 659.26,
  };

  // === Theme definitions — each maps to an emotional context ===
  // Themes use intervals and scales that evoke specific moods

  const THEMES = {
    // Starting area — disorientation, cold, waking
    cryo: {
      drone: [NOTES.C2, NOTES.G2],
      pad: [NOTES.Eb3, NOTES.Bb3, NOTES.F3],
      tempo: 0.15,
      filterFreq: 400,
      detune: 5,
      type: 'sine',
    },
    // Standard corridors — the ship's nervous system, mechanical
    corridor: {
      drone: [NOTES.D2, NOTES.A2],
      pad: [NOTES.F3, NOTES.A3, NOTES.D3],
      tempo: 0.2,
      filterFreq: 600,
      detune: 3,
      type: 'triangle',
    },
    // Living spaces — warmer but empty, traces of humanity
    habitation: {
      drone: [NOTES.A2, NOTES.E3],
      pad: [NOTES.C4, NOTES.E4, NOTES.A3],
      tempo: 0.25,
      filterFreq: 800,
      detune: 2,
      type: 'sine',
    },
    // Engineering — industrial, powerful, dangerous
    engineering: {
      drone: [NOTES.C2, NOTES.F2],
      pad: [NOTES.Ab3, NOTES.C3, NOTES.F3],
      tempo: 0.18,
      filterFreq: 500,
      detune: 8,
      type: 'sawtooth',
    },
    // Bridge — command, scope, the void visible
    bridge: {
      drone: [NOTES.E2, NOTES.Bb2],
      pad: [NOTES.G3, NOTES.Bb3, NOTES.E3],
      tempo: 0.12,
      filterFreq: 700,
      detune: 4,
      type: 'sine',
    },
    // Reactor — deep thrum, power, radiation
    reactor: {
      drone: [NOTES.C2, NOTES.Eb2],
      pad: [NOTES.Eb3, NOTES.Ab3, NOTES.C3],
      tempo: 0.1,
      filterFreq: 300,
      detune: 12,
      type: 'sawtooth',
    },
    // EVA / hull exterior — vast silence, tiny sounds
    void: {
      drone: [NOTES.Bb2],
      pad: [NOTES.Eb4, NOTES.Bb3],
      tempo: 0.05,
      filterFreq: 200,
      detune: 1,
      type: 'sine',
    },
    // Discovery / revelation — something important found
    discovery: {
      drone: [NOTES.A2, NOTES.E3],
      pad: [NOTES.C4, NOTES.E4, NOTES.G4, NOTES.A4],
      tempo: 0.3,
      filterFreq: 1200,
      detune: 1,
      type: 'sine',
    },
    // Danger — CO2 rising, radiation, hull breach
    danger: {
      drone: [NOTES.C2, NOTES.D2],
      pad: [NOTES.Ab3, NOTES.D3, NOTES.F3],
      tempo: 0.35,
      filterFreq: 400,
      detune: 15,
      type: 'square',
    },
    // Silence — used after death, major revelations
    silence: {
      drone: [],
      pad: [],
      tempo: 0,
      filterFreq: 0,
      detune: 0,
      type: 'sine',
    },
  };

  // Room → theme mapping
  const ROOM_THEMES = {
    cryo_bay: 'cryo',
    corridor_d: 'corridor', corridor_c: 'corridor', corridor_a: 'corridor', corridor_b: 'corridor',
    bridge: 'bridge',
    captains_quarters: 'habitation',
    comms_room: 'bridge',
    med_bay: 'habitation',
    mess_hall: 'habitation',
    crew_quarters: 'habitation',
    lab: 'habitation',
    hydroponics: 'habitation',
    rec_room: 'habitation',
    reactor_room: 'reactor',
    machine_shop: 'engineering',
    life_support: 'engineering',
    electrical: 'engineering',
    cargo_bay: 'engineering',
    engine_room: 'reactor',
    fuel_storage: 'engineering',
    airlock_inner: 'corridor',
    airlock_outer: 'void',
    hull_exterior: 'void',
  };

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(ctx.destination);
  }

  // === Drone generator — continuous low-frequency background ===
  function startDrone(theme) {
    if (!ctx || !masterGain) return;
    stopDrone();
    if (!theme.drone.length) return;

    const droneGain = ctx.createGain();
    droneGain.gain.value = 0;
    droneGain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 4); // slow fade in

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = theme.filterFreq;
    filter.Q.value = 1;

    const oscs = theme.drone.map(freq => {
      const osc = ctx.createOscillator();
      osc.type = theme.type;
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() - 0.5) * theme.detune;

      // Slow LFO for subtle movement
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.05 + Math.random() * 0.1;
      lfoGain.gain.value = theme.detune * 0.5;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();

      osc.connect(filter);
      osc.start();
      return { osc, lfo };
    });

    filter.connect(droneGain);
    droneGain.connect(masterGain);

    currentDrone = { oscs, gain: droneGain, filter };
  }

  function stopDrone() {
    if (!currentDrone || !ctx) return;
    const { oscs, gain } = currentDrone;
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
    setTimeout(() => {
      oscs.forEach(({ osc, lfo }) => { osc.stop(); lfo.stop(); });
    }, 2500);
    currentDrone = null;
  }

  // === Pad generator — slow evolving chords ===
  function startPad(theme) {
    if (!ctx || !masterGain || !theme.pad.length || !theme.tempo) return;
    stopPad();

    const padGain = ctx.createGain();
    padGain.gain.value = 0;
    padGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 3);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = theme.filterFreq * 0.8;
    filter.Q.value = 2;

    filter.connect(padGain);
    padGain.connect(masterGain);

    let noteIndex = 0;
    const interval = setInterval(() => {
      if (!ctx) { clearInterval(interval); return; }
      const freq = theme.pad[noteIndex % theme.pad.length];
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() - 0.5) * 10;

      // Soft envelope
      noteGain.gain.value = 0;
      noteGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 1.5);
      noteGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 4);

      osc.connect(noteGain);
      noteGain.connect(filter);
      osc.start();
      osc.stop(ctx.currentTime + 4.5);

      noteIndex++;
    }, (1 / theme.tempo) * 1000);

    currentTheme = { gain: padGain, interval };
  }

  function stopPad() {
    if (!currentTheme) return;
    if (currentTheme.interval) clearInterval(currentTheme.interval);
    if (currentTheme.gain && ctx) {
      currentTheme.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
    }
    currentTheme = null;
  }

  // === Sound Effects ===

  function playSFX(type) {
    if (!ctx || !masterGain || !enabled) return;

    switch (type) {
      case 'door_open': {
        // Hydraulic hiss
        const noise = createNoise(0.5);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2000;
        filter.Q.value = 5;
        const sfxGain = ctx.createGain();
        sfxGain.gain.value = 0.15;
        sfxGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
        noise.connect(filter);
        filter.connect(sfxGain);
        sfxGain.connect(masterGain);
        break;
      }
      case 'item_take': {
        // Soft click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 800;
        gain.gain.value = 0.1;
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
        break;
      }
      case 'warning': {
        // Two-tone alert
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = 440;
        gain.gain.value = 0.08;
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start();
        osc.frequency.setValueAtTime(520, ctx.currentTime + 0.2);
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.4);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
        osc.stop(ctx.currentTime + 0.7);
        break;
      }
      case 'critical': {
        // Urgent alarm
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = 880;
        gain.gain.value = 0.12;
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start();
        for (let i = 0; i < 4; i++) {
          osc.frequency.setValueAtTime(880, ctx.currentTime + i * 0.15);
          osc.frequency.setValueAtTime(660, ctx.currentTime + i * 0.15 + 0.075);
        }
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.7);
        osc.stop(ctx.currentTime + 0.8);
        break;
      }
      case 'discovery': {
        // Ascending chime — something important found
        const notes = [NOTES.C4, NOTES.E4, NOTES.G4, NOTES.C5];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.value = 0;
          gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + i * 0.15 + 0.05);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.15 + 0.8);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(ctx.currentTime + i * 0.15);
          osc.stop(ctx.currentTime + i * 0.15 + 1);
        });
        break;
      }
      case 'heartbeat': {
        // Low thump-thump for tension
        for (let i = 0; i < 2; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = 60;
          gain.gain.value = 0.2;
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.3 + 0.2);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(ctx.currentTime + i * 0.3);
          osc.stop(ctx.currentTime + i * 0.3 + 0.3);
        }
        break;
      }
      case 'radio_static': {
        // Brief burst of static
        const noise = createNoise(0.3);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 4000;
        filter.Q.value = 2;
        const gain = ctx.createGain();
        gain.gain.value = 0.1;
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        break;
      }
    }
  }

  function createNoise(duration) {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.start();
    return source;
  }

  // === Public API ===

  window.voidAudio = {
    init: init,

    setRoom: function (roomId) {
      if (!enabled) return;
      init();
      const themeName = ROOM_THEMES[roomId] || 'corridor';
      const theme = THEMES[themeName];
      if (theme) {
        startDrone(theme);
        startPad(theme);
      }
    },

    sfx: function (type) {
      if (!enabled) return;
      init();
      playSFX(type);
    },

    setVolume: function (v) {
      volume = Math.max(0, Math.min(1, v));
      if (masterGain) masterGain.gain.value = volume;
    },

    toggle: function () {
      enabled = !enabled;
      if (!enabled) {
        stopDrone();
        stopPad();
      }
      return enabled;
    },

    isEnabled: function () { return enabled; },

    stop: function () {
      stopDrone();
      stopPad();
    },
  };
})();
