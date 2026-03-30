<script>
  import { onMount, onDestroy } from 'svelte'
  import yaml from 'js-yaml'
  import { parseText } from './lib/parseStory.js'
  import { fetchText, fetchAudioObjectURL, mimeFromFilename } from './lib/crypto.js'
  import Sentence from './components/Sentence.svelte'

  let story = $state(null)
  let error = $state(null)
  let loading = $state(false)

  let audioSrc = $state('')
  let audioBlobUrl = null

  let sentences = $derived(story ? parseText(story.text) : [])
  let translations = $derived(() => {
    if (!story?.translation) return []
    return story.translation.split('\n').map((l) => l.trim())
  })

  // ── Audio element ──────────────────────────────────────────────
  let audioEl = $state(null)
  let currentTime = $state(0)
  let isPlaying = $state(false)

  // ── Playback state ─────────────────────────────────────────────
  // loopStart: the timestamp we jump back to when the reflector is hit
  let loopStart = $state(null)
  // reflectorKey: "sentenceIdx:wordIdx" of the reflector word, or null
  let reflectorKey = $state(null)

  // Flat list of all phrases with timestamps + keys + endT
  let allWords = $derived(() => {
    const out = []
    for (let si = 0; si < sentences.length; si++) {
      const s = sentences[si]
      for (let pi = 0; pi < s.phrases.length; pi++) {
        const nextT = s.phrases[pi + 1]?.t ?? s.end ?? s.phrases[pi].t + 0.5
        out.push({ key: `${si}:${pi}`, t: s.phrases[pi].t, endT: nextT })
      }
    }
    return out
  })

  // reflectorT is the END of the reflector word — that's where we bounce
  let reflectorT = $derived(() => {
    if (!reflectorKey) return null
    return allWords().find((w) => w.key === reflectorKey)?.endT ?? null
  })

  // Active sentence + word derived purely from currentTime
  let activeSentenceIndex = $derived(() => {
    let idx = -1
    for (let i = 0; i < sentences.length; i++) {
      if (currentTime >= sentences[i].start) idx = i
      else break
    }
    return idx
  })

  // The timestamp of the currently active phrase
  let activeT = $derived(() => {
    const si = activeSentenceIndex()
    if (si < 0) return -1
    const phrases = sentences[si].phrases
    let t = -1
    for (let i = 0; i < phrases.length; i++) {
      if (currentTime >= phrases[i].t) t = phrases[i].t
      else break
    }
    return t
  })

  // ── Event handlers ─────────────────────────────────────────────
  function handleTimeUpdate() {
    currentTime = audioEl.currentTime
    // Reflector: if we've reached or passed it, loop back to loopStart
    const rt = reflectorT()
    if (rt !== null && currentTime >= rt) {
      audioEl.currentTime = loopStart ?? 0
      // audio keeps playing — no need to call play()
    }
  }

  function handleAudioEnded() {
    isPlaying = false
  }

  function handleAudioPlay() {
    isPlaying = true
  }

  function handleAudioPause() {
    isPlaying = false
  }

  function handleDocumentClick() {
    audioEl?.pause()
  }

  function togglePlayPause() {    if (!audioEl) return
    if (audioEl.paused) {
      // capture current position as loop start if not already set
      if (loopStart === null) loopStart = audioEl.currentTime
      audioEl.play()
    } else {
      audioEl.pause()
    }
  }

  // Called when a word is clicked: seek + play from that word's timestamp
  function seekTo(t) {
    if (!audioEl) return
    // If seeking to at or past the reflector word's own start, clear the reflector
    if (reflectorKey) {
      const reflWord = allWords().find((w) => w.key === reflectorKey)
      if (reflWord && t >= reflWord.t) {
        reflectorKey = null
      }
    }
    loopStart = t
    audioEl.currentTime = t
    audioEl.play()
  }

  // Toggle reflector on a word key
  function toggleReflector(key) {
    if (reflectorKey === key) {
      reflectorKey = null
      return
    }
    reflectorKey = key
    // Guard against inverted loop region: if loopStart is null or >= reflector's end,
    // snap loopStart to the reflector word's own start (single-word loop minimum)
    const reflWord = allWords().find((w) => w.key === key)
    if (reflWord && (loopStart === null || loopStart >= reflWord.endT)) {
      loopStart = reflWord.t
    }
  }

  // ── Story loading ──────────────────────────────────────────────
  async function loadPlainStory(url) {
    const text = await fetchText(url, null)
    story = yaml.load(text)
    audioSrc = story.audio ?? ''
  }

  async function loadLockedStory(label, password) {
    const base = `./stories/${label}`
    const yamlText = await fetchText(`${base}/story.enc`, password)
    story = yaml.load(yamlText)
    if (story.audio) {
      const mime = mimeFromFilename(story.audio)
      const blobUrl = await fetchAudioObjectURL(`${base}/${story.audio}`, password, mime)
      if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl)
      audioBlobUrl = blobUrl
      audioSrc = blobUrl
    }
  }

  onMount(async () => {
    document.addEventListener('click', handleDocumentClick)
    const params = new URLSearchParams(window.location.search)
    const storyUrl = params.get('story')
    const locked = params.get('locked')
    const password = params.get('password') ?? ''
    try {
      loading = true
      if (locked) {
        await loadLockedStory(locked, password)
      } else if (storyUrl) {
        await loadPlainStory(storyUrl)
      } else {
        await loadPlainStory('./example.yaml')
      }
    } catch (e) {
      error = e.message
    } finally {
      loading = false
    }
  })

  onDestroy(() => {
    document.removeEventListener('click', handleDocumentClick)
    if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl)
  })
