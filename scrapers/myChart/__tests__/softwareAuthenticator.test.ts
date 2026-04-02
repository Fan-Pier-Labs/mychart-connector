import { describe, it, expect } from 'bun:test';
import crypto from 'crypto';
import { decode as cborDecode } from 'cbor-x';
import {
  createCredential,
  createAssertion,
  serializeCredential,
  deserializeCredential,
  type MyChartCreationOptions,
  type PasskeyCredential,
} from '../softwareAuthenticator';

const TEST_ORIGIN = 'https://mychart.example.org';
const TEST_HOSTNAME = 'mychart.example.org';

function makeCreationOptions(overrides?: Partial<MyChartCreationOptions>): MyChartCreationOptions {
  return {
    rp: { id: '', name: 'Test MyChart' },
    attestation: 'none',
    authenticatorSelection: {
      requireResidentKey: true,
      residentKey: 'required',
      userVerification: 'preferred',
    },
    challenge: Buffer.from('test-challenge-12345678').toString('base64'),
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },
      { type: 'public-key', alg: -257 },
    ],
    timeout: 60000,
    user: {
      id: Buffer.from('test-user-id').toString('base64'),
      name: 'testuser',
      displayName: 'Test User',
    },
    excludeCredentials: [],
    ...overrides,
  };
}

