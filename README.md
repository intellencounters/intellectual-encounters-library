# Intellectual Encounters — A Reading Library

Ten short **interactive** primers written for our circle: people in our late
twenties and thirties, mostly from India, living and working in Germany while we
study — thinking through work, family expectation, relationships, money, culture,
and meaning.

Each book is a real essay you can argue with: it has arguments laid bare,
steel-manned counterarguments, comprehension checks, and private reflection notes
that save in your own browser. Nothing you write is ever sent anywhere.

## The ten books

1. **The Examined Life Abroad** — Philosophy · reasoning & the good life
2. **The Mind Under Pressure** — Psychology · emotion, stress & identity
3. **The Weight of Expectation** — Sociology · family, success & belonging
4. **Between Two Cultures** — Anthropology · Germany ↔ India without judging either
5. **Money, Time, and the Good-Enough Life** — Economics · scarcity, choice & finance
6. **The Rules of the Ground You Stand On** — Politics & law · power & rights
7. **The Long View** — History · how we got here, and why it frees you
8. **Thinking Machines, Thinking Humans** — AI & machine learning · a primer for builders
9. **How the Mind Learns** — Cognitive science · attention, memory & decision
10. **How Should I Live?** — Spirituality · wisdom traditions on meaning

Six chapters per book — 60 chapters, ~150,000 words, with 120 comprehension
checks, 60+ reflection prompts, and 60+ steel-manned counterarguments.
Read slowly; argue kindly.

## Read it locally

Books load via `fetch`, so opening `index.html` directly with `file://` will not
work. Serve the folder over HTTP:

```bash
cd intellectual-encounters-library
python3 -m http.server 8000
# then open http://localhost:8000
```

## Put it online (free) — GitHub Pages

1. On the `intellencounters` account, create a new **public** repository named
   `intellectual-encounters-library` (no README, no license — empty).
2. This folder is already a git repository with the remote configured. From it:

   ```bash
   git push -u origin main
   ```

   (Sign in as `intellencounters` when asked — use a personal access token as
   the password if prompted.)

3. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a
   branch**, pick `main` / `/ (root)`, save.
4. The site goes live at
   **https://intellencounters.github.io/intellectual-encounters-library/**
   in a minute or two. Drop that link in the WhatsApp group.

No git on your machine? Easiest alternative: on the new repo page choose
**"uploading an existing file"**, drag the entire contents of this folder in
(everything except `.git`), commit, then do step 3.

Prefer Netlify? Just drag this folder onto <https://app.netlify.com/drop>.

## Add or edit content

A book is a folder in `books/<id>/`:

```
books/
  index.json          registry — array order = library order
  <id>/
    book.json         metadata + ordered chapter list
    ch1.md …          one Markdown file per chapter
    glossary.md       one "## Term" heading per entry
    citations.md      sources
```

Write chapters in the engine's component syntax (arguments, checks, counters,
reflections, definitions, evidence, timelines, cases, uncertainty blocks). After
any change, validate against the exact parser the reader uses:

```bash
node tools/validate.js            # all books
node tools/validate.js books/ai   # one book
```

Exit 0 means it will render correctly. **If you redeploy, bump `CACHE_NAME` in
`sw.js`** (e.g. `ie-library-v1` → `ie-library-v2`) so readers get fresh chapters
instead of the cached offline copy.

## How it's built

Plain HTML, CSS, and vanilla JavaScript — no build step, no frameworks, no
dependencies. `engine/engine.js` is a single parser shared by the reader and the
validator, so anything that validates renders identically for readers. Works
offline after first visit (service worker). Light and dark themes.

## A note on honesty

These are primers on how to *think about* each subject, not final answers. Every
contested claim carries its strongest objection; anything that would need a
citation is flagged as needing one rather than dressed up as settled fact. Verify
sources before quoting them elsewhere.
