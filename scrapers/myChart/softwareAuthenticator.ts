import crypto from 'crypto';

/**
 * Serialized passkey credential for storage.
 * Contains everything needed to authenticate with a MyChart account via WebAuthn.
 */
export interface PasskeyCredential {
  /** Base64-encoded credential ID (raw bytes) */
  credentialId: string;
  /** Base64-encoded ECDSA P-256 private key (DER/PKCS8 format) */
  privateKey: string;
  /** The relying party ID used during registration */
  rpId: string;
  /** Base64-encoded user handle from registration */
  userHandle: string;
  /** Sign counter (incremented on each use) */
  signCount: number;
}

/**
 * Result of creating a new passkey credential.
 * Contains the server-bound response fields AND the credential for local storage.
 */
export interface RegistrationResult {
  /** Data to send to MyChart's CreatePasskey API */
  serverResponse: {
    rawId: string;
    attestationData: string;
    clientDataJSON: string;
    indexForDefaultName: number;
  };
  /** Credential to store locally for future authentication */
  credential: PasskeyCredential;
}

/**
 * Result of authenticating with a passkey credential.
 * Contains the fields to send in the DoLogin request.
 */
export interface AuthenticationResult {
  id: string;
  type: 'public-key';
  rawId: string;
  authenticatorAssertion: {
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
    userHandle: string;
  };
}

/**
 * WebAuthn creation options as returned by MyChart's GenerateCreateRequest API.
 */
export interface MyChartCreationOptions {
  rp: { id: string; name: string };
  attestation: string;
  authenticatorSelection: {
    requireResidentKey: boolean;
    residentKey: string;
    userVerification: string;
  };
  challenge: string; // base64
  pubKeyCredParams: Array<{ type: string; alg: number }>;
  timeout: number;
  user: { id: string; name: string; displayName: string };
  excludeCredentials: Array<{ id: string; type: string }>;
}

/**
 * WebAuthn get options as returned by MyChart's GetPasskeyGetParams API.
 */
export interface MyChartGetOptions {
  Challenge: string; // base64
  Attestation: string;
  Timeout: number;
  UserVerification: string;
  RpId: string;
}

// ─── Minimal CBOR encoder ───
// Only handles the types needed for WebAuthn: maps, text strings, byte strings, integers.
// Uses compact encoding (1-byte lengths for small values).

function cborEncodeUint(majorType: number, value: number): Buffer {
  const mt = majorType << 5;
  if (value < 24) return Buffer.from([mt | value]);
  if (value < 256) return Buffer.from([mt | 24, value]);
  if (value < 65536) { const b = Buffer.alloc(3); b[0] = mt | 25; b.writeUInt16BE(value, 1); return b; }
  const b = Buffer.alloc(5); b[0] = mt | 26; b.writeUInt32BE(value, 1); return b;
}

function cborEncodeNegInt(value: number): Buffer {
  // CBOR negative: major type 1, value = -1 - n
  return cborEncodeUint(1, -1 - value);
}

function cborEncodeTextString(str: string): Buffer {
  const strBuf = Buffer.from(str, 'utf-8');
  return Buffer.concat([cborEncodeUint(3, strBuf.length), strBuf]);
}

function cborEncodeByteString(buf: Buffer | Uint8Array): Buffer {
  return Buffer.concat([cborEncodeUint(2, buf.length), Buffer.from(buf)]);
}

function cborEncodeMap(entries: Array<{ key: number | string; value: Buffer }>): Buffer {
  const header = cborEncodeUint(5, entries.length);
  const parts = [header];
  for (const { key, value } of entries) {
    if (typeof key === 'number') {
      parts.push(key >= 0 ? cborEncodeUint(0, key) : cborEncodeNegInt(key));
    } else {
      parts.push(cborEncodeTextString(key));
    }
    parts.push(value);
  }
  return Buffer.concat(parts);
}

/**
 * CBOR-encode a COSE public key Map (integer keys).
 */
function cborEncodeCoseKey(entries: Map<number, number | Buffer>): Buffer {
  const mapEntries: Array<{ key: number; value: Buffer }> = [];
  for (const [key, value] of entries) {
    let encodedValue: Buffer;
    if (typeof value === 'number') {
      encodedValue = value >= 0 ? cborEncodeUint(0, value) : cborEncodeNegInt(value);
    } else {
      encodedValue = cborEncodeByteString(value);
    }
    mapEntries.push({ key, value: encodedValue });
  }
  return cborEncodeMap(mapEntries);
}

/**
 * CBOR-encode the attestation object: { fmt: "none", attStmt: {}, authData: <bytes> }
 */
