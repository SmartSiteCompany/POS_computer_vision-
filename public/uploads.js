const form = document.getElementById("upload-form");
const resultText = document.getElementById("upload-result");
const preview = document.getElementById("preview");
const resultList = document.getElementById("upload-list");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fileInput = form.elements["image"];
  const file = fileInput.files[0];

  if (!file) {
    resultText.textContent = "Por favor selecciona una imagen.";
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
      preview.src = data.processedImage;
      preview.style.display = "block";

      // Mostrar resultados en lista
      resultList.innerHTML = ""; // limpiar lista anterior
      data.results.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item.label;
        li.style.color = item.color;
        resultList.appendChild(li);
      });

    } else {
      resultText.textContent = data.message || "Error procesando la imagen.";
    }
  } catch (err) {
    console.error(err);
    resultText.textContent = "Error de red o del servidor.";
  }
});