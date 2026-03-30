<script>
  /**
   * @prop {string} text - the raw word chunk including punctuation
   * @prop {boolean} active - whether this word is currently being played
   * @prop {boolean} isReflector - whether this word is the loop reflector
   * @prop {object|null} glossaryEntry - { hint, phonetic } or null
   * @prop {() => void} onSeek - called on left-click: seek+play from this word
   * @prop {() => void} onToggleReflector - called on right-click/long-press
   */
  let { text, active = false, isReflector = false, glossaryEntry = null, onSeek, onToggleReflector } = $props()

  // Split text into [prefix, core, suffix] so highlight/underline only wraps the core
  // e.g. "murales," → ['', 'murales', ',']
  // e.g. " títeres" → [' ', 'títeres', '']
  let parts = $derived(() => {
    const m = text.match(/^([\s\p{P}]*)(.*?)([\s\p{P}]*)$/su)
    return m ? [m[1], m[2], m[3]] : ['', text, '']
  })

  let showTooltip = $state(false)
  let longPressTimer = null

  function handleClick(e) {
    e.preventDefault()
    e.stopPropagation()
    showTooltip = false
    onSeek?.()
  }

  function handleContextMenu(e) {
    e.preventDefault()
    e.stopPropagation()
    onToggleReflector?.()
  }

  // Long-press for mobile (>450ms)
  function handlePointerDown(e) {
    if (e.button !== 0) return
    longPressTimer = setTimeout(() => {
      longPressTimer = null
      onToggleReflector?.()
    }, 450)
  }

  function handlePointerUp() {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
  }

  function handlePointerLeave() {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
    showTooltip = false
  }

  function handleMouseEnter() {
    if (!glossaryEntry) return
    showTooltip = true
  }
</script>

<span
  class="word-wrap"
  role="button"
  tabindex="0"
  onclick={handleClick}
  oncontextmenu={handleContextMenu}
  onpointerdown={handlePointerDown}
  onpointerup={handlePointerUp}
  onpointerleave={handlePointerLeave}
  onmouseenter={handleMouseEnter}
  onkeydown={(e) => e.key === 'Enter' && onSeek?.()}
>{parts()[0]}<span
    class="word"
    class:active
    class:reflector={isReflector}
    class:has-gloss={!!glossaryEntry}
  >{parts()[1]}{#if isReflector}<span class="reflector-mark" aria-label="loop reflector">↩</span>{/if}</span>{parts()[2]}
  {#if showTooltip && glossaryEntry}
    <span class="tooltip">
      {#if glossaryEntry.hint}
        <span class="hint">{glossaryEntry.hint}</span>
      {/if}
      {#if glossaryEntry.phonetic}
        <span class="phonetic">{glossaryEntry.phonetic}</span>
      {/if}
    </span>
  {/if}
</span>

<style>
  .word-wrap {
    position: relative;
    display: inline;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
  }

  .word {
    position: relative;
    display: inline;
    border-radius: 3px;
    transition: background 0.1s, color 0.1s;
    padding: 0 1px;
  }

  .word.has-gloss {
    text-decoration: underline dotted;
    text-underline-offset: 3px;
    text-decoration-color: #a78bfa;
  }

  .word.active {
    background: #fde68a;
    color: #1a1a1a;
    border-radius: 3px;
  }

  .word-wrap:hover .word:not(.active) {
    background: #f3f4f6;
    border-radius: 3px;
  }

  .reflector-mark {
    font-size: 0.65em;
    color: #7c3aed;
    margin-left: 1px;
    vertical-align: super;
    pointer-events: none;
  }

  .word.reflector {
    outline: 1px dashed #7c3aed;
    outline-offset: 2px;
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
