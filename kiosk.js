// Kiosk Numpad Overlay Logic
document.addEventListener('DOMContentLoaded', function() {
  const overlay = document.getElementById('kiosk-numpad-overlay');
  const modal = overlay.querySelector('.kiosk-numpad-modal');
  let activeInput = null;

  // Show numpad for all text/tel fields
  document.body.addEventListener('focusin', function(e) {
    if (e.target.tagName === 'INPUT' && (e.target.type === 'text' || e.target.type === 'tel')) {
      activeInput = e.target;
      // Position the numpad below the input
      const rect = activeInput.getBoundingClientRect();
      const scrollY = window.scrollY || window.pageYOffset;
      const scrollX = window.scrollX || window.pageXOffset;
      modal.style.top = (rect.bottom + scrollY + 8) + 'px';
      modal.style.left = (rect.left + scrollX) + 'px';
      overlay.classList.remove('hidden');
      overlay.classList.add('active');
    }
  });

  // Hide overlay if background is clicked
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) {
      overlay.classList.add('hidden');
      overlay.classList.remove('active');
      activeInput = null;
    }
  });

  // Numpad button logic
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
        // Respect maxlength if set
        let max = activeInput.maxLength > 0 ? activeInput.maxLength : 1000;
        if (activeInput.value.length < max) {
          activeInput.value += value;
        }
      }
    });
  });
});
// NUMPAD OVERLAY LOGIC
document.addEventListener('DOMContentLoaded', function() {
  let numpadOverlay = document.getElementById('numpad-overlay');
  let activeInput = null;
  // Show numpad on focus for all text/tel inputs
  document.body.addEventListener('focusin', function(e) {
    if (e.target.tagName === 'INPUT' && (e.target.type === 'text' || e.target.type === 'tel')) {
      activeInput = e.target;
      numpadOverlay.classList.remove('hidden');
    }
  });
  // Hide numpad on close button
  numpadOverlay.addEventListener('click', function(e) {
    if (e.target.classList.contains('numpad-close')) {
      numpadOverlay.classList.add('hidden');
      activeInput = null;
    }
  });
  // Numpad key input
  numpadOverlay.addEventListener('click', function(e) {
    if (!activeInput) return;
    if (e.target.classList.contains('numpad-key')) {
      let key = e.target.textContent;
      if (e.target.classList.contains('numpad-back')) {
        // Backspace
        activeInput.value = activeInput.value.slice(0, -1);
        activeInput.dispatchEvent(new Event('input'));
      } else if (!e.target.classList.contains('numpad-close')) {
        // Insert number or dot
        // Only allow one dot for decimals
        if (key === '.' && activeInput.value.includes('.')) return;
        // Respect maxlength if set
        let max = activeInput.maxLength > 0 ? activeInput.maxLength : 1000;
        if (activeInput.value.length < max) {
          activeInput.value += key;
          activeInput.dispatchEvent(new Event('input'));
        }
      }
    }
  });
  // Hide numpad if overlay background is clicked (optional UX)
  numpadOverlay.addEventListener('click', function(e) {
    if (e.target === numpadOverlay) {
      numpadOverlay.classList.add('hidden');
      activeInput = null;
    }
  });
});
// Allow only numeric input in the amount field
document.addEventListener('DOMContentLoaded', function() {
  var amountInput = document.getElementById('amount-input');
  if (amountInput) {
    amountInput.addEventListener('input', function(e) {
      // Allow only numbers and one decimal point
      let val = amountInput.value;
      val = val.replace(/[^\d.]/g, '');
      // Only one decimal point
      val = val.replace(/(\..*)\./g, '$1');
      amountInput.value = val;
    });
    amountInput.addEventListener('keydown', function(e) {
      // Allow: backspace, delete, tab, escape, enter, arrows, home, end, period, and numbers
      if ([46,8,9,27,13,110,190,35,36,37,38,39,40].indexOf(e.keyCode) !== -1 ||
          // Allow Ctrl/cmd+A
          (e.keyCode === 65 && (e.ctrlKey || e.metaKey)) ||
          // Allow Ctrl/cmd+C
          (e.keyCode === 67 && (e.ctrlKey || e.metaKey)) ||
          // Allow Ctrl/cmd+V
          (e.keyCode === 86 && (e.ctrlKey || e.metaKey)) ||
          // Allow Ctrl/cmd+X
          (e.keyCode === 88 && (e.ctrlKey || e.metaKey))) {
        return;
      }
      // Block non-numeric
      if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
        e.preventDefault();
      }
    });
  }
});
// --- PLACEHOLDER TRANSACTION FUNCTIONS (restored to prevent runtime errors) ---
function createTransaction(mode) {
  // Placeholder: In a real system, this would initialize a transaction object
  // Set up a transaction object with all required properties for downstream logic
  const currencySelect = document.getElementById('currency-select');
  const targetSelect = document.getElementById('target-select');
  const amountInput = document.getElementById('amount-input');
  const payoutMethod = window.selectedPaymentMethod || 'cash';
  const currency = currencySelect ? currencySelect.value : 'PHP';
  const targetCurrency = targetSelect ? targetSelect.value : 'PHP';
  const netAmount = parseFloat(amountInput ? amountInput.value : '0') || 0;
  const convertedAmount = netAmount; // For simplicity, use netAmount; real logic would convert
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
  // Placeholder: In a real system, this would update the transaction object
  if (window.txn) {
    Object.assign(window.txn, update);
    // Ensure required properties are always present
    if (!window.txn.payoutMethod) window.txn.payoutMethod = window.selectedPaymentMethod || 'cash';
    if (typeof window.txn.netAmount === 'undefined') window.txn.netAmount = 0;
    if (typeof window.txn.convertedAmount === 'undefined') window.txn.convertedAmount = window.txn.netAmount;
    if (!window.txn.currency) window.txn.currency = 'PHP';
    if (!window.txn.targetCurrency) window.txn.targetCurrency = 'PHP';
  }
}
/* ============================================
   ECXCHANGE KIOSK — FULL SYSTEM
   Modules: UI, Transaction Engine, Cash Mgmt,
   Digital Payout, Compliance, Monitoring
   ============================================ */

