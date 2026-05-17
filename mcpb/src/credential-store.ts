import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const DATA_DIR = process.env.OPENRECORD_DATA_DIR
  ? path.resolve(process.env.OPENRECORD_DATA_DIR)
  : path.join(os.homedir(), '.openrecord-mcpb');

const INSTANCES_DIR = path.join(DATA_DIR, 'instances');
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');

export interface DiskInstance {
  hostname: string;
  username: string;
  password?: string;
  totpSecret?: string | null;
  passkeyCredential?: string | null;
  enabled: boolean;
}

export async function ensureDirs() {
  await fs.promises.mkdir(INSTANCES_DIR, { recursive: true });
  await fs.promises.mkdir(SESSIONS_DIR, { recursive: true });
}

function getInstancePath(hostname: string, username: string): string {
  // Use a safe filename for hostname:username
  const safeName = `${hostname}_${username}`.replace(/[^a-z0-9.]/gi, '_');
  return path.join(INSTANCES_DIR, `${safeName}.json`);
}

export async function saveInstance(instance: DiskInstance): Promise<void> {
  if (!instance) throw new Error('Cannot save undefined instance');
  await ensureDirs();
  const filePath = getInstancePath(instance.hostname, instance.username);
  await fs.promises.writeFile(filePath, JSON.stringify(instance, null, 2), 'utf-8');
}

export async function loadInstances(): Promise<DiskInstance[]> {
  await ensureDirs();
  try {
    const files = await fs.promises.readdir(INSTANCES_DIR);
    const instances: DiskInstance[] = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.promises.readFile(path.join(INSTANCES_DIR, file), 'utf-8');
        instances.push(JSON.parse(content));
      }
    }
    return instances;
  } catch {
    return [];
  }
}

export async function loadInstance(hostname: string, username: string): Promise<DiskInstance | null> {
  try {
    const content = await fs.promises.readFile(getInstancePath(hostname, username), 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function deleteInstance(hostname: string, username: string): Promise<void> {
  try {
    await fs.promises.unlink(getInstancePath(hostname, username));
  } catch {
    // Ignore if file doesn't exist
  }
}

// Session store for MyChartRequest cookies
export async function saveSession(hostname: string, username: string, cookies: string[]): Promise<void> {
  if (!cookies) {
    console.error(`[credential-store] Refusing to save undefined cookies for ${hostname}`);
    return;
  }
  await ensureDirs();
  const safeName = `${hostname}_${username}`.replace(/[^a-z0-9.]/gi, '_');
  const filePath = path.join(SESSIONS_DIR, `${safeName}.json`);
  await fs.promises.writeFile(filePath, JSON.stringify(cookies), 'utf-8');
}

export async function loadSession(hostname: string, username: string): Promise<string[] | null> {
  try {
    const safeName = `${hostname}_${username}`.replace(/[^a-z0-9.]/gi, '_');
    const filePath = path.join(SESSIONS_DIR, `${safeName}.json`);
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function deleteSession(hostname: string, username: string): Promise<void> {
  try {
    const safeName = `${hostname}_${username}`.replace(/[^a-z0-9.]/gi, '_');
    const filePath = path.join(SESSIONS_DIR, `${safeName}.json`);
    await fs.promises.unlink(filePath);
  } catch {
    // Ignore if file doesn't exist
  }
}
