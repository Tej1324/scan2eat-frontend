/* ================= CONFIG ================= */
const API_BASE = "https://YOUR-RAILWAY-BACKEND.up.railway.app"; // 🔁 CHANGE THIS

/* ================= SOCKET ================= */
const socket = io(API_BASE);

/* ================= DOM ================= */
const ordersDiv = document.getElementById("orders");
const emptyState = document.getElementById("emptyState");

/* ================= HELPERS ================= */
function getOrderId(order) {
  return order._id || order.id;
}

function minutesAgo(date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 60000);
}

function statusBadge(status) {
  const styles = {
    pending: "bg-red-100 text-red-700",
    cooking: "bg-yellow-100 text-yellow-700",
    completed: "bg-green-100 text-green-700"
  };

  return `
    <span class="px-2 py-1 rounded text-xs font-semibold ${
      styles[status] || "bg-gray-100 text-gray-700"
    }">
      ${status}
    </span>
  `;
}

/* ================= LOAD ORDERS ================= */
async function loadOrders() {
  try {
    const res = await fetch(`${API_BASE}/api/orders`);
    const orders = await res.json();

    ordersDiv.innerHTML = "";

    if (!orders.length) {
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";
    orders.forEach(renderOrder);

  } catch (err) {
    console.error("Admin load error:", err);
  }
}

/* ================= ARCHIVE ORDER ================= */
async function archiveOrder(orderId) {
  if (!confirm("Archive this order?")) return;

  try {
    await fetch(`${API_BASE}/api/orders/${orderId}/archive`, {
      method: "PATCH"
    });

    loadOrders();
  } catch (err) {
    console.error("Archive failed:", err);
  }
}

/* ================= RENDER ORDER ================= */
function renderOrder(order) {
  const mins = minutesAgo(order.createdAt);

  const card = document.createElement("div");
  card.className =
    "bg-white shadow rounded-xl p-4 border-l-8 border-gray-500";

  card.innerHTML = `
    <div class="flex justify-between items-center mb-2">
      <h2 class="text-lg font-bold">
        Table ${order.tableId}
      </h2>
      ${statusBadge(order.status)}
    </div>

    <p class="text-xs text-gray-600 mb-2">
      ID: ${getOrderId(order)} • ${mins} min ago
    </p>
  `;

  const list = document.createElement("ul");
  list.className = "list-disc pl-5 text-sm";

  order.items.forEach(i => {
    const li = document.createElement("li");
    li.textContent = `${i.name} × ${i.qty}`;
    list.appendChild(li);
  });

  const actions = document.createElement("div");
  actions.className = "mt-3";

  const archiveBtn = document.createElement("button");
  archiveBtn.textContent = "🗄 Archive";
  archiveBtn.className =
    "bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm";

  archiveBtn.onclick = () => archiveOrder(getOrderId(order));

  actions.appendChild(archiveBtn);

  card.appendChild(list);
  card.appendChild(actions);
  ordersDiv.appendChild(card);
}

/* ================= SOCKET ================= */
socket.on("order:new", loadOrders);
socket.on("order:update", loadOrders);

/* ================= INIT ================= */
loadOrders();
