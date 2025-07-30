async function loadUsers() {
  const tbody = document.querySelector("#usersTable tbody");
  tbody.innerHTML = ""; // limpiar tabla

  try {
    const res = await fetch("/users");
    const data = await res.json();

    if (data.success) {
      data.users.forEach((user) => {
        const row = document.createElement("tr");

        const fecha = new Date(user.createdAt).toLocaleString("es-MX", {
          dateStyle: "short",
          timeStyle: "short",
        });

        row.innerHTML = `
          <td>${user._id}</td>
          <td>${fecha}</td>
          <td>
            <button class="btn btn-warning" onclick="showUpdatePrompt('${user._id}', '${user.createdAt}')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-danger" onclick="deleteUser('${user._id}')">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        `;

        tbody.appendChild(row);
      });
    } else {
      alert("Error al cargar usuarios");
    }
  } catch (err) {
    console.error("Error cargando usuarios:", err);
  }
}

async function deleteUser(id) {
  if (!confirm("¿Seguro que deseas eliminar este usuario?")) return;

  try {
    const res = await fetch(`/users/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (data.success) {
      alert("Usuario eliminado");
      loadUsers();
    } else {
      alert(data.error || "No se pudo eliminar");
    }
  } catch (err) {
    console.error("Error eliminando usuario:", err);
  }
}

let currentUserId = null;

function showUpdatePrompt(id, currentDate) {
  currentUserId = id;
  const input = document.getElementById("newDateInput");
  input.value = new Date(currentDate).toISOString().slice(0, 16); // formato para input datetime-local
  document.getElementById("updateModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("updateModal").style.display = "none";
  currentUserId = null;
}

async function confirmUpdate() {
  const newTimestamp = document.getElementById("newDateInput").value;
  if (!newTimestamp || !currentUserId) return;

  try {
    const res = await fetch(`/users/${currentUserId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timestamp: newTimestamp }),
    });

    const data = await res.json();

    if (data.success) {
      closeModal();
      loadUsers();
    } else {
      alert(data.error || "No se pudo actualizar");
    }
  } catch (err) {
    console.error("Error actualizando usuario:", err);
  }
}


async function updateUser(id, newTimestamp) {
  try {
    const res = await fetch(`/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timestamp: newTimestamp }),
    });

    const data = await res.json();

    if (data.success) {
      alert("Fecha actualizada");
      loadUsers();
    } else {
      alert(data.error || "No se pudo actualizar");
    }
  } catch (err) {
    console.error("Error actualizando usuario:", err);
  }
}