import { invoke } from './vendor/@tauri-apps/api/core.js';
import { PhysicalPosition, PhysicalSize } from './vendor/@tauri-apps/api/dpi.js';
import { currentMonitor, getCurrentWindow } from './vendor/@tauri-apps/api/window.js';

const appWindow = getCurrentWindow();
const updatedAt = document.getElementById('updated-at');
const dailyBars = document.getElementById('daily-bars');
const weeklyPath = document.getElementById('weekly-path');
const weeklyShadow = document.getElementById('weekly-shadow');
const refreshBtn = document.getElementById('refresh-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const statusBanner = document.getElementById('status-banner');
const statusBadge = document.getElementById('status-badge');
const statusDetail = document.getElementById('status-detail');
const privacyToggle = document.getElementById('privacy-toggle');
const themeToggle = document.getElementById('theme-toggle');
const themeToggleRow = document.querySelector('.toggle-row');
const snapToggle = document.getElementById('snap-toggle');
const autostartToggle = document.getElementById('autostart-toggle');
const languageButtons = document.querySelectorAll('[data-language]');
const logDirInput = document.getElementById('log-dir-input');
const refreshIntervalSelect = document.getElementById('refresh-interval-select');
const summaryModeSelect = document.getElementById('summary-mode-select');
const relayEnabledToggle = document.getElementById('relay-enabled-toggle');
const relayRouteStatus = document.getElementById('relay-route-status');
const relayProviderIdInput = document.getElementById('relay-provider-id-input');
const relayBaseUrlInput = document.getElementById('relay-base-url-input');
const relayApiKeyInput = document.getElementById('relay-api-key-input');
const relayKeyVisibility = document.getElementById('relay-key-visibility');
const relayTestModelInput = document.getElementById('relay-test-model-input');
const relayStatusRoute = document.getElementById('relay-status-route');
const relayStatusConfig = document.getElementById('relay-status-config');
const relayStatusCodex = document.getElementById('relay-status-codex');
const relayLastApply = document.getElementById('relay-last-apply');
const relayActionStatus = document.getElementById('relay-action-status');
const relayApplyBtn = document.getElementById('relay-apply-btn');
const relayRestartBtn = document.getElementById('relay-restart-btn');
const relayClearBtn = document.getElementById('relay-clear-btn');
const quitBtn = document.getElementById('quit-btn');
const detailsToggle = document.getElementById('details-toggle');
const detailsToggleIcon = document.getElementById('details-toggle-icon');
const tokenBreakdown = document.getElementById('token-breakdown');

const primaryPercent = document.getElementById('primary-percent');
const secondaryPercent = document.getElementById('secondary-percent');
const primaryMeta = document.getElementById('primary-meta');
const secondaryMeta = document.getElementById('secondary-meta');
const primaryMeterFill = document.getElementById('primary-meter-fill');
const secondaryMeterFill = document.getElementById('secondary-meter-fill');
const primaryRemaining = document.getElementById('primary-remaining');
const secondaryRemaining = document.getElementById('secondary-remaining');
const primaryReset = document.getElementById('primary-reset');
const secondaryReset = document.getElementById('secondary-reset');
const totalTokens = document.getElementById('total-tokens');
const lastTokens = document.getElementById('last-tokens');
const summaryTokensLabel = document.getElementById('summary-tokens-label');
const syncTime = document.getElementById('sync-time');
const contextWindow = document.getElementById('context-window');
const scannedFiles = document.getElementById('scanned-files');
const totalInput = document.getElementById('total-input');
const totalOutput = document.getElementById('total-output');
const totalCached = document.getElementById('total-cached');
const totalReasoning = document.getElementById('total-reasoning');
const lastInput = document.getElementById('last-input');
const lastOutput = document.getElementById('last-output');
const lastCached = document.getElementById('last-cached');
const lastReasoning = document.getElementById('last-reasoning');
const totalWindowLabel = document.getElementById('total-window-label');
const lastWindowLabel = document.getElementById('last-window-label');
const sourceText = document.getElementById('source-text');
const planText = document.getElementById('plan-text');

const SNAP_STORAGE_KEY = 'codexviewer:snap-enabled';
const THEME_STORAGE_KEY = 'codexviewer:dark-mode';
const DETAILS_STORAGE_KEY = 'codexviewer:details-open';
const LOG_DIR_STORAGE_KEY = 'codexviewer:log-dir';
const REFRESH_INTERVAL_STORAGE_KEY = 'codexviewer:refresh-interval';
const SUMMARY_MODE_STORAGE_KEY = 'codexviewer:summary-mode';
const PRIVACY_MODE_STORAGE_KEY = 'codexviewer:privacy-mode';
const LANGUAGE_STORAGE_KEY = 'codexviewer:language';
const RELAY_LAST_APPLY_STORAGE_KEY = 'codexviewer:relay-last-apply';
const SNAP_THRESHOLD = 24;
const COLLAPSED_HEIGHT = 496;
const EXPANDED_HEIGHT = 650;

let isSnapping = false;
let currentWindowHeight = COLLAPSED_HEIGHT;
let refreshTimer = null;
let sourcePathRaw = 'Local Codex session logs';
let currentRelayStatus = null;
let currentLanguage = 'en';

const I18N = {
  en: {
    waiting: 'Waiting',
    refresh: 'Refresh',
    settings: 'Settings',
    togglePrivacy: 'Toggle privacy mode',
    showFullPath: 'Show full path',
    hideFullPath: 'Hide full path',
    localLogs: 'Local Codex session logs',
    hiddenPath: 'Hidden path',
    languageTitle: 'Language',
    languageHint: 'Switch interface language.',
    autostartTitle: 'Autostart',
    autostartHint: 'Launch the widget after sign-in.',
    snapTitle: 'Snap to edges',
    snapHint: 'Snap when the widget is close to a screen edge.',
    logDirLabel: 'Codex session log directory',
    refreshLabel: 'Auto refresh',
    refresh15: '15 seconds',
    refresh30: '30 seconds',
    refresh45: '45 seconds',
    refresh60: '60 seconds',
    refreshManual: 'Manual only',
    summaryModeLabel: 'Main token card',
    summarySession: 'Current session',
    summaryLast: 'Last response',
    relayTitle: 'Relay manager',
    officialEndpoint: 'Official endpoint',
    relayNotConfigured: 'Relay not configured',
    relayActive: 'Relay active',
    providerIdLabel: 'Provider ID',
    baseUrlLabel: 'API Base URL',
    apiKeyLabel: 'API Key',
    show: 'Show',
    hide: 'Hide',
    testModelLabel: 'Test model',
    route: 'Route',
    config: 'Config',
    codex: 'Codex',
    lastApply: 'Last apply',
    save: 'Save',
    applyToCodex: 'Apply to Codex',
    applyRestart: 'Apply & Restart Codex',
    restoreOfficial: 'Restore official',
    ready: 'Ready',
    settingsNote: 'Source is local Codex session logs. This is not the OpenAI API Usage endpoint and not a remote ChatGPT Plus dashboard.',
    sourcePrefix: 'Source',
    planPrefix: 'Plan',
    trend24: '24 Hour Trend',
    trend7: '7 Day Trend',
    fiveHourWindow: '5 Hour Window',
    weeklyWindow: 'Weekly Window',
    currentSessionTokens: 'Current session tokens',
    lastResponseTokens: 'Last response tokens',
    lastUsageEvent: 'Last usage event',
    contextWindow: 'Context window',
    scannedFiles: 'Scanned files',
    detailedTokenUsage: 'Detailed token usage',
    sessionTotals: 'Session Totals',
    currentSessionTotal: 'Current session total',
    mostRecentResponse: 'Most recent response',
    lastResponse: 'Last Response',
    input: 'Input',
    output: 'Output',
    cached: 'Cached',
    reasoning: 'Reasoning',
    remaining: 'Remaining',
    used: 'Used',
    resets: 'resets',
    inThisWindow: 'in this',
    thisWeek: 'this week',
    total: 'Total',
    dayNight: 'Day/Night',
    quit: 'Quit',
    connected: 'Connected',
    reading: 'Reading',
    readFailed: 'Read failed',
    scanningLogs: 'Scanning ~/.codex/sessions',
    readingLogs: 'Reading local usage logs...',
    justNow: 'just now',
    minutesAgo: (value) => `${value}m ago`,
    hoursAgo: (value) => `${value}h ago`,
    daysAgo: (value) => `${value}d ago`,
    lastRefresh: (refresh, event) => `Last refresh ${refresh} | event ${event}`,
    eventsFromFiles: (events, files) => `${events} events from ${files} files`,
    tokensFromEvents: (route, events, files) => `${route} tokens | ${events} events from ${files} files`,
    tokenLogs: (route, source) => `${route} token logs | ${source}`,
    relayTokenLogs: (route, baseUrl, source) => `${route} token logs via ${baseUrl} | ${source}`,
    sessionTokens: (route) => `${route} session tokens`,
    responseTokens: (route) => `${route} response tokens`,
    remainingWindow: (remaining, hours) => `Remaining ${remaining}% in this ${hours}h window`,
    remainingWeek: (remaining) => `Remaining ${remaining}% this week`,
    saving: 'Saving...',
    relaySaved: 'Relay settings saved.',
    applyingRelay: 'Applying relay config...',
    applyingRestart: 'Applying and restarting Codex...',
    restoringOfficial: 'Restoring official endpoint...',
    configured: 'Configured',
    notApplied: 'Not applied',
    running: 'Running',
    notRunning: 'Not running',
    relayDisabledError: 'Relay is disabled.',
    emptyBaseUrlError: 'API Base URL cannot be empty.',
    invalidBaseUrlError: 'API Base URL must start with http:// or https://.',
    emptyApiKeyError: 'API Key cannot be empty.',
    invalidProviderIdError: 'Provider ID can only contain letters, numbers, underscore and hyphen.',
    relayConfiguredFallback: 'configured relay',
    official: 'Official',
    relay: 'Relay'
  },
  zh: {
    waiting: '等待',
    refresh: '刷新',
    settings: '设置',
    togglePrivacy: '切换隐私模式',
    showFullPath: '显示完整路径',
    hideFullPath: '隐藏完整路径',
    localLogs: '本地 Codex 会话日志',
    hiddenPath: '路径已隐藏',
    languageTitle: '语言',
    languageHint: '切换界面语言。',
    autostartTitle: '开机启动',
    autostartHint: '登录系统后自动启动小组件。',
    snapTitle: '贴边吸附',
    snapHint: '窗口靠近屏幕边缘时自动吸附。',
    logDirLabel: 'Codex 会话日志目录',
    refreshLabel: '自动刷新',
    refresh15: '15 秒',
    refresh30: '30 秒',
    refresh45: '45 秒',
    refresh60: '60 秒',
    refreshManual: '仅手动',
    summaryModeLabel: '主 token 卡片',
    summarySession: '当前会话',
    summaryLast: '最近回复',
    relayTitle: '中转站管理',
    officialEndpoint: '官方端点',
    relayNotConfigured: '中转站未配置',
    relayActive: '中转站已启用',
    providerIdLabel: 'Provider ID',
    baseUrlLabel: 'API Base URL',
    apiKeyLabel: 'API Key',
    show: '显示',
    hide: '隐藏',
    testModelLabel: '测试模型',
    route: '路由',
    config: '配置',
    codex: 'Codex',
    lastApply: '最后应用',
    save: '保存',
    applyToCodex: '应用到 Codex',
    applyRestart: '应用并重启 Codex',
    restoreOfficial: '恢复官方端点',
    ready: '就绪',
    settingsNote: '来源是本地 Codex 会话日志，不是 OpenAI API Usage 接口，也不是远程 ChatGPT Plus 仪表盘。',
    sourcePrefix: '来源',
    planPrefix: '套餐',
    trend24: '24 小时趋势',
    trend7: '7 天趋势',
    fiveHourWindow: '5 小时窗口',
    weeklyWindow: '每周窗口',
    currentSessionTokens: '当前会话 token',
    lastResponseTokens: '最近回复 token',
    lastUsageEvent: '最近使用事件',
    contextWindow: '上下文窗口',
    scannedFiles: '扫描文件',
    detailedTokenUsage: '详细 token 用量',
    sessionTotals: '会话总计',
    currentSessionTotal: '当前会话总计',
    mostRecentResponse: '最近一次回复',
    lastResponse: '最近回复',
    input: '输入',
    output: '输出',
    cached: '缓存',
    reasoning: '推理',
    remaining: '剩余',
    used: '已用',
    resets: '重置',
    inThisWindow: '在当前',
    thisWeek: '本周',
    total: '总计',
    dayNight: '日间/夜间',
    quit: '退出',
    connected: '已连接',
    reading: '读取中',
    readFailed: '读取失败',
    scanningLogs: '扫描 ~/.codex/sessions',
    readingLogs: '正在读取本地用量日志...',
    justNow: '刚刚',
    minutesAgo: (value) => `${value} 分钟前`,
    hoursAgo: (value) => `${value} 小时前`,
    daysAgo: (value) => `${value} 天前`,
    lastRefresh: (refresh, event) => `刷新 ${refresh} | 事件 ${event}`,
    eventsFromFiles: (events, files) => `${events} 个事件，来自 ${files} 个文件`,
    tokensFromEvents: (route, events, files) => `${route} token | ${events} 个事件，来自 ${files} 个文件`,
    tokenLogs: (route, source) => `${route} token 日志 | ${source}`,
    relayTokenLogs: (route, baseUrl, source) => `${route} token 日志，经由 ${baseUrl} | ${source}`,
    sessionTokens: (route) => `${route} 会话 token`,
    responseTokens: (route) => `${route} 回复 token`,
    remainingWindow: (remaining, hours) => `剩余 ${remaining}%，当前 ${hours} 小时窗口`,
    remainingWeek: (remaining) => `本周剩余 ${remaining}%`,
    saving: '保存中...',
    relaySaved: '中转站设置已保存。',
    applyingRelay: '正在应用中转站配置...',
    applyingRestart: '正在应用并重启 Codex...',
    restoringOfficial: '正在恢复官方端点...',
    configured: '已配置',
    notApplied: '未应用',
    running: '运行中',
    notRunning: '未运行',
    relayDisabledError: '中转站未启用。',
    emptyBaseUrlError: 'API Base URL 不能为空。',
    invalidBaseUrlError: 'API Base URL 必须以 http:// 或 https:// 开头。',
    emptyApiKeyError: 'API Key 不能为空。',
    invalidProviderIdError: 'Provider ID 只能包含英文、数字、下划线和连字符。',
    relayConfiguredFallback: '已配置中转站',
    official: '官方',
    relay: '中转站'
  }
};

function t(key, ...args) {
  const value = I18N[currentLanguage]?.[key] ?? I18N.en[key] ?? key;
  return typeof value === 'function' ? value(...args) : value;
}

function getInitialLanguage() {
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (saved === 'en' || saved === 'zh') {
    return saved;
  }
  return navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

function applyLanguage(language) {
  currentLanguage = language === 'zh' ? 'zh' : 'en';
  document.documentElement.lang = currentLanguage === 'zh' ? 'zh-CN' : 'en';
  localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });

  languageButtons.forEach((button) => {
    const isActive = button.dataset.language === currentLanguage;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  refreshBtn.setAttribute('aria-label', t('refresh'));
  settingsBtn.setAttribute('aria-label', t('settings'));
  logDirInput.placeholder = 'Default: ~/.codex/sessions';
  privacyToggle.setAttribute('aria-label', t('togglePrivacy'));
  privacyToggle.title = t('togglePrivacy');
  relayActionStatus.textContent = relayActionStatus.textContent === 'Ready' ? t('ready') : relayActionStatus.textContent;
  renderSummaryTokenLabel();
  renderSourcePath();
  syncRelayEnabledState();
  if (currentRelayStatus) {
    renderRelayStatus(currentRelayStatus);
  }
}

async function isAutostartEnabled() {
  return invoke('plugin:autostart|is_enabled');
}

async function enableAutostart() {
  return invoke('plugin:autostart|enable');
}

async function disableAutostart() {
  return invoke('plugin:autostart|disable');
}

function formatTime(date) {
  return new Intl.DateTimeFormat(currentLanguage === 'zh' ? 'zh-CN' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(date);
}

function formatReset(unixSeconds) {
  if (!unixSeconds) {
    return '--';
  }

  return new Intl.DateTimeFormat(currentLanguage === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(unixSeconds * 1000));
}

function formatNumber(value) {
  if (typeof value !== 'number') {
    return '--';
  }

  return new Intl.NumberFormat('en-US').format(value);
}

function formatCompactNumber(value) {
  if (typeof value !== 'number') {
    return '--';
  }

  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: value >= 1000000 ? 1 : 0
  }).format(value);
}

function formatPlanName(planType) {
  if (!planType) {
    return '--';
  }

  return String(planType)
    .split(/[_-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatRelativeTime(date) {
  const diffMs = Date.now() - date.getTime();

  if (!Number.isFinite(diffMs)) {
    return '--';
  }

  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));
  if (diffMinutes < 1) {
    return t('justNow');
  }

  if (diffMinutes < 60) {
    return t('minutesAgo', diffMinutes);
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return t('hoursAgo', diffHours);
  }

  const diffDays = Math.round(diffHours / 24);
  return t('daysAgo', diffDays);
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function renderBars(values) {
  dailyBars.innerHTML = '';
  const peak = Math.max(...values, 1);

  values.forEach((value, index) => {
    const bar = document.createElement('span');
    const clamped = Math.max(0, Math.min(100, Number(value) || 0));
    const normalized = peak > 0 ? clamped / peak : 0;
    const height = 6 + normalized * 22;

    bar.className = 'bar';
    bar.style.height = `${height}px`;

    if (index === values.length - 1) {
      bar.classList.add('active');
    } else if (index === values.length - 2) {
      bar.classList.add('low');
      bar.style.height = `${Math.max(height - 7, 7)}px`;
    } else if (normalized >= 0.72) {
      bar.classList.add('low');
      bar.style.opacity = '0.62';
    } else {
      bar.style.opacity = '0.92';
    }

    if (index === values.length - 1) {
      bar.classList.add('latest');
    }

    dailyBars.appendChild(bar);
  });
}

function buildWeeklyPath(values) {
  const chartWidth = 264;
  const chartHeight = 36;
  const left = 8;
  const top = 20;
  const step = chartWidth / Math.max(values.length - 1, 1);

  return values
    .map((value, index) => {
      const clamped = Math.max(0, Math.min(100, Number(value) || 0));
      const x = left + step * index;
      const y = top + (chartHeight - (clamped / 100) * chartHeight);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function applyTheme(isDark) {
  document.body.classList.toggle('dark', isDark);
  themeToggle.checked = isDark;
  localStorage.setItem(THEME_STORAGE_KEY, isDark ? '1' : '0');
}

function applySnapPreference(enabled) {
  snapToggle.checked = enabled;
  localStorage.setItem(SNAP_STORAGE_KEY, enabled ? '1' : '0');
}

function applyDetailsPreference(expanded) {
  document.querySelector('.widget')?.classList.toggle('is-expanded', expanded);
  tokenBreakdown.classList.toggle('is-collapsed', !expanded);
  detailsToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  detailsToggleIcon.textContent = expanded ? '-' : '+';
  localStorage.setItem(DETAILS_STORAGE_KEY, expanded ? '1' : '0');
}

function getConfiguredLogDir() {
  return (localStorage.getItem(LOG_DIR_STORAGE_KEY) || '').trim();
}

function getRefreshIntervalMs() {
  const raw = Number(localStorage.getItem(REFRESH_INTERVAL_STORAGE_KEY) || '45000');
  return Number.isFinite(raw) && raw >= 0 ? raw : 45000;
}

function getSummaryMode() {
  const mode = localStorage.getItem(SUMMARY_MODE_STORAGE_KEY);
  return mode === 'last' ? 'last' : 'session';
}

function applySummaryMode(mode) {
  summaryModeSelect.value = mode;
  renderSummaryTokenLabel();
  localStorage.setItem(SUMMARY_MODE_STORAGE_KEY, mode);
}

function getUsageRouteLabel() {
  return currentRelayStatus?.route === 'relay' ? t('relay') : t('official');
}

function getUsageSourceDetail(snapshot) {
  const routeLabel = getUsageRouteLabel();
  const source = snapshot?.source_label || 'Local Codex session logs';
  if (currentRelayStatus?.route === 'relay') {
    const baseUrl = currentRelayStatus.baseUrl || currentRelayStatus.base_url || t('relayConfiguredFallback');
    return t('relayTokenLogs', routeLabel, baseUrl, source);
  }
  return t('tokenLogs', routeLabel, source);
}

function renderSummaryTokenLabel() {
  const mode = getSummaryMode();
  const routeLabel = getUsageRouteLabel();
  summaryTokensLabel.textContent = mode === 'last' ? t('responseTokens', routeLabel) : t('sessionTokens', routeLabel);
}

function restartAutoRefresh() {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
    refreshTimer = null;
  }

  const intervalMs = getRefreshIntervalMs();
  if (intervalMs > 0) {
    refreshTimer = window.setInterval(() => {
      loadSnapshot();
    }, intervalMs);
  }
}

function applyRefreshInterval(intervalMs) {
  refreshIntervalSelect.value = String(intervalMs);
  localStorage.setItem(REFRESH_INTERVAL_STORAGE_KEY, String(intervalMs));
  restartAutoRefresh();
}

function applyLogDir(logDir) {
  logDirInput.value = logDir;
  localStorage.setItem(LOG_DIR_STORAGE_KEY, logDir);
}

function getRelayFormSettings() {
  return {
    enabled: relayEnabledToggle.checked,
    providerId: relayProviderIdInput.value.trim() || 'moapi',
    baseUrl: relayBaseUrlInput.value.trim(),
    apiKey: relayApiKeyInput.value.trim(),
    testModel: relayTestModelInput.value.trim() || null
  };
}

function setRelayFormSettings(settings) {
  relayEnabledToggle.checked = Boolean(settings?.enabled);
  relayProviderIdInput.value = settings?.providerId || 'moapi';
  relayBaseUrlInput.value = settings?.baseUrl || '';
  relayApiKeyInput.value = settings?.apiKey || '';
  relayTestModelInput.value = settings?.testModel || '';
  syncRelayEnabledState();
}

function syncRelayEnabledState() {
  const enabled = relayEnabledToggle.checked;
  relayProviderIdInput.disabled = !enabled;
  relayBaseUrlInput.disabled = !enabled;
  relayApiKeyInput.disabled = !enabled;
  relayTestModelInput.disabled = !enabled;
  relayRouteStatus.textContent = enabled ? relayBaseUrlInput.value.trim() || t('relayNotConfigured') : t('officialEndpoint');
}

function setRelayBusy(isBusy) {
  [relayApplyBtn, relayRestartBtn, relayClearBtn].forEach((button) => {
    button.disabled = isBusy;
  });
}

function setRelayActionStatus(message, isError = false) {
  relayActionStatus.textContent = message;
  relayActionStatus.classList.toggle('is-error', isError);
}

function renderRelayStatus(status) {
  currentRelayStatus = status || null;
  relayStatusRoute.textContent = status?.route === 'relay' ? t('relay') : t('official');
  relayStatusConfig.textContent = status?.configured ? t('configured') : t('notApplied');
  relayStatusConfig.title = status?.configPath || '';
  relayStatusCodex.textContent = status?.codexRunning ? t('running') : t('notRunning');
  relayRouteStatus.textContent =
    status?.route === 'relay' ? status?.baseUrl || t('relayActive') : t('officialEndpoint');
  renderSummaryTokenLabel();
}

function updateRelayLastApply() {
  const raw = localStorage.getItem(RELAY_LAST_APPLY_STORAGE_KEY);
  relayLastApply.textContent = raw ? new Date(Number(raw)).toLocaleString('zh-CN') : '--';
}

function validateRelayForm(settings) {
  if (!settings.enabled) {
    throw new Error(t('relayDisabledError'));
  }
  if (!/^[A-Za-z0-9_-]+$/.test(settings.providerId)) {
    throw new Error(t('invalidProviderIdError'));
  }
  if (!settings.baseUrl) {
    throw new Error(t('emptyBaseUrlError'));
  }
  if (!/^https?:\/\//i.test(settings.baseUrl)) {
    throw new Error(t('invalidBaseUrlError'));
  }
  if (!settings.apiKey) {
    throw new Error(t('emptyApiKeyError'));
  }
}

async function refreshRelayStatus() {
  try {
    const status = await invoke('relay_status');
    renderRelayStatus(status);
  } catch (error) {
    setRelayActionStatus(String(error), true);
  }
}

async function loadRelaySettings() {
  try {
    const settings = await invoke('load_relay_settings');
    setRelayFormSettings(settings);
    await refreshRelayStatus();
    updateRelayLastApply();
  } catch (error) {
    setRelayActionStatus(String(error), true);
  }
}

async function saveRelaySettings() {
  const settings = getRelayFormSettings();
  setRelayBusy(true);
  setRelayActionStatus(t('saving'));
  try {
    const saved = await invoke('save_relay_settings', { settings });
    setRelayFormSettings(saved);
    setRelayActionStatus(t('relaySaved'));
    await refreshRelayStatus();
  } catch (error) {
    setRelayActionStatus(String(error), true);
  } finally {
    setRelayBusy(false);
  }
}

async function applyRelayConfig() {
  const settings = getRelayFormSettings();
  setRelayBusy(true);
  setRelayActionStatus(t('applyingRelay'));
  try {
    validateRelayForm(settings);
    const saved = await invoke('save_relay_settings', { settings });
    setRelayFormSettings(saved);
    const result = await invoke('apply_relay_config', { settings: saved });
    localStorage.setItem(RELAY_LAST_APPLY_STORAGE_KEY, String(Date.now()));
    updateRelayLastApply();
    setRelayActionStatus(result.message || 'Relay configuration applied.');
    await refreshRelayStatus();
  } catch (error) {
    setRelayActionStatus(String(error), true);
  } finally {
    setRelayBusy(false);
  }
}

async function applyRelayConfigAndRestart() {
  const settings = getRelayFormSettings();
  setRelayBusy(true);
  setRelayActionStatus(t('applyingRestart'));
  try {
    validateRelayForm(settings);
    const result = await invoke('apply_relay_config_and_restart', { settings });
    localStorage.setItem(RELAY_LAST_APPLY_STORAGE_KEY, String(Date.now()));
    updateRelayLastApply();
    setRelayActionStatus(`${result.apply.message} ${result.restart.message}`);
    await loadRelaySettings();
  } catch (error) {
    setRelayActionStatus(String(error), true);
  } finally {
    setRelayBusy(false);
  }
}

async function clearRelayConfig() {
  setRelayBusy(true);
  setRelayActionStatus(t('restoringOfficial'));
  try {
    const result = await invoke('clear_relay_config');
    setRelayActionStatus(result.message || 'Official endpoint restored.');
    await refreshRelayStatus();
  } catch (error) {
    setRelayActionStatus(String(error), true);
  } finally {
    setRelayBusy(false);
  }
}

function isPrivacyModeEnabled() {
  return localStorage.getItem(PRIVACY_MODE_STORAGE_KEY) !== '0';
}

function maskPath(path) {
  if (!path) {
    return t('localLogs');
  }

  const segments = String(path).split(/[\\/]+/).filter(Boolean);
  if (segments.length <= 2) {
    return t('hiddenPath');
  }

  const lastSegment = segments[segments.length - 1];
  const rootMatch = String(path).match(/^[A-Za-z]:\\/);
  const prefix = rootMatch ? rootMatch[0] : '';
  return `${prefix}...\\${lastSegment}`;
}

function renderSourcePath() {
  const privacyEnabled = isPrivacyModeEnabled();
  const visibleText = privacyEnabled ? maskPath(sourcePathRaw) : sourcePathRaw;

  statusDetail.textContent = visibleText;
  statusDetail.title = privacyEnabled ? 'Privacy mode is on' : sourcePathRaw;
  privacyToggle.classList.toggle('is-private', privacyEnabled);
  privacyToggle.setAttribute('aria-label', privacyEnabled ? t('showFullPath') : t('hideFullPath'));
  privacyToggle.title = privacyEnabled ? t('showFullPath') : t('hideFullPath');
}

function applyPrivacyMode(enabled) {
  localStorage.setItem(PRIVACY_MODE_STORAGE_KEY, enabled ? '1' : '0');
  renderSourcePath();
}

function setStatus(mode, label, detail) {
  statusBanner.classList.toggle('is-loading', mode === 'loading');
  statusBanner.classList.toggle('is-error', mode === 'error');
  statusBadge.textContent = label;
  sourcePathRaw = detail || t('localLogs');
  renderSourcePath();
}

function resetSnapshotView() {
  primaryPercent.textContent = '--';
  secondaryPercent.textContent = '--';
  primaryMeta.textContent = `${t('resets')} --`;
  secondaryMeta.textContent = `${t('resets')} --`;
  primaryMeterFill.style.width = '0%';
  secondaryMeterFill.style.width = '0%';
  primaryRemaining.textContent = `${t('remaining')} --`;
  secondaryRemaining.textContent = `${t('remaining')} --`;
  totalTokens.textContent = '--';
  lastTokens.textContent = '--';
  contextWindow.textContent = '--';
  scannedFiles.textContent = '--';
  totalInput.textContent = '--';
  totalOutput.textContent = '--';
  totalCached.textContent = '--';
  totalReasoning.textContent = '--';
  lastInput.textContent = '--';
  lastOutput.textContent = '--';
  lastCached.textContent = '--';
  lastReasoning.textContent = '--';
  totalWindowLabel.textContent = t('currentSessionTotal');
  lastWindowLabel.textContent = t('mostRecentResponse');
  syncTime.textContent = '--';
  dailyBars.innerHTML = '';
  weeklyPath.setAttribute('d', '');
  weeklyShadow.setAttribute('d', '');
}

async function syncWindowHeight(expanded) {
  const nextHeight = expanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;
  if (currentWindowHeight === nextHeight) {
    return;
  }

  const position = await appWindow.outerPosition();
  const size = await appWindow.outerSize();
  const deltaHeight = nextHeight - size.height;
  const nextY = Math.max(position.y - deltaHeight, 0);

  await appWindow.setSize(new PhysicalSize(size.width, nextHeight));
  await appWindow.setPosition(new PhysicalPosition(position.x, nextY));
  currentWindowHeight = nextHeight;
}

async function syncAutostartState() {
  try {
    autostartToggle.checked = await isAutostartEnabled();
  } catch (error) {
    autostartToggle.disabled = true;
    sourceText.textContent = `${t('sourcePrefix')}: ${t('localLogs')} | autostart unavailable`;
    console.error(error);
  }
}

async function maybeSnapToEdges() {
  if (!snapToggle.checked || isSnapping) {
    return;
  }

  const monitor = await currentMonitor();
  if (!monitor) {
    return;
  }

  const position = await appWindow.outerPosition();
  const size = await appWindow.outerSize();
  const monitorLeft = monitor.position.x;
  const monitorTop = monitor.position.y;
  const monitorRight = monitor.position.x + monitor.size.width;
  const monitorBottom = monitor.position.y + monitor.size.height;

  let nextX = position.x;
  let nextY = position.y;

  if (Math.abs(position.x - monitorLeft) <= SNAP_THRESHOLD) {
    nextX = monitorLeft;
  } else if (Math.abs(monitorRight - (position.x + size.width)) <= SNAP_THRESHOLD) {
    nextX = monitorRight - size.width;
  }

  if (Math.abs(position.y - monitorTop) <= SNAP_THRESHOLD) {
    nextY = monitorTop;
  } else if (Math.abs(monitorBottom - (position.y + size.height)) <= SNAP_THRESHOLD) {
    nextY = monitorBottom - size.height;
  }

  if (nextX === position.x && nextY === position.y) {
    return;
  }

  isSnapping = true;

  try {
    await appWindow.setPosition(new PhysicalPosition(nextX, nextY));
  } finally {
    window.setTimeout(() => {
      isSnapping = false;
    }, 120);
  }
}

function renderSnapshot(snapshot) {
  const latestAt = new Date(snapshot.last_event_at * 1000);
  const weeklyD = buildWeeklyPath(snapshot.weekly_secondary_percents || []);
  const totalUsage = snapshot.total_usage || null;
  const lastUsage = snapshot.last_usage || null;
  const totalTokenValue = totalUsage?.total_tokens ?? lastUsage?.total_tokens;
  const lastTokenValue = lastUsage?.total_tokens;
  const summaryMode = getSummaryMode();
  const mainTokenValue = summaryMode === 'last' ? lastTokenValue : totalTokenValue;
  const primaryUsed = clampPercent(snapshot.primary.used_percent);
  const secondaryUsed = clampPercent(snapshot.secondary.used_percent);
  const primaryRemainingPercent = Math.max(0, 100 - primaryUsed);
  const secondaryRemainingPercent = Math.max(0, 100 - secondaryUsed);
  const refreshLabel = formatTime(new Date());
  const eventLabel = formatRelativeTime(latestAt);

  updatedAt.textContent = t('lastRefresh', refreshLabel, eventLabel);
  const routeLabel = getUsageRouteLabel();
  const sourceDetail = getUsageSourceDetail(snapshot);
  planText.textContent = `${routeLabel} | ${t('planPrefix')} ${formatPlanName(snapshot.plan_type)}`;
  sourceText.textContent = t('tokensFromEvents', routeLabel, snapshot.event_count, snapshot.scanned_files);
  setStatus('ready', routeLabel, sourceDetail);

  primaryPercent.textContent = `${primaryUsed}%`;
  secondaryPercent.textContent = `${secondaryUsed}%`;
  primaryMeta.textContent = `${t('used')} ${primaryUsed}% | ${t('resets')} ${formatReset(snapshot.primary.resets_at)}`;
  secondaryMeta.textContent = `${t('used')} ${secondaryUsed}% | ${t('resets')} ${formatReset(snapshot.secondary.resets_at)}`;
  primaryMeterFill.style.width = `${primaryUsed}%`;
  secondaryMeterFill.style.width = `${secondaryUsed}%`;
  primaryRemaining.textContent = t('remainingWindow', primaryRemainingPercent, snapshot.primary.window_minutes / 60);
  secondaryRemaining.textContent = t('remainingWeek', secondaryRemainingPercent);
  primaryReset.textContent = `5 hour window ${snapshot.primary.window_minutes / 60}h`;
  secondaryReset.textContent = formatReset(snapshot.secondary.resets_at);

  totalTokens.textContent = formatNumber(mainTokenValue);
  lastTokens.textContent = formatNumber(lastTokenValue);
  contextWindow.textContent = formatCompactNumber(snapshot.model_context_window);
  scannedFiles.textContent = formatNumber(snapshot.scanned_files);
  totalInput.textContent = formatNumber(totalUsage?.input_tokens);
  totalOutput.textContent = formatNumber(totalUsage?.output_tokens);
  totalCached.textContent = formatNumber(totalUsage?.cached_input_tokens);
  totalReasoning.textContent = formatNumber(totalUsage?.reasoning_output_tokens);
  lastInput.textContent = formatNumber(lastUsage?.input_tokens);
  lastOutput.textContent = formatNumber(lastUsage?.output_tokens);
  lastCached.textContent = formatNumber(lastUsage?.cached_input_tokens);
  lastReasoning.textContent = formatNumber(lastUsage?.reasoning_output_tokens);
  totalWindowLabel.textContent = totalUsage ? `${t('total')} ${formatNumber(totalUsage.total_tokens)}` : t('currentSessionTotal');
  lastWindowLabel.textContent = lastUsage ? `${t('total')} ${formatNumber(lastUsage.total_tokens)}` : t('mostRecentResponse');
  syncTime.textContent = `${latestAt.toLocaleString(currentLanguage === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })} (${eventLabel})`;

  renderBars(snapshot.hourly_primary_percents || []);
  weeklyPath.setAttribute('d', weeklyD);
  weeklyShadow.setAttribute('d', weeklyD);

  updatedAt.title = `${t('sourcePrefix')} ${sourceDetail}\n${t('lastUsageEvent')} ${latestAt.toLocaleString(currentLanguage === 'zh' ? 'zh-CN' : 'en-US')}`;
}

async function loadSnapshot() {
  try {
    refreshBtn.disabled = true;
    setStatus('loading', t('reading'), getConfiguredLogDir() || t('scanningLogs'));
    updatedAt.textContent = t('readingLogs');
    const sessionsDir = getConfiguredLogDir();
    const snapshot = await invoke('load_usage_snapshot', {
      sessionsDir: sessionsDir || null
    });
    await refreshRelayStatus();
    renderSnapshot(snapshot);
  } catch (error) {
    resetSnapshotView();
    updatedAt.textContent = t('readFailed');
    sourceText.textContent = `${t('readFailed')}: ${String(error)}`;
    planText.textContent = `${t('planPrefix')} --`;
    setStatus('error', t('readFailed'), String(error));
    console.error(error);
  } finally {
    refreshBtn.disabled = false;
  }
}

settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.toggle('is-hidden');
});

refreshBtn.addEventListener('click', () => {
  loadSnapshot();
});

themeToggle.addEventListener('change', (event) => {
  applyTheme(event.target.checked);
});

themeToggleRow?.addEventListener('click', (event) => {
  if (event.target === themeToggle) {
    return;
  }

  event.preventDefault();
  applyTheme(!document.body.classList.contains('dark'));
});

privacyToggle?.addEventListener('click', () => {
  applyPrivacyMode(!isPrivacyModeEnabled());
});

snapToggle.addEventListener('change', (event) => {
  applySnapPreference(event.target.checked);
});

logDirInput.addEventListener('change', () => {
  applyLogDir(logDirInput.value.trim());
  loadSnapshot();
});

refreshIntervalSelect.addEventListener('change', () => {
  applyRefreshInterval(Number(refreshIntervalSelect.value));
});

summaryModeSelect.addEventListener('change', () => {
  applySummaryMode(summaryModeSelect.value);
  loadSnapshot();
});

languageButtons.forEach((button) => {
  button.addEventListener('click', () => {
    applyLanguage(button.dataset.language);
    loadSnapshot();
  });
});

relayEnabledToggle.addEventListener('change', syncRelayEnabledState);

relayProviderIdInput.addEventListener('input', syncRelayEnabledState);

relayBaseUrlInput.addEventListener('input', syncRelayEnabledState);

relayKeyVisibility.addEventListener('click', () => {
  const isPassword = relayApiKeyInput.type === 'password';
  relayApiKeyInput.type = isPassword ? 'text' : 'password';
  relayKeyVisibility.textContent = isPassword ? t('hide') : t('show');
});

relayApplyBtn.addEventListener('click', () => {
  applyRelayConfig();
});

relayRestartBtn.addEventListener('click', () => {
  applyRelayConfigAndRestart();
});

relayClearBtn.addEventListener('click', () => {
  clearRelayConfig();
});

autostartToggle.addEventListener('change', async (event) => {
  try {
    if (event.target.checked) {
      await enableAutostart();
    } else {
      await disableAutostart();
    }
  } catch (error) {
    event.target.checked = !event.target.checked;
    console.error(error);
  }
});

detailsToggle.addEventListener('click', () => {
  const isExpanded = detailsToggle.getAttribute('aria-expanded') === 'true';
  applyDetailsPreference(!isExpanded);
  syncWindowHeight(!isExpanded).catch(console.error);
});

quitBtn.addEventListener('click', async () => {
  await invoke('quit_app');
});

await appWindow.onMoved(() => {
  window.setTimeout(() => {
    maybeSnapToEdges().catch(console.error);
  }, 60);
});

applyLanguage(getInitialLanguage());
applyTheme(localStorage.getItem(THEME_STORAGE_KEY) === '1');
applySnapPreference(localStorage.getItem(SNAP_STORAGE_KEY) !== '0');
applyLogDir(getConfiguredLogDir());
applySummaryMode(getSummaryMode());
applyRefreshInterval(getRefreshIntervalMs());
applyPrivacyMode(isPrivacyModeEnabled());
await loadRelaySettings();
const detailsExpanded = localStorage.getItem(DETAILS_STORAGE_KEY) === '1';
applyDetailsPreference(detailsExpanded);
await syncWindowHeight(detailsExpanded);
await syncAutostartState();
await loadSnapshot();
