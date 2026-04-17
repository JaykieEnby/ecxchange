/* ============================================
   PESOXCHANGE KIOSK — FULL SYSTEM
   Modules: UI, Transaction Engine, Cash Mgmt,
   Digital Payout, Compliance, Monitoring
   ============================================ */

/* ---- Constants & Configuration ---- */
const RATES   = { USD: 57.50, EUR: 62.10, KRW: 0.0405, CNY: 9.09, CAD: 43.48, JPY: 0.3774, AUD: 43.48, SGD: 47.62, SAR: 15.87 };
const SYMBOLS = { USD: '$', EUR: '€', KRW: '₩', CNY: '¥', CAD: 'C$', JPY: '¥', AUD: 'A$', SGD: 'S$', SAR: 'SR' };
const NAMES   = { USD: 'US Dollars', EUR: 'Euros', KRW: 'South Korean Won', CNY: 'Chinese Yuan', CAD: 'Canadian Dollars', JPY: 'Japanese Yen', AUD: 'Australian Dollars', SGD: 'Singapore Dollars', SAR: 'Saudi Riyals' };
const CHANGE_FEE  = 0.01;
const FOREIGN_FEE = 0.02;
const AML_THRESHOLD = 50000;
const PHP_DENOMS  = [1000, 500, 200, 100, 50, 20, 10, 5, 1];
const QUICK_AMOUNTS = [20, 50, 100, 200, 500, 1000, 5000, 10000];
const MACHINE_ID = 'PKX-0042';

let currentTab = 'change';

/* ==================================================
   3.3 CASH MANAGEMENT MODULE
   ================================================== */
const cashInventory = {
  1000: 50, 500: 100, 200: 150, 100: 200,
  50: 300, 20: 500, 10: 500, 5: 500, 1: 1000
};

function calcBillsWithInventory(amount) {
  let rem = Math.floor(amount);
  const result = [];
  for (const d of PHP_DENOMS) {
    const available = cashInventory[d] || 0;
    const needed = Math.floor(rem / d);
    const count = Math.min(needed, available);
    if (count > 0) { result.push({ denom: d, count }); rem -= count * d; }
  }
  if (rem > 0) return { bills: result, shortfall: rem };
  return { bills: result, shortfall: 0 };
}

function dispenseFromInventory(bills) {
  for (const b of bills) {
    cashInventory[b.denom] = (cashInventory[b.denom] || 0) - b.count;
  }
  logEvent('DISPENSE', { bills, remaining: { ...cashInventory } });
  checkInventoryAlerts();
}

function getInventoryStatus() {
  const total = Object.entries(cashInventory).reduce((s, [d, c]) => s + d * c, 0);
  const counts = { ...cashInventory };
  return { totalValue: total, counts };
}

function checkInventoryAlerts() {
  const lowThreshold = 10;
  for (const [denom, count] of Object.entries(cashInventory)) {
    if (count <= 0) {
      logEvent('ALERT', { type: 'DENOM_EMPTY', denom, message: `₱${denom} denomination is empty` });
    } else if (count <= lowThreshold) {
      logEvent('ALERT', { type: 'DENOM_LOW', denom, count, message: `₱${denom} is low: ${count} remaining` });
    }
  }
  const status = getInventoryStatus();
  if (status.totalValue < 10000) {
    logEvent('ALERT', { type: 'CASH_CRITICAL', totalValue: status.totalValue, message: 'Total cash critically low' });
  }
}

/* ==================================================
   3.6 MONITORING MODULE
   ================================================== */
const auditLog = [];
const systemStatus = {
  online: true,
  lastTransaction: null,
  totalTransactions: 0,
  totalVolume: 0,
  errors: [],
  startedAt: new Date().toISOString()
};

function logEvent(type, details) {
  const entry = {
    timestamp: new Date().toISOString(),
    type,
    machineId: MACHINE_ID,
    txnId: txn ? txn.id : null,
    details
  };
  auditLog.push(entry);
  // Keep last 500 entries in memory
  if (auditLog.length > 500) auditLog.shift();
  console.log('[AUDIT]', type, JSON.stringify(details));
}

function getSystemReport() {
  const inv = getInventoryStatus();
  return {
    machineId: MACHINE_ID,
    status: systemStatus.online ? 'ONLINE' : 'OFFLINE',
    uptime: systemStatus.startedAt,
    totalTransactions: systemStatus.totalTransactions,
    totalVolume: systemStatus.totalVolume,
    cashInventory: inv,
    recentErrors: systemStatus.errors.slice(-10),
    lastTransaction: systemStatus.lastTransaction,
    auditLogSize: auditLog.length
  };
}

/* ==================================================
   3.2 TRANSACTION ENGINE — State Management
   ================================================== */
let txn = null;

function generateTxnId() {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).substring(2, 8);
  return ('TXN-' + ts + '-' + rnd).toUpperCase();
}

