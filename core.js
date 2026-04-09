/* ═══════════════════════════════════════════════════════════════════
   USEFULL Kiosk — Shared Engine (core.js)
   ═══════════════════════════════════════════════════════════════════
   Shared state machine, timers, simulation, keypad, branding,
   container catalog, scroll guards, and debug mode.

   VARIANT CONTRACT:
   1. HTML loads core.js first: <script src="core.js"></script>
   2. Variant script defines window.render() and window.onCoreReady()
   3. Variant script calls core.boot()
   ═══════════════════════════════════════════════════════════════════ */

/* ── Constants ─────────────────────────────────────────────────── */

const STATE = {
  SCAN: 'scan',
  PROGRAM_OVERVIEW: 'program_overview',
  IDENTIFIER_ENTRY: 'identifier_entry',
  OTP_VERIFY: 'otp_verify',
  ACCOUNT_LOOKUP: 'account_lookup',
  ACCOUNT_FOUND: 'account_found',
  SMS_CONFIRM_METHOD: 'sms_confirm_method',
  SUCCESS_NEW: 'success_new',
  SUCCESS_RETURNING: 'success_returning',
  ERROR_CAMPUS: 'error_campus',
  ERROR_FROZEN: 'error_frozen',
};

const PAYMENT_MODE = {
  CAMPUS: 'campus',
  CREDIT: 'credit',
};

const CREDIT_SCENARIO = {
  NEW_USER: 'new_user',
  RETURN_SAME_EXACT: 'return_same_exact',
  RETURN_SAME_UNDERLYING: 'return_same_underlying',
  RETURN_DIFFERENT_CARD: 'return_different_card',
};

const BRANDING_PROFILES = {
  pioneer: {
    name: 'Pioneer State University',
    shortName: 'PSU',
    campusCard: 'PioneerCard',
    src: 'images/college-logos/Pioneer State University.png',
    alt: 'Pioneer State University',
  },
  nau: {
    name: 'Northern Arizona University',
    shortName: 'NAU',
    campusCard: 'JacksCard',
    src: 'images/college-logos/Northern Arizona University.png',
    alt: 'Northern Arizona University',
  },
};

const CONTAINER_CATALOG = [
  { name: 'Giant Platinum Finch', type: '16oz cup', icon: 'images/interface-icons/16oz-cup.png' },
  { name: 'Significant Pear Centaur', type: '33 oz bowl', icon: 'images/interface-icons/33oz-bowl.png' },
  { name: 'Quickest Peach Marlin', type: '46 oz container', icon: 'images/interface-icons/46oz-container.png' },
  { name: 'Blank Scarlet Mosquito', type: '56oz bowl', icon: 'images/interface-icons/56oz-bowl.png' },
  { name: 'Modest Chocolate Termite', type: '16oz cup', icon: 'images/interface-icons/16oz-cup.png' },
  { name: 'Robust Crimson Mink', type: '33 oz bowl', icon: 'images/interface-icons/33oz-bowl.png' },
  { name: 'Vertical Scarlet Marmoset', type: '46 oz container', icon: 'images/interface-icons/46oz-container.png' },
  { name: 'Amarillo Phoenix Talcott', type: '56oz bowl', icon: 'images/interface-icons/56oz-bowl.png' },
  { name: 'Costly Navy Weasel', type: '16oz cup', icon: 'images/interface-icons/16oz-cup.png' },
  { name: 'Appropriate Blue Bird', type: '33 oz bowl', icon: 'images/interface-icons/33oz-bowl.png' },
];

/* ── Timing constants ──────────────────────────────────────────── */

const IDLE_TIMEOUT_MS = 15000;
const SUCCESS_RESET_MS = 5000;
const ERROR_RESET_MS = 8000;
const SCAN_NOTICE_MS = 2500;
let accountLookupDelay = 1500;

/* ── State variables (globals) ─────────────────────────────────── */

let appState = STATE.SCAN;
let containerCount = 0;
let activeUserName = null;
let checkoutDate = null;
let checkoutLocked = false;
let paymentMode = PAYMENT_MODE.CAMPUS;
let creditScenario = CREDIT_SCENARIO.NEW_USER;
let currentFlow = null;
let identifierValue = '';
let otpValue = '';
let scanNoticeMessage = '';
let selectedCollege = 'pioneer';
let demoIdOutcome = 'new_user';
let cardBrand = 'Visa';
let cardLast4 = '1234';

