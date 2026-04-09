import './style.css';
import config from './config/experimentConfig.js';
import { validateConfig } from './utils/validation.js';
import { generateTrialSequence } from './config/trialSequence.js';
import { COLORS, DEFAULTS } from './config/constants.js';
import { createCanvasManager, createCursorManager } from './rendering/canvasManager.js';
import { createAudioManager } from './audio/audioManager.js';
import { createOverlayManager } from './ui/overlayManager.js';
import { createProgressDisplay } from './ui/progressDisplay.js';
import { createDataManager } from './data/createDataManager.js';
import { createTrialRunner } from './engine/trialRunner.js';
import { createExperimentRunner } from './engine/experimentRunner.js';

let experimentInProgress = false;

window.addEventListener('beforeunload', (e) => {
  if (experimentInProgress) {
    e.preventDefault();
    e.returnValue = '';
  }
});

/**
 * Show demographics / consent form and collect participant info.
 * @param {object} overlayManager
 * @returns {Promise<object>} participant info
 */
async function collectParticipantInfo(overlayManager) {
  return new Promise((resolve) => {
    overlayManager.show('instructions-overlay', `
      <div style="max-width:500px;text-align:left">
        <h2>Participant Information</h2>
        <label>Age: <input type="number" id="intake-age" min="18" max="99" /></label><br/><br/>
        <label>Gender:
          <select id="intake-gender">
            <option value="">Select...</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="non-binary">Non-binary</option>
            <option value="prefer-not">Prefer not to say</option>
          </select>
        </label><br/><br/>
        <label>Handedness:
          <select id="intake-handedness">
            <option value="">Select...</option>
            <option value="right">Right</option>
            <option value="left">Left</option>
            <option value="ambidextrous">Ambidextrous</option>
          </select>
        </label><br/><br/>
        <label>Device:
          <select id="intake-device">
            <option value="">Select...</option>
            <option value="mouse">Mouse</option>
            <option value="trackpad">Trackpad</option>
            <option value="other">Other</option>
          </select>
        </label><br/><br/>
        <label><input type="checkbox" id="intake-consent" /> I consent to participate</label><br/><br/>
        <button id="intake-submit" disabled>Start Experiment</button>
        <p id="intake-error" style="color:red"></p>
      </div>
    `);

    const submitBtn = document.getElementById('intake-submit');
    const consentBox = document.getElementById('intake-consent');

    consentBox.addEventListener('change', () => {
      submitBtn.disabled = !consentBox.checked;
    });

    submitBtn.addEventListener('click', () => {
      const age = document.getElementById('intake-age').value;
      const gender = document.getElementById('intake-gender').value;
      const handedness = document.getElementById('intake-handedness').value;
      const device = document.getElementById('intake-device').value;
      const errorEl = document.getElementById('intake-error');

      if (!age || !gender || !handedness || !device) {
        errorEl.textContent = 'Please fill in all fields.';
        return;
      }

      overlayManager.hide('instructions-overlay');
      resolve({ age: parseInt(age, 10), gender, handedness, handednessMeasure: 100, device });
    });
  });
}

/**
 * Show instructions overlay and wait for Enter key.
 * @param {object} overlayManager
 * @returns {Promise<void>}
 */
async function showInstructions(overlayManager) {
  overlayManager.show('instructions-overlay', `
    <div style="max-width:600px;text-align:left">
      <h2>Movement Instructions</h2>
      <p>In this experiment you will trace paths with your cursor.</p>
      <p>A <b>start circle</b> will appear. Move your cursor into the circle and hold still.</p>
      <p>After a countdown (red → yellow → green), trace the path to the <b>target</b> at the end.</p>
      <p>A green <b>pace dot</b> shows the ideal speed. Try to match its speed.</p>
      <p>Your goal time range will be shown on screen.</p>
      <p><b>Press Enter to begin.</b></p>
    </div>
  `);
  await overlayManager.waitForKeypress('instructions-overlay', 'Enter');
}