function createTransaction(mode) {
  txn = {
    id: generateTxnId(),
    mode: mode,
    status: 'CREATED',
    currency: null,
    targetCurrency: null,
    amount: 0,
    fee: 0,
    netAmount: 0,
    convertedAmount: 0,
    rate: null,
    payoutMethod: 'cash',
    walletType: null,
    walletNumber: null,
    idType: 'none',
    idNumber: null,
    otpVerified: false,
    termsAccepted: false,
    dataConsentAccepted: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
    bills: []
  };
  logEvent('TXN_CREATED', { id: txn.id, mode });
  return txn;
}

function updateTransaction(updates) {
  if (!txn) return;
  Object.assign(txn, updates);
}

function completeTransaction() {
  if (!txn) return;
  txn.status = 'COMPLETED';
  txn.completedAt = new Date().toISOString();
  systemStatus.lastTransaction = { id: txn.id, completedAt: txn.completedAt };
  systemStatus.totalTransactions++;
  systemStatus.totalVolume += txn.amount;
  logEvent('TXN_COMPLETED', {
    id: txn.id, mode: txn.mode, amount: txn.amount, fee: txn.fee,
    converted: txn.convertedAmount, payoutMethod: txn.payoutMethod
  });
}

/* ==================================================
   3.1 UI FRONTEND MODULE — i18n
   ================================================== */
