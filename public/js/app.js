/*
 * Windows 98 Interactive Resume - window manager
 *
 * All behaviour is wired through event delegation on data-* attributes rather
 * than inline onclick handlers, so the site can run under a Content-Security-Policy
 * that does not permit 'unsafe-inline' scripts (see public/_headers).
 */

let highestZIndex = 100;
let activeWindowId = null;

const openWindows = new Set();

const MOBILE_BREAKPOINT = 768;

/* Windows opened automatically on first load (desktop only). */
const DEFAULT_OPEN_WINDOWS = ['window-about', 'window-readme', 'window-clock'];

/* Windows that are opened automatically on mobile - just the intro, so a phone
   visitor is not buried under overlapping windows. */
const MOBILE_DEFAULT_OPEN_WINDOWS = ['window-about'];

/* Session flag: the boot animation plays once per visit, not on every reload. */
const BOOT_SESSION_KEY = 'illyaatech-boot-played';

/* Preferred starting position per window on a desktop viewport. */
const initialWindowPositions = {
  'window-about': { top: '20px', left: '120px' },
  'window-experience': { top: '30px', left: '560px' },
  'window-skills': { top: '60px', left: '140px' },
  'window-projects': { top: '150px', left: '400px' },
  'window-cv': { top: '200px', left: '430px' },
  'window-readme': { top: '20px', left: '556px' },
  'window-clock': { top: '20px', left: 'calc(100vw - 210px)' },
  'window-recycle': { top: '430px', left: '420px' },
  'window-chha': { top: '470px', left: '600px' }
};

const isMobile = () => window.innerWidth < MOBILE_BREAKPOINT;

/* ---------------------------------------------------------------- bootstrap */

document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initDragAndDrop();
  initGlobalHandlers();
  applyWindowSpread();

  window.addEventListener('resize', applyWindowSpread);

  // The boot sequence gates the desktop, so the machine appears to start up before
  // any window shows. It resolves immediately when it should be skipped.
  runBoot().then(startDesktop);
});

/* Open the windows that should be visible on arrival. Runs after boot resolves. */
function startDesktop() {
  const defaults = isMobile() ? MOBILE_DEFAULT_OPEN_WINDOWS : DEFAULT_OPEN_WINDOWS;
  defaults.forEach((id) => openWindow(id));
  updateTaskbar();
}

/* Keyboard support for the desktop shortcuts. */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const icon = e.target.closest?.('.desktop-icon');
  if (!icon) return;
  e.preventDefault();
  openWindow(icon.dataset.open);
});

/* --------------------------------------------------------- delegated events */

function initGlobalHandlers() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest(
      '[data-open],[data-close],[data-minimize],[data-tab],[data-shutdown],[data-reboot]'
    );

    if (el) {
      // NOTE: data-close / data-minimize / data-shutdown / data-reboot are valueless
      // attributes, so el.dataset.close === '' (falsy). Always test with hasAttribute,
      // never for truthiness.
      if (el.hasAttribute('data-close')) {
        closeWindow(el.closest('.window').id);
      } else if (el.hasAttribute('data-minimize')) {
        minimizeWindow(el.closest('.window').id);
      } else if (el.dataset.open) {
        openWindow(el.dataset.open);
        if (el.hasAttribute('data-menu-close')) closeStartMenu();
      } else if (el.dataset.tab) {
        switchTab(el);
      } else if (el.hasAttribute('data-reboot')) {
        reboot();
      } else if (el.hasAttribute('data-shutdown')) {
        window.alert("Windows 98 Shutdown: thank you for viewing Amirul Qayyum's resume!");
      }
      return;
    }

    // Clicking anywhere outside the start menu (or its button) closes it.
    const startMenu = document.getElementById('start-menu');
    const startBtn = document.getElementById('start-button');
    if (startMenu && startBtn && !startMenu.contains(e.target) && !startBtn.contains(e.target)) {
      closeStartMenu();
    }
  });

  const startBtn = document.getElementById('start-button');
  if (startBtn) {
    startBtn.addEventListener('click', toggleStartMenu);
  }

  // A title bar click (not on a control) focuses and raises its window.
  document.addEventListener('mousedown', (e) => {
    const bar = e.target.closest('.title-bar');
    if (!bar) return;
    if (e.target.closest('button')) return;
    focusWindow(bar.closest('.window').id);
  });
}

/* ------------------------------------------------------------------ layout */

function applyWindowSpread() {
  const mobile = isMobile();

  Object.keys(initialWindowPositions).forEach((id) => {
    const win = document.getElementById(id);
    if (!win || win.dataset.dragged === 'true') return;

    if (mobile) {
      win.style.top = '8px';
      win.style.left = '8px';
      win.style.width = 'calc(100vw - 16px)';
      win.style.maxWidth = '100vw';
    } else {
      const pos = initialWindowPositions[id];
      win.style.maxWidth = '90vw';
      if (pos.top) win.style.top = pos.top;
      if (pos.left) win.style.left = pos.left;
    }
  });
}

/* -------------------------------------------------------------------- boot */

/* sessionStorage throws in some privacy modes - never let that break the page. */
function readSession(key) {
  try {
    return window.sessionStorage.getItem(key);
  } catch (err) {
    return null;
  }
}

function writeSession(key, value) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch (err) {
    /* ignore */
  }
}

function clearSession(key) {
  try {
    window.sessionStorage.removeItem(key);
  } catch (err) {
    /* ignore */
  }
}

function prefersReducedMotion() {
  return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

/**
 * Plays the BIOS/POST text followed by the Windows 98 splash, then resolves.
 *
 * Skipped entirely when the animation already played this session, when the visitor
 * asks for reduced motion, or when the markup is absent. Once running it can be cut
 * short at any moment by a click or keypress, so it never traps a visitor who wants
 * to get straight to the content.
 */
function runBoot() {
  return new Promise((resolve) => {
    const boot = document.getElementById('boot-screen');
    const bios = document.getElementById('boot-bios');
    const splash = document.getElementById('boot-splash');

    if (!boot || !bios || !splash) return resolve();
    if (readSession(BOOT_SESSION_KEY) || prefersReducedMotion()) return resolve();

    bios.hidden = false;
    splash.hidden = true;
    boot.hidden = false;

    const lines = bios.querySelectorAll('.bios-line');
    const timers = [];
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      boot.hidden = true;
      bios.hidden = true;
      splash.hidden = true;
      document.removeEventListener('keydown', finish);
      boot.removeEventListener('click', finish);
      writeSession(BOOT_SESSION_KEY, '1');
      resolve();
    };

    lines.forEach((line, i) => {
      timers.push(setTimeout(() => line.classList.add('bios-line-on'), i * 60));
    });

    const biosDoneAt = lines.length * 60 + 420;

    timers.push(setTimeout(() => {
      bios.hidden = true;
      splash.hidden = false;
    }, biosDoneAt));

    timers.push(setTimeout(finish, biosDoneAt + 1500));

    boot.addEventListener('click', finish);
    document.addEventListener('keydown', finish);
  });
}

/* Start menu -> "Restart...": replay the boot and return to a clean desktop. */
async function reboot() {
  closeStartMenu();
  Array.from(openWindows).forEach((id) => closeWindow(id));
  clearSession(BOOT_SESSION_KEY);
  await runBoot();
  startDesktop();
}

/* ------------------------------------------------------------------- clock */

function initClock() {
  const hourHand = document.getElementById('clock-hour');
  const minuteHand = document.getElementById('clock-minute');
  const secondHand = document.getElementById('clock-second');
  const digitalEl = document.getElementById('clock-digital');
  const dateEl = document.getElementById('clock-date');
  const trayEl = document.getElementById('clock');

  function updateTime() {
    const now = new Date();
    const hours24 = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const ampm = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;

    if (trayEl) {
      trayEl.textContent = `${hours12}:${String(minutes).padStart(2, '0')} ${ampm}`;
    }

    // Analog hands. The element CSS supplies the pivot, so JS only ever rotates.
    if (hourHand) hourHand.style.transform = `rotate(${hours12 * 30 + minutes * 0.5}deg)`;
    if (minuteHand) minuteHand.style.transform = `rotate(${minutes * 6 + seconds * 0.1}deg)`;
    if (secondHand) secondHand.style.transform = `rotate(${seconds * 6}deg)`;

    if (digitalEl) {
      digitalEl.textContent =
        `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:` +
        `${String(seconds).padStart(2, '0')} ${ampm}`;
    }

    if (dateEl) {
      dateEl.textContent = now.toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
  }

  updateTime();
  setInterval(updateTime, 1000);
}

/* ----------------------------------------------------------------- windows */

function focusWindow(windowId) {
  const win = document.getElementById(windowId);
  if (!win) return;

  highestZIndex += 1;
  win.style.zIndex = highestZIndex;
  win.style.display = 'flex';
  win.classList.remove('minimized');
  win.classList.add('active');
  activeWindowId = windowId;

  document.querySelectorAll('.window').forEach((w) => {
    const titleBar = w.querySelector('.title-bar');
    if (titleBar) titleBar.classList.remove('title-bar-active');
  });
  win.querySelector('.title-bar')?.classList.add('title-bar-active');

  updateTaskbar();
}

function openWindow(windowId) {
  const win = document.getElementById(windowId);
  if (!win) return;

  // On a phone, only ever show one window at a time - they are all full width.
  if (isMobile()) {
    document.querySelectorAll('.window.active').forEach((w) => {
      if (w.id !== windowId) {
        w.style.display = 'none';
        w.classList.remove('active');
        openWindows.delete(w.id);
      }
    });
  }

  win.classList.remove('minimized');
  openWindows.add(windowId);
  focusWindow(windowId);
}

function closeWindow(windowId) {
  const win = document.getElementById(windowId);
  if (!win) return;
  win.classList.remove('active');
  win.classList.remove('minimized');
  win.style.display = 'none';
  openWindows.delete(windowId);
  if (activeWindowId === windowId) activeWindowId = null;
  updateTaskbar();
}

function minimizeWindow(windowId) {
  const win = document.getElementById(windowId);
  if (!win) return;
  win.style.display = 'none';
  win.classList.add('minimized');
  win.classList.remove('active');
  if (activeWindowId === windowId) activeWindowId = null;
  updateTaskbar();
}

/* Draggable title bars. */
function initDragAndDrop() {
  document.querySelectorAll('.window').forEach((win) => {
    const titleBar = win.querySelector('.title-bar');
    if (!titleBar) return;

    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    titleBar.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      isDragging = true;
      win.dataset.dragged = 'true';
      offsetX = e.clientX - win.offsetLeft;
      offsetY = e.clientY - win.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const maxLeft = Math.max(0, window.innerWidth - 80);
      const maxTop = Math.max(0, window.innerHeight - 80);
      win.style.left = `${Math.min(Math.max(e.clientX - offsetX, -win.offsetWidth + 80), maxLeft)}px`;
      win.style.top = `${Math.min(Math.max(e.clientY - offsetY, 0), maxTop)}px`;
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  });
}

/* ---------------------------------------------------------------- taskbar */

function updateTaskbar() {
  const taskbarContainer = document.getElementById('taskbar-items');
  if (!taskbarContainer) return;
  taskbarContainer.textContent = '';

  openWindows.forEach((windowId) => {
    const win = document.getElementById(windowId);
    if (!win) return;

    const titleText = win.querySelector('.title-bar-text span')?.textContent || windowId;
    const btn = document.createElement('button');
    const focused = activeWindowId === windowId && !win.classList.contains('minimized');
    btn.className = `taskbar-item${focused ? ' focused' : ''}`;
    btn.textContent = titleText;
    btn.title = titleText;

    btn.addEventListener('click', () => {
      if (win.classList.contains('minimized') || activeWindowId !== windowId) {
        openWindow(windowId);
      } else {
        minimizeWindow(windowId);
      }
    });

    taskbarContainer.appendChild(btn);
  });
}

/* -------------------------------------------------------------- start menu */

function toggleStartMenu() {
  document.getElementById('start-menu')?.classList.toggle('open');
}

function closeStartMenu() {
  document.getElementById('start-menu')?.classList.remove('open');
}

/* ------------------------------------------------------------------- tabs */

function switchTab(tabButton) {
  const tablist = tabButton.closest('.tablist');
  const body = tablist?.parentElement;
  if (!tablist || !body) return;

  tablist.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', 'false'));
  tabButton.setAttribute('aria-selected', 'true');

  body.querySelectorAll('.tab-content').forEach((content) => {
    content.hidden = content.id !== tabButton.dataset.tab;
  });
}