/**
 * Show completion screen, collect feedback, finalize.
 * @param {object} overlayManager
 * @param {object} dataManager
 * @param {object} config
 * @returns {Promise<void>}
 */
async function showCompletion(overlayManager, dataManager, cfg) {
  return new Promise((resolve) => {
    const code = cfg.prolific?.completionCode || 'COMPLETE';
    overlayManager.show('completion-overlay', `
      <div style="max-width:500px;text-align:center">
        <h2>Experiment Complete!</h2>
        <p>Your completion code: <b>${code}</b></p>
        <p>Thank you for participating.</p>
        <textarea id="feedback-input" placeholder="Optional feedback..." rows="3" style="width:100%"></textarea><br/><br/>
        <button id="feedback-submit">Submit &amp; Download Data</button>
        <p id="feedback-thanks"></p>
      </div>
    `);

    document.getElementById('feedback-submit').addEventListener('click', async () => {
      const feedback = document.getElementById('feedback-input').value.trim();
      await dataManager.saveExperimentComplete({ feedback, completedAt: new Date().toISOString() });
      await dataManager.finalize();
      document.getElementById('feedback-thanks').textContent = 'Data downloaded. You may close this tab.';
      resolve();
    });
  });
}

async function main() {
  console.log('path-trace engine initialized');
  console.log('Data backend:', import.meta.env.VITE_DATA_BACKEND);

  // 1. Validate config
  const validation = validateConfig(config);
  if (!validation.valid) {
    console.error('Invalid experiment config:', validation.errors);
    return;
  }

  // 2. Initialize modules
  const canvasManager = createCanvasManager('canvas-wrapper');
  canvasManager.initialize();

  const audioManager = createAudioManager();
  const overlayManager = createOverlayManager();
  const progressDisplay = createProgressDisplay();
  const dataManager = await createDataManager(config);

  // 3. Run intake form
  const participantInfo = await collectParticipantInfo(overlayManager);
  await dataManager.saveParticipantInfo(participantInfo);

  // 4. Initialize audio (requires user gesture which intake form provided)
  audioManager.initialize();

  // 5. Show instructions
  await showInstructions(overlayManager);

  // 6. Set up pointer lock and cursor manager
  const dims = canvasManager.getDimensions();
  const cursorManager = createCursorManager({
    scaleFactor: config.pointer.scaleFactor,
    cursorRadius: DEFAULTS.cursorRadius,
  });
  cursorManager.setCanvasBounds(dims.width, dims.height);

  const mouseCanvas = document.getElementById('mouseCanvas');
  await cursorManager.requestPointerLock(mouseCanvas, {
    unadjustedMovement: config.pointer.useUnadjustedMovement,
  });

  // Handle pointer lock loss
  cursorManager.setOnLockLost(() => {
    if (experimentInProgress) {
      overlayManager.show('pointer-lock-overlay');
      mouseCanvas.addEventListener('click', async () => {
        await cursorManager.requestPointerLock(mouseCanvas, {
          unadjustedMovement: config.pointer.useUnadjustedMovement,
        });
        overlayManager.hide('pointer-lock-overlay');
      }, { once: true });
    }
  });

  // 7. Generate trial sequence and run experiment
  experimentInProgress = true;
  const sequence = generateTrialSequence(config);

  const trialRunner = createTrialRunner({
    canvasManager,
    audioManager,
    overlayManager,
    progressDisplay,
    cursorManager,
    dataManager,
    config,
  });

  const runner = createExperimentRunner({
    trialRunner,
    overlayManager,
    progressDisplay,
    dataManager,
    config,
  });

  await runner.run(sequence);
  experimentInProgress = false;

  // 8. Release pointer lock and show completion
  cursorManager.releasePointerLock();
  await showCompletion(overlayManager, dataManager, config);
}

main().catch(err => console.error('Experiment failed:', err));
