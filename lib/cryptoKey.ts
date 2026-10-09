/**
 * Web Crypto API AES-GCM 256-bit encryption for securing BYOK API keys at rest in local storage.
 */

const SALT = new Uint8Array([87, 104, 97, 116, 115, 85, 112, 65, 117, 100, 105, 116, 75, 101, 121, 33]); // Static salt for device-bound derivation

async function getDeviceKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  // Device-derived pseudo-secret combining browser platform characteristics
  const deviceFingerprint = `${navigator.userAgent}_${screen.width}x${screen.height}_whatsup_v2`;
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(deviceFingerprint),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
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

/**
 * Encrypts an API key string using AES-GCM.
 */
export async function encryptApiKey(plaintext: string): Promise<string> {
  if (!plaintext) return "";
  try {
    const key = await getDeviceKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      enc.encode(plaintext)
    );

    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    // Return as Base64 string
    let binary = "";
    for (let i = 0; i < combined.length; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return btoa(binary);
  } catch (err) {
    console.warn("Web Crypto encryption fallback:", err);
    return plaintext;
  }
}

/**
 * Decrypts a stored ciphertext into plaintext API key using AES-GCM.
 */
export async function decryptApiKey(encryptedBase64: string): Promise<string> {
  if (!encryptedBase64) return "";
  try {
    const binary = atob(encryptedBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const iv = bytes.slice(0, 12);
    const ciphertext = bytes.slice(12);

    const key = await getDeviceKey();
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch {
    // If decryption fails (e.g. legacy plain key), return as-is
    return encryptedBase64;
  }
}
