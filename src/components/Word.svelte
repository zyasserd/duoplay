<script>
  /**
   * @prop {string} text - the raw word chunk including punctuation
   * @prop {boolean} active - whether this word is currently being played
   * @prop {boolean} isReflector - whether this word is the loop reflector
   * @prop {object|null} glossaryEntry - { hint, phonetic } or null
   * @prop {() => void} onSeek - called on tap/click: seek+play from this word
   * @prop {() => void} onToggleReflector - called on double-tap or right-click
   */
  let { text, active = false, isReflector = false, glossaryEntry = null, trailingSpace = false, onSeek, onToggleReflector } = $props()

  let showTooltip = $state(false)

  // Timers & state
  let longPressTimer = null
  let doubleTapTimer = null
  let pointerDownTime = 0       // timestamp of pointerdown, to detect long press on pointerup
  let isLongPress = false       // was the last touch a long press?

  // ── Desktop: hover shows tooltip ──────────────────────────────
  function handleMouseEnter() {
    if (!glossaryEntry) return
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
    if (e.pointerType === 'mouse') return   // mouse handled by click + contextmenu
    e.preventDefault()                      // prevents mouseenter / click from firing on touch
    e.stopPropagation()
    isLongPress = false
    pointerDownTime = Date.now()
    longPressTimer = setTimeout(() => {
      isLongPress = true
      longPressTimer = null
      if (glossaryEntry) {
        showTooltip = true
        setTimeout(() => { showTooltip = false }, 2500)
      }
    }, 450)
  }

  function handlePointerUp(e) {
    if (e.pointerType === 'mouse') return
    e.preventDefault()
    e.stopPropagation()
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
    if (isLongPress) {
      isLongPress = false
      return   // long press done, don't seek or reflector
    }
    // Short tap — check for double-tap
    if (doubleTapTimer) {
      clearTimeout(doubleTapTimer)
      doubleTapTimer = null
      onToggleReflector?.()
    } else {
      doubleTapTimer = setTimeout(() => {
        doubleTapTimer = null
        onSeek?.()
      }, 280)
    }
  }

  function handlePointerCancel(e) {
    if (e.pointerType === 'mouse') return
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
    isLongPress = false
  }

  // ── Mouse click (desktop only — touch is handled above) ───────
  function handleClick(e) {
    if (e.pointerType === 'touch') return   // guard: should never reach here from touch
    e.preventDefault()
    e.stopPropagation()
    if (doubleTapTimer) {
      clearTimeout(doubleTapTimer)
      doubleTapTimer = null
      onToggleReflector?.()
    } else {
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
><span
    class="word"
    class:active
    class:reflector={isReflector}
    class:has-gloss={!!glossaryEntry}
  >{text}{#if trailingSpace}{' '}{/if}{#if isReflector}<span class="reflector-mark" aria-label="loop reflector">↩</span>{/if}</span>
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
    touch-action: none;
  }

  .word {
    position: relative;
    display: inline;
    border-radius: 3px;
    transition: background 0.1s, color 0.1s;
    padding: 1px 2px;
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