/* ---- Constants & Configuration ---- */
const RATES   = { USD: 57.50, EUR: 62.10, KRW: 0.0405, CNY: 9.09, CAD: 43.48, JPY: 0.3774, AUD: 43.48, SGD: 47.62, SAR: 15.87, HKD: 7.35 };
const SYMBOLS = { USD: '$', EUR: '€', KRW: '₩', CNY: '¥', CAD: 'C$', JPY: '¥', AUD: 'A$', SGD: 'S$', SAR: 'SR', HKD: 'HK$' };
const NAMES   = { USD: 'US Dollars', EUR: 'Euros', KRW: 'South Korean Won', CNY: 'Chinese Yuan', CAD: 'Canadian Dollars', JPY: 'Japanese Yen', AUD: 'Australian Dollars', SGD: 'Singapore Dollars', SAR: 'Saudi Riyals', HKD: 'Hong Kong Dollars' };
const CHANGE_FEE  = 0.01;
const FOREIGN_FEE = 0.02;
const AML_THRESHOLD = 50000;
const AML_MID_THRESHOLD = 10000;  // Mid-tier: require valid ID
const AML_HIGH_THRESHOLD = 50000; // High-tier: require ID + enhanced due diligence
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


// Language dictionary (moved out of logEvent)
const LANG = {
  en: {
    title: 'hange Kiosk',
    subtitle: 'Insert cash below to get started',
    otpSentTo: 'Code sent to',
    welcomeTitle: 'Our Services',
    selectService: 'Choose a service to get started',
    coinsChange: 'Coins & Change',
    coinsChangeDesc: 'Break bills into smaller denominations',
    foreignExchange: 'Foreign Currency Exchange',
    foreignExchangeDesc: 'Convert foreign bills to Philippine Pesos',
    touchServiceHint: 'Touch a service above to begin',
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
    txnId: 'Transaction ID',
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
    // Compliance keys
    complianceTitle: 'Identity Verification',
    complianceSubtitle: 'Required by BSP (Bangko Sentral ng Pilipinas) regulations',
    complianceNotice: 'Transactions exceeding ₱50,000 require a valid government-issued ID.',
    txnType: 'Transaction type',
    idType: 'Identification type',
    noId: 'No ID (below ₱50,000)',
    idLast4: 'ID number (last 4 digits)',
    termsAgree: 'I agree to the <strong>Terms of Service</strong> and acknowledge the <strong>Anti-Money Laundering</strong> disclosure.',
    dataAgree: 'I consent to the collection and processing of my data per the <strong>Data Privacy Act of 2012</strong>.',
    proceedToTxn: 'Proceed to Transaction'
  },
  fil: {
    title: 'ECXChange Kiosk',
    subtitle: 'Maglagay ng pera sa ibaba para magsimula',
    welcome: 'ECXChange',
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
    sendToWallet: 'Ipadala mula sa E-Wallet',
    otpTitle: 'OTP Beripikasyon',
    otpSubtitle: 'Ilagay ang 6-digit code na ipinadala sa iyong numero',
    otpPlaceholder: '000000',
    verifyOtp: 'I-verify at Magpatuloy',
    resendOtp: 'Ipadala Muli',
    otpSentTo: 'Code ipinadala sa',
    helpTitle: 'Kailangan ng Tulong?',
    helpText: 'Kung may problema, tumawag sa aming hotline o pumunta sa pinakamalapit na service desk.',
    helpHotline: 'Hotline: 1-800-PESO (7376)',
    helpEmail: 'Email: support@ecxchange.ph',
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
    txnId: 'Transaction ID',
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
    insertCash: 'Ipasok ang Pera'
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

function toggleLanguage() {
  currentLang = currentLang === 'en' ? 'fil' : 'en';
  applyLanguage();
  logEvent('LANG_CHANGE', { lang: currentLang });
}

function applyLanguage() {
  // Header — preserve logo image
  const headerTitle = document.getElementById('header-title');
  headerTitle.innerHTML = '<img src="assets/Product-Logo-White.png" alt="ECXChange" style="height:16px;vertical-align:baseline;margin-right:1px;">hange Kiosk';
  document.getElementById('header-subtitle').textContent = t('subtitle');

  // Splash (h2 was replaced by logo image, so skip it)
  var splashTagline = document.querySelector('.splash-tagline');
  if (splashTagline) splashTagline.textContent = t('tagline');
  var startBtn = document.querySelector('.btn-start-touch');
  if (startBtn) startBtn.lastChild.textContent = ' ' + t('tapToStart');
  var splashHint = document.querySelector('.splash-hint');
  if (splashHint) splashHint.textContent = t('touchToBegin');
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

  // Compliance
  var compView = document.getElementById('compliance-view');
  if (compView) {
    compView.querySelector('.compliance-header h3').textContent = t('complianceTitle');
    compView.querySelector('.compliance-header p').textContent = t('complianceSubtitle');
    compView.querySelector('.compliance-notice span').textContent = t('complianceNotice');
    var compLabels = compView.querySelectorAll('.field > label');
    if (compLabels[0]) compLabels[0].textContent = t('txnType');
    if (compLabels[1]) compLabels[1].textContent = t('idType');
    var idField = document.getElementById('id-number-field');
    if (idField) { var lbl = idField.querySelector('label'); if (lbl) lbl.textContent = t('idLast4'); }
    var idOpts = document.getElementById('id-type-select');
    if (idOpts && idOpts.options[0]) idOpts.options[0].textContent = t('noId');
    var termSpans = compView.querySelectorAll('.compliance-terms label span:last-child');
    if (termSpans[0]) termSpans[0].innerHTML = t('termsAgree');
    if (termSpans[1]) termSpans[1].innerHTML = t('dataAgree');
    document.getElementById('compliance-proceed-btn').textContent = t('proceedToTxn');
    var compBack = compView.querySelector('.btn-back');
    if (compBack) compBack.lastChild.textContent = ' ' + t('back');
    var compCancel = compView.querySelector('.btn-clear');
    if (compCancel) compCancel.textContent = t('cancel');
  }

  // Main view — Back/Cancel buttons
  var mainView = document.getElementById('main-view');
  if (mainView) {
    var mainBack = mainView.querySelector('.btn-back');
    if (mainBack) mainBack.lastChild.textContent = ' ' + t('back');
    var mainCancel = mainView.querySelector('.btn-clear');
    if (mainCancel) mainCancel.textContent = t('cancel');
    var mainProceed = mainView.querySelector('.btn-exchange');
    if (mainProceed) mainProceed.textContent = t('proceed');
    // Payment method label
    var pmGrid = document.getElementById('payment-method-grid');
    if (pmGrid && pmGrid.parentElement) {
      var pmLabel = pmGrid.parentElement.querySelector('label');
      if (pmLabel) pmLabel.textContent = t('paymentMethod');
    }
    // Payment method button labels
    var pmBtns = mainView.querySelectorAll('.payment-method-btn span');
    if (pmBtns[0]) pmBtns[0].textContent = t('insertCash');
    // Quick select label
    var allLabels = mainView.querySelectorAll(':scope > label');
    allLabels.forEach(function(l) { if (l.textContent.match(/Quick select|Mabilis/i)) l.textContent = t('quickSelect'); });
    // Result cards
    var crLabels = document.getElementById('change-section');
    if (crLabels) {
      var rows = crLabels.querySelectorAll('.result-label');
      if (rows[0]) rows[0].textContent = t('totalInserted');
      if (rows[1]) rows[1].textContent = t('serviceFee') + ' (1%)';
      if (rows[2]) rows[2].textContent = t('youReceive');
      var bdLabel = crLabels.querySelector('[style*="color:#64748b"]');
      if (bdLabel) bdLabel.textContent = t('billsBreakdown');
    }
    var frLabels = document.getElementById('foreign-section');
    if (frLabels) {
      var frows = frLabels.querySelectorAll('.result-label');
      if (frows[0]) frows[0].textContent = t('totalInserted');
      if (frows[1]) frows[1].textContent = t('serviceFee') + ' (2%)';
      if (frows[2]) frows[2].textContent = t('exchangeRate');
      var frRecvLabel = document.getElementById('fr-receive-label');
      if (frRecvLabel) frRecvLabel.textContent = t('youReceive') + ' (PHP)';
    }
    // Currency/target labels
    var foreignSelLabel = document.querySelector('#foreign-selector > label');
    if (foreignSelLabel) foreignSelLabel.textContent = t('currencyInserted');
    var targetSelLabel = document.querySelector('#target-selector > label');
    if (targetSelLabel) targetSelLabel.textContent = t('convertTo');
  }

  // Payout view
  var payoutView = document.getElementById('payout-view');
  if (payoutView) {
    payoutView.querySelector('.payout-header h3').textContent = t('payoutTitle');
    payoutView.querySelector('.payout-header p').textContent = t('payoutSubtitle');
    var payBtns = payoutView.querySelectorAll('.mode-btn .mode-text');
    if (payBtns[0]) { payBtns[0].querySelector('h3').textContent = t('cashPayout'); payBtns[0].querySelector('p').textContent = t('cashPayoutDesc'); }
    if (payBtns[1]) { payBtns[1].querySelector('h3').textContent = t('gcashPayout'); payBtns[1].querySelector('p').textContent = t('gcashPayoutDesc'); }
    if (payBtns[2]) { payBtns[2].querySelector('h3').textContent = t('mayaPayout'); payBtns[2].querySelector('p').textContent = t('mayaPayoutDesc'); }
    var payCancel = payoutView.querySelector('.btn-clear');
    if (payCancel) payCancel.textContent = t('cancel');
    var payBack = payoutView.querySelector('.btn-back');
    if (payBack) payBack.lastChild.textContent = ' ' + t('back');
  }

  // Digital payout view
  var digView = document.getElementById('digital-payout-view');
  if (digView) {
    digView.querySelector('.compliance-header h3').textContent = t('digitalPayoutTitle');
    var digBack = digView.querySelector('.btn-back');
    if (digBack) digBack.lastChild.textContent = ' ' + t('back');
    var manualLabel = digView.querySelector('#manual-input-section .field label');
    if (manualLabel) manualLabel.textContent = t('walletNumber');
    var walletInput = document.getElementById('wallet-number-input');
    if (walletInput) walletInput.placeholder = t('walletPlaceholder');
    var walletHint = digView.querySelector('#manual-input-section .field p');
    if (walletHint) walletHint.textContent = t('walletHint');
    document.getElementById('digital-proceed-btn').textContent = t('sendToWallet');
    // QR section text
    var qrFrame = digView.querySelector('.qr-frame');
    if (qrFrame) {
      var qrPs = qrFrame.querySelectorAll('p');
      if (qrPs[0]) qrPs[0].textContent = t('scanQr');
      if (qrPs[1]) qrPs[1].textContent = t('scanQrHint');
    }
    var orSpan = digView.querySelector('#qr-scan-section span');
    if (orSpan) orSpan.textContent = t('orDivider');
    var manualBtn = digView.querySelector('#qr-scan-section .btn-clear');
    if (manualBtn) manualBtn.textContent = t('enterManually');
    var backToQrBtn = digView.querySelector('.btn-text');
    if (backToQrBtn) backToQrBtn.textContent = t('backToQr');
    // Cancel button
    var digCancels = digView.querySelectorAll(':scope > .btn-clear');
    digCancels.forEach(function(btn) { if (btn.getAttribute('onclick') === 'resetKiosk()') btn.textContent = t('cancel'); });
  }

  // OTP view
  var otpView = document.getElementById('otp-view');
  if (otpView) {
    otpView.querySelector('.compliance-header h3').textContent = t('otpTitle');
    otpView.querySelector('.compliance-header p').textContent = t('otpSubtitle');
    var otpVerifyBtn = otpView.querySelector('.btn-exchange');
    if (otpVerifyBtn) otpVerifyBtn.textContent = t('verifyOtp');
    var otpCancelBtn = otpView.querySelector('.btn-clear');
    if (otpCancelBtn) otpCancelBtn.textContent = t('cancel');
    var otpBack = otpView.querySelector('.btn-back');
    if (otpBack) otpBack.lastChild.textContent = ' ' + t('back');
    document.getElementById('otp-resend-btn').textContent = t('resendOtp');
  }

  // Success view
  var successView = document.getElementById('success-view');
  if (successView) {
    successView.querySelector('h2').textContent = t('txnComplete');
    var successBtns = successView.querySelectorAll('button');
    successBtns.forEach(function(btn) {
      if (btn.classList.contains('btn-exchange') && btn.getAttribute('onclick') === 'anotherTransaction()') btn.textContent = t('anotherTxn');
      if (btn.classList.contains('btn-clear') && btn.getAttribute('onclick') === 'resetKiosk()') btn.textContent = t('backToHome');
    });
    // Receipt options
    var receiptQ = successView.querySelector('.receipt-options > p');
    if (receiptQ) receiptQ.textContent = t('receiptQuestion');
    var receiptBtns = successView.querySelectorAll('.receipt-btn span');
    if (receiptBtns[0]) receiptBtns[0].textContent = t('printReceipt');
    if (receiptBtns[1]) receiptBtns[1].textContent = t('smsReceipt');
    if (receiptBtns[2]) receiptBtns[2].textContent = t('noReceipt');
  }

  // Confirm modal
  var confirmModal = document.getElementById('confirm-overlay');
  if (confirmModal) {
    confirmModal.querySelector('.modal-title').textContent = t('confirmTxn');
    confirmModal.querySelector('.modal-subtitle').textContent = t('reviewDetails');
    var confBtns = confirmModal.querySelectorAll('button');
    confBtns.forEach(function(btn) {
      if (btn.getAttribute('onclick') === 'doExchange()') btn.textContent = t('confirmDispense');
      if (btn.getAttribute('onclick') === 'hideConfirm()') btn.textContent = t('cancel');
    });
  }

  // Help modal
  var helpModal = document.getElementById('help-overlay');
  if (helpModal) {
    helpModal.querySelector('.modal-title').textContent = t('helpTitle');
    helpModal.querySelector('p[style]').textContent = t('helpText');
    var helpRows = helpModal.querySelectorAll('.help-row span');
    if (helpRows[0]) helpRows[0].textContent = t('helpHotline');
    if (helpRows[1]) helpRows[1].textContent = t('helpEmail');
    var helpClose = helpModal.querySelector('.btn-exchange');
    if (helpClose) helpClose.textContent = t('closeHelp');
  }

  // Steps
  updateStepLabels();
  // Help btn in header
  document.getElementById('help-btn').innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> ' + t('help');
  // Update amount labels if main view is active
  if (typeof updateInputLabels === 'function') updateInputLabels();
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
    // Always rebind numpad inputs after a view transition
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
  // Only 'en' and 'fil' are real, others default to English
  if (lang === 'fil') {
    currentLang = 'fil';
  } else {
    currentLang = 'en';
  }
  applyLanguage();
  // Go to services screen
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
  const idle  = document.getElementById('idle-view');
  const rates = document.getElementById('rates-view');
  populateRatesTable();
  transitionView(idle, rates);
}

function backFromRates() {
  const rates = document.getElementById('rates-view');
  const idle  = document.getElementById('idle-view');
  transitionView(rates, idle);
}

function populateRatesTable() {
  const table = document.getElementById('rates-table');
  let html = '';
  for (const cur of Object.keys(RATES)) {
    const rate = RATES[cur];
    const flag = FLAGS[cur] || '';
    const name = NAMES[cur] || cur;
    const symbol = SYMBOLS[cur] || '';
    html += `<div class="rate-row">
      <div class="rate-currency">
        <span class="rate-flag">${flag}</span>
        <div>
          <div>${cur} <span style="color:#64748b;font-weight:400;">(${symbol})</span></div>
          <div class="rate-name">${name}</div>
        </div>
      </div>
      <div class="rate-value">₱${rate.toFixed(2)} <small>per 1 ${cur}</small></div>
    </div>`;
  }
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
    selectedPaymentMethod = 'cash';
    document.querySelectorAll('.payment-method-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.method === 'cash'));
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
  if (raw <= 0) { kioskAlert(currentLang === 'fil' ? 'Maglagay muna ng halaga.' : 'Please insert an amount first.'); return; }

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

  // Only block cash payout if amount is above 99,999 PHP
  let phpAmount;
  if (currentTab === 'change') {
    phpAmount = txn.amount;
  } else {
    const srcCur = txn.currency;
    if (srcCur === 'PHP') {
      phpAmount = txn.amount;
    } else {
      phpAmount = txn.convertedAmount;
    }
  }

  if (method === 'cash') {
    if (phpAmount > 99999) {
      kioskAlert(currentLang === 'fil'
        ? 'Walang sapat na pera sa makina para sa halagang ito. Pumili ng E-wallet payout o kanselahin ang transaksyon.'
        : "There isn't enough money in the machine for this amount. Please choose E-wallet payout or cancel the transaction.");
      return;
    }
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
  const main    = document.getElementById('main-view');
  setStep(2);
  transitionView(digital, main);
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
  otpCode = '111111'; // Demo code for showcase
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
  otpCode = '111111'; // Demo code for showcase
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

function selectPaymentMethod(method) {
  selectedPaymentMethod = method;
  const btns = document.querySelectorAll('.payment-method-btn');
  btns.forEach(btn => btn.classList.toggle('active', btn.dataset.method === method));
}

async function showConfirm() {
  // Called from Proceed button on main view
  const raw = parseFloat(document.getElementById('amount-input').value) || 0;
  if (raw <= 0) { kioskAlert(currentLang === 'fil' ? 'Maglagay muna ng halaga.' : 'Please insert an amount first.'); return; }
  storeAmountInTxn(raw);

  // 3-tier compliance check — always compare in PHP
  // For foreign→PHP: convertedAmount is PHP; for PHP→foreign or change: raw is already PHP
  let phpAmount;
  if (currentTab === 'change') {
    phpAmount = raw;
  } else {
    const srcCur = document.getElementById('currency-select').value;
    if (srcCur === 'PHP') {
      phpAmount = raw; // inserting PHP
    } else {
      phpAmount = txn.convertedAmount; // foreign converted to PHP
    }
  }

  const hasId = txn.idType && txn.idType !== 'none';
  // If above 50,000, require ID (compliance)
  if (phpAmount > 50000 && !hasId) {
    await kioskAlert(currentLang === 'fil'
      ? 'Kailangan ng valid na ID para sa transaksyon na higit sa ₱50,000. Bumalik sa verification.'
      : 'A valid ID is required for transactions above ₱50,000. Please go back and provide ID verification.');
    return;
  }

  if (selectedPaymentMethod === 'gcash' || selectedPaymentMethod === 'maya') {
    // E-wallet: go to digital payout screen for wallet number
    updateTransaction({ payoutMethod: selectedPaymentMethod, walletType: selectedPaymentMethod });
    document.getElementById('wallet-type-label').textContent = selectedPaymentMethod === 'gcash' ? 'GCash' : 'Maya';
    document.getElementById('wallet-number-input').value = '';
    document.getElementById('digital-proceed-btn').disabled = true;
    // Reset to QR scan view
    document.getElementById('qr-scan-section').classList.remove('hidden');
    document.getElementById('manual-input-section').classList.add('hidden');
    const main    = document.getElementById('main-view');
    const digital = document.getElementById('digital-payout-view');
    transitionView(main, digital);
  } else if (currentTab === 'foreign') {
    // Foreign cash: check payout feasibility before proceeding
    const payoutAmt = txn.convertedAmount || 0;
    if (!checkPayoutFeasibility(payoutAmt)) {
      kioskAlert(currentLang === 'fil'
        ? 'Paumanhin, hindi sapat ang laman ng makina para sa halagang ito. Subukan ang mas mababang halaga o pumili ng e-wallet.'
        : 'Sorry, the machine does not have enough cash for this amount. Try a lower amount or choose an e-wallet payout.');
      return;
    }
    // Foreign cash: go to payout selection
    const main = document.getElementById('main-view');
    const payout = document.getElementById('payout-view');
    setStep(3);
    transitionView(main, payout);
  } else {
    // Change mode cash — also check feasibility
    const payoutAmt = txn.netAmount || 0;
    if (!checkPayoutFeasibility(payoutAmt)) {
      kioskAlert(currentLang === 'fil'
        ? 'Paumanhin, hindi sapat ang laman ng makina para sa halagang ito. Subukan ang mas mababang halaga.'
        : 'Sorry, the machine does not have enough cash for this amount. Try a lower amount.');
      return;
    }
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

  // Show processing screen first
  const visible = getVisibleView();
  const processing = document.getElementById('processing-view');
  setStep(-1);
  transitionView(visible, processing);

  // Animate processing steps
  const steps = ['pstep-reserve', 'pstep-log', 'pstep-execute', 'pstep-confirm'];
  let stepIdx = 0;

  function advanceProcessingStep() {
    if (stepIdx > 0) {
      const prev = document.getElementById(steps[stepIdx - 1]);
      prev.querySelector('.pstep-icon').textContent = '✅';
      prev.classList.add('done');
    }
    if (stepIdx < steps.length) {
      const cur = document.getElementById(steps[stepIdx]);
      cur.querySelector('.pstep-icon').textContent = '⏳';
      cur.classList.add('active');
      document.getElementById('processing-status').textContent = cur.textContent.trim().replace('⏳', '').trim() + '...';
      stepIdx++;
      setTimeout(advanceProcessingStep, 600 + Math.random() * 400);
    } else {
      // All done — perform actual transaction logic
      if (txn.payoutMethod === 'cash') {
        const amount = currentTab === 'change' ? txn.netAmount : txn.convertedAmount;
        const { bills } = calcBillsWithInventory(amount);
        dispenseFromInventory(bills);
        txn.bills = bills;
      }
      if (typeof completeTransaction === 'function') {
        completeTransaction();
      }

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
      const proc = document.getElementById('processing-view');
      const success = document.getElementById('success-view');
      setTimeout(() => {
        transitionView(proc, success);
        // Reset processing step icons for next time
        steps.forEach(id => {
          const el = document.getElementById(id);
          el.querySelector('.pstep-icon').textContent = '⏳';
          el.classList.remove('done', 'active');
        });
      }, 500);
    }
  }

  setTimeout(advanceProcessingStep, 400);
}

/* ==================================================
   NAVIGATION & RESET
   ================================================== */
function clearAll() {
  document.getElementById('amount-input').value = '';
  onAmountChange();
}

function anotherTransaction() {
  resetReceiptOptions();
  txn = null;
  selectedPaymentMethod = 'cash';
  const success = document.getElementById('success-view');
  const idle    = document.getElementById('idle-view');
  setStep(0);
  transitionView(success, idle, clearAll);
}

function resetKiosk() {
  clearAll();
  resetReceiptOptions();
  selectedPaymentMethod = 'cash';
  if (txn) { txn.status = 'CANCELLED'; logEvent('TXN_CANCELLED', { id: txn.id, stage: 'reset' }); }
  txn = null;
  clearInterval(otpTimer);
  const visible = getVisibleView();
  const splash  = document.getElementById('splash-view');
  setStep(-1);
  if (visible) transitionView(visible, splash);
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
   QR / MANUAL WALLET INPUT TOGGLE
   ================================================== */
function showManualWalletInput() {
  document.getElementById('qr-scan-section').classList.add('hidden');
  document.getElementById('manual-input-section').classList.remove('hidden');
  // Re-bind numpad for wallet input
  const walletInput = document.getElementById('wallet-number-input');
  walletInput.value = '';
  document.getElementById('digital-proceed-btn').disabled = true;
}

function showQrScanSection() {
  document.getElementById('manual-input-section').classList.add('hidden');
  document.getElementById('qr-scan-section').classList.remove('hidden');
}

function simulateQrScan() {
  // Mockup: simulate a successful QR scan with a random wallet number
  var prefixes = ['0917','0918','0919','0920','0921','0927','0928','0929','0930','0935','0936','0945','0953','0956','0975','0977'];
  var prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  var fakeNumber = prefix + String(Math.floor(1000000 + Math.random() * 9000000));
  updateTransaction({ walletNumber: fakeNumber });
  logEvent('QR_SCAN_OK', { walletType: txn.walletType, number: fakeNumber.substring(0,4) + '***' });
  goToConfirm();
}

/* ==================================================
   KIOSK ALERT / CONFIRM MODAL
   ================================================== */
var _kioskAlertResolve = null;

function kioskAlert(message, title) {
  document.getElementById('kiosk-alert-title').textContent = title || (currentLang === 'fil' ? 'Paunawa' : 'Notice');
  document.getElementById('kiosk-alert-message').textContent = message;
  document.getElementById('kiosk-alert-ok-btn').textContent = 'OK';
  document.getElementById('kiosk-alert-cancel-btn').classList.add('hidden');
  document.getElementById('kiosk-alert-overlay').classList.add('visible');
  return new Promise(function(resolve) { _kioskAlertResolve = resolve; });
}

function kioskConfirm(message, title) {
  document.getElementById('kiosk-alert-title').textContent = title || (currentLang === 'fil' ? 'Kumpirmahin' : 'Confirm');
  document.getElementById('kiosk-alert-message').textContent = message;
  document.getElementById('kiosk-alert-ok-btn').textContent = currentLang === 'fil' ? 'Oo, Magpatuloy' : 'Yes, Proceed';
  document.getElementById('kiosk-alert-cancel-btn').classList.remove('hidden');
  document.getElementById('kiosk-alert-cancel-btn').textContent = currentLang === 'fil' ? 'Kanselahin' : 'Cancel';
  document.getElementById('kiosk-alert-overlay').classList.add('visible');
  return new Promise(function(resolve) { _kioskAlertResolve = resolve; });
}

function closeKioskAlert(result) {
  document.getElementById('kiosk-alert-overlay').classList.remove('visible');
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
    receiptOpts.innerHTML =
      '<p style="font-size:13px;color:#64748b;margin-bottom:8px;">' + t('receiptQuestion') + '</p>' +
      '<div class="receipt-grid">' +
        '<button class="receipt-btn" onclick="printReceipt()">' +
          '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>' +
          '<span>' + t('printReceipt') + '</span></button>' +
        '<button class="receipt-btn" onclick="smsReceipt()">' +
          '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
          '<span>' + t('smsReceipt') + '</span></button>' +
        '<button class="receipt-btn" onclick="skipReceipt()">' +
          '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '<span>' + t('noReceipt') + '</span></button>' +
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

  // Auto-fill from wallet number if the user entered one manually
  if (txn && txn.walletNumber) {
    smsInput.value = txn.walletNumber;
    sendBtn.disabled = false;
  } else {
    smsInput.value = '';
    sendBtn.disabled = true;
  }

  document.getElementById('sms-receipt-overlay').classList.add('visible');

  // Bind numpad to SMS input
  smsInput.style.cursor = 'pointer';
  // Removed custom onclick/onfocus for smsInput to allow global numpad overlay

  // Wire up validation on input
  smsInput.removeEventListener('input', validateSmsInput);
  smsInput.addEventListener('input', validateSmsInput);
}

function validateSmsInput() {
  var val = document.getElementById('sms-receipt-input').value.replace(/\D/g, '');
  document.getElementById('sms-send-btn').disabled = val.length < 10;
}

function confirmSmsReceipt() {
  var phone = document.getElementById('sms-receipt-input').value.replace(/\D/g, '');
  if (phone.length >= 10) {
    logEvent('RECEIPT_SMS', { txnId: txn ? txn.id : null, phone: phone.substring(0, 4) + '***' });
    document.getElementById('sms-receipt-overlay').classList.remove('visible');
    var masked = phone.substring(0,4) + '***' + phone.substring(phone.length - 3);
    replaceReceiptButtons(currentLang === 'fil' ? '✅ Resibo ipinadala sa ' + masked : '✅ Receipt Sent to ' + masked);
  }
}

function closeSmsReceipt() {
  document.getElementById('sms-receipt-overlay').classList.remove('visible');
}

function skipReceipt() {
  logEvent('RECEIPT_SKIP', { txnId: txn ? txn.id : null });
  replaceReceiptButtons(currentLang === 'fil' ? 'Walang Resibo' : 'No Receipt Selected');
}

/* ==================================================
   PAYOUT FEASIBILITY GATE
   ================================================== */
function checkPayoutFeasibility(amount) {
  const { shortfall } = calcBillsWithInventory(amount);
  return shortfall === 0;
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
   INIT: Number Pad Logic (generic for all inputs)
   ================================================== */
let numpadBuffer = '';
let numpadTarget = null;   // the input element currently being edited
let numpadMaxLen = 10;
let numpadIsAmount = false;
let numpadFormatPhone = false;


const numpadOverlay = document.getElementById('numpad-overlay');
const numpadValueEl = document.getElementById('numpad-value');
const numpadPrefixEl = document.getElementById('numpad-prefix');
const numpadHeaderEl = document.getElementById('numpad-header');
let amountInput = document.getElementById('amount-input');

function bindNumpadInputs() {
  // Re-query amountInput in case DOM was replaced
  amountInput = document.getElementById('amount-input');
  // Removed readonly and custom click/focus handlers for amountInput to allow global numpad overlay
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


// Initial binding after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindNumpadInputs);
} else {
  bindNumpadInputs();
}

// Fallback: Always rebind numpad inputs after any click (in case of missed dynamic DOM changes)
document.body.addEventListener('click', function(e) {
  setTimeout(bindNumpadInputs, 100); // slight delay to allow DOM updates
});



function openNumpadForInput(input) {
  var max = parseInt(input.getAttribute('data-numpad-max'), 10) || 10;
  var label = input.getAttribute('data-numpad-label') || 'Enter Value';
  var prefix = input.getAttribute('data-numpad-prefix');
  var formatPhone = input.getAttribute('data-numpad-format') === 'phone';
  openNumpadFor(input, { max: max, label: label, prefix: prefix != null ? prefix : '', isAmount: false, formatPhone: formatPhone });
}

numpadOverlay.addEventListener('click', function(e) {
  if (e.target === numpadOverlay) numpadDone();
});

function openNumpadFor(input, opts) {
  numpadTarget = input;
  numpadMaxLen = opts.max || 10;
  numpadIsAmount = opts.isAmount || false;
  numpadFormatPhone = opts.formatPhone || false;

  // Set header and prefix
  numpadHeaderEl.textContent = opts.label || 'Enter Value';
  numpadPrefixEl.textContent = opts.prefix || '';
  numpadPrefixEl.style.display = opts.prefix ? '' : 'none';

  // Read current value from input
  var raw = input.value.replace(/[^0-9]/g, '');
  numpadBuffer = raw && raw !== '0' ? raw : '';
  if (numpadIsAmount) {
    var num = parseInt(raw, 10);
    numpadBuffer = num ? String(num) : '';
  }
  renderNumpad();
  numpadOverlay.classList.add('visible');
}

// Keep old openNumpad for backward compat (amount input)
function openNumpad() {
  openNumpadFor(amountInput, { max: 10, label: 'Enter Amount', prefix: '₱', isAmount: true });
}

function numpadPress(digit) {
  if (numpadBuffer.length >= numpadMaxLen) return;
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
  if (!numpadTarget) { numpadOverlay.classList.remove('visible'); return; }

  if (numpadIsAmount) {
    var val = parseInt(numpadBuffer, 10) || 0;
    numpadTarget.value = val || '';
    onAmountChange();
  } else if (numpadFormatPhone) {
    // Format as 09XX XXX XXXX for display
    numpadTarget.value = numpadBuffer;
    // Trigger any validation listeners
    numpadTarget.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    numpadTarget.value = numpadBuffer;
    numpadTarget.dispatchEvent(new Event('input', { bubbles: true }));
  }

  numpadOverlay.classList.remove('visible');
  numpadTarget.blur();
  numpadTarget = null;
}

function renderNumpad() {
  var display;
  if (numpadBuffer === '') {
    display = '0';
  } else if (numpadIsAmount) {
    display = parseInt(numpadBuffer, 10).toLocaleString('en-PH');
  } else if (numpadFormatPhone && numpadBuffer.length > 0) {
    // Format as 09XX XXX XXXX
    var d = numpadBuffer;
    if (d.length <= 4) display = d;
    else if (d.length <= 7) display = d.slice(0,4) + ' ' + d.slice(4);
    else display = d.slice(0,4) + ' ' + d.slice(4,7) + ' ' + d.slice(7);
  } else {
    display = numpadBuffer;
  }
  numpadValueEl.textContent = display;
}

/* ==================================================
   INIT: Render defaults + stepper hidden + log start
   ================================================== */
renderDenomButtons();
onAmountChange();
setStep(-1);
logEvent('SYSTEM_START', { machineId: MACHINE_ID, timestamp: new Date().toISOString() });
