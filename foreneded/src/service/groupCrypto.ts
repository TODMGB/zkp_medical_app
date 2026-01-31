function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (normalized.length % 2 !== 0) {
    throw new Error('hex 长度非法');
  }
  const buffer = new ArrayBuffer(normalized.length / 2);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export function randomHex(byteLength = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return bytesToHex(bytes);
}

export async function aesGcmEncryptHexKey(plaintext: string, keyHex: string): Promise<string> {
  const keyBytes = hexToBytes(keyHex);
  if (keyBytes.length !== 32) {
    throw new Error('AES-GCM key 必须为 32 bytes');
  }

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(keyBytes),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const encodedText = new TextEncoder().encode(plaintext);
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
      tagLength: 128,
    },
    key,
    toArrayBuffer(encodedText)
  );

  const ivHex = bytesToHex(iv);
  const encryptedHex = bytesToHex(new Uint8Array(encryptedBuffer));
  return ivHex + encryptedHex;
}

export async function aesGcmDecryptHexKey(encryptedData: string, keyHex: string): Promise<string> {
  const keyBytes = hexToBytes(keyHex);
  if (keyBytes.length !== 32) {
    throw new Error('AES-GCM key 必须为 32 bytes');
  }

  const ivHex = encryptedData.slice(0, 24);
  const encryptedHex = encryptedData.slice(24);

  const iv = hexToBytes(ivHex);
  const encryptedWithTag = hexToBytes(encryptedHex);

  const key = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(keyBytes),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
      tagLength: 128,
    },
    key,
    toArrayBuffer(encryptedWithTag)
  );

  return new TextDecoder().decode(decryptedBuffer);
}
