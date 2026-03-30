<script>
  import Word from './Word.svelte'
  import { stripPunctuation } from '../lib/parseStory.js'

  /**
   * @prop {{ start: number, end: number, words: {text: string, t: number}[] }} sentence
   * @prop {string|null} translation
   * @prop {Record<string, {hint?: string, phonetic?: string}>} glossary
   * @prop {boolean} isActive - whether this sentence contains the currently playing word
   * @prop {number} activeWordIndex - index of currently highlighted word (-1 if none)
   * @prop {string|null} reflectorKey - key of the word that is the reflector (sentenceIdx:wordIdx)
   * @prop {(t: number) => void} onSeek - seek+play to a timestamp
   * @prop {(key: string) => void} onToggleReflector - toggle reflector on a word key
   * @prop {number} sentenceIndex
   */
  let {
    sentence,
    translation = null,
    glossary = {},
    isActive = false,
    activeWordIndex = -1,
    reflectorKey = null,
    onSeek,
    onToggleReflector,
    sentenceIndex,
  } = $props()

  let showTranslation = $state(false)

  function getGlossaryEntry(text) {
    const key = stripPunctuation(text)
    // try exact key first, then lowercase key (handles mixed-case glossary entries)
    return glossary[key] ?? glossary[key.toLowerCase()] ?? null
  }

  function wordKey(wordIndex) {
    return `${sentenceIndex}:${wordIndex}`
  }
</script>

<div class="sentence" class:active={isActive}>
  <p class="text">
    {#each sentence.words as word, i}
      <Word
        text={word.text}
        active={isActive && activeWordIndex === i}
        isReflector={reflectorKey === wordKey(i)}
        glossaryEntry={getGlossaryEntry(word.text)}
        onSeek={() => onSeek?.(word.t)}
        onToggleReflector={() => onToggleReflector?.(wordKey(i))}
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

<style>
  .sentence {
    padding: 10px 16px;
    border-radius: 12px;
    transition: background 0.15s;
  }

  .sentence.active {
    background: #f5f3ff;
  }

  .text {
    margin: 0;
    font-size: 1.25rem;
    line-height: 1.9;
    color: #1a1a2e;
  }

  @media (max-width: 480px) {
    .sentence {
      padding: 8px 8px;
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
    margin-top: 2px;
    text-decoration: underline dotted;
    text-underline-offset: 2px;
    display: block;
  }

  .translation {
    margin: 4px 0 0;
    font-size: 0.9rem;
    color: #6b7280;
    font-style: italic;
  }
</style>
