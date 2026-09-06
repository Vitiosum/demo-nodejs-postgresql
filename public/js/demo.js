// Ajout / suppression de valeurs sans rechargement (POST /values, DELETE /values/:id)
(function () {
  var form = document.getElementById('createForm');
  var input = document.getElementById('value');
  var button = document.getElementById('create');
  var list = document.getElementById('values');
  if (!form || !list) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var val = input.value.trim();
    if (val === '') {
      showToast("Saisissez une valeur avant d'ajouter.");
      input.focus();
      return;
    }
    setLoading(true);
    fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'value=' + encodeURIComponent(val)
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.status === 'ok') {
          addRow(data.value, data.id);
          input.value = '';
          input.focus();
        } else {
          showToast(data.value || "L'ajout a échoué.");
        }
      })
      .catch(function () { showToast('Erreur réseau — réessayez.'); })
      .finally(function () { setLoading(false); });
  });

  list.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-delete]');
    if (!btn) return;
    deleteRow(btn.getAttribute('data-delete'), btn);
  });

  function setLoading(on) {
    button.disabled = on;
    button.textContent = on ? 'Ajout…' : 'Ajouter';
  }

  function addRow(value, id) {
    var empty = list.querySelector('.cc-empty');
    if (empty) empty.remove();

    var li = document.createElement('li');
    li.className = 'cc-row demo-row-in';
    li.id = 'row-' + id;
    li.setAttribute('data-id', id);
    li.innerHTML =
      '<span class="cc-row__id">#' + id + '</span>' +
      '<div class="cc-row__main">' +
        '<div class="cc-row__title">' + escapeHtml(String(value)) + '</div>' +
        '<div class="cc-row__meta">JSONB · PostgreSQL</div>' +
      '</div>' +
      '<div class="cc-row__actions">' +
        '<button class="cc-btn cc-btn--sm cc-btn--danger" type="button" data-delete="' + id + '">Supprimer</button>' +
      '</div>';
    list.appendChild(li);
    updateCount();
  }

  function deleteRow(id, btn) {
    btn.disabled = true;
    fetch('/values/' + encodeURIComponent(id), { method: 'DELETE' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.status !== 'ok') {
          btn.disabled = false;
          showToast(data.value || 'Suppression impossible.');
          return;
        }
        var row = document.getElementById('row-' + data.value);
        if (!row) return;
        row.classList.add('demo-row-out');
        setTimeout(function () {
          row.remove();
          updateCount();
          if (!list.querySelector('.cc-row')) {
            var empty = document.createElement('li');
            empty.className = 'cc-empty';
            empty.innerHTML = '<strong>Aucune valeur pour l\'instant</strong>Ajoutez-en une ci-dessus : elle sera persistée dans PostgreSQL.';
            list.appendChild(empty);
          }
        }, 200);
      })
      .catch(function () { btn.disabled = false; showToast('Erreur réseau — réessayez.'); });
  }

  function updateCount() {
    var n = list.querySelectorAll('.cc-row').length;
    var label = n + ' ligne' + (n > 1 ? 's' : '');
    var count = document.getElementById('count');
    var pgRows = document.getElementById('pg-rows');
    if (count) count.textContent = label;
    if (pgRows) pgRows.textContent = label;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
