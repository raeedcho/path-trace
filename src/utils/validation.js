// src/utils/validation.js — Config schema checks

import { pathDefinitions } from '../config/pathDefinitions.js';

/**
 * Validates experiment config at startup.
 * @param {object} config - The experiment config object
 * @param {object} [knownPaths] - Optional map of known path names. Defaults to pathDefinitions.
 * @returns {{ valid: boolean, errors?: string[] }}
 */
export function validateConfig(config, knownPaths = pathDefinitions) {
  const errors = [];
  const pathNames = new Set(Object.keys(knownPaths));

  // blocks must be a non-empty array
  if (!Array.isArray(config.blocks) || config.blocks.length === 0) {
    errors.push('blocks must be a non-empty array');
  } else {
    for (const block of config.blocks) {
      // speedTier must exist in config.speedTiers
      if (!config.speedTiers?.[block.speedTier]) {
        errors.push(`Block "${block.id}": unknown speedTier "${block.speedTier}"`);
      }

      // Validate each trial definition in the block
      if (Array.isArray(block.trials)) {
        for (const trialDef of block.trials) {
          if (trialDef.stages) {
            for (const stage of trialDef.stages) {
              if (!pathNames.has(stage.path)) {
                errors.push(`Block "${block.id}": unknown path "${stage.path}" in stages`);
              }
            }
          } else if (trialDef.path) {
            if (!pathNames.has(trialDef.path)) {
              errors.push(`Block "${block.id}": unknown path "${trialDef.path}"`);
            }
          }
        }
      }
    }
  }

  // Validate timing values are positive numbers
  if (config.countdown) {
    if (typeof config.countdown.holdDuration === 'number' && config.countdown.holdDuration <= 0) {
      errors.push('countdown.holdDuration must be a positive number');
    }
  }

  if (config.feedback) {
    for (const key of ['tooFastPenalty', 'tooSlowPenalty', 'straightLinePenalty']) {
      if (typeof config.feedback[key] === 'number' && config.feedback[key] <= 0) {
        errors.push(`feedback.${key} must be a positive number`);
      }
    }
    if (typeof config.feedback.straightLineThreshold === 'number' && config.feedback.straightLineThreshold <= 0) {
      errors.push('feedback.straightLineThreshold must be a positive number');
    }
  }

  // Validate speedTiers have positive min/max
  if (config.speedTiers) {
    for (const [name, tier] of Object.entries(config.speedTiers)) {
      if (typeof tier.min === 'number' && tier.min <= 0) {
        errors.push(`speedTiers.${name}.min must be a positive number`);
      }
      if (typeof tier.max === 'number' && tier.max <= 0) {
        errors.push(`speedTiers.${name}.max must be a positive number`);
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }
  return { valid: true };
}
