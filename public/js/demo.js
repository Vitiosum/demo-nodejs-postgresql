document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('createForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = document.getElementById('value');
      var val = input.value.trim();

      if (val === '') {
        showToast('Please enter a value before submitting.');
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
            addItem(data.value, data.id);
            input.value = '';
            input.focus();
            updateCount(1);
          } else {
            showToast(data.value || 'An error occurred.');
          }
        })
        .catch(function () { showToast('Network error — please try again.'); })
        .finally(function () { setLoading(false); });
    });
  }
});

function setLoading(on) {
  var btn = document.getElementById('create');
  var spinner = document.getElementById('spinner');
  var txt = document.getElementById('btn-text');
  if (!btn) return;
  btn.disabled = on;
  spinner.style.display = on ? 'block' : 'none';
  txt.textContent = on ? 'Adding…' : 'Add';
}

function addItem(value, id) {
  var list = document.getElementById('list');
  if (!list) return;

  // Remove empty state if present
  var empty = list.previousElementSibling;
  if (empty && empty.classList.contains('empty-state')) {
    empty.remove();
  }
  // If list was a plain div (empty state), convert it to a ul
  if (list.tagName !== 'UL') {
    var ul = document.createElement('ul');
    ul.className = 'values-list';
    ul.id = 'list';
    list.parentNode.replaceChild(ul, list);
    list = ul;
  }

  var li = document.createElement('li');
  li.className = 'value-item';
  li.id = id;
  li.innerHTML =
    '<div>' +
      '<div class="value-text">' + escapeHtml(value) + '</div>' +
      '<div class="value-id">#' + id + '</div>' +
    '</div>' +
    '<button class="btn-delete" onclick="deleteItem(' + id + ')">Delete</button>';
  list.appendChild(li);
}

function deleteItem(id) {
  fetch('/values/' + id, { method: 'DELETE' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.status === 'ok') {
        var item = document.getElementById(data.value);
        if (item) {
          item.style.transition = 'opacity 0.2s, transform 0.2s';
          item.style.opacity = '0';
          item.style.transform = 'translateX(8px)';
          setTimeout(function () {
            item.remove();
            updateCount(-1);
            checkEmpty();
          }, 200);
        }
      } else {
        showToast(data.value || 'Delete failed.');
      }
    })
    .catch(function () { showToast('Network error — please try again.'); });
}

function checkEmpty() {
  var list = document.getElementById('list');
  if (!list) return;
  if (list.children.length === 0) {
    var empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<div class="empty-icon">🗃️</div><div>No values yet — add one above</div>';
    list.parentNode.insertBefore(empty, list.nextSibling);
  }
}

function updateCount(delta) {
  var el = document.getElementById('count');
  if (!el) return;
  var list = document.getElementById('list');
  var n = list ? list.children.length : 0;
  el.textContent = n > 0 ? '(' + n + ')' : '';
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
