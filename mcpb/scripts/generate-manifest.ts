import * as fs from 'fs';
import * as path from 'path';
import { TOOL_DEFINITIONS } from '../../web/src/lib/mcp/tool-definitions';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod/v3';

const manifestPath = path.join(__dirname, '../manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

manifest.manifest_version = '0.3';
manifest.user_config = {};
delete manifest.tools;

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
console.log(`Generated manifest with ${manifest.tools.length} tools.`);
