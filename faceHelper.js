const faceapi = require("face-api.js");
const canvas = require("canvas");
const path = require("path");

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const MODEL_PATH = path.join(__dirname, "./models");

async function loadModels() {
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH);
  console.log("Modelos cargados");
}

async function getFaceDescriptor(imagePath) {
  const img = await canvas.loadImage(imagePath);
  const detections = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor();

  return detections ? detections.descriptor : null;
}

/*function compareFaces(queryDescriptor, storedDescriptor) {
  const distance = faceapi.euclideanDistance(queryDescriptor, storedDescriptor);
  return distance < 0.6; // Umbral de similitud
}*/

function compareFaces(queryDescriptor, storedDescriptor) {
    const storedArray = Object.values(storedDescriptor); // <-- conversión clave
    const distance = faceapi.euclideanDistance(queryDescriptor, storedArray);
    return distance < 0.6;
}

module.exports = {
  canvas,
  loadModels,
  getFaceDescriptor,
  compareFaces,
};