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
    orders.forEach(renderOrder);
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
socket.on("order:update", loadOrders);

/* ================= MENU MANAGEMENT ================= */

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

async function addMenuItem() {
  const name = document.getElementById("m_name").value;
  const price = Number(document.getElementById("m_price").value);
  const imageUrl = document.getElementById("m_image").value;
  const description = document.getElementById("m_desc").value;

  await fetch(`${API_BASE}/api/menu`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-access-token": CASHIER_TOKEN
    },
    body: JSON.stringify({ name, price, imageUrl, description })
  });

  loadMenu();
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

/* ================= INIT ================= */
loadOrders();
loadMenu();
