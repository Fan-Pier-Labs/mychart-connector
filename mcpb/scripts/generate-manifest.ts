import * as fs from 'fs';
import * as path from 'path';

const manifestPath = path.join(__dirname, '../manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

manifest.manifest_version = '0.3';
manifest.user_config = {};
delete manifest.tools;

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
console.log('Updated manifest version and cleaned up tools.');
