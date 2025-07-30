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
            <button class="btn btn-warning" onclick="showUpdatePromptCajero('${cajero._id}', '${cajero.createdAt}')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-danger" onclick="deleteCajero('${cajero._id}')">
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

async function deleteCajero(id) {
  if (!confirm("¿Seguro que deseas eliminar este cajero?")) return;

  try {
    const res = await fetch(`/cajeros/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (data.success) {
      alert("Cajero eliminado");
      loadCajeros();
    } else {
      alert(data.error || "No se pudo eliminar");
    }
  } catch (err) {
    console.error("Error eliminando cajero:", err);
  }
}

let currentCajeroId = null;

function showUpdatePromptCajero(id, currentDate) {
  currentCajeroId = id;
  const input = document.getElementById("newDateInputCajero");
  input.value = new Date(currentDate).toISOString().slice(0, 16);
  document.getElementById("updateModalCajero").style.display = "flex";
}

function closeModalCajero() {
  document.getElementById("updateModalCajero").style.display = "none";
  currentCajeroId = null;
}

async function confirmUpdateCajero() {
  const newTimestamp = document.getElementById("newDateInputCajero").value;
  if (!newTimestamp || !currentCajeroId) return;

  try {
    const res = await fetch(`/cajeros/${currentCajeroId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timestamp: newTimestamp }),
    });

    const data = await res.json();

    if (data.success) {
      closeModalCajero();
      loadCajeros();
    } else {
      alert(data.error || "No se pudo actualizar");
    }
  } catch (err) {
    console.error("Error actualizando cajero:", err);
  }
}