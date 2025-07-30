const express = require("express");
const router = express.Router();
const faceapi = require("@vladmandic/face-api");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const upload = multer({ dest: "uploads/" }); // carpeta temporal
const canvas = require("canvas");
const mongoose = require ("mongoose");
const User = require ('./models/User.js');
const Cajero = require ('./models/Cajero.js');
const { createCanvas, Image, loadImage } = require ("canvas");

faceapi.env.monkeyPatch({ Canvas: canvas.Canvas, Image, ImageData: canvas.ImageData});

const MODELS_URL = path.join(__dirname, "face-api-models");

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

// Función para cargar un encoding desde mongodb
async function loadEncodingsFromMongodb() {
  const users = await User.find({});
  return users.map((user) => ({
    id: user._id.toString(),
    descriptor: user.encoding,
  }));
}

// Función para cargar un encoding para cajero
async function loadEncodingsForCajeros() {
  const cajeros = await Cajero.find({});
  return cajeros.map((cajero) => ({
    id: cajero._id.toString(),
    descriptor: cajero.encoding,
  }));
}

// Función para guardar un encoding desde mongodb
async function saveEncodingToMongodb(descriptor) {
  const newUser = new User({ encoding: Array.from(descriptor) });
  const saved = await newUser.save();
  return saved._id.toString();
}

// Función para guardar un encoding para cajero
async function saveEncodingToCajero(descriptor) {
  const newCajero = new Cajero({ encoding: Array.from(descriptor) });
  const saved = await newCajero.save();
  return saved._id.toString();
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



router.post("/register", async (req, res) => {
  try {
    await loadModels();
    const { image } = req.body;
    if (!image) throw new Error("Imagen no proporcionada");

    const buffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), "base64");
    const img = await loadImage(buffer);
    const canvasBase = createCanvas(img.width, img.height);
    const ctx = canvasBase.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const detections = await faceapi
      .detectAllFaces(canvasBase)
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (!detections.length) {
      return res.json({ success: false, message: "No se detectaron rostros." });
    }

    const knownEncodings = await loadEncodingsFromMongodb(); // CAMBIO AQUÍ
    let registered = 0;
    let duplicated = 0;
    const faces = [];

    for (let i = 0; i < detections.length; i++) {
      const { descriptor, detection } = detections[i];
      const { x, y, width, height } = detection.box;

      let isDuplicate = false;
      for (const user of knownEncodings) {
        const storedDescriptor = new Float32Array(user.descriptor);
        const distance = faceapi.euclideanDistance(descriptor, storedDescriptor);
        if (distance < 0.5) {
          isDuplicate = true;
          break;
        }
      }

      const color = generateColor(i, detections.length);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      faces.push({ box: detection.box, color, isDuplicate });

      if (isDuplicate) {
        duplicated++;
        continue;
      }

      const descriptorArray = Array.from(descriptor);

      // 🧠 GUARDAR EN MONGODB
      const newUser = new User({ encoding: descriptorArray });
      const savedUser = await newUser.save();
      const userId = savedUser._id.toString();

      // 🖼️ Guardar recorte de rostro (opcional)
      const faceCanvas = createCanvas(width, height);
      const faceCtx = faceCanvas.getContext("2d");
      faceCtx.drawImage(canvasBase, x, y, width, height, 0, 0, width, height);

      // Verificar que el directorio 'dataset' exista
      const datasetDir = path.join(__dirname, "dataset");
      if (!fs.existsSync(datasetDir)) {
        fs.mkdirSync(datasetDir, { recursive: true });
      }
      
      const facePath = path.join(__dirname, "dataset", `user_${userId}.jpg`);
      fs.writeFileSync(facePath, faceCanvas.toBuffer("image/jpeg"));

      registered++;
    }

    const finalImage = canvasBase.toDataURL("image/jpeg");

    return res.json({
      success: true,
      message: `${registered} rostro(s) registrado(s), ${duplicated} duplicado(s).`,
      faces,
      image: finalImage,
    });
  } catch (err) {
    console.error("Error en /register:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// Función de colores
function generateColor(index, total) {
  const hue = Math.floor((360 / total) * index);
  return `hsl(${hue}, 100%, 50%)`;
}


// Ruta para identificación facial múltiple

router.post("/identify", async (req, res) => {
  try {
    await loadModels();
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ success: false, message: "Imagen no proporcionada" });
    }

    const buffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), "base64");
    const tensor = faceapi.tf.node.decodeImage(buffer);

    const detections = await faceapi
      .detectAllFaces(tensor)
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (!detections || detections.length === 0) {
      return res.json({ success: true, recognized: [] });
    }

    // Cargar usuarios desde MongoDB
    const knownUsers = await User.find();

    const recognized = detections.map((det, i) => {
      let bestMatch = null;
      let bestDistance = 1;

      for (const user of knownUsers) {
        const storedDescriptor = new Float32Array(user.encoding);
        const distance = faceapi.euclideanDistance(det.descriptor, storedDescriptor);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = user._id;
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


function generateColor(index, total) {
  const hue = Math.floor((360 / total) * index); // divide el círculo cromático
  return `hsl(${hue}, 100%, 50%)`; // saturación y brillo fijos para visibilidad
}

const registeredFaces = [];

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
      fs.unlinkSync(imagePath);
      return res.json({ success: true, message: "No se detectaron rostros." });
    }

    const encodings = await loadEncodingsFromMongodb();
    const results = [];

    for (let i = 0; i < detections.length; i++) {
      const det = detections[i];
      const color = generateColor(i, detections.length);
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
      results.push({ label, color });

      const { x, y, width, height } = det.detection.box;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
    }

    const outBase64 = c.toDataURL("image/jpeg");
    fs.unlinkSync(imagePath);

    res.json({
      success: true,
      processedImage: outBase64,
      results,
    });
  } catch (err) {
    console.error("Error en /upload-image:", err);
    res.status(500).json({ success: false, message: "Error procesando imagen." });
  }
});


