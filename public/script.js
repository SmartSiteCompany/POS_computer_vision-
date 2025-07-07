const video = document.getElementById("video");
const overlay = document.getElementById("overlay");

// Inicializar cámara con resolución
navigator.mediaDevices
  .getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 } } })
  .then((stream) => (video.srcObject = stream))
  .catch((err) => console.error("Error al acceder a la cámara", err));

// Esperar a que el video cargue antes de capturar
function waitForVideoReady() {
  return new Promise((resolve) => {
    if (video.readyState >= 2) {
      resolve();
    } else {
      video.addEventListener("loadeddata", resolve);
    }
  });
}

function getBase64Image() {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg");
}

async function register() {
  await waitForVideoReady(); // Asegura que el video esté listo

  const base64Image = getBase64Image();

  try {
    const response = await fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Image }),
    });

    const data = await response.json();

    const ctx = overlay.getContext("2d");
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    if (data.success && Array.isArray(data.faces)) {
      data.faces.forEach((face) => {
        const { x, y, width, height } = face.box;
        ctx.strokeStyle = face.color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);
      });
    }

    alert(data.message || "Registro completado.");
  } catch (err) {
    console.error("Error en registro:", err);
    alert("Error en el servidor");
  }
}