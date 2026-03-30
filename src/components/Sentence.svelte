<script>
  import Phrase from './Phrase.svelte'

  let {
    sentence,
    translation = null,
    glossary = {},
    isActive = false,
    activeT = -1,
    reflectorKey = null,
    onSeek,
    onToggleReflector,
    sentenceIndex,
  } = $props()

  let showTranslation = $state(false)

  function phraseKey(phraseIndex) {
    return `${sentenceIndex}:${phraseIndex}`
  }
</script>

<div class="sentence" class:active={isActive}>
  <p class="text">
    {#each sentence.phrases as phrase, i}
      <Phrase
        tokens={phrase.tokens}
        active={isActive && phrase.t === activeT}
        isReflector={reflectorKey === phraseKey(i)}
        {glossary}
        onSeek={() => onSeek?.(phrase.t)}
        onToggleReflector={() => onToggleReflector?.(phraseKey(i))}
      />{i < sentence.phrases.length - 1 ? ' ' : ''}
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