router.post("/register-image", upload.single("image"), async (req, res) => {
  const registeredFaces = [];

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
      fs.unlinkSync(imagePath);
      return res.json({ success: true, message: "No se detectaron rostros." });
    }

    const existingEncodings = await loadEncodingsFromMongodb();

    for (let i = 0; i < detections.length; i++) {
      const det = detections[i];
      const color = generateColor(i, detections.length);
      const { x, y, width, height } = det.detection.box;

      let isNew = true;
      for (const user of existingEncodings) {
        const dist = faceapi.euclideanDistance(
          det.descriptor,
          new Float32Array(user.descriptor)
        );
        if (dist < 0.5) {
          isNew = false;
          break;
        }
      }

      let newId = null;

      if (isNew) {
        const descriptorArray = Array.from(det.descriptor);
        const newUser = new User({ encoding: descriptorArray });
        const saved = await newUser.save();
        newId = saved._id.toString();

        registeredFaces.push({ id: newId, color });

        // guardar imagen recortada del rostro
        const faceCanvas = createCanvas(width, height);
        const faceCtx = faceCanvas.getContext("2d");
        faceCtx.drawImage(c, x, y, width, height, 0, 0, width, height);

        const facePath = path.join(__dirname, "dataset", `user_${newId}.jpg`);
        fs.writeFileSync(facePath, faceCanvas.toBuffer("image/jpeg"));
      }

      // DIBUJAR RECUADRO (para todos los rostros)
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
    }

    const outBase64 = c.toDataURL("image/jpeg");
    fs.unlinkSync(imagePath); // eliminar imagen temporal

    res.json({
      success: true,
      processedImage: outBase64,
      registered: registeredFaces,
    });
  } catch (err) {
    console.error("Error en /register-image:", err);
    res
      .status(500)
      .json({ success: false, message: "Error registrando imagen." });
  }
});


