// ==UserScript==
// @name         flomo Waterfall Layout
// @namespace    https://github.com/geekest/flomo_WaterFall
// @version      0.1.0
// @description  Add a collapsible sidebar and responsive waterfall memo layout to flomo Web.
// @author       Geekest
// @match        https://v.flomoapp.com/*
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const CONFIG = {
    defaultMaxColumns: 5,
    minColumns: 1,
    maxColumns: 5,
    minCardWidth: 280,
    gap: 16,
    collapsedSidebarWidth: 52,
    bodyClass: 'fwf-active',
    sidebarCollapsedClass: 'fwf-sidebar-collapsed',
    mainPaneClass: 'fwf-main-pane',
    contentRootClass: 'fwf-content-root',
    layoutClass: 'fwf-masonry',
    toggleHostClass: 'fwf-sidebar-toggle-host',
    toggleButtonClass: 'fwf-sidebar-toggle',
    footerSelector: '.loading, .empty, .end, .gallery-end',
  };

  const state = {
    maxColumns: CONFIG.defaultMaxColumns,
    sidebarCollapsed: false,
    listElement: null,
    sidebarElement: null,
    resizerElement: null,
    mainPaneElement: null,
    contentRootElement: null,
    toggleHost: null,
    toggleButton: null,
    layoutFrame: 0,
    initFrame: 0,
    bodyObserver: null,
    listObserver: null,
    resizeObserver: null,
    menuCommandIds: [],
    cardResizeObservers: new Map(),
  };

  const TEXT = {
    collapse: '收纳侧边栏',
    expand: '展开侧边栏',
    menuIncrease: count => `flomo 列数 +1（当前上限 ${count}）`,
    menuDecrease: count => `flomo 列数 -1（当前上限 ${count}）`,
  };

  function injectStyles() {
    if (document.getElementById('fwf-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'fwf-styles';
    style.textContent = `
      body.${CONFIG.bodyClass} .web-container {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
      }

      body.${CONFIG.bodyClass} .main-container {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
        flex: 1 1 auto !important;
      }

      body.${CONFIG.bodyClass} .${CONFIG.mainPaneClass} {
        width: 100% !important;
        max-width: none !important;
        min-width: 0 !important;
        flex: 1 1 auto !important;
      }

      body.${CONFIG.bodyClass} .${CONFIG.contentRootClass},
      body.${CONFIG.bodyClass} .container {
        width: 100% !important;
        max-width: none !important;
        min-width: 0 !important;
      }

      body.${CONFIG.bodyClass} .${CONFIG.layoutClass} {
        position: relative !important;
        display: block !important;
        gap: 0 !important;
        width: 100% !important;
        max-width: none !important;
        scrollbar-gutter: stable !important;
      }

      body.${CONFIG.bodyClass} .${CONFIG.layoutClass}::after {
        content: "";
        display: block;
        width: 100%;
        height: var(--fwf-content-height, 0px);
      }

      body.${CONFIG.bodyClass} .${CONFIG.layoutClass} > .memo,
      body.${CONFIG.bodyClass} .${CONFIG.layoutClass} > .foldList,
      body.${CONFIG.bodyClass} .${CONFIG.layoutClass} > .loading,
      body.${CONFIG.bodyClass} .${CONFIG.layoutClass} > .empty,
      body.${CONFIG.bodyClass} .${CONFIG.layoutClass} > .end,
      body.${CONFIG.bodyClass} .${CONFIG.layoutClass} > .gallery-end {
        position: absolute !important;
        top: 0;
        left: 0;
        margin: 0 !important;
        width: var(--fwf-card-width, 100%) !important;
        box-sizing: border-box;
        will-change: transform, width;
      }

      body.${CONFIG.bodyClass} .${CONFIG.layoutClass} > .loading,
      body.${CONFIG.bodyClass} .${CONFIG.layoutClass} > .empty,
      body.${CONFIG.bodyClass} .${CONFIG.layoutClass} > .end,
      body.${CONFIG.bodyClass} .${CONFIG.layoutClass} > .gallery-end {
        width: var(--fwf-footer-width, 100%) !important;
      }

      body.${CONFIG.bodyClass} .sidebar.${CONFIG.sidebarCollapsedClass} {
        min-width: ${CONFIG.collapsedSidebarWidth}px !important;
        max-width: ${CONFIG.collapsedSidebarWidth}px !important;
        width: ${CONFIG.collapsedSidebarWidth}px !important;
        overflow-x: hidden !important;
      }

      body.${CONFIG.bodyClass} .sidebar.${CONFIG.sidebarCollapsedClass} > :not(.${CONFIG.toggleHostClass}) {
        opacity: 0;
        pointer-events: none;
      }

      body.${CONFIG.bodyClass} .sidebar.${CONFIG.sidebarCollapsedClass} > :not(.${CONFIG.toggleHostClass}) * {
        pointer-events: none;
      }

      body.${CONFIG.bodyClass} .fwf-sidebar-resizer {
        transition: opacity 0.2s ease;
      }

      body.${CONFIG.bodyClass}.${CONFIG.sidebarCollapsedClass} .fwf-sidebar-resizer {
        opacity: 0;
        pointer-events: none;
      }

      body.${CONFIG.bodyClass} .${CONFIG.toggleHostClass} {
        position: sticky;
        top: 0;
        z-index: 10;
        display: flex;
        justify-content: flex-end;
        padding: 10px 0 8px;
        background: linear-gradient(180deg, rgba(250, 250, 250, 0.98) 0%, rgba(250, 250, 250, 0.82) 70%, rgba(250, 250, 250, 0) 100%);
      }

      body.dark_mode.${CONFIG.bodyClass} .${CONFIG.toggleHostClass} {
        background: linear-gradient(180deg, rgba(18, 18, 18, 0.98) 0%, rgba(18, 18, 18, 0.82) 70%, rgba(18, 18, 18, 0) 100%);
      }

      body.${CONFIG.bodyClass} .${CONFIG.toggleButtonClass} {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        margin-right: 8px;
        border: none;
        border-radius: 10px;
        background: var(--hover-bg, #efefef);
        color: var(--text-subtle, #6b7280);
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
        transition: background-color 0.2s ease, color 0.2s ease;
      }

      body.${CONFIG.bodyClass} .${CONFIG.toggleButtonClass}:hover {
        background: var(--line-light, #e5e7eb);
        color: var(--text-regular, #111827);
      }

      body.${CONFIG.bodyClass} .sidebar.${CONFIG.sidebarCollapsedClass} .${CONFIG.toggleHostClass} {
        justify-content: center;
        padding-left: 0;
        padding-right: 0;
      }

      body.${CONFIG.bodyClass} .sidebar.${CONFIG.sidebarCollapsedClass} .${CONFIG.toggleButtonClass} {
        margin-right: 0;
      }
    `;

    document.head.appendChild(style);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function findMemoList() {
    return document.querySelector('div.container > .memos') || document.querySelector('.container .memos');
  }

  function isGalleryGrid(listElement) {
    return Boolean(listElement && listElement.classList.contains('gallery-grid'));
  }

  function findSidebar() {
    return document.querySelector('.sidebar');
  }

  function findResizer(sidebar) {
    if (!sidebar) {
      return null;
    }

    const candidate = sidebar.nextElementSibling;
    if (!candidate) {
      return null;
    }

    const style = window.getComputedStyle(candidate);
    const width = parseFloat(style.width || '0');
    if (style.cursor === 'col-resize' || width <= 12) {
      return candidate;
    }

    return null;
  }

  function findMainPane(listElement, sidebar, resizer) {
    if (!listElement) {
      return null;
    }

    if (resizer && resizer.nextElementSibling && resizer.nextElementSibling.contains(listElement)) {
      return resizer.nextElementSibling;
    }

    if (sidebar && sidebar.parentElement) {
      const siblings = Array.from(sidebar.parentElement.children);
      const match = siblings.find(element => {
        return element !== sidebar && element !== resizer && element.contains(listElement);
      });
      if (match) {
        return match;
      }
    }

    return listElement.closest('.main-container') || listElement.parentElement;
  }

  function findContentRoot(listElement) {
    if (!listElement) {
      return null;
    }

    const container = listElement.closest('.container');
    if (!container) {
      return null;
    }

    return container.parentElement || container;
  }

  function prepareLayoutShell(listElement, sidebar, resizer, mainPane, contentRoot) {
    document.body.classList.add(CONFIG.bodyClass);

    if (listElement) {
      listElement.classList.add(CONFIG.layoutClass);
    }

    if (resizer) {
      resizer.classList.add('fwf-sidebar-resizer');
    }

    if (mainPane) {
      mainPane.classList.add(CONFIG.mainPaneClass);
    }

    if (contentRoot) {
      contentRoot.classList.add(CONFIG.contentRootClass);
    }

    if (sidebar) {
      sidebar.classList.toggle(CONFIG.sidebarCollapsedClass, state.sidebarCollapsed);
    }

    document.body.classList.toggle(CONFIG.sidebarCollapsedClass, state.sidebarCollapsed);
  }

  function computeContentMetrics(listElement) {
    const style = window.getComputedStyle(listElement);
    const container = listElement.closest('.container');
    const widthCandidates = [
      listElement.clientWidth,
      container ? container.clientWidth : 0,
      state.contentRootElement ? state.contentRootElement.clientWidth : 0,
      state.mainPaneElement ? state.mainPaneElement.clientWidth : 0,
    ].filter(value => value > 0);

    const paddingLeft = parseFloat(style.paddingLeft || '0');
    const paddingRight = parseFloat(style.paddingRight || '0');
    const paddingTop = parseFloat(style.paddingTop || '0');
    const paddingBottom = parseFloat(style.paddingBottom || '0');
    const baseWidth = widthCandidates.length ? Math.max(...widthCandidates) : listElement.clientWidth;
    const availableWidth = Math.max(0, baseWidth - paddingLeft - paddingRight);

    return {
      paddingLeft,
      paddingRight,
      paddingTop,
      paddingBottom,
      availableWidth,
    };
  }

  function computeActualColumnCount(availableWidth) {
    const possible = Math.max(
      CONFIG.minColumns,
      Math.floor((availableWidth + CONFIG.gap) / (CONFIG.minCardWidth + CONFIG.gap)),
    );

    return clamp(Math.min(state.maxColumns, possible), CONFIG.minColumns, CONFIG.maxColumns);
  }

  function getCardNodes(listElement) {
    return Array.from(listElement.children).filter(element => {
      return element instanceof HTMLElement && !element.matches(CONFIG.footerSelector);
    });
  }

  function getFooterNodes(listElement) {
    return Array.from(listElement.children).filter(element => {
      return element instanceof HTMLElement && element.matches(CONFIG.footerSelector);
    });
  }

  function applyNodePosition(element, x, y, width) {
    element.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    element.style.width = `${width}px`;
  }

  function clearNodePosition(element) {
    element.style.removeProperty('transform');
    element.style.removeProperty('width');
  }

  function measureNodeHeight(element) {
    return element.getBoundingClientRect().height;
  }

  function disconnectCardObservers() {
    state.cardResizeObservers.forEach(observer => observer.disconnect());
    state.cardResizeObservers.clear();
  }

  function reconcileCardObservers(cardNodes) {
    const nextNodes = new Set(cardNodes);

    state.cardResizeObservers.forEach((observer, element) => {
      if (!nextNodes.has(element)) {
        observer.disconnect();
        state.cardResizeObservers.delete(element);
      }
    });

    cardNodes.forEach(element => {
      if (state.cardResizeObservers.has(element)) {
        return;
      }

      const observer = new ResizeObserver(() => {
        scheduleLayout();
      });

      observer.observe(element);
      state.cardResizeObservers.set(element, observer);
    });
  }

  function teardownMasonry() {
    const listElement = state.listElement;
    if (!listElement) {
      return;
    }

    listElement.classList.remove(CONFIG.layoutClass);
    listElement.style.removeProperty('--fwf-card-width');
    listElement.style.removeProperty('--fwf-footer-width');
    listElement.style.removeProperty('--fwf-content-height');

    Array.from(listElement.children).forEach(child => {
      if (child instanceof HTMLElement) {
        clearNodePosition(child);
      }
    });

    disconnectCardObservers();
  }

  function layoutMemoList() {
    state.layoutFrame = 0;

    const listElement = findMemoList();
    const sidebar = findSidebar();
    const resizer = findResizer(sidebar);
    const mainPane = findMainPane(listElement, sidebar, resizer);
    const contentRoot = findContentRoot(listElement);

    state.listElement = listElement;
    state.sidebarElement = sidebar;
    state.resizerElement = resizer;
    state.mainPaneElement = mainPane;
    state.contentRootElement = contentRoot;

    if (!listElement || !sidebar) {
      return;
    }

    prepareLayoutShell(listElement, sidebar, resizer, mainPane, contentRoot);
    ensureSidebarToggle();
    syncSidebarState();
    observeResizeTargets();

    if (isGalleryGrid(listElement)) {
      teardownMasonry();
      return;
    }

    const metrics = computeContentMetrics(listElement);
    const columnCount = computeActualColumnCount(metrics.availableWidth);
    const cardWidth = columnCount > 0
      ? (metrics.availableWidth - CONFIG.gap * (columnCount - 1)) / columnCount
      : metrics.availableWidth;

    const cardNodes = getCardNodes(listElement);
    const footerNodes = getFooterNodes(listElement);
    const columnHeights = Array.from({ length: columnCount }, () => metrics.paddingTop);

    listElement.style.setProperty('--fwf-card-width', `${Math.max(cardWidth, 0)}px`);
    listElement.style.setProperty('--fwf-footer-width', `${Math.max(metrics.availableWidth, 0)}px`);

    cardNodes.forEach((element, index) => {
      const column = index % columnCount;
      const x = metrics.paddingLeft + column * (cardWidth + CONFIG.gap);
      const y = columnHeights[column];

      applyNodePosition(element, x, y, cardWidth);
      columnHeights[column] = y + measureNodeHeight(element) + CONFIG.gap;
    });

    let contentHeight = columnHeights.length ? Math.max(...columnHeights) : metrics.paddingTop;
    if (cardNodes.length) {
      contentHeight -= CONFIG.gap;
    }

    footerNodes.forEach(element => {
      const footerY = contentHeight + CONFIG.gap;
      applyNodePosition(element, metrics.paddingLeft, footerY, metrics.availableWidth);
      contentHeight = footerY + measureNodeHeight(element);
    });

    listElement.style.setProperty(
      '--fwf-content-height',
      `${Math.ceil(Math.max(0, contentHeight + metrics.paddingBottom))}px`,
    );

    reconcileCardObservers(cardNodes);
    observeListMutations(listElement);
  }

  function scheduleLayout() {
    if (state.layoutFrame) {
      return;
    }

    state.layoutFrame = window.requestAnimationFrame(() => {
      layoutMemoList();
    });
  }

  function observeListMutations(listElement) {
    if (state.listObserver) {
      state.listObserver.disconnect();
      state.listObserver = null;
    }

    if (!listElement) {
      return;
    }

    state.listObserver = new MutationObserver(() => {
      scheduleLayout();
    });

    state.listObserver.observe(listElement, {
      childList: true,
      subtree: true,
    });
  }

  function observeResizeTargets() {
    if (state.resizeObserver) {
      state.resizeObserver.disconnect();
      state.resizeObserver = null;
    }

    const targets = [
      state.listElement,
      state.sidebarElement,
      state.mainPaneElement,
      state.contentRootElement,
    ].filter(Boolean);

    if (!targets.length) {
      return;
    }

    state.resizeObserver = new ResizeObserver(() => {
      scheduleLayout();
    });

    targets.forEach(element => {
      state.resizeObserver.observe(element);
    });
  }

  function ensureSidebarToggle() {
    const sidebar = state.sidebarElement;
    if (!sidebar) {
      return;
    }

    if (!state.toggleHost || !state.toggleHost.isConnected) {
      const host = document.createElement('div');
      host.className = CONFIG.toggleHostClass;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = CONFIG.toggleButtonClass;
      button.addEventListener('click', () => {
        state.sidebarCollapsed = !state.sidebarCollapsed;
        syncSidebarState();
        scheduleLayout();
      });

      host.appendChild(button);
      sidebar.prepend(host);

      state.toggleHost = host;
      state.toggleButton = button;
    } else if (state.toggleHost.parentElement !== sidebar) {
      sidebar.prepend(state.toggleHost);
    }

    updateToggleButton();
  }

  function updateToggleButton() {
    if (!state.toggleButton) {
      return;
    }

    const isCollapsed = state.sidebarCollapsed;
    state.toggleButton.textContent = isCollapsed ? '→' : '←';
    state.toggleButton.setAttribute('aria-label', isCollapsed ? TEXT.expand : TEXT.collapse);
    state.toggleButton.setAttribute('title', isCollapsed ? TEXT.expand : TEXT.collapse);
  }

  function syncSidebarState() {
    if (!state.sidebarElement) {
      return;
    }

    state.sidebarElement.classList.toggle(CONFIG.sidebarCollapsedClass, state.sidebarCollapsed);
    document.body.classList.toggle(CONFIG.sidebarCollapsedClass, state.sidebarCollapsed);
    updateToggleButton();
  }

  function refreshMenuCommands() {
    if (typeof GM_registerMenuCommand !== 'function') {
      return;
    }

    if (typeof GM_unregisterMenuCommand === 'function') {
      state.menuCommandIds.forEach(id => {
        try {
          GM_unregisterMenuCommand(id);
        } catch (error) {
          console.warn('[flomo-waterfall] Failed to unregister menu command:', error);
        }
      });
    }

    state.menuCommandIds = [];

    const changeColumns = delta => {
      const next = clamp(state.maxColumns + delta, CONFIG.minColumns, CONFIG.maxColumns);
      if (next === state.maxColumns) {
        return;
      }

      state.maxColumns = next;
      refreshMenuCommands();
      scheduleLayout();
    };

    state.menuCommandIds.push(
      GM_registerMenuCommand(TEXT.menuDecrease(state.maxColumns), () => changeColumns(-1)),
      GM_registerMenuCommand(TEXT.menuIncrease(state.maxColumns), () => changeColumns(1)),
    );
  }

  function scheduleInit() {
    if (state.initFrame) {
      return;
    }

    state.initFrame = window.requestAnimationFrame(() => {
      state.initFrame = 0;
      initialize();
    });
  }

  function initializeObservers() {
    if (state.bodyObserver || !document.body) {
      return;
    }

    state.bodyObserver = new MutationObserver(() => {
      scheduleInit();
    });

    state.bodyObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function initialize() {
    initializeObservers();

    state.listElement = findMemoList();
    state.sidebarElement = findSidebar();

    if (!state.listElement || !state.sidebarElement) {
      return;
    }

    injectStyles();

    if (!state.menuCommandIds.length) {
      refreshMenuCommands();
    }

    scheduleLayout();
  }

  window.addEventListener('resize', () => {
    scheduleLayout();
  }, { passive: true });

  initialize();
})();
