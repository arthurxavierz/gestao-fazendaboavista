// Upload de fotos/comprovantes para o Supabase Storage (bucket "anexos")
const express = require('express');
const multer = require('multer');
const { supabase } = require('../supabase');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

router.post('/', upload.single('arquivo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado.' });
  const nome = `${Date.now()}-${req.file.originalname.replace(/[^\w.\-]/g, '_')}`;
  const { error } = await supabase.storage.from('anexos')
    .upload(nome, req.file.buffer, { contentType: req.file.mimetype });
  if (error) return res.status(400).json({ erro: 'Falha no upload: ' + error.message });
  const { data } = supabase.storage.from('anexos').getPublicUrl(nome);
  res.status(201).json({ url: data.publicUrl, nome_arquivo: req.file.originalname });
});

module.exports = router;
