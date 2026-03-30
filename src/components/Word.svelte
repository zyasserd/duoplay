<script>
  /**
   * @prop {string} text - the raw word chunk including punctuation
   * @prop {boolean} active - whether this word is currently being played
   * @prop {boolean} isReflector - whether this word is the loop reflector
   * @prop {object|null} glossaryEntry - { hint, phonetic } or null
   * @prop {() => void} onSeek - called on tap/click: seek+play from this word
   * @prop {() => void} onToggleReflector - called on double-tap or right-click
   */
  let { text, active = false, isReflector = false, glossaryEntry = null, onSeek, onToggleReflector } = $props()

  // Split text into [prefix, core, suffix] so highlight/underline only wraps the core
  let parts = $derived(() => {
    const m = text.match(/^([\s\p{P}]*)(.*?)([\s\p{P}]*)$/su)
    return m ? [m[1], m[2], m[3]] : ['', text, '']
  })

  let showTooltip = $state(false)

  // Timers
  let longPressTimer = null   // fires hint on long press
  let doubleTapTimer = null   // window for second tap to count as double-tap
  let longPressFired = false  // prevent click from firing after long press
  let lastPointerType = 'mouse' // track touch vs mouse to suppress fake mouseenter on mobile

  // ── Desktop: hover shows tooltip ──────────────────────────────
  function handleMouseEnter() {
    if (!glossaryEntry) return
    if (lastPointerType !== 'mouse') return  // suppress fake mouseenter fired by touch
    showTooltip = true
  }

  function handleMouseLeave() {
    showTooltip = false
  }

  // ── Desktop: right-click = reflector ──────────────────────────
  function handleContextMenu(e) {
    e.preventDefault()
    e.stopPropagation()
    onToggleReflector?.()
  }

  // ── Touch / pointer logic ─────────────────────────────────────
  function handlePointerDown(e) {
    lastPointerType = e.pointerType
    // Only handle primary button / touch
    if (e.pointerType === 'mouse' && e.button !== 0) return
    longPressFired = false
    longPressTimer = setTimeout(() => {
      longPressFired = true
      longPressTimer = null
      // Show hint tooltip; hide after 2.5s
      if (glossaryEntry) {
        showTooltip = true
        setTimeout(() => { showTooltip = false }, 2500)
      }
    }, 450)
  }

  function handlePointerUp() {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
  }

  function handlePointerCancel() {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
    longPressFired = false
  }

  // click fires after pointerup on both mouse and touch
  function handleClick(e) {
    e.preventDefault()
    e.stopPropagation()

    // Long press already handled — ignore this click
    if (longPressFired) {
      longPressFired = false
      return
    }

    if (doubleTapTimer) {
      // Second tap within window → double-tap → reflector
      clearTimeout(doubleTapTimer)
      doubleTapTimer = null
      onToggleReflector?.()
    } else {
      // First tap — wait briefly for possible second tap before seeking
      doubleTapTimer = setTimeout(() => {
        doubleTapTimer = null
        onSeek?.()
      }, 280)
    }
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
  onpointercancel={handlePointerCancel}
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  onkeydown={(e) => { if (e.key === 'Enter') onSeek?.(); if (e.key === 'r') onToggleReflector?.() }}
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
    -webkit-touch-callout: none;
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
