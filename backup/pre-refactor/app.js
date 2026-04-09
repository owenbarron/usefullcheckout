const appRoot = document.getElementById('app');
const screen = document.getElementById('screen');
const demoModal = document.getElementById('demoModal');
const demoClose = document.getElementById('demoClose');
const simulationBtn = document.getElementById('simulationBtn');
const simulationCountdown = document.getElementById('simulationCountdown');
const demoSettingsBtn = document.getElementById('demoSettingsBtn');
const collegeLogoSelect = document.getElementById('collegeLogoSelect');
const collegeLogoImage = document.getElementById('collegeLogoImage');
const idTapOutcomeSelect = document.getElementById('idTapOutcomeSelect');
const simContainerCountSelect = document.getElementById('simContainerCountSelect');
const simDelayFirstSelect = document.getElementById('simDelayFirstSelect');
const simDelayBetweenSelect = document.getElementById('simDelayBetweenSelect');
const simDelayBeforeIdSelect = document.getElementById('simDelayBeforeIdSelect');
const footerScanText = document.getElementById('footerScanText');
const footerTermsBtn = document.getElementById('footerTermsBtn');
const modeCampusBtn = document.getElementById('modeCampusBtn');
const modeCreditBtn = document.getElementById('modeCreditBtn');
const creditScenarioBar = document.getElementById('creditScenarioBar');
const creditScenarioButtons = Array.from(document.querySelectorAll('[data-credit-scenario]'));
const termsModal = document.getElementById('termsModal');
const termsClose = document.getElementById('termsClose');
const scanHotspot = document.getElementById('scanHotspot');
const idHotspot = document.getElementById('idHotspot');
const termsTabs = document.querySelectorAll('[data-terms-tab]');
const termsSummary = document.getElementById('termsSummary');
const termsFull = document.getElementById('termsFull');
const viewportDebug = document.getElementById('viewportDebug');
const debugBadge = document.getElementById('debugBadge');

const STATE = {
  SCAN: 'scan',
  PROGRAM_OVERVIEW: 'program_overview',
  IDENTIFIER_ENTRY: 'identifier_entry',
  OTP_VERIFY: 'otp_verify',
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

let appState = STATE.SCAN;
let containerCount = 0;
let idleTimer = null;
let successTimer = null;
let activeUserName = null;
let checkoutDate = null;
let idleDeadline = null;
let countdownInterval = null;
let demoIdOutcome = 'new_user';
let selectedCollegeLogo = 'pioneer';
let paymentMode = PAYMENT_MODE.CAMPUS;
let creditScenario = CREDIT_SCENARIO.NEW_USER;
let currentFlow = null;
let identifierValue = '';
let otpValue = '';
let termsModalOpen = false;
let checkoutLocked = false;
let scanNoticeMessage = '';
let scanNoticeTimer = null;
let simulationActive = false;
let simulationPhase = 'idle';
let simulationCountdownValue = null;
let simulationRunToken = 0;
const simulationTimers = new Set();
let simContainerCount = 2;
let simDelayFirstSec = 5;
let simDelayBetweenSec = 3;
let simDelayBeforeIdSec = 3;

const IDLE_TIMEOUT_MS = 15000;
const SUCCESS_RESET_MS = 5000;
const ERROR_RESET_MS = 8000;
const SCAN_NOTICE_MS = 2500;
const urlParams = new URL(window.location.href).searchParams;
const viewportDebugEnabled =
  urlParams.get('debugViewport') === '1' || window.localStorage.getItem('debugViewport') === '1';
const HOTSPOT_CLICK_DEDUPE_MS = 450;
let lastHotspotPointerAt = 0;

function applyCollegeLogo(logoKey) {
  const nextLogo = BRANDING_PROFILES[logoKey] || BRANDING_PROFILES.pioneer;
  selectedCollegeLogo = BRANDING_PROFILES[logoKey] ? logoKey : 'pioneer';
  if (collegeLogoImage) {
    collegeLogoImage.src = nextLogo.src;
    collegeLogoImage.alt = nextLogo.alt;
    collegeLogoImage.dataset.college = selectedCollegeLogo;
  }
  if (collegeLogoSelect) {
    collegeLogoSelect.value = selectedCollegeLogo;
  }
}

function getBrandingProfile() {
  return BRANDING_PROFILES[selectedCollegeLogo] || BRANDING_PROFILES.pioneer;
}

function getCreditScenarioLabel(scenario) {
  switch (scenario) {
    case CREDIT_SCENARIO.RETURN_SAME_EXACT:
      return 'Return · same exact method';
    case CREDIT_SCENARIO.RETURN_SAME_UNDERLYING:
      return 'Return · same underlying card';
    case CREDIT_SCENARIO.RETURN_DIFFERENT_CARD:
      return 'Return · different card';
    case CREDIT_SCENARIO.NEW_USER:
    default:
      return 'New user';
  }
}

function updateModeBar() {
  if (modeCampusBtn) {
    modeCampusBtn.classList.toggle('is-active', paymentMode === PAYMENT_MODE.CAMPUS);
  }
  if (modeCreditBtn) {
    modeCreditBtn.classList.toggle('is-active', paymentMode === PAYMENT_MODE.CREDIT);
  }
  if (creditScenarioBar) {
    creditScenarioBar.hidden = paymentMode !== PAYMENT_MODE.CREDIT;
  }
  creditScenarioButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.creditScenario === creditScenario);
  });
}