const LANG = {
  en: {
    title: 'PesoXchange Kiosk',
    subtitle: 'Insert cash below to get started',
    welcome: 'PesoXchange',
    tagline: 'Fast & Secure Currency Exchange',
    bspLicensed: 'BSP Licensed',
    service247: '24/7 Service',
    competitiveRates: 'Competitive Rates',
    tapToStart: 'Tap to Get Started',
    touchToBegin: 'Touch anywhere to begin',
    welcomeTitle: 'Our Services',
    selectService: 'Choose a service to get started',
    coinsChange: 'Coins & Change',
    coinsChangeDesc: 'Break bills into smaller denominations',
    foreignExchange: 'Foreign Currency Exchange',
    foreignExchangeDesc: 'Convert foreign bills to Philippine Pesos',
    touchServiceHint: 'Touch a service above to begin',
    back: 'Back',
    cancel: 'Cancel',
    proceed: 'Proceed',
    confirm: 'Confirm',
    help: 'Help',
    complianceTitle: 'Compliance Verification',
    complianceSubtitle: 'Required by BSP (Bangko Sentral ng Pilipinas) regulations',
    complianceNotice: 'Transactions exceeding ₱50,000 require a valid government-issued ID.',
    txnType: 'Transaction type',
    idType: 'Identification type',
    noId: 'No ID (below ₱50,000)',
    idLast4: 'ID number (last 4 digits)',
    termsAgree: 'I agree to the <strong>Terms of Service</strong> and acknowledge the <strong>Anti-Money Laundering</strong> disclosure.',
    dataAgree: 'I consent to the collection and processing of my data per the <strong>Data Privacy Act of 2012</strong>.',
    proceedToTxn: 'Proceed to Transaction',
    amountInserted: 'Amount inserted',
    quickSelect: 'Quick select',
    totalInserted: 'Total inserted',
    serviceFee: 'Service fee',
    youReceive: 'You receive',
    billsBreakdown: 'Bills & coins breakdown',
    exchangeRate: 'Exchange rate',
    currencyInserted: 'Currency inserted',
    convertTo: 'Convert to',
    confirmTxn: 'Confirm Transaction',
    reviewDetails: 'Please review the details below',
    confirmDispense: 'Confirm & Dispense',
    txnComplete: 'Transaction complete!',
    collectCash: 'Please collect your cash below.',
    collectCoins: 'Collect your coins and bills below.',
    anotherTxn: 'Make Another Transaction',
    backToHome: 'Back to Home',
    payoutTitle: 'Choose Payout Method',
    payoutSubtitle: 'How would you like to receive your funds?',
    cashPayout: 'Cash Payout',
    cashPayoutDesc: 'Collect physical bills & coins',
    gcashPayout: 'GCash',
    gcashPayoutDesc: 'Send to your GCash wallet',
    mayaPayout: 'Maya',
    mayaPayoutDesc: 'Send to your Maya wallet',
    digitalPayoutTitle: 'Digital Payout',
    walletNumber: 'Mobile / Wallet number',
    walletPlaceholder: '09XX XXX XXXX',
    walletHint: 'Enter your 11-digit mobile number',
    sendToWallet: 'Send to Wallet',
    otpTitle: 'OTP Verification',
    otpSubtitle: 'Enter the 6-digit code sent to your registered number',
    otpPlaceholder: '000000',
    verifyOtp: 'Verify & Continue',
    resendOtp: 'Resend Code',
    otpSentTo: 'Code sent to',
    helpTitle: 'Need Help?',
    helpText: 'If you experience any issues, please contact our support hotline or visit the nearest service desk.',
    helpHotline: 'Hotline: 1-800-PESO (7376)',
    helpEmail: 'Email: support@pesoxchange.ph',
    closeHelp: 'Close',
    stepService: 'Service',
    stepVerify: 'Verify',
    stepAmount: 'Amount',
    stepPayout: 'Payout',
    stepConfirm: 'Confirm',
    inventoryLow: 'Some denominations are running low.',
    inserted: 'Inserted',
    fee: 'Fee',
    rate: 'Rate',
    dispensed: 'Dispensed',
    payout: 'Payout',
    wallet: 'Wallet',
    digitalTransfer: 'Funds sent to your wallet.',
    txnId: 'Transaction ID'
  },
  fil: {
    title: 'PesoXchange Kiosk',
    subtitle: 'Maglagay ng pera sa ibaba para magsimula',
    welcome: 'PesoXchange',
    tagline: 'Mabilis at Ligtas na Palitan ng Pera',
    bspLicensed: 'Lisensyado ng BSP',
    service247: '24/7 Serbisyo',
    competitiveRates: 'Magandang Palitan',
    tapToStart: 'Pindutin para Magsimula',
    touchToBegin: 'Pindutin kahit saan para magsimula',
    welcomeTitle: 'Aming mga Serbisyo',
    selectService: 'Pumili ng serbisyo para magsimula',
    coinsChange: 'Barya at Sukli',
    coinsChangeDesc: 'Hatiin ang mga bill sa mas maliliit na halaga',
    foreignExchange: 'Palitan ng Dayuhang Pera',
    foreignExchangeDesc: 'Palitan ang dayuhang pera sa Philippine Peso',
    touchServiceHint: 'Pindutin ang serbisyo sa itaas para magsimula',
    back: 'Bumalik',
    cancel: 'Kanselahin',
    proceed: 'Magpatuloy',
    confirm: 'Kumpirmahin',
    help: 'Tulong',
    complianceTitle: 'Beripikasyon ng Pagkakakilanlan',
    complianceSubtitle: 'Kinakailangan ng BSP (Bangko Sentral ng Pilipinas)',
    complianceNotice: 'Ang mga transaksyon na higit sa ₱50,000 ay nangangailangan ng valid na government ID.',
    txnType: 'Uri ng transaksyon',
    idType: 'Uri ng pagkakakilanlan',
    noId: 'Walang ID (mababa sa ₱50,000)',
    idLast4: 'Numero ng ID (huling 4 na digit)',
    termsAgree: 'Sumasang-ayon ako sa <strong>Terms of Service</strong> at kinikilala ang <strong>Anti-Money Laundering</strong> disclosure.',
    dataAgree: 'Pumapayag ako sa pagkolekta ng aking datos ayon sa <strong>Data Privacy Act of 2012</strong>.',
    proceedToTxn: 'Magpatuloy sa Transaksyon',
    amountInserted: 'Halagang ipinasok',
    quickSelect: 'Mabilis na pagpili',
    totalInserted: 'Kabuuang ipinasok',
    serviceFee: 'Bayad sa serbisyo',
    youReceive: 'Matatanggap mo',
    billsBreakdown: 'Detalye ng bill at barya',
    exchangeRate: 'Palitan ng halaga',
    currencyInserted: 'Perang ipinasok',
    convertTo: 'Palitan sa',
    confirmTxn: 'Kumpirmahin ang Transaksyon',
    reviewDetails: 'Suriin ang mga detalye sa ibaba',
    confirmDispense: 'Kumpirmahin at Ibigay',
    txnComplete: 'Kumpleto na ang transaksyon!',
    collectCash: 'Kunin ang iyong pera sa ibaba.',
    collectCoins: 'Kunin ang iyong barya at bill sa ibaba.',
    anotherTxn: 'Gumawa ng Bagong Transaksyon',
    backToHome: 'Bumalik sa Simula',
    payoutTitle: 'Pumili ng Paraan ng Pagbabayad',
    payoutSubtitle: 'Paano mo gustong matanggap ang iyong pera?',
    cashPayout: 'Cash Payout',
    cashPayoutDesc: 'Kunin ang pisikal na bill at barya',
    gcashPayout: 'GCash',
    gcashPayoutDesc: 'Ipadala sa iyong GCash wallet',
    mayaPayout: 'Maya',
    mayaPayoutDesc: 'Ipadala sa iyong Maya wallet',
    digitalPayoutTitle: 'Digital na Pagbabayad',
    walletNumber: 'Numero ng Mobile / Wallet',
    walletPlaceholder: '09XX XXX XXXX',
    walletHint: 'Ilagay ang iyong 11-digit na numero',
    sendToWallet: 'Ipadala sa Wallet',
    otpTitle: 'OTP Beripikasyon',
    otpSubtitle: 'Ilagay ang 6-digit code na ipinadala sa iyong numero',
    otpPlaceholder: '000000',
    verifyOtp: 'I-verify at Magpatuloy',
    resendOtp: 'Ipadala Muli',
    otpSentTo: 'Code ipinadala sa',
    helpTitle: 'Kailangan ng Tulong?',
    helpText: 'Kung may problema, tumawag sa aming hotline o pumunta sa pinakamalapit na service desk.',
    helpHotline: 'Hotline: 1-800-PESO (7376)',
    helpEmail: 'Email: support@pesoxchange.ph',
    closeHelp: 'Isara',
    stepService: 'Serbisyo',
    stepVerify: 'I-verify',
    stepAmount: 'Halaga',
    stepPayout: 'Bayad',
    stepConfirm: 'Kumpirma',
    inventoryLow: 'Ilang denominasyon ay malapit nang maubos.',
    inserted: 'Ipinasok',
    fee: 'Bayad',
    rate: 'Palitan',
    dispensed: 'Ibinigay',
    payout: 'Pagbabayad',
    wallet: 'Wallet',
    digitalTransfer: 'Pera ipinadala sa iyong wallet.',
    txnId: 'Transaction ID'
  }
};

