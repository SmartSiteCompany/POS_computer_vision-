const video = document.createElement("video");
video.autoplay = true;
video.muted = true;
video.playsInline = true;
video.style.display = "none";
document.body.appendChild(video);

let stream = null;
let intervalId = null;

async function startCamera() {
  stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
}

function getBase64Image() {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  return canvas.toDataURL("image/jpeg");
}

async function monitorCajero() {
  const base64Image = getBase64Image();
  try {
    const res = await fetch("/monitor-cajero", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Image }),
    });

    const data = await res.json();
    if (!data.success || !data.match) {
      console.warn("Rostro no coincide. Cerrando sesión...");
      await fetch("/logout", { method: "POST" });
      window.location.href = "/login.html";
    }
  } catch (err) {
    console.error("Error en monitorCajero:", err);
  }
}

async function initMonitor() {
  await faceapi.nets.ssdMobilenetv1.loadFromUri("/face-api-models");
  await faceapi.nets.faceRecognitionNet.loadFromUri("/face-api-models");
  await faceapi.nets.faceLandmark68Net.loadFromUri("/face-api-models");

  await startCamera();
  intervalId = setInterval(monitorCajero, 3000); // cada 3 segundos
}

initMonitor();
