// src/audio/audioManager.js — Preload and play sounds

/**
 * Default tone definitions matching the original experiment.
 */
const DEFAULT_TONES = {
  ready: { frequency: 440, duration: 0.15 },
  go: { frequency: 880, duration: 0.2 },
  mean: { frequency: 330, duration: 0.12 },
};

/**
 * Creates an audio manager that plays tones and preloaded sounds.
 * Must be initialized after a user gesture (click/keypress) due to
 * browser autoplay policies.
 * @returns {object}
 */
export function createAudioManager() {
  /** @type {AudioContext | null} */
  let audioCtx = null;
  const soundBuffers = new Map();

  /**
   * Initialize the AudioContext. Call after a user gesture.
   */
  function initialize() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)({
        latencyHint: 'interactive',
      });
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch((err) => {
          console.warn('Failed to resume AudioContext:', err.message);
        });
      }
    } catch (err) {
      console.warn('Web Audio API not available:', err.message);
    }
  }

  /**
   * Play a simple oscillator tone via Web Audio API.
   * @param {number} frequency — in Hz
   * @param {number} duration — in seconds
   */
  function playTone(frequency, duration) {
    if (!audioCtx) {
      console.warn('AudioContext not initialized. Call initialize() first.');
      return;
    }

    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    // Fade out at the end to avoid clicks
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    oscillator.connect(gain);
    gain.connect(audioCtx.destination);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration);
  }

  /**
   * Play a named default tone (ready, go, mean).
   * @param {string} name — tone name
   */
  function playDefaultTone(name) {
    const tone = DEFAULT_TONES[name];
    if (!tone) {
      console.warn(`Unknown default tone: "${name}"`);
      return;
    }
    playTone(tone.frequency, tone.duration);
  }

  /**
   * Preload an audio file for later playback.
   * @param {string} name — identifier for the sound
   * @param {string} url — URL of the audio file
   * @returns {Promise<void>}
   */
  async function preloadSound(name, url) {
    if (!audioCtx) {
      console.warn('AudioContext not initialized. Call initialize() first.');
      return;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to fetch sound "${name}" from ${url}: ${response.status}`);
        return;
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      soundBuffers.set(name, audioBuffer);
    } catch (err) {
      console.warn(`Failed to preload sound "${name}":`, err.message);
    }
  }

  /**
   * Play a preloaded sound by name.
   * @param {string} name — identifier for the preloaded sound
   */
  function playSound(name) {
    if (!audioCtx) {
      console.warn('AudioContext not initialized. Call initialize() first.');
      return;
    }

    const buffer = soundBuffers.get(name);
    if (!buffer) {
      console.warn(`Sound "${name}" not preloaded. Skipping playback.`);
      return;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start(0);
  }

  return {
    initialize,
    playTone,
    playDefaultTone,
    preloadSound,
    playSound,
  };
}
