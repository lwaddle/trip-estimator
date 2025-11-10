// ----- helpers -----
const legsWrap = document.querySelector('#legs');
const addBtn = document.querySelector('#addLeg');
const tpl = document.querySelector('#legTemplate');

let legCount = 0;

function addLeg(prefill = {}) {
  legCount += 1;

  const node = tpl.content.cloneNode(true);
  const legEl = node.querySelector('.leg');
  legEl.dataset.leg = String(legCount);
  legEl.querySelector('.leg-num').textContent = legCount;

  if (prefill.from)  legEl.querySelector('.from').value  = prefill.from;
  if (prefill.to)    legEl.querySelector('.to').value    = prefill.to;
  if (prefill.flight) legEl.querySelector('.flight').value = prefill.flight;
  if (prefill.fuelburn) legEl.querySelector('.fuelburn').value = prefill.fuelburn;

  legsWrap.appendChild(node);
}

// Uppercase ICAO on field leave; basic hh:mm normalization
legsWrap.addEventListener('focusout', (e) => {
  const t = e.target;
  if (!(t instanceof HTMLInputElement)) return;

  if (t.classList.contains('from') || t.classList.contains('to')) {
    t.value = t.value.trim().toUpperCase();
  }

  if (t.classList.contains('flight')) {
    let v = t.value.replace(/[^0-9:]/g, '');
    if (/^\d{3,4}$/.test(v)) v = v.replace(/(\d{1,2})(\d{2})/, '$1:$2');
    if (/^\d{1,2}:(\d{2})$/.test(v)) {
      const [h, m] = v.split(':');
      const mm = Math.min(59, parseInt(m || '0', 10));
      v = `${parseInt(h || '0', 10)}:${String(mm).padStart(2, '0')}`;
    }
    t.value = v;
  }
});

// Remove leg (delegated)
legsWrap.addEventListener('click', (e) => {
  const btn = e.target.closest('.remove-leg');
  if (!btn) return;
  btn.closest('.leg').remove();

  [...document.querySelectorAll('.leg')].forEach((el, i) => {
    el.querySelector('.leg-num').textContent = i + 1;
    el.dataset.leg = String(i + 1);
  });
  legCount = document.querySelectorAll('.leg').length;
});

addBtn.addEventListener('click', () => addLeg());

addLeg({ flight: '2:30', fuelburn: 2500 });