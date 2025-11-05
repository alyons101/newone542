const cartItemsEl = document.querySelector("#cart-items");
const cartTotalEl = document.querySelector("#cart-total");
const clearCartBtn = document.querySelector("#clear-cart");
const checkoutBtn = document.querySelector("#checkout");
const yearEl = document.querySelector("#year");
const addToCartButtons = document.querySelectorAll("[data-product]");
const cartCountEl = document.querySelector("#cart-count");
const cartToggleBtn = document.querySelector("#cart-toggle");

const cart = new Map();

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function getCartMetrics() {
  let total = 0;
  let quantity = 0;

  cart.forEach((item) => {
    total += item.price * item.quantity;
    quantity += item.quantity;
  });

  return { total, quantity };
}

function updateCartBadge() {
  const { quantity } = getCartMetrics();

  if (cartCountEl) {
    cartCountEl.textContent = quantity;
  }

  if (cartToggleBtn) {
    const label = quantity === 1 ? "1 item" : `${quantity} items`;
    cartToggleBtn.setAttribute(
      "aria-label",
      `View basket with ${quantity === 0 ? "no items" : label}`
    );
  }
}

function createEmptyCartMessage() {
  const emptyMessage = document.createElement("li");
  emptyMessage.classList.add("cart__item", "cart__item--empty");
  emptyMessage.innerHTML = `
    <div class="cart__item-info">
      <span class="cart__item-name">Your basket is empty</span>
      <span class="cart__item-pack">Add a best seller to start wagging tails.</span>
    </div>
  `;
  return emptyMessage;
}

function renderCart() {
  cartItemsEl.innerHTML = "";

  if (cart.size === 0) {
    cartItemsEl.appendChild(createEmptyCartMessage());
    cartTotalEl.textContent = formatCurrency(0);
    checkoutBtn.disabled = true;
    checkoutBtn.classList.add("btn--disabled");
    updateCartBadge();
    return;
  }

  checkoutBtn.disabled = false;
  checkoutBtn.classList.remove("btn--disabled");

  cart.forEach((item, name) => {
    const li = document.createElement("li");
    li.classList.add("cart__item");

    const infoDiv = document.createElement("div");
    infoDiv.classList.add("cart__item-info");

    const headingDiv = document.createElement("div");
    headingDiv.classList.add("cart__item-heading");

    const nameSpan = document.createElement("span");
    nameSpan.classList.add("cart__item-name");
    nameSpan.textContent = name;

    headingDiv.appendChild(nameSpan);

    if (item.pack) {
      const packSpan = document.createElement("span");
      packSpan.classList.add("cart__item-pack");
      packSpan.textContent = item.pack;
      headingDiv.appendChild(packSpan);
    }

    infoDiv.appendChild(headingDiv);

    const priceSpan = document.createElement("span");
    priceSpan.classList.add("cart__item-price");
    priceSpan.textContent = `${item.quantity} × ${formatCurrency(
      item.price
    )} = ${formatCurrency(item.price * item.quantity)}`;

    infoDiv.appendChild(priceSpan);

    const controlsDiv = document.createElement("div");
    controlsDiv.classList.add("cart__controls");

    const quantityControl = document.createElement("div");
    quantityControl.classList.add("cart__quantity");

    const minusBtn = document.createElement("button");
    minusBtn.classList.add("cart__quantity-btn");
    minusBtn.type = "button";
    minusBtn.setAttribute("aria-label", `Decrease quantity of ${name}`);
    minusBtn.textContent = "−";
    minusBtn.addEventListener("click", () => {
      updateItemQuantity(name, item.quantity - 1);
    });

    const quantityValue = document.createElement("span");
    quantityValue.classList.add("cart__quantity-value");
    quantityValue.setAttribute("aria-live", "polite");
    quantityValue.textContent = item.quantity;

    const plusBtn = document.createElement("button");
    plusBtn.classList.add("cart__quantity-btn");
    plusBtn.type = "button";
    plusBtn.setAttribute("aria-label", `Increase quantity of ${name}`);
    plusBtn.textContent = "+";
    plusBtn.addEventListener("click", () => {
      updateItemQuantity(name, item.quantity + 1);
    });

    quantityControl.appendChild(minusBtn);
    quantityControl.appendChild(quantityValue);
    quantityControl.appendChild(plusBtn);

    const removeBtn = document.createElement("button");
    removeBtn.classList.add("cart__remove");
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.setAttribute("aria-label", `Remove ${name} from basket`);
    removeBtn.addEventListener("click", () => {
      cart.delete(name);
      renderCart();
    });

    controlsDiv.appendChild(quantityControl);
    controlsDiv.appendChild(removeBtn);

    li.appendChild(infoDiv);
    li.appendChild(controlsDiv);
    cartItemsEl.appendChild(li);
  });

  const { total } = getCartMetrics();
  cartTotalEl.textContent = formatCurrency(total);
  updateCartBadge();
}

addToCartButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const name = button.dataset.product;
    const price = Number.parseFloat(button.dataset.price);
    const pack = button.dataset.pack || "";

    const existing = cart.get(name);

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.set(name, { price, quantity: 1, pack });
    }

    renderCart();
  });
});

clearCartBtn.addEventListener("click", () => {
  cart.clear();
  renderCart();
});

checkoutBtn.addEventListener("click", () => {
  if (cart.size === 0) {
    return;
  }

  const items = Array.from(cart.entries()).map(([name, item]) => {
    const packInfo = item.pack ? ` (${item.pack})` : "";
    return `${item.quantity} × ${name}${packInfo}`;
  });
  const { total } = getCartMetrics();

  alert(
    `Thanks for shopping with Pawfect Bites! We'll send an invoice for: ${items.join(
      ", "
    )} totaling ${formatCurrency(total)}.`
  );

  cart.clear();
  renderCart();
});

if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

if (cartToggleBtn) {
  cartToggleBtn.addEventListener("click", () => {
    const cartSection = document.querySelector("#cart");

    if (cartSection) {
      cartSection.scrollIntoView({ behavior: "smooth" });
      cartToggleBtn.setAttribute("aria-expanded", "true");
      window.setTimeout(() => {
        cartToggleBtn.setAttribute("aria-expanded", "false");
      }, 800);
    }
  });
}

function updateItemQuantity(name, newQuantity) {
  const item = cart.get(name);

  if (!item) {
    return;
  }

  if (newQuantity <= 0) {
    cart.delete(name);
  } else {
    item.quantity = newQuantity;
  }

  renderCart();
}

renderCart();
