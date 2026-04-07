/**
 * Shared config helpers for reading/writing the OpenClaw plugin config.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const CONFIG_PATH = path.join(os.homedir(), '.openclaw', 'openclaw.json');

/** Read the current plugin config object (or empty object if none). */
export function readPluginConfig(): Record<string, string> {
  try {
    const fullConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    return fullConfig?.plugins?.entries?.['openclaw-openrecord']?.config ?? {};
  } catch {
    return {};
  }
}

/** Overwrite the entire plugin config. */
export function savePluginConfig(config: Record<string, string>) {
  const fullConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  fullConfig.plugins ??= {};
  fullConfig.plugins.entries ??= {};
  fullConfig.plugins.entries['openclaw-openrecord'] ??= {};
  fullConfig.plugins.entries['openclaw-openrecord'].config = config;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(fullConfig, null, 2));
}

/** Update specific fields in the plugin config without overwriting others. */
export function updatePluginConfig(updates: Record<string, string | undefined>) {
  const current = readPluginConfig();
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) {
      delete current[key];
    } else {
      current[key] = value;
    }
  }
  savePluginConfig(current);
}
