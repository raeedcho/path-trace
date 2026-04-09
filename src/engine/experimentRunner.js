// src/engine/experimentRunner.js — Loops trials, manages blocks/breaks

/**
 * Creates an experiment runner that iterates the trial sequence.
 * @param {object} deps
 * @returns {object}
 */
export function createExperimentRunner({ trialRunner, overlayManager, progressDisplay, dataManager, config }) {

  /**
   * Run the full experiment trial sequence.
   * @param {Array<object>} trialSequence — ordered list of trial objects
   * @returns {Promise<void>}
   */
  async function run(trialSequence) {
    const totalTrials = trialSequence.length;

    // Block-level accuracy tracking
    let blockAccuracySum = 0;
    let blockTrialCount = 0;
    let currentBlockId = null;

    progressDisplay.show();

    for (let i = 0; i < trialSequence.length; i++) {
      const trial = trialSequence[i];

      // Reset block tracking when entering a new block
      if (trial.blockId !== currentBlockId) {
        blockAccuracySum = 0;
        blockTrialCount = 0;
        currentBlockId = trial.blockId;
      }

      // Update progress display
      progressDisplay.updateRound(i, totalTrials);

      // Run the trial
      const result = await trialRunner.runTrial(trial);

      // Accumulate block accuracy
      if (result.completed) {
        blockAccuracySum += result.movementAccuracy;
        blockTrialCount++;
      }

      // Block boundary handling
      if (trial.isLastInBlock) {
        const avgAccuracy = blockTrialCount > 0
          ? Math.round(blockAccuracySum / blockTrialCount)
          : 0;

        // Save block summary
        await dataManager.saveBlockSummary({
          blockId: trial.blockId,
          blockLabel: trial.blockLabel,
          averageAccuracy: avgAccuracy,
          trialsCompleted: blockTrialCount,
        });

        // Show block summary if next trial exists
        const nextTrial = trialSequence[i + 1];
        if (nextTrial) {
          const nextMinTime = nextTrial.speedTier.min;
          const nextMaxTime = nextTrial.speedTier.max;

          progressDisplay.hide();

          await overlayManager.waitForKeypress(
            'instructions-overlay',
            'Enter',
          );
          overlayManager.hide('instructions-overlay');
          overlayManager.show('instructions-overlay',
            `<div>
              <p>Your average accuracy in the previous block was ${avgAccuracy}%</p>
              <p>Next: ${nextTrial.blockLabel}, goal time of ${nextMinTime} - ${nextMaxTime} ms</p>
              <p><b>Prioritize moving at the right speed!</b></p>
              <p>Press Enter to continue</p>
            </div>`
          );

          await overlayManager.waitForKeypress('instructions-overlay', 'Enter');

          progressDisplay.show();
        }

        // Break screen
        if (trial.breakAfter && nextTrial) {
          const breakSeconds = Math.ceil((trial.breakDuration ?? 10000) / 1000);
          progressDisplay.hide();
          await overlayManager.showCountdown('break-overlay', breakSeconds);
          progressDisplay.show();
        }
      }
    }

    // Experiment complete
    progressDisplay.hide();
    await dataManager.saveExperimentComplete({ completedAt: new Date().toISOString() });
  }

  return { run };
}
