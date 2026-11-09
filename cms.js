/* JECK content loader.
   Every page keeps its own wording in the HTML so it always shows something. When the page loads,
   this script reads the latest wording, photos and lists the school saved in the admin panel
   (content/pages/<page>.json and content/settings.json) and puts them in place. */
(function () {
  var page = (location.pathname.split('/').pop() || 'home.html').replace(/\.html$/, '') || 'home';
  var NO_CACHE = { cache: 'no-cache' };

  /* ---------- tiny, safe markdown: **bold**, *italic*, [links](url), line breaks ---------- */
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function safeHref(u) {
    u = String(u || '').trim();
    return /^(javascript|data|vbscript):/i.test(u) ? '#' : u;
  }
  function inline(s) {
    var links = [];
    s = String(s).replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, function (_, t, u) {
      links.push([t, u]);
      return '\u0000' + (links.length - 1) + '\u0000';
    });
    s = esc(s)
      .replace(/\\([\\`*_{}\[\]()#+\-.!>~|])/g, '$1')
      .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, function (_, a, b) { return '<strong>' + (a || b) + '</strong>'; })
      .replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)|(^|\W)_([^_\n]+)_(?!\w)/g, function (_, p1, a, p2, b) {
        return (p1 != null ? p1 : p2) + '<em>' + (a || b) + '</em>';
      });
    return s.replace(/\u0000(\d+)\u0000/g, function (_, i) {
      var t = links[i][0], u = safeHref(links[i][1]);
      var ext = /^https?:/i.test(u), wa = /^https:\/\/wa\.me\//i.test(u);
      return '<a href="' + esc(u) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + (wa ? ' data-wa=""' : '') + '>' + inline(t) + '</a>';
    });
  }
  function md(s) {
    return String(s).replace(/\r/g, '').trim().split(/\n{2,}/).map(function (para) {
      return para.split('\n').map(function (line) { return inline(line.replace(/^\s*[-*]\s+/, '')); }).join('<br>');
    }).join('<br><br>');
  }
  function src(v) {
    v = String(v || '').trim();
    if (/^(https?:)?\/\//i.test(v)) return v;
    return v.replace(/^\/+/, '').replace(/^v2\//, '');
  }

  /* ---------- fill one element ---------- */
  function fill(el, val, alt) {
    if (val === undefined || val === null) return;
    if (el.tagName === 'IMG') {
      if (!val) { (el.closest('figure') || el).hidden = true; return; }
      el.src = src(val);
      if (alt !== undefined) el.alt = alt || '';
      (el.closest('figure') || el).hidden = false;
      return;
    }
    if (String(val).trim() === '') { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = md(val);
  }
  function get(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }

  /* list templates must be taken before anything changes */
  var templates = [];
  document.querySelectorAll('[data-cl]').forEach(function (list) {
    templates.push({ list: list, items: Array.prototype.filter.call(list.children, function (c) { return c.nodeType === 1; }).map(function (c) { return c.cloneNode(true); }) });
  });

  function applyPage(data) {
    document.querySelectorAll('[data-c]').forEach(function (el) {
      var path = el.getAttribute('data-c');
      if (el.tagName === 'IMG') fill(el, get(data, path), get(data, path + '_alt'));
      else fill(el, get(data, path));
    });
    templates.forEach(function (t) {
      var arr = get(data, t.list.getAttribute('data-cl'));
      if (!Array.isArray(arr) || !t.items.length) return;
      var frag = document.createDocumentFragment();
      arr.forEach(function (item, i) {
        var node = (t.items[i] || t.items[0]).cloneNode(true);
        if (!t.items[i]) node.removeAttribute('id');
        var targets = node.hasAttribute('data-ci') ? [node] : [];
        targets = targets.concat(Array.prototype.slice.call(node.querySelectorAll('[data-ci]')));
        targets.forEach(function (el) {
          var k = el.getAttribute('data-ci');
          if (el.tagName === 'IMG') fill(el, item[k], item[k + '_alt']); else fill(el, item[k]);
        });
        if (node.tagName === 'A' && item.link) node.setAttribute('href', safeHref(item.link));
        frag.appendChild(node);
      });
      t.list.innerHTML = '';
      t.list.appendChild(frag);
    });
  }

  function applySettings(s) {
    window.JECK_SETTINGS = s;
    if (s.whatsapp) {
      var num = String(s.whatsapp).replace(/\D/g, '');
      window.JECK_WA = num;
      document.querySelectorAll('a[href*="wa.me/"]').forEach(function (a) {
        a.href = a.getAttribute('href').replace(/wa\.me\/\d+/, 'wa.me/' + num);
      });
    }
    document.querySelectorAll('[data-set]').forEach(function (el) {
      var v = s[el.getAttribute('data-set')];
      if (v) el.textContent = v;
    });
    var old = document.getElementById('jeckNotice');
    if (old) old.remove();
    if (s.notice_show && s.notice_text) {
      var bar = document.createElement(s.notice_link ? 'a' : 'div');
      bar.id = 'jeckNotice';
      bar.className = 'notice-bar';
      if (s.notice_link) {
        bar.href = safeHref(s.notice_link);
        if (/^https?:/i.test(s.notice_link)) { bar.target = '_blank'; bar.rel = 'noopener'; }
      }
      bar.innerHTML = '<span>' + inline(s.notice_text) + '</span>';
      document.body.insertBefore(bar, document.body.firstChild);
    }
  }

  function load(url) {
    return fetch(url, NO_CACHE).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  function run() {
    var none = function () { return null; };
    Promise.all([load('content/pages/' + page + '.json').catch(none), load('content/settings.json').catch(none)])
      .then(function (r) {
        try { if (r[0]) applyPage(r[0]); } catch (e) { console.error('JECK content', e); }
        try { if (r[1]) applySettings(r[1]); } catch (e) { console.error('JECK settings', e); }
      });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