/* ── Timer state ───────────────────────────────────────────────── */

let idleTimer = null;
let idleDeadline = null;
let countdownInterval = null;
let successTimer = null;
let scanNoticeTimer = null;
let accountLookupTimer = null;
let termsModalOpen = false;

/* ── Simulation state ──────────────────────────────────────────── */

let simulationActive = false;
let simulationPhase = 'idle';
let simulationCountdownValue = null;
let simulationRunToken = 0;
const simulationTimers = new Set();
let simContainerCount = 2;
let simDelayFirstSec = 3;
let simDelayBetweenSec = 3;
let simDelayBeforeIdSec = 3;

/* ── Debug mode ────────────────────────────────────────────────── */

const urlParams = new URL(window.location.href).searchParams;
let debugEnabled = urlParams.get('debug') === '1' || window.localStorage.getItem('debugEnabled') === '1';

/* ── Variant-provided screen element ───────────────────────────── */

let _screenEl = null;

const core = {};

core.setScreenElement = function (el) {
  _screenEl = el;
};

core.getScreenElement = function () {
  return _screenEl;
};

/* ── Branding ──────────────────────────────────────────────────── */

function getBrandingProfile() {
  return BRANDING_PROFILES[selectedCollege] || BRANDING_PROFILES.pioneer;
}

/* ── Keypad ────────────────────────────────────────────────────── */

function handleKeypadInput(target, value) {
  if (target === 'identifier') {
    if (value === 'clear') {
      identifierValue = '';
    } else if (value === 'delete') {
      identifierValue = identifierValue.slice(0, -1);
    } else if (identifierValue.length < 10) {
      identifierValue += value;
    }
    window.render();
    return;
  }

  if (target === 'otp') {
    if (value === 'clear') {
      otpValue = '';
    } else if (value === 'delete') {
      otpValue = otpValue.slice(0, -1);
    } else if (otpValue.length < 6) {
      otpValue += value;
    }
    window.render();
  }
}

function formatPhoneNumber(value) {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 6);
  const p3 = digits.slice(6, 10);
  if (!digits.length) return '(___) ___-____';
  if (digits.length <= 3) return `(${p1}${'_'.repeat(3 - p1.length)}) ___-____`;
  if (digits.length <= 6) return `(${p1}) ${p2}${'_'.repeat(3 - p2.length)}-____`;
  return `(${p1}) ${p2}-${p3}${'_'.repeat(4 - p3.length)}`;
}

function renderKeypad(target) {
  const keys = ['1','2','3','4','5','6','7','8','9','clear','0','delete'];
  return `
    <div class="keypad" data-keypad="${target}">
      ${keys.map((key) => {
        const label = key === 'clear' ? 'Clear' : key === 'delete' ? 'Delete' : key;
        const extra = key === 'clear' || key === 'delete' ? ' keypad__key--utility' : '';
        return `<button class="keypad__key${extra}" type="button" data-keypad-target="${target}" data-keypad-value="${key}">${label}</button>`;
      }).join('')}
    </div>
  `;
}

/* ── Container helpers ─────────────────────────────────────────── */

function getScannedContainerItems(count) {
  if (!Number.isFinite(count) || count <= 0) return [];
  const items = [];
  for (let i = 0; i < count; i += 1) {
    items.push(CONTAINER_CATALOG[i % CONTAINER_CATALOG.length]);
  }
  return items;
}

/* ── Date helpers ──────────────────────────────────────────────── */

function formatDueDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function computeDueDate(checkoutDt) {
  const due = new Date(checkoutDt.getTime());
  due.setDate(due.getDate() + 2);
  return due;
}

function getDueDateString() {
  if (!checkoutDate) return '';
  return formatDueDate(computeDueDate(checkoutDate));
}

/* ── Timer management ──────────────────────────────────────────── */

