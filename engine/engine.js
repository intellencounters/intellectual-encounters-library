/*
 * Serious Interactive Book Engine (SIBE)
 * A single parser shared by the reader (browser) and the validator (Node).
 * No external dependencies. Works in both environments.
 *
 * Public API (global.SIBE or module.exports):
 *   parseDocument(md)      -> { segments, errors, warnings, footnoteRefs, footnoteDefs, glossaryRefs }
 *   renderDocument(md,ctx) -> HTML string (uses the same parse)
 *   renderMarkdown(md,ctx) -> HTML string for a plain markdown fragment
 *   escapeHtml(s)          -> string
 *   COMPONENTS             -> array of known block component names
 */
(function (global) {
  'use strict';

  var COMPONENTS = [
    'argument', 'definition', 'evidence', 'timeline',
    'reflect', 'check', 'counter', 'case', 'uncertainty'
  ];

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function slug(s) {
    return String(s).toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Parse an opening fence line: :::name key="value" key2="value"
  function parseFence(line) {
    var m = /^:::([a-zA-Z]+)([ \t].*)?$/.exec(line);
    if (!m) return null;
    var name = m[1];
    var rest = (m[2] || '').trim();
    var attrs = {};
    var re = /([a-zA-Z]+)="([^"]*)"/g, a;
    while ((a = re.exec(rest)) !== null) attrs[a[1]] = a[2];
    return { name: name, attrs: attrs, rest: rest };
  }

  // Split a document into ordered segments. Component blocks are fenced at
  // column 0. Fenced code (```) is treated as literal prose so ::: inside it
  // is ignored.
  function parseDocument(md) {
    var lines = String(md).replace(/\r\n?/g, '\n').split('\n');
    var segments = [];
    var errors = [];
    var warnings = [];
    var compIndex = 0;

    var i = 0;
    var proseBuf = [];
    var inCode = false;

    function flushProse() {
      if (proseBuf.length) {
        segments.push({ type: 'markdown', text: proseBuf.join('\n') });
        proseBuf = [];
      }
    }

    while (i < lines.length) {
      var line = lines[i];

      // Toggle fenced code blocks so we don't misread ::: inside code.
      if (/^```/.test(line)) {
        inCode = !inCode;
        proseBuf.push(line);
        i++;
        continue;
      }
      if (inCode) { proseBuf.push(line); i++; continue; }

      // An inline glossary used on its own line is still prose; only treat as a
      // block-opening fence when the line does NOT also close on itself.
      var isFenceOpen = /^:::[a-zA-Z]+([ \t].*)?$/.test(line) && !/:::\s*$/.test(line.replace(/^:::[a-zA-Z]+/, ''));
      // The above is subtle; recompute cleanly:
      isFenceOpen = false;
      var fence = parseFence(line);
      if (fence && !(fence.name === 'glossary')) {
        // A component opening fence (not the inline glossary form).
        // Make sure it's not actually a self-closing inline like ":::x:::".
        if (!/:::\s*$/.test(line.slice(3))) isFenceOpen = true;
      }

      if (isFenceOpen) {
        flushProse();
        compIndex++;
        var name = fence.name;
        var attrs = fence.attrs;
        var bodyLines = [];
        var closed = false;
        var startLine = i + 1;
        i++;
        while (i < lines.length) {
          if (/^:::\s*$/.test(lines[i])) { closed = true; i++; break; }
          bodyLines.push(lines[i]);
          i++;
        }
        var seg = {
          type: 'component',
          name: name,
          attrs: attrs,
          body: bodyLines.join('\n'),
          index: compIndex,
          line: startLine
        };
        if (COMPONENTS.indexOf(name) === -1) {
          errors.push('component #' + compIndex + ' (line ' + startLine + '): unknown component "' + name + '"');
        }
        if (!closed) {
          errors.push('component #' + compIndex + ' ("' + name + '", line ' + startLine + '): block not closed before end of file');
        }
        validateComponent(seg, errors, warnings);
        segments.push(seg);
        continue;
      }

      proseBuf.push(line);
      i++;
    }
    flushProse();

    // Cross-cutting: collect footnote refs/defs and glossary refs from prose.
    var footnoteRefs = [];
    var footnoteDefs = [];
    var glossaryRefs = [];
    segments.forEach(function (s) {
      var text = s.type === 'markdown' ? s.text : s.body;
      if (!text) return;
      var reDef = /^\[\^([^\]]+)\]:/gm, d;
      while ((d = reDef.exec(text)) !== null) footnoteDefs.push(d[1]);
      var noDefs = text.replace(/^\[\^[^\]]+\]:.*$/gm, '');
      var reRef = /\[\^([^\]]+)\]/g, r;
      while ((r = reRef.exec(noDefs)) !== null) footnoteRefs.push(r[1]);
      var reG = /:::glossary\s+([^:]*?):::/g, g;
      while ((g = reG.exec(text)) !== null) {
        var am = /term="([^"]*)"/.exec(g[1]);
        if (am) glossaryRefs.push(am[1]);
      }
    });

    return {
      segments: segments,
      errors: errors,
      warnings: warnings,
      footnoteRefs: footnoteRefs,
      footnoteDefs: footnoteDefs,
      glossaryRefs: glossaryRefs
    };
  }

  function validateComponent(seg, errors, warnings) {
    var n = seg.name, b = (seg.body || '').trim(), a = seg.attrs, id = 'component #' + seg.index + ' ("' + n + '", line ' + seg.line + ')';
    function need(attr) {
      if (!a[attr] || !a[attr].length) errors.push(id + ': missing required attribute ' + attr + '="..."');
    }
    function needBody() {
      if (!b.length) errors.push(id + ': body is empty');
    }
    switch (n) {
      case 'argument': {
        var lines = (seg.body || '').split('\n');
        var concl = 0, prem = 0;
        lines.forEach(function (l) {
          if (/^\s*conclusion:/.test(l)) concl++;
          if (/^\s*premise:/.test(l)) prem++;
        });
        if (concl !== 1) errors.push(id + ': needs exactly one "conclusion:" line (found ' + concl + ')');
        if (prem < 1) errors.push(id + ': needs at least one "premise:" line');
        break;
      }
      case 'definition': need('term'); needBody(); break;
      case 'evidence': need('source'); needBody(); break;
      case 'counter': needBody(); break;
      case 'case': needBody(); break;
      case 'uncertainty':
        needBody();
        if (!/citation needed — verify before publishing/i.test(seg.body) &&
            /(\d{2,}%|\bstudies\b|\bsurvey\b)/i.test(seg.body)) {
          // soft nudge only
        }
        break;
      case 'reflect': needBody(); break;
      case 'timeline': {
        var tl = (seg.body || '').split('\n').filter(function (l) { return l.trim().length; });
        var valid = 0;
        tl.forEach(function (l) {
          if (/\|/.test(l)) valid++;
          else warnings.push(id + ': timeline line has no "date | event" pipe: ' + l.trim().slice(0, 40));
        });
        if (valid === 0) errors.push(id + ': timeline has no valid "date | event" lines');
        break;
      }
      case 'check': {
        var body = seg.body || '';
        if (!/^\s*question:/m.test(body)) errors.push(id + ': missing "question:"');
        var opts = (body.match(/^\s*-\s+.+$/gm) || []);
        if (opts.length < 2) errors.push(id + ': needs at least two "- option" lines (found ' + opts.length + ')');
        var am = /^\s*answer:\s*(\d+)\s*$/m.exec(body);
        if (!am) errors.push(id + ': missing or non-numeric "answer:"');
        else {
          var ai = parseInt(am[1], 10);
          if (ai < 1 || ai > opts.length) errors.push(id + ': "answer:" ' + ai + ' out of range 1..' + opts.length);
        }
        if (!/^\s*explanation:/m.test(body)) errors.push(id + ': missing "explanation:"');
        if (!a.reread) warnings.push(id + ': no reread="X.Y" pointer (recommended for wrong answers)');
        break;
      }
    }
  }

  /* ------------------------- INLINE MARKDOWN ------------------------- */

  function renderInline(text, ctx) {
    ctx = ctx || {};
    // Protect inline code spans first.
    var codeStore = [];
    text = text.replace(/`([^`]+)`/g, function (_, c) {
      codeStore.push('<code>' + escapeHtml(c) + '</code>');
      return ' C' + (codeStore.length - 1) + ' ';
    });

    // Escape everything else.
    text = escapeHtml(text);

    // Inline glossary: :::glossary term="X" text="Y":::  (attrs already escaped)
    text = text.replace(/:::glossary\s+([^:]*?):::/g, function (_, attrsRaw) {
      var term = /term=&quot;([^&]*?)&quot;/.exec(attrsRaw);
      var disp = /text=&quot;([^&]*?)&quot;/.exec(attrsRaw);
      var t = term ? term[1] : '';
      var label = disp ? disp[1] : t;
      var target = slug(t.replace(/&#39;/g, "'").replace(/&amp;/g, '&'));
      return '<a class="gloss" href="#/glossary/' + encodeURIComponent(target) +
        '" data-term="' + t + '" title="Glossary: ' + t + '">' + label + '</a>';
    });

    // Footnote references [^key] -> superscript link
    text = text.replace(/\[\^([^\]]+)\]/g, function (_, key) {
      var num = 0;
      if (ctx.footnoteOrder) {
        var idx = ctx.footnoteOrder.indexOf(key);
        num = idx >= 0 ? idx + 1 : '?';
      }
      return '<sup class="fnref" id="fnref-' + slug(key) + '">' +
        '<a href="#fn-' + slug(key) + '">' + num + '</a></sup>';
    });

    // Links [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, url) {
      var safe = /^(https?:|#|mailto:)/.test(url) ? url : '#';
      return '<a href="' + safe + '"' + (/^https?:/.test(safe) ? ' target="_blank" rel="noopener"' : '') + '>' + label + '</a>';
    });

    // Bold then italic (asterisks only)
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Restore code spans
    text = text.replace(/ C(\d+) /g, function (_, i) { return codeStore[+i]; });
    return text;
  }

  /* ------------------------- BLOCK MARKDOWN ------------------------- */

  function renderMarkdown(md, ctx) {
    ctx = ctx || {};
    var lines = String(md).replace(/\r\n?/g, '\n').split('\n');
    var out = [];
    var i = 0;

    function flushPara(buf) {
      if (buf.length) out.push('<p>' + renderInline(buf.join(' '), ctx) + '</p>');
    }

    while (i < lines.length) {
      var line = lines[i];

      // Skip footnote definitions here; they are rendered at the end.
      if (/^\[\^[^\]]+\]:/.test(line)) {
        // consume continuation (indented) lines too
        i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i])) i++;
        continue;
      }

      // Fenced code
      if (/^```/.test(line)) {
        var code = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) { code.push(lines[i]); i++; }
        i++;
        out.push('<pre><code>' + escapeHtml(code.join('\n')) + '</code></pre>');
        continue;
      }

      // Headings
      var h = /^(#{1,6})\s+(.*)$/.exec(line);
      if (h) {
        var level = h[1].length;
        var htext = renderInline(h[2].trim(), ctx);
        var hid = slug(h[2]);
        out.push('<h' + level + ' id="sec-' + hid + '">' + htext + '</h' + level + '>');
        i++;
        continue;
      }

      // Blockquote
      if (/^>\s?/.test(line)) {
        var q = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, '')); i++; }
        out.push('<blockquote>' + renderMarkdown(q.join('\n'), ctx) + '</blockquote>');
        continue;
      }

      // Tables (pipe)
      if (/^\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
        var header = line.trim().replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); });
        i += 2;
        var rows = [];
        while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) {
          rows.push(lines[i].trim().replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); }));
          i++;
        }
        var t = '<table><thead><tr>' + header.map(function (c) { return '<th>' + renderInline(c, ctx) + '</th>'; }).join('') + '</tr></thead><tbody>';
        rows.forEach(function (r) {
          t += '<tr>' + r.map(function (c) { return '<td>' + renderInline(c, ctx) + '</td>'; }).join('') + '</tr>';
        });
        t += '</tbody></table>';
        out.push(t);
        continue;
      }

      // Unordered list
      if (/^\s*[-*]\s+/.test(line)) {
        var items = [];
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*[-*]\s+/, '')); i++;
        }
        out.push('<ul>' + items.map(function (it) { return '<li>' + renderInline(it, ctx) + '</li>'; }).join('') + '</ul>');
        continue;
      }

      // Ordered list
      if (/^\s*\d+\.\s+/.test(line)) {
        var oitems = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          oitems.push(lines[i].replace(/^\s*\d+\.\s+/, '')); i++;
        }
        out.push('<ol>' + oitems.map(function (it) { return '<li>' + renderInline(it, ctx) + '</li>'; }).join('') + '</ol>');
        continue;
      }

      // Blank line
      if (/^\s*$/.test(line)) { i++; continue; }

      // Paragraph (gather until blank or block start)
      var para = [];
      while (i < lines.length && !/^\s*$/.test(lines[i]) &&
             !/^(#{1,6})\s/.test(lines[i]) && !/^>\s?/.test(lines[i]) &&
             !/^```/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i]) &&
             !/^\s*\d+\.\s+/.test(lines[i]) && !/^\[\^[^\]]+\]:/.test(lines[i]) &&
             !(/^\|.*\|\s*$/.test(lines[i]))) {
        para.push(lines[i]); i++;
      }
      flushPara(para);
    }
    return out.join('\n');
  }

  /* ------------------------- COMPONENT RENDERING ------------------------- */

  function parseKeyed(body, keys) {
    // Extract leading "key: value" lines (values may wrap onto indented lines).
    var lines = body.split('\n');
    var result = {};
    var order = [];
    var current = null;
    lines.forEach(function (l) {
      var m = /^\s*([a-zA-Z]+):\s?(.*)$/.exec(l);
      if (m && keys.indexOf(m[1]) !== -1) {
        current = m[1];
        if (m[1] === 'premise') {
          result.premise = result.premise || [];
          result.premise.push(m[2]);
          order.push({ k: 'premise', i: result.premise.length - 1 });
        } else {
          result[current] = m[2];
          order.push({ k: current });
        }
      } else if (current && /^\s+\S/.test(l)) {
        // continuation
        if (current === 'premise') {
          var arr = result.premise;
          arr[arr.length - 1] += ' ' + l.trim();
        } else {
          result[current] += ' ' + l.trim();
        }
      }
    });
    return result;
  }

  function renderComponent(seg, ctx) {
    var a = seg.attrs || {};
    var n = seg.name;
    function attr(name) { return a[name] ? escapeHtml(a[name]) : ''; }

    if (COMPONENTS.indexOf(n) === -1) {
      return '<div class="author-error">Author error: unknown component &quot;' + escapeHtml(n) + '&quot;</div>';
    }

    switch (n) {
      case 'argument': {
        var k = parseKeyed(seg.body, ['conclusion', 'premise']);
        var html = '<aside class="c-argument">';
        html += '<div class="c-label">Argument' + (a.title ? ' · ' + attr('title') : '') + '</div>';
        if (k.premise && k.premise.length) {
          html += '<ol class="premises">';
          k.premise.forEach(function (p) { html += '<li>' + renderInline(p, ctx) + '</li>'; });
          html += '</ol>';
        }
        html += '<div class="conclusion"><span class="therefore">∴</span> ' +
          renderInline(k.conclusion || '', ctx) + '</div>';
        html += '</aside>';
        return html;
      }
      case 'definition':
        return '<aside class="c-definition"><div class="c-label">Definition</div>' +
          '<div class="term">' + attr('term') + '</div>' +
          '<div class="body">' + renderMarkdown(seg.body, ctx) + '</div></aside>';
      case 'evidence':
        return '<aside class="c-evidence"><div class="c-label">Evidence</div>' +
          '<div class="body">' + renderMarkdown(seg.body, ctx) + '</div>' +
          '<div class="source">Source: ' + attr('source') + '</div></aside>';
      case 'counter':
        return '<aside class="c-counter"><div class="c-label">Counterargument' +
          (a.title ? ' · ' + attr('title') : '') + '</div>' +
          (a.to ? '<div class="responds-to">In response to: ' + attr('to') + '</div>' : '') +
          '<div class="body">' + renderMarkdown(seg.body, ctx) + '</div></aside>';
      case 'case':
        return '<aside class="c-case"><div class="c-label">Case' + (a.title ? ' · ' + attr('title') : '') + '</div>' +
          '<div class="body">' + renderMarkdown(seg.body, ctx) + '</div></aside>';
      case 'uncertainty':
        return '<aside class="c-uncertainty"><div class="c-label">Open question' +
          (a.title ? ' · ' + attr('title') : '') + '</div>' +
          '<div class="body">' + renderMarkdown(seg.body, ctx) + '</div></aside>';
      case 'timeline': {
        var rows = seg.body.split('\n').filter(function (l) { return l.trim() && /\|/.test(l); });
        var h = '<aside class="c-timeline"><div class="c-label">Timeline' + (a.title ? ' · ' + attr('title') : '') + '</div><dl>';
        rows.forEach(function (l) {
          var idx = l.indexOf('|');
          var date = l.slice(0, idx).trim();
          var event = l.slice(idx + 1).trim();
          h += '<dt>' + renderInline(date, ctx) + '</dt><dd>' + renderInline(event, ctx) + '</dd>';
        });
        h += '</dl></aside>';
        return h;
      }
      case 'reflect':
        return '<aside class="c-reflect"><div class="c-label">Reflect</div>' +
          '<div class="body">' + renderMarkdown(seg.body, ctx) + '</div>' +
          '<textarea class="reflect-input" data-reflect="' + slug((seg.body || '').slice(0, 40)) +
          '" placeholder="Your notes (saved only in this browser)…"></textarea></aside>';
      case 'check': {
        var body = seg.body || '';
        var qm = /^\s*question:\s?(.*)$/m.exec(body);
        var question = qm ? qm[1] : '';
        var opts = [];
        body.split('\n').forEach(function (l) {
          var om = /^\s*-\s+(.*)$/.exec(l);
          if (om) opts.push(om[1]);
        });
        var am = /^\s*answer:\s*(\d+)\s*$/m.exec(body);
        var answer = am ? parseInt(am[1], 10) : 0;
        var em = /^\s*explanation:\s?([\s\S]*?)$/m.exec(body);
        var explanation = '';
        if (em) {
          // explanation may wrap onto following indented lines until end
          var afterIdx = body.indexOf(em[0]);
          explanation = body.slice(afterIdx).replace(/^\s*explanation:\s?/, '').trim();
        }
        var cid = 'chk-' + slug(question.slice(0, 30)) + '-' + seg.index;
        var h = '<div class="c-check" data-answer="' + answer + '" data-reread="' + (a.reread ? escapeHtml(a.reread) : '') + '" id="' + cid + '">';
        h += '<div class="c-label">Check your understanding</div>';
        h += '<p class="q">' + renderInline(question, ctx) + '</p>';
        h += '<div class="opts">';
        opts.forEach(function (o, idx) {
          h += '<button class="opt" data-i="' + (idx + 1) + '">' + renderInline(o, ctx) + '</button>';
        });
        h += '</div>';
        h += '<div class="feedback" hidden></div>';
        h += '<div class="explanation" hidden>' + renderInline(explanation, ctx) + '</div>';
        h += '</div>';
        return h;
      }
    }
    return '';
  }

  /* ------------------------- FOOTNOTES ------------------------- */

  function collectFootnotes(md) {
    var order = [];
    var defs = {};
    var lines = String(md).replace(/\r\n?/g, '\n').split('\n');
    // order of first reference
    var noDef = lines.filter(function (l) { return !/^\[\^[^\]]+\]:/.test(l); }).join('\n');
    var re = /\[\^([^\]]+)\]/g, m;
    while ((m = re.exec(noDef)) !== null) { if (order.indexOf(m[1]) === -1) order.push(m[1]); }
    // definitions
    var i = 0;
    while (i < lines.length) {
      var dm = /^\[\^([^\]]+)\]:\s?(.*)$/.exec(lines[i]);
      if (dm) {
        var key = dm[1], val = dm[2];
        i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i])) { val += ' ' + lines[i].trim(); i++; }
        defs[key] = val;
      } else i++;
    }
    return { order: order, defs: defs };
  }

  function renderDocument(md, ctx) {
    ctx = ctx || {};
    var fn = collectFootnotes(md);
    ctx.footnoteOrder = fn.order;
    var parsed = parseDocument(md);
    var html = parsed.segments.map(function (s) {
      if (s.type === 'markdown') return renderMarkdown(s.text, ctx);
      return renderComponent(s, ctx);
    }).join('\n');

    if (fn.order.length) {
      html += '<section class="footnotes"><hr><ol>';
      fn.order.forEach(function (key) {
        html += '<li id="fn-' + slug(key) + '">' + renderInline(fn.defs[key] || '(missing definition)', ctx) +
          ' <a class="fnback" href="#fnref-' + slug(key) + '">↩</a></li>';
      });
      html += '</ol></section>';
    }
    return html;
  }

  var SIBE = {
    parseDocument: parseDocument,
    renderDocument: renderDocument,
    renderMarkdown: renderMarkdown,
    renderInline: renderInline,
    collectFootnotes: collectFootnotes,
    escapeHtml: escapeHtml,
    slug: slug,
    COMPONENTS: COMPONENTS
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = SIBE;
  else global.SIBE = SIBE;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
