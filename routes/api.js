const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const router = express.Router();

const configPath = path.join(__dirname, '../data/config.json');
const statsPath = path.join(__dirname, '../data/stats.json');
const codesPath = path.join(__dirname, '../data/codes.json');
const textosPath = path.join(__dirname, '../data/textos.json');

const upload = multer({ dest: path.join(__dirname, '../public/downloads/') });

const MASTER_PASSWORD = config.ADMIN_PASSWORD;
const USERNAME = 'Arthur';
const MSISDN = '863193977';
const SECRET = 'mCotB+*f>SYyO@8Em';

// Limiter para evitar spam na geração de tokens
const tokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Máximo de 10 pedidos por IP
  message: { error: 'Muitas requisicoes. Tente novamente mais tarde.' }
});

function getNextDayExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  d.setHours(0, 1, 0, 0); // Expira daqui a 2 dias às 00:01:00
  return d.getTime();
 }

function encryptToken(text) {
  try {
    const hash = crypto.createHash('sha256').update(MASTER_PASSWORD).digest();
    const key = hash.slice(0, 16);
    const iv = hash.slice(16, 32);
    const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
  } catch (e) {
    return 'ENCRYPTION_ERROR';
  }
}

function generateToken() {
  const now = Date.now();
  const expiryMs = getNextDayExpiry();
  const raw = USERNAME + '|' + expiryMs + '|' + MSISDN + '|' + SECRET;
  const token = encryptToken(raw);
  return { token: token, expires: expiryMs };
}

async function getOrCreateCode() {
  try {
    let codes = { currentCode: '', token: '', generatedAt: 0, expiresAt: 0 };
    try {
      const data = await fs.readFile(codesPath, 'utf8');
      if (data && data.trim()) codes = JSON.parse(data);
    } catch (e) {}
    
    const now = Date.now();
    if (!codes.generatedAt || now >= codes.expiresAt) {
      const tokenData = generateToken();
      codes.currentCode = crypto.createHash('sha256').update('Streamily' + now.toString()).digest('hex').substring(0, 8).toUpperCase();
      codes.token = tokenData.token;
      codes.generatedAt = now;
      codes.expiresAt = tokenData.expires;
      codes.tokenExpiry = tokenData.expires;
      await fs.writeFile(codesPath, JSON.stringify(codes, null, 2));
    }
    return codes;
  } catch (error) {
    return { currentCode: 'DEMO123', token: 'DEMO_TOKEN', generatedAt: Date.now(), expiresAt: getNextDayExpiry() };
  }
}

async function readStats() {
  try {
    const data = await fs.readFile(statsPath, 'utf8');
    if (data && data.trim()) return JSON.parse(data);
    return { views: 0, downloads: 0 };
  } catch (e) {
    const defaultStats = { views: 0, downloads: 0 };
    await fs.writeFile(statsPath, JSON.stringify(defaultStats, null, 2));
    return defaultStats;
  }
}

async function writeStats(stats) {
  await fs.writeFile(statsPath, JSON.stringify(stats, null, 2));
}

// --- MIDDLEWARE DE SEGURANÇA ---
function verifyAdmin(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== config.API_KEY) {
    return res.status(401).json({ error: 'Acesso Negado. Faça login.' });
  }
  next();
}

// --- ROTAS PÚBLICAS ---

