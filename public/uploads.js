const form = document.getElementById("upload-form");
const resultText = document.getElementById("upload-result");
const preview = document.getElementById("preview");
const resultList = document.getElementById("upload-list");
const clearBtn = document.getElementById("clear-btn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fileInput = form.elements["image"];
  const file = fileInput.files[0];

  if (!file) {
    resultText.textContent = "Por favor selecciona una imagen.";
    resultText.style.color = "darkred";
    return;
  }

  const formData = new FormData();
  formData.append("image", file);

  try {
    const res = await fetch("/upload-image", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (data.success && data.processedImage) {
      resultText.textContent = "Imagen procesada con éxito.";
      resultText.style.color = "green";
      preview.src = data.processedImage;
      preview.style.display = "block";

      resultList.innerHTML = ""; // limpiar resultados previos

      data.results.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item.label.includes("ID:")
          ? `Rostro reconocido: ${item.label}`
          : `Rostro desconocido`;
        li.style.color = item.label.includes("ID:") ? "green" : "red";
        li.style.fontWeight = "bold";
        resultList.appendChild(li);
      });

    } else {
      resultText.textContent = data.message || " Error procesando la imagen.";
      resultText.style.color = "darkred";
    }
  } catch (err) {
    console.error(err);
    resultText.textContent = "Error de red o del servidor.";
    resultText.style.color = "darkred";
  }
});

// Limpiar pantalla
clearBtn.addEventListener("click", () => {
  preview.src = "";
  preview.style.display = "none";
  resultText.textContent = "Pantalla limpiada. Sube una nueva imagen.";
  resultText.style.color = "#333";
  resultList.innerHTML = "";
  form.reset();
});