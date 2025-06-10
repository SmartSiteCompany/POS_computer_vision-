const express = require('express');
const multer = require('multer');
const path = require('path');
const { detectAndSaveFaces } = require('./services/faceService');

const app = express();
const PORT = 3000;

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage });

app.use(express.json());

// Ruta de carga y detección
app.post('/upload', upload.single('foto'), async (req, res) => {
  const nombre = req.body.nombre || 'Desconocido';
  try {
    await detectAndSaveFaces(req.file.path, nombre);
    res.json({ msg: 'Rostros detectados y guardados' });
  } catch (err) {
    res.status(500).json({ error: 'Error al procesar la imagen' });
  }
});

app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));