function resetTimers() {
  clearTimeout(idleTimer);
  idleDeadline = Date.now() + IDLE_TIMEOUT_MS;
  if (!termsModalOpen) {
    if (!debugEnabled) {
      idleTimer = setTimeout(() => { resetSession(); }, IDLE_TIMEOUT_MS);
    }
    if (appState === STATE.SCAN && containerCount > 0 && !checkoutLocked) {
      startCountdown();
    } else {
      stopCountdown();
    }
  } else {
    stopCountdown();
  }
}

function startCountdown() {
  if (countdownInterval) return;
  if (typeof window.updateCountdownDisplay === 'function') {
    window.updateCountdownDisplay();
  }
  countdownInterval = setInterval(() => {
    if (typeof window.updateCountdownDisplay === 'function') {
      window.updateCountdownDisplay();
    }
  }, 250);
}

function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

function clearSuccessTimer() {
  if (successTimer) {
    clearTimeout(successTimer);
    successTimer = null;
  }
}

function scheduleAutoReset(delay) {
  clearSuccessTimer();
  if (debugEnabled) return;
  successTimer = setTimeout(() => { resetSession(); }, delay);
}

/* ── Scan notice ───────────────────────────────────────────────── */

function clearScanNotice(shouldRender) {
  if (shouldRender === undefined) shouldRender = true;
  if (scanNoticeTimer) {
    clearTimeout(scanNoticeTimer);
    scanNoticeTimer = null;
  }
  if (!scanNoticeMessage) return;
  scanNoticeMessage = '';
  if (shouldRender && appState === STATE.SCAN) {
    window.render();
  }
}

function setScanNotice(message) {
  if (!message) {
    clearScanNotice(true);
    return;
  }
  if (scanNoticeTimer) {
    clearTimeout(scanNoticeTimer);
    scanNoticeTimer = null;
  }
  scanNoticeMessage = message;
  if (appState === STATE.SCAN) {
    window.render();
  }
  resetTimers();
  scanNoticeTimer = setTimeout(() => {
    scanNoticeTimer = null;
    if (!scanNoticeMessage) return;
    scanNoticeMessage = '';
    if (appState === STATE.SCAN) {
      window.render();
    }
  }, SCAN_NOTICE_MS);
}

/* ── Terms modal state ─────────────────────────────────────────── */

function setTermsOpen(isOpen) {
  termsModalOpen = isOpen;
  resetTimers();
}

/* ── State transitions ─────────────────────────────────────────── */

function setState(next) {
  appState = next;
  window.render();
  resetTimers();
}

function resetSession() {
  cancelSimulation();
  containerCount = 0;
  activeUserName = null;
  checkoutDate = null;
  checkoutLocked = false;
  currentFlow = null;
  identifierValue = '';
  otpValue = '';
  clearScanNotice(false);
  stopCountdown();
  clearSuccessTimer();
  clearAccountLookupTimer();
  setState(STATE.SCAN);
}

function handleScan() {
  if (appState !== STATE.SCAN || checkoutLocked) return;
  clearScanNotice(false);
  containerCount += 1;
  window.render();
  resetTimers();
}

function handleIdTap(outcome) {
  if (appState !== STATE.SCAN || checkoutLocked) return;
  if (containerCount === 0) {
    setScanNotice(
      paymentMode === PAYMENT_MODE.CREDIT
        ? 'Scan containers first, then tap your card'
        : 'Scan containers first, then tap your ID'
    );
    return;
  }
  checkoutLocked = true;

  if (paymentMode === PAYMENT_MODE.CREDIT) {
    beginCreditScenarioFlow();
    return;
  }

  checkoutDate = new Date();
  activeUserName = outcome.firstName || null;
  currentFlow = { paymentMode: PAYMENT_MODE.CAMPUS, outcome: outcome.type };
  switch (outcome.type) {
    case 'returning_user':
      setState(STATE.SUCCESS_RETURNING);
      scheduleAutoReset(SUCCESS_RESET_MS);
      break;
    case 'new_user':
      setState(STATE.PROGRAM_OVERVIEW);
      break;
    case 'campus_user_not_found':
      setState(STATE.ERROR_CAMPUS);
      scheduleAutoReset(ERROR_RESET_MS);
      break;
    case 'account_frozen':
      setState(STATE.ERROR_FROZEN);
      scheduleAutoReset(ERROR_RESET_MS);
      break;
    default:
      setState(STATE.ERROR_CAMPUS);
      scheduleAutoReset(ERROR_RESET_MS);
  }
}

