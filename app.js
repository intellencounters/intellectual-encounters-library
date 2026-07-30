/* Intellectual Encounters — reader app (hash-routed SPA) */
(function () {
  'use strict';
  var view = document.getElementById('view');
  var LS = window.localStorage;
  var state = { index: null, books: {}, currentBookId: null };

  /* ---------- storage helpers ---------- */
  function readSet(key) {
    try { return JSON.parse(LS.getItem(key) || '[]'); } catch (e) { return []; }
  }
  function isRead(bookId, chId) { return readSet('read:' + bookId).indexOf(chId) !== -1; }
  function setRead(bookId, chId, val) {
    var k = 'read:' + bookId, arr = readSet(k), i = arr.indexOf(chId);
    if (val && i === -1) arr.push(chId);
    if (!val && i !== -1) arr.splice(i, 1);
    LS.setItem(k, JSON.stringify(arr));
  }
  function saveReflect(id, text) { LS.setItem('reflect:' + id, text); }
  function loadReflect(id) { return LS.getItem('reflect:' + id) || ''; }

  /* ---------- data ---------- */
  function fetchJSON(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); }); }
  function fetchText(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error(url); return r.text(); }); }

  function loadIndex() {
    if (state.index) return Promise.resolve(state.index);
    return fetchJSON('books/index.json').then(function (idx) { state.index = idx; return idx; });
  }
  function loadBook(id) {
    if (state.books[id]) return Promise.resolve(state.books[id]);
    return fetchJSON('books/' + id + '/book.json').then(function (b) { state.books[id] = b; return b; });
  }

  /* ---------- rendering ---------- */
  function esc(s) { return window.SIBE.escapeHtml(s); }

  function renderLibrary() {
    return loadIndex().then(function (idx) {
      return Promise.all((idx.books || []).map(loadBook)).then(function (books) {
        var cards = books.map(function (b, i) {
          var readArr = readSet('read:' + b.id);
          var total = (b.chapters || []).length;
          var pct = total ? Math.round(100 * readArr.length / total) : 0;
          return '<a class="book-card" href="#/book/' + esc(b.id) + '">' +
            '<span class="num">Book ' + (i + 1) + '</span>' +
            '<h2>' + esc(b.title) + '</h2>' +
            '<div class="subject">' + esc(b.subject || '') + '</div>' +
            '<p class="desc">' + esc(b.description || '') + '</p>' +
            '<div class="progress"><span style="width:' + pct + '%"></span></div>' +
            '</a>';
        }).join('');
        view.innerHTML =
          '<section class="lib-intro">' +
          '<h1>Ten short books for a circle that thinks.</h1>' +
          '<p>Primers on the questions underneath work, study, family, love and meaning — written for us: people in our late twenties and thirties, living between cultures, building a life while building careers.</p>' +
          '<p>Each book is meant to be argued with, not just read. Answer the checks, write in the reflections, disagree in the margins. Your notes stay in your browser.</p>' +
          '</section>' +
          '<div class="book-grid">' + cards + '</div>';
        document.title = 'Intellectual Encounters · A Reading Library';
      });
    });
  }

  function renderBook(id) {
    return loadBook(id).then(function (b) {
      state.currentBookId = id;
      var toc = (b.chapters || []).map(function (ch) {
        var done = isRead(id, ch.id);
        return '<li><a href="#/book/' + esc(id) + '/' + esc(ch.id) + '">' +
          '<span class="read-dot">' + (done ? '●' : '○') + '</span>' +
          '<span>' + esc(ch.title) + '</span></a></li>';
      }).join('');
      var aux = '';
      if (b.glossary) aux += '<a href="#/book/' + esc(id) + '/glossary">Glossary</a>';
      if (b.citations) aux += '<a href="#/book/' + esc(id) + '/citations">Citations &amp; sources</a>';
      view.innerHTML =
        '<div class="chapter-nav"><a href="#/">← Library</a></div>' +
        '<div class="book-head">' +
        '<div class="subject">' + esc(b.subject || '') + '</div>' +
        '<h1>' + esc(b.title) + '</h1>' +
        '<div class="author">' + esc(b.author || '') + '</div>' +
        (b.description ? '<p class="desc">' + esc(b.description) + '</p>' : '') +
        '</div>' +
        '<ol class="toc">' + toc + '</ol>' +
        (aux ? '<div class="aux-links">' + aux + '</div>' : '');
      document.title = b.title + ' · Intellectual Encounters';
    });
  }

  function renderChapter(id, chId) {
    return loadBook(id).then(function (b) {
      state.currentBookId = id;
      var chapters = b.chapters || [];
      var pos = chapters.findIndex(function (c) { return c.id === chId; });
      if (pos === -1) { view.innerHTML = '<p>Chapter not found.</p>'; return; }
      var ch = chapters[pos];
      return fetchText('books/' + id + '/' + ch.file).then(function (md) {
        var html = window.SIBE.renderDocument(md, {});
        var prev = pos > 0 ? chapters[pos - 1] : null;
        var next = pos < chapters.length - 1 ? chapters[pos + 1] : null;
        var nav = '<div class="chapter-nav">' +
          '<a href="#/book/' + esc(id) + '">☰ ' + esc(b.title) + '</a>' +
          '<span>' + (pos + 1) + ' / ' + chapters.length + '</span></div>';
        var footer = '<div class="chapter-nav" style="margin-top:2.5rem">' +
          (prev ? '<a href="#/book/' + esc(id) + '/' + esc(prev.id) + '">← ' + esc(prev.title) + '</a>' : '<span></span>') +
          (next ? '<a href="#/book/' + esc(id) + '/' + esc(next.id) + '">' + esc(next.title) + ' →</a>' : '<a href="#/book/' + esc(id) + '">Back to contents</a>') +
          '</div>';
        var readBtn = '<button class="mark-read' + (isRead(id, chId) ? ' done' : '') + '" id="mark-read">' +
          (isRead(id, chId) ? '✓ Marked as read' : 'Mark chapter as read') + '</button>';
        view.innerHTML = nav + '<article class="chapter">' + html + '</article>' + readBtn + footer;
        wireChapter(id, chId);
        window.scrollTo(0, 0);
        document.title = ch.title + ' · ' + b.title;
      });
    });
  }

  function renderDocPage(id, which) {
    return loadBook(id).then(function (b) {
      state.currentBookId = id;
      var file = which === 'glossary' ? b.glossary : b.citations;
      if (!file) { view.innerHTML = '<p>Not available.</p>'; return; }
      return fetchText('books/' + id + '/' + file).then(function (md) {
        var html = window.SIBE.renderMarkdown(md, {});
        view.innerHTML =
          '<div class="chapter-nav"><a href="#/book/' + esc(id) + '">← ' + esc(b.title) + '</a></div>' +
          '<div class="doc-page">' + html + '</div>';
        document.title = (which === 'glossary' ? 'Glossary' : 'Citations') + ' · ' + b.title;
      });
    });
  }

  /* ---------- interactivity ---------- */
  function wireChapter(id, chId) {
    // Checks
    Array.prototype.forEach.call(view.querySelectorAll('.c-check'), function (chk) {
      var answer = parseInt(chk.getAttribute('data-answer'), 10);
      var reread = chk.getAttribute('data-reread');
      var fb = chk.querySelector('.feedback');
      var expl = chk.querySelector('.explanation');
      var opts = chk.querySelectorAll('.opt');
      Array.prototype.forEach.call(opts, function (opt) {
        opt.addEventListener('click', function () {
          var chosen = parseInt(opt.getAttribute('data-i'), 10);
          if (chosen === answer) {
            opt.classList.add('correct');
            Array.prototype.forEach.call(opts, function (o) { o.disabled = true; });
            fb.className = 'feedback hit'; fb.textContent = 'Correct.'; fb.hidden = false;
            expl.hidden = false;
          } else {
            opt.classList.add('wrong'); opt.disabled = true;
            fb.className = 'feedback miss';
            fb.textContent = reread ? 'Not quite — reread section ' + reread + ' and try again.' : 'Not quite — try again.';
            fb.hidden = false;
          }
        });
      });
    });
    // Reflections
    Array.prototype.forEach.call(view.querySelectorAll('.reflect-input'), function (ta) {
      var key = id + ':' + chId + ':' + ta.getAttribute('data-reflect');
      ta.value = loadReflect(key);
      ta.addEventListener('input', function () { saveReflect(key, ta.value); });
    });
    // Mark read
    var mr = document.getElementById('mark-read');
    if (mr) mr.addEventListener('click', function () {
      var now = !isRead(id, chId);
      setRead(id, chId, now);
      mr.classList.toggle('done', now);
      mr.textContent = now ? '✓ Marked as read' : 'Mark chapter as read';
    });
    // Glossary popups: let default hash nav happen (routes to glossary page).
  }

  /* ---------- routing ---------- */
  function route() {
    var hash = location.hash.replace(/^#\/?/, '');
    var parts = hash.split('/').filter(Boolean);
    var p = Promise.resolve();
    view.innerHTML = '<p class="loading">Loading…</p>';

    if (parts.length === 0) {
      p = renderLibrary();
    } else if (parts[0] === 'glossary' && parts[1]) {
      // inline glossary link: resolve within current book
      var bid = state.currentBookId;
      if (bid) {
        p = renderDocPage(bid, 'glossary').then(function () { flashTerm(parts[1]); });
      } else { location.hash = '#/'; return; }
    } else if (parts[0] === 'book' && parts[1]) {
      if (parts[2] === 'glossary') p = renderDocPage(parts[1], 'glossary');
      else if (parts[2] === 'citations') p = renderDocPage(parts[1], 'citations');
      else if (parts[2]) p = renderChapter(parts[1], parts[2]);
      else p = renderBook(parts[1]);
    } else {
      p = renderLibrary();
    }
    p.catch(function (e) {
      view.innerHTML = '<p>Could not load this page. If you opened the file directly, run a local server instead (books load via fetch).</p><pre>' + esc(String(e)) + '</pre>';
    });
  }

  function flashTerm(term) {
    var target = decodeURIComponent(term);
    var heads = view.querySelectorAll('.doc-page h2');
    Array.prototype.forEach.call(heads, function (h) {
      if (window.SIBE.slug(h.textContent) === window.SIBE.slug(target)) {
        h.classList.add('flash'); h.scrollIntoView({ block: 'start' });
      }
    });
  }

  /* ---------- reading progress bar ---------- */
  var bar = document.createElement('div');
  bar.id = 'progress-bar';
  document.body.appendChild(bar);
  window.addEventListener('scroll', function () {
    var h = document.documentElement;
    var scrolled = h.scrollTop / ((h.scrollHeight - h.clientHeight) || 1);
    bar.style.width = Math.min(100, Math.max(0, scrolled * 100)) + '%';
  }, { passive: true });

  /* ---------- theme ---------- */
  var themeBtn = document.getElementById('theme-toggle');
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    LS.setItem('theme', t);
  }
  var savedTheme = LS.getItem('theme');
  if (savedTheme) applyTheme(savedTheme);
  else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) applyTheme('dark');
  themeBtn.addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme');
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  });

  /* ---------- boot ---------- */
  window.addEventListener('hashchange', route);
  route();

  /* ---------- service worker ---------- */
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();
