<script>
  import Word from './Word.svelte'
  import { stripPunctuation } from '../lib/parseStory.js'

  /**
   * @prop {{ start: number, end: number, words: {text: string, t: number}[] }} sentence
   * @prop {string|null} translation
   * @prop {Record<string, {hint?: string, phonetic?: string}>} glossary
   * @prop {HTMLAudioElement} audio - shared audio element
   * @prop {boolean} isPlaying - whether THIS sentence is currently playing
   * @prop {number} currentTime - current playback time of the audio
   * @prop {() => void} onPlay - callback to notify parent this sentence wants to play
   */
  let { sentence, translation = null, glossary = {}, audio, isPlaying = false, currentTime = 0, onPlay } = $props()

  let showTranslation = $state(false)

  // Which word index is active based on currentTime
  let activeWordIndex = $derived(() => {
    if (!isPlaying) return -1
    let idx = -1
    for (let i = 0; i < sentence.words.length; i++) {
      if (currentTime >= sentence.words[i].t) idx = i
      else break
    }
    return idx
  })

  function play() {
    onPlay()
    audio.currentTime = sentence.start
    audio.play()

    // Stop and clear highlight when sentence end is reached
    function checkEnd() {
      if (audio.currentTime >= sentence.end) {
        audio.pause()
        audio.removeEventListener('timeupdate', checkEnd)
      }
    }
    audio.removeEventListener('timeupdate', checkEnd) // clear any previous
    audio.addEventListener('timeupdate', checkEnd)
  }

  function getGlossaryEntry(text) {
    const key = stripPunctuation(text)
    return glossary[key] ?? null
  }
</script>

<div class="sentence" class:playing={isPlaying}>
  <button class="play-btn" onclick={play} aria-label="Play sentence" title="Play">
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M8 5.14v14l11-7-11-7z"/>
    </svg>
  </button>

  <div class="content">
    <p class="text">
      {#each sentence.words as word, i}
        <Word
          text={word.text}
          active={isPlaying && activeWordIndex() === i}
          glossaryEntry={getGlossaryEntry(word.text)}
        />
      {/each}
    </p>

    {#if translation}
      <button class="translation-toggle" onclick={() => (showTranslation = !showTranslation)}>
        {showTranslation ? 'hide' : 'show translation'}
      </button>
      {#if showTranslation}
        <p class="translation">{translation}</p>
      {/if}
    {/if}
  </div>
</div>

<style>
  .sentence {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 12px;
    transition: background 0.15s;
  }

  .sentence.playing {
    background: #f5f3ff;
  }

  .play-btn {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: #7c3aed;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
    margin-top: 2px;
    /* minimum touch target */
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  .play-btn:hover {
    background: #6d28d9;
    transform: scale(1.05);
  }

  .play-btn:active {
    transform: scale(0.97);
  }

  .content {
    flex: 1;
    min-width: 0;
  }

  .text {
    margin: 0;
    font-size: 1.25rem;
    line-height: 1.8;
    color: #1a1a2e;
  }

  @media (max-width: 480px) {
    .sentence {
      padding: 12px 8px;
      gap: 10px;
    }

    .text {
      font-size: 1.15rem;
    }
  }

  .translation-toggle {
    background: none;
    border: none;
    color: #7c3aed;
    font-size: 0.75rem;
    cursor: pointer;
    padding: 2px 0;
    margin-top: 4px;
    text-decoration: underline dotted;
    text-underline-offset: 2px;
  }

  .translation {
    margin: 4px 0 0;
    font-size: 0.9rem;
    color: #6b7280;
    font-style: italic;
  }
</style>
