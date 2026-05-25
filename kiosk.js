// Kiosk UI Navigation Logic
function backToSplash() {
  document.getElementById('language-view').classList.add('hidden');
  document.getElementById('splash-view').classList.remove('hidden');
}

// New function to return to language selection from idle screen
function backToLanguageSelection() {
  document.getElementById('idle-view').classList.add('hidden');
  document.getElementById('language-view').classList.remove('hidden');
}

// Kiosk Numpad Overlay Logic
document.addEventListener('DOMContentLoaded', function() {
  const overlay = document.getElementById('kiosk-numpad-overlay');
  const modal = overlay.querySelector('.kiosk-numpad-modal');
  let activeInput = null;

  // Show numpad for all text/tel fields
  document.body.addEventListener('focusin', function(e) {
    if (e.target.tagName === 'INPUT' && (e.target.type === 'text' || e.target.type === 'tel')) {
      activeInput = e.target;
      const rect = activeInput.getBoundingClientRect();
      const scrollY = window.scrollY || window.pageYOffset;
      const scrollX = window.scrollX || window.pageXOffset;
      modal.style.top = (rect.bottom + scrollY + 8) + 'px';
      modal.style.left = (rect.left + scrollX) + 'px';
      overlay.classList.remove('hidden');
      overlay.classList.add('active');
    }
  });

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) {
      overlay.classList.add('hidden');
      overlay.classList.remove('active');
      activeInput = null;
    }
  });

  modal.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', function() {
      const value = btn.textContent;
      if (!activeInput) return;
      if (value === 'C') {
        activeInput.value = '';
      } else if (value === 'OK') {
        overlay.classList.add('hidden');
        overlay.classList.remove('active');
        activeInput.dispatchEvent(new Event('input', { bubbles: true }));
        if (activeInput.id === 'amount-input' && typeof window.onAmountChange === 'function') {
          window.onAmountChange();
        }
        activeInput = null;
      } else {
        let max = activeInput.maxLength > 0 ? activeInput.maxLength : 1000;
        if (activeInput.value.length < max) {
          activeInput.value += value;
        }
      }
    });
  });
});

// Allow only numeric input in the amount field
document.addEventListener('DOMContentLoaded', function() {
  var amountInput = document.getElementById('amount-input');
  if (amountInput) {
    amountInput.addEventListener('input', function(e) {
      let val = amountInput.value;
      val = val.replace(/[^\d.]/g, '');
      val = val.replace(/(\..*)\./g, '$1');
      amountInput.value = val;
    });
    amountInput.addEventListener('keydown', function(e) {
      if ([46,8,9,27,13,110,190,35,36,37,38,39,40].indexOf(e.keyCode) !== -1 ||
          (e.keyCode === 65 && (e.ctrlKey || e.metaKey)) ||
          (e.keyCode === 67 && (e.ctrlKey || e.metaKey)) ||
          (e.keyCode === 86 && (e.ctrlKey || e.metaKey)) ||
          (e.keyCode === 88 && (e.ctrlKey || e.metaKey))) {
        return;
      }
      if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
        e.preventDefault();
      }
    });
  }
});

// --- PLACEHOLDER TRANSACTION FUNCTIONS ---
function createTransaction(mode) {
  const currencySelect = document.getElementById('currency-select');
  const targetSelect = document.getElementById('target-select');
  const amountInput = document.getElementById('amount-input');
  const payoutMethod = window.selectedPaymentMethod || 'cash';
  const currency = currencySelect ? currencySelect.value : 'PHP';
  const targetCurrency = targetSelect ? targetSelect.value : 'PHP';
  const netAmount = parseFloat(amountInput ? amountInput.value : '0') || 0;
  const convertedAmount = netAmount;
  window.txn = {
    id: Date.now(),
    mode,
    status: 'INIT',
    payoutMethod,
    netAmount,
    convertedAmount,
    currency,
    targetCurrency
  };
}

function updateTransaction(update) {
  if (window.txn) {
    Object.assign(window.txn, update);
    if (!window.txn.payoutMethod) window.txn.payoutMethod = window.selectedPaymentMethod || 'cash';
    if (typeof window.txn.netAmount === 'undefined') window.txn.netAmount = 0;
    if (typeof window.txn.convertedAmount === 'undefined') window.txn.convertedAmount = window.txn.netAmount;
    if (!window.txn.currency) window.txn.currency = 'PHP';
    if (!window.txn.targetCurrency) window.txn.targetCurrency = 'PHP';
  }
}

/* ============================================
   ECXCHANGE KIOSK — FULL SYSTEM
   ============================================ */

/* ---- Constants & Configuration ---- */
const RATES   = { USD: 57.50, EUR: 62.10, KRW: 0.0405, CNY: 9.09, CAD: 43.48, JPY: 0.3774, AUD: 43.48, SGD: 47.62, SAR: 15.87, HKD: 7.35 };
const SYMBOLS = { USD: '$', EUR: '€', KRW: '₩', CNY: '¥', CAD: 'C$', JPY: '¥', AUD: 'A$', SGD: 'S$', SAR: 'SR', HKD: 'HK$' };
const NAMES   = { USD: 'US Dollars', EUR: 'Euros', KRW: 'South Korean Won', CNY: 'Chinese Yuan', CAD: 'Canadian Dollars', JPY: 'Japanese Yen', AUD: 'Australian Dollars', SGD: 'Singapore Dollars', SAR: 'Saudi Riyals', HKD: 'Hong Kong Dollars' };
const CHANGE_FEE  = 0.01;
const FOREIGN_FEE = 0.02;
const AML_THRESHOLD = 50000;
const PHP_DENOMS  = [1000, 500, 200, 100, 50, 20, 10, 5, 1];
const QUICK_AMOUNTS = [20, 50, 100, 200, 500, 1000, 5000, 10000];
const MACHINE_ID = 'PKX-0042';

let currentTab = 'change';

