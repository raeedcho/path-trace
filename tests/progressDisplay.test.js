// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { createProgressDisplay } from '../src/ui/progressDisplay.js';

describe('createProgressDisplay', () => {
  let pd;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="hud">
        <div id="timer"></div>
        <div id="round"></div>
        <div id="goalTime"></div>
      </div>
    `;
    pd = createProgressDisplay();
  });

  it('returns an object with expected methods', () => {
    expect(typeof pd.updateRound).toBe('function');
    expect(typeof pd.updateTimer).toBe('function');
    expect(typeof pd.updateGoalTime).toBe('function');
    expect(typeof pd.show).toBe('function');
    expect(typeof pd.hide).toBe('function');
  });

  it('updateRound shows movements remaining', () => {
    pd.updateRound(3, 16);
    expect(document.getElementById('round').textContent).toBe('Movements Remaining: 13');
  });

  it('updateRound shows 0 when current equals total', () => {
    pd.updateRound(16, 16);
    expect(document.getElementById('round').textContent).toBe('Movements Remaining: 0');
  });

  it('updateTimer shows time in green when in range', () => {
    pd.updateTimer(850, 800, 1200);
    const timerEl = document.getElementById('timer');
    expect(timerEl.textContent).toBe('Your Movement Time: 850 ms');
    // jsdom converts hex to rgb
    expect(timerEl.style.color).toMatch(/^(#66FF99|rgb\(102,\s*255,\s*153\))$/i);
  });

  it('updateTimer shows time in red when below range', () => {
    pd.updateTimer(500, 800, 1200);
    const timerEl = document.getElementById('timer');
    expect(timerEl.textContent).toBe('Your Movement Time: 500 ms');
    expect(timerEl.style.color).toMatch(/^(#ff4545|rgb\(255,\s*69,\s*69\))$/i);
  });

  it('updateTimer shows time in red when above range', () => {
    pd.updateTimer(1500, 800, 1200);
    const timerEl = document.getElementById('timer');
    expect(timerEl.textContent).toBe('Your Movement Time: 1500 ms');
    expect(timerEl.style.color).toMatch(/^(#ff4545|rgb\(255,\s*69,\s*69\))$/i);
  });

  it('updateTimer shows green at exact boundary values', () => {
    pd.updateTimer(800, 800, 1200);
    expect(document.getElementById('timer').style.color).toMatch(/^(#66FF99|rgb\(102,\s*255,\s*153\))$/i);

    pd.updateTimer(1200, 800, 1200);
    expect(document.getElementById('timer').style.color).toMatch(/^(#66FF99|rgb\(102,\s*255,\s*153\))$/i);
  });

  it('updateRound clamps to 0 when current exceeds total', () => {
    pd.updateRound(20, 16);
    expect(document.getElementById('round').textContent).toBe('Movements Remaining: 0');
  });

  it('updateTimer shows green when rounded value lands on boundary', () => {
    // 799.6 rounds to 800 — should be green, not red
    pd.updateTimer(799.6, 800, 1200);
    const timerEl = document.getElementById('timer');
    expect(timerEl.textContent).toBe('Your Movement Time: 800 ms');
    expect(timerEl.style.color).toMatch(/^(#66FF99|rgb\(102,\s*255,\s*153\))$/i);
  });

  it('updateTimer rounds to nearest ms', () => {
    pd.updateTimer(850.7, 800, 1200);
    expect(document.getElementById('timer').textContent).toBe('Your Movement Time: 851 ms');
  });

  it('updateGoalTime shows range', () => {
    pd.updateGoalTime(800, 1200);
    expect(document.getElementById('goalTime').textContent).toBe('Your Goal Time: 800 - 1200 ms');
  });

  it('hide hides all HUD elements', () => {
    pd.hide();
    expect(document.getElementById('timer').style.display).toBe('none');
    expect(document.getElementById('round').style.display).toBe('none');
    expect(document.getElementById('goalTime').style.display).toBe('none');
  });

  it('show restores HUD element visibility', () => {
    pd.hide();
    pd.show();
    expect(document.getElementById('timer').style.display).toBe('');
    expect(document.getElementById('round').style.display).toBe('');
    expect(document.getElementById('goalTime').style.display).toBe('');
  });
});
