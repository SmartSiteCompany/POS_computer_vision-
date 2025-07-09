async function loadUsers() {
  const res = await fetch("/users");
  const data = await res.json();

  const tbody = document.querySelector("#usersTable tbody");
  tbody.innerHTML = "";

  if (data.success) {
    data.users.forEach(user => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${user.id}</td><td>${user.timestamp}</td>`;
      tbody.appendChild(tr);
    });
  } else {
    alert("Error cargando usuarios");
  }
}

async function updateUser() {
  const id = document.getElementById("updateId").value;
  const timestamp = document.getElementById("updateTimestamp").value;

  if (!id || !timestamp) return alert("ID y timestamp requeridos");

  const res = await fetch(`/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ timestamp })
  });

  const data = await res.json();
  alert(data.message || data.error);
  loadUsers();
}

async function deleteUser() {
  const id = document.getElementById("deleteId").value;
  if (!id) return alert("Ingresa un ID");

  const res = await fetch(`/users/${id}`, { method: "DELETE" });
  const data = await res.json();
  alert(data.message || data.error);
  loadUsers();
}

// Cargar al inicio
loadUsers();