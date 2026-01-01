/* ================= CONFIG ================= */
const API_BASE = "https://scan2eat-backend-production.up.railway.app";
const KITCHEN_TOKEN = "scan2eat-kitchen-secret";

/* ================= SOCKET ================= */
const socket = io(API_BASE);

/* ================= DOM ================= */
const ordersDiv = document.getElementById("orders");
const emptyState = document.getElementById("emptyState");
const enableSoundBtn = document.getElementById("enableSound");
const urgentCountEl = document.getElementById("urgentCount");

/* ================= STATE ================= */
let soundEnabled = false;
let knownOrderIds = new Set();

const alertAudio = new Audio(
  "https://actions.google.com/sounds/v1/alarms/beep_short.ogg"
);

/* ================= HELPERS ================= */
function minutesAgo(date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 60000);
}

function playSound() {
  if (!soundEnabled) return;
  alertAudio.currentTime = 0;
  alertAudio.play().catch(() => {});
}

function urgencyClass(mins) {
  if (mins >= 20) return "border-red-600 animate-pulse";
  if (mins >= 10) return "border-yellow-500";
  return "border-green-500";
}

function statusBadge(status) {
  if (status === "pending")
    return `<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">NEW</span>`;
  if (status === "cooking")
    return `<span class="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs">COOKING</span>`;
  return "";
}

/* ================= LOAD ORDERS ================= */
async function loadOrders(playAlert = false) {
  const res = await fetch(`${API_BASE}/api/orders`);
  const orders = await res.json();

  const visible = orders
    .filter(o => o.status === "pending" || o.status === "cooking")
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  ordersDiv.innerHTML = "";

  if (!visible.length) {
    emptyState.style.display = "block";
    urgentCountEl.innerText = "0";
    return;
  }

  emptyState.style.display = "none";
  let urgentCount = 0;

  visible.forEach(order => {
    const mins = minutesAgo(order.createdAt);
    if (mins >= 20) urgentCount++;

    if (!knownOrderIds.has(order._id) && playAlert) {
      playSound();
    }

    knownOrderIds.add(order._id);
    renderOrder(order, mins);
  });

  urgentCountEl.innerText = urgentCount;
}

/* ================= RENDER ================= */
function renderOrder(order, mins) {
  const card = document.createElement("div");
  card.className = `
    bg-white shadow rounded-xl p-4 border-l-8
    ${urgencyClass(mins)}
  `;

  card.innerHTML = `
    <div class="flex justify-between items-center mb-2">
      <div class="flex items-center gap-2">
        <h2 class="text-lg font-bold">Table ${order.tableId}</h2>
        ${statusBadge(order.status)}
      </div>
      <span class="text-sm text-gray-600">${mins} min</span>
    </div>
  `;

  const list = document.createElement("ul");
  list.className = "list-disc pl-5 text-sm mb-4";

  order.items.forEach(i => {
    const li = document.createElement("li");
    li.innerHTML = `${i.name} <b>× ${i.qty}</b>`;
    list.appendChild(li);
  });

  const actions = document.createElement("div");
  actions.className = "flex gap-2";

  if (order.status === "pending") {
    actions.appendChild(button("Accept", "#f59e0b", () =>
      updateStatus(order._id, "cooking")
    ));
  }

  if (order.status === "cooking") {
    actions.appendChild(button("Ready", "#16a34a", () =>
      updateStatus(order._id, "ready")
    ));
  }

  card.append(list, actions);
  ordersDiv.appendChild(card);
}

/* ================= CLEAN BUTTON ================= */
function button(text, color, onClick) {
  const b = document.createElement("button");
  b.textContent = text;
  b.style.background = color;
  b.style.color = "white";
  b.style.padding = "6px 14px";
  b.style.borderRadius = "6px";
  b.style.fontSize = "14px";
  b.onclick = onClick;
  return b;
}

/* ================= UPDATE STATUS ================= */
async function updateStatus(id, status) {
  await fetch(`${API_BASE}/api/orders/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-access-token": KITCHEN_TOKEN
    },
    body: JSON.stringify({ status })
  });
}

/* ================= SOCKET ================= */
socket.on("order:new", () => loadOrders(true));
socket.on("order:update", loadOrders);

/* ================= SOUND ================= */
enableSoundBtn.onclick = () => {
  soundEnabled = true;
  alertAudio.play().catch(() => {});
  enableSoundBtn.style.display = "none";
};

/* ================= AUTO REFRESH ================= */
setInterval(loadOrders, 60000);

/* ================= INIT ================= */
loadOrders();
