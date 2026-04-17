const RATES   = { USD: 57.50, EUR: 62.10, KRW: 0.0405, CNY: 9.09, CAD: 43.48, JPY: 0.3774, AUD: 43.48, SGD: 47.62, SAR: 15.87 };
const SYMBOLS = { USD: '$', EUR: '€', KRW: '₩', CNY: '¥', CAD: 'C$', JPY: '¥', AUD: 'A$', SGD: 'S$', SAR: 'SR' };
const NAMES   = { USD: 'US Dollars', EUR: 'Euros', KRW: 'South Korean Won', CNY: 'Chinese Yuan', CAD: 'Canadian Dollars', JPY: 'Japanese Yen', AUD: 'Australian Dollars', SGD: 'Singapore Dollars', SAR: 'Saudi Riyals' };
const CHANGE_FEE  = 0.01;
const FOREIGN_FEE = 0.02;
const PHP_DENOMS  = [1000, 500, 200, 100, 50, 20, 10, 5, 1];
const QUICK_AMOUNTS = [20, 50, 100, 200, 500, 1000, 5000, 10000];

let currentTab = 'change';

/* ---- View transition helpers ---- */
function transitionView(outEl, inEl, callback) {
  // Fade out
  outEl.classList.remove('fade-in');
  outEl.classList.add('fade-out');
  setTimeout(() => {
    outEl.classList.add('hidden');
    outEl.classList.remove('fade-out');
    // Prepare fade in
    inEl.classList.remove('hidden');
    inEl.classList.add('fade-enter');
    if (callback) callback();
    // Trigger reflow then animate in
    void inEl.offsetWidth;
    inEl.classList.remove('fade-enter');
    inEl.classList.add('fade-in');
  }, 250);
}

function isPhpToForeign() {
  return currentTab === 'foreign' && document.getElementById('currency-select').value === 'PHP';
}

function getActiveForeignCur() {
  if (isPhpToForeign()) return document.getElementById('target-select').value;
  return document.getElementById('currency-select').value;
}

function startMode(mode) {
  currentTab = mode;
  const idle = document.getElementById('idle-view');
  const main = document.getElementById('main-view');
  transitionView(idle, main, () => {
    document.getElementById('change-section').classList.toggle('hidden', mode !== 'change');
    document.getElementById('foreign-section').classList.toggle('hidden', mode !== 'foreign');
    document.getElementById('foreign-selector').classList.toggle('hidden', mode !== 'foreign');
    document.getElementById('target-selector').classList.add('hidden');
    updateInputLabels();
    renderDenomButtons();
    onAmountChange();
  });
}

function updateInputLabels() {
  const label  = document.getElementById('amount-label');
  const prefix = document.getElementById('currency-prefix');
  if (currentTab === 'foreign') {
    const cur = document.getElementById('currency-select').value;
    if (cur === 'PHP') {
      label.innerHTML  = 'Amount inserted (Philippine Peso)';
      prefix.innerHTML = '\u20b1';
    } else {
      const sym = SYMBOLS[cur];
      const name = NAMES[cur];
      label.textContent  = 'Amount inserted (' + name + ')';
      prefix.textContent = sym;
    }
  } else {
    label.innerHTML  = 'Amount inserted (PHP \u20b1)';
    prefix.innerHTML = '\u20b1';
  }
}

function onCurrencyChange() {
  const cur = document.getElementById('currency-select').value;
  document.getElementById('target-selector').classList.toggle('hidden', cur !== 'PHP' || currentTab !== 'foreign');
  updateInputLabels();
  renderDenomButtons();
  onAmountChange();
}

function addAmount(n) {
  const inp = document.getElementById('amount-input');
  inp.value = n;
  onAmountChange();
}

function renderDenomButtons() {
  const grid = document.getElementById('denom-grid');
  let sym = '₱';
  if (currentTab === 'foreign') {
    const cur = document.getElementById('currency-select').value;
    sym = cur === 'PHP' ? '₱' : SYMBOLS[cur];
  }
  grid.innerHTML = QUICK_AMOUNTS.map(n =>
    `<button class="denom-btn" onclick="addAmount(${n})">${sym}${n.toLocaleString('en-PH')}</button>`
  ).join('');
}

