<script>
  /**
   * A timestamp-delimited phrase — the unit for seeking, reflector, and highlighting.
   * Renders individual word tokens inside for glossary hint tooltips.
   *
   * @prop {string[]} tokens       - space-separated words within the phrase
   * @prop {boolean}  active       - whether this phrase is currently highlighted
   * @prop {boolean}  isReflector  - whether this phrase is the loop reflector
   * @prop {Record<string, {hint?: string, phonetic?: string}>} glossary
   * @prop {() => void} onSeek
   * @prop {() => void} onToggleReflector
   */
  import { stripPunctuation } from '../lib/parseStory.js'

  let { tokens, active = false, isReflector = false, glossary = {}, onSeek, onToggleReflector } = $props()

  // Per-token tooltip state: index of currently shown tooltip, or -1
  let tooltipIndex = $state(-1)
  let tooltipTimer = null

  function getGlossaryEntry(token) {
    const key = stripPunctuation(token)
    return glossary[key] ?? glossary[key.toLowerCase()] ?? null
  }

  // ── Timers ────────────────────────────────────────────────────
  let longPressTimer = null
  let doubleTapTimer = null
  let isLongPress = false
  // Track which token index the pointer went down on (for per-token tooltips)
  let pointerTokenIndex = -1

  // ── Desktop hover ─────────────────────────────────────────────
  function handleTokenMouseEnter(i) {
    const entry = getGlossaryEntry(tokens[i])
    if (!entry) return
    tooltipIndex = i
  }

  function handleTokenMouseLeave() {
    tooltipIndex = -1
  }

  // ── Desktop right-click = reflector ───────────────────────────
  function handleContextMenu(e) {
    e.preventDefault()
    e.stopPropagation()
    onToggleReflector?.()
  }

  // ── Touch / pointer ───────────────────────────────────────────
  function tokenIndexFromEvent(e) {
    // Find which token span was touched via composedPath
    const path = e.composedPath()
    for (const el of path) {
      if (el instanceof Element && el.dataset?.tokenIndex !== undefined) {
        return parseInt(el.dataset.tokenIndex)
      }
    }
    return -1
  }

  function handlePointerDown(e) {
    if (e.pointerType === 'mouse') return
    e.preventDefault()
    e.stopPropagation()
    isLongPress = false
    pointerTokenIndex = tokenIndexFromEvent(e)
    longPressTimer = setTimeout(() => {
      isLongPress = true
      longPressTimer = null
      if (pointerTokenIndex >= 0) {
        const entry = getGlossaryEntry(tokens[pointerTokenIndex])
        if (entry) {
          tooltipIndex = pointerTokenIndex
          if (tooltipTimer) clearTimeout(tooltipTimer)
          tooltipTimer = setTimeout(() => { tooltipIndex = -1 }, 2500)
        }
      }
    }, 450)
  }

  function handlePointerUp(e) {
    if (e.pointerType === 'mouse') return
    e.preventDefault()
    e.stopPropagation()
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null }
    if (isLongPress) { isLongPress = false; return }
    // Short tap
    if (doubleTapTimer) {
      clearTimeout(doubleTapTimer)
      doubleTapTimer = null
      onToggleReflector?.()
    } else {
      doubleTapTimer = setTimeout(() => { doubleTapTimer = null; onSeek?.() }, 280)
    }
  }

  function handlePointerCancel(e) {
    if (e.pointerType === 'mouse') return
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null }
    isLongPress = false
  }

  // ── Mouse click ───────────────────────────────────────────────
  function handleClick(e) {
    if (e.pointerType === 'touch') return
    e.preventDefault()
    e.stopPropagation()
    if (doubleTapTimer) {
      clearTimeout(doubleTapTimer)
      doubleTapTimer = null
      onToggleReflector?.()
    } else {
      doubleTapTimer = setTimeout(() => { doubleTapTimer = null; onSeek?.() }, 280)
    }
  }
</script>

<span
  class="phrase"
  class:active
  class:reflector={isReflector}
  role="button"
  tabindex="0"
  onclick={handleClick}
  oncontextmenu={handleContextMenu}
  onpointerdown={handlePointerDown}
  onpointerup={handlePointerUp}
  onpointercancel={handlePointerCancel}
  onkeydown={(e) => { if (e.key === 'Enter') onSeek?.(); if (e.key === 'r') onToggleReflector?.() }}
>{#each tokens as token, i}<span
    class="token"
    class:has-gloss={!!getGlossaryEntry(token)}
    data-token-index={i}
    onmouseenter={() => handleTokenMouseEnter(i)}
    onmouseleave={handleTokenMouseLeave}
  >{token}{#if tooltipIndex === i}
      <span class="tooltip">
        {#if getGlossaryEntry(token)?.hint}<span class="hint">{getGlossaryEntry(token).hint}</span>{/if}
        {#if getGlossaryEntry(token)?.phonetic}<span class="phonetic">{getGlossaryEntry(token).phonetic}</span>{/if}
      </span>
    {/if}</span>{i < tokens.length - 1 ? ' ' : ''}{/each}{#if isReflector}<span class="reflector-mark" aria-label="loop reflector">↩</span>{/if}</span>

<style>
  .phrase {
    display: inline;
    border-radius: 4px;
    padding: 1px 2px;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    touch-action: none;
    transition: background 0.1s, color 0.1s;
  }

  .phrase.active {
    background: #fde68a;
    color: #1a1a1a;
  }

  .phrase:not(.active):hover {
    background: #f3f4f6;
  }

  .phrase.reflector {
    outline: 1px dashed #7c3aed;
    outline-offset: 2px;
  }

  .token {
    position: relative;
    display: inline;
  }

  .token.has-gloss {
    text-decoration: underline dotted;
    text-underline-offset: 3px;
    text-decoration-color: #a78bfa;
  }

  .reflector-mark {
    font-size: 0.65em;
    color: #7c3aed;
    margin-left: 1px;
    vertical-align: super;
    pointer-events: none;
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
