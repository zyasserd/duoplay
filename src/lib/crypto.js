const PBKDF2_ITERATIONS = 100_000
const SALT_BYTES = 16
const IV_BYTES = 12

/**
 * Derive an AES-GCM key from a password + salt using PBKDF2.
 */
async function deriveKey(password, salt) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt an ArrayBuffer with a password.
 * Output format: [16B salt | 12B iv | ciphertext]
 */
export async function encrypt(buffer, password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const key = await deriveKey(password, salt)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, buffer)
  const result = new Uint8Array(SALT_BYTES + IV_BYTES + ciphertext.byteLength)
  result.set(salt, 0)
  result.set(iv, SALT_BYTES)
  result.set(new Uint8Array(ciphertext), SALT_BYTES + IV_BYTES)
  return result.buffer
}

/**
 * Decrypt an ArrayBuffer with a password.
 * Expects format: [16B salt | 12B iv | ciphertext]
 * Throws if password is wrong or data is corrupt.
 */
export async function decrypt(buffer, password) {
  const bytes = new Uint8Array(buffer)
  const salt = bytes.slice(0, SALT_BYTES)
  const iv = bytes.slice(SALT_BYTES, SALT_BYTES + IV_BYTES)
  const ciphertext = bytes.slice(SALT_BYTES + IV_BYTES)
  const key = await deriveKey(password, salt)
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
}

/**
 * Fetch a URL and decrypt it if the URL ends with .enc.
 * Returns { arrayBuffer, text } — text is only decoded for YAML (.enc with no audio mime).
 * For binary (audio), use arrayBuffer directly.
 */
export async function fetchAndDecrypt(url, password) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`)
  const raw = await res.arrayBuffer()
  if (!url.endsWith('.enc')) return raw
  if (!password) throw new Error('Password required to decrypt this file')
  try {
    return await decrypt(raw, password)
  } catch {
    throw new Error('Wrong password or corrupted file')
  }
}

/**
 * Fetch, optionally decrypt, and return as a UTF-8 string.
 */
export async function fetchText(url, password) {
  const buf = await fetchAndDecrypt(url, password)
  return new TextDecoder().decode(buf)
}

/**
 * Fetch, optionally decrypt, and return as an object URL for use in <audio src>.
 * mimeType e.g. 'audio/mpeg', 'audio/ogg'
 */
export async function fetchAudioObjectURL(url, password, mimeType = 'audio/mpeg') {
  const buf = await fetchAndDecrypt(url, password)
  const blob = new Blob([buf], { type: mimeType })
  return URL.createObjectURL(blob)
}

/**
 * Derive MIME type from audio filename (before .enc).
 * e.g. "audio.mp3.enc" → "audio/mpeg"
 *      "audio.ogg.enc" → "audio/ogg"
 *      "audio.m4a.enc" → "audio/mp4"
 */
export function mimeFromFilename(filename) {
  const stripped = filename.endsWith('.enc') ? filename.slice(0, -4) : filename
  const ext = stripped.split('.').pop().toLowerCase()
  const map = {
    mp3: 'audio/mpeg',
    ogg: 'audio/ogg',
    opus: 'audio/ogg; codecs=opus',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    wav: 'audio/wav',
    flac: 'audio/flac',
    webm: 'audio/webm',
  }
  return map[ext] ?? 'audio/mpeg'
}
