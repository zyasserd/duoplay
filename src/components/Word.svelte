<script>
  /**
   * @prop {string} text - the raw word chunk including punctuation
   * @prop {boolean} active - whether this word is currently being played
   * @prop {object|null} glossaryEntry - { hint, phonetic } or null
   */
  let { text, active = false, glossaryEntry = null } = $props()

  let showTooltip = $state(false)

  function toggle() {
    if (!glossaryEntry) return
    showTooltip = !showTooltip
  }

  function onMouseEnter() {
    if (!glossaryEntry) return
    showTooltip = true
  }

  function onMouseLeave() {
    showTooltip = false
  }
</script>

{#if glossaryEntry}
  <button
    class="word has-gloss"
    class:active
    onclick={toggle}
    onmouseenter={onMouseEnter}
    onmouseleave={onMouseLeave}
  >
    {text}
    {#if showTooltip}
      <span class="tooltip">
        {#if glossaryEntry.hint}
          <span class="hint">{glossaryEntry.hint}</span>
        {/if}
        {#if glossaryEntry.phonetic}
          <span class="phonetic">{glossaryEntry.phonetic}</span>
        {/if}
      </span>
    {/if}
  </button>
{:else}
  <span class="word" class:active>{text}</span>
{/if}

<style>
  .word {
    position: relative;
    display: inline;
    cursor: default;
    border-radius: 3px;
    transition: background 0.1s, color 0.1s;
    padding: 0 1px;
    font-size: inherit;
    font-family: inherit;
    line-height: inherit;
    background: none;
    border: none;
    color: inherit;
  }

  .word.has-gloss {
    cursor: pointer;
    text-decoration: underline dotted;
    text-underline-offset: 3px;
  }

  .word.active {
    background: #fde68a;
    color: #1a1a1a;
    border-radius: 3px;
  }

  .tooltip {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    background: #1e1e2e;
    color: #cdd6f4;
    border-radius: 8px;
    padding: 6px 10px;
    white-space: nowrap;
    font-size: 0.8rem;
    display: flex;
    flex-direction: column;
    gap: 2px;
    z-index: 10;
    pointer-events: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .tooltip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: #1e1e2e;
  }

  .hint {
    font-weight: 600;
  }

  .phonetic {
    color: #a6adc8;
    font-style: italic;
  }
</style>