function cborEncodeAttestationObject(authData: Buffer): Buffer {
  return cborEncodeMap([
    { key: 'fmt', value: cborEncodeTextString('none') },
    { key: 'attStmt', value: cborEncodeMap([]) }, // empty map
    { key: 'authData', value: cborEncodeByteString(authData) },
  ]);
}

/**
 * Convert a standard base64 string to a Buffer.
 * MyChart uses standard base64 (btoa/atob), not base64url.
 */
function base64ToBuffer(b64: string): Buffer {
  return Buffer.from(b64, 'base64');
}

/**
 * Convert a Buffer to standard base64 string.
 */
function bufferToBase64(buf: Buffer | Uint8Array): string {
  return Buffer.from(buf).toString('base64');
}

/**
 * Build the COSE-encoded public key for an ECDSA P-256 key.
 * COSE key format for EC2 (RFC 8152):
 *   1 (kty): 2 (EC2)
 *   3 (alg): -7 (ES256)
 *  -1 (crv): 1 (P-256)
 *  -2 (x): 32-byte x coordinate
 *  -3 (y): 32-byte y coordinate
 */
function buildCosePublicKey(publicKeyDer: Buffer): Buffer {
  // Extract raw x,y coordinates from the uncompressed public key point (04 || x || y)
  const rawPubKey = extractRawPublicKey(publicKeyDer);
  const x = rawPubKey.subarray(1, 33); // skip 0x04 prefix
  const y = rawPubKey.subarray(33, 65);

  // CBOR-encode the COSE key map
  const coseKey = new Map<number, number | Buffer>();
  coseKey.set(1, 2);   // kty: EC2
  coseKey.set(3, -7);  // alg: ES256
  coseKey.set(-1, 1);  // crv: P-256
  coseKey.set(-2, x);  // x coordinate
  coseKey.set(-3, y);  // y coordinate

  return cborEncodeCoseKey(coseKey);
}

/**
 * Extract the raw uncompressed public key (65 bytes: 04 || x || y) from a DER-encoded SPKI public key.
 */
function extractRawPublicKey(spkiDer: Buffer): Buffer {
  // The uncompressed point is at the end of the SPKI structure.
  // For P-256, it's always 65 bytes (0x04 + 32 bytes x + 32 bytes y).
  // Find the 0x04 byte that starts the uncompressed point.
  // In SPKI format, it's preceded by a BIT STRING tag with a 0x00 unused-bits byte.
  for (let i = spkiDer.length - 65; i >= 0; i--) {
    if (spkiDer[i] === 0x04 && spkiDer.length - i >= 65) {
      return spkiDer.subarray(i, i + 65);
    }
  }
  throw new Error('Could not extract raw public key from SPKI DER');
}

/**
 * Build the authenticatorData for a registration (create) operation.
 *
 * Format (variable length):
 *   rpIdHash (32 bytes) || flags (1 byte) || signCount (4 bytes) || attestedCredentialData
 *
 * attestedCredentialData:
 *   aaguid (16 bytes) || credIdLen (2 bytes) || credentialId || credentialPublicKey (COSE)
 *
 * Flags: UP (0x01) | UV (0x04) | AT (0x40) = 0x45
 */
function buildAuthDataForCreate(
  rpId: string,
  credentialId: Buffer,
  publicKeyDer: Buffer,
  signCount: number,
): Buffer {
  const rpIdHash = crypto.createHash('sha256').update(rpId).digest();
  const flags = Buffer.from([0x45]); // UP + UV + AT
  const counter = Buffer.alloc(4);
  counter.writeUInt32BE(signCount);

  // Attested credential data
  const aaguid = Buffer.alloc(16); // all zeros for software authenticator
  const credIdLen = Buffer.alloc(2);
  credIdLen.writeUInt16BE(credentialId.length);
  const cosePublicKey = buildCosePublicKey(publicKeyDer);

  return Buffer.concat([rpIdHash, flags, counter, aaguid, credIdLen, credentialId, cosePublicKey]);
}

/**
 * Build the authenticatorData for an authentication (get) operation.
 *
 * Format:
 *   rpIdHash (32 bytes) || flags (1 byte) || signCount (4 bytes)
 *
 * Flags: UP (0x01) | UV (0x04) = 0x05
 */
function buildAuthDataForGet(rpId: string, signCount: number): Buffer {
  const rpIdHash = crypto.createHash('sha256').update(rpId).digest();
  const flags = Buffer.from([0x05]); // UP + UV
  const counter = Buffer.alloc(4);
  counter.writeUInt32BE(signCount);

  return Buffer.concat([rpIdHash, flags, counter]);
}

/**
 * Build the clientDataJSON for a WebAuthn operation.
 * This is a JSON object that gets base64-encoded.
 *
 * MyChart uses standard base64 (btoa), not base64url.
 */
