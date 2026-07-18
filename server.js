// =====================================================================
// FAZENDA BOA VISTA - Servidor Express
// =====================================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { autenticar } = require('./src/middleware/auth');
const rotasAuth = require('./src/routes/auth');
const rotasGenericas = require('./src/routes/generic');
const rotasNegocio = require('./src/routes/negocio');
const rotasDashboard = require('./src/routes/dashboard');
const rotasUpload = require('./src/routes/upload');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', rotasAuth);
app.use('/api/dados', autenticar, rotasGenericas);
app.use('/api/negocio', autenticar, rotasNegocio);
app.use('/api/dashboard', autenticar, rotasDashboard);
app.use('/api/upload', autenticar, rotasUpload);

app.get('/api/saude', (req, res) => res.json({ ok: true }));

const porta = process.env.PORT || 3000;
app.listen(porta, () => console.log(`Fazenda Boa Vista rodando em http://localhost:${porta}`));