let currentLang = 'en';

function t(key) { return LANG[currentLang][key] || LANG.en[key] || key; }

function toggleLanguage() {
  currentLang = currentLang === 'en' ? 'fil' : 'en';
  applyLanguage();
  logEvent('LANG_CHANGE', { lang: currentLang });
}

function applyLanguage() {
  const langBtn = document.getElementById('lang-btn');
  langBtn.textContent = currentLang === 'en' ? '🌐 EN' : '🌐 FIL';
  document.getElementById('header-title').textContent = t('title');
  document.getElementById('header-subtitle').textContent = t('subtitle');
  // Splash
  document.querySelector('.splash-screen h2').textContent = t('welcome');
  document.querySelector('.splash-tagline').textContent = t('tagline');
  document.querySelector('.btn-start-touch span:last-child, .btn-start-touch').lastChild.textContent = ' ' + t('tapToStart');
  document.querySelector('.splash-hint').textContent = t('touchToBegin');
  const feats = document.querySelectorAll('.splash-feature span');
  if (feats[0]) feats[0].textContent = t('bspLicensed');
  if (feats[1]) feats[1].textContent = t('service247');
  if (feats[2]) feats[2].textContent = t('competitiveRates');
  // Idle
  document.querySelector('.idle-screen h2').textContent = t('welcomeTitle');
  document.querySelector('.idle-screen .subtitle').textContent = t('selectService');
  const modeBtns = document.querySelectorAll('.mode-btn .mode-text');
  if (modeBtns[0]) { modeBtns[0].querySelector('h3').textContent = t('coinsChange'); modeBtns[0].querySelector('p').textContent = t('coinsChangeDesc'); }
  if (modeBtns[1]) { modeBtns[1].querySelector('h3').textContent = t('foreignExchange'); modeBtns[1].querySelector('p').textContent = t('foreignExchangeDesc'); }
  document.querySelector('.idle-hint').textContent = t('touchServiceHint');
  // Steps
  updateStepLabels();
  // Help btn
  document.getElementById('help-btn').innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> ' + t('help');
}

/* ---- UI: Step Progress Indicator ---- */
let currentStep = 0;
const STEPS_CHANGE  = ['stepService', 'stepVerify', 'stepAmount', 'stepConfirm'];
const STEPS_FOREIGN = ['stepService', 'stepVerify', 'stepAmount', 'stepPayout', 'stepConfirm'];

function getSteps() { return currentTab === 'foreign' ? STEPS_FOREIGN : STEPS_CHANGE; }

function updateStepLabels() {
  const steps = getSteps();
  const bar = document.getElementById('step-bar');
  if (!bar) return;
  bar.innerHTML = steps.map((key, i) =>
    `<div class="step${i < currentStep ? ' done' : ''}${i === currentStep ? ' active' : ''}" data-step="${i}">
      <div class="step-num">${i < currentStep ? '✓' : i + 1}</div>
      <div class="step-label">${t(key)}</div>
    </div>`
  ).join('<div class="step-line"></div>');
}

function setStep(n) {
  currentStep = n;
  const bar = document.getElementById('step-bar');
  bar.classList.toggle('hidden', n < 0);
  if (n >= 0) updateStepLabels();
}

/* ==================================================
   VIEW TRANSITION HELPERS
   ================================================== */
function transitionView(outEl, inEl, callback) {
  outEl.classList.remove('fade-in');
  outEl.classList.add('fade-out');
  setTimeout(() => {
    outEl.classList.add('hidden');
    outEl.classList.remove('fade-out');
    inEl.classList.remove('hidden');
    inEl.classList.add('fade-enter');
    if (callback) callback();
    void inEl.offsetWidth;
    inEl.classList.remove('fade-enter');
    inEl.classList.add('fade-in');
  }, 250);
}

function getVisibleView() {
  const views = ['splash-view','idle-view','compliance-view','main-view','payout-view','digital-payout-view','otp-view','success-view'];
  for (const id of views) {
    const el = document.getElementById(id);
    if (el && !el.classList.contains('hidden')) return el;
  }
  return null;
}

/* ==================================================
   SCREEN: SPLASH (Attract)
   ================================================== */