describe('softwareAuthenticator', () => {
  describe('createCredential', () => {
    it('generates a valid registration response', () => {
      const options = makeCreationOptions();
      const result = createCredential(options, TEST_ORIGIN);

      // Check server response fields exist
      expect(result.serverResponse.rawId).toBeTruthy();
      expect(result.serverResponse.attestationData).toBeTruthy();
      expect(result.serverResponse.clientDataJSON).toBeTruthy();
      expect(result.serverResponse.indexForDefaultName).toBe(0);

      // Check credential fields exist
      expect(result.credential.credentialId).toBe(result.serverResponse.rawId);
      expect(result.credential.privateKey).toBeTruthy();
      expect(result.credential.rpId).toBe(TEST_HOSTNAME);
      expect(result.credential.userHandle).toBe(options.user.id);
      expect(result.credential.signCount).toBe(0);
    });

    it('builds valid clientDataJSON', () => {
      const options = makeCreationOptions();
      const result = createCredential(options, TEST_ORIGIN);

      const clientDataJSON = JSON.parse(
        Buffer.from(result.serverResponse.clientDataJSON, 'base64').toString()
      );

      expect(clientDataJSON.type).toBe('webauthn.create');
      expect(clientDataJSON.challenge).toBe(options.challenge);
      expect(clientDataJSON.origin).toBe(TEST_ORIGIN);
      expect(clientDataJSON.crossOrigin).toBe(false);
    });

    it('builds valid attestationObject with none attestation', () => {
      const options = makeCreationOptions();
      const result = createCredential(options, TEST_ORIGIN);

      const attestationObject = cborDecode(
        Buffer.from(result.serverResponse.attestationData, 'base64')
      );

      expect(attestationObject.fmt).toBe('none');
      expect(attestationObject.attStmt).toEqual({});
      expect(attestationObject.authData).toBeInstanceOf(Uint8Array);

      // Parse authData
      const authData = Buffer.from(attestationObject.authData);

      // First 32 bytes: rpIdHash
      const rpIdHash = authData.subarray(0, 32);
      const expectedRpIdHash = crypto.createHash('sha256').update(TEST_HOSTNAME).digest();
      expect(Buffer.compare(rpIdHash, expectedRpIdHash)).toBe(0);

      // Byte 32: flags (UP + UV + AT = 0x45)
      expect(authData[32]).toBe(0x45);

      // Bytes 33-36: sign counter (0)
      expect(authData.readUInt32BE(33)).toBe(0);

      // Bytes 37-52: aaguid (all zeros)
      const aaguid = authData.subarray(37, 53);
      expect(aaguid.every(b => b === 0)).toBe(true);

      // Bytes 53-54: credential ID length
      const credIdLen = authData.readUInt16BE(53);
      expect(credIdLen).toBe(32); // we generate 32-byte credential IDs

      // Bytes 55-(55+credIdLen): credential ID
      const credId = authData.subarray(55, 55 + credIdLen);
      expect(Buffer.from(credId).toString('base64')).toBe(result.credential.credentialId);

      // Remaining bytes: COSE public key
      const coseKeyBytes = authData.subarray(55 + credIdLen);
      const coseKey = cborDecode(coseKeyBytes);
      // cbor-x may decode integer-keyed maps as Maps or plain objects
      const getKey = (k: number) => coseKey instanceof Map ? coseKey.get(k) : coseKey[k];
      expect(getKey(1)).toBe(2);   // kty: EC2
      expect(getKey(3)).toBe(-7);  // alg: ES256
      expect(getKey(-1)).toBe(1);  // crv: P-256
      expect(getKey(-2).length).toBe(32); // x coordinate
      expect(getKey(-3).length).toBe(32); // y coordinate
    });

    it('uses explicit rpId when provided', () => {
      const options = makeCreationOptions({
        rp: { id: 'custom.example.org', name: 'Custom' },
      });
      const result = createCredential(options, TEST_ORIGIN);
      expect(result.credential.rpId).toBe('custom.example.org');
    });

    it('generates unique credentials on each call', () => {
      const options = makeCreationOptions();
      const result1 = createCredential(options, TEST_ORIGIN);
      const result2 = createCredential(options, TEST_ORIGIN);

      expect(result1.credential.credentialId).not.toBe(result2.credential.credentialId);
      expect(result1.credential.privateKey).not.toBe(result2.credential.privateKey);
    });

    it('passes custom indexForDefaultName', () => {
      const options = makeCreationOptions();
      const result = createCredential(options, TEST_ORIGIN, 5);
      expect(result.serverResponse.indexForDefaultName).toBe(5);
    });
  });

  describe('createAssertion', () => {
    let credential: PasskeyCredential;

    // Create a credential to use for assertion tests
    function setupCredential(): PasskeyCredential {
      const options = makeCreationOptions();
      const result = createCredential(options, TEST_ORIGIN);
      return result.credential;
    }

    it('builds valid assertion response', () => {
      credential = setupCredential();
      const challenge = Buffer.from('auth-challenge-98765432').toString('base64');
      const result = createAssertion(credential, challenge, TEST_ORIGIN);

      // id is base64url, rawId is standard base64
      const expectedId = Buffer.from(credential.credentialId, 'base64').toString('base64url');
      expect(result.id).toBe(expectedId);
      expect(result.type).toBe('public-key');
      expect(result.rawId).toBe(credential.credentialId);
      expect(result.authenticatorAssertion.clientDataJSON).toBeTruthy();
      expect(result.authenticatorAssertion.authenticatorData).toBeTruthy();
      expect(result.authenticatorAssertion.signature).toBeTruthy();
      expect(result.authenticatorAssertion.userHandle).toBe(credential.userHandle);
    });

    it('builds valid clientDataJSON for get', () => {
      credential = setupCredential();
      const challenge = Buffer.from('auth-challenge-98765432').toString('base64');
      const result = createAssertion(credential, challenge, TEST_ORIGIN);

      const clientDataJSON = JSON.parse(
        Buffer.from(result.authenticatorAssertion.clientDataJSON, 'base64').toString()
      );

      expect(clientDataJSON.type).toBe('webauthn.get');
      expect(clientDataJSON.challenge).toBe(challenge);
      expect(clientDataJSON.origin).toBe(TEST_ORIGIN);
    });

    it('builds valid authenticatorData for get', () => {
      credential = setupCredential();
      const challenge = Buffer.from('auth-challenge-98765432').toString('base64');
      const result = createAssertion(credential, challenge, TEST_ORIGIN);

      const authData = Buffer.from(result.authenticatorAssertion.authenticatorData, 'base64');

      // Should be exactly 37 bytes (32 rpIdHash + 1 flags + 4 counter)
      expect(authData.length).toBe(37);

      // rpIdHash
      const rpIdHash = authData.subarray(0, 32);
      const expectedRpIdHash = crypto.createHash('sha256').update(TEST_HOSTNAME).digest();
      expect(Buffer.compare(rpIdHash, expectedRpIdHash)).toBe(0);

      // flags: UP + UV = 0x05
      expect(authData[32]).toBe(0x05);

      // counter: 1 (incremented from 0)
      expect(authData.readUInt32BE(33)).toBe(1);
    });

    it('produces a valid ECDSA signature', () => {
      credential = setupCredential();
      const challenge = Buffer.from('auth-challenge-98765432').toString('base64');
      const result = createAssertion(credential, challenge, TEST_ORIGIN);

      // Reconstruct the signed data: authenticatorData || SHA-256(clientDataJSON)
      const authData = Buffer.from(result.authenticatorAssertion.authenticatorData, 'base64');
      const clientDataJSON = Buffer.from(result.authenticatorAssertion.clientDataJSON, 'base64');
      const clientDataHash = crypto.createHash('sha256').update(clientDataJSON).digest();
      const signatureBase = Buffer.concat([authData, clientDataHash]);

      // Import the public key from the credential's private key
      const privateKeyObj = crypto.createPrivateKey({
        key: Buffer.from(credential.privateKey, 'base64'),
        format: 'der',
        type: 'pkcs8',
      });
      const publicKeyObj = crypto.createPublicKey(privateKeyObj);

      // Verify the signature
      const signature = Buffer.from(result.authenticatorAssertion.signature, 'base64');
      const isValid = crypto.verify('SHA256', signatureBase, publicKeyObj, signature);
      expect(isValid).toBe(true);
    });

    it('increments sign counter on each assertion', () => {
      credential = setupCredential();
      expect(credential.signCount).toBe(0);

      const challenge = Buffer.from('challenge-1').toString('base64');
      createAssertion(credential, challenge, TEST_ORIGIN);
      expect(credential.signCount).toBe(1);

      createAssertion(credential, challenge, TEST_ORIGIN);
      expect(credential.signCount).toBe(2);

      createAssertion(credential, challenge, TEST_ORIGIN);
      expect(credential.signCount).toBe(3);
    });
  });

  describe('serialization', () => {
    it('round-trips credential through serialize/deserialize', () => {
      const options = makeCreationOptions();
      const result = createCredential(options, TEST_ORIGIN);
      const original = result.credential;

      const json = serializeCredential(original);
      const restored = deserializeCredential(json);

      expect(restored.credentialId).toBe(original.credentialId);
      expect(restored.privateKey).toBe(original.privateKey);
      expect(restored.rpId).toBe(original.rpId);
      expect(restored.userHandle).toBe(original.userHandle);
      expect(restored.signCount).toBe(original.signCount);
    });

    it('deserialized credential can create valid assertions', () => {
      const options = makeCreationOptions();
      const result = createCredential(options, TEST_ORIGIN);

      // Serialize and deserialize
      const json = serializeCredential(result.credential);
      const restored = deserializeCredential(json);

      // Create assertion with deserialized credential
      const challenge = Buffer.from('post-restore-challenge').toString('base64');
      const assertion = createAssertion(restored, challenge, TEST_ORIGIN);

      // Verify signature is valid
      const authData = Buffer.from(assertion.authenticatorAssertion.authenticatorData, 'base64');
      const clientDataJSON = Buffer.from(assertion.authenticatorAssertion.clientDataJSON, 'base64');
      const clientDataHash = crypto.createHash('sha256').update(clientDataJSON).digest();
      const signatureBase = Buffer.concat([authData, clientDataHash]);

      const privateKeyObj = crypto.createPrivateKey({
        key: Buffer.from(restored.privateKey, 'base64'),
        format: 'der',
        type: 'pkcs8',
      });
      const publicKeyObj = crypto.createPublicKey(privateKeyObj);
      const signature = Buffer.from(assertion.authenticatorAssertion.signature, 'base64');
      const isValid = crypto.verify('SHA256', signatureBase, publicKeyObj, signature);
      expect(isValid).toBe(true);
    });
  });
});