</script>

<audio
  bind:this={audioEl}
  ontimeupdate={handleTimeUpdate}
  onended={handleAudioEnded}
  onplay={handleAudioPlay}
  onpause={handleAudioPause}
  src={audioSrc}
  preload="auto"
></audio>

<main>
  {#if loading}
    <div class="state-message">Loading…</div>
  {:else if error}
    <div class="state-message error">
      <strong>Error:</strong> {error}
      <p class="hint-text">Pass a YAML story URL via <code>?story=https://…</code></p>
    </div>
  {:else if !story}
    <div class="state-message">
      <p>No story loaded.</p>
      <p class="hint-text">Pass a YAML story URL via <code>?story=https://…</code></p>
    </div>
  {:else}
    <header>
      <h1>{story.title}</h1>
    </header>

    <div class="sentences" class:playing={isPlaying} role="region" aria-label="Story text" onclick={(e) => e.stopPropagation()}>
      {#each sentences as sentence, i}
        <Sentence
          {sentence}
          translation={translations()[i] ?? null}
          glossary={story.glossary ?? {}}
          isActive={activeSentenceIndex() === i}
          activeT={activeSentenceIndex() === i ? activeT() : -1}
          {reflectorKey}
          sentenceIndex={i}
          onSeek={seekTo}
          onToggleReflector={toggleReflector}
        />
      {/each}
    </div>

    {#if reflectorKey}
      <div class="reflector-hint">
        Loop active — right-click the ↩ word again to clear
      </div>
    {/if}
  {/if}
</main>

<style>
  main {
    max-width: 680px;
    margin: 0 auto;
    padding: 40px 16px 80px;
  }

  @media (max-width: 480px) {
    main {
      padding: 24px 12px 60px;
    }
    h1 {
      font-size: 1.4rem;
    }
  }

  header {
    margin-bottom: 28px;
  }

  h1 {
    font-size: 1.8rem;
    font-weight: 600;
    color: #1a1a2e;
    margin: 0;
  }

  .sentences {
    display: flex;
    flex-direction: column;
    gap: 2px;
    border-radius: 16px;
    padding: 12px 10px;
    border: 2px solid rgba(124, 58, 237, 0.15);
    background: rgba(124, 58, 237, 0.03);
    transition: border-color 0.2s, background 0.2s;
  }

  .sentences.playing {
    border-color: rgba(124, 58, 237, 0.45);
    background: rgba(124, 58, 237, 0.06);
  }

  .reflector-hint {
    margin-top: 20px;
    font-size: 0.78rem;
    color: #9ca3af;
    text-align: center;
  }

  .state-message {
    text-align: center;
    padding: 60px 20px;
    color: #6b7280;
    font-size: 1rem;
  }

  .state-message.error {
    color: #dc2626;
  }

  .hint-text {
    font-size: 0.85rem;
    color: #9ca3af;
    margin-top: 8px;
  }

  code {
    background: #f3f4f6;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.8em;
  }
</style>
