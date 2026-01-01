/* ================= CONFIG ================= */
const API_BASE = "https://scan2eat-backend-production.up.railway.app";

/* ================= SOCKET ================= */
const socket = io(API_BASE);

/* ================= DOM ================= */
const ordersDiv = document.getElementById("orders");
const emptyState = document.getElementById("emptyState");

/* ================= HELPERS ================= */
function minutesAgo(date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 60000);
}

/* ================= LOAD ORDERS ================= */
async function loadCompletedOrders() {
  try {
    const res = await fetch(`${API_BASE}/api/orders`);
    if (!res.ok) throw new Error("Orders fetch failed");

    const orders = await res.json();

    const completed = orders.filter(
      o => o.status === "completed"
    );

    ordersDiv.innerHTML = "";

    if (!completed.length) {
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";
    completed.forEach(renderOrder);

  } catch (err) {
    console.error("❌ Completed orders load error:", err);
  }
}

/* ================= RENDER ORDER ================= */
function renderOrder(order) {
  const mins = minutesAgo(order.updatedAt || order.createdAt);

  const card = document.createElement("div");
  card.className =
    "bg-white shadow rounded-xl p-4 border-l-8 border-green-600";

  card.innerHTML = `
    <div class="flex justify-between items-center mb-2">
      <h2 class="text-lg font-bold">
        Table ${order.tableId}
      </h2>
      <span class="text-sm text-gray-600">
        ⏱ ${mins} min ago
      </span>
    </div>
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

/* ================= SOCKET EVENTS ================= */
socket.on("order:update", loadCompletedOrders);
socket.on("order:new", loadCompletedOrders);

/* ================= INIT ================= */
loadCompletedOrders();
setInterval(loadCompletedOrders, 60000);
