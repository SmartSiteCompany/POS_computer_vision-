const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const resultsDiv = document.getElementById("results");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");

let stream = null;
let intervalId = null;
let lastSentId = null;
const colorCache = {};

function generateColor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 50%)`;
}

function getColorForId(id) {
  if (!colorCache[id]) {
    colorCache[id] = generateColor(id);
  }
  return colorCache[id];
}

function getBase64Image() {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.filter = "brightness(1.05) contrast(1.15) blur(1px)";
  ctx.drawImage(video, 0, 0);
  ctx.filter = "none";
  return canvas.toDataURL("image/jpeg");
}

function showResultsWithCanvas(recognized) {
  const ctx = overlay.getContext("2d");
  overlay.width = video.videoWidth;
  overlay.height = video.videoHeight;
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  resultsDiv.innerHTML = "";

  if (recognized.length === 0) {
    resultsDiv.innerText = "No se detectaron rostros.";
    return;
  }

  recognized.forEach(({ label, box }) => {
    const color = label.startsWith("ID:") ? getColorForId(label.replace("ID:", "").trim()) : "gray";
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    ctx.font = "16px Arial";
    ctx.fillStyle = color;
    ctx.fillText(label, box.x, box.y - 8);

    const p = document.createElement("p");
    p.textContent = label;
    p.style.color = color;
    p.style.fontWeight = "bold";
    resultsDiv.appendChild(p);
  });
}

async function identify() {
  const base64Image = getBase64Image();
  try {
    const response = await fetch("/identify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Image }),
    });

    const data = await response.json();
    if (data.success && Array.isArray(data.recognized)) {
      showResultsWithCanvas(data.recognized);
      const label = data.recognized[0]?.label;
      if (label?.startsWith("ID:")) {
        const userId = label.replace("ID:", "").trim();
        if (userId !== lastSentId) {
          lastSentId = userId;
          await fetch("/save-identification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
          });
        }
      }
    } else {
      resultsDiv.innerText = "Error en identificación.";
    }
  } catch (err) {
    console.error("Error identificando rostro:", err);
    resultsDiv.innerText = "Error procesando imagen.";
  }
}

// Detener reconocimiento y apagar cámara
function stopIdentification() {
  console.log("Ejecutando stopIdentification...");
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("Intervalo detenido");
  } else {
    console.log("No hay intervalo activo");
  }

  resultsDiv.innerText = "Identificación detenida.";
  const ctx = overlay.getContext("2d");
  ctx.clearRect(0, 0, overlay.width, overlay.height);

  if (stream) {
    stream.getTracks().forEach(track => {
      track.stop();
      console.log("Track detenido:", track);
    });
    stream = null;
    video.srcObject = null;
    console.log("Cámara apagada");
  } else {
    console.log("No hay stream activo");
  }
}



// Iniciar reconocimiento y encender cámara
async function startIdentification() {
  if (intervalId) return; // evitar duplicados

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 } }
    });
    video.srcObject = stream;

    intervalId = setInterval(identify, 2000);
    resultsDiv.innerText = "Identificación en curso...";
  } catch (err) {
    console.error("Error al acceder a la cámara", err);
    resultsDiv.innerText = "No se pudo acceder a la cámara.";
  }
}

// Eventos de botones
startBtn.addEventListener("click", () => {
  console.log("Botón iniciar presionado");
  startIdentification();
  startBtn.disabled = true;
  stopBtn.disabled = false;
});

stopBtn.addEventListener("click", () => {
  console.log("Botón detener presionado");
  stopIdentification();
  stopBtn.disabled = true;
  startBtn.disabled = false;
});startBtn.addEventListener("click", () => {
  console.log("Botón iniciar presionado");
  startIdentification();
  startBtn.disabled = true;
  stopBtn.disabled = false;
});

stopBtn.addEventListener("click", () => {
  console.log("Botón detener presionado");
  stopIdentification();
  stopBtn.disabled = true;
  startBtn.disabled = false;
});
