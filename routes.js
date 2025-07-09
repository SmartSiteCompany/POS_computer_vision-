const express = require("express");
const router = express.Router();
const faceapi = require("@vladmandic/face-api");
const fs = require("fs");
const path = require("path");
const db = require("./models/db");
const multer = require("multer");
const upload = multer({ dest: "uploads/" }); // carpeta temporal
const canvas = require("canvas");
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

    const knownEncodings = await loadEncodingsFromDB();
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
      const userId = await new Promise((resolve, reject) => {
        db.run(
          "INSERT INTO users (encoding) VALUES (?)",
          [JSON.stringify(descriptorArray)],
          function (err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });

      const faceCanvas = createCanvas(width, height);
      const faceCtx = faceCanvas.getContext("2d");
      faceCtx.drawImage(canvasBase, x, y, width, height, 0, 0, width, height);
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

    const encodings = await loadEncodingsFromDB();
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

    const existingEncodings = await loadEncodingsFromDB();

      for (let i = 0; i < detections.length; i++) {
        const det = detections[i];
        const color = generateColor(i,detections.length);
        let isNew = true;
        for (const user of existingEncodings) {
          const dist = faceapi.euclideanDistance(det.descriptor, new Float32Array(user.descriptor));
          if (dist < 0.5) {
            isNew = false;
            break;
          }
        }

      let newId = null;

        if (isNew) {
          const descriptorArray = Array.from(det.descriptor);
          newId = await new Promise((resolve, reject) => {
            db.run(
              "INSERT INTO users (encoding) VALUES (?)",
              [JSON.stringify(descriptorArray)],
              function (err) {
                if (err) reject(err);
                else resolve(this.lastID);
              }
            );
          });

          registeredFaces.push({ id: newId, color });
        }

        const { x, y, width, height } = det.detection.box;
        //const color = colorList[i % colorList.length];

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
      }

    const outBase64 = c.toDataURL("image/jpeg");
    fs.unlinkSync(imagePath); // eliminar imagen temporal

    res.json({ success: true, processedImage: outBase64, registered: registeredFaces});
  } catch (err) {
    console.error("Error en /register-image:", err);
    res.status(500).json({ success: false, message: "Error registrando imagen." });
  }
});

router.get("/users", (req, res) => {
  db.all("SELECT id, timestamp FROM users", [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Error al obtener registros" });
    }
    res.json({ success: true, users: rows });
  });
});

router.get("/users/:id", (req, res) => {
  const { id } = req.params;
  db.get("SELECT id, timestamp FROM users WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Error al obtener registro" });
    }
    if (!row) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }
    res.json({ success: true, user: row });
  });
});

router.delete("/users/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM users WHERE id = ?", [id], function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Error al eliminar registro" });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }
    res.json({ success: true, message: "Registro eliminado" });
  });
});

router.put("/users/:id", (req, res) => {
  const { id } = req.params;
  const { timestamp } = req.body;

  db.run(
    "UPDATE users SET timestamp = ? WHERE id = ?",
    [timestamp, id],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Error al actualizar registro" });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Registro no encontrado" });
      }
      res.json({ success: true, message: "Registro actualizado" });
    }
  );
});

module.exports = router;