function updateFooterCopy() {
  if (!footerScanText) return;
  if (paymentMode === PAYMENT_MODE.CREDIT) {
    footerScanText.textContent = `Tap your credit card or wallet — ${getCreditScenarioLabel(creditScenario)}.`;
    return;
  }
  footerScanText.textContent = 'Use your campus ID or Mobile ID — no app needed.';
}

function getUserTapLabel() {
  if (paymentMode === PAYMENT_MODE.CREDIT) {
    return 'TAP CARD';
  }
  return 'SCAN USER';
}

function handleKeypadInput(target, value) {
  if (target === 'identifier') {
    if (value === 'clear') {
      identifierValue = '';
    } else if (value === 'delete') {
      identifierValue = identifierValue.slice(0, -1);
    } else if (identifierValue.length < 10) {
      identifierValue += value;
    }
    render();
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
    render();
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

function getScannedContainerItems(count) {
  if (!Number.isFinite(count) || count <= 0) return [];
  const items = [];
  for (let i = 0; i < count; i += 1) {
    const entry = CONTAINER_CATALOG[i % CONTAINER_CATALOG.length];
    items.push(entry);
  }
  return items;
}

function clampSelectValue(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function updateSimulationButtonState() {
  if (!simulationBtn || !simulationCountdown) return;
  const showCountdown = Number.isInteger(simulationCountdownValue) && simulationCountdownValue > 0;
  simulationBtn.classList.toggle('is-countdown', showCountdown);
  simulationCountdown.hidden = !showCountdown;
  simulationCountdown.textContent = showCountdown ? String(simulationCountdownValue) : '';
}

function updateSettingsButtonState() {
  if (!demoSettingsBtn) return;
  demoSettingsBtn.disabled = simulationActive;
  demoSettingsBtn.setAttribute('aria-disabled', simulationActive ? 'true' : 'false');
}

function syncDemoSettingsControls() {
  if (idTapOutcomeSelect) idTapOutcomeSelect.value = demoIdOutcome;
  if (simContainerCountSelect) simContainerCountSelect.value = String(simContainerCount);
  if (simDelayFirstSelect) simDelayFirstSelect.value = String(simDelayFirstSec);
  if (simDelayBetweenSelect) simDelayBetweenSelect.value = String(simDelayBetweenSec);
  if (simDelayBeforeIdSelect) simDelayBeforeIdSelect.value = String(simDelayBeforeIdSec);
}

function setSimulationCountdown(value) {
  simulationCountdownValue = value;
  updateSimulationButtonState();
}

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
  setSimulationCountdown(null);
  updateSettingsButtonState();
}

function cancelSimulation() {
  simulationRunToken += 1;
  clearSimulationTimers();
  simulationActive = false;
  simulationPhase = 'idle';
  setSimulationCountdown(null);
  updateSettingsButtonState();
}

function startSimulation() {
  if (simulationActive) return;
  if (appState !== STATE.SCAN || termsModalOpen || !demoModal.hidden || checkoutLocked) return;

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
  updateSettingsButtonState();

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

  setSimulationCountdown(runConfig.delayFirstSec);
  registerSimulationTimer(() => {
    let countdownValue = runConfig.delayFirstSec;
    const tick = () => {
      if (!simulationActive || runToken !== simulationRunToken) return;
      countdownValue -= 1;
      if (countdownValue > 0) {
        setSimulationCountdown(countdownValue);
        registerSimulationTimer(tick, 1000, runToken);
        return;
      }
      setSimulationCountdown(null);
      runScanLoop();
    };
    tick();
  }, 1000, runToken);
}

function installScrollGuards() {
  const shouldAllowScroll = (target) =>
    target instanceof Element && Boolean(target.closest('[data-allow-scroll]'));

  const handleBlockingScroll = (event) => {
    if (!shouldAllowScroll(event.target)) {
      event.preventDefault();
    }
  };

  document.addEventListener('touchmove', handleBlockingScroll, { passive: false });
  document.addEventListener('wheel', handleBlockingScroll, { passive: false });
}

function updateViewportDebug() {
  if (!viewportDebugEnabled || !viewportDebug) return;
  const visualHeight = window.visualViewport ? Math.round(window.visualViewport.height) : 'n/a';
  const visualWidth = window.visualViewport ? Math.round(window.visualViewport.width) : 'n/a';
  viewportDebug.textContent =
    `inner: ${window.innerWidth}x${window.innerHeight} | ` +
    `visual: ${visualWidth}x${visualHeight}`;
}

function initViewportDebug() {
  if (!viewportDebug) return;
  appRoot.classList.toggle('app--debug-hotspots', viewportDebugEnabled);
  if (!viewportDebugEnabled) {
    viewportDebug.hidden = true;
    if (debugBadge) debugBadge.hidden = true;
    return;
  }

  viewportDebug.hidden = false;
  if (debugBadge) debugBadge.hidden = false;
  updateViewportDebug();
  window.addEventListener('resize', updateViewportDebug);
  window.addEventListener('orientationchange', updateViewportDebug);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateViewportDebug);
  }
}