function beginCreditScenarioFlow() {
  checkoutDate = new Date();

  switch (creditScenario) {
    case CREDIT_SCENARIO.NEW_USER:
      activeUserName = null;
      currentFlow = { paymentMode: PAYMENT_MODE.CREDIT, scenario: creditScenario };
      setState(STATE.IDENTIFIER_ENTRY);
      break;
    case CREDIT_SCENARIO.RETURN_SAME_EXACT:
      activeUserName = 'Cody';
      currentFlow = { paymentMode: PAYMENT_MODE.CREDIT, scenario: creditScenario };
      setState(STATE.SUCCESS_RETURNING);
      scheduleAutoReset(SUCCESS_RESET_MS);
      break;
    case CREDIT_SCENARIO.RETURN_SAME_UNDERLYING:
      activeUserName = 'Cody';
      currentFlow = { paymentMode: PAYMENT_MODE.CREDIT, scenario: creditScenario };
      setState(STATE.IDENTIFIER_ENTRY);
      break;
    case CREDIT_SCENARIO.RETURN_DIFFERENT_CARD:
    default:
      activeUserName = 'Cody';
      currentFlow = { paymentMode: PAYMENT_MODE.CREDIT, scenario: creditScenario };
      setState(STATE.IDENTIFIER_ENTRY);
      break;
  }
}

/* ── Credit card flow transition helpers ───────────────────────── */
/*
  These encode the flow paths from the spec. Variants call these
  from button onclick handlers instead of doing ad-hoc setState().

  NEW USER:
    SCAN → card tap → IDENTIFIER_ENTRY → ACCOUNT_LOOKUP (auto ~1.5s)
         → (no account) → PROGRAM_OVERVIEW → Accept → SUCCESS_NEW

  RETURN SAME EXACT:
    SCAN → card tap → SUCCESS_RETURNING (instant)

  RETURN SAME UNDERLYING:
    SCAN → card tap → IDENTIFIER_ENTRY → ACCOUNT_LOOKUP → ACCOUNT_FOUND
         → SMS_CONFIRM_METHOD → OTP_VERIFY → SUCCESS_RETURNING

  RETURN DIFFERENT CARD:
    SCAN → card tap → IDENTIFIER_ENTRY → ACCOUNT_LOOKUP
         → OTP_VERIFY → SUCCESS_RETURNING
*/

function clearAccountLookupTimer() {
  if (accountLookupTimer) {
    clearTimeout(accountLookupTimer);
    accountLookupTimer = null;
  }
}

function advanceFromIdentifierEntry() {
  // All credit scenarios go through account lookup
  setState(STATE.ACCOUNT_LOOKUP);
  // Auto-advance after delay
  clearAccountLookupTimer();
  if (!debugEnabled) {
    accountLookupTimer = setTimeout(() => {
      accountLookupTimer = null;
      advanceFromAccountLookup();
    }, accountLookupDelay);
  }
}

function advanceFromAccountLookup() {
  clearAccountLookupTimer();
  const scenario = currentFlow?.scenario;
  if (scenario === CREDIT_SCENARIO.NEW_USER) {
    // No account found → program overview (credit variant)
    setState(STATE.PROGRAM_OVERVIEW);
  } else if (scenario === CREDIT_SCENARIO.RETURN_DIFFERENT_CARD) {
    // Different card → skip confirmation, go straight to OTP verification
    otpValue = '';
    setState(STATE.OTP_VERIFY);
  } else {
    // Same underlying → account found confirmation screen
    activeUserName = activeUserName || 'Cody';
    setState(STATE.ACCOUNT_FOUND);
  }
}

function advanceFromAccountFound() {
  const scenario = currentFlow?.scenario;
  if (scenario === CREDIT_SCENARIO.RETURN_SAME_UNDERLYING) {
    // "Link this Apple Pay?" → SMS confirm first
    setState(STATE.SMS_CONFIRM_METHOD);
  } else {
    // Different card → "Card doesn't match, verify via SMS" → OTP first
    setState(STATE.OTP_VERIFY);
  }
}