function buildClientDataJSON(
  type: 'webauthn.create' | 'webauthn.get',
  challenge: string, // base64 from server
  origin: string,
): Buffer {
  // WebAuthn spec: challenge in clientDataJSON must be base64url-encoded.
  // The server sends it as standard base64, so convert: decode → re-encode as base64url.
  const challengeBase64url = Buffer.from(challenge, 'base64').toString('base64url');
  const clientData = {
    type,
    challenge: challengeBase64url,
    origin,
    crossOrigin: false,
  };
  return Buffer.from(JSON.stringify(clientData));
}

/**
 * Create a new passkey credential for registration with a MyChart account.
 *
 * This replaces what the browser's `navigator.credentials.create()` does:
 * 1. Generates an ECDSA P-256 key pair
 * 2. Builds the clientDataJSON
 * 3. Builds the attestationObject with "none" attestation
 * 4. Returns both the server response and the credential for local storage
 */
export function createCredential(
  options: MyChartCreationOptions,
  origin: string,
  indexForDefaultName: number = 0,
): RegistrationResult {
  // Generate ECDSA P-256 key pair
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'P-256',
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
  });

  // Generate a random credential ID (32 bytes)
  const credentialId = crypto.randomBytes(32);

  // Determine the RP ID: empty string in MyChart means use the origin's hostname
  const rpId = options.rp.id || new URL(origin).hostname;

  // Build clientDataJSON
  const clientDataJSON = buildClientDataJSON('webauthn.create', options.challenge, origin);

  // Build authenticator data with attested credential data
  const authData = buildAuthDataForCreate(rpId, credentialId, publicKey as unknown as Buffer, 0);

  // Build attestation object (CBOR-encoded) with "none" format
  const attestationObject = cborEncodeAttestationObject(authData);

  return {
    serverResponse: {
      rawId: bufferToBase64(credentialId),
      attestationData: bufferToBase64(attestationObject),
      clientDataJSON: bufferToBase64(clientDataJSON),
      indexForDefaultName,
    },
    credential: {
      credentialId: bufferToBase64(credentialId),
      privateKey: bufferToBase64(privateKey as unknown as Buffer),
      rpId,
      userHandle: options.user.id,
      signCount: 0,
    },
  };
}

/**
 * Authenticate with a stored passkey credential.
 *
 * This replaces what the browser's `navigator.credentials.get()` does:
 * 1. Builds the clientDataJSON
 * 2. Builds the authenticatorData
 * 3. Signs (authenticatorData || SHA-256(clientDataJSON)) with the private key
 * 4. Returns the assertion response for the DoLogin request
 */
export function createAssertion(
  credential: PasskeyCredential,
  challenge: string, // base64 from server
  origin: string,
): AuthenticationResult {
  // Increment sign counter
  credential.signCount++;

  // Build clientDataJSON
  const clientDataJSON = buildClientDataJSON('webauthn.get', challenge, origin);

  // Build authenticator data (no attested credential data for get)
  const authData = buildAuthDataForGet(credential.rpId, credential.signCount);

  // Sign: authenticatorData || SHA-256(clientDataJSON)
  const clientDataHash = crypto.createHash('sha256').update(clientDataJSON).digest();
  const signatureBase = Buffer.concat([authData, clientDataHash]);

  // Import the private key and sign
  const privateKeyObj = crypto.createPrivateKey({
    key: base64ToBuffer(credential.privateKey),
    format: 'der',
    type: 'pkcs8',
  });

  // ECDSA signature in DER format (which is what WebAuthn expects)
  const signature = crypto.sign('SHA256', signatureBase, privateKeyObj);

  // The browser's PublicKeyCredential.id is base64url-encoded,
  // while rawId is standard base64 (btoa of the ArrayBuffer bytes).
  const credIdBuffer = base64ToBuffer(credential.credentialId);
  const idBase64url = credIdBuffer.toString('base64url');

  return {
    id: idBase64url,
    type: 'public-key',
    rawId: credential.credentialId,
    authenticatorAssertion: {
      clientDataJSON: bufferToBase64(clientDataJSON),
      authenticatorData: bufferToBase64(authData),
      signature: bufferToBase64(signature),
      userHandle: credential.userHandle,
    },
  };
}

/**
 * Serialize a passkey credential to a JSON string for storage.
 */
export function serializeCredential(credential: PasskeyCredential): string {
  return JSON.stringify(credential);
}

/**
 * Deserialize a passkey credential from a JSON string.
 */
export function deserializeCredential(json: string): PasskeyCredential {
  return JSON.parse(json) as PasskeyCredential;
}
