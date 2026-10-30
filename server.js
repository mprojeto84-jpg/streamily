const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs').promises;
const config = require('./config');

const app = express();
const PORT = config.PORT || 6787;

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  hidePoweredBy: true
}));

app.use(cors({
  origin: config.ALLOWED_ORIGINS || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'X-API-Key']
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Muitas requisicoes. Tente novamente mais tarde.'
});

app.use(limiter);
app.use(express.json());

app.use(express.static('public'));
app.use('/downloads', express.static('public/downloads'));
app.use('/images', express.static('public/images'));

app.use(config.API_PATH, require('./routes/api'));

app.get('/redirect', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'redirect.html'));
});

app.get('/download', async (req, res) => {
  try {
    const statsPath = path.join(__dirname, 'data/stats.json');
    let statsData = '{"downloads":0}';
    try {
      statsData = await fs.readFile(statsPath, 'utf8');
    } catch (e) {}
    const stats = JSON.parse(statsData);
    stats.downloads++;
    await fs.writeFile(statsPath, JSON.stringify(stats, null, 2));
    res.redirect(config.DOWNLOAD_URL);
  } catch (error) {
    res.redirect(config.DOWNLOAD_URL);
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('\x1b[32m%s\x1b[0m', '╔══════════════════════════════════════════════════════════════╗');
  console.log('\x1b[32m%s\x1b[0m', '║               STREAMILY TV - SISTEMA ONLINE                  ║');
  console.log('\x1b[32m%s\x1b[0m', '╠══════════════════════════════════════════════════════════════╣');
  console.log('\x1b[36m%s\x1b[0m', '║  [ SERVIDOR ]  http://localhost:' + PORT + '                             ║');
  console.log('\x1b[36m%s\x1b[0m', '║  [ API BASE ]  http://localhost:' + PORT + config.API_PATH + '            ║');
  console.log('\x1b[35m%s\x1b[0m', '║  [ STATUS   ]  A aguardar conexões...                        ║');
  console.log('\x1b[32m%s\x1b[0m', '╚══════════════════════════════════════════════════════════════╝\n');
});