function advanceFromProgramOverview() {
  // Both campus and credit new users: accept → success
  setState(STATE.SUCCESS_NEW);
  scheduleAutoReset(SUCCESS_RESET_MS);
}

function advanceFromOtpVerify() {
  const scenario = currentFlow?.scenario;
  if (scenario === CREDIT_SCENARIO.RETURN_SAME_UNDERLYING) {
    // Same underlying: OTP done → success
    setState(STATE.SUCCESS_RETURNING);
    scheduleAutoReset(SUCCESS_RESET_MS);
  } else {
    // Different card: OTP done → success
    setState(STATE.SUCCESS_RETURNING);
    scheduleAutoReset(SUCCESS_RESET_MS);
  }
}

function advanceFromSmsConfirm() {
  const scenario = currentFlow?.scenario;
  if (scenario === CREDIT_SCENARIO.RETURN_SAME_UNDERLYING) {
    // Same underlying: SMS confirm → OTP verify
    otpValue = '';
    setState(STATE.OTP_VERIFY);
  } else {
    // Different card: SMS confirm done → success
    setState(STATE.SUCCESS_RETURNING);
    scheduleAutoReset(SUCCESS_RESET_MS);
  }
}

/* ── Simulation engine ─────────────────────────────────────────── */

function registerSimulationTimer(callback, delayMs, runToken) {
  const timer = setTimeout(() => {
    simulationTimers.delete(timer);
    if (runToken !== simulationRunToken) return;
    callback();
  }, delayMs);
  simulationTimers.add(timer);
}

function clearSimulationTimers() {
  simulationTimers.forEach((timer) => clearTimeout(timer));
  simulationTimers.clear();
}

function finishSimulationRun(runToken) {
  if (runToken !== simulationRunToken) return;
  clearSimulationTimers();
  simulationActive = false;
  simulationPhase = 'idle';
  simulationCountdownValue = null;
  if (typeof window.onSimulationStateChange === 'function') {
    window.onSimulationStateChange();
  }
}

function cancelSimulation() {
  simulationRunToken += 1;
  clearSimulationTimers();
  simulationActive = false;
  simulationPhase = 'idle';
  simulationCountdownValue = null;
  if (typeof window.onSimulationStateChange === 'function') {
    window.onSimulationStateChange();
  }
}

function startSimulation() {
  if (simulationActive) return;
  if (appState !== STATE.SCAN || termsModalOpen || checkoutLocked) return;

  if (containerCount > 0) {
    resetSession();
  }

  simulationRunToken += 1;
  const runToken = simulationRunToken;
  const runConfig = {
    containers: simContainerCount,
    delayFirstSec: simDelayFirstSec,
    delayBetweenSec: simDelayBetweenSec,
    delayBeforeIdSec: simDelayBeforeIdSec,
    outcome: demoIdOutcome,
  };

  let scansSent = 0;
  simulationActive = true;
  simulationPhase = 'countdown';
  if (typeof window.onSimulationStateChange === 'function') {
    window.onSimulationStateChange();
  }

  const simulateIdTap = () => {
    if (!simulationActive || runToken !== simulationRunToken) return;
    handleIdTap({ type: runConfig.outcome, firstName: 'Cody' });
    finishSimulationRun(runToken);
  };

  const runScanLoop = () => {
    if (!simulationActive || runToken !== simulationRunToken) return;
    handleScan();
    scansSent += 1;
    if (scansSent < runConfig.containers) {
      simulationPhase = 'scan_loop';
      registerSimulationTimer(runScanLoop, runConfig.delayBetweenSec * 1000, runToken);
      return;
    }
    simulationPhase = 'pre_id_delay';
    registerSimulationTimer(simulateIdTap, runConfig.delayBeforeIdSec * 1000, runToken);
  };

  simulationCountdownValue = runConfig.delayFirstSec;
  if (typeof window.onSimulationStateChange === 'function') {
    window.onSimulationStateChange();
  }

  registerSimulationTimer(() => {
    let cv = runConfig.delayFirstSec;
    const tick = () => {
      if (!simulationActive || runToken !== simulationRunToken) return;
      cv -= 1;
      if (cv > 0) {
        simulationCountdownValue = cv;
        if (typeof window.onSimulationStateChange === 'function') {
          window.onSimulationStateChange();
        }
        registerSimulationTimer(tick, 1000, runToken);
        return;
      }
      simulationCountdownValue = null;
      if (typeof window.onSimulationStateChange === 'function') {
        window.onSimulationStateChange();
      }
      runScanLoop();
    };
    tick();
  }, 1000, runToken);
}