function fmt(n, sym) {
  return (sym || '₱') + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calcBills(amount) {
  let rem = Math.floor(amount);
  const result = [];
  for (const d of PHP_DENOMS) {
    const count = Math.floor(rem / d);
    if (count > 0) { result.push({ denom: d, count }); rem -= count * d; }
  }
  return result;
}

function onAmountChange() {
  const raw = parseFloat(document.getElementById('amount-input').value) || 0;

  if (currentTab === 'change') {
    const fee     = raw * CHANGE_FEE;
    const receive = raw - fee;
    document.getElementById('cr-inserted').textContent = fmt(raw);
    document.getElementById('cr-fee').textContent      = fmt(fee);
    document.getElementById('cr-receive').textContent  = fmt(receive);
    const bills = calcBills(receive);
    const bd    = document.getElementById('bill-display');
    bd.innerHTML = bills.length
      ? bills.map(b => `<span class="bill-tag">${b.count > 1 ? b.count + '×' : ''}₱${b.denom}</span>`).join('')
      : '<span style="font-size:13px;color:#94a3b8;">—</span>';
  } else {
    const srcCur = document.getElementById('currency-select').value;
    const phpToForeign = srcCur === 'PHP';
    const targetCur = phpToForeign ? document.getElementById('target-select').value : srcCur;
    const srcSym    = phpToForeign ? '₱' : SYMBOLS[srcCur];
    const tgtSym    = phpToForeign ? SYMBOLS[targetCur] : '₱';
    const rate      = RATES[targetCur];
    const fee       = raw * FOREIGN_FEE;
    const net       = raw - fee;
    const converted = phpToForeign ? (net / rate) : (net * rate);

    document.getElementById('fr-inserted').textContent = fmt(raw, srcSym);
    document.getElementById('fr-fee').textContent      = fmt(fee, srcSym);
    document.getElementById('fr-rate').textContent     = phpToForeign
      ? '₱1 = ' + tgtSym + (1 / rate).toFixed(5)
      : '1 ' + srcSym + ' = ₱' + rate.toFixed(2);
    document.getElementById('fr-receive').textContent  = fmt(converted, tgtSym);
    document.getElementById('fr-receive-label').textContent = phpToForeign
      ? 'You receive (' + NAMES[targetCur] + ')'
      : 'You receive (PHP)';
  }
}

function buildSummary() {
  const raw = parseFloat(document.getElementById('amount-input').value) || 0;
  if (currentTab === 'change') {
    const fee     = raw * CHANGE_FEE;
    const receive = raw - fee;
    const bills   = calcBills(receive);
    return `
      <div class="result-row"><span class="result-label">Inserted</span><span class="result-val">${fmt(raw)}</span></div>
      <div class="result-row"><span class="result-label">Fee (1%)</span><span class="result-val">${fmt(fee)}</span></div>
      <div class="result-row"><span class="result-label">Dispensed</span><span class="result-val big">${fmt(receive)}</span></div>
      <div style="padding-top:8px;font-size:13px;color:#64748b;">Coins &amp; bills breakdown:</div>
      <div class="bill-display" style="margin-top:6px;">
        ${bills.map(b => `<span class="bill-tag">${b.count > 1 ? b.count + '×' : ''}₱${b.denom}</span>`).join('') || '—'}
      </div>`;
  } else {
    const srcCur = document.getElementById('currency-select').value;
    const phpToForeign = srcCur === 'PHP';
    const targetCur = phpToForeign ? document.getElementById('target-select').value : srcCur;
    const srcSym    = phpToForeign ? '₱' : SYMBOLS[srcCur];
    const tgtSym    = phpToForeign ? SYMBOLS[targetCur] : '₱';
    const rate      = RATES[targetCur];
    const fee       = raw * FOREIGN_FEE;
    const net       = raw - fee;
    const converted = phpToForeign ? (net / rate) : (net * rate);
    const rateText  = phpToForeign
      ? '₱1 = ' + tgtSym + (1 / rate).toFixed(5)
      : '1 ' + srcSym + ' = ₱' + rate.toFixed(2);
    return `
      <div class="result-row"><span class="result-label">Inserted</span><span class="result-val">${fmt(raw, srcSym)}</span></div>
      <div class="result-row"><span class="result-label">Fee (2%)</span><span class="result-val">${fmt(fee, srcSym)}</span></div>
      <div class="result-row"><span class="result-label">Rate</span><span class="result-val">${rateText}</span></div>
      <div class="result-row"><span class="result-label">Dispensed</span><span class="result-val big">${fmt(converted, tgtSym)}</span></div>`;
  }
}

function showConfirm() {
  const raw = parseFloat(document.getElementById('amount-input').value) || 0;
  if (raw <= 0) { alert('Please insert an amount first.'); return; }
  document.getElementById('confirm-summary').innerHTML = buildSummary();
  document.getElementById('confirm-overlay').classList.add('visible');
}

function hideConfirm() {
  document.getElementById('confirm-overlay').classList.remove('visible');
}

function doExchange() {
  hideConfirm();
  const summary = buildSummary();
  if (currentTab === 'change') {
    document.getElementById('success-msg').textContent = 'Collect your coins and bills below.';
  } else {
    const srcCur = document.getElementById('currency-select').value;
    if (srcCur === 'PHP') {
      const tgt = document.getElementById('target-select').value;
      document.getElementById('success-msg').textContent = 'Collect your ' + NAMES[tgt] + ' below.';
    } else {
      document.getElementById('success-msg').textContent = 'Collect your Philippine Pesos below.';
    }
  }
  document.getElementById('success-summary').innerHTML = summary;
  const main    = document.getElementById('main-view');
  const success = document.getElementById('success-view');
  // Small delay so modal finishes closing first
  setTimeout(() => transitionView(main, success), 200);
}

function clearAll() {
  document.getElementById('amount-input').value = '';
  onAmountChange();
}

function anotherTransaction() {
  const success = document.getElementById('success-view');
  const main    = document.getElementById('main-view');
  transitionView(success, main, clearAll);
}

function resetKiosk() {
  clearAll();
  const idle = document.getElementById('idle-view');
  const main = document.getElementById('main-view');
  const success = document.getElementById('success-view');
  const visible = success.classList.contains('hidden') ? main : success;
  transitionView(visible, idle);
}

renderDenomButtons();
onAmountChange();

/* ---- Rates Ticker ---- */
(function buildTicker() {
  const track = document.getElementById('rates-track');
  const chips = Object.keys(RATES).map(cur =>
    `<div class="rate-chip">1 ${SYMBOLS[cur]} = <span>${RATES[cur].toFixed(2)}</span> PHP</div>`
  ).join('');
  // Duplicate for seamless loop
  track.innerHTML = chips + chips;
})();

/* ---- Number Pad Logic ---- */
let numpadBuffer = '';
const numpadOverlay = document.getElementById('numpad-overlay');
const numpadValueEl = document.getElementById('numpad-value');
const amountInput   = document.getElementById('amount-input');

// Make input readonly so mobile keyboard doesn't appear
amountInput.setAttribute('readonly', true);
amountInput.style.cursor = 'pointer';

amountInput.addEventListener('click', openNumpad);
amountInput.addEventListener('focus', openNumpad);

// Close when tapping the dark backdrop (not the numpad itself)
numpadOverlay.addEventListener('click', function(e) {
  if (e.target === numpadOverlay) numpadDone();
});

function openNumpad() {
  const current = amountInput.value;
  numpadBuffer = current && current !== '0' ? String(parseInt(current, 10)) : '';
  renderNumpad();
  numpadOverlay.classList.add('visible');
}

function numpadPress(digit) {
  if (numpadBuffer.length >= 10) return; // sensible max
  numpadBuffer += digit;
  renderNumpad();
}

function numpadBackspace() {
  numpadBuffer = numpadBuffer.slice(0, -1);
  renderNumpad();
}

function numpadClear() {
  numpadBuffer = '';
  renderNumpad();
}

function numpadDone() {
  const val = parseInt(numpadBuffer, 10) || 0;
  amountInput.value = val || '';
  onAmountChange();
  numpadOverlay.classList.remove('visible');
  amountInput.blur();
}

function renderNumpad() {
  const display = numpadBuffer === '' ? '0' : parseInt(numpadBuffer, 10).toLocaleString('en-PH');
  numpadValueEl.textContent = display;
}
