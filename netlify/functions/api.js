// Embrulha o Express existente como Netlify Function
const serverless = require('serverless-http');
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { autenticar } = require('../../src/middleware/auth');
const rotasAuth = require('../../src/routes/auth');
const rotasGenericas = require('../../src/routes/generic');
const rotasNegocio = require('../../src/routes/negocio');
const rotasDashboard = require('../../src/routes/dashboard');
const rotasUpload = require('../../src/routes/upload');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// No Netlify, todas as rotas da API passam por /.netlify/functions/api
app.use('/api/auth', rotasAuth);
app.use('/api/dados', autenticar, rotasGenericas);
app.use('/api/negocio', autenticar, rotasNegocio);
app.use('/api/dashboard', autenticar, rotasDashboard);
app.use('/api/upload', autenticar, rotasUpload);
app.get('/api/saude', (req, res) => res.json({ ok: true }));

module.exports.handler = serverless(app);
