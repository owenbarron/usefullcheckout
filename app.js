const appRoot = document.getElementById('app');
const screen = document.getElementById('screen');
const cancelBtn = document.getElementById('cancelBtn');
const adminOverlay = document.getElementById('adminOverlay');
const adminClose = document.getElementById('adminClose');
const adminHotspot = document.getElementById('adminHotspot');

const STATE = {
  SCAN: 'scan',
  NEW_POLICY: 'new_policy',
  NEW_TERMS: 'new_terms',
  SUCCESS_NEW: 'success_new',
  SUCCESS_RETURNING: 'success_returning',
  ERROR_CAMPUS: 'error_campus',
  ERROR_FROZEN: 'error_frozen',
};

let appState = STATE.SCAN;
let containerCount = 0;
let idleTimer = null;
let successTimer = null;
let adminHoldTimer = null;
let activeUserName = null;
let checkoutDate = null;
let idleDeadline = null;
let countdownInterval = null;

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
  idleTimer = setTimeout(() => {
    resetSession();
  }, IDLE_TIMEOUT_MS);
  if (appState === STATE.SCAN && containerCount > 0) {
    startCountdown();
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
      setState(STATE.NEW_POLICY);
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

function render() {
  const dueDate = getDueDateString();
  const countLabel = `${containerCount} container${containerCount === 1 ? '' : 's'}`;
  const containerUnit = containerCount === 1 ? 'CONTAINER' : 'CONTAINERS';

  appRoot.classList.remove('state-scan');
  if (appState === STATE.SCAN) {
    appRoot.classList.add('state-scan');
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

    case STATE.NEW_POLICY:
      screen.innerHTML = `
        <div class="card">
          <h1 class="card__title">Welcome to USEFULL</h1>
          <div class="card__body">
            <p>At NAU, you get a 2-day free usage period.</p>
            <p>After that, a $1/day late fee applies.</p>
            <p>After 15 days, containers are considered lost.</p>
            <p>Total fees (including daily fees): $17/cup, $25/bowl.</p>
            <p>All fees are charged to your JacksCard.</p>
          </div>
          <div class="actions">
            <button class="btn" id="policyNext">Next</button>
            <button class="btn-outline" id="policyCancel">Cancel</button>
          </div>
        </div>
      `;
      document.getElementById('policyNext').onclick = () => setState(STATE.NEW_TERMS);
      document.getElementById('policyCancel').onclick = resetSession;
      break;

    case STATE.NEW_TERMS:
      screen.innerHTML = `
        <div class="card">
          <h1 class="card__title">Accept Terms</h1>
          <p class="card__body">By signing up, I accept the USEFULL Terms and Conditions.</p>
          <div class="qr-box">QR CODE</div>
          <p class="helper">Scan the QR code to view them now. You’ll also receive a copy by email.</p>
          <div class="actions">
            <button class="btn" id="acceptTerms">I Accept</button>
            <button class="btn-outline" id="termsCancel">Cancel</button>
          </div>
        </div>
      `;
      document.getElementById('acceptTerms').onclick = () => {
        setState(STATE.SUCCESS_NEW);
        scheduleAutoReset(SUCCESS_RESET_MS);
      };
      document.getElementById('termsCancel').onclick = resetSession;
      break;

    case STATE.SUCCESS_NEW:
      screen.innerHTML = `
        <div class="card card--accent">
          <div class="icon-circle">
            <img src="Branding/Logo Registered/Icon/USEFULL-Icon-Registered_Color.svg" alt="USEFULL" />
          </div>
          <h1 class="card__title card__title--light">You’re all set!</h1>
          <p class="card__subtitle">You’ve checked out ${countLabel}.</p>
          <p class="card__body">Return by ${dueDate} to avoid late fees.</p>
          <p class="card__body">Check your email for details.</p>
        </div>
      `;
      break;

    case STATE.SUCCESS_RETURNING:
      screen.innerHTML = `
        <div class="card card--accent">
          <div class="icon-circle">
            <img src="Branding/Logo Registered/Icon/USEFULL-Icon-Registered_Color.svg" alt="USEFULL" />
          </div>
          <h1 class="card__title card__title--light">${activeUserName ? `Welcome back, ${activeUserName}!` : 'Welcome back!'}</h1>
          <p class="card__subtitle">You’ve checked out ${countLabel}.</p>
          <p class="card__body">Return by ${dueDate} to avoid late fees.</p>
          <p class="card__body">Check your email for details.</p>
        </div>
      `;
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

function handleSimAction(action) {
  if (action === 'scan') {
    handleScan();
  } else if (action === 'returning') {
    handleIdTap({ type: 'returning_user', firstName: 'Cody' });
  } else if (action === 'new') {
    handleIdTap({ type: 'new_user' });
  } else if (action === 'campus_not_found') {
    handleIdTap({ type: 'campus_user_not_found' });
  } else if (action === 'frozen') {
    handleIdTap({ type: 'account_frozen' });
  } else if (action === 'reset') {
    resetSession();
  }
}

if (cancelBtn) {
  cancelBtn.addEventListener('click', resetSession);
}

function closeAdminOverlay() {
  adminOverlay.hidden = true;
  resetTimers();
}

adminClose.addEventListener('pointerdown', (event) => {
  event.stopPropagation();
  closeAdminOverlay();
});

adminClose.addEventListener('click', (event) => {
  event.stopPropagation();
  closeAdminOverlay();
});

adminOverlay.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-sim]');
  if (btn) {
    handleSimAction(btn.dataset.sim);
    closeAdminOverlay();
    return;
  }
  if (!event.target.closest('.admin-panel')) {
    closeAdminOverlay();
  }
});

document.addEventListener('click', (event) => {
  const btn = event.target.closest('.sim-panel [data-sim]');
  if (!btn) return;
  handleSimAction(btn.dataset.sim);
});

adminHotspot.addEventListener('pointerdown', () => {
  adminHoldTimer = setTimeout(() => {
    adminOverlay.hidden = false;
  }, 3000);
});

adminHotspot.addEventListener('pointerup', () => {
  clearTimeout(adminHoldTimer);
});

adminHotspot.addEventListener('pointerleave', () => {
  clearTimeout(adminHoldTimer);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !adminOverlay.hidden) {
    closeAdminOverlay();
  }
});

resetSession();