window.toggleDebugHotspots = function toggleDebugHotspots(force) {
  const enabled =
    typeof force === 'boolean' ? force : !appRoot.classList.contains('app--debug-hotspots');
  appRoot.classList.toggle('app--debug-hotspots', enabled);
  if (viewportDebug) {
    viewportDebug.hidden = !enabled;
  }
  if (debugBadge) {
    debugBadge.hidden = !enabled;
  }
  if (enabled) {
    window.localStorage.setItem('debugViewport', '1');
  } else {
    window.localStorage.removeItem('debugViewport');
  }
  updateViewportDebug();
};

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

function resetTimers() {
  clearTimeout(idleTimer);
  idleDeadline = Date.now() + IDLE_TIMEOUT_MS;
  if (!termsModalOpen) {
    idleTimer = setTimeout(() => {
      resetSession();
    }, IDLE_TIMEOUT_MS);
    if (appState === STATE.SCAN && containerCount > 0 && !checkoutLocked) {
      startCountdown();
    } else {
      stopCountdown();
    }
  } else {
    stopCountdown();
  }
}

function clearSuccessTimer() {
  if (successTimer) {
    clearTimeout(successTimer);
    successTimer = null;
  }
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
  setState(STATE.SCAN);
}

function setState(next) {
  appState = next;
  render();
  resetTimers();
}

