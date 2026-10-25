// Terminal psql et liste : écriture / suppression sans rechargement (POST /values, DELETE /values/:id)
(function () {
  var form = document.getElementById('createForm');
  var input = document.getElementById('psql-input');
  var button = document.getElementById('create');
  var counter = document.getElementById('nd-counter');
  var list = document.getElementById('values');
  var termRows = document.getElementById('nd-psql-rows');
  var log = document.getElementById('nd-log');
  var title = document.getElementById('nd-title');
  if (!list) return;

  var fmt = function (n) { return Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 }); };

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
    title.textContent = n + ' valeur' + (n > 1 ? 's' : '') + ' dans PostgreSQL.';
    var rows = document.getElementById('nd-rows');
    if (rows) rows.textContent = '(' + n + ' ligne' + (n > 1 ? 's' : '') + ')';
    var last = document.getElementById('nd-last');
    if (last && delta > 0) last.innerHTML = 'dernière écriture <b>à l\'instant</b>';
  }

  function addRow(data) {
    var empty = list.querySelector('.nd-empty');
    if (empty) empty.remove();

    var li = document.createElement('li');
    li.className = 'nd-row is-new';
    li.id = 'row-' + data.id;
    li.setAttribute('data-id', data.id);
    li.innerHTML =
      '<span class="nd-row__id">#' + data.id + '</span>' +
      '<div class="nd-row__main"><div class="nd-row__value"></div><code class="nd-row__json"></code></div>' +
      '<span class="nd-row__age">à l\'instant</span>' +
      '<button class="cc-btn cc-btn--sm cc-btn--danger" type="button" data-delete="' + data.id + '">Supprimer</button>';
    li.querySelector('.nd-row__value').textContent = data.value;
    li.querySelector('.nd-row__json').textContent = '{"value": ' + JSON.stringify(data.value) + '}';
    li.querySelector('.nd-row__json').title = '{"value": ' + JSON.stringify(data.value) + '}';
    li.querySelector('button').setAttribute('aria-label', 'Supprimer la valeur ' + data.id);
    list.insertBefore(li, list.firstChild);

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
      while (termRows.children.length > 6) termRows.removeChild(termRows.lastChild);
    }
    setTotal(1);
  }

  function removeRow(id) {
    var tr = termRows && termRows.querySelector('tr[data-id="' + id + '"]');
    if (tr) tr.remove();
    var row = document.getElementById('row-' + id);
    setTotal(-1);
    if (!row) return;
    row.classList.add('is-out');
    setTimeout(function () {
      row.remove();
      if (!list.querySelector('.nd-row')) {
        var empty = document.createElement('li');
        empty.className = 'nd-empty';
        empty.innerHTML = '<strong>Aucune valeur pour l\'instant</strong>Écrivez-en une dans le terminal ci-dessus : elle sera persistée dans PostgreSQL.';
        list.appendChild(empty);
      }
    }, 200);
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
