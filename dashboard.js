/* ================= CONFIG ================= */
const API_BASE = "https://scan2eat-backend-production.up.railway.app";

/* ================= SOCKET ================= */
const socket = io(API_BASE);

/* ================= DOM ================= */
const ordersDiv = document.getElementById("orders");
const emptyState = document.getElementById("emptyState");

/* ================= STATE ================= */
let currentFilter = "all";

/* ================= HELPERS ================= */
function minutesAgo(date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 60000);
}

function badge(status) {
  const styles = {
    pending: "bg-red-100 text-red-700",
    cooking: "bg-yellow-100 text-yellow-700",
    ready: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
  };

  return `<span class="px-2 py-1 rounded text-xs font-semibold ${styles[status]}">${status}</span>`;
}

/* ================= LOAD ORDERS ================= */
async function loadOrders() {
  try {
    const res = await fetch(`${API_BASE}/api/orders`);
    const orders = await res.json();

    let filtered = orders;
    if (currentFilter !== "all") {
      filtered = orders.filter(o => o.status === currentFilter);
    }

    ordersDiv.innerHTML = "";

    if (!filtered.length) {
      emptyState.classList.remove("hidden");
      return;
    }

    emptyState.classList.add("hidden");

    filtered.forEach(renderOrder);
  } catch (err) {
    console.error("Dashboard load error:", err);
  }
}

/* ================= RENDER ================= */
function renderOrder(order) {
  const mins = minutesAgo(order.updatedAt || order.createdAt);

  const card = document.createElement("div");
  card.className = "bg-white rounded-xl shadow p-4 border-l-8 border-gray-400";

  card.innerHTML = `
    <div class="flex justify-between items-center mb-1">
      <h2 class="font-bold text-lg">Table ${order.tableId}</h2>
      ${badge(order.status)}
    </div>

    <p class="text-xs text-gray-600 mb-2">
      ⏱ ${mins} min ago • ${order._id}
    </p>
  `;

  const list = document.createElement("ul");
  list.className = "list-disc pl-5 text-sm";

  order.items.forEach(i => {
    const li = document.createElement("li");
    li.textContent = `${i.name} × ${i.qty}`;
    list.appendChild(li);
  });

  card.appendChild(list);
  ordersDiv.appendChild(card);
}

/* ================= FILTER ================= */
function setFilter(status) {
  currentFilter = status;
  loadOrders();
}

/* ================= SOCKET ================= */
socket.on("order:new", loadOrders);
socket.on("order:update", loadOrders);

/* ================= INIT ================= */
loadOrders();
setInterval(loadOrders, 60000);