// 1. Textos (JSON)
router.get('/textos', async (req, res) => {
  try {
    const data = await fs.readFile(textosPath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar textos' });
  }
});

// 2. Configurações Públicas (SEM TOKEN)
router.get('/config', async (req, res) => {
  try {
    let configData = '{}';
    try { configData = await fs.readFile(configPath, 'utf8'); } catch (e) {}
    const data = JSON.parse(configData || '{}');
    res.json({
      site: data.site || { title: 'Streamily TV', version: '1.0.0', releaseDate: '2026-08-26' },
      app: data.app || { size: '42 MB', minAndroid: '5.0+' },
      features: data.features || [],
      screenshots: data.screenshots || [],
      ads: data.ads || {},
      social: data.social || {}
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Gerar Token (Público, mas com rate limit)
router.get('/generate-token', tokenLimiter, async (req, res) => {
  try {
    const codes = await getOrCreateCode();
    res.json({
      currentCode: codes.currentCode,
      token: codes.token,
      codeExpires: codes.expiresAt,
      tokenExpiry: codes.tokenExpiry || codes.expiresAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Login do Painel
router.post('/admin/login', async (req, res) => {
  const { password } = req.body;
  if (password === config.ADMIN_PASSWORD) {
    return res.json({ success: true, token: config.API_KEY });
  }
  return res.status(401).json({ error: 'Senha incorreta' });
});

// 5. Stats Públicas
router.get('/stats-public', async (req, res) => {
  try {
    const stats = await readStats();
    res.json({ views: stats.views || 0, downloads: stats.downloads || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Tracking
router.post('/track/view', async (req, res) => {
  try {
    const stats = await readStats();
    stats.views = (stats.views || 0) + 1;
    await writeStats(stats);
    res.json({ success: true, views: stats.views });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/track/download', async (req, res) => {
  try {
    const stats = await readStats();
    stats.downloads = (stats.downloads || 0) + 1;
    await writeStats(stats);
    res.json({ success: true, downloads: stats.downloads });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 7. Smartlink
router.get('/smartlink', (req, res) => {
  const baseUrl = config.SMARTLINK_1 || 'https://www.profitableratecpmnetwork.com/xarxixkwtf';
  res.json({ url: baseUrl, direct: config.SMARTLINK_1, delay: 10000 });
});

// --- ROTAS PROTEGIDAS (ADMIN) ---

// Protege a rota raiz do ADMIN
router.get('/', verifyAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Protege a rota /admin (envia o HTML)
router.get('/admin', verifyAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Configurações do ADMIN (COM TOKEN)
router.get('/admin/config', verifyAdmin, async (req, res) => {
  try {
    let configData = '{}';
    try { configData = await fs.readFile(configPath, 'utf8'); } catch (e) {}
    const data = JSON.parse(configData || '{}');
    const codes = await getOrCreateCode();
    res.json({
      site: data.site || { title: 'Streamily TV', version: '1.0.0', releaseDate: '2026-08-26' },
      app: data.app || { size: '42 MB', minAndroid: '5.0+' },
      features: data.features || [],
      messages: data.messages || [],
      screenshots: data.screenshots || [],
      ads: data.ads || {},
      social: data.social || {},
      currentCode: codes.currentCode,
      codeExpires: codes.expiresAt,
      nextGen: codes.nextGeneration,
      token: codes.token,
      tokenExpiry: codes.tokenExpiry || codes.expiresAt
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/admin/stats', verifyAdmin, async (req, res) => {
  try {
    const stats = await readStats();
    res.json(stats);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/admin/links', verifyAdmin, async (req, res) => {
  try {
    let configData = '{}';
    try { configData = await fs.readFile(configPath, 'utf8'); } catch (e) {}
    const data = JSON.parse(configData || '{}');
    res.json({
      smartlink1: config.SMARTLINK_1,
      smartlink2: config.SMARTLINK_2,
      bannerScript: data.ads?.bannerScript || '',
      popupScript: data.ads?.popupScript || '',
      whatsapp: data.social?.whatsapp || '',
      facebook: data.social?.facebook || '',
      contact: data.social?.contact || '',
      apkPath: data.app?.apkPath || '/downloads/streamily-tv.apk',
      download: config.DOWNLOAD_URL
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Upload APK e outros POSTs...
router.post('/admin/upload-apk', verifyAdmin, upload.single('apk'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    const oldPath = req.file.path;
    const newPath = path.join(__dirname, '../public/downloads/streamily-tv.apk');
    await fs.rename(oldPath, newPath);
    let configData = '{}';
    try { configData = await fs.readFile(configPath, 'utf8'); } catch (e) {}
    const data = JSON.parse(configData || '{}');
    if (!data.app) data.app = {};
    data.app.apkPath = '/downloads/streamily-tv.apk';
    await fs.writeFile(configPath, JSON.stringify(data, null, 2));
    res.json({ success: true, path: '/downloads/streamily-tv.apk', filename: req.file.originalname });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/admin/social', verifyAdmin, async (req, res) => {
  try {
    const { whatsapp, facebook, contact } = req.body;
    let configData = '{}';
    try { configData = await fs.readFile(configPath, 'utf8'); } catch (e) {}
    const data = JSON.parse(configData || '{}');
    if (!data.social) data.social = {};
    if (whatsapp) data.social.whatsapp = whatsapp;
    if (facebook) data.social.facebook = facebook;
    if (contact) data.social.contact = contact;
    await fs.writeFile(configPath, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/admin/update', verifyAdmin, async (req, res) => {
  try {
    const { site, app } = req.body;
    let configData = '{}';
    try { configData = await fs.readFile(configPath, 'utf8'); } catch (e) {}
    const data = JSON.parse(configData || '{}');
    if (site) {
      if (!data.site) data.site = {};
      if (site.version) data.site.version = site.version;
      if (site.releaseDate) data.site.releaseDate = site.releaseDate;
    }
    if (app) {
      if (!data.app) data.app = {};
      if (app.size) data.app.size = app.size;
    }
    await fs.writeFile(configPath, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/admin/ads', verifyAdmin, async (req, res) => {
  try {
    const { smartlink1, smartlink2, bannerScript, popupScript } = req.body;
    let configData = '{}';
    try { configData = await fs.readFile(configPath, 'utf8'); } catch (e) {}
    const data = JSON.parse(configData || '{}');
    if (!data.ads) data.ads = {};
    if (smartlink1) data.ads.smartlink1 = smartlink1;
    if (smartlink2) data.ads.smartlink2 = smartlink2;
    if (bannerScript !== undefined) data.ads.bannerScript = bannerScript;
    if (popupScript !== undefined) data.ads.popupScript = popupScript;
    await fs.writeFile(configPath, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/admin/code', verifyAdmin, async (req, res) => {
  try {
    const codes = await getOrCreateCode();
    res.json({
      code: codes.currentCode,
      token: codes.token,
      generated: new Date(codes.generatedAt).toISOString(),
      expires: new Date(codes.expiresAt).toISOString(),
      tokenExpiry: codes.tokenExpiry || codes.expiresAt
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;