/* ==================================================
   CASH MANAGEMENT MODULE
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
  return { totalValue: total, counts: { ...cashInventory } };
}

function checkInventoryAlerts() {
  const lowThreshold = 10;
  for (const [denom, count] of Object.entries(cashInventory)) {
    if (count <= 0) {
      logEvent('ALERT', { type: 'DENOM_EMPTY', denom });
    } else if (count <= lowThreshold) {
      logEvent('ALERT', { type: 'DENOM_LOW', denom, count });
    }
  }
  const status = getInventoryStatus();
  if (status.totalValue < 10000) {
    logEvent('ALERT', { type: 'CASH_CRITICAL', totalValue: status.totalValue });
  }
}

/* ==================================================
   MONITORING MODULE
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

// Language dictionary
const LANG = {
  en: {
    title: 'ECXChange Kiosk',
    subtitle: 'Insert cash below to get started',
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
    complianceTitle: 'Identity Verification',
    complianceSubtitle: 'Required by BSP regulations',
    complianceNotice: 'Transactions exceeding ₱50,000 require a valid government-issued ID.',
    txnType: 'Transaction type',
    idType: 'Identification type',
    noId: 'No ID (below ₱50,000)',
    idLast4: 'ID number (last 4 digits)',
    termsAgree: 'I agree to the Terms of Service and acknowledge the Anti-Money Laundering disclosure.',
    dataAgree: 'I consent to the collection and processing of my data per the Data Privacy Act of 2012.',
    proceedToTxn: 'Proceed to Transaction',
    amountInserted: 'Amount inserted',
    quickSelect: 'Quick select',
    totalInserted: 'Total inserted',
    serviceFee: 'Service fee',
    youReceive: 'You receive',
    billsBreakdown: 'Bills & coins breakdown',
    exchangeRate: 'Exchange rate',
    confirmTxn: 'Confirm Transaction',
    reviewDetails: 'Please review the details below',
    confirmDispense: 'Confirm & Dispense',
    txnComplete: 'Transaction complete!',
    collectCash: 'Please collect your cash below.',
    collectCoins: 'Please collect your coins and bills below.',
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
    sendToWallet: 'Send from E-Wallet',
    otpTitle: 'OTP Verification',
    otpSubtitle: 'Enter the 6-digit code sent to your number',
    verifyOtp: 'Verify & Continue',
    resendOtp: 'Resend Code',
    otpSentTo: 'Code sent to',
    helpTitle: 'Need Help?',
    helpText: 'If you experience any issues, please contact our support team.',
    helpHotline: 'Hotline: 1-800-PESO (7376)',
    helpEmail: 'Email: support@ecxchange.ph',
    closeHelp: 'Close',
    stepService: 'Service',
    stepVerify: 'Verify',
    stepAmount: 'Amount',
    stepPayout: 'Payout',
    stepConfirm: 'Confirm',
    receiptQuestion: 'Would you like a receipt?',
    printReceipt: 'Print Receipt',
    smsReceipt: 'SMS Receipt',
    noReceipt: 'No Receipt',
    processingTxn: 'Processing transaction...',
    scanQr: 'Scan QR Code',
    scanQrHint: 'Scan this QR code with your e-wallet app',
    orDivider: '— or —',
    enterManually: 'Enter number manually',
    backToQr: 'Back to QR scan',
    paymentMethod: 'Payment method',
    insertCash: 'Insert Cash',
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
    title: 'ECXChange Kiosk',
    subtitle: 'Maglagay ng pera sa ibaba para magsimula',
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
    complianceSubtitle: 'Kinakailangan ng BSP',
    complianceNotice: 'Ang mga transaksyon na higit sa ₱50,000 ay nangangailangan ng valid na government ID.',
    txnType: 'Uri ng transaksyon',
    idType: 'Uri ng pagkakakilanlan',
    noId: 'Walang ID (mababa sa ₱50,000)',
    idLast4: 'Numero ng ID (huling 4 na digit)',
    termsAgree: 'Sumasang-ayon ako sa Terms of Service at kinikilala ang Anti-Money Laundering disclosure.',
    dataAgree: 'Pumapayag ako sa pagkolekta ng aking datos ayon sa Data Privacy Act of 2012.',
    proceedToTxn: 'Magpatuloy sa Transaksyon',
    amountInserted: 'Halagang ipinasok',
    quickSelect: 'Mabilis na pagpili',
    totalInserted: 'Kabuuang ipinasok',
    serviceFee: 'Bayad sa serbisyo',
    youReceive: 'Matatanggap mo',
    billsBreakdown: 'Detalye ng bill at barya',
    exchangeRate: 'Palitan ng halaga',
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
    sendToWallet: 'Ipadala mula sa E-Wallet',
    otpTitle: 'OTP Beripikasyon',
    otpSubtitle: 'Ilagay ang 6-digit code na ipinadala sa iyong numero',
    verifyOtp: 'I-verify at Magpatuloy',
    resendOtp: 'Ipadala Muli',
    otpSentTo: 'Code ipinadala sa',
    helpTitle: 'Kailangan ng Tulong?',
    helpText: 'Kung may problema, tumawag sa aming hotline.',
    helpHotline: 'Hotline: 1-800-PESO (7376)',
    helpEmail: 'Email: support@ecxchange.ph',
    closeHelp: 'Isara',
    stepService: 'Serbisyo',
    stepVerify: 'I-verify',
    stepAmount: 'Halaga',
    stepPayout: 'Bayad',
    stepConfirm: 'Kumpirma',
    receiptQuestion: 'Gusto mo ba ng resibo?',
    printReceipt: 'I-print ang Resibo',
    smsReceipt: 'SMS Resibo',
    noReceipt: 'Walang Resibo',
    processingTxn: 'Pinoproseso ang transaksyon...',
    scanQr: 'I-scan ang QR Code',
    scanQrHint: 'I-scan ang QR code na ito gamit ang iyong e-wallet app',
    orDivider: '— o —',
    enterManually: 'Ilagay ang numero nang mano-mano',
    backToQr: 'Bumalik sa QR scan',
    paymentMethod: 'Paraan ng pagbabayad',
    insertCash: 'Ipasok ang Pera',
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

function logEvent(type, details) {
  const entry = {
    timestamp: new Date().toISOString(),
    type,
    machineId: MACHINE_ID,
    txnId: typeof txn !== 'undefined' && txn ? txn.id : null,
    details
  };
  auditLog.push(entry);
}

let currentLang = 'en';

function t(key) { return LANG[currentLang][key] || LANG.en[key] || key; }

function applyLanguage() {
  const headerTitleText = document.getElementById('header-title-text');
  if (headerTitleText) headerTitleText.textContent = t('title');
  const headerSubtitle = document.getElementById('header-subtitle');
  if (headerSubtitle) headerSubtitle.textContent = t('subtitle');

  const splashTagline = document.getElementById('splash-tagline');
  if (splashTagline) splashTagline.textContent = t('tagline');
  const featureBsp = document.getElementById('feature-bsp');
  if (featureBsp) featureBsp.textContent = t('bspLicensed');
  const feature247 = document.getElementById('feature-247');
  if (feature247) feature247.textContent = t('service247');
  const featureRates = document.getElementById('feature-rates');
  if (featureRates) featureRates.textContent = t('competitiveRates');
  const startTouchText = document.getElementById('start-touch-text');
  if (startTouchText) startTouchText.textContent = t('tapToStart');
  const splashHint = document.getElementById('splash-hint');
  if (splashHint) splashHint.textContent = t('touchToBegin');

  const idleView = document.getElementById('idle-view');
  if (idleView) {
    const serviceTitle = idleView.querySelector('.service-title');
    if (serviceTitle) serviceTitle.textContent = t('welcomeTitle');
    const serviceSubtitle = idleView.querySelector('.service-subtitle');
    if (serviceSubtitle) serviceSubtitle.textContent = t('selectService');
    const modeBtns = idleView.querySelectorAll('.mode-btn .mode-text');
    if (modeBtns[0]) {
      modeBtns[0].querySelector('h3').textContent = t('coinsChange');
      modeBtns[0].querySelector('p').textContent = t('coinsChangeDesc');
    }
    if (modeBtns[1]) {
      modeBtns[1].querySelector('h3').textContent = t('foreignExchange');
      modeBtns[1].querySelector('p').textContent = t('foreignExchangeDesc');
    }
    const idleHint = idleView.querySelector('.idle-hint');
    if (idleHint) idleHint.textContent = t('touchServiceHint');
  }

  const helpOverlay = document.getElementById('help-overlay');
  if (helpOverlay) {
    const helpTitle = helpOverlay.querySelector('.modal-title');
    if (helpTitle) helpTitle.textContent = t('helpTitle');
    const helpText = helpOverlay.querySelector('.modal p');
    if (helpText) helpText.textContent = t('helpText');
    const helpHotline = helpOverlay.querySelector('.help-row:first-child span');
    if (helpHotline) helpHotline.textContent = t('helpHotline');
    const helpEmail = helpOverlay.querySelector('.help-row:last-child span');
    if (helpEmail) helpEmail.textContent = t('helpEmail');
    const closeBtn = helpOverlay.querySelector('.btn-exchange');
    if (closeBtn) closeBtn.textContent = t('closeHelp');
  }
}

/* ---- UI: Step Progress Indicator ---- */
let currentStep = 0;
let selectedPaymentMethod = 'cash';
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
  if (bar) bar.classList.toggle('hidden', n < 0);
  if (n >= 0) updateStepLabels();
}

