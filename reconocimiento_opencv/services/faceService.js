const cv = require('opencv4nodejs');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

const dataPath = path.join(__dirname, '../data/faces.json');

// Cargar la base de datos temporal
const loadDatabase = async () => {
  try {
    await fs.ensureFile(dataPath);
    const data = await fs.readFile(dataPath, 'utf8');
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Error loading database:', err);
    return [];
  }
};

const saveDatabase = async (data) => {
  await fs.writeJson(dataPath, data, { spaces: 2 });
};

// Detector de rostros con Haarcascade
const faceClassifier = new cv.CascadeClassifier(cv.HAAR_FRONTALFACE_ALT2);

async function detectAndSaveFaces(imagePath, nombreUsuario) {
  const image = await cv.imreadAsync(imagePath);
  const grayImg = await image.bgrToGrayAsync();
  const faces = await faceClassifier.detectMultiScaleAsync(grayImg);

  if (!faces.objects.length) {
    console.log("No se detectaron rostros.");
    return;
  }

  const db = await loadDatabase();

  for (let i = 0; i < faces.objects.length; i++) {
    const rect = faces.objects[i];
    const face = image.getRegion(rect).resize(150, 150);

    const id = uuidv4();
    const filename = `face_${id}.jpg`;
    const filepath = path.join(__dirname, `../uploads/${filename}`);
    await cv.imwriteAsync(filepath, face);

    db.push({
      id,
      nombre: nombreUsuario,
      image: filename,
      fecha: moment().format('YYYY-MM-DD HH:mm:ss'),
    });
  }

  await saveDatabase(db);
  console.log("Rostros guardados con éxito.");
}

module.exports = {
  detectAndSaveFaces
};