/* ── Scroll guards ─────────────────────────────────────────────── */

function installScrollGuards() {
  document.addEventListener('touchmove', (event) => {
    if (!(event.target instanceof Element) || !event.target.closest('[data-allow-scroll]')) {
      event.preventDefault();
    }
  }, { passive: false });
  document.addEventListener('wheel', (event) => {
    if (!(event.target instanceof Element) || !event.target.closest('[data-allow-scroll]')) {
      event.preventDefault();
    }
  }, { passive: false });
}

/* ── Debug mode ────────────────────────────────────────────────── */

function setDebugEnabled(enabled) {
  debugEnabled = enabled;
  if (enabled) {
    window.localStorage.setItem('debugEnabled', '1');
  } else {
    window.localStorage.removeItem('debugEnabled');
  }
}

function jumpTo(stateName) {
  const stateKey = Object.keys(STATE).find(
    (k) => STATE[k] === stateName || k === stateName
  );
  if (!stateKey) {
    console.warn('jumpTo: unknown state — valid states:', Object.values(STATE).join(', '));
    return;
  }
  const target = STATE[stateKey];

  // Stop any in-flight timers
  clearSuccessTimer();
  clearAccountLookupTimer();
  cancelSimulation();

  // Populate sensible mock data for every state
  containerCount = containerCount || 2;
  checkoutDate = checkoutDate || new Date();
  checkoutLocked = true;

  switch (target) {
    case STATE.SCAN:
      checkoutLocked = false;
      containerCount = 0;
      break;

    case STATE.PROGRAM_OVERVIEW:
      activeUserName = 'Cody';
      currentFlow = currentFlow || { paymentMode: paymentMode, scenario: creditScenario };
      break;

    case STATE.IDENTIFIER_ENTRY:
      identifierValue = '';
      currentFlow = { paymentMode: PAYMENT_MODE.CREDIT, scenario: creditScenario };
      break;

    case STATE.ACCOUNT_LOOKUP:
      identifierValue = identifierValue || '5551233456';
      currentFlow = { paymentMode: PAYMENT_MODE.CREDIT, scenario: creditScenario };
      break;

    case STATE.ACCOUNT_FOUND:
      activeUserName = 'Cody';
      identifierValue = identifierValue || '5551233456';
      currentFlow = { paymentMode: PAYMENT_MODE.CREDIT, scenario: CREDIT_SCENARIO.RETURN_SAME_UNDERLYING };
      break;

    case STATE.SMS_CONFIRM_METHOD:
      activeUserName = 'Cody';
      currentFlow = { paymentMode: PAYMENT_MODE.CREDIT, scenario: creditScenario };
      break;

    case STATE.OTP_VERIFY:
      otpValue = '';
      identifierValue = identifierValue || '5551233456';
      currentFlow = currentFlow || { paymentMode: PAYMENT_MODE.CREDIT, scenario: creditScenario };
      break;

    case STATE.SUCCESS_NEW:
    case STATE.SUCCESS_RETURNING:
      activeUserName = activeUserName || 'Cody';
      currentFlow = currentFlow || { paymentMode: paymentMode };
      break;

    case STATE.ERROR_CAMPUS:
    case STATE.ERROR_FROZEN:
      break;
  }

  appState = target;
  window.render();
}

// Expose jumpTo on window for console use
window.jumpTo = jumpTo;

/* ── Boot ──────────────────────────────────────────────────────── */

core.boot = function () {
  installScrollGuards();
  if (typeof window.onCoreReady === 'function') {
    window.onCoreReady();
  }
  resetSession();
};
