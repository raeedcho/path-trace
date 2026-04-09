// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOverlayManager } from '../src/ui/overlayManager.js';

describe('createOverlayManager', () => {
  let om;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="test-overlay" class="overlay" style="display: none;"></div>
      <div id="countdown-overlay" class="overlay" style="display: none;"></div>
    `;
    om = createOverlayManager();
  });

  it('returns an object with expected methods', () => {
    expect(typeof om.show).toBe('function');
    expect(typeof om.hide).toBe('function');
    expect(typeof om.showTimed).toBe('function');
    expect(typeof om.waitForKeypress).toBe('function');
    expect(typeof om.showCountdown).toBe('function');
  });

  it('show sets display to flex', () => {
    om.show('test-overlay');
    expect(document.getElementById('test-overlay').style.display).toBe('flex');
  });

  it('show sets innerHTML when content is provided', () => {
    om.show('test-overlay', '<p>Hello</p>');
    expect(document.getElementById('test-overlay').innerHTML).toBe('<p>Hello</p>');
    expect(document.getElementById('test-overlay').style.display).toBe('flex');
  });

  it('hide sets display to none', () => {
    om.show('test-overlay');
    om.hide('test-overlay');
    expect(document.getElementById('test-overlay').style.display).toBe('none');
  });

  it('show warns when overlay not found', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    om.show('nonexistent');
    expect(warnSpy).toHaveBeenCalledWith('Overlay "#nonexistent" not found.');
    warnSpy.mockRestore();
  });

  it('hide warns when overlay not found', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    om.hide('nonexistent');
    expect(warnSpy).toHaveBeenCalledWith('Overlay "#nonexistent" not found.');
    warnSpy.mockRestore();
  });

  it('showTimed shows then hides after duration', async () => {
    vi.useFakeTimers();
    const promise = om.showTimed('test-overlay', '<p>Temp</p>', 1000);
    expect(document.getElementById('test-overlay').style.display).toBe('flex');

    vi.advanceTimersByTime(1000);
    await promise;

    expect(document.getElementById('test-overlay').style.display).toBe('none');
    vi.useRealTimers();
  });

  it('waitForKeypress resolves immediately when overlay not found', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await om.waitForKeypress('nonexistent', ' ');
    expect(warnSpy).toHaveBeenCalledWith('Overlay "#nonexistent" not found.');
    warnSpy.mockRestore();
  });

  it('waitForKeypress resolves when correct key is pressed', async () => {
    const promise = om.waitForKeypress('test-overlay', ' ');
    expect(document.getElementById('test-overlay').style.display).toBe('flex');

    // Simulate keypress
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    await promise;

    expect(document.getElementById('test-overlay').style.display).toBe('none');
  });

  it('waitForKeypress ignores wrong keys', async () => {
    vi.useFakeTimers();
    const resolved = vi.fn();
    const promise = om.waitForKeypress('test-overlay', ' ').then(resolved);

    // Wrong key
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    await vi.advanceTimersByTimeAsync(10);
    expect(resolved).not.toHaveBeenCalled();

    // Correct key
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    await vi.advanceTimersByTimeAsync(10);
    expect(resolved).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('showCountdown counts down and resolves', async () => {
    vi.useFakeTimers();
    const promise = om.showCountdown('countdown-overlay', 3);
    const el = document.getElementById('countdown-overlay');

    expect(el.style.display).toBe('flex');
    expect(el.innerHTML).toBe('<h1>3</h1>');

    vi.advanceTimersByTime(1000);
    expect(el.innerHTML).toBe('<h1>2</h1>');

    vi.advanceTimersByTime(1000);
    expect(el.innerHTML).toBe('<h1>1</h1>');

    vi.advanceTimersByTime(1000);
    await promise;
    expect(el.style.display).toBe('none');
    vi.useRealTimers();
  });

  it('showCountdown resolves immediately for missing overlay', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await om.showCountdown('nonexistent', 3);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('showCountdown resolves immediately when seconds <= 0', async () => {
    vi.useFakeTimers();
    const resolved = vi.fn();
    om.showCountdown('countdown-overlay', 0).then(resolved);
    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).toHaveBeenCalled();

    resolved.mockClear();
    om.showCountdown('countdown-overlay', -5).then(resolved);
    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
