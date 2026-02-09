const appRoot = document.getElementById('app');
const screen = document.getElementById('screen');
const demoModal = document.getElementById('demoModal');
const demoClose = document.getElementById('demoClose');
const demoSettingsBtn = document.getElementById('demoSettingsBtn');
const footerTermsBtn = document.getElementById('footerTermsBtn');
const termsModal = document.getElementById('termsModal');
const termsClose = document.getElementById('termsClose');
const scanHotspot = document.getElementById('scanHotspot');
const idHotspot = document.getElementById('idHotspot');
const termsTabs = document.querySelectorAll('[data-terms-tab]');
const termsSummary = document.getElementById('termsSummary');
const termsFull = document.getElementById('termsFull');

const STATE = {
  SCAN: 'scan',
  PROGRAM_OVERVIEW: 'program_overview',
  SUCCESS_NEW: 'success_new',
  SUCCESS_RETURNING: 'success_returning',
  ERROR_CAMPUS: 'error_campus',
  ERROR_FROZEN: 'error_frozen',
};

let appState = STATE.SCAN;
let containerCount = 0;
let idleTimer = null;
let successTimer = null;
let activeUserName = null;
let checkoutDate = null;
let idleDeadline = null;
let countdownInterval = null;
let demoIdOutcome = 'new_user';
let termsModalOpen = false;

const IDLE_TIMEOUT_MS = 15000;
const SUCCESS_RESET_MS = 5000;
const ERROR_RESET_MS = 8000;

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
    if (appState === STATE.SCAN && containerCount > 0) {
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
  containerCount = 0;
  activeUserName = null;
  checkoutDate = null;
  stopCountdown();
  setState(STATE.SCAN);
}

function setState(next) {
  appState = next;
  render();
  resetTimers();
}

function handleScan() {
  containerCount += 1;
  render();
  resetTimers();
}

function handleIdTap(outcome) {
  checkoutDate = new Date();
  activeUserName = outcome.firstName || null;
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

function render() {
  const dueDate = getDueDateString();
  const countLabel = `${containerCount} container${containerCount === 1 ? '' : 's'}`;
  const containerUnit = containerCount === 1 ? 'CONTAINER' : 'CONTAINERS';

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
          ? 'Scan more containers, or tap your ID to finish'
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
                <div class="stepper__label">SCAN USER</div>
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
              <div class="scan-illustration">
                <img class="illustration" src="Branding/checkoutkiosk.png" alt="Checkout kiosk illustration" />
              </div>
            </div>
            <div class="scan-rail scan-rail--right">
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
        </div>
      `;
      updateCountdownDisplay();
      break;

    case STATE.PROGRAM_OVERVIEW:
      const name = activeUserName || 'Cody';
      screen.innerHTML = `
        <div class="card program-card">
          <h1 class="card__title">Program Overview</h1>
          <p class="program-subtitle">Welcome, ${name} — here’s how USEFULL works at NAU</p>
          <div class="summary-grid">
            <div class="summary-card">
              <img class="summary-icon-img" src="images/icon-duedate.png" alt="Due date icon" />
              <div class="summary-title">2 Days Free</div>
              <div class="summary-text">No charge if returned on time</div>
            </div>
            <div class="summary-card">
              <img class="summary-icon-img" src="images/icon-fee.png" alt="Fee icon" />
              <div class="summary-title">$1 / Day Late Fee</div>
              <div class="summary-text">Applies after day 2</div>
            </div>
            <div class="summary-card">
              <img class="summary-icon-img" src="images/icon-lost.png" alt="Lost item icon" />
              <div class="summary-title">Lost After 15 Days</div>
              <div class="summary-text">Charged $17 cup · $25 bowl (max)</div>
            </div>
            <div class="summary-card">
              <img class="summary-icon-img" src="images/icon-card.png" alt="Card icon" />
              <div class="summary-title">JacksCard Billing</div>
              <div class="summary-text">All fees charged automatically</div>
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
      document.getElementById('acceptContinue').onclick = () => {
        setState(STATE.SUCCESS_NEW);
        scheduleAutoReset(SUCCESS_RESET_MS);
      };
      document.getElementById('programCancel').onclick = resetSession;
      document.getElementById('termsInlineBtn').onclick = () => {
        termsModal.hidden = false;
        termsModalOpen = true;
        setTermsView('summary');
        resetTimers();
      };
      break;

    case STATE.SUCCESS_NEW:
      screen.innerHTML = renderSuccess(dueDate, countLabel);
      break;

    case STATE.SUCCESS_RETURNING:
      screen.innerHTML = renderSuccess(dueDate, countLabel);
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
          <p class="success-footnote">We emailed you the details.</p>
        </div>
        <div class="success-right">
          <div class="success-section-title">Your containers (${containerCount})</div>
          <div class="container-list">
            <div class="container-row">
              <div class="container-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 8h16l-2 9a3 3 0 0 1-3 2H9a3 3 0 0 1-3-2L4 8z" fill="none" stroke="currentColor" stroke-width="1.6"/>
                  <path d="M6 8c0-2.2 2.7-4 6-4s6 1.8 6 4" fill="none" stroke="currentColor" stroke-width="1.6"/>
                </svg>
              </div>
              <div class="container-text">
                <div class="container-name">Vicious Grey Mollusk</div>
                <div class="container-type">Bowl</div>
              </div>
            </div>
            <div class="container-row">
              <div class="container-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 4h10l-1 14a4 4 0 0 1-4 3h-0a4 4 0 0 1-4-3L7 4z" fill="none" stroke="currentColor" stroke-width="1.6"/>
                  <path d="M6 4h12" fill="none" stroke="currentColor" stroke-width="1.6"/>
                </svg>
              </div>
              <div class="container-text">
                <div class="container-name">Uncontrollable Vermillion Flamingo</div>
                <div class="container-type">Cup</div>
              </div>
            </div>
          </div>
          <div class="success-app">
            <div class="success-app-text">
              <div>Want reminders and impact stats?</div>
              <button class="link-button" type="button">Get the USEFULL app</button>
            </div>
            <div class="success-qr">
              <img src="images/appdownload-QR.png" alt="USEFULL App QR" />
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
  demoModal.hidden = false;
});

footerTermsBtn.addEventListener('click', () => {
  termsModal.hidden = false;
  termsModalOpen = true;
  setTermsView('summary');
  resetTimers();
});

demoClose.addEventListener('click', (event) => {
  event.stopPropagation();
  closeDemoModal();
});

termsClose.addEventListener('click', (event) => {
  event.stopPropagation();
  termsModal.hidden = true;
  termsModalOpen = false;
  resetTimers();
});

demoModal.addEventListener('click', (event) => {
  const outcomeBtn = event.target.closest('[data-outcome]');
  if (outcomeBtn) {
    demoIdOutcome = outcomeBtn.dataset.outcome;
    document.querySelectorAll('[data-outcome]').forEach((btn) => {
      btn.classList.toggle('is-selected', btn.dataset.outcome === demoIdOutcome);
    });
    return;
  }
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
    termsModal.hidden = true;
    termsModalOpen = false;
    resetTimers();
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
    termsModal.hidden = true;
    termsModalOpen = false;
    resetTimers();
  }
});

scanHotspot.addEventListener('click', () => {
  handleScan();
});

idHotspot.addEventListener('click', () => {
  handleIdTap({ type: demoIdOutcome, firstName: 'Cody' });
});

document.querySelectorAll('[data-outcome]').forEach((btn) => {
  btn.classList.toggle('is-selected', btn.dataset.outcome === demoIdOutcome);
});

resetSession();
