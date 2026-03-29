<script>
  import { onMount } from 'svelte'
  import yaml from 'js-yaml'
  import { parseText } from './lib/parseStory.js'
  import Sentence from './components/Sentence.svelte'

  let story = $state(null)
  let error = $state(null)
  let loading = $state(false)

  // Parsed sentences array
  let sentences = $derived(story ? parseText(story.text) : [])
  let translations = $derived(() => {
    if (!story?.translation) return []
    return story.translation.split('\n').map((l) => l.trim())
  })

  // Audio state
  let audioEl = $state(null)
  let currentTime = $state(0)
  let playingSentenceIndex = $state(-1)

  function handleTimeUpdate() {
    currentTime = audioEl.currentTime
    // If audio has passed the end of the current playing sentence, stop highlighting
    if (playingSentenceIndex >= 0) {
      const s = sentences[playingSentenceIndex]
      if (s?.end != null && currentTime >= s.end) {
        playingSentenceIndex = -1
      }
    }
  }

  function handleAudioEnded() {
    playingSentenceIndex = -1
  }

  function handlePlay(index) {
    playingSentenceIndex = index
  }

  onMount(async () => {
    const params = new URLSearchParams(window.location.search)
    const storyUrl = params.get('story')

    if (!storyUrl) {
      // Fall back to bundled example
      try {
        loading = true
        const res = await fetch('./example.yaml')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const text = await res.text()
        story = yaml.load(text)
      } catch (e) {
        error = e.message
      } finally {
        loading = false
      }
      return
    }

    try {
      loading = true
      const res = await fetch(storyUrl)
      if (!res.ok) throw new Error(`Failed to fetch story: HTTP ${res.status}`)
      const text = await res.text()
      story = yaml.load(text)
    } catch (e) {
      error = e.message
    } finally {
      loading = false
    }
  })
</script>

<!-- Hidden shared audio element -->
<audio
  bind:this={audioEl}
  ontimeupdate={handleTimeUpdate}
  onended={handleAudioEnded}
  src={story?.audio ?? ''}
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

    <div class="sentences">
      {#each sentences as sentence, i}
        <Sentence
          {sentence}
          translation={translations()[i] ?? null}
          glossary={story.glossary ?? {}}
          audio={audioEl}
          isPlaying={playingSentenceIndex === i}
          {currentTime}
          onPlay={() => handlePlay(i)}
        />
      {/each}
    </div>
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
    margin-bottom: 32px;
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
    gap: 4px;
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
