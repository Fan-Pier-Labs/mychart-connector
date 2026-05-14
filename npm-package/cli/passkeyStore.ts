import * as fs from 'fs';
import * as path from 'path';
import { serializeCredential, deserializeCredential, type PasskeyCredential } from '../../scrapers/myChart/softwareAuthenticator';

// Stored relative to the user's current working directory so credentials
// live in the user's project, not inside node_modules (which gets nuked
// on reinstall). Override with `MYCHART_PASSKEY_DIR=/abs/path` if needed.
const PASSKEY_DIR = process.env.MYCHART_PASSKEY_DIR
  ? path.resolve(process.env.MYCHART_PASSKEY_DIR)
  : path.join(process.cwd(), '.passkey-credentials');

function getCredentialPath(hostname: string): string {
  return path.join(PASSKEY_DIR, `${hostname}.json`);
}

export async function savePasskeyCredential(hostname: string, credential: PasskeyCredential): Promise<void> {
  await fs.promises.mkdir(PASSKEY_DIR, { recursive: true });
  const basePath = getCredentialPath(hostname);

  // Never overwrite an existing credential — archive it first
  try {
    await fs.promises.access(basePath);
    // File exists — rename to hostname.TIMESTAMP.json
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const archivePath = path.join(PASSKEY_DIR, `${hostname}.${ts}.json`);
    await fs.promises.rename(basePath, archivePath);
    console.log(`  Archived previous passkey to ${hostname}.${ts}.json`);
  } catch {
    // No existing file — nothing to archive
  }

  await fs.promises.writeFile(basePath, serializeCredential(credential), 'utf-8');
  console.log(`  Passkey credential saved to .passkey-credentials/${hostname}.json`);
}

export async function loadPasskeyCredential(hostname: string): Promise<PasskeyCredential | null> {
  try {
    const json = await fs.promises.readFile(getCredentialPath(hostname), 'utf-8');
    return deserializeCredential(json.trim());
  } catch {
    return null;
  }
}
