/* ================= CONFIG ================= */
const API_BASE = "https://scan2eat-backend-production.up.railway.app";

/* ================= TABLE ================= */
const params = new URLSearchParams(window.location.search);
const tableId = Number(params.get("table"));

if (!tableId || isNaN(tableId) || tableId <= 0) {
  alert("Invalid table ID");
  window.location.href = "./menu.html";
}

document.getElementById("tableId").innerText = tableId;

/* ================= CART ================= */
const cartKey = `cart_table_${tableId}`;
let cart = JSON.parse(localStorage.getItem(cartKey)) || [];

const cartItemsDiv = document.getElementById("cartItems");
const totalSpan = document.getElementById("total");
const emptyMessage = document.getElementById("emptyMessage");
const summarySection = document.getElementById("summarySection");
const optionsSection = document.getElementById("optionsSection");

/* ================= HELPERS ================= */
function cartTotal() {
  return cart.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function finalTotal() {
  const tip = Number(document.getElementById("tip").value);
  return cartTotal() + tip;
}

/* ================= RENDER ================= */
function renderCart() {
  cartItemsDiv.innerHTML = "";

  if (!cart.length) {
    emptyMessage.classList.remove("hidden");
    summarySection.classList.add("hidden");
    optionsSection.classList.add("hidden");
    totalSpan.textContent = "0";
    return;
  }

  emptyMessage.classList.add("hidden");
  summarySection.classList.remove("hidden");
  optionsSection.classList.remove("hidden");

  cart.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = "bg-white p-4 rounded shadow";

    div.innerHTML = `
      <div class="flex justify-between">
        <div>
          <h3 class="font-semibold">${item.emoji || ""} ${item.name}</h3>
          <p class="text-sm text-gray-600">
            ₹${item.price} × ${item.qty}
          </p>
          ${item.spec ? `<p class="text-xs italic text-gray-500">Spec: ${item.spec}</p>` : ""}
        </div>
        <div class="flex items-center gap-2">
          <button onclick="updateQty(${idx}, -1)" class="px-2 border rounded">-</button>
          <span>${item.qty}</span>
          <button onclick="updateQty(${idx}, 1)" class="px-2 border rounded">+</button>
        </div>
      </div>
    `;

    cartItemsDiv.appendChild(div);
  });

  totalSpan.textContent = finalTotal();
}

/* ================= ACTIONS ================= */
function updateQty(index, delta) {
  cart[index].qty += delta;
  if (cart[index].qty <= 0) cart.splice(index, 1);
  localStorage.setItem(cartKey, JSON.stringify(cart));
  renderCart();
}

document.getElementById("tip").addEventListener("change", () => {
  totalSpan.textContent = finalTotal();
});

/* ================= PLACE ORDER ================= */
async function placeOrder() {
  if (!cart.length) return;

  const btn = document.getElementById("placeBtn");
  btn.disabled = true;
  btn.textContent = "⏳ Placing Order...";

  const orderType = document.querySelector('input[name="orderType"]:checked').value;
  const note = document.getElementById("orderNote").value.trim();
  const tip = Number(document.getElementById("tip").value);

  const items = cart.map(i => ({
    name: i.name,
    price: i.price,
    qty: i.qty
  }));

  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId, items, orderType, note, tip })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Order failed");

    localStorage.removeItem(cartKey);
    alert("✅ Order placed successfully!");
    window.location.href = `./menu.html?table=${tableId}`;

  } catch (err) {
    alert(err.message);
    btn.disabled = false;
    btn.textContent = "✅ Place Order";
  }
}

/* ================= INIT ================= */
renderCart();
