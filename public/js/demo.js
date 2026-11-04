// Le fichier : la machine à écrire (session psql) tape une fiche, le meuble la range.
// Écriture et suppression sans rechargement : POST /values, DELETE /values/:id.
// Le serveur reste seul juge (VALUE_MAX_LENGTH, READ_ONLY, garde cross-site) ; ici on affiche ses réponses.
(function () {
  var form = document.getElementById('createForm');
  var input = document.getElementById('psql-input');
  var button = document.getElementById('create');
  var counter = document.getElementById('fi-counter');
  var list = document.getElementById('values');
  var termRows = document.getElementById('fi-psql-rows');
  var log = document.getElementById('fi-log');
  var title = document.getElementById('fi-title');
  var slip = document.getElementById('fi-slip');
  var openDrawer = document.getElementById('fi-open');
  if (!list) return;

  var TERM_ROWS = 6;
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fmt = function (n) { return Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 }); };
  var json = function (v) { return '{"value": ' + JSON.stringify(v) + '}'; };

  if (counter && input) {
    var max = Number(counter.getAttribute('data-max'));
    var refresh = function () {
      counter.textContent = input.value.length + '/' + max + ' caractères · VALUE_MAX_LENGTH';
      counter.classList.toggle('is-full', input.value.length >= max);
    };
    input.addEventListener('input', refresh);
    refresh();
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var val = input.value.trim();
      if (val === '') {
        showToast("Saisissez une valeur avant d'envoyer.");
        input.focus();
        return;
      }
      button.disabled = true;
      send('POST', '/values', 'value=' + encodeURIComponent(val))
        .then(function (data) {
          addRow(data);
          logLine('INSERT 0 1', 'id ' + data.id + ' · ' + fmt(data.sqlMs) + ' ms');
          input.value = '';
          input.dispatchEvent(new Event('input'));
          input.focus();
        })
        .catch(function (msg) { logLine('ERREUR', msg, true); showToast(msg); })
        .finally(function () { button.disabled = false; });
    });
  }

  list.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-delete]');
    if (!btn) return;
    var id = btn.getAttribute('data-delete');
    btn.disabled = true;
    send('DELETE', '/values/' + encodeURIComponent(id))
      .then(function (data) {
        logLine('DELETE ' + data.count, 'id ' + id + ' · ' + fmt(data.sqlMs) + ' ms');
        removeRow(id);
      })
      .catch(function (msg) { btn.disabled = false; logLine('ERREUR', msg, true); showToast(msg); });
  });

  function send(method, url, body) {
    return fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'fetch' },
      body: body
    })
      .catch(function () { throw 'Erreur réseau, réessayez.'; })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (data) {
          if (data.status !== 'ok') throw data.value || 'Opération refusée (' + r.status + ').';
          return data;
        });
      });
  }

  // Le journal psql : trois dernières lignes, en ruban noir (ou rouge pour une erreur)
  function logLine(tag, text, isError) {
    if (!log) return;
    var li = document.createElement('li');
    if (isError) li.className = 'is-error';
    var b = document.createElement('b');
    b.textContent = tag;
    li.appendChild(b);
    li.appendChild(document.createTextNode('  -- ' + text));
    log.appendChild(li);
    while (log.children.length > 3) log.removeChild(log.firstChild);
  }

  function setTotal(delta) {
    var n = Number(title.getAttribute('data-total')) + delta;
    title.setAttribute('data-total', n);
    title.textContent = n + ' fiche' + (n > 1 ? 's' : '') + ' dans PostgreSQL.';
    var rows = document.getElementById('fi-rows');
    if (rows) rows.textContent = '(' + n + ' ligne' + (n > 1 ? 's' : '') + ')';
    var last = document.getElementById('fi-last');
    if (last && delta > 0) last.innerHTML = 'dernière fiche rangée <b>à l\'instant</b>';
  }

  // Le tiroir d'une heure : même découpage que date_trunc('hour') côté PostgreSQL
  function drawerFor(iso) {
    var t = new Date(iso).getTime();
    if (isNaN(t)) return null;
    var h = Math.floor(Date.now() / 3600000) - Math.floor(t / 3600000);
    if (h < 0 || h > 23) return null;
    return document.querySelector('.fi-drawer[data-h="' + h + '"]');
  }

  function bump(drawer, delta) {
    if (!drawer) return;
    var c = Math.max(0, Number(drawer.getAttribute('data-count')) + delta);
    var h = Number(drawer.getAttribute('data-h'));
    drawer.setAttribute('data-count', c);
    drawer.style.setProperty('--n', Math.min(c, 10));
    drawer.classList.toggle('is-empty', c === 0);
    drawer.title = c + ' écriture' + (c > 1 ? 's' : '') + (h === 0 ? ' cette heure-ci' : ' il y a ' + h + ' h');
    var tab = drawer.querySelector('.fi-drawer__tab');
    if (tab) tab.textContent = c;
    if (calm) return;
    drawer.classList.remove('is-bump');
    void drawer.offsetWidth;
    drawer.classList.add('is-bump');
  }

  // La fiche tapée quitte la machine et vole jusqu'au tiroir de l'heure
  function fly(value, drawer, done) {
    var from = form && form.getBoundingClientRect();
    if (calm || !drawer || !from || typeof document.body.animate !== 'function') return done();
    var to = drawer.getBoundingClientRect();
    var card = document.createElement('div');
    card.className = 'fi-flight';
    card.setAttribute('aria-hidden', 'true');
    card.textContent = value;
    card.style.left = from.left + 'px';
    card.style.top = (from.top - 8) + 'px';
    document.body.appendChild(card);
    var w = card.getBoundingClientRect().width;
    var dx = to.left + to.width / 2 - (from.left + w / 2);
    var dy = to.top + 6 - (from.top - 8);
    var anim = card.animate([
      { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1 },
      { transform: 'translate(' + dx * 0.45 + 'px, ' + (dy * 0.45 - 70) + 'px) rotate(-5deg) scale(0.75)', opacity: 1, offset: 0.55 },
      { transform: 'translate(' + dx + 'px, ' + dy + 'px) rotate(0deg) scale(0.2)', opacity: 0.15 }
    ], { duration: 950, easing: 'cubic-bezier(0.45, 0, 0.2, 1)' });
    anim.onfinish = function () { card.remove(); done(); };
  }

  function makeTab(data) {
    var li = document.createElement('li');
    li.className = 'fi-tab';
    li.setAttribute('data-id', data.id);
    li.innerHTML = '<span class="fi-tab__head"><span class="fi-tab__id"></span><span class="fi-tab__value"></span>' +
      '<time class="fi-tab__age">à l\'instant</time></span><code class="fi-tab__json"></code>';
    li.querySelector('.fi-tab__id').textContent = data.id;
    li.querySelector('.fi-tab__value').textContent = data.value;
    li.querySelector('.fi-tab__json').textContent = json(data.value);
    li.querySelector('time').setAttribute('datetime', data.createdAt);
    return li;
  }

  // Les six fiches du tiroir ouvert : --k = rang depuis l'avant (0 = la plus récente)
  function restack() {
    if (!openDrawer) return;
    Array.prototype.slice.call(openDrawer.children).forEach(function (li, k) {
      if (k >= TERM_ROWS) return li.remove();
      li.style.setProperty('--k', k);
    });
  }

  function makeCard(data) {
    var li = document.createElement('li');
    li.className = 'fi-card is-new';
    li.id = 'row-' + data.id;
    li.setAttribute('data-id', data.id);
    li.setAttribute('data-created', data.createdAt);
    li.innerHTML = '<span class="fi-card__id"></span><time class="fi-card__stamp">à l\'instant</time>' +
      '<p class="fi-card__value"></p><code class="fi-card__json"></code>' +
      '<button class="fi-card__out" type="button">Retirer</button>';
    li.querySelector('.fi-card__id').textContent = data.id;
    li.querySelector('time').setAttribute('datetime', data.createdAt);
    li.querySelector('.fi-card__value').textContent = data.value;
    li.querySelector('.fi-card__json').textContent = json(data.value);
    var btn = li.querySelector('button');
    btn.setAttribute('data-delete', data.id);
    btn.setAttribute('aria-label', 'Retirer la fiche ' + data.id);
    return li;
  }

  function addRow(data) {
    // 1. La session psql répond tout de suite : ligne en tête du résultat, compteurs
    if (termRows) {
      var tr = document.createElement('tr');
      tr.className = 'is-new';
      tr.setAttribute('data-id', data.id);
      [String(data.id), data.value, "à l'instant"].forEach(function (t) {
        var td = document.createElement('td');
        td.textContent = t;
        td.title = t;
        tr.appendChild(td);
      });
      termRows.insertBefore(tr, termRows.firstChild);
      while (termRows.children.length > TERM_ROWS) termRows.removeChild(termRows.lastChild);
    }
    if (slip && !calm) {
      slip.classList.remove('is-return');
      void slip.offsetWidth;
      slip.classList.add('is-return');
    }
    setTotal(1);

    var empty = list.querySelector('.fi-empty');
    if (empty) empty.remove();
    list.insertBefore(makeCard(data), list.firstChild);

    // 2. La fiche vole jusqu'au tiroir de l'heure, puis entre dans le tiroir ouvert
    var drawer = drawerFor(data.createdAt) || document.getElementById('fi-now');
    fly(data.value, drawer, function () {
      bump(drawer, 1);
      if (openDrawer) {
        openDrawer.insertBefore(makeTab(data), openDrawer.firstChild);
        restack();
      }
    });
  }

  function removeRow(id) {
    var tr = termRows && termRows.querySelector('tr[data-id="' + id + '"]');
    if (tr) tr.remove();
    var tab = openDrawer && openDrawer.querySelector('li[data-id="' + id + '"]');
    if (tab) { tab.remove(); restack(); }
    setTotal(-1);
    var card = document.getElementById('row-' + id);
    if (!card) return;
    bump(drawerFor(card.getAttribute('data-created')), -1);
    card.classList.add('is-out');
    setTimeout(function () {
      card.remove();
      if (!list.querySelector('.fi-card')) {
        var empty = document.createElement('li');
        empty.className = 'fi-empty';
        empty.innerHTML = '<strong>Le tiroir est vide.</strong>Tapez une fiche à la machine ci-dessus : elle sera rangée dans PostgreSQL.';
        list.appendChild(empty);
      }
    }, 250);
  }
})();

// Toast (partagé avec la page d'erreur via le layout)
var toastTimer;
function showToast(msg) {
  var t = document.getElementById('toast');
  if (!t) return;
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 4000);
}
function hideToast() {
  var t = document.getElementById('toast');
  if (t) t.classList.remove('is-visible');
}
document.addEventListener('DOMContentLoaded', function () {
  var close = document.querySelector('.demo-toast__close');
  if (close) close.addEventListener('click', hideToast);
});
