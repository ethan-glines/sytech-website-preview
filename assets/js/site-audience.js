/* =====================================================================
   INDUSTRY PICKER
   ---------------------------------------------------------------------
   - First visit: a centered pop-up asks which industry the visitor is in.
   - Picking one swaps every tagged line (data-aud="key") to that
     industry's wording from assets/js/audience-copy.js. Layout never
     changes. "Just browsing" keeps the normal site.
   - The choice is remembered across pages and visits, and shown in the
     menu ("Viewing: ..."), which reopens the pop-up to switch.
   - Shareable link: add ?for=schools to any page URL to open the site
     already tailored (or ?for=general to reset).
   - On each industry page (School Districts, Natural Resources), visitors
     in a different mode get a small offer to tailor the whole site.

   Loaded automatically by site-chrome.js on every page. Only industries
   marked ready: true can be picked; the rest show "Coming soon".
   ===================================================================== */
(function () {
  'use strict';

  var STORE_KEY = 'sytech-industry';
  var GENERAL = 'general';
  var ICONS = {
    'schools':           '<path d="M3 21h18M5 21V10l7-5 7 5v11M10 21v-5h4v5M12 5V2.5l3 1-3 1"/>',
    'natural-resources': '<path d="M12 3c3.5 4.2 6 7.6 6 10.5a6 6 0 0 1-12 0C6 10.6 8.5 7.2 12 3z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
    'cities':            '<path d="M3 21h18M5 21V9h5v12M10 21V4h6v17M16 21v-8h3v8M7 12h1M7 15h1M12.5 7h1M12.5 10h1M12.5 13h1"/>',
    'special-districts': '<path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
    'counties':          '<path d="M3 21h18M4 18h16M4 10h16M12 3l9 5H3l9-5zM6 10v8M10 10v8M14 10v8M18 10v8"/>',
    'hhs':               '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'
  };
  var INDUSTRIES = [
    { id: 'schools',           label: 'School Districts',          short: 'Schools', ready: true  },
    { id: 'natural-resources', label: 'Natural Resources',         ready: true  },
    { id: 'cities',            label: 'Cities',                    ready: false },
    { id: 'special-districts', label: 'Special Districts',         ready: false },
    { id: 'counties',          label: 'Counties',                  ready: false },
    { id: 'hhs',               label: 'Health & Human Services',   ready: false }
  ];
  function icon(id, size) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[id] || '') + '</svg>';
  }
  // Words accepted in ?for= links, mapped to an industry id.
  var URL_ALIASES = { 'schools': 'schools', 'school-districts': 'schools', 'k12': 'schools',
                      'natural-resources': 'natural-resources', 'naturalresources': 'natural-resources',
                      'resources': 'natural-resources', 'water': 'natural-resources',
                      'general': GENERAL, 'all': GENERAL };
  // Each industry's own page offers to tailor the whole site to that industry.
  var INDUSTRY_PAGES = { 'school-districts.html': 'schools', 'natural-resources.html': 'natural-resources' };
  // Pages that ask about the visitor's organization themselves skip the first-visit pop-up.
  var NO_POPUP_PAGES = { 'right-partner.html': true, 'pre-meeting.html': true };
  var SUGGEST_TEXT = { 'schools': 'Want the whole site tailored to school districts?',
                       'natural-resources': 'Want the whole site tailored to resource agencies?' };

  var COPY = window.SYTECH_AUDIENCE_COPY || {};
  var page = location.pathname.split('/').pop() || 'index.html';
  if (page.indexOf('.') === -1) page += '.html';

  function readStore() { try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; } }
  function writeStore(v) { try { localStorage.setItem(STORE_KEY, v); } catch (e) {} }
  function isReady(id) {
    if (id === GENERAL) return true;
    for (var i = 0; i < INDUSTRIES.length; i++) if (INDUSTRIES[i].id === id) return INDUSTRIES[i].ready;
    return false;
  }
  function labelFor(id) {
    for (var i = 0; i < INDUSTRIES.length; i++) if (INDUSTRIES[i].id === id) return INDUSTRIES[i].label;
    return 'All Agencies';
  }
  function shortLabelFor(id) {
    for (var i = 0; i < INDUSTRIES.length; i++) if (INDUSTRIES[i].id === id) return INDUSTRIES[i].short || INDUSTRIES[i].label;
    return 'All Agencies';
  }
  function urlChoice() {
    var m = /[?&]for=([^&#]+)/.exec(location.search);
    if (!m) return null;
    var id = URL_ALIASES[decodeURIComponent(m[1]).toLowerCase()];
    return id && isReady(id) ? id : null;
  }

  var current = GENERAL;

  /* ---------- Swap the text ---------- */
  function apply(id) {
    current = id;
    var lines = (COPY[id]) || {};
    var els = document.querySelectorAll('[data-aud]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.__audOriginal === undefined) el.__audOriginal = el.innerHTML;
      var t = lines[el.getAttribute('data-aud')];
      el.innerHTML = (id !== GENERAL && typeof t === 'string') ? t : el.__audOriginal;
    }
    // Form hint text
    var hints = document.querySelectorAll('[data-aud-placeholder]');
    for (var h = 0; h < hints.length; h++) {
      var f = hints[h];
      if (f.__audOriginal === undefined) f.__audOriginal = f.getAttribute('placeholder') || '';
      var ph = lines[f.getAttribute('data-aud-placeholder')];
      f.setAttribute('placeholder', (id !== GENERAL && typeof ph === 'string') ? ph : f.__audOriginal);
    }
    // Dropdowns: pre-select the industry's option, but never override a
    // choice the visitor made themselves.
    var sels = document.querySelectorAll('select[data-aud-select]');
    for (var d = 0; d < sels.length; d++) {
      var sel = sels[d], want = lines[sel.getAttribute('data-aud-select')];
      if (id !== GENERAL && typeof want === 'string' && sel.value === '') {
        for (var o = 0; o < sel.options.length; o++) {
          if (sel.options[o].text === want) { sel.selectedIndex = o; sel.__audAuto = sel.value; break; }
        }
      } else if (id === GENERAL && sel.__audAuto && sel.value === sel.__audAuto) {
        sel.selectedIndex = 0; sel.__audAuto = null;
      }
    }
    // Lists that put this industry's items first (original order restored
    // for other modes).
    var lists = document.querySelectorAll('[data-aud-first]');
    for (var l = 0; l < lists.length; l++) {
      var box = lists[l];
      if (!box.__audOrder) box.__audOrder = Array.prototype.slice.call(box.children);
      var first = [], rest = [];
      box.__audOrder.forEach(function (child) {
        var tags = (child.getAttribute('data-aud-tags') || '').split(/\s+/);
        var firstFor = (box.getAttribute('data-aud-first') || '').split(/\s+/);
        (firstFor.indexOf(id) !== -1 && tags.indexOf(id) !== -1 ? first : rest).push(child);
      });
      first.concat(rest).forEach(function (child) { box.appendChild(child); });
    }
    document.documentElement.setAttribute('data-industry', id);
    updateIndicators();
    updateSuggest();
    reveal();
  }
  function reveal() {
    var s = document.getElementById('aud-prehide');
    if (s) s.parentNode.removeChild(s);
  }
  function choose(id) {
    var before = [];
    var els = document.querySelectorAll('[data-aud]');
    for (var i = 0; i < els.length; i++) before.push(els[i].innerHTML);
    writeStore(id);
    apply(id);
    closeModal();
    if (id === GENERAL) return;
    // Payoff: lines that just changed glow gold for a moment...
    for (var j = 0; j < els.length; j++) {
      if (els[j].innerHTML !== before[j]) {
        els[j].classList.remove('aud-flash'); void els[j].offsetWidth; els[j].classList.add('aud-flash');
      }
    }
    // ...and a short confirmation slides up.
    toast('Done! The site is now tailored for <strong>' + labelFor(id).replace('&', '&amp;') + '</strong>.');
  }
  var toastEl = null, toastTimer = null;
  function toast(html) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'aud-toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg><span>' + html + ' Change it anytime from the menu.</span>';
    toastEl.classList.remove('is-shown'); void toastEl.offsetWidth; toastEl.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-shown'); }, 4500);
  }

  /* ---------- Styles (scoped to .aud-*, removed with this file) ---------- */
  var css = [
    '.aud-overlay{position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(16,28,44,0.5);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);opacity:0;transition:opacity .3s ease}',
    '.aud-overlay.is-open{opacity:1}',
    '.aud-dialog{position:relative;display:grid;grid-template-columns:minmax(0,0.92fr) minmax(0,1.08fr);width:100%;max-width:880px;max-height:calc(100vh - 32px);overflow:auto;background:#fff;border-radius:16px;box-shadow:0 30px 80px rgba(0,0,0,0.45);font-family:inherit;transform:translateY(18px) scale(.97);transition:transform .45s cubic-bezier(.2,.8,.2,1)}',
    '.aud-overlay.is-open .aud-dialog{transform:none}',
    /* left: the promise */
    '.aud-side{position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:center;padding:2.75rem 2.5rem;color:#fff;background:linear-gradient(160deg,var(--deep-navy,#1a2c42) 0%,var(--navy,#25426B) 70%,#2d5080 100%)}',
    '.aud-side::before{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,0.07) 1px,transparent 1px);background-size:22px 22px;pointer-events:none}',
    '.aud-side::after{content:"";position:absolute;width:320px;height:320px;right:-140px;bottom:-140px;border-radius:50%;border:2px solid rgba(229,166,48,0.28);box-shadow:0 0 0 28px rgba(229,166,48,0.05),0 0 0 56px rgba(229,166,48,0.025);pointer-events:none}',
    '.aud-side > *{position:relative;z-index:1}',
    '.aud-eyebrow{display:inline-block;font-size:.68rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--gold,#E5A630);margin-bottom:.9rem}',
    '.aud-side h2{font-size:clamp(1.6rem,3vw,2.15rem);line-height:1.15;font-weight:700;letter-spacing:-0.01em;color:#fff;margin:0 0 .9rem}',
    '.aud-side h2 span{color:var(--gold,#E5A630)}',
    '.aud-side p{font-size:1rem;line-height:1.6;color:rgba(255,255,255,0.8);margin:0}',
    '.aud-perks{list-style:none;margin:0;padding:0;display:grid;gap:.7rem}',
    '.aud-perks li{display:flex;align-items:flex-start;gap:.65rem;font-size:.92rem;line-height:1.45;color:rgba(255,255,255,0.92)}',
    '.aud-perks svg{flex-shrink:0;margin-top:.1rem;color:var(--gold,#E5A630)}',
    /* right: the choice */
    '.aud-main{padding:2.25rem 2rem 1.75rem;display:flex;flex-direction:column}',
    '.aud-ask{font-size:1.05rem;font-weight:700;color:var(--navy,#25426B);margin:0 0 1rem}',
    '.aud-grid{display:grid;grid-template-columns:1fr;gap:.7rem;margin:0 0 1.5rem;padding:0;list-style:none}',
    '.aud-grid li:first-child{grid-column:1 / -1}',
    '.aud-soon-head{margin:0 0 .6rem;text-align:center;font-size:.66rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#8a96a4}',
    '.aud-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:.45rem;margin:0 0 1.4rem;padding:0;list-style:none}',
    '.aud-opt.aud-chip{width:auto;height:auto;gap:.4rem;padding:.4rem .7rem;border-radius:999px;font-size:.78rem;font-weight:700;border-width:1px}',
    '.aud-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
    '.aud-opt{position:relative;width:100%;height:100%;display:flex;align-items:center;gap:.75rem;text-align:left;font:inherit;font-size:.92rem;font-weight:700;line-height:1.25;color:var(--navy,#25426B);background:#fff;border:1.5px solid rgba(37,66,107,0.14);border-radius:12px;padding:.85rem .9rem;cursor:pointer;transition:transform .25s ease,box-shadow .25s ease,border-color .25s ease,background .25s ease}',
    '.aud-ico{flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:10px;background:rgba(37,66,107,0.06);color:var(--navy,#25426B);transition:background .25s ease,color .25s ease}',
    '.aud-opt-text{display:flex;flex-direction:column;gap:.15rem}',
    '.aud-soon{font-size:.62rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#8a96a4}',
    /* the ready option is the hero of the grid */
    '.aud-opt.is-ready{padding:1.35rem 1.2rem;font-size:1.15rem;border-color:var(--gold,#E5A630);background:linear-gradient(135deg,rgba(229,166,48,0.14),rgba(229,166,48,0.03));box-shadow:0 6px 18px rgba(229,166,48,0.18)}',
    '.aud-opt.is-ready .aud-ico{width:50px;height:50px;background:var(--gold,#E5A630);color:var(--deep-navy,#1a2c42)}',
    '.aud-ready-tag{font-size:.64rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#8a5a0c}',
    '.aud-go{margin-left:auto;display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:var(--navy,#25426B);color:#fff;transition:transform .25s ease}',
    '@media (hover:hover) and (pointer:fine){.aud-opt.is-ready:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(229,166,48,0.32)}.aud-opt.is-ready:hover .aud-go{transform:translateX(3px)}}',
    '.aud-opt:disabled{cursor:default;color:#7c8896;background:#F7F8FA;border-color:rgba(37,66,107,0.08)}',
    '.aud-opt:disabled .aud-ico{color:#9aa6b4;background:rgba(37,66,107,0.04)}',
    '.aud-opt[aria-pressed="true"]{outline:2px solid var(--navy,#25426B);outline-offset:2px}',
    '.aud-opt:focus-visible,.aud-skip:focus-visible,.aud-close:focus-visible,.aud-pill:focus-visible,.aud-suggest button:focus-visible{outline:3px solid var(--gold,#E5A630);outline-offset:2px}',
    '.aud-skip{align-self:center;margin-top:auto;font:inherit;font-size:.85rem;color:#6b7785;background:none;border:none;text-decoration:underline;text-underline-offset:3px;padding:.2rem 0;cursor:pointer}',
    '.aud-skip:hover{color:var(--navy,#25426B)}',
    '.aud-close{position:absolute;z-index:2;top:.75rem;right:.75rem;width:36px;height:36px;border:none;background:rgba(37,66,107,0.06);font-size:1.35rem;line-height:1;color:#6b7785;cursor:pointer;border-radius:50%}',
    '.aud-close:hover{color:var(--navy,#25426B);background:rgba(37,66,107,0.12)}',
    /* entrance: cards arrive one after another */
    '@keyframes aud-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}',
    '.aud-overlay.is-open .aud-grid li{animation:aud-rise .45s cubic-bezier(.2,.8,.2,1) both}',
    '.aud-overlay.is-open .aud-grid li:nth-child(1){animation-delay:.12s}.aud-overlay.is-open .aud-grid li:nth-child(2){animation-delay:.18s}.aud-overlay.is-open .aud-grid li:nth-child(3){animation-delay:.22s}.aud-overlay.is-open .aud-grid li:nth-child(4){animation-delay:.26s}.aud-overlay.is-open .aud-grid li:nth-child(5){animation-delay:.30s}.aud-overlay.is-open .aud-grid li:nth-child(6){animation-delay:.34s}',
    '.aud-overlay.is-open .aud-chips li{animation:aud-rise .45s cubic-bezier(.2,.8,.2,1) .3s both}',
    '.aud-overlay.is-open .aud-perks li{animation:aud-rise .45s cubic-bezier(.2,.8,.2,1) both}',
    '.aud-overlay.is-open .aud-perks li:nth-child(1){animation-delay:.25s}.aud-overlay.is-open .aud-perks li:nth-child(2){animation-delay:.35s}.aud-overlay.is-open .aud-perks li:nth-child(3){animation-delay:.45s}',
    /* payoff: changed lines glow, then a confirmation */
    '@keyframes aud-glow{0%{background-color:rgba(229,166,48,0.38);box-shadow:0 0 0 6px rgba(229,166,48,0.38)}100%{background-color:rgba(229,166,48,0);box-shadow:0 0 0 6px rgba(229,166,48,0)}}',
    '.aud-flash{animation:aud-glow 2.2s ease-out 1;border-radius:4px}',
    '.aud-toast{position:fixed;z-index:2001;left:50%;bottom:24px;display:flex;align-items:center;gap:.6rem;max-width:calc(100vw - 32px);padding:.85rem 1.2rem;border-radius:12px;background:var(--deep-navy,#1a2c42);color:#fff;font-size:.92rem;line-height:1.4;box-shadow:0 14px 36px rgba(0,0,0,0.3);border-left:4px solid var(--gold,#E5A630);opacity:0;transform:translate(-50%,16px);transition:opacity .35s ease,transform .35s ease;pointer-events:none}',
    '.aud-toast.is-shown{opacity:1;transform:translate(-50%,0)}',
    '.aud-toast svg{flex-shrink:0;color:var(--gold,#E5A630)}',
    'body.aud-lock{overflow:hidden}',
    /* menu indicator: pill on desktop, a row inside the menu on phones */
    '.aud-pill{display:inline-flex;align-items:center;gap:.35rem;margin-right:.9rem;font:inherit;font-size:.74rem;line-height:1.2;color:var(--navy,#25426B);background:#fff;border:1px solid rgba(229,166,48,0.8);border-radius:999px;padding:.35rem .75rem;cursor:pointer;white-space:nowrap}',
    '.aud-pill strong{font-weight:700}',
    '.aud-pill:hover{background:rgba(229,166,48,0.10)}',
    '.aud-pill svg{flex-shrink:0}',
    '.aud-navrow{display:none}',
    '.aud-pill-short{display:none}',
    /* desktop: a small tab hanging from the bottom-right of the menu bar,
       aligned under the menu's right edge (JS sets "right"), so it takes
       no space from the menu links */
    '#nav > .aud-tab{position:absolute;top:100%;margin:0;border-top:none;border-radius:0 0 10px 10px;padding:.35rem .85rem .4rem;box-shadow:0 4px 12px rgba(37,66,107,0.12);z-index:1}',
    '@media (max-width:800px){#nav > .aud-tab{display:none}.aud-navrow{display:block}.aud-navrow{padding:.75rem 2rem .25rem}.aud-navrow .aud-pill{margin:0;font-size:.85rem}}',
    /* Industry page offer */
    '.aud-suggest{background:rgba(229,166,48,0.10);border-bottom:1px solid rgba(229,166,48,0.35)}',
    '.aud-suggest .container{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:.75rem 1.25rem;padding-top:1rem;padding-bottom:1rem;text-align:center}',
    '.aud-suggest p{margin:0;font-size:.95rem;font-weight:700;color:var(--navy,#25426B)}',
    '.aud-suggest .aud-yes{font:inherit;font-size:.88rem;font-weight:700;color:var(--deep-navy,#1a2c42);background:var(--gold,#E5A630);border:none;border-radius:6px;padding:.55rem 1.1rem;cursor:pointer}',
    '.aud-suggest .aud-no{font:inherit;font-size:.85rem;color:var(--text-body,#3d4f5f);background:none;border:none;text-decoration:underline;cursor:pointer}',
    '@media (max-width:760px){.aud-dialog{grid-template-columns:1fr;max-width:520px}.aud-side{padding:1.75rem 1.5rem 1.5rem}.aud-side p{margin-bottom:1rem}.aud-perks{display:none}.aud-main{padding:1.5rem 1.25rem 1.25rem}}',
    '@media (prefers-reduced-motion:reduce){.aud-overlay,.aud-dialog,.aud-toast{transition:none}.aud-overlay.is-open .aud-grid li,.aud-overlay.is-open .aud-chips li,.aud-overlay.is-open .aud-perks li,.aud-flash{animation:none}}'
  ].join('\n');
  var styleEl = document.createElement('style');
  styleEl.id = 'aud-styles';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ---------- Pop-up ---------- */
  var overlay = null, lastFocus = null;

  function buildModal() {
    overlay = document.createElement('div');
    overlay.className = 'aud-overlay';
    var ready = INDUSTRIES.filter(function (ind) { return ind.ready; });
    var soon = INDUSTRIES.filter(function (ind) { return !ind.ready; });
    var chips = soon.map(function (ind) {
      return '<li><button type="button" class="aud-opt aud-chip" data-id="' + ind.id + '" disabled aria-disabled="true">' +
        icon(ind.id, 16) + '<span>' + ind.label.replace('&', '&amp;') + '<span class="aud-sr"> (coming soon)</span></span></button></li>';
    }).join('');
    var opts = ready.map(function (ind) {
      var label = ind.label.replace('&', '&amp;');
      if (ind.ready) {
        return '<li><button type="button" class="aud-opt is-ready" data-id="' + ind.id + '">' +
          '<span class="aud-ico">' + icon(ind.id, 26) + '</span>' +
          '<span class="aud-opt-text"><span class="aud-ready-tag">Tailored and ready</span>' + label + '</span>' +
          '<span class="aud-go" aria-hidden="true">&rarr;</span></button></li>';
      }
      return '<li><button type="button" class="aud-opt" data-id="' + ind.id + '" disabled aria-disabled="true">' +
        '<span class="aud-ico">' + icon(ind.id, 22) + '</span>' +
        '<span class="aud-opt-text">' + label + '<span class="aud-soon">Coming soon</span></span></button></li>';
    }).join('');
    var check = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    overlay.innerHTML =
      '<div class="aud-dialog" role="dialog" aria-modal="true" aria-labelledby="aud-title" aria-describedby="aud-sub">' +
        '<button type="button" class="aud-close" aria-label="Close">&times;</button>' +
        '<div class="aud-side">' +
          '<h2 id="aud-title">Make this site about <span>your world.</span></h2>' +
          '<p id="aud-sub">Pick your industry and we\'ll tailor every page to you.</p>' +
        '</div>' +
        '<div class="aud-main">' +
          '<p class="aud-ask">I work for...</p>' +
          '<ul class="aud-grid" role="list">' + opts + '</ul>' +
          (chips ? '<p class="aud-soon-head">More industries coming soon</p><ul class="aud-chips" role="list">' + chips + '</ul>' : '') +
          '<button type="button" class="aud-skip">Skip for now and show me everything</button>' +
        '</div>' +
      '</div>';
    overlay.addEventListener('click', function (e) {
      var opt = e.target.closest('.aud-opt');
      if (opt && !opt.disabled) { choose(opt.getAttribute('data-id')); return; }
      if (e.target.closest('.aud-skip')) { choose(GENERAL); return; }
      if (e.target.closest('.aud-close') || e.target === overlay) { dismiss(); }
    });
    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); dismiss(); return; }
      if (e.key !== 'Tab') return;
      var f = overlay.querySelectorAll('button:not([disabled])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    document.body.appendChild(overlay);
  }
  // Closing without a pick counts as "just browsing" the first time,
  // so the pop-up doesn't come back on every page.
  function dismiss() {
    if (!readStore()) writeStore(GENERAL);
    closeModal();
  }
  function openModal() {
    if (!overlay) buildModal();
    lastFocus = document.activeElement;
    var opts = overlay.querySelectorAll('.aud-opt');
    for (var i = 0; i < opts.length; i++) opts[i].setAttribute('aria-pressed', opts[i].getAttribute('data-id') === current ? 'true' : 'false');
    overlay.style.display = 'flex';
    document.body.classList.add('aud-lock');
    void overlay.offsetWidth; // commit the hidden state so the fade-in runs
    overlay.classList.add('is-open');
    var firstOpt = overlay.querySelector('.aud-opt:not([disabled])');
    if (firstOpt) firstOpt.focus();
  }
  function closeModal() {
    if (!overlay || overlay.style.display === 'none') return;
    overlay.classList.remove('is-open');
    overlay.style.display = 'none';
    document.body.classList.remove('aud-lock');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ---------- Menu indicator ---------- */
  var CHEVRON = '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3.5L5 7.5L9 3.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function pillHTML() {
    return '<span class="aud-pill-full">Viewing: <strong>' + labelFor(current).replace('&', '&amp;') + '</strong></span>' +
      '<span class="aud-pill-short"><strong>' + shortLabelFor(current).replace('&', '&amp;') + '</strong></span>' + CHEVRON;
  }
  function buildIndicators() {
    var nav = document.getElementById('nav');
    if (nav) {
      var tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'aud-pill aud-tab';
      tab.setAttribute('aria-haspopup', 'dialog');
      nav.appendChild(tab);
      // Line the tab's right edge up with the menu's right edge (the CTA
      // button when it shows, otherwise the end of the menu row).
      var align = function () {
        var cta = nav.querySelector('.nav-cta');
        var edge = (cta && cta.offsetWidth) ? cta : nav.querySelector('.nav-inner');
        if (!edge) return;
        tab.style.right = Math.max(0, Math.round(nav.getBoundingClientRect().right - edge.getBoundingClientRect().right)) + 'px';
      };
      align();
      window.addEventListener('resize', align);
      window.addEventListener('load', align);
    }
    var links = document.getElementById('navLinks');
    if (links) {
      var li = document.createElement('li');
      li.className = 'aud-navrow';
      li.innerHTML = '<button type="button" class="aud-pill" aria-haspopup="dialog"></button>';
      links.insertBefore(li, links.firstChild);
    }
    document.addEventListener('click', function (e) {
      if (e.target.closest('.aud-pill')) openModal();
    });
  }
  function updateIndicators() {
    var pills = document.querySelectorAll('.aud-pill');
    for (var i = 0; i < pills.length; i++) {
      pills[i].innerHTML = pillHTML();
      pills[i].setAttribute('aria-label', 'Viewing the site for ' + labelFor(current) + '. Change industry.');
    }
  }

  /* ---------- Industry page offer (School Districts, Natural Resources) ---------- */
  var suggestEl = null, suggestDismissed = false, pageIndustry = INDUSTRY_PAGES[page];
  function updateSuggest() {
    if (!pageIndustry) return;
    var show = current !== pageIndustry && !suggestDismissed;
    if (show && !suggestEl) {
      var hero = document.querySelector('main .page-hero');
      if (!hero) return;
      suggestEl = document.createElement('div');
      suggestEl.className = 'aud-suggest';
      suggestEl.innerHTML = '<div class="container"><p>' + SUGGEST_TEXT[pageIndustry] + '</p>' +
        '<button type="button" class="aud-yes">Tailor the site</button>' +
        '<button type="button" class="aud-no">No thanks</button></div>';
      suggestEl.addEventListener('click', function (e) {
        if (e.target.closest('.aud-yes')) choose(pageIndustry);
        else if (e.target.closest('.aud-no')) { suggestDismissed = true; updateSuggest(); }
      });
      hero.parentNode.insertBefore(suggestEl, hero.nextSibling);
    }
    if (suggestEl) suggestEl.style.display = show ? '' : 'none';
  }

  /* ---------- Start ---------- */
  buildIndicators();
  var fromUrl = urlChoice();
  if (fromUrl) writeStore(fromUrl);
  var stored = readStore();
  var start = fromUrl || (stored && isReady(stored) ? stored : GENERAL);
  apply(start);
  // First visit (nothing stored, no link choice): ask. Industry pages
  // use their own lighter offer instead of the pop-up.
  if (!fromUrl && !stored && !INDUSTRY_PAGES[page] && !NO_POPUP_PAGES[page]) openModal();

  // Small hook for other page features (the "Find Your Path" questions)
  // to switch the industry quietly: no pop-up, no confirmation message.
  window.SyTechAudience = {
    set: function (id) { if (isReady(id)) { writeStore(id); apply(id); } },
    current: function () { return current; }
  };
})();
