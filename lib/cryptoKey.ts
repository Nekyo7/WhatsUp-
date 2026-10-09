/**
 * Web Crypto API AES-GCM 256-bit encryption for securing BYOK API keys at rest in local storage.
 */

const SALT = new Uint8Array([87, 104, 97, 116, 115, 85, 112, 65, 117, 100, 105, 116, 75, 101, 121, 33]); // Static salt for device-bound derivation
export const ENC_PREFIX = "enc_v1:";

function getSubtleCrypto(): SubtleCrypto {
  const c = typeof crypto !== "undefined" ? crypto : (globalThis as any).crypto;
  if (!c || !c.subtle) {
    throw new Error("Web Crypto API (SubtleCrypto) is not available in this environment.");
  }
  return c.subtle;
}

function getRandomValues(arr: Uint8Array): Uint8Array {
  const c = typeof crypto !== "undefined" ? crypto : (globalThis as any).crypto;
  return c.getRandomValues(arr);
}

async function getDeviceKey(): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const enc = new TextEncoder();

  const userAgent = typeof navigator !== "undefined" && navigator.userAgent ? navigator.userAgent : "node_environment";
  const screenResolution = typeof screen !== "undefined" ? `${screen.width}x${screen.height}` : "default_display";
  const deviceFingerprint = `${userAgent}_${screenResolution}_whatsup_v2`;

  const keyMaterial = await subtle.importKey(
    "raw",
    enc.encode(deviceFingerprint),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: SALT,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function bufferToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encrypts an API key string using AES-GCM 256-bit.
 * Prepends the "enc_v1:" tag to indicate encrypted storage.
 * Fails closed if Web Crypto is unavailable.
 */
export async function encryptApiKey(plaintext: string): Promise<string> {
  if (!plaintext) return "";
  const subtle = getSubtleCrypto();
  const key = await getDeviceKey();
  const iv = getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();

  const ciphertext = await subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    enc.encode(plaintext)
  );

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return `${ENC_PREFIX}${bufferToBase64(combined)}`;
}

/**
 * Decrypts a stored ciphertext into plaintext API key using AES-GCM.
 * Seamlessly handles legacy unencrypted keys if present.
 */
export async function decryptApiKey(storedValue: string): Promise<string> {
  if (!storedValue) return "";

  // If not encrypted with v1 prefix, treat as legacy plaintext key
  if (!storedValue.startsWith(ENC_PREFIX)) {
    return storedValue;
  }

  const rawBase64 = storedValue.slice(ENC_PREFIX.length);
  const bytes = base64ToBuffer(rawBase64);
  if (bytes.length <= 12) {
    throw new Error("Ciphertext too short to contain valid AES-GCM IV");
  }

  const iv = bytes.slice(0, 12);
  const ciphertext = bytes.slice(12);

  const subtle = getSubtleCrypto();
  const key = await getDeviceKey();
  const decrypted = await subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    ciphertext as BufferSource
  );

  const dec = new TextDecoder();
  return dec.decode(decrypted);
}

/**
 * Persists an API key and provider either to device-bound encrypted localStorage
 * or to session-only sessionStorage.
 */
export async function saveStoredApiKey(
  apiKey: string,
  provider: string,
  storageType: "device" | "session" = "device"
): Promise<void> {
  if (typeof window === "undefined") return;

  const trimmed = apiKey.trim();
  if (!trimmed || provider === "local") {
    clearStoredApiKey();
    localStorage.setItem("whatsup_custom_provider", "local");
    return;
  }

  if (storageType === "session") {
    sessionStorage.setItem("whatsup_custom_api_key_session", trimmed);
    sessionStorage.setItem("whatsup_custom_provider", provider);
    localStorage.removeItem("whatsup_custom_api_key");
    localStorage.removeItem("whatsup_custom_provider");
    localStorage.setItem("whatsup_storage_mode", "session");
  } else {
    const encrypted = await encryptApiKey(trimmed);
    localStorage.setItem("whatsup_custom_api_key", encrypted);
    localStorage.setItem("whatsup_custom_provider", provider);
    localStorage.setItem("whatsup_storage_mode", "device");
    sessionStorage.removeItem("whatsup_custom_api_key_session");
    sessionStorage.removeItem("whatsup_custom_provider");
  }
}

/**
 * Retrieves the currently active plaintext API key (decrypting from localStorage
 * or loading directly from sessionStorage).
 */
export async function getStoredApiKey(): Promise<string> {
  if (typeof window === "undefined") return "";

  // 1. Check session storage first
  const sessionKey = sessionStorage.getItem("whatsup_custom_api_key_session");
  if (sessionKey) return sessionKey;

  // 2. Check device storage
  const stored = localStorage.getItem("whatsup_custom_api_key");
  if (!stored) return "";

  try {
    return await decryptApiKey(stored);
  } catch (err) {
    console.error("Failed to decrypt stored API key:", err);
    return "";
  }
}

/**
 * Retrieves the currently active AI provider.
 */
export function getStoredProvider(): string {
  if (typeof window === "undefined") return "local";

  const sessionProvider = sessionStorage.getItem("whatsup_custom_provider");
  if (sessionProvider) return sessionProvider;

  const localProvider = localStorage.getItem("whatsup_custom_provider");
  return localProvider || "local";
}

/**
 * Returns the current storage mode ("device", "session", or "none")
 */
export function getStorageMode(): "device" | "session" | "none" {
  if (typeof window === "undefined") return "none";
  if (sessionStorage.getItem("whatsup_custom_api_key_session")) return "session";
  if (localStorage.getItem("whatsup_custom_api_key")) return "device";
  return "none";
}

/**
 * Clears stored API keys from both local and session storage.
 */
export function clearStoredApiKey(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("whatsup_custom_api_key");
  localStorage.removeItem("whatsup_custom_provider");
  localStorage.removeItem("whatsup_storage_mode");
  sessionStorage.removeItem("whatsup_custom_api_key_session");
  sessionStorage.removeItem("whatsup_custom_provider");
}
