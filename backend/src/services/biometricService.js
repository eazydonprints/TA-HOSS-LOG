const crypto = require("crypto");

/* =========================================================
   CONFIGURATION
========================================================= */

const getRpName = () => {
  return process.env.WEBAUTHN_RP_NAME || "TA-HOSS LOG";
};

const getRpID = () => {
  return process.env.WEBAUTHN_RP_ID || "localhost";
};

const getOrigin = () => {
  return process.env.WEBAUTHN_ORIGIN || "http://localhost:5173";
};

const CHALLENGE_TTL_MS = Number(process.env.WEBAUTHN_CHALLENGE_TTL_MS) || 5 * 60 * 1000;


/* =========================================================
   ENCRYPTION
========================================================= */

const getEncryptionKey = () => {
  const key = process.env.BIOMETRIC_ENCRYPTION_KEY;

  if (!key) {
    throw new Error("BIOMETRIC_ENCRYPTION_KEY is not configured.");
  }

  if (typeof key !== "string" || !/^[0-9a-fA-F]+$/.test(key) || key.length !== 64) {
    throw new Error("BIOMETRIC_ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes).");
  }

  return Buffer.from(key, "hex");
};


/* =========================================================
   BASE64URL
========================================================= */

const toBase64URL = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    return value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  let buffer;

  if (Buffer.isBuffer(value)) {
    buffer = value;
  } else if (value instanceof ArrayBuffer) {
    buffer = Buffer.from(value);
  } else if (ArrayBuffer.isView(value)) {
    buffer = Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  } else {
    throw new Error("Unsupported value for Base64URL conversion.");
  }

  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const fromBase64URL = (value) => {
  if (!value || typeof value !== "string") {
    throw new Error("A valid Base64URL string is required.");
  }

  let base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const remainder = base64.length % 4;

  if (remainder) {
    base64 += "=".repeat(4 - remainder);
  }

  return Buffer.from(base64, "base64");
};


/* =========================================================
   CHALLENGES
========================================================= */

const generateChallenge = (bytes = 32) => {
  if (!Number.isInteger(bytes) || bytes < 16) {
    throw new Error("Challenge length must be at least 16 bytes.");
  }

  return crypto.randomBytes(bytes).toString("base64url");
};

const hashChallenge = (challenge) => {
  if (!challenge || typeof challenge !== "string") {
    throw new Error("A valid challenge is required.");
  }

  return crypto.createHash("sha256").update(challenge, "utf8").digest("hex");
};

const createChallengeRecord = () => {
  const challenge = generateChallenge(32);
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

  return {
    challenge,
    challengeHash: hashChallenge(challenge),
    expiresAt,
  };
};