function showServiceSelection() {
  const splash = document.getElementById('splash-view');
  const idle   = document.getElementById('idle-view');
  setStep(0);
  transitionView(splash, idle);
  logEvent('SESSION_START', { action: 'splash_tapped' });
}

/* ==================================================
   SCREEN: SERVICE SELECTION
   ================================================== */
function startMode(mode) {
  currentTab = mode;
  createTransaction(mode);
  updateTransaction({ status: 'SERVICE_SELECTED' });
  const idle = document.getElementById('idle-view');
  const comp = document.getElementById('compliance-view');
  // Update compliance badge
  document.getElementById('compliance-type-badge').textContent =
    mode === 'change' ? t('coinsChange') : t('foreignExchange');
  setStep(1);
  transitionView(idle, comp, () => initCompliance());
}

/* ==================================================
   3.5 COMPLIANCE MODULE
   ================================================== */
function initCompliance() {
  document.getElementById('id-type-select').value = 'none';
  document.getElementById('id-number-field').classList.add('hidden');
  document.getElementById('id-number-input').value = '';
  document.getElementById('terms-checkbox').checked = false;
  document.getElementById('data-checkbox').checked = false;
  document.getElementById('compliance-proceed-btn').disabled = true;
}

function onIdTypeChange() {
  const val = document.getElementById('id-type-select').value;
  document.getElementById('id-number-field').classList.toggle('hidden', val === 'none');
  validateCompliance();
}

function validateCompliance() {
  const idType = document.getElementById('id-type-select').value;
  const idNum  = document.getElementById('id-number-input').value.trim();
  const terms  = document.getElementById('terms-checkbox').checked;
  const data   = document.getElementById('data-checkbox').checked;

  let valid = terms && data;
  if (idType !== 'none' && idNum.length < 4) valid = false;

  document.getElementById('compliance-proceed-btn').disabled = !valid;
  return valid;
}

function proceedFromCompliance() {
  if (!validateCompliance()) return;
  const idType = document.getElementById('id-type-select').value;
  const idNum  = document.getElementById('id-number-input').value.trim();

  updateTransaction({
    status: 'COMPLIANCE_VERIFIED',
    idType: idType,
    idNumber: idType !== 'none' ? idNum : null,
    termsAccepted: true,
    dataConsentAccepted: true
  });
  logEvent('COMPLIANCE_OK', { idType, hasId: idType !== 'none' });

  const comp = document.getElementById('compliance-view');
  const main = document.getElementById('main-view');
  setStep(2);
  transitionView(comp, main, () => {
    document.getElementById('change-section').classList.toggle('hidden', currentTab !== 'change');
    document.getElementById('foreign-section').classList.toggle('hidden', currentTab !== 'foreign');
    document.getElementById('foreign-selector').classList.toggle('hidden', currentTab !== 'foreign');
    document.getElementById('target-selector').classList.add('hidden');
    updateInputLabels();
    renderDenomButtons();
    onAmountChange();
  });
}

function backToServices() {
  if (txn) { txn.status = 'CANCELLED'; logEvent('TXN_CANCELLED', { id: txn.id, stage: 'compliance' }); }
  txn = null;
  const comp = document.getElementById('compliance-view');
  const idle = document.getElementById('idle-view');
  setStep(0);
  transitionView(comp, idle);
}

/* ==================================================
   SCREEN: MAIN (Amount Entry) — Transaction Engine
   ================================================== */
function isPhpToForeign() {
  return currentTab === 'foreign' && document.getElementById('currency-select').value === 'PHP';
}

function getActiveForeignCur() {
  if (isPhpToForeign()) return document.getElementById('target-select').value;
  return document.getElementById('currency-select').value;
}

