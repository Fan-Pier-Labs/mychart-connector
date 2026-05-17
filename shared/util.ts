/*
 * Utility function to change the current working directory upward until a package.json file is found.
 * If no package.json file is found in any parent directories, an error is thrown.
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

/**
 * Change directory to the nearest ancestor directory containing a package.json file.
 * @throws {Error} if no package.json is found in any parent directory.
 */
export function changeDirToPackageRoot(): void {
  let currentDir = process.cwd();

  while (!fs.existsSync(path.join(currentDir, 'package.json'))) {
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      logger.debug('package.json not found in any parent directory.');
      return;
    }
    currentDir = parentDir;
  }
  process.chdir(currentDir);
}

// For testing purposes, you can call the function if this file is run directly.
if (import.meta.main) {
  try {
    logger.debug('Current directory before change:', process.cwd());
    changeDirToPackageRoot();
    logger.debug('Changed directory to:', process.cwd());
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
}
