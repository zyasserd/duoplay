#!/usr/bin/env node
/**
 * Encrypt a story YAML + audio file for use with duoplay's ?locked= mode.
 *
 * Usage:
 *   node scripts/encrypt.js <label> <yaml-file> <audio-file> <password>
 *
 * Example:
 *   node scripts/encrypt.js good-morning story.yaml audio.mp3 mysecret
 *
 * Output:
 *   public/stories/good-morning/story.enc
 *   public/stories/good-morning/audio.mp3.enc
 */

import { readFile, writeFile, mkdir } from 'fs/promises'
import { webcrypto } from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'

const { subtle, getRandomValues } = webcrypto

const PBKDF2_ITERATIONS = 100_000
const SALT_BYTES = 16
const IV_BYTES = 12

async function deriveKey(password, salt) {
  const keyMaterial = await subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )
}

async function encryptBuffer(buffer, password) {
  const salt = getRandomValues(new Uint8Array(SALT_BYTES))
  const iv = getRandomValues(new Uint8Array(IV_BYTES))
  const key = await deriveKey(password, salt)
  const ciphertext = await subtle.encrypt({ name: 'AES-GCM', iv }, key, buffer)
  const result = new Uint8Array(SALT_BYTES + IV_BYTES + ciphertext.byteLength)
  result.set(salt, 0)
  result.set(iv, SALT_BYTES)
  result.set(new Uint8Array(ciphertext), SALT_BYTES + IV_BYTES)
  return result
}

async function main() {
  const [, , label, yamlPath, audioPath, password] = process.argv

  if (!label || !yamlPath || !audioPath || !password) {
    console.error('Usage: node scripts/encrypt.js <label> <yaml-file> <audio-file> <password>')
    process.exit(1)
  }

  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const outDir = path.join(__dirname, '..', 'public', 'stories', label)

  await mkdir(outDir, { recursive: true })

  // Encrypt YAML
  console.log(`Encrypting ${yamlPath}…`)
  const yamlBuf = await readFile(yamlPath)
  const encYaml = await encryptBuffer(yamlBuf, password)
  const yamlOut = path.join(outDir, 'story.enc')
  await writeFile(yamlOut, encYaml)
  console.log(`  → ${yamlOut}`)

  // Encrypt audio — preserve extension: audio.mp3 → audio.mp3.enc
  console.log(`Encrypting ${audioPath}…`)
  const audioBuf = await readFile(audioPath)
  const encAudio = await encryptBuffer(audioBuf, password)
  const audioFilename = path.basename(audioPath) + '.enc'
  const audioOut = path.join(outDir, audioFilename)
  await writeFile(audioOut, encAudio)
  console.log(`  → ${audioOut}`)

  console.log(`\nDone! Share with:`)
  console.log(`  ?locked=${label}&password=${password}`)
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
