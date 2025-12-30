/* ================= CONFIG ================= */
const API_BASE = "https://YOUR-RAILWAY-BACKEND.up.railway.app"; // 🔁 CHANGE THIS
const KITCHEN_TOKEN = "scan2eat-kitchen-secret";

/* ================= SOCKET ================= */
const socket = io(API_BASE);

/* ================= DOM ================= */
const ordersDiv = document.getElementById("orders");
const emptyState = document.getElementById("emptyState");
const enableSoundBtn = document.getElementById("enableSound");

/* ================= STATE ================= */
let soundEnabled = false;
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

function borderColor(status) {
  if (status === "pending") return "border-red-600";
  if (status === "cooking") return "border-yellow-500";
  if (status === "ready") return "border-green-600";
  return "border-gray-400";
}

/* ================= LOAD ORDERS ================= */
async function loadOrders(playAlert = false) {
  try {
    const res = await fetch(`${API_BASE}/api/orders`);
    const orders = await res.json();

    // Kitchen sees ONLY pending + cooking
    const visible = orders.filter(
      o => o.status === "pending" || o.status === "cooking"
    );

    ordersDiv.innerHTML = "";

    if (!visible.length) {
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";
    if (playAlert) playSound();

    visible.forEach(renderOrder);
  } catch (err) {
    console.error("Kitchen load error:", err);
  }
}

/* ================= RENDER ================= */
function renderOrder(order) {
  const mins = minutesAgo(order.createdAt);
  const id = order._id;

  const card = document.createElement("div");
  card.className = `
    bg-white shadow rounded-xl p-4 border-l-8
    ${borderColor(order.status)}
  `;

  card.innerHTML = `
    <div class="flex justify-between items-center mb-2">
      <h2 class="text-lg font-bold">Table ${order.tableId}</h2>
      <span class="text-sm text-gray-600">⏱ ${mins} min</span>
    </div>
  `;

  const list = document.createElement("ul");
  list.className = "list-disc pl-5 text-sm mb-4";
  order.items.forEach(i => {
    const li = document.createElement("li");
    li.textContent = `${i.name} × ${i.qty}`;
    list.appendChild(li);
  });

  const actions = document.createElement("div");
  actions.className = "flex gap-2";

  if (order.status === "pending") {
    actions.appendChild(btn("👨‍🍳 Accept", "yellow", () =>
      updateStatus(id, "cooking")
    ));
  }

  if (order.status === "cooking") {
    actions.appendChild(btn("✅ Mark Ready", "green", () =>
      updateStatus(id, "ready")
    ));
  }

  card.append(list, actions);
  ordersDiv.appendChild(card);
}

/* ================= BUTTON ================= */
function btn(text, color, onClick) {
  const styles = {
    yellow: "bg-yellow-500 hover:bg-yellow-600",
    green: "bg-green-600 hover:bg-green-700"
  };
  const b = document.createElement("button");
  b.textContent = text;
  b.className = `${styles[color]} text-white px-4 py-1 rounded text-sm`;
  b.onclick = onClick;
  return b;
}

/* ================= UPDATE ================= */
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

/* ================= INIT ================= */
loadOrders();
setInterval(loadOrders, 30000);
