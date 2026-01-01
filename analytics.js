/* ================= CONFIG ================= */
const API_BASE = "https://scan2eat-backend-production.up.railway.app";
const CASHIER_TOKEN = "scan2eat-cashier-secret";
const GST_RATE = 0.05;

/* ================= SOCKET ================= */
const socket = io(API_BASE);

/* ================= DOM ================= */
const totalOrdersEl = document.getElementById("totalOrders");
const totalRevenueEl = document.getElementById("totalRevenue");
const gstEl = document.getElementById("gstAmount");
const netEl = document.getElementById("netRevenue");
const ordersDiv = document.getElementById("orders");
const insightsEl = document.getElementById("insights");

const fromInput = document.getElementById("fromDate");
const toInput = document.getElementById("toDate");

let lastOrders = [];

/* ================= HELPERS ================= */
function prepMinutes(o) {
  return Math.round(
    (new Date(o.updatedAt) - new Date(o.createdAt)) / 60000
  );
}

/* ================= LOAD RANGE ================= */
async function loadRange() {
  if (!fromInput.value || !toInput.value) {
    alert("Select date range");
    return;
  }

  const res = await fetch(
    `${API_BASE}/api/analytics/range?from=${fromInput.value}&to=${toInput.value}`,
    { headers: { "x-access-token": CASHIER_TOKEN } }
  );

  const data = await res.json();
  lastOrders = data.orders || [];

  const total = data.totalRevenue || 0;
  const gst = Math.round(total * GST_RATE);
  const net = total - gst;

  totalOrdersEl.innerText = data.totalOrders;
  totalRevenueEl.innerText = total;
  gstEl.innerText = gst;
  netEl.innerText = net;

  renderOrders(lastOrders);
  generateInsights(lastOrders);
}

/* ================= RENDER ORDERS ================= */
function renderOrders(orders) {
  ordersDiv.innerHTML = "";

  if (!orders.length) {
    ordersDiv.innerHTML =
      `<p class="text-sm text-gray-500">No orders</p>`;
    return;
  }

  orders.slice(-10).reverse().forEach(o => {
    const div = document.createElement("div");
    div.className =
      "bg-white rounded shadow p-3 text-sm flex justify-between";

    div.innerHTML = `
      <div>
        <strong>Table ${o.tableId}</strong>
        <p class="text-gray-600">₹ ${o.total}</p>
      </div>
      <span>${prepMinutes(o)} min</span>
    `;

    ordersDiv.appendChild(div);
  });
}

/* ================= AI INSIGHTS ================= */
function generateInsights(orders) {
  insightsEl.innerHTML = "";

  if (!orders.length) {
    insightsEl.innerHTML = "<li>No insights yet</li>";
    return;
  }

  // Slow tables
  const slowTables = {};
  orders.forEach(o => {
    const mins = prepMinutes(o);
    if (mins > 20) {
      slowTables[o.tableId] = true;
    }
  });

  if (Object.keys(slowTables).length) {
    insightsEl.innerHTML += `
      <li>⏱ Slow service detected at tables: 
      <b>${Object.keys(slowTables).join(", ")}</b></li>`;
  }

  // Best sellers
  const itemCount = {};
  orders.forEach(o =>
    o.items.forEach(i => {
      itemCount[i.name] = (itemCount[i.name] || 0) + i.qty;
    })
  );

  const best = Object.entries(itemCount)
    .sort((a, b) => b[1] - a[1])[0];

  if (best) {
    insightsEl.innerHTML += `
      <li>🔥 Best selling item:
      <b>${best[0]}</b> (${best[1]} sold)</li>`;
  }

  // Tax insight
  insightsEl.innerHTML += `
    <li>🧾 GST collected in this range:
    <b>₹ ${Math.round(
      orders.reduce((s, o) => s + o.total, 0) * GST_RATE
    )}</b></li>`;
}

/* ================= CSV EXPORT ================= */
function exportCSV() {
  if (!lastOrders.length) return alert("No data");

  let csv = "OrderID,Table,Total,GST,PrepTime,Date\n";

  lastOrders.forEach(o => {
    csv += `${o._id},${o.tableId},${o.total},${
      Math.round(o.total * GST_RATE)
    },${prepMinutes(o)},${o.createdAt}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "scan2eat-analytics.csv";
  a.click();
}

/* ================= SOCKET ================= */
socket.on("order:update", loadRange);
