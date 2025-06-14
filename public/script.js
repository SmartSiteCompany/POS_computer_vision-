const video = document.getElementById("video");

navigator.mediaDevices
  .getUserMedia({ video: true })
  .then((stream) => (video.srcObject = stream))
  .catch((err) => console.error("Error al acceder a la cámara", err));

function getBase64Image() {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  return canvas.toDataURL("image/jpeg");
}

async function register() {
  const base64Image = getBase64Image();
  const name = document.getElementById("name").value;

  const response = await fetch("/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, image: base64Image }),
  });

  const data = await response.json();
  alert(data.message);
}

async function login() {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const base64Image = canvas.toDataURL("image/jpeg");
  
    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image }),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        alert(data.message);
        
        //Redirige a la pantalla de bienvenida
        window.location.href = `/welcome.html?name=${encodeURIComponent(data.message)}`;
      } else {
        alert(data.message || "Error en el login");
      }
    } catch (err) {
      alert("Error al procesar login facial");
      console.error(err);
    }
  }
  
      
  