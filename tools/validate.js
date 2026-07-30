#!/usr/bin/env node
/*
 * Validator for the Serious Interactive Book Engine.
 * Uses the exact parser the reader uses (engine/engine.js).
 *
 *   node tools/validate.js books/<book-id>   # validate one book
 *   node tools/validate.js                    # validate every registered book
 *
 * Exit 0 = no errors (warnings allowed); exit 1 = errors found.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const SIBE = require('../engine/engine.js');

const ROOT = path.resolve(__dirname, '..');
const BOOKS_DIR = path.join(ROOT, 'books');

function read(p) { return fs.readFileSync(p, 'utf8'); }
function exists(p) { try { fs.accessSync(p); return true; } catch (e) { return false; } }

function parseGlossary(md) {
  const terms = [];
  md.split('\n').forEach(l => {
    const m = /^##\s+(.+?)\s*$/.exec(l);
    if (m) terms.push(m[1].trim());
  });
  return terms;
}

function validateBook(bookId) {
  const dir = path.join(BOOKS_DIR, bookId);
  const errors = [];
  const warnings = [];
  const tag = (f, msg) => `[${bookId}/${f}] ${msg}`;

  if (!exists(dir)) { return { errors: [`[${bookId}] directory not found`], warnings: [] }; }
  const bookJsonPath = path.join(dir, 'book.json');
  if (!exists(bookJsonPath)) { return { errors: [`[${bookId}] book.json missing`], warnings: [] }; }

  let book;
  try { book = JSON.parse(read(bookJsonPath)); }
  catch (e) { return { errors: [`[${bookId}] book.json is not valid JSON: ${e.message}`], warnings: [] }; }

  ['id', 'title', 'author', 'subject'].forEach(f => {
    if (!book[f] || !String(book[f]).length) errors.push(tag('book.json', `missing required field "${f}"`));
  });
  if (book.id && book.id !== bookId) errors.push(tag('book.json', `id "${book.id}" must equal directory name "${bookId}"`));
  if (!Array.isArray(book.chapters) || !book.chapters.length) {
    errors.push(tag('book.json', 'chapters must be a non-empty array'));
    return { errors, warnings };
  }

  // Glossary terms
  let glossaryTerms = [];
  if (book.glossary) {
    const gp = path.join(dir, book.glossary);
    if (!exists(gp)) errors.push(tag('book.json', `glossary file "${book.glossary}" not found`));
    else {
      glossaryTerms = parseGlossary(read(gp)).map(t => t.toLowerCase());
      if (!glossaryTerms.length) warnings.push(tag(book.glossary, 'no "## Term" entries found'));
    }
  }
  if (book.citations) {
    const cp = path.join(dir, book.citations);
    if (!exists(cp)) errors.push(tag('book.json', `citations file "${book.citations}" not found`));
  }

  const seenIds = new Set();
  book.chapters.forEach(ch => {
    if (!ch.id || !ch.file || !ch.title) {
      errors.push(tag('book.json', `chapter entry missing id/file/title: ${JSON.stringify(ch)}`));
      return;
    }
    if (seenIds.has(ch.id)) errors.push(tag('book.json', `duplicate chapter id "${ch.id}"`));
    seenIds.add(ch.id);
    const fp = path.join(dir, ch.file);
    if (!exists(fp)) { errors.push(tag('book.json', `chapter file "${ch.file}" not found`)); return; }

    const md = read(fp);
    const parsed = SIBE.parseDocument(md);
    parsed.errors.forEach(e => errors.push(tag(ch.file, e)));
    parsed.warnings.forEach(w => warnings.push(tag(ch.file, w)));

    // Footnotes: every ref needs a def; unused defs are warnings.
    const fn = SIBE.collectFootnotes(md);
    parsed.footnoteRefs.forEach(k => {
      if (!fn.defs.hasOwnProperty(k)) errors.push(tag(ch.file, `footnote [^${k}] has no definition`));
    });
    Object.keys(fn.defs).forEach(k => {
      if (parsed.footnoteRefs.indexOf(k) === -1) warnings.push(tag(ch.file, `footnote definition [^${k}] is never referenced`));
    });

    // Glossary inline refs must match a glossary entry (case-insensitive).
    parsed.glossaryRefs.forEach(t => {
      if (glossaryTerms.indexOf(t.toLowerCase()) === -1) {
        errors.push(tag(ch.file, `inline glossary term "${t}" has no matching "## ${t}" entry in glossary`));
      }
    });

    // Baseline: at least two checks and one reflect per chapter (warning).
    const checks = parsed.segments.filter(s => s.type === 'component' && s.name === 'check').length;
    const reflects = parsed.segments.filter(s => s.type === 'component' && s.name === 'reflect').length;
    if (checks < 2) warnings.push(tag(ch.file, `only ${checks} :::check block(s); baseline is 2`));
    if (reflects < 1) warnings.push(tag(ch.file, `no :::reflect block; baseline is 1`));
  });

  return { errors, warnings };
}

function main() {
  const args = process.argv.slice(2);
  let bookIds = [];
  if (args.length) {
    bookIds = args.map(a => a.replace(/^books\//, '').replace(/\/$/, ''));
  } else {
    const idxPath = path.join(BOOKS_DIR, 'index.json');
    if (!exists(idxPath)) { console.error('books/index.json not found'); process.exit(1); }
    bookIds = JSON.parse(read(idxPath)).books || [];
  }

  let totalErrors = 0, totalWarnings = 0;
  bookIds.forEach(id => {
    const { errors, warnings } = validateBook(id);
    totalErrors += errors.length;
    totalWarnings += warnings.length;
    if (errors.length || warnings.length) {
      console.log(`\n=== ${id} ===`);
      errors.forEach(e => console.log('  ERROR   ' + e));
      warnings.forEach(w => console.log('  warning ' + w));
    } else {
      console.log(`\n=== ${id} ===  OK (clean)`);
    }
  });

  console.log(`\n${bookIds.length} book(s): ${totalErrors} error(s), ${totalWarnings} warning(s).`);
  process.exit(totalErrors ? 1 : 0);
}

main();