function handleScan() {
  if (appState !== STATE.SCAN || checkoutLocked) return;
  clearScanNotice(false);
  containerCount += 1;
  render();
  resetTimers();
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

function handleIdTap(outcome) {
  if (appState !== STATE.SCAN || checkoutLocked) return;
  if (containerCount === 0) {
    setScanNotice(paymentMode === PAYMENT_MODE.CREDIT ? 'Scan containers first, then tap your card' : 'Scan containers first, then tap your ID');
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

function clearScanNotice(shouldRender = true) {
  if (scanNoticeTimer) {
    clearTimeout(scanNoticeTimer);
    scanNoticeTimer = null;
  }
  if (!scanNoticeMessage) return;
  scanNoticeMessage = '';
  if (shouldRender && appState === STATE.SCAN) {
    render();
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
    render();
  }
  resetTimers();
  scanNoticeTimer = setTimeout(() => {
    scanNoticeTimer = null;
    if (!scanNoticeMessage) return;
    scanNoticeMessage = '';
    if (appState === STATE.SCAN) {
      render();
    }
  }, SCAN_NOTICE_MS);
}

function scheduleAutoReset(delay) {
  clearSuccessTimer();
  successTimer = setTimeout(() => {
    resetSession();
  }, delay);
}

function getDueDateString() {
  if (!checkoutDate) return '';
  const due = computeDueDate(checkoutDate);
  return formatDueDate(due);
}

function startCountdown() {
  if (countdownInterval) return;
  updateCountdownDisplay();
  countdownInterval = setInterval(updateCountdownDisplay, 250);
}

function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

function updateCountdownDisplay() {
  const textEl = document.getElementById('countdownText');
  const barEl = document.getElementById('countdownBar');
  if (!textEl || !barEl || !idleDeadline) return;
  const remaining = Math.max(0, idleDeadline - Date.now());
  const seconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  textEl.textContent = `Resets in ${minutes}:${String(secs).padStart(2, '0')}`;
  const progress = Math.max(0, Math.min(1, remaining / IDLE_TIMEOUT_MS));
  barEl.style.width = `${progress * 100}%`;
}

function setTermsView(view) {
  if (!termsSummary || !termsFull) return;
  const showSummary = view === 'summary';
  termsSummary.hidden = !showSummary;
  termsFull.hidden = showSummary;
  termsTabs.forEach((tab) => {
    tab.classList.toggle('is-active', tab.dataset.termsTab === view);
  });
}

function openTermsModal() {
  termsModal.hidden = false;
  termsModalOpen = true;
  setTermsView('summary');
  resetTimers();
}

function closeTermsModal() {
  termsModal.hidden = true;
  termsModalOpen = false;
  resetTimers();
}

function canUseScanHotspots() {
  const demoOpen = !demoModal.hidden;
  return appState === STATE.SCAN && !termsModalOpen && !demoOpen && !checkoutLocked && !simulationActive;
}

function renderProgramOverviewScreen() {
  const branding = getBrandingProfile();
  const isCreditFlow = currentFlow?.paymentMode === PAYMENT_MODE.CREDIT;
  const title = "Welcome! Here's how USEFULL works...";
  const subtitle = isCreditFlow
    ? `You’re checking out with a credit card at ${branding.shortName}.`
    : `Welcome, ${activeUserName || 'Cody'} — here’s how USEFULL works at ${branding.shortName}`;
  const billingTitle = isCreditFlow ? 'Credit Card Billing' : `${branding.campusCard} Billing`;
  const billingText = isCreditFlow ? 'Late or lost fees bill to Visa *1234' : 'All fees charged automatically';

  return `
    <div class="card program-card">
      <h1 class="card__title">${title}</h1>
      <p class="program-subtitle">${subtitle}</p>
      <div class="summary-grid">
        <div class="summary-card">
          <img class="summary-icon-img" src="images/interface-icons/icon-duedate.png" alt="Due date icon" />
          <div class="summary-title">2 Days Free</div>
          <div class="summary-text">No charge if returned on time</div>
        </div>
        <div class="summary-card">
          <img class="summary-icon-img" src="images/interface-icons/icon-fee.png" alt="Fee icon" />
          <div class="summary-title">$1 / Day Late Fee</div>
          <div class="summary-text">Applies after day 2</div>
        </div>
        <div class="summary-card">
          <img class="summary-icon-img" src="images/interface-icons/icon-lost.png" alt="Lost item icon" />
          <div class="summary-title">Lost After 15 Days</div>
          <div class="summary-text">Charged $17 cup · $25 bowl (max)</div>
        </div>
        <div class="summary-card">
          <img class="summary-icon-img" src="images/interface-icons/icon-card.png" alt="Billing icon" />
          <div class="summary-title">${billingTitle}</div>
          <div class="summary-text">${billingText}</div>
        </div>
      </div>
      <p class="program-consent">
        By tapping ‘Accept &amp; Continue,’ you agree to the
        <button class="link-button" id="termsInlineBtn" type="button">Terms &amp; Conditions</button>.
      </p>
      <div class="actions">
        <button class="btn" id="acceptContinue">Accept &amp; Continue</button>
        <button class="btn-outline" id="programCancel">Cancel</button>
      </div>
    </div>
  `;
}

function renderIdentifierEntryScreen() {
  const scenario = currentFlow?.scenario;
  let title = 'Create or find your account';
  let body = 'Enter your mobile number to create a new account or link this card to an existing USEFULL account.';

  if (scenario === CREDIT_SCENARIO.RETURN_DIFFERENT_CARD) {
    title = 'Verify your account';
    body = 'Enter your mobile number so we can look up your account before confirming this new card.';
  }

  return `
    <div class="card auth-card">
      <div class="auth-card__shell auth-card__shell--single">
        <div class="auth-card__main">
          <div class="auth-card__label">Credit card checkout</div>
          <h1 class="card__title">${title}</h1>
          <p class="auth-card__copy">${body}</p>
          <div class="identifier-chip identifier-chip--entry">
            <span>${formatPhoneNumber(identifierValue)}</span>
            <span class="identifier-chip__meta">SMS</span>
          </div>
          ${renderKeypad('identifier')}
          <div class="actions">
            <button class="btn" id="identifierContinueBtn" ${identifierValue.length < 10 ? 'disabled' : ''}>Continue</button>
            <button class="btn-outline" id="identifierCancelBtn">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderOtpVerifyScreen() {
  return `
    <div class="card auth-card">
      <div class="auth-card__shell auth-card__shell--single">
        <div class="auth-card__main">
          <div class="auth-card__label">Verify with SMS</div>
          <h1 class="card__title">Enter the code we sent</h1>
          <p class="auth-card__copy">This card does not match the payment method on file. To protect the account, verify the phone number ending in <strong>3456</strong>.</p>
          <div class="otp-boxes" aria-hidden="true">
            ${Array.from({ length: 6 }, (_, index) => {
              const char = otpValue[index] || '';
              return `<div class="otp-box">${char}</div>`;
            }).join('')}
          </div>
          ${renderKeypad('otp')}
          <div class="actions">
            <button class="btn" id="otpContinueBtn" ${otpValue.length < 6 ? 'disabled' : ''}>Verify &amp; Continue</button>
            <button class="btn-outline" id="otpCancelBtn">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function render() {
  const dueDate = getDueDateString();
  const countLabel = `${containerCount} container${containerCount === 1 ? '' : 's'}`;
  const containerUnit = containerCount === 1 ? 'CONTAINER' : 'CONTAINERS';
  updateModeBar();
  updateFooterCopy();

  appRoot.classList.remove('state-scan');
  appRoot.classList.remove('state-program');
  if (appState === STATE.SCAN) {
    appRoot.classList.add('state-scan');
  }
  if (appState === STATE.PROGRAM_OVERVIEW) {
    appRoot.classList.add('state-program');
  }

  switch (appState) {
    case STATE.SCAN:
      const subhead =
        containerCount >= 1
          ? paymentMode === PAYMENT_MODE.CREDIT
            ? 'Scan more containers, or tap your card to finish'
            : 'Scan more containers, or tap your ID to finish'
          : 'Hold each container over the scanner';
      screen.innerHTML = `
        <div class="screen--scan">
          <div class="stepper-row" aria-label="Checkout steps">
            <div class="stepper">
              <div class="stepper__item is-active">
                <div class="stepper__dot">1</div>
                <div class="stepper__label">SCAN ITEMS</div>
              </div>
              <div class="stepper__arrow">—</div>
              <div class="stepper__item">
                <div class="stepper__dot">2</div>
                <div class="stepper__label">${getUserTapLabel()}</div>
              </div>
            </div>
          </div>
          <div class="headline-row">
            <h1 class="card__title">Scan your containers</h1>
          </div>
          <div class="scan-body">
            <div class="scan-rail scan-rail--left"></div>
            <div class="scan-center">
              <p class="card__subtitle scan-subhead">${subhead}</p>
              <div class="scan-notice-space" aria-live="polite">
                <p class="scan-notice ${scanNoticeMessage ? 'is-visible' : ''}">${scanNoticeMessage || ''}</p>
              </div>
              <div class="scan-illustration">
                <img class="illustration" src="images/interface-icons/checkoutkiosk.png" alt="Checkout kiosk illustration" />
              </div>
            </div>
            <div class="scan-rail scan-rail--right" aria-hidden="true"></div>
          </div>
          <div class="scan-status-anchor">
            <div class="status-tile ${containerCount >= 1 ? 'is-visible' : ''}">
              <div class="status-label">READY FOR CHECKOUT</div>
              <div class="status-number ${containerCount >= 1 ? 'is-pop' : ''}">${containerCount}</div>
              <div class="status-unit">${containerUnit}</div>
              <div class="status-timer" id="countdownText">Resets in 0:15</div>
              <div class="status-bar">
                <div class="status-bar__fill" id="countdownBar"></div>
              </div>
            </div>
          </div>
        </div>
      `;
      updateCountdownDisplay();
      break;

    case STATE.PROGRAM_OVERVIEW:
      screen.innerHTML = renderProgramOverviewScreen();
      document.getElementById('acceptContinue').onclick = () => {
        setState(STATE.SUCCESS_NEW);
        scheduleAutoReset(SUCCESS_RESET_MS);
      };
      document.getElementById('programCancel').onclick = resetSession;
      document.getElementById('termsInlineBtn').onclick = () => {
        openTermsModal();
      };
      break;

    case STATE.IDENTIFIER_ENTRY:
      screen.innerHTML = renderIdentifierEntryScreen();
      screen.querySelectorAll('[data-keypad-target="identifier"]').forEach((button) => {
        button.onclick = () => handleKeypadInput('identifier', button.dataset.keypadValue);
      });
      document.getElementById('identifierContinueBtn').onclick = () => {
        if (currentFlow?.scenario === CREDIT_SCENARIO.NEW_USER) {
          setState(STATE.PROGRAM_OVERVIEW);
          return;
        }
        if (currentFlow?.scenario === CREDIT_SCENARIO.RETURN_DIFFERENT_CARD) {
          setState(STATE.OTP_VERIFY);
          return;
        }
        setState(STATE.SUCCESS_RETURNING);
        scheduleAutoReset(SUCCESS_RESET_MS);
      };
      document.getElementById('identifierCancelBtn').onclick = resetSession;
      break;

    case STATE.OTP_VERIFY:
      screen.innerHTML = renderOtpVerifyScreen();
      screen.querySelectorAll('[data-keypad-target="otp"]').forEach((button) => {
        button.onclick = () => handleKeypadInput('otp', button.dataset.keypadValue);
      });
      document.getElementById('otpContinueBtn').onclick = () => {
        setState(STATE.SUCCESS_RETURNING);
        scheduleAutoReset(SUCCESS_RESET_MS);
      };
      document.getElementById('otpCancelBtn').onclick = resetSession;
      break;

    case STATE.SUCCESS_NEW:
      screen.innerHTML = renderSuccess(dueDate, countLabel, containerCount);
      break;

    case STATE.SUCCESS_RETURNING:
      screen.innerHTML = renderSuccess(dueDate, countLabel, containerCount);
      break;

    case STATE.ERROR_CAMPUS:
      screen.innerHTML = `
        <div class="card">
          <h1 class="card__title">We couldn’t find your campus account</h1>
          <p class="card__body">Please contact support@usefull.us for help.</p>
          <div class="actions">
            <button class="btn" id="tryAgain">Try Again</button>
          </div>
        </div>
      `;
      document.getElementById('tryAgain').onclick = resetSession;
      break;

    case STATE.ERROR_FROZEN:
      screen.innerHTML = `
        <div class="card">
          <h1 class="card__title">Account on hold</h1>
          <p class="card__body">Please pay outstanding fees to continue.</p>
          <p class="helper">Questions? support@usefull.us</p>
          <div class="actions">
            <button class="btn" id="doneBtn">Done</button>
          </div>
        </div>
      `;
      document.getElementById('doneBtn').onclick = resetSession;
      break;
  }
}

function renderSuccess(dueDate, countLabel, containerCount = 2) {
  const scannedItems = getScannedContainerItems(containerCount);
  const containerRows = scannedItems
    .map(
      (item) => `
            <div class="container-row">
              <div class="container-icon">
                <img class="container-icon__img" src="${item.icon}" alt="${item.type} icon" />
              </div>
              <div class="container-text">
                <div class="container-name">${item.name}</div>
                <div class="container-type">${item.type}</div>
              </div>
            </div>
      `
    )
    .join('');

  return `
    <div class="success-card">
      <div class="success-grid">
        <div class="success-left">
          <div class="success-check">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9.5 16.2 5.8 12.5l1.4-1.4 2.3 2.3 6.3-6.3 1.4 1.4-7.7 7.7z" fill="currentColor"/>
            </svg>
          </div>
          <h1 class="card__title">You’re all set</h1>
          <p class="success-body">You checked out ${countLabel}.</p>
          <div class="due-banner">
            <div class="due-label">RETURN BY</div>
            <div class="due-date">${dueDate}</div>
            <div class="due-helper">To avoid late fees</div>
          </div>
          <p class="success-footnote">We sent your checkout details.</p>
        </div>
        <div class="success-right">
          <div class="success-section-title">Your containers (${containerCount})</div>
          <div class="container-list" data-allow-scroll>
            ${containerRows}
          </div>
          <div class="success-app">
            <div class="success-app-text">
              <div>Want reminders and impact stats?</div>
              <button class="link-button" type="button">Get the USEFULL app</button>
            </div>
            <div class="success-qr">
              <img src="images/QR-codes/appdownload-QR.png" alt="USEFULL App QR" />
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function closeDemoModal() {
  demoModal.hidden = true;
  resetTimers();
}

demoSettingsBtn.addEventListener('click', () => {
  if (simulationActive) return;
  syncDemoSettingsControls();
  demoModal.hidden = false;
  resetTimers();
});

if (simulationBtn) {
  simulationBtn.addEventListener('click', () => {
    startSimulation();
  });
}

if (collegeLogoSelect) {
  collegeLogoSelect.addEventListener('change', (event) => {
    applyCollegeLogo(event.target.value);
  });
}

if (modeCampusBtn) {
  modeCampusBtn.addEventListener('click', () => {
    paymentMode = PAYMENT_MODE.CAMPUS;
    resetSession();
  });
}

if (modeCreditBtn) {
  modeCreditBtn.addEventListener('click', () => {
    paymentMode = PAYMENT_MODE.CREDIT;
    resetSession();
  });
}

creditScenarioButtons.forEach((button) => {
  button.addEventListener('click', () => {
    creditScenario = button.dataset.creditScenario || CREDIT_SCENARIO.NEW_USER;
    paymentMode = PAYMENT_MODE.CREDIT;
    resetSession();
  });
});

if (idTapOutcomeSelect) {
  idTapOutcomeSelect.addEventListener('change', (event) => {
    demoIdOutcome = event.target.value;
  });
}

if (simContainerCountSelect) {
  simContainerCountSelect.addEventListener('change', (event) => {
    simContainerCount = clampSelectValue(event.target.value, 1, 5, simContainerCount);
    simContainerCountSelect.value = String(simContainerCount);
  });
}

if (simDelayFirstSelect) {
  simDelayFirstSelect.addEventListener('change', (event) => {
    simDelayFirstSec = clampSelectValue(event.target.value, 1, 5, simDelayFirstSec);
    simDelayFirstSelect.value = String(simDelayFirstSec);
  });
}

if (simDelayBetweenSelect) {
  simDelayBetweenSelect.addEventListener('change', (event) => {
    simDelayBetweenSec = clampSelectValue(event.target.value, 1, 5, simDelayBetweenSec);
    simDelayBetweenSelect.value = String(simDelayBetweenSec);
  });
}

if (simDelayBeforeIdSelect) {
  simDelayBeforeIdSelect.addEventListener('change', (event) => {
    simDelayBeforeIdSec = clampSelectValue(event.target.value, 1, 5, simDelayBeforeIdSec);
    simDelayBeforeIdSelect.value = String(simDelayBeforeIdSec);
  });
}

footerTermsBtn.addEventListener('click', () => {
  if (appState !== STATE.PROGRAM_OVERVIEW) {
    return;
  }
  openTermsModal();
});

demoClose.addEventListener('click', (event) => {
  event.stopPropagation();
  closeDemoModal();
});

termsClose.addEventListener('click', (event) => {
  event.stopPropagation();
  closeTermsModal();
});

demoModal.addEventListener('click', (event) => {
  const actionBtn = event.target.closest('[data-action]');
  if (actionBtn && actionBtn.dataset.action === 'reset') {
    resetSession();
    return;
  }
  if (!event.target.closest('.admin-panel')) {
    closeDemoModal();
  }
});

termsModal.addEventListener('click', (event) => {
  if (!event.target.closest('.terms-panel')) {
    closeTermsModal();
  }
});

termsTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    setTermsView(tab.dataset.termsTab);
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !demoModal.hidden) {
    closeDemoModal();
  }
  if (event.key === 'Escape' && !termsModal.hidden) {
    closeTermsModal();
  }
});

function runHotspotAction(action) {
  if (!canUseScanHotspots()) return;
  action();
}

function shouldIgnoreHotspotClick() {
  return Date.now() - lastHotspotPointerAt < HOTSPOT_CLICK_DEDUPE_MS;
}

scanHotspot.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  lastHotspotPointerAt = Date.now();
  runHotspotAction(handleScan);
});

scanHotspot.addEventListener('click', () => {
  if (shouldIgnoreHotspotClick()) return;
  runHotspotAction(handleScan);
});

idHotspot.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  lastHotspotPointerAt = Date.now();
  runHotspotAction(() => handleIdTap({ type: demoIdOutcome, firstName: 'Cody' }));
});

idHotspot.addEventListener('click', () => {
  if (shouldIgnoreHotspotClick()) return;
  runHotspotAction(() => handleIdTap({ type: demoIdOutcome, firstName: 'Cody' }));
});

installScrollGuards();
initViewportDebug();
applyCollegeLogo(selectedCollegeLogo);
syncDemoSettingsControls();
updateSimulationButtonState();
updateSettingsButtonState();
resetSession();
