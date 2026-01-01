/* ================= CONFIG ================= */
const API_BASE = "https://scan2eat-backend-production.up.railway.app";
const CASHIER_TOKEN = "scan2eat-cashier-secret";

/* ================= SOCKET ================= */
const socket = io(API_BASE);

/* ================= DOM ================= */
const ordersList = document.getElementById("ordersList");
const emptyState = document.getElementById("emptyState");
const menuList = document.getElementById("menuList");

/* ================= STATE ================= */
let cache = {};
let editingOrderId = null;
let editCart = {};
let fullMenuCache = [];

/* ================= LOAD ORDERS ================= */
async function loadOrders() {
  try {
    const res = await fetch(`${API_BASE}/api/orders`);
    if (!res.ok) throw new Error("Orders fetch failed");

    const orders = await res.json();
    ordersList.innerHTML = "";
    cache = {};

    if (!orders.length) {
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";
    orders
      .filter(o => o.status !== "completed")
      .forEach(renderOrder);

  } catch (err) {
    console.error("Cashier load error:", err);
  }
}

/* ================= RENDER ORDER ================= */
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
  actions.appendChild(btn("✏️ Edit", "blue", () => openEditOrder(id)));
  actions.appendChild(btn("🗑 Delete", "red", () => deleteOrder(id)));

  card.appendChild(ul);
  card.appendChild(actions);
  ordersList.appendChild(card);
}

/* ================= BUTTON ================= */
function btn(text, color, onClick) {
  const styles = {
    yellow: "bg-yellow-500 hover:bg-yellow-600",
    green: "bg-green-600 hover:bg-green-700",
    blue: "bg-blue-600 hover:bg-blue-700",
    red: "bg-red-600 hover:bg-red-700"
  };

  const b = document.createElement("button");
  b.textContent = text;
  b.className = `${styles[color]} text-white px-3 py-1 rounded text-sm`;
  b.onclick = onClick;
  return b;
}

/* ================= DELETE ORDER (UNCHANGED) ================= */
async function deleteOrder(id) {
  if (!confirm("Delete this order?")) return;

  await fetch(`${API_BASE}/api/orders/${id}`, {
    method: "DELETE",
    headers: {
      "x-access-token": CASHIER_TOKEN
    }
  });

  loadOrders();
}

/* ================= EDIT ORDER (FULL MENU EDIT) ================= */
async function openEditOrder(id) {
  editingOrderId = id;
  editCart = {};

  const order = cache[id];
  if (!order) return;

  if (!fullMenuCache.length) {
    const res = await fetch(`${API_BASE}/api/menu/all`, {
      headers: { "x-access-token": CASHIER_TOKEN }
    });
    fullMenuCache = await res.json();
  }

  order.items.forEach(i => {
    editCart[i.name] = {
      name: i.name,
      price: i.price,
      qty: i.qty
    };
  });

  showEditModal();
}

function showEditModal() {
  renderEditMenu();
  document.getElementById("editModal").classList.remove("hidden");
}

function closeEditModal() {
  document.getElementById("editModal").classList.add("hidden");
}

function renderEditMenu() {
  const list = document.getElementById("editMenuList");
  list.innerHTML = "";

  fullMenuCache.forEach(item => {
    if (!editCart[item.name]) {
      editCart[item.name] = {
        name: item.name,
        price: item.price,
        qty: 0
      };
    }

    const row = document.createElement("div");
    row.className = "flex justify-between items-center border p-2 rounded";

    row.innerHTML = `
      <span>${item.name} ₹${item.price}</span>
      <div class="flex items-center gap-2">
        <button onclick="changeEditQty('${item.name}', -1)">−</button>
        <span>${editCart[item.name].qty}</span>
        <button onclick="changeEditQty('${item.name}', 1)">+</button>
      </div>
    `;

    list.appendChild(row);
  });

  updateEditTotal();
}

function changeEditQty(name, delta) {
  editCart[name].qty = Math.max(0, editCart[name].qty + delta);
  renderEditMenu();
}

function updateEditTotal() {
  const total = Object.values(editCart)
    .reduce((s, i) => s + i.price * i.qty, 0);
  document.getElementById("editTotal").innerText = total;
}

async function saveEditModal() {
  const items = Object.values(editCart).filter(i => i.qty > 0);
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  await fetch(`${API_BASE}/api/orders/${editingOrderId}/edit`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-access-token": CASHIER_TOKEN
    },
    body: JSON.stringify({ items, total })
  });

  closeEditModal();
  loadOrders();
}

/* ================= UPDATE STATUS ================= */
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

/* ================= PRINT BILL ================= */
function printBill(id) {
  const o = cache[id];
  if (!o) return;

  let rows = "";
  o.items.forEach(i => {
    rows += `<tr><td>${i.name} × ${i.qty}</td><td align="right">₹ ${i.price * i.qty}</td></tr>`;
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
socket.on("order:update", () => {
  loadOrders();
  loadAnalytics();
});

/* ================= MENU MANAGEMENT (UNCHANGED) ================= */
async function loadMenu() {
  try {
    const res = await fetch(`${API_BASE}/api/menu/all`, {
      headers: { "x-access-token": CASHIER_TOKEN }
    });

    if (!res.ok) throw new Error("Menu fetch failed");

    const items = await res.json();
    menuList.innerHTML = "";

    items.forEach(item => {
      const div = document.createElement("div");
      div.className = "bg-white p-4 rounded shadow flex justify-between items-center";

      div.innerHTML = `
        <div>
          <p class="font-bold">${item.name} (₹${item.price})</p>
          <p class="text-sm text-gray-600">${item.description || ""}</p>
        </div>
        <label class="flex gap-2 items-center">
          <input type="checkbox"
            ${item.available ? "checked" : ""}
            onchange="toggleMenu('${item._id}', this.checked)">
          Available
        </label>
      `;

      menuList.appendChild(div);
    });
  } catch (err) {
    console.error("Menu load error:", err);
  }
}

async function toggleMenu(id, available) {
  await fetch(`${API_BASE}/api/menu/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-access-token": CASHIER_TOKEN
    },
    body: JSON.stringify({ available })
  });
}

/* ================= ANALYTICS ================= */
async function loadAnalytics() {
  try {
    const res = await fetch(`${API_BASE}/api/analytics/today`, {
      headers: { "x-access-token": CASHIER_TOKEN }
    });

    const data = await res.json();
    document.getElementById("a_orders").innerText = data.totalOrders;
    document.getElementById("a_revenue").innerText = data.totalRevenue;
  } catch (err) {
    console.error("Analytics load error:", err);
  }
}

/* ================= INIT ================= */
loadOrders();
loadMenu();
loadAnalytics();
