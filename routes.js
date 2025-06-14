const express = require("express");
const router = express.Router();
const faceapi = require("@vladmandic/face-api");
const fs = require("fs");
const path = require("path");
const db = require("./models/db");
const multer = require("multer");
const canvas = require("canvas");
const { createCanvas, Image } = require ("canvas");

faceapi.env.monkeyPatch({ Canvas: canvas.Canvas, Image, ImageData: canvas.ImageData});


const MODELS_URL = path.join(__dirname, "face-api-models");
const encodingsPath = path.join(__dirname, "encodings.json");
//const descriptor = await getDescriptorFromBase64(image);
//const encodings = loadEncodings();

// Cargar modelos una sola vez
let modelsLoaded = false;
async function loadModels() {
  if (!modelsLoaded) {
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_URL);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_URL);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_URL);
    modelsLoaded = true;
    console.log("Modelos de FaceAPI cargados");
  }
}

// Funcion para cargar encoding.json
/*function loadEncodings() {
  if (fs.existsSync(encodingsPath)) {
    return JSON.parse(fs.readFileSync(encodingsPath));
  } else {
    return [];
  }
}

// Funcion para guardar encoding.json
function saveEncodings(encodings) {
  fs.writeFileSync(encodingsPath, JSON.stringify(encodings, null, 2));
}*/

// Función para cargar encodings desde la base de datos
function loadEncodingsFromDB() {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, encoding FROM users', [], (err, rows) => {
      if (err) return reject(err);
      const encodings = rows.map(row => ({
        id: row.id,
        descriptor: JSON.parse(row.encoding)
      }));
      resolve(encodings);
    });
  });
}

// Función para guardar un nuevo encoding 
function saveEncodingToDB(descriptor) {
  return new Promise((resolve, reject) => {
    const descriptorStr = JSON.stringify(Array.from(descriptor));
    db.run(
      'INSERT INTO users (encoding) VALUES (?)',
      [descriptorStr],
      function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });
}

// Convertir base64 a tensor
async function getDescriptorFromBase64(base64) {
  const buffer = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), "base64");
  const tensor = faceapi.tf.node.decodeImage(buffer);
  const results = await faceapi
    .detectSingleFace(tensor)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!results) throw new Error("No se detectó ningún rostro");
  return results.descriptor;
}

// Ruta para registrar una nueva persona
router.post("/register", async (req, res) => {
  try {
    await loadModels();
    const { image } = req.body;

    if (!image) throw new Error("Imagen no proporcionada");

    const descriptor = await getDescriptorFromBase64(image);

    const userId = await saveEncodingToDB(descriptor);

    // Guardar imagen en carpeta `dataset` usando el ID
    const base64Data = image.replace(/^data:image\/jpeg;base64,/, "");
    const imagePath = path.join(__dirname, "dataset", `user_${userId}.jpg`);
    fs.writeFileSync(imagePath, base64Data, "base64");

    res.json({ success: true, message: "Rostro registrado", userId });
  } catch (err) {
    console.error("Error en /register:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Ruta para login facial
router.post("/login", async (req, res) => {
  try {
    await loadModels();
    const { image } = req.body;

    console.log("imagen para login recibida:", image.slice(0, 100));

    const descriptor = await getDescriptorFromBase64(image);
    //const encodings = loadEncodings();

    const encodings = await
    loadEncodingsFromDB();

    let bestMatch = null;
    let bestDistance = 1;

    /*encodings.forEach((user) => {
      const dist = faceapi.euclideanDistance(descriptor, user.descriptor);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestMatch = user.name;
      }
    });*/

    encodings.forEach((user) => {
        const storedDescriptor = new Float32Array(user.descriptor);
        const dist = faceapi.euclideanDistance(descriptor, storedDescriptor);
        if (dist < bestDistance) {
          bestDistance = dist;
          bestMatch = user.name;
        }
    });

    if (bestDistance < 0.5) {
      res.json({ success: true, message: `Bienvenido ${bestMatch}` });
    } else {
      res.status(401).json({ success: false, message: "Rostro no reconocido" });
    }
  } catch (err) {
    console.error("Error en /login:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Ruta para identificación facial múltiple
router.post("/identify", async (req, res) => {
  try {
    await loadModels();
    const { image } = req.body;
    const buffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), "base64");
    const tensor = faceapi.tf.node.decodeImage(buffer);

    const detections = await faceapi
      .detectAllFaces(tensor)
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (!detections || detections.length === 0) {
      return res.json({ success: true, recognized: [] });
    }

    const knownEncodings = await loadEncodingsFromDB();

    const recognized = detections.map((det) => {
  let bestMatch = null;
  let bestDistance = 1;

      for (const user of knownEncodings) {
        const storedDescriptor = new Float32Array(user.descriptor);
        const distance = faceapi.euclideanDistance(det.descriptor, storedDescriptor);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = user.id;
        }
      }

      const label = bestDistance < 0.5 ? `ID: ${bestMatch}` : "Rostro desconocido";

      return {
        label,
        box: {
          x: det.detection.box.x,
          y: det.detection.box.y,
          width: det.detection.box.width,
          height: det.detection.box.height,
        },
      };
    });

    return res.json({ success: true, recognized });
  } catch (err) {
    console.error("Error en /identify:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


const upload = multer({ dest: "uploads/" }); // carpeta temporal

router.post("/upload-image", upload.single("image"), async (req, res) => {
  try {
    await loadModels();

    const imagePath = req.file.path;

    const img = await canvas.loadImage(imagePath);
    const c = createCanvas(img.width, img.height);
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const detections = await faceapi
      .detectAllFaces(c)
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (!detections || detections.length === 0) {
      fs.unlinkSync(imagePath); // eliminar imagen temporal
      return res.json({ success: true, message: "No se detectaron rostros." });
    }

    const encodings = await loadEncodingsFromDB();

    detections.forEach((det) => {
      let bestMatch = null;
      let bestDistance = 1;

      for (const user of encodings) {
        const storedDescriptor = new Float32Array(user.descriptor);
        const dist = faceapi.euclideanDistance(det.descriptor, storedDescriptor);
        if (dist < bestDistance) {
          bestDistance = dist;
          bestMatch = user.id;
        }
      }

      const label = bestDistance < 0.5 ? `ID: ${bestMatch}` : "Desconocido";

      const { x, y, width, height } = det.detection.box;
      ctx.strokeStyle = "red";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      ctx.font = "16px Arial";
      ctx.fillStyle = "red";
      ctx.fillText(label, x, y > 20 ? y - 5 : y + 15);
    });

    const outBase64 = c.toDataURL("image/jpeg");
    fs.unlinkSync(imagePath); // eliminar imagen temporal

    res.json({ success: true, processedImage: outBase64 });
  } catch (err) {
    console.error("Error en /upload-image:", err);
    res.status(500).json({ success: false, message: "Error procesando imagen." });
  }
});

module.exports = router;