/* ==================================================
   VIEW TRANSITION HELPERS
   ================================================== */
function transitionView(outEl, inEl, callback) {
  if (!outEl || !inEl) return;
  outEl.classList.remove('fade-in');
  outEl.classList.add('fade-out');
  setTimeout(() => {
    outEl.classList.add('hidden');
    outEl.classList.remove('fade-out');
    inEl.classList.remove('hidden');
    inEl.classList.add('fade-enter');
    bindNumpadInputs();
    if (callback) callback();
    void inEl.offsetWidth;
    inEl.classList.remove('fade-enter');
    inEl.classList.add('fade-in');
  }, 250);
}

function getVisibleView() {
  const views = ['splash-view','idle-view','rates-view','compliance-view','main-view','payout-view','digital-payout-view','otp-view','success-view','processing-view'];
  for (const id of views) {
    const el = document.getElementById(id);
    if (el && !el.classList.contains('hidden')) return el;
  }
  return null;
}

/* ==================================================
   SCREEN: SPLASH (Attract)
   ================================================== */
window.showServiceSelection = function showServiceSelection() {
  const splash = document.getElementById('splash-view');
  const langSel = document.getElementById('language-view');
  setStep(-1);
  transitionView(splash, langSel);
  logEvent('LANGUAGE_SELECT', { action: 'splash_tapped' });
};

function selectLanguage(lang) {
  if (lang === 'fil') {
    currentLang = 'fil';
  } else {
    currentLang = 'en';
  }
  applyLanguage();
  const langSel = document.getElementById('language-view');
  const idle = document.getElementById('idle-view');
  setStep(0);
  transitionView(langSel, idle);
  logEvent('LANGUAGE_SELECTED', { lang });
}

/* ==================================================
   SCREEN: EXCHANGE RATES VIEW
   ================================================== */
const FLAGS = { USD: '🇺🇸', EUR: '🇪🇺', KRW: '🇰🇷', CNY: '🇨🇳', CAD: '🇨🇦', JPY: '🇯🇵', AUD: '🇦🇺', SGD: '🇸🇬', SAR: '🇸🇦', HKD: '🇭🇰' };

function showRatesView() {
  const idle = document.getElementById('idle-view');
  const rates = document.getElementById('rates-view');
  populateRatesTable();
  transitionView(idle, rates);
}

function backFromRates() {
  const rates = document.getElementById('rates-view');
  const idle = document.getElementById('idle-view');
  transitionView(rates, idle);
}

function populateRatesTable() {
  const table = document.getElementById('rates-table');
  if (!table) return;
  
  let html = '<div class="rates-grid">';
  const order = ['USD', 'EUR', 'JPY', 'CNY', 'CAD', 'AUD', 'SGD', 'KRW', 'HKD', 'SAR'];
  
  for (const cur of Object.keys(RATES).sort((a, b) => order.indexOf(a) - order.indexOf(b))) {
    const rate = RATES[cur];
    const flag = FLAGS[cur] || '';
    const name = NAMES[cur] || cur;
    const symbol = SYMBOLS[cur] || '';
    
    html += `
      <div class="rate-card">
        <div class="rate-card-header">
          <span class="rate-flag">${flag}</span>
          <span class="rate-code">${cur}</span>
          <span class="rate-symbol">(${symbol})</span>
        </div>
        <div class="rate-card-name">${name}</div>
        <div class="rate-card-value">
          <span class="rate-amount">₱${rate.toFixed(2)}</span>
          <span class="rate-unit">per 1 ${cur}</span>
        </div>
      </div>
    `;
  }
  html += '</div>';
  table.innerHTML = html;
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
  const badge = document.getElementById('compliance-type-badge');
  if (badge) badge.textContent = mode === 'change' ? t('coinsChange') : t('foreignExchange');
  setStep(1);
  transitionView(idle, comp, () => initCompliance());
}

/* ==================================================
   COMPLIANCE MODULE
   ================================================== */
function initCompliance() {
  const idTypeSelect = document.getElementById('id-type-select');
  if (idTypeSelect) idTypeSelect.value = 'none';
  const idNumberField = document.getElementById('id-number-field');
  if (idNumberField) idNumberField.classList.add('hidden');
  const idNumberInput = document.getElementById('id-number-input');
  if (idNumberInput) idNumberInput.value = '';
  const termsCheckbox = document.getElementById('terms-checkbox');
  if (termsCheckbox) termsCheckbox.checked = false;
  const dataCheckbox = document.getElementById('data-checkbox');
  if (dataCheckbox) dataCheckbox.checked = false;
  const proceedBtn = document.getElementById('compliance-proceed-btn');
  if (proceedBtn) proceedBtn.disabled = true;
}

