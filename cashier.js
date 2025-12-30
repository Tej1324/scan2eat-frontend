/* ================= CONFIG ================= */
const API_BASE = "https://YOUR-RAILWAY-BACKEND.up.railway.app"; // 🔁 CHANGE THIS
const CASHIER_TOKEN = "scan2eat-cashier-secret";

/* ================= SOCKET ================= */
const socket = io(API_BASE);

/* ================= DOM ================= */
const ordersList = document.getElementById("ordersList");
const emptyState = document.getElementById("emptyState");

/* ================= STATE ================= */
let cache = {};

/* ================= LOAD ================= */
async function loadOrders() {
  try {
    const res = await fetch(`${API_BASE}/api/orders`);
    const orders = await res.json();

    ordersList.innerHTML = "";
    cache = {};

    if (!orders.length) {
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";
    orders.forEach(renderOrder);
  } catch (err) {
    console.error("Cashier load error:", err);
  }
}

/* ================= RENDER ================= */
function renderOrder(order) {
  const id = order._id;
  cache[id] = order;

  const card = document.createElement("div");
  card.className = "bg-white p-4 rounded shadow";

  const statusLabel = {
    pending: "🆕 Pending",
    cooking: "🔥 Cooking",
    ready: "🟢 Ready",
    completed: "✅ Completed"
  };

  card.innerHTML = `
    <div class="flex justify-between items-center mb-1">
      <h3 class="font-semibold">Table ${order.tableId}</h3>
      <span class="text-sm">${statusLabel[order.status]}</span>
    </div>
    <p class="text-sm font-medium mb-2">Total: ₹ ${order.total}</p>
  `;

  const ul = document.createElement("ul");
  ul.className = "text-sm mb-3 list-disc pl-5";
  order.items.forEach(i => {
    const li = document.createElement("li");
    li.textContent = `${i.name} × ${i.qty}`;
    ul.appendChild(li);
  });

  const actions = document.createElement("div");
  actions.className = "flex flex-wrap gap-2";

  if (order.status === "pending") {
    actions.appendChild(btn("👨‍🍳 Accept", "yellow", () =>
      updateStatus(id, "cooking")
    ));
  }

  if (order.status === "ready") {
    actions.appendChild(btn("✅ Complete", "green", () =>
      updateStatus(id, "completed")
    ));
  }

  actions.appendChild(btn("🧾 Print Bill", "blue", () => printBill(id)));

  card.appendChild(ul);
  card.appendChild(actions);
  ordersList.appendChild(card);
}

/* ================= BUTTON ================= */
function btn(text, color, onClick) {
  const styles = {
    yellow: "bg-yellow-500 hover:bg-yellow-600",
    green: "bg-green-600 hover:bg-green-700",
    blue: "bg-blue-600 hover:bg-blue-700"
  };
  const b = document.createElement("button");
  b.textContent = text;
  b.className = `${styles[color]} text-white px-3 py-1 rounded text-sm`;
  b.onclick = onClick;
  return b;
}

/* ================= UPDATE ================= */
async function updateStatus(id, status) {
  await fetch(`${API_BASE}/api/orders/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-access-token": CASHIER_TOKEN
    },
    body: JSON.stringify({ status })
  });
}

/* ================= PRINT ================= */
function printBill(id) {
  const o = cache[id];
  if (!o) return;

  let rows = "";
  o.items.forEach(i => {
    rows += `
      <tr>
        <td>${i.name} × ${i.qty}</td>
        <td align="right">₹ ${i.price * i.qty}</td>
      </tr>
    `;
  });

  const w = window.open("", "BILL", "width=300,height=400");
  w.document.write(`
    <body style="font-family:monospace">
      <h3 align="center">SCAN2EAT</h3>
      <p>Table: ${o.tableId}</p>
      <hr/>
      <table width="100%">${rows}</table>
      <hr/>
      <h3>Total: ₹ ${o.total}</h3>
    </body>
  `);
  w.document.close();
  w.print();
  w.close();
}

/* ================= SOCKET ================= */
socket.on("order:new", loadOrders);
socket.on("order:update", loadOrders);

/* ================= INIT ================= */
loadOrders();
