// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAudioManager } from '../src/audio/audioManager.js';

describe('createAudioManager', () => {
  let mockOscillator;
  let mockGain;
  let mockSource;
  let mockAudioCtx;

  beforeEach(() => {
    mockOscillator = {
      type: '',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    mockGain = {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    };
    mockSource = {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
    };
    mockAudioCtx = {
      currentTime: 0,
      destination: {},
      createOscillator: vi.fn(() => mockOscillator),
      createGain: vi.fn(() => mockGain),
      createBufferSource: vi.fn(() => mockSource),
      decodeAudioData: vi.fn(async (buf) => buf),
    };

    // Use a class-style mock for AudioContext
    globalThis.AudioContext = class MockAudioContext {
      constructor() {
        Object.assign(this, mockAudioCtx);
      }
    };
  });

  it('returns an object with expected methods', () => {
    const am = createAudioManager();
    expect(typeof am.initialize).toBe('function');
    expect(typeof am.playTone).toBe('function');
    expect(typeof am.playDefaultTone).toBe('function');
    expect(typeof am.preloadSound).toBe('function');
    expect(typeof am.playSound).toBe('function');
  });

  it('initialize creates an AudioContext', () => {
    const am = createAudioManager();
    am.initialize();
    // After initialization, playTone should work without warning
    am.playTone(440, 0.15);
    expect(mockAudioCtx.createOscillator).toHaveBeenCalled();
  });

  it('initialize is idempotent', () => {
    const am = createAudioManager();
    am.initialize();
    const firstCtx = mockAudioCtx;
    am.initialize(); // should not create a second context
    am.playTone(440, 0.15);
    expect(firstCtx.createOscillator).toHaveBeenCalledTimes(1);
  });

  it('playTone creates an oscillator and gain node', () => {
    const am = createAudioManager();
    am.initialize();
    am.playTone(440, 0.15);
    expect(mockAudioCtx.createOscillator).toHaveBeenCalled();
    expect(mockAudioCtx.createGain).toHaveBeenCalled();
  });

  it('playTone warns when not initialized', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Remove AudioContext to prevent initialization
    delete globalThis.AudioContext;
    const am = createAudioManager();
    am.playTone(440, 0.15);
    expect(warnSpy).toHaveBeenCalledWith('AudioContext not initialized. Call initialize() first.');
    warnSpy.mockRestore();
  });

  it('playDefaultTone plays the ready tone', () => {
    const am = createAudioManager();
    am.initialize();
    am.playDefaultTone('ready');
    expect(mockAudioCtx.createOscillator).toHaveBeenCalled();
  });

  it('playDefaultTone warns on unknown tone', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const am = createAudioManager();
    am.initialize();
    am.playDefaultTone('unknown');
    expect(warnSpy).toHaveBeenCalledWith('Unknown default tone: "unknown"');
    warnSpy.mockRestore();
  });

  it('playSound warns when sound not preloaded', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const am = createAudioManager();
    am.initialize();
    am.playSound('nonexistent');
    expect(warnSpy).toHaveBeenCalledWith('Sound "nonexistent" not preloaded. Skipping playback.');
    warnSpy.mockRestore();
  });

  it('preloadSound warns when not initialized', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    delete globalThis.AudioContext;
    const am = createAudioManager();
    await am.preloadSound('test', '/test.mp3');
    expect(warnSpy).toHaveBeenCalledWith('AudioContext not initialized. Call initialize() first.');
    warnSpy.mockRestore();
  });

  it('preloadSound handles fetch failure gracefully', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
    });
    const am = createAudioManager();
    am.initialize();
    await am.preloadSound('test', '/missing.mp3');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to fetch sound "test"'),
    );
    warnSpy.mockRestore();
  });

  it('preloadSound and playSound work together', async () => {
    const mockBuffer = new ArrayBuffer(8);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => mockBuffer,
    });

    const am = createAudioManager();
    am.initialize();
    await am.preloadSound('test', '/test.mp3');
    am.playSound('test');
    expect(mockAudioCtx.createBufferSource).toHaveBeenCalled();
  });
});