function onIdTypeChange() {
  const val = document.getElementById('id-type-select').value;
  const idNumberField = document.getElementById('id-number-field');
  if (idNumberField) idNumberField.classList.toggle('hidden', val === 'none');
  validateCompliance();
}

function validateCompliance() {
  const idType = document.getElementById('id-type-select').value;
  const idNum = document.getElementById('id-number-input').value.trim();
  const terms = document.getElementById('terms-checkbox').checked;
  const data = document.getElementById('data-checkbox').checked;
  let valid = terms && data;
  if (idType !== 'none' && idNum.length < 4) valid = false;
  const proceedBtn = document.getElementById('compliance-proceed-btn');
  if (proceedBtn) proceedBtn.disabled = !valid;
  return valid;
}

function proceedFromCompliance() {
  if (!validateCompliance()) return;
  const idType = document.getElementById('id-type-select').value;
  const idNum = document.getElementById('id-number-input').value.trim();
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
    const changeSection = document.getElementById('change-section');
    const foreignSection = document.getElementById('foreign-section');
    const foreignSelector = document.getElementById('foreign-selector');
    const targetSelector = document.getElementById('target-selector');
    if (changeSection) changeSection.classList.toggle('hidden', currentTab !== 'change');
    if (foreignSection) foreignSection.classList.toggle('hidden', currentTab !== 'foreign');
    if (foreignSelector) foreignSelector.classList.toggle('hidden', currentTab !== 'foreign');
    if (targetSelector) targetSelector.classList.add('hidden');
    selectedPaymentMethod = 'cash';
    const paymentBtns = document.querySelectorAll('.payment-method-btn');
    paymentBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.method === 'cash'));
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
   SCREEN: MAIN (Amount Entry)
   ================================================== */
function updateInputLabels() {
  const label = document.getElementById('amount-label');
  const prefix = document.getElementById('currency-prefix');
  if (currentTab === 'foreign') {
    const curSelect = document.getElementById('currency-select');
    if (curSelect) {
      const cur = curSelect.value;
      if (cur === 'PHP') {
        if (label) label.textContent = t('amountInserted') + ' (Philippine Peso)';
        if (prefix) prefix.innerHTML = '₱';
      } else {
        if (label) label.textContent = t('amountInserted') + ' (' + NAMES[cur] + ')';
        if (prefix) prefix.textContent = SYMBOLS[cur];
      }
    }
  } else {
    if (label) label.textContent = t('amountInserted') + ' (PHP ₱)';
    if (prefix) prefix.innerHTML = '₱';
  }
}

function onCurrencyChange() {
  const curSelect = document.getElementById('currency-select');
  if (curSelect) {
    const cur = curSelect.value;
    const targetSelector = document.getElementById('target-selector');
    if (targetSelector) targetSelector.classList.toggle('hidden', cur !== 'PHP' || currentTab !== 'foreign');
  }
  updateInputLabels();
  renderDenomButtons();
  onAmountChange();
}

function addAmount(n) {
  const amountInput = document.getElementById('amount-input');
  if (amountInput) amountInput.value = n;
  onAmountChange();
}

function renderDenomButtons() {
  const grid = document.getElementById('denom-grid');
  if (!grid) return;
  let sym = '₱';
  if (currentTab === 'foreign') {
    const curSelect = document.getElementById('currency-select');
    if (curSelect) {
      const cur = curSelect.value;
      sym = cur === 'PHP' ? '₱' : SYMBOLS[cur];
    }
  }
  grid.innerHTML = QUICK_AMOUNTS.map(n => `<button class="denom-btn" onclick="addAmount(${n})">${sym}${n.toLocaleString('en-PH')}</button>`).join('');
}

