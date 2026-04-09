// src/config/trialSequence.js — Generates ordered trial list from config

/**
 * Fisher-Yates shuffle (in-place).
 * @param {Array} array
 * @returns {Array} the same array, shuffled
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Generates a flat array of trial objects from experiment config.
 * Callers should run validateConfig() first for detailed error messages.
 * This function throws TypeError on structurally invalid input.
 * @param {object} config - The experiment config object
 * @returns {Array<object>} Ordered list of trial objects
 */
export function generateTrialSequence(config) {
  if (config === null || typeof config !== 'object' || Array.isArray(config)) {
    throw new TypeError('config must be an object');
  }
  if (!Array.isArray(config.blocks)) {
    throw new TypeError('config.blocks must be an array');
  }
  if (config.speedTiers === null || typeof config.speedTiers !== 'object' || Array.isArray(config.speedTiers)) {
    throw new TypeError('config.speedTiers must be an object');
  }

  const trials = [];
  let globalIndex = 0;

  for (const [blockIndex, block] of config.blocks.entries()) {
    if (!(block.speedTier in config.speedTiers)) {
      throw new TypeError(`config.blocks[${blockIndex}].speedTier "${block.speedTier}" must reference a valid entry in config.speedTiers`);
    }
    if (!Array.isArray(block.trials)) {
      throw new TypeError(`config.blocks[${blockIndex}].trials must be an array`);
    }

    const speedTier = config.speedTiers[block.speedTier];
    const blockTrials = [];

    for (const [trialDefIndex, trialDef] of block.trials.entries()) {
      if (!Number.isInteger(trialDef.count) || trialDef.count <= 0) {
        throw new TypeError(`config.blocks[${blockIndex}].trials[${trialDefIndex}].count must be a positive integer`);
      }
      for (let i = 0; i < trialDef.count; i++) {
        const trial = {
          blockId: block.id,
          blockLabel: block.label,
          trialIndex: 0,
          globalIndex: 0,
          speedTier,
          showFeedback: block.showFeedback,
          isLastInBlock: false,
          breakAfter: false,
          breakDuration: null,
        };

        if (trialDef.stages) {
          trial.stages = trialDef.stages;
        } else {
          trial.path = trialDef.path;
        }

        blockTrials.push(trial);
      }
    }

    if (block.shuffle) {
      shuffleArray(blockTrials);
    }

    for (let i = 0; i < blockTrials.length; i++) {
      blockTrials[i].trialIndex = i;
      blockTrials[i].globalIndex = globalIndex++;
    }

    if (blockTrials.length > 0) {
      const lastTrial = blockTrials[blockTrials.length - 1];
      lastTrial.isLastInBlock = true;
      if (block.breakAfter) {
        lastTrial.breakAfter = true;
        lastTrial.breakDuration = block.breakDuration ?? null;
      }
    }

    trials.push(...blockTrials);
  }

  return trials;
}
