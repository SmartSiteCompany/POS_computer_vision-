const form = document.getElementById("register-form");
const resultText = document.getElementById("register-result");
const preview = document.getElementById("register-preview");
const fileName = document.getElementById("file-name");
const list = document.getElementById("register-list");
const clearBtn = document.getElementById("clear-button");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fileInput = form.elements["image"];
  const file = fileInput.files[0];
  if (!file) {
    showResult("Selecciona una imagen.", "error");
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
      preview.src = data.processedImage;
      preview.style.display = "block";

      list.innerHTML = ""; // limpiar antes

      if (data.registered.length > 0) {
        showResult("Rostro registrado correctamente.", "success");

        data.registered.forEach((item) => {
          const li = document.createElement("li");
          li.textContent = `ID Registrado: ${item.id}`;
          li.style.color = item.color;
          list.appendChild(li);
        });
      } else {
        showResult("Rostro ya registrado anteriormente.", "warning");
      }
    } else {
      showResult(data.message || "Error al registrar.", "error");
    }
  } catch (err) {
    console.error(err);
    showResult("Error de red o del servidor.", "error");
  }
});

clearBtn.addEventListener("click", () => {
  preview.style.display = "none";
  preview.src = "";
  resultText.textContent = "";
  resultText.style.display = "none";
  list.innerHTML = "";
  fileName.textContent = "";
  form.reset();
});

function showResult(message, type = "info") {
  resultText.textContent = message;
  resultText.style.display = "block";

  if (type === "success") resultText.style.color = "green";
  else if (type === "warning") resultText.style.color = "orange";
  else resultText.style.color = "red";
}