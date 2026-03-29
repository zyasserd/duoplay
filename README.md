# duoplay

A lightweight, static story player. Load any YAML story file via URL — no backend required. Works on desktop and mobile, deployable to GitHub Pages.

## Usage

```
https://your-github-pages-url/?story=https://raw.githubusercontent.com/you/repo/main/story.yaml
```

If no `?story=` param is provided, the bundled `public/example.yaml` is loaded as a demo.

> **CORS note:** The YAML and audio files must be served with CORS headers. GitHub raw URLs (`raw.githubusercontent.com`) work fine.

---

## Story YAML Format

```yaml
title: My Story Title
audio: https://example.com/audio.mp3

text: |
  [0.0]First[0.8]sentence[1.6]words.[2.4]
  [3.0]Second[3.6]sentence[4.2]words.[5.1]
  [5.8]Third sentence, no word timing needed.[8.0]

translation: |
  First sentence translation.
  Second sentence translation.
  Third sentence translation.

glossary:
  word:
    hint: meaning in English
    phonetic: pronunciation
  另一个词:
    hint: another word
    phonetic: lìng yī gè cí
```

### `text` format

Each **line** is one sentence. Within a line, `[seconds]` markers denote timestamps:

```
[start]word chunk[t]word chunk[t]word chunk[end]
```

- The **first** `[t]` on a line is the sentence start time.
- The **last** `[t]` (trailing, with no text after it) is the sentence end time — used to stop highlighting at the right moment.
- Each text chunk between two markers is highlighted while its timestamp is the current one.
- Chunks can contain punctuation — it's stripped automatically for glossary lookup.

**Example:**

```
[0.0]早上好，[1.8]亲爱的。[2.5]
```

→ Sentence plays from `0.0s` to `2.5s`. "早上好，" highlights at `0.0s`, "亲爱的。" highlights at `1.8s`.

### `translation`

Optional. One line per sentence, matching the `text` lines 1-to-1.  
Shown per-sentence via a **"show translation"** toggle button.

### `glossary`

Optional. A map of **clean word text** (no punctuation) to `hint` and/or `phonetic`.  
Words found in the glossary get a dotted underline — tap or hover to see the tooltip.

Both `hint` and `phonetic` are optional independently:

```yaml
glossary:
  hello:
    hint: a greeting       # shown bold in tooltip
    phonetic: /həˈloʊ/    # shown in italic below hint
```

---

## Development

```sh
npm install
npm run dev       # dev server at http://localhost:5173
npm run build     # production build → dist/
npm run preview   # preview the production build locally
```

## Deploy to GitHub Pages

Build and push the `dist/` folder to your `gh-pages` branch, or use the GitHub Actions workflow of your choice. The app uses `base: './'` in `vite.config.js` so relative paths work correctly.
