const form = document.getElementById("register-form");
const resultText = document.getElementById("register-result");
const preview = document.getElementById("register-preview");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fileInput = form.elements["image"];
  const file = fileInput.files[0];
  if (!file) {
    resultText.textContent = "Selecciona una imagen.";
    return;
  }

  const formData = new FormData();
  formData.append("image", file);

  try {
    const res = await fetch("/register-image", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    if (data.success && data.processedImage) {
      resultText.textContent = "Registro exitoso.";
      preview.src = data.processedImage;
      preview.style.display = "block";

      const list = document.getElementById("register-list");
      list.innerHTML = ""; // limpiar antes

      data.registered.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = `ID Registrado: ${item.id}`;
        li.style.color = item.color;
        list.appendChild(li);
      });
    } else {
      resultText.textContent = data.message || "Error al registrar.";
    }
  } catch (err) {
    console.error(err);
    resultText.textContent = "Error de red o del servidor.";
  }
});