function updateInputLabels() {
  const label  = document.getElementById('amount-label');
  const prefix = document.getElementById('currency-prefix');
  if (currentTab === 'foreign') {
    const cur = document.getElementById('currency-select').value;
    if (cur === 'PHP') {
      label.textContent = t('amountInserted') + ' (Philippine Peso)';
      prefix.innerHTML = '\u20b1';
    } else {
      label.textContent = t('amountInserted') + ' (' + NAMES[cur] + ')';
      prefix.textContent = SYMBOLS[cur];
    }
  } else {
    label.textContent = t('amountInserted') + ' (PHP ₱)';
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
  document.getElementById('amount-input').value = n;
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

function onAmountChange() {
  const raw = parseFloat(document.getElementById('amount-input').value) || 0;

  if (currentTab === 'change') {
    const fee     = raw * CHANGE_FEE;
    const receive = raw - fee;
    document.getElementById('cr-inserted').textContent = fmt(raw);
    document.getElementById('cr-fee').textContent      = fmt(fee);
    document.getElementById('cr-receive').textContent  = fmt(receive);
    const { bills, shortfall } = calcBillsWithInventory(receive);
    const bd = document.getElementById('bill-display');
    if (shortfall > 0 && raw > 0) {
      bd.innerHTML = bills.map(b => `<span class="bill-tag">${b.count > 1 ? b.count + '×' : ''}₱${b.denom}</span>`).join('') +
        `<span class="bill-tag" style="background:#fef3c7;color:#92400e;border-color:#fde68a;">₱${shortfall} unavailable</span>`;
    } else {
      bd.innerHTML = bills.length
        ? bills.map(b => `<span class="bill-tag">${b.count > 1 ? b.count + '×' : ''}₱${b.denom}</span>`).join('')
        : '<span style="font-size:13px;color:#94a3b8;">—</span>';
    }
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
      ? t('youReceive') + ' (' + NAMES[targetCur] + ')'
      : t('youReceive') + ' (PHP)';
  }
}

/* ==================================================
   SCREEN: PAYOUT METHOD (Foreign only)
   ================================================== */
function showPayoutChoice() {
  const raw = parseFloat(document.getElementById('amount-input').value) || 0;
  if (raw <= 0) { alert(currentLang === 'fil' ? 'Maglagay muna ng halaga.' : 'Please insert an amount first.'); return; }

  // Store transaction amounts
  storeAmountInTxn(raw);

  if (currentTab === 'change') {
    updateTransaction({ payoutMethod: 'cash' });
    checkOtpOrConfirm();
  } else {
    const main   = document.getElementById('main-view');
    const payout = document.getElementById('payout-view');
    setStep(3);
    transitionView(main, payout);
  }
}

function storeAmountInTxn(raw) {
  if (currentTab === 'change') {
    updateTransaction({
      currency: 'PHP',
      amount: raw,
      fee: raw * CHANGE_FEE,
      netAmount: raw - raw * CHANGE_FEE,
      convertedAmount: raw - raw * CHANGE_FEE,
      rate: 1
    });
  } else {
    const srcCur = document.getElementById('currency-select').value;
    const phpToForeign = srcCur === 'PHP';
    const targetCur = phpToForeign ? document.getElementById('target-select').value : srcCur;
    const rate = RATES[targetCur];
    const fee = raw * FOREIGN_FEE;
    const net = raw - fee;
    const converted = phpToForeign ? (net / rate) : (net * rate);
    updateTransaction({
      currency: srcCur,
      targetCurrency: targetCur,
      amount: raw,
      fee: fee,
      netAmount: net,
      convertedAmount: converted,
      rate: rate
    });
  }
}

function selectPayout(method) {
  updateTransaction({ payoutMethod: method });
  logEvent('PAYOUT_SELECTED', { method });

  if (method === 'cash') {
    checkOtpOrConfirm();
  } else {
    // Show digital payout screen
    updateTransaction({ walletType: method });
    document.getElementById('wallet-type-label').textContent = method === 'gcash' ? 'GCash' : 'Maya';
    document.getElementById('wallet-number-input').value = '';
    document.getElementById('digital-proceed-btn').disabled = true;
    const payout  = document.getElementById('payout-view');
    const digital = document.getElementById('digital-payout-view');
    transitionView(payout, digital);
  }
}

/* ==================================================
   3.4 DIGITAL PAYOUT MODULE
   ================================================== */
function validateWallet() {
  const num = document.getElementById('wallet-number-input').value.replace(/\D/g, '');
  const valid = num.length === 11 && num.startsWith('09');
  document.getElementById('digital-proceed-btn').disabled = !valid;
  return valid;
}

function proceedFromDigitalPayout() {
  if (!validateWallet()) return;
  const num = document.getElementById('wallet-number-input').value.replace(/\D/g, '');
  updateTransaction({ walletNumber: num });
  logEvent('WALLET_VALIDATED', { walletType: txn.walletType, walletNumber: num.substring(0, 4) + '***' + num.substring(8) });
  checkOtpOrConfirm();
}

function backFromDigitalPayout() {
  const digital = document.getElementById('digital-payout-view');
  const payout  = document.getElementById('payout-view');
  transitionView(digital, payout);
}

/* ==================================================
   3.5 COMPLIANCE — OTP Verification
   ================================================== */
let otpCode = '';
let otpTimer = null;

function checkOtpOrConfirm() {
  // Check if AML threshold is exceeded AND ID was provided
  const phpAmount = txn.mode === 'change' ? txn.amount :
    (txn.currency === 'PHP' ? txn.amount : txn.convertedAmount);

  if (phpAmount >= AML_THRESHOLD && txn.idType !== 'none') {
    showOtp();
  } else {
    goToConfirm();
  }
}

function showOtp() {
  otpCode = String(Math.floor(100000 + Math.random() * 900000));
  console.log('[OTP CODE]', otpCode); // For testing
  logEvent('OTP_SENT', { maskedPhone: '09XX***XXXX' });

  document.getElementById('otp-input').value = '';
  document.getElementById('otp-error').classList.add('hidden');
  document.getElementById('otp-sent-msg').textContent = t('otpSentTo') + ' 09XX***XXXX';
  startOtpTimer();

  const visible = getVisibleView();
  const otp = document.getElementById('otp-view');
  const stepIdx = currentTab === 'foreign' ? 4 : 3;
  setStep(stepIdx);
  transitionView(visible, otp);
}

function startOtpTimer() {
  let seconds = 60;
  const timerEl = document.getElementById('otp-timer');
  const resendBtn = document.getElementById('otp-resend-btn');
  resendBtn.disabled = true;
  timerEl.textContent = '01:00';
  clearInterval(otpTimer);
  otpTimer = setInterval(() => {
    seconds--;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    timerEl.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    if (seconds <= 0) {
      clearInterval(otpTimer);
      resendBtn.disabled = false;
      timerEl.textContent = '00:00';
    }
  }, 1000);
}

function resendOtp() {
  otpCode = String(Math.floor(100000 + Math.random() * 900000));
  console.log('[OTP CODE]', otpCode);
  logEvent('OTP_RESENT', {});
  startOtpTimer();
  document.getElementById('otp-error').classList.add('hidden');
}

function verifyOtp() {
  const input = document.getElementById('otp-input').value.trim();
  if (input === otpCode) {
    clearInterval(otpTimer);
    updateTransaction({ otpVerified: true });
    logEvent('OTP_VERIFIED', {});
    goToConfirm();
  } else {
    document.getElementById('otp-error').classList.remove('hidden');
    logEvent('OTP_FAILED', { attempt: input });
  }
}

function backFromOtp() {
  clearInterval(otpTimer);
  const otp = document.getElementById('otp-view');
  const main = document.getElementById('main-view');
  setStep(2);
  transitionView(otp, main);
}

/* ==================================================
   CONFIRMATION & COMPLETION
   ================================================== */
function goToConfirm() {
  const stepIdx = getSteps().length - 1;
  setStep(stepIdx);
  showConfirmModal();
}

function buildSummary() {
  const raw = txn.amount;
  let html = '';

  html += `<div class="result-row"><span class="result-label">${t('txnId')}</span><span class="result-val" style="font-size:11px;color:#94a3b8;">${txn.id}</span></div>`;

  if (currentTab === 'change') {
    const fee = txn.fee;
    const receive = txn.netAmount;
    const { bills } = calcBillsWithInventory(receive);
    html += `
      <div class="result-row"><span class="result-label">${t('inserted')}</span><span class="result-val">${fmt(raw)}</span></div>
      <div class="result-row"><span class="result-label">${t('fee')} (1%)</span><span class="result-val">${fmt(fee)}</span></div>
      <div class="result-row"><span class="result-label">${t('dispensed')}</span><span class="result-val big">${fmt(receive)}</span></div>
      <div style="padding-top:8px;font-size:13px;color:#64748b;">${t('billsBreakdown')}:</div>
      <div class="bill-display" style="margin-top:6px;">
        ${bills.map(b => `<span class="bill-tag">${b.count > 1 ? b.count + '×' : ''}₱${b.denom}</span>`).join('') || '—'}
      </div>`;
  } else {
    const srcSym = txn.currency === 'PHP' ? '₱' : SYMBOLS[txn.currency];
    const tgtSym = txn.currency === 'PHP' ? SYMBOLS[txn.targetCurrency] : '₱';
    const rateText = txn.currency === 'PHP'
      ? '₱1 = ' + tgtSym + (1 / txn.rate).toFixed(5)
      : '1 ' + srcSym + ' = ₱' + txn.rate.toFixed(2);

    html += `
      <div class="result-row"><span class="result-label">${t('inserted')}</span><span class="result-val">${fmt(raw, srcSym)}</span></div>
      <div class="result-row"><span class="result-label">${t('fee')} (2%)</span><span class="result-val">${fmt(txn.fee, srcSym)}</span></div>
      <div class="result-row"><span class="result-label">${t('rate')}</span><span class="result-val">${rateText}</span></div>
      <div class="result-row"><span class="result-label">${t('dispensed')}</span><span class="result-val big">${fmt(txn.convertedAmount, tgtSym)}</span></div>`;

    if (txn.payoutMethod !== 'cash') {
      html += `
        <div class="result-row"><span class="result-label">${t('payout')}</span><span class="result-val">${txn.walletType === 'gcash' ? 'GCash' : 'Maya'}</span></div>
        <div class="result-row"><span class="result-label">${t('wallet')}</span><span class="result-val">${txn.walletNumber ? txn.walletNumber.substring(0,4) + '***' + txn.walletNumber.substring(8) : ''}</span></div>`;
    }
  }
  return html;
}

function showConfirmModal() {
  document.getElementById('confirm-summary').innerHTML = buildSummary();
  document.getElementById('confirm-overlay').classList.add('visible');
}

function showConfirm() {
  // Called from Proceed button on main view
  const raw = parseFloat(document.getElementById('amount-input').value) || 0;
  if (raw <= 0) { alert(currentLang === 'fil' ? 'Maglagay muna ng halaga.' : 'Please insert an amount first.'); return; }
  storeAmountInTxn(raw);

  if (currentTab === 'foreign') {
    // Go to payout selection for foreign
    const main = document.getElementById('main-view');
    const payout = document.getElementById('payout-view');
    setStep(3);
    transitionView(main, payout);
  } else {
    updateTransaction({ payoutMethod: 'cash' });
    checkOtpOrConfirm();
  }
}

function hideConfirm() {
  document.getElementById('confirm-overlay').classList.remove('visible');
}

function doExchange() {
  hideConfirm();
  const summary = buildSummary();

  // Dispense from inventory if cash payout
  if (txn.payoutMethod === 'cash') {
    const amount = currentTab === 'change' ? txn.netAmount : txn.convertedAmount;
    const { bills } = calcBillsWithInventory(amount);
    dispenseFromInventory(bills);
    txn.bills = bills;
  }

  completeTransaction();

  // Set success message
  if (txn.payoutMethod !== 'cash') {
    document.getElementById('success-msg').textContent = t('digitalTransfer');
  } else if (currentTab === 'change') {
    document.getElementById('success-msg').textContent = t('collectCoins');
  } else {
    const srcCur = txn.currency;
    if (srcCur === 'PHP') {
      document.getElementById('success-msg').textContent =
        (currentLang === 'fil' ? 'Kunin ang iyong ' : 'Collect your ') + NAMES[txn.targetCurrency] + (currentLang === 'fil' ? ' sa ibaba.' : ' below.');
    } else {
      document.getElementById('success-msg').textContent = t('collectCash');
    }
  }

  document.getElementById('success-summary').innerHTML = summary;
  const visible = getVisibleView();
  const success = document.getElementById('success-view');
  setTimeout(() => {
    setStep(-1);
    transitionView(visible, success);
  }, 200);
}

/* ==================================================
   NAVIGATION & RESET
   ================================================== */
function clearAll() {
  document.getElementById('amount-input').value = '';
  onAmountChange();
}

function anotherTransaction() {
  txn = null;
  const success = document.getElementById('success-view');
  const idle    = document.getElementById('idle-view');
  setStep(0);
  transitionView(success, idle, clearAll);
}

function resetKiosk() {
  clearAll();
  if (txn) { txn.status = 'CANCELLED'; logEvent('TXN_CANCELLED', { id: txn.id, stage: 'reset' }); }
  txn = null;
  clearInterval(otpTimer);
  const visible = getVisibleView();
  const splash  = document.getElementById('splash-view');
  setStep(-1);
  if (visible) transitionView(visible, splash);
}

function cancelGlobal() {
  if (document.getElementById('splash-view') && !document.getElementById('splash-view').classList.contains('hidden')) return;
  resetKiosk();
}

function backFromMain() {
  clearAll();
  const main = document.getElementById('main-view');
  const comp = document.getElementById('compliance-view');
  setStep(1);
  transitionView(main, comp, () => initCompliance());
}

function backFromPayout() {
  const payout = document.getElementById('payout-view');
  const main   = document.getElementById('main-view');
  setStep(2);
  transitionView(payout, main);
}

/* ==================================================
   HELP MODAL
   ================================================== */
function showHelp() {
  document.getElementById('help-overlay').classList.add('visible');
  logEvent('HELP_OPENED', {});
}

function hideHelp() {
  document.getElementById('help-overlay').classList.remove('visible');
}

/* ==================================================
   INIT: Rates Ticker
   ================================================== */
(function buildTicker() {
  const track = document.getElementById('rates-track');
  const chips = Object.keys(RATES).map(cur =>
    `<div class="rate-chip">1 ${SYMBOLS[cur]} = <span>${RATES[cur].toFixed(2)}</span> PHP</div>`
  ).join('');
  track.innerHTML = chips + chips;
})();

/* ==================================================
   INIT: Compliance Event Listeners
   ================================================== */
document.getElementById('id-type-select').addEventListener('change', onIdTypeChange);
document.getElementById('terms-checkbox').addEventListener('change', validateCompliance);
document.getElementById('data-checkbox').addEventListener('change', validateCompliance);
document.getElementById('id-number-input').addEventListener('input', validateCompliance);

/* ==================================================
   INIT: Wallet Input Listener
   ================================================== */
document.getElementById('wallet-number-input').addEventListener('input', validateWallet);

/* ==================================================
   INIT: Number Pad Logic
   ================================================== */
let numpadBuffer = '';
const numpadOverlay = document.getElementById('numpad-overlay');
const numpadValueEl = document.getElementById('numpad-value');
const amountInput   = document.getElementById('amount-input');

amountInput.setAttribute('readonly', true);
amountInput.style.cursor = 'pointer';
amountInput.addEventListener('click', openNumpad);
amountInput.addEventListener('focus', openNumpad);

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
  if (numpadBuffer.length >= 10) return;
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

/* ==================================================
   INIT: Render defaults + stepper hidden + log start
   ================================================== */
renderDenomButtons();
onAmountChange();
setStep(-1);
logEvent('SYSTEM_START', { machineId: MACHINE_ID, timestamp: new Date().toISOString() });
