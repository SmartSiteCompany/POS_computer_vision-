async function loadCajeros() {
  const tbody = document.querySelector("#cajerosTable tbody");
  tbody.innerHTML = ""; // limpiar tabla

  try {
    const res = await fetch("/cajeros");
    const data = await res.json();

    if (data.success) {
      data.cajeros.forEach((cajero) => {
        const row = document.createElement("tr");

        const fecha = new Date(cajero.createdAt).toLocaleString("es-MX", {
          dateStyle: "short",
          timeStyle: "short",
        });

        row.innerHTML = `
          <td>${cajero._id}</td>
          <td>${fecha}</td>
          <td>
            <button class="btn btn-warning" onclick="showUpdatePrompt('${cajero._id}', '${cajero.createdAt}')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-danger" onclick="deleteUser('${cajero._id}')">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        `;

        tbody.appendChild(row);
      });
    } else {
      alert("Error al cargar cajeros");
    }
  } catch (err) {
    console.error("Error cargando cajeros:", err);
  }
}
