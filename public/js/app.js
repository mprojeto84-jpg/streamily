const API_BASE = '/API/bosb843jsi/ADM';
let appConfig = null;
let textosData = null;
let loadingTimer = null;

const SMARTLINKS_FALLBACK = {
  primary: 'https://www.profitableratecpmnetwork.com/xarxixkwtf?key=8996484532df54554baba8a382d95f45',
  secondary: 'https://assistedtogether.com/xarxixkwtf?key=8996484532df54554baba8a382d95f45'
};

async function init() {
  try {
    await Promise.all([
      carregarTextos(),
      loadConfig(),
      loadStats()
    ]);
    trackView();
    checkPendingAction();
  } catch (error) {
    console.error('Erro na inicializacao:', error);
  }
}

async function carregarTextos() {
  try {
    const res = await fetch(`${API_BASE}/textos`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    textosData = data;

    const setTxt = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };
    const setSvg = (id, svg) => { const el = document.getElementById(id); if (el) el.innerHTML = svg; };

    setTxt('txt-publicidade', 'Publicidade');
    setTxt('txt-logo', data.header.logoText);
    setTxt('txt-nav-inicio', data.header.navInicio);
    setTxt('txt-nav-recursos', data.header.navRecursos);
    setTxt('txt-nav-download', data.header.navDownload);
    setTxt('txt-nav-codigo', data.header.navCodigo);
    setTxt('txt-menu-title', 'Menu');
    setTxt('txt-facebook', 'Facebook');
    setTxt('txt-whatsapp', 'WhatsApp Canal');
    setTxt('txt-contact', 'Contactos');
    setTxt('txt-hero-title', data.hero.title);
    setTxt('txt-hero-subtitle', data.hero.subtitle);
    setTxt('txt-hero-desc', data.hero.description);
    setTxt('txt-hero-btn-download', data.hero.btnDownload);
    setTxt('txt-hero-btn-code', data.hero.btnCode);
    setTxt('txt-features-title', data.features.title);
    setTxt('txt-features-loading', data.features.loading);
    setTxt('txt-gallery-title', data.gallery.title);
    setTxt('txt-download-title', data.download.title);
    setTxt('txt-download-btn', data.download.btnDownload);
    setTxt('txt-stat-views', data.download.statViews);
    setTxt('txt-stat-downloads', data.download.statDownloads);
    setTxt('txt-footer', data.footer.text);
    setTxt('txt-modal-title', data.modal.title);
    setTxt('txt-modal-subtitle', data.modal.subtitle);
    setTxt('txt-modal-btn-generate', data.modal.btnGenerate);
    setTxt('txt-modal-expiry-label', data.modal.expiryLabel);
    setTxt('txt-modal-tech', data.modal.techLabel);
    setTxt('txt-loading-msg', 'Gerando Token...');

    const svgs = data.svgs;
    setSvg('svg-close-banner', svgs.close);
    setSvg('svg-logo', svgs.logo);
    setSvg('svg-menu', svgs.menu);
    setSvg('svg-close-drawer', svgs.close);
    setSvg('svg-facebook', svgs.facebook);
    setSvg('svg-whatsapp', svgs.whatsapp);
    setSvg('svg-contact', svgs.contact);
    setSvg('svg-hero-download', svgs.download);
    setSvg('svg-hero-lock', svgs.lock);
    setSvg('svg-info-download', svgs.download);
    setSvg('svg-info-android', svgs.lock);
    setSvg('svg-download-btn', svgs.download);
    setSvg('svg-stat-views', svgs.lock);
    setSvg('svg-stat-downloads', svgs.download);
    setSvg('svg-modal-close', svgs.close);
    setSvg('svg-modal-lock', svgs.lock);
    setSvg('svg-modal-refresh', svgs.spinner);
    setSvg('svg-modal-copy', svgs.copy);
    setSvg('svg-loading-spinner', svgs.spinner);
  } catch (e) {
    console.error("Erro ao carregar textos:", e);
  }
}

function checkPendingAction() {
  const pendingAction = localStorage.getItem('pendingAction');
  const pendingTime = localStorage.getItem('pendingTime');
  if (pendingAction && pendingTime) {
    const elapsed = Date.now() - parseInt(pendingTime);
    if (elapsed < 120000) {
      localStorage.removeItem('pendingAction');
      localStorage.removeItem('pendingTime');
      setTimeout(() => { executeAction(pendingAction); }, 500);
    } else {
      localStorage.removeItem('pendingAction');
      localStorage.removeItem('pendingTime');
    }
  }
}

async function loadConfig() {
  try {
    const res = await fetch(`${API_BASE}/config`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    appConfig = await res.json();
    document.getElementById('app-version').textContent = 'Versao ' + appConfig.site.version + ' - Lancado em ' + formatDate(appConfig.site.releaseDate);
    document.getElementById('app-size').textContent = 'Tamanho: ' + (appConfig.app.size || '--');
    document.getElementById('app-android').textContent = 'Android ' + appConfig.app.minAndroid + '+';
    
    const featuresGrid = document.getElementById('features-grid');
    if (featuresGrid && appConfig.features) {
      const svgs = textosData ? textosData.svgs : {};
      featuresGrid.innerHTML = appConfig.features.map(f => `
        <div class="feature-card">
          <div class="feature-icon">${svgs[f.icon] || svgs.tv || ''}</div>
          <h3>${f.title}</h3>
          <p>${f.description}</p>
        </div>
      `).join('');
    }
    const screenshotsGrid = document.getElementById('screenshots-grid');
    if (screenshotsGrid && appConfig.screenshots) {
      screenshotsGrid.innerHTML = appConfig.screenshots.map(s => `
        <div class="screenshot-card">
          <img src="${s.src}" alt="${s.label}" draggable="false">
          <p class="screenshot-label">${s.label}</p>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Erro ao carregar config:', error);
  }
}

async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/stats-public`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const stats = await res.json();
    document.getElementById('stat-views').textContent = formatNumber(stats.views || 0);
    document.getElementById('stat-downloads').textContent = formatNumber(stats.downloads || 0);
  } catch (error) {
    console.error('Erro ao carregar stats:', error);
  }
}

async function trackView() {
  try { await fetch(`${API_BASE}/track/view`, { method: 'POST', headers: { 'Content-Type': 'application/json' } }); } catch (e) {}
}

function getRandomSmartLink() {
  const links = [SMARTLINKS_FALLBACK.primary, SMARTLINKS_FALLBACK.secondary];
  return links[Math.floor(Math.random() * links.length)];
}

async function openSmartLink(actionType) {
  try {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = 'flex';
    let seconds = 15;
    document.getElementById('txt-loading-timer').textContent = seconds + 's';
    
    const progressBar = document.getElementById('progressBarFill');
    if (progressBar) {
      progressBar.style.width = '0%';
      setTimeout(() => { progressBar.style.width = '100%'; }, 100);
    }

    clearInterval(loadingTimer);
    loadingTimer = setInterval(() => {
      seconds--;
      document.getElementById('txt-loading-timer').textContent = seconds + 's';
      if (seconds <= 0) clearInterval(loadingTimer);
    }, 1000);

    localStorage.setItem('pendingAction', actionType);
    localStorage.setItem('pendingTime', Date.now().toString());

    let smartLink = getRandomSmartLink();
    try {
      const res = await fetch(`${API_BASE}/smartlink`);
      if (res.ok) {
        const data = await res.json();
        smartLink = data.direct || data.url || smartLink;
      }
    } catch (e) {}
    window.open(smartLink, '_blank');

    setTimeout(() => {
      clearInterval(loadingTimer);
      overlay.style.display = 'none';
      const stillPending = localStorage.getItem('pendingAction');
      if (stillPending === actionType) {
        executeAction(actionType);
        localStorage.removeItem('pendingAction');
        localStorage.removeItem('pendingTime');
      }
    }, 15000);

  } catch (error) {
    console.error('Erro no SmartLink:', error);
    document.getElementById('loadingOverlay').style.display = 'none';
    executeAction(actionType);
    localStorage.removeItem('pendingAction');
    localStorage.removeItem('pendingTime');
  }
}

function executeAction(action) {
  console.log('Executando acao:', action);
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.style.display = 'none';
  
  switch(action) {
    case 'showCode': showCodeModal(); break;
    case 'download': window.location.href = '/download'; break;
    case 'generateCode': showCodeModal(); setTimeout(() => generateAndShowCode(), 300); break;
    case 'facebook': window.open('https://facebook.com', '_blank'); break;
    case 'whatsapp': window.open('https://whatsapp.com/channel/0029VbCl9BXFsn0nXdnoe332', '_blank'); break;
    case 'contact': window.open('https://wa.me/863304162', '_blank'); break;
  }
}

function handleCodeClick(e) { if (e) e.preventDefault(); openSmartLink('showCode'); }
function handleDownloadClick(e) { if (e) e.preventDefault(); openSmartLink('download'); }
function handleFacebookClick(e) { if (e) e.preventDefault(); openSmartLink('facebook'); }
function handleWhatsAppClick(e) { if (e) e.preventDefault(); openSmartLink('whatsapp'); }
function handleContactClick(e) { if (e) e.preventDefault(); openSmartLink('contact'); }
function handleGenerateCodeClick(e) { if (e) e.preventDefault(); openSmartLink('generateCode'); }

function showCodeModal() {
  const modal = document.getElementById('codeModal');
  if (modal) {
    modal.style.display = 'flex';
    document.getElementById('codeSection').style.display = 'block';
    document.getElementById('codeDisplay').style.display = 'none';
  }
}

function closeCodeDetails() {
  document.getElementById('codeModal').style.display = 'none';
}

async function generateAndShowCode() {
  try {
    const modal = document.getElementById('codeModal');
    if (modal && modal.style.display !== 'flex') showCodeModal();
    
    const res = await fetch(`${API_BASE}/generate-token`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    
    document.getElementById('codeSection').style.display = 'none';
    document.getElementById('codeDisplay').style.display = 'block';
    const token = data.token || data.currentCode || 'A7K9M2';
    document.getElementById('codeText').textContent = token;
    if (data.tokenExpiry || data.codeExpires) {
      const expiryDate = new Date(data.tokenExpiry || data.codeExpires);
      document.getElementById('codeExpiry').textContent = expiryDate.toLocaleString('pt-BR');
    } else {
      document.getElementById('codeExpiry').textContent = '24 horas';
    }
  } catch (error) {
    console.error('Erro ao gerar codigo:', error);
    document.getElementById('codeText').textContent = 'ERRO';
    document.getElementById('codeExpiry').textContent = 'Falha na geracao';
  }
}

function copyCode() {
  const code = document.getElementById('codeText').textContent;
  if (!code) return;
  
  const btn = document.getElementById('btn-copy-code');
  const original = btn.innerHTML;

  const showSuccess = () => {
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    setTimeout(() => { btn.innerHTML = original; }, 2000);
  };

  const fallbackCopy = () => {
    const textArea = document.createElement('textarea');
    textArea.value = code;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, 99999);
    let success = false;
    try {
      success = document.execCommand('copy');
    } catch (err) {
      success = false;
    }
    document.body.removeChild(textArea);
    if (success) {
      showSuccess();
    } else {
      prompt('Copie o código abaixo:', code);
    }
  };

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(code).then(showSuccess).catch(fallbackCopy);
  } else {
    fallbackCopy();
  }
}

function toggleDrawer() {
  const drawer = document.getElementById('drawer');
  if (drawer) drawer.classList.toggle('open');
}
function closeBanner() {
  const banner = document.getElementById('ad-banner');
  if (banner) banner.style.display = 'none';
}
function formatDate(dateStr) {
  try { return new Date(dateStr).toLocaleDateString('pt-BR'); } catch (e) { return dateStr; }
}
function formatNumber(num) {
  if (!num && num !== 0) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

window.onclick = function(event) {
  const modal = document.getElementById('codeModal');
  if (modal && event.target === modal) closeCodeDetails();
}

document.addEventListener('visibilitychange', function() { if (!document.hidden) checkPendingAction(); });
window.addEventListener('focus', checkPendingAction);
window.addEventListener('pageshow', checkPendingAction);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}