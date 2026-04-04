import * as fs from 'fs';
import * as path from 'path';
import { serializeCredential, deserializeCredential, type PasskeyCredential } from '../scrapers/myChart/softwareAuthenticator';

const PASSKEY_DIR = path.join(__dirname, '..', '.passkey-credentials');

function getCredentialPath(hostname: string): string {
  return path.join(PASSKEY_DIR, `${hostname}.json`);
}

export async function savePasskeyCredential(hostname: string, credential: PasskeyCredential): Promise<void> {
  await fs.promises.mkdir(PASSKEY_DIR, { recursive: true });
  await fs.promises.writeFile(getCredentialPath(hostname), serializeCredential(credential), 'utf-8');
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