const verifyChallenge = ({ challenge, challengeHash, expiresAt }) => {
  if (!challenge || !challengeHash || !expiresAt) {
    return false;
  }

  const expiration = new Date(expiresAt);

  if (Number.isNaN(expiration.getTime()) || expiration.getTime() <= Date.now()) {
    return false;
  }

  let computedHash;

  try {
    computedHash = hashChallenge(challenge);
  } catch {
    return false;
  }

  try {
    const expected = Buffer.from(challengeHash, "hex");
    const actual = Buffer.from(computedHash, "hex");

    if (expected.length === 0 || actual.length === 0 || expected.length !== actual.length) {
      return false;
    }

    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
};


/* =========================================================
   AES-256-GCM ENCRYPTION
========================================================= */

const encryptValue = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const serialized = typeof value === "string" ? value : JSON.stringify(value);

  const encrypted = Buffer.concat([cipher.update(serialized, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("base64url"),
    iv: iv.toString("base64url"),
    authTag: authTag.toString("base64url"),
  };
};

const decryptValue = (encryptedData) => {
  if (!encryptedData || !encryptedData.ciphertext || !encryptedData.iv || !encryptedData.authTag) {
    throw new Error("Invalid encrypted biometric data.");
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(encryptedData.iv, "base64url");
  const authTag = Buffer.from(encryptedData.authTag, "base64url");
  const ciphertext = Buffer.from(encryptedData.ciphertext, "base64url");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
};

const encryptJSON = (value) => encryptValue(JSON.stringify(value));
const decryptJSON = (encryptedData) => JSON.parse(decryptValue(encryptedData));


/* =========================================================
   WEBAUTHN USER ID & CREDENTIAL NORMALIZATION
========================================================= */

const createWebAuthnUserID = (ownerId) => {
  if (!ownerId) {
    throw new Error("Owner ID is required.");
  }

  return new Uint8Array(Buffer.from(String(ownerId), "utf8"));
};

const normalizeCredential = (credential) => {
  if (!credential) {
    throw new Error("Credential data is required.");
  }

  const response = credential.response || {};

  return {
    id: credential.id || null,
    rawId: credential.rawId ? toBase64URL(credential.rawId) : null,
    type: credential.type || "public-key",
    response: {
      clientDataJSON: response.clientDataJSON ? toBase64URL(response.clientDataJSON) : null,
      attestationObject: response.attestationObject ? toBase64URL(response.attestationObject) : null,
      authenticatorData: response.authenticatorData ? toBase64URL(response.authenticatorData) : null,
      signature: response.signature ? toBase64URL(response.signature) : null,
      userHandle: response.userHandle ? toBase64URL(response.userHandle) : null,
      transports: Array.isArray(response.transports) ? response.transports : undefined,
    },
    clientExtensionResults: credential.clientExtensionResults || {},
  };
};

const normalizeVerifiedCredential = (credential = {}, registrationInfo = {}) => {
  const credentialID =
    credential.id ||
    credential.credentialID ||
    registrationInfo.credential?.id ||
    null;

  const credentialPublicKey =
    credential.publicKey ||
    credential.credentialPublicKey ||
    registrationInfo.credential?.publicKey ||
    null;

  const counter = Number(credential.counter ?? registrationInfo.credential?.counter ?? 0);

  const transports = Array.isArray(credential.transports)
    ? credential.transports
    : Array.isArray(registrationInfo.credential?.transports)
    ? registrationInfo.credential.transports
    : [];

  const deviceType = registrationInfo.credentialDeviceType || credential.deviceType || "singleDevice";

  const backedUp =
    registrationInfo.credentialBackedUp !== undefined
      ? Boolean(registrationInfo.credentialBackedUp)
      : Boolean(credential.backedUp);

  if (!credentialID || !credentialPublicKey) {
    throw new Error("Verified credential data is incomplete.");
  }

  return {
    credentialID: typeof credentialID === "string" ? credentialID : toBase64URL(credentialID),
    credentialPublicKey: typeof credentialPublicKey === "string" ? credentialPublicKey : toBase64URL(credentialPublicKey),
    counter,
    transports,
    deviceType,
    backedUp,
  };
};


/* =========================================================
   STORAGE & SERIALIZATION
========================================================= */

const serializeCredentialForStorage = ({
  credentialID,
  credentialPublicKey,
  counter = 0,
  transports = [],
  deviceType = null,
  backedUp = false,
}) => {
  if (!credentialID || !credentialPublicKey) {
    throw new Error("Credential ID and public key are required.");
  }

  return {
    credentialId: toBase64URL(credentialID),
    publicKey: encryptValue(toBase64URL(credentialPublicKey)),
    counter: Number(counter) || 0,
    transports: Array.isArray(transports) ? transports : [],
    deviceType,
    backedUp: Boolean(backedUp),
  };
};

const bufferToUint8Array = (value) => {
  if (!value) return null;
  if (value instanceof Uint8Array) return value;
  if (Buffer.isBuffer(value)) return new Uint8Array(value);
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);

  if (value.buffer && typeof value.byteLength === "number") {
    return new Uint8Array(value.buffer, value.byteOffset || 0, value.byteLength);
  }

  return new Uint8Array(Buffer.from(value));
};

const deserializeCredentialFromStorage = (credential) => {
  if (!credential || !credential.credentialId || !credential.publicKey) {
    throw new Error("Stored credential is incomplete.");
  }

  const decryptedPublicKey = decryptValue(credential.publicKey);
  const publicKeyBuffer = fromBase64URL(decryptedPublicKey);

  return {
    id: credential.credentialId,
    publicKey: bufferToUint8Array(publicKeyBuffer),
    counter: Number(credential.counter || 0),
    transports: Array.isArray(credential.transports) ? credential.transports : [],
  };
};


/* =========================================================
   CREDENTIAL LIST BUILDERS & SANITIZATION
========================================================= */

const buildExcludeCredentials = (credentials = []) => {
  return credentials
    .filter((c) => c && c.credentialId)
    .map((c) => ({
      id: c.credentialId,
      type: "public-key",
      transports: Array.isArray(c.transports) ? c.transports : [],
    }));
};

const buildAllowCredentials = (credentials = []) => {
  return credentials
    .filter((c) => c && c.credentialId)
    .map((c) => ({
      id: c.credentialId,
      type: "public-key",
      transports: Array.isArray(c.transports) ? c.transports : [],
    }));
};

const sanitizeCredential = (credential) => {
  if (!credential) return null;

  return {
    id: credential._id ? String(credential._id) : null,
    credentialId: credential.credentialId || null,
    provider: credential.provider || "webauthn",
    deviceName: credential.deviceName || null,
    deviceType: credential.deviceType || null,
    transports: Array.isArray(credential.transports) ? credential.transports : [],
    backedUp: Boolean(credential.backedUp),
    isActive: credential.isActive !== false,
    enrolledAt: credential.enrolledAt || null,
    createdAt: credential.createdAt || null,
    lastUsedAt: credential.lastUsedAt || null,
  };
};

const createBiometricSummary = ({ biometricEnabled = false, credentials = [], lastUsedAt = null }) => {
  return {
    biometricEnabled: Boolean(biometricEnabled),
    credentialCount: Array.isArray(credentials) ? credentials.length : 0,
    lastUsedAt: lastUsedAt || null,
  };
};

const resolveProvider = ({ authenticatorAttachment, transports = [] } = {}) => {
  if (authenticatorAttachment === "platform") return "platform";
  if (authenticatorAttachment === "cross-platform") return "cross-platform";
  if (Array.isArray(transports) && transports.includes("internal")) return "platform";
  return "webauthn";
};

const getWebAuthnConfig = () => {
  return {
    rpName: getRpName(),
    rpID: getRpID(),
    origin: getOrigin(),
    challengeTTL: CHALLENGE_TTL_MS,
  };
};


/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  getRpName,
  getRpID,
  getOrigin,
  getWebAuthnConfig,
  toBase64URL,
  fromBase64URL,
  generateChallenge,
  hashChallenge,
  createChallengeRecord,
  verifyChallenge,
  encryptValue,
  decryptValue,
  encryptJSON,
  decryptJSON,
  createWebAuthnUserID,
  normalizeCredential,
  normalizeVerifiedCredential,
  serializeCredentialForStorage,
  deserializeCredentialFromStorage,
  buildExcludeCredentials,
  buildAllowCredentials,
  sanitizeCredential,
  createBiometricSummary,
  resolveProvider,
};