function fmt(n, sym) {
  return (sym || '₱') + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function onAmountChange() {
  const amountInput = document.getElementById('amount-input');
  const raw = parseFloat(amountInput ? amountInput.value : '0') || 0;
  if (currentTab === 'change') {
    const fee = raw * CHANGE_FEE;
    const receive = raw - fee;
    const crInserted = document.getElementById('cr-inserted');
    const crFee = document.getElementById('cr-fee');
    const crReceive = document.getElementById('cr-receive');
    if (crInserted) crInserted.textContent = fmt(raw);
    if (crFee) crFee.textContent = fmt(fee);
    if (crReceive) crReceive.textContent = fmt(receive);
    const { bills, shortfall } = calcBillsWithInventory(receive);
    const bd = document.getElementById('bill-display');
    if (bd) {
      if (shortfall > 0 && raw > 0) {
        bd.innerHTML = bills.map(b => `<span class="bill-tag">${b.count > 1 ? b.count + '×' : ''}₱${b.denom}</span>`).join('') +
          `<span class="bill-tag" style="background:#fef3c7;color:#92400e;">₱${shortfall} unavailable</span>`;
      } else {
        bd.innerHTML = bills.length ? bills.map(b => `<span class="bill-tag">${b.count > 1 ? b.count + '×' : ''}₱${b.denom}</span>`).join('') : '<span>—</span>';
      }
    }
  } else {
    const srcCurSelect = document.getElementById('currency-select');
    if (!srcCurSelect) return;
    const srcCur = srcCurSelect.value;
    const phpToForeign = srcCur === 'PHP';
    const targetCur = phpToForeign ? document.getElementById('target-select').value : srcCur;
    const srcSym = phpToForeign ? '₱' : SYMBOLS[srcCur];
    const tgtSym = phpToForeign ? SYMBOLS[targetCur] : '₱';
    const rate = RATES[targetCur];
    const fee = raw * FOREIGN_FEE;
    const net = raw - fee;
    const converted = phpToForeign ? (net / rate) : (net * rate);
    const frInserted = document.getElementById('fr-inserted');
    const frFee = document.getElementById('fr-fee');
    const frRate = document.getElementById('fr-rate');
    const frReceive = document.getElementById('fr-receive');
    const frReceiveLabel = document.getElementById('fr-receive-label');
    if (frInserted) frInserted.textContent = fmt(raw, srcSym);
    if (frFee) frFee.textContent = fmt(fee, srcSym);
    if (frRate) frRate.textContent = phpToForeign ? '₱1 = ' + tgtSym + (1 / rate).toFixed(5) : '1 ' + srcSym + ' = ₱' + rate.toFixed(2);
    if (frReceive) frReceive.textContent = fmt(converted, tgtSym);
    if (frReceiveLabel) frReceiveLabel.textContent = phpToForeign ? t('youReceive') + ' (' + NAMES[targetCur] + ')' : t('youReceive') + ' (PHP)';
  }
}

/* ==================================================
   PAYOUT METHOD
   ================================================== */
function showPayoutChoice() {
  const amountInput = document.getElementById('amount-input');
  const raw = parseFloat(amountInput ? amountInput.value : '0') || 0;
  if (raw <= 0) { kioskAlert(currentLang === 'fil' ? 'Maglagay muna ng halaga.' : 'Please insert an amount first.'); return; }
  storeAmountInTxn(raw);
  if (currentTab === 'change') {
    updateTransaction({ payoutMethod: 'cash' });
    checkOtpOrConfirm();
  } else {
    const main = document.getElementById('main-view');
    const payout = document.getElementById('payout-view');
    setStep(3);
    transitionView(main, payout);
  }
}

function storeAmountInTxn(raw) {
  if (currentTab === 'change') {
    updateTransaction({ currency: 'PHP', amount: raw, fee: raw * CHANGE_FEE, netAmount: raw - raw * CHANGE_FEE, convertedAmount: raw - raw * CHANGE_FEE, rate: 1 });
  } else {
    const srcCurSelect = document.getElementById('currency-select');
    const srcCur = srcCurSelect ? srcCurSelect.value : 'USD';
    const phpToForeign = srcCur === 'PHP';
    const targetCur = phpToForeign ? document.getElementById('target-select').value : srcCur;
    const rate = RATES[targetCur];
    const fee = raw * FOREIGN_FEE;
    const net = raw - fee;
    const converted = phpToForeign ? (net / rate) : (net * rate);
    updateTransaction({ currency: srcCur, targetCurrency: targetCur, amount: raw, fee: fee, netAmount: net, convertedAmount: converted, rate: rate });
  }
}

function selectPayout(method) {
  updateTransaction({ payoutMethod: method });
  logEvent('PAYOUT_SELECTED', { method });
  let phpAmount;
  if (currentTab === 'change') {
    phpAmount = txn.amount;
  } else {
    const srcCur = txn.currency;
    phpAmount = srcCur === 'PHP' ? txn.amount : txn.convertedAmount;
  }
  if (method === 'cash') {
    if (phpAmount > 99999) {
      kioskAlert(currentLang === 'fil' ? 'Walang sapat na pera sa makina para sa halagang ito.' : "There isn't enough money in the machine for this amount.");
      return;
    }
    checkOtpOrConfirm();
  } else {
    updateTransaction({ walletType: method });
    const walletTypeLabel = document.getElementById('wallet-type-label');
    if (walletTypeLabel) walletTypeLabel.textContent = method === 'gcash' ? 'GCash' : 'Maya';
    const walletNumberInput = document.getElementById('wallet-number-input');
    if (walletNumberInput) walletNumberInput.value = '';
    const digitalProceedBtn = document.getElementById('digital-proceed-btn');
    if (digitalProceedBtn) digitalProceedBtn.disabled = true;
    const payout = document.getElementById('payout-view');
    const digital = document.getElementById('digital-payout-view');
    transitionView(payout, digital);
  }
}

function validateWallet() {
  const numInput = document.getElementById('wallet-number-input');
  if (!numInput) return false;
  const num = numInput.value.replace(/\D/g, '');
  const valid = num.length === 11 && num.startsWith('09');
  const digitalProceedBtn = document.getElementById('digital-proceed-btn');
  if (digitalProceedBtn) digitalProceedBtn.disabled = !valid;
  return valid;
}

function proceedFromDigitalPayout() {
  if (!validateWallet()) return;
  const numInput = document.getElementById('wallet-number-input');
  const num = numInput ? numInput.value.replace(/\D/g, '') : '';
  updateTransaction({ walletNumber: num });
  logEvent('WALLET_VALIDATED', { walletType: txn.walletType });
  checkOtpOrConfirm();
}

function backFromDigitalPayout() {
  const digital = document.getElementById('digital-payout-view');
  const main = document.getElementById('main-view');
  setStep(2);
  transitionView(digital, main);
}

/* ==================================================
   OTP Verification
   ================================================== */
let otpCode = '';
let otpTimer = null;

function checkOtpOrConfirm() {
  const phpAmount = txn.mode === 'change' ? txn.amount : (txn.currency === 'PHP' ? txn.amount : txn.convertedAmount);
  if (phpAmount >= AML_THRESHOLD && txn.idType !== 'none') {
    showOtp();
  } else {
    goToConfirm();
  }
}

function showOtp() {
  otpCode = '111111';
  console.log('[OTP CODE]', otpCode);
  logEvent('OTP_SENT', {});
  const otpInput = document.getElementById('otp-input');
  if (otpInput) otpInput.value = '';
  const otpError = document.getElementById('otp-error');
  if (otpError) otpError.classList.add('hidden');
  const otpSentMsg = document.getElementById('otp-sent-msg');
  if (otpSentMsg) otpSentMsg.textContent = t('otpSentTo') + ' 09XX***XXXX';
  startOtpTimer();
  const visible = getVisibleView();
  const otp = document.getElementById('otp-view');
  const stepIdx = currentTab === 'foreign' ? 4 : 3;
  setStep(stepIdx);
  if (visible && otp) transitionView(visible, otp);
}

function startOtpTimer() {
  let seconds = 60;
  const timerEl = document.getElementById('otp-timer');
  const resendBtn = document.getElementById('otp-resend-btn');
  if (resendBtn) resendBtn.disabled = true;
  if (timerEl) timerEl.textContent = '01:00';
  clearInterval(otpTimer);
  otpTimer = setInterval(() => {
    seconds--;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (timerEl) timerEl.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    if (seconds <= 0) {
      clearInterval(otpTimer);
      if (resendBtn) resendBtn.disabled = false;
      if (timerEl) timerEl.textContent = '00:00';
    }
  }, 1000);
}

function resendOtp() {
  otpCode = '111111';
  console.log('[OTP CODE]', otpCode);
  logEvent('OTP_RESENT', {});
  startOtpTimer();
  const otpError = document.getElementById('otp-error');
  if (otpError) otpError.classList.add('hidden');
}

function verifyOtp() {
  const otpInput = document.getElementById('otp-input');
  const input = otpInput ? otpInput.value.trim() : '';
  if (input === otpCode) {
    clearInterval(otpTimer);
    updateTransaction({ otpVerified: true });
    logEvent('OTP_VERIFIED', {});
    goToConfirm();
  } else {
    const otpError = document.getElementById('otp-error');
    if (otpError) otpError.classList.remove('hidden');
    logEvent('OTP_FAILED', { attempt: input });
  }
}

function backFromOtp() {
  clearInterval(otpTimer);
  const otp = document.getElementById('otp-view');
  const main = document.getElementById('main-view');
  setStep(2);
  if (otp && main) transitionView(otp, main);
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
  if (!txn) return '';
  const raw = txn.amount;
  let html = `<div class="result-row"><span class="result-label">${t('txnId')}</span><span class="result-val">${txn.id}</span></div>`;
  if (currentTab === 'change') {
    const receive = txn.netAmount;
    const { bills } = calcBillsWithInventory(receive);
    html += `<div class="result-row"><span class="result-label">${t('inserted')}</span><span class="result-val">${fmt(raw)}</span></div>
      <div class="result-row"><span class="result-label">${t('fee')} (1%)</span><span class="result-val">${fmt(txn.fee)}</span></div>
      <div class="result-row"><span class="result-label">${t('dispensed')}</span><span class="result-val big">${fmt(receive)}</span></div>
      <div><div style="font-size:12px;color:#64748b;">${t('billsBreakdown')}:</div>
      <div class="bill-display">${bills.map(b => `<span class="bill-tag">${b.count > 1 ? b.count + '×' : ''}₱${b.denom}</span>`).join('') || '—'}</div></div>`;
  } else {
    const srcSym = txn.currency === 'PHP' ? '₱' : SYMBOLS[txn.currency];
    const tgtSym = txn.currency === 'PHP' ? SYMBOLS[txn.targetCurrency] : '₱';
    const rateText = txn.currency === 'PHP' ? '₱1 = ' + tgtSym + (1 / txn.rate).toFixed(5) : '1 ' + srcSym + ' = ₱' + txn.rate.toFixed(2);
    html += `<div class="result-row"><span class="result-label">${t('inserted')}</span><span class="result-val">${fmt(raw, srcSym)}</span></div>
      <div class="result-row"><span class="result-label">${t('fee')} (2%)</span><span class="result-val">${fmt(txn.fee, srcSym)}</span></div>
      <div class="result-row"><span class="result-label">${t('rate')}</span><span class="result-val">${rateText}</span></div>
      <div class="result-row"><span class="result-label">${t('dispensed')}</span><span class="result-val big">${fmt(txn.convertedAmount, tgtSym)}</span></div>`;
    if (txn.payoutMethod !== 'cash') {
      html += `<div class="result-row"><span class="result-label">${t('payout')}</span><span class="result-val">${txn.walletType === 'gcash' ? 'GCash' : 'Maya'}</span></div>`;
    }
  }
  return html;
}

function showConfirmModal() {
  const confirmSummary = document.getElementById('confirm-summary');
  if (confirmSummary) confirmSummary.innerHTML = buildSummary();
  const confirmOverlay = document.getElementById('confirm-overlay');
  if (confirmOverlay) confirmOverlay.classList.add('visible');
}

function selectPaymentMethod(method) {
  selectedPaymentMethod = method;
  const btns = document.querySelectorAll('.payment-method-btn');
  btns.forEach(btn => btn.classList.toggle('active', btn.dataset.method === method));
}

async function showConfirm() {
  const amountInput = document.getElementById('amount-input');
  const raw = parseFloat(amountInput ? amountInput.value : '0') || 0;
  if (raw <= 0) { kioskAlert(currentLang === 'fil' ? 'Maglagay muna ng halaga.' : 'Please insert an amount first.'); return; }
  storeAmountInTxn(raw);
  let phpAmount;
  if (currentTab === 'change') {
    phpAmount = raw;
  } else {
    const srcCurSelect = document.getElementById('currency-select');
    const srcCur = srcCurSelect ? srcCurSelect.value : 'USD';
    phpAmount = srcCur === 'PHP' ? raw : txn.convertedAmount;
  }
  const hasId = txn.idType && txn.idType !== 'none';
  if (phpAmount > 50000 && !hasId) {
    await kioskAlert(currentLang === 'fil' ? 'Kailangan ng valid na ID para sa transaksyon na higit sa ₱50,000.' : 'A valid ID is required for transactions above ₱50,000.');
    return;
  }
  if (selectedPaymentMethod === 'gcash' || selectedPaymentMethod === 'maya') {
    updateTransaction({ payoutMethod: selectedPaymentMethod, walletType: selectedPaymentMethod });
    const walletTypeLabel = document.getElementById('wallet-type-label');
    if (walletTypeLabel) walletTypeLabel.textContent = selectedPaymentMethod === 'gcash' ? 'GCash' : 'Maya';
    const walletNumberInput = document.getElementById('wallet-number-input');
    if (walletNumberInput) walletNumberInput.value = '';
    const digitalProceedBtn = document.getElementById('digital-proceed-btn');
    if (digitalProceedBtn) digitalProceedBtn.disabled = true;
    const qrScanSection = document.getElementById('qr-scan-section');
    const manualInputSection = document.getElementById('manual-input-section');
    if (qrScanSection) qrScanSection.classList.remove('hidden');
    if (manualInputSection) manualInputSection.classList.add('hidden');
    const main = document.getElementById('main-view');
    const digital = document.getElementById('digital-payout-view');
    if (main && digital) transitionView(main, digital);
  } else if (currentTab === 'foreign') {
    const payoutAmt = txn.convertedAmount || 0;
    if (!checkPayoutFeasibility(payoutAmt)) {
      kioskAlert(currentLang === 'fil' ? 'Hindi sapat ang laman ng makina para sa halagang ito.' : 'The machine does not have enough cash for this amount.');
      return;
    }
    const main = document.getElementById('main-view');
    const payout = document.getElementById('payout-view');
    setStep(3);
    if (main && payout) transitionView(main, payout);
  } else {
    const payoutAmt = txn.netAmount || 0;
    if (!checkPayoutFeasibility(payoutAmt)) {
      kioskAlert(currentLang === 'fil' ? 'Hindi sapat ang laman ng makina para sa halagang ito.' : 'The machine does not have enough cash for this amount.');
      return;
    }
    updateTransaction({ payoutMethod: 'cash' });
    checkOtpOrConfirm();
  }
}

function hideConfirm() {
  const confirmOverlay = document.getElementById('confirm-overlay');
  if (confirmOverlay) confirmOverlay.classList.remove('visible');
}

function completeTransaction() {
  if (txn) {
    txn.status = 'COMPLETED';
    systemStatus.lastTransaction = txn;
    systemStatus.totalTransactions++;
    systemStatus.totalVolume += (txn.mode === 'change' ? txn.netAmount : txn.convertedAmount);
    logEvent('TXN_COMPLETED', { id: txn.id, amount: txn.amount, mode: txn.mode });
  }
}

function doExchange() {
  hideConfirm();
  const summary = buildSummary();
  const visible = getVisibleView();
  const processing = document.getElementById('processing-view');
  setStep(-1);
  if (visible && processing) transitionView(visible, processing);
  const steps = ['pstep-reserve', 'pstep-log', 'pstep-execute', 'pstep-confirm'];
  let stepIdx = 0;
  function advanceProcessingStep() {
    if (stepIdx > 0) {
      const prev = document.getElementById(steps[stepIdx - 1]);
      if (prev) {
        const iconSpan = prev.querySelector('.pstep-icon');
        if (iconSpan) iconSpan.textContent = '✅';
        prev.classList.add('done');
        prev.classList.remove('active');
      }
    }
    if (stepIdx < steps.length) {
      const cur = document.getElementById(steps[stepIdx]);
      if (cur) {
        const iconSpan = cur.querySelector('.pstep-icon');
        if (iconSpan) iconSpan.textContent = '⏳';
        cur.classList.add('active');
        const processingStatus = document.getElementById('processing-status');
        if (processingStatus) processingStatus.textContent = cur.textContent.trim().replace('⏳', '').trim() + '...';
      }
      stepIdx++;
      setTimeout(advanceProcessingStep, 700);
    } else {
      if (txn && txn.payoutMethod === 'cash') {
        const amount = currentTab === 'change' ? txn.netAmount : txn.convertedAmount;
        const { bills } = calcBillsWithInventory(amount);
        dispenseFromInventory(bills);
        txn.bills = bills;
      }
      completeTransaction();
      const successMsg = document.getElementById('success-msg');
      if (successMsg) {
        if (txn && txn.payoutMethod !== 'cash') {
          successMsg.textContent = t('digitalTransfer');
        } else if (currentTab === 'change') {
          successMsg.textContent = t('collectCoins');
        } else if (txn) {
          successMsg.textContent = t('collectCash');
        }
      }
      const successSummary = document.getElementById('success-summary');
      if (successSummary) successSummary.innerHTML = summary;
      const proc = document.getElementById('processing-view');
      const success = document.getElementById('success-view');
      setTimeout(() => {
        if (proc && success) transitionView(proc, success);
        steps.forEach(id => {
          const el = document.getElementById(id);
          if (el) {
            const iconSpan = el.querySelector('.pstep-icon');
            if (iconSpan) iconSpan.textContent = '⏳';
            el.classList.remove('done', 'active');
          }
        });
      }, 500);
    }
  }
  setTimeout(advanceProcessingStep, 300);
}

/* ==================================================
   NAVIGATION & RESET
   ================================================== */
function clearAll() {
  const amountInput = document.getElementById('amount-input');
  if (amountInput) amountInput.value = '';
  onAmountChange();
}

function anotherTransaction() {
  resetReceiptOptions();
  txn = null;
  selectedPaymentMethod = 'cash';
  const success = document.getElementById('success-view');
  const idle = document.getElementById('idle-view');
  setStep(0);
  if (success && idle) transitionView(success, idle, clearAll);
}

function resetKiosk() {
  clearAll();
  resetReceiptOptions();
  selectedPaymentMethod = 'cash';
  if (txn) { txn.status = 'CANCELLED'; logEvent('TXN_CANCELLED', { id: txn.id, stage: 'reset' }); }
  txn = null;
  clearInterval(otpTimer);
  const visible = getVisibleView();
  const splash = document.getElementById('splash-view');
  setStep(-1);
  if (visible && splash) transitionView(visible, splash);
}

function backFromMain() {
  clearAll();
  const main = document.getElementById('main-view');
  const comp = document.getElementById('compliance-view');
  setStep(1);
  if (main && comp) transitionView(main, comp, () => initCompliance());
}

function backFromPayout() {
  const payout = document.getElementById('payout-view');
  const main = document.getElementById('main-view');
  setStep(2);
  if (payout && main) transitionView(payout, main);
}

/* ==================================================
   QR / MANUAL WALLET INPUT TOGGLE
   ================================================== */
function showManualWalletInput() {
  const qrScanSection = document.getElementById('qr-scan-section');
  const manualInputSection = document.getElementById('manual-input-section');
  if (qrScanSection) qrScanSection.classList.add('hidden');
  if (manualInputSection) manualInputSection.classList.remove('hidden');
  const walletInput = document.getElementById('wallet-number-input');
  if (walletInput) walletInput.value = '';
  const digitalProceedBtn = document.getElementById('digital-proceed-btn');
  if (digitalProceedBtn) digitalProceedBtn.disabled = true;
}

function showQrScanSection() {
  const manualInputSection = document.getElementById('manual-input-section');
  const qrScanSection = document.getElementById('qr-scan-section');
  if (manualInputSection) manualInputSection.classList.add('hidden');
  if (qrScanSection) qrScanSection.classList.remove('hidden');
}

function simulateQrScan() {
  var prefixes = ['0917','0918','0919','0920','0921','0927','0928','0929','0930','0935','0936','0945','0953','0956','0975','0977'];
  var prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  var fakeNumber = prefix + String(Math.floor(1000000 + Math.random() * 9000000));
  updateTransaction({ walletNumber: fakeNumber });
  logEvent('QR_SCAN_OK', { walletType: txn.walletType });
  goToConfirm();
}

/* ==================================================
   KIOSK ALERT / CONFIRM MODAL
   ================================================== */
var _kioskAlertResolve = null;

function kioskAlert(message, title) {
  const alertTitle = document.getElementById('kiosk-alert-title');
  const alertMessage = document.getElementById('kiosk-alert-message');
  const okBtn = document.getElementById('kiosk-alert-ok-btn');
  const cancelBtn = document.getElementById('kiosk-alert-cancel-btn');
  if (alertTitle) alertTitle.textContent = title || (currentLang === 'fil' ? 'Paunawa' : 'Notice');
  if (alertMessage) alertMessage.textContent = message;
  if (okBtn) okBtn.textContent = 'OK';
  if (cancelBtn) cancelBtn.classList.add('hidden');
  const overlay = document.getElementById('kiosk-alert-overlay');
  if (overlay) overlay.classList.add('visible');
  return new Promise(function(resolve) { _kioskAlertResolve = resolve; });
}

function closeKioskAlert(result) {
  const overlay = document.getElementById('kiosk-alert-overlay');
  if (overlay) overlay.classList.remove('visible');
  if (_kioskAlertResolve) {
    _kioskAlertResolve(result !== false);
    _kioskAlertResolve = null;
  }
}

/* ==================================================
   RECEIPT OPTIONS
   ================================================== */
function replaceReceiptButtons(message) {
  var receiptOpts = document.querySelector('.receipt-options');
  if (receiptOpts) {
    receiptOpts.innerHTML = '<div style="text-align:center;padding:16px 0;"><p style="font-size:15px;font-weight:600;color:#16a34a;">' + message + '</p></div>';
  }
}

function resetReceiptOptions() {
  var receiptOpts = document.querySelector('.receipt-options');
  if (receiptOpts) {
    receiptOpts.innerHTML = '<p>' + t('receiptQuestion') + '</p>' +
      '<div class="receipt-grid">' +
        '<button class="receipt-btn" onclick="printReceipt()"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg><span>' + t('printReceipt') + '</span></button>' +
        '<button class="receipt-btn" onclick="smsReceipt()"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>' + t('smsReceipt') + '</span></button>' +
        '<button class="receipt-btn" onclick="skipReceipt()"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg><span>' + t('noReceipt') + '</span></button>' +
      '</div>';
  }
}

function printReceipt() {
  logEvent('RECEIPT_PRINT', { txnId: txn ? txn.id : null });
  replaceReceiptButtons(currentLang === 'fil' ? '🖨️ Nai-print na ang Resibo' : '🖨️ Receipt Printed');
}

function smsReceipt() {
  var smsInput = document.getElementById('sms-receipt-input');
  var sendBtn = document.getElementById('sms-send-btn');
  if (txn && txn.walletNumber && smsInput) {
    smsInput.value = txn.walletNumber;
    if (sendBtn) sendBtn.disabled = false;
  } else if (smsInput) {
    smsInput.value = '';
    if (sendBtn) sendBtn.disabled = true;
  }
  const overlay = document.getElementById('sms-receipt-overlay');
  if (overlay) overlay.classList.add('visible');
  if (smsInput) {
    smsInput.removeEventListener('input', validateSmsInput);
    smsInput.addEventListener('input', validateSmsInput);
  }
}

function validateSmsInput() {
  var val = document.getElementById('sms-receipt-input');
  if (!val) return;
  var phone = val.value.replace(/\D/g, '');
  var sendBtn = document.getElementById('sms-send-btn');
  if (sendBtn) sendBtn.disabled = phone.length < 10;
}

function confirmSmsReceipt() {
  var input = document.getElementById('sms-receipt-input');
  if (!input) return;
  var phone = input.value.replace(/\D/g, '');
  if (phone.length >= 10) {
    logEvent('RECEIPT_SMS', { txnId: txn ? txn.id : null });
    const overlay = document.getElementById('sms-receipt-overlay');
    if (overlay) overlay.classList.remove('visible');
    var masked = phone.substring(0,4) + '***' + phone.substring(phone.length - 3);
    replaceReceiptButtons(currentLang === 'fil' ? '✅ Resibo ipinadala sa ' + masked : '✅ Receipt Sent to ' + masked);
  }
}

function closeSmsReceipt() {
  const overlay = document.getElementById('sms-receipt-overlay');
  if (overlay) overlay.classList.remove('visible');
}

function skipReceipt() {
  logEvent('RECEIPT_SKIP', { txnId: txn ? txn.id : null });
  replaceReceiptButtons(currentLang === 'fil' ? 'Walang Resibo' : 'No Receipt Selected');
}

function checkPayoutFeasibility(amount) {
  const { shortfall } = calcBillsWithInventory(amount);
  return shortfall === 0;
}

/* ==================================================
   HELP MODAL
   ================================================== */
function showHelp() {
  const overlay = document.getElementById('help-overlay');
  if (overlay) overlay.classList.add('visible');
  logEvent('HELP_OPENED', {});
}

function hideHelp() {
  const overlay = document.getElementById('help-overlay');
  if (overlay) overlay.classList.remove('visible');
}

/* ==================================================
   INIT: Rates Ticker
   ================================================== */
(function buildTicker() {
  const track = document.getElementById('rates-track');
  if (track) {
    const chips = Object.keys(RATES).map(cur => `<div class="rate-chip">1 ${SYMBOLS[cur]} = <span>${RATES[cur].toFixed(2)}</span> PHP</div>`).join('');
    track.innerHTML = chips + chips;
  }
})();

/* ==================================================
   INIT: Compliance Event Listeners
   ================================================== */
const idTypeSelect = document.getElementById('id-type-select');
if (idTypeSelect) idTypeSelect.addEventListener('change', onIdTypeChange);
const termsCheckbox = document.getElementById('terms-checkbox');
if (termsCheckbox) termsCheckbox.addEventListener('change', validateCompliance);
const dataCheckbox = document.getElementById('data-checkbox');
if (dataCheckbox) dataCheckbox.addEventListener('change', validateCompliance);
const idNumberInput = document.getElementById('id-number-input');
if (idNumberInput) idNumberInput.addEventListener('input', validateCompliance);
const walletNumberInput = document.getElementById('wallet-number-input');
if (walletNumberInput) walletNumberInput.addEventListener('input', validateWallet);

/* ==================================================
   INIT: Number Pad Logic
   ================================================== */
function bindNumpadInputs() {
  document.querySelectorAll('.kiosk-numpad-input').forEach(function(input) {
    input.style.cursor = 'pointer';
    input.removeEventListener('click', input._numpadClick);
    input.removeEventListener('focus', input._numpadFocus);
    input._numpadClick = function() { openNumpadForInput(input); };
    input._numpadFocus = function() { openNumpadForInput(input); };
    input.addEventListener('click', input._numpadClick);
    input.addEventListener('focus', input._numpadFocus);
  });
}

function openNumpadForInput(input) {
  console.log('Numpad opened for:', input.id);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindNumpadInputs);
} else {
  bindNumpadInputs();
}

document.body.addEventListener('click', function(e) {
  setTimeout(bindNumpadInputs, 100);
});

/* ==================================================
   INIT: Render defaults
   ================================================== */
renderDenomButtons();
onAmountChange();
setStep(-1);
logEvent('SYSTEM_START', { machineId: MACHINE_ID, timestamp: new Date().toISOString() });

document.addEventListener('DOMContentLoaded', function() {
  applyLanguage();
  const splash = document.getElementById('splash-view');
  const language = document.getElementById('language-view');
  const idle = document.getElementById('idle-view');
  const rates = document.getElementById('rates-view');
  const compliance = document.getElementById('compliance-view');
  const main = document.getElementById('main-view');
  if (language) language.classList.add('hidden');
  if (idle) idle.classList.add('hidden');
  if (rates) rates.classList.add('hidden');
  if (compliance) compliance.classList.add('hidden');
  if (main) main.classList.add('hidden');
  if (splash) {
    splash.classList.remove('hidden');
    splash.classList.add('fade-in');
  }
});