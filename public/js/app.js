let highestZIndex = 100;
const openWindows = new Set(['window-about', 'window-experience', 'window-skills', 'window-readme']);

// Spaced positions across different screen quadrants
const initialWindowPositions = {
  'window-about': { top: '25px', left: '110px' },
  'window-experience': { top: '35px', left: 'calc(100vw - 580px)' },
  'window-skills': { top: '340px', left: '120px' },
  'window-projects': { top: '140px', left: 'calc(50vw - 270px)' },
  'window-readme': { top: '60px', left: 'calc(50vw - 250px)' },
  'window-recycle': { top: '420px', left: 'calc(50vw - 170px)' },
  'window-chha': { top: '465px', left: 'calc(100vw - 580px)' }
};

document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initDragAndDrop();
  applyWindowSpread();
  initWindows();
  updateTaskbar();

  // Re-apply spread positions on window resize if not dragged
  window.addEventListener('resize', applyWindowSpread);

  // Close start menu when clicking outside
  document.addEventListener('click', (e) => {
    const startMenu = document.getElementById('start-menu');
    const startBtn = document.getElementById('start-button');
    if (startMenu && startBtn && !startMenu.contains(e.target) && !startBtn.contains(e.target)) {
      startMenu.classList.remove('open');
    }
  });
});

/* Apply Spaced Positions Across Desktop Screen */
function applyWindowSpread() {
  const isMobile = window.innerWidth < 768;

  Object.keys(initialWindowPositions).forEach(id => {
    const win = document.getElementById(id);
    if (!win || win.dataset.dragged === 'true') return;

    const pos = initialWindowPositions[id];
    if (isMobile) {
      win.style.top = '10px';
      win.style.left = '10px';
      win.style.width = 'calc(100vw - 20px)';
      win.style.maxWidth = '100vw';
    } else {
      if (pos.top) win.style.top = pos.top;
      if (pos.left) win.style.left = pos.left;
    }
  });
}

/* Live Clock Update */
function initClock() {
  function updateTime() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const clockEl = document.getElementById('clock');
    if (clockEl) {
      clockEl.textContent = `${hours}:${minutes} ${ampm}`;
    }
  }
  updateTime();
  setInterval(updateTime, 1000);
}

/* Initialize Open Windows */
function initWindows() {
  ['window-about', 'window-experience', 'window-skills', 'window-readme', 'window-chha'].forEach(id => {
    openWindow(id);
  });
}

/* Window Focus & Bring to Top */
function focusWindow(windowId) {
  const win = document.getElementById(windowId);
  if (!win) return;
  highestZIndex++;
  win.style.zIndex = highestZIndex;
  win.style.display = 'flex';
  win.classList.remove('minimized');

  // Highlight active window title bar
  document.querySelectorAll('.window').forEach(w => {
    const titleBar = w.querySelector('.title-bar');
    if (titleBar) titleBar.style.background = '#808080';
  });
  const activeTitleBar = win.querySelector('.title-bar');
  if (activeTitleBar) {
    activeTitleBar.style.background = 'linear-gradient(90deg, #000080, #1084d0)';
  }

  updateTaskbar(windowId);
}

/* Open Window */
function openWindow(windowId) {
  const win = document.getElementById(windowId);
  if (!win) return;
  win.style.display = 'flex';
  win.classList.add('active');
  win.classList.remove('minimized');
  openWindows.add(windowId);
  focusWindow(windowId);
  updateTaskbar(windowId);
}

/* Close Window */
function closeWindow(windowId) {
  const win = document.getElementById(windowId);
  if (!win) return;
  win.style.display = 'none';
  win.classList.remove('active');
  openWindows.delete(windowId);
  updateTaskbar();
}

/* Minimize Window */
function minimizeWindow(windowId) {
  const win = document.getElementById(windowId);
  if (!win) return;
  win.style.display = 'none';
  win.classList.add('minimized');
  updateTaskbar();
}

/* Maximize / Restore Toggle */
function toggleMaximize(windowId) {
  const win = document.getElementById(windowId);
  if (!win) return;
  if (win.dataset.maximized === 'true') {
    win.style.top = win.dataset.oldTop || '40px';
    win.style.left = win.dataset.oldLeft || '140px';
    win.style.width = win.dataset.oldWidth || '440px';
    win.style.height = win.dataset.oldHeight || 'auto';
    win.dataset.maximized = 'false';
  } else {
    win.dataset.oldTop = win.style.top;
    win.dataset.oldLeft = win.style.left;
    win.dataset.oldWidth = win.style.width;
    win.dataset.oldHeight = win.style.height;

    win.style.top = '0px';
    win.style.left = '0px';
    win.style.width = '100vw';
    win.style.height = 'calc(100vh - 34px)';
    win.dataset.maximized = 'true';
  }
}

/* Draggable Title Bars */
function initDragAndDrop() {
  document.querySelectorAll('.window').forEach(win => {
    const titleBar = win.querySelector('.title-bar');
    if (!titleBar) return;

    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    titleBar.addEventListener('mousedown', (e) => {
      if (e.target.tagName.toLowerCase() === 'button') return;
      isDragging = true;
      win.dataset.dragged = 'true'; // Mark as dragged so auto-spread doesn't overwrite user movement
      offsetX = e.clientX - win.offsetLeft;
      offsetY = e.clientY - win.offsetTop;
      focusWindow(win.id);
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      win.style.left = `${e.clientX - offsetX}px`;
      win.style.top = `${e.clientY - offsetY}px`;
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  });
}

/* Taskbar Synchronization */
function updateTaskbar(focusedWindowId = null) {
  const taskbarContainer = document.getElementById('taskbar-items');
  if (!taskbarContainer) return;
  taskbarContainer.innerHTML = '';

  openWindows.forEach(windowId => {
    const win = document.getElementById(windowId);
    if (!win) return;

    const titleText = win.querySelector('.title-bar-text span')?.textContent || windowId;
    const btn = document.createElement('button');
    btn.className = `taskbar-item ${focusedWindowId === windowId && !win.classList.contains('minimized') ? 'focused' : ''}`;
    btn.textContent = titleText;

    btn.onclick = () => {
      if (win.classList.contains('minimized') || focusedWindowId !== windowId) {
        openWindow(windowId);
      } else {
        minimizeWindow(windowId);
      }
    };

    taskbarContainer.appendChild(btn);
  });
}

/* Toggle Start Menu */
function toggleStartMenu() {
  const startMenu = document.getElementById('start-menu');
  if (startMenu) {
    startMenu.classList.toggle('open');
  }
}

/* Switch Tab */
function switchTab(e, tabId) {
  e.preventDefault();
  const parentWindow = e.target.closest('.window');
  if (!parentWindow) return;

  parentWindow.querySelectorAll('menu[role="tablist"] li').forEach(li => {
    li.setAttribute('aria-selected', 'false');
  });
  e.target.closest('li').setAttribute('aria-selected', 'true');

  parentWindow.querySelectorAll('.tab-content').forEach(content => {
    content.style.display = 'none';
  });

  const activeContent = parentWindow.querySelector(`#${tabId}`);
  if (activeContent) {
    activeContent.style.display = 'block';
  }
}