// Ruta POST /register solo para cajeros
router.post("/register", async (req, res) => {
  try {
    await loadModels();
    const { image } = req.body;
    if (!image) throw new Error("Imagen no proporcionada");

    const buffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), "base64");
    const img = await loadImage(buffer);
    const canvasBase = createCanvas(img.width, img.height);
    const ctx = canvasBase.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const detections = await faceapi
      .detectAllFaces(canvasBase)
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (!detections.length) {
      return res.json({ success: false, message: "No se detectaron rostros." });
    }

    const knownEncodings = await loadEncodingsForCajeros();
    let registered = 0;
    let duplicated = 0;
    const faces = [];

    for (let i = 0; i < detections.length; i++) {
      const { descriptor, detection } = detections[i];
      const { x, y, width, height } = detection.box;

      let isDuplicate = false;
      for (const cajero of knownEncodings) {
        const storedDescriptor = new Float32Array(cajero.descriptor);
        const distance = faceapi.euclideanDistance(descriptor, storedDescriptor);
        if (distance < 0.5) {
          isDuplicate = true;
          break;
        }
      }

      const color = generateColor(i, detections.length);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      faces.push({ box: detection.box, color, isDuplicate });

      if (isDuplicate) {
        duplicated++;
        continue;
      }

      const newCajero = new Cajero({ encoding: Array.from(descriptor) });
      const saved = await newCajero.save();
      const id = saved._id.toString();

      // Guardar imagen opcional
      const faceCanvas = createCanvas(width, height);
      const faceCtx = faceCanvas.getContext("2d");
      faceCtx.drawImage(canvasBase, x, y, width, height, 0, 0, width, height);

      const datasetDir = path.join(__dirname, "dataset");
      if (!fs.existsSync(datasetDir)) {
        fs.mkdirSync(datasetDir, { recursive: true });
      }

      const facePath = path.join(datasetDir, `cajero_${id}.jpg`);
      fs.writeFileSync(facePath, faceCanvas.toBuffer("image/jpeg"));

      registered++;
    }

    const finalImage = canvasBase.toDataURL("image/jpeg");

    return res.json({
      success: true,
      message: `${registered} rostro(s) registrado(s), ${duplicated} duplicado(s).`,
      faces,
      image: finalImage,
    });
  } catch (err) {
    console.error("Error en /register:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// Ruta para login por reconocimiento facial

router.post("/login", async (req, res) => {
  try {
    await loadModels();
    const { image } = req.body;

    const descriptor = await getDescriptorFromBase64(image);
    const encodings = await loadEncodingsForCajeros();

    let bestMatchId = null;
    let bestDistance = 1;

    encodings.forEach((cajero) => {
      const storedDescriptor = new Float32Array(cajero.descriptor);
      const dist = faceapi.euclideanDistance(descriptor, storedDescriptor);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestMatchId = cajero.id; // devolvemos el ID
      }
    });

    if (bestDistance < 0.5) {
      res.json({
        success: true,
        message: "Acceso concedido",
        id: bestMatchId, // ID del cajero
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Rostro no reconocido",
      });
    }
  } catch (err) {
    console.error("Error en /login:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
	




//---------------------------Rutas de los crud------------------------------------------------------------

router.get("/users", async (req, res) => {
  try {
    const users = await User.find({}, { encoding: 0 }).sort({ createdAt: -1 }); // ocultar el campo encoding
    res.json({ success: true, users });
  } catch (err) {
    console.error("Error al obtener usuarios:", err);
    res.status(500).json({ error: "Error al obtener registros" });
  }
});



router.delete("/users/:id", async (req, res) => {
  try {
    const result = await User.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }
    res.json({ success: true, message: "Registro eliminado" });
  } catch (err) {
    console.error("Error al eliminar usuario:", err);
    res.status(500).json({ error: "Error al eliminar registro" });
  }
});


router.put("/users/:id", async (req, res) => {
  try {
    const { timestamp } = req.body;
    const parsedDate = new Date(timestamp);

    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: "Fecha inválida" });
    }

    const result = await User.findByIdAndUpdate(
      req.params.id,
      { createdAt: parsedDate },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }

    res.json({ success: true, message: "Registro actualizado", user: result });
  } catch (err) {
    console.error("Error al actualizar usuario:", err);
    res.status(500).json({ error: "Error al actualizar registro" });
  }
});


module.exports = router;