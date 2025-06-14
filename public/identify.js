const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const resultsDiv = document.getElementById("results");

let intervalId = null;

// Activar cámara con resolución adecuada
navigator.mediaDevices.getUserMedia({
  video: { width: { ideal: 640 }, height: { ideal: 480 } }
})
  .then((stream) => (video.srcObject = stream))
  .catch((err) => console.error("Error al acceder a la cámara", err));

// Cache de colores por ID
const colorCache = {};

// Función determinista para generar color HSL único
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

// Captura y preprocesamiento con filtro canvas
function getBase64Image() {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // Preprocesamiento visual
  ctx.filter = "brightness(1.05) contrast(1.15) blur(1px)";
  ctx.drawImage(video, 0, 0);
  ctx.filter = "none";

  return canvas.toDataURL("image/jpeg");
}

// Mostrar resultados en canvas
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

  recognized.forEach((item) => {
    const { label, box } = item;
    const id = label.replace("ID: ", "").trim();
    const color = getColorForId(id);

    // Dibujar cuadro
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(box.x, box.y, box.width, box.height);

    
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
      if (data.recognized[0]?.box) {
        showResultsWithCanvas(data.recognized);
      } else {
        
        resultsDiv.innerHTML = "";
        data.recognized.forEach((id) => {
          const p = document.createElement("p");
          p.textContent = id;
          resultsDiv.appendChild(p);
        });
      }
    } else {
      resultsDiv.innerText = "Error en identificación.";
    }
  } catch (err) {
    console.error("Error identificando rostro:", err);
    resultsDiv.innerText = "Error procesando imagen.";
  }
}

// Iniciar identificación 
intervalId = setInterval(identify, 2000);

// Detener identificación
function stopIdentification() {
  clearInterval(intervalId);
  resultsDiv.innerText = "Identificación detenida.";
}


document.getElementById("uploadForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fileInput = document.getElementById("imageInput");
  const file = fileInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("image", file);

  try {
    const res = await fetch("/upload-image", {
      method: "POST",
      body: formData,
    });

    const blob = await res.blob();
    const imageUrl = URL.createObjectURL(blob);
    document.getElementById("resultImage").src = imageUrl;
  } catch (err) {
    alert("Error subiendo imagen");
    console.error(err);
  }
});