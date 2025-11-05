const cartItemsEl = document.querySelector("#cart-items");
const cartTotalEl = document.querySelector("#cart-total");
const clearCartBtn = document.querySelector("#clear-cart");
const checkoutBtn = document.querySelector("#checkout");
const yearEl = document.querySelector("#year");
const addToCartButtons = document.querySelectorAll("[data-product]");
const cartCountEl = document.querySelector("#cart-count");
const cartToggleBtn = document.querySelector("#cart-toggle");
const cartNavCountEl = document.querySelector("[data-cart-count]");
const cartOpenTriggers = document.querySelectorAll("[data-cart-open]");
const cartDrawer = document.querySelector("#cart-drawer");
const drawerOverlay = document.querySelector("#drawer-overlay");
const closeCartBtn = document.querySelector("#close-cart");
const cartProgressBar = document.querySelector("#cart-progress");
const cartProgressLabel = document.querySelector("#cart-progress-label");
const toastStack = document.querySelector("#toast-stack");
const celebration = document.querySelector("#celebration");
const celebrationSummary = document.querySelector("#celebration-summary");
const celebrationClose = document.querySelector("#celebration-close");
const celebrationCta = document.querySelector("#celebration-cta");
const tourModal = document.querySelector("#tour-modal");
const flavorModal = document.querySelector("#flavor-modal");
const openTourBtn = document.querySelector("#open-tour");
const openFlavorLabBtn = document.querySelector("#open-flavor-lab");
const flavorForm = document.querySelector("#flavor-form");
const flavorResult = document.querySelector("#flavor-result");
const heroTimers = document.querySelectorAll(".hero__timer");
const sectionsToAnimate = document.querySelectorAll("[data-animate]");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const shippingThreshold = 45;
const TRANSITION_DURATION = 450;

const cart = new Map();
const productCatalog = new Map();

let lastInteractedItem = null;
let scrollLocks = 0;
let activeModal = null;
let lastCartOpener = null;
let lastModalOpener = null;

function lockScroll() {
  scrollLocks += 1;
  document.body.classList.add("no-scroll");
}

function unlockScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) {
    document.body.classList.remove("no-scroll");
  }
}

function showElement(element, visibleClass) {
  if (!element) {
    return;
  }

  element.hidden = false;

  requestAnimationFrame(() => {
    element.classList.add(visibleClass);
  });
}

function hideElement(element, visibleClass) {
  if (!element || element.hidden) {
    return;
  }

  element.classList.remove(visibleClass);

  const timeout = prefersReducedMotion.matches ? 0 : TRANSITION_DURATION;

  window.setTimeout(() => {
    element.hidden = true;
  }, timeout);
}

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

  if (cartNavCountEl) {
    cartNavCountEl.textContent = quantity;
  }

  const label = quantity === 1 ? "1 item" : `${quantity} items`;

  cartOpenTriggers.forEach((trigger) => {
    trigger.setAttribute(
      "aria-label",
      `View basket with ${quantity === 0 ? "no items" : label}`
    );
  });
}

function updateShippingProgress() {
  if (!cartProgressBar || !cartProgressLabel) {
    return;
  }

  const { total } = getCartMetrics();
  const progress = Math.min(total / shippingThreshold, 1);

  cartProgressBar.style.setProperty("--progress", progress);

  const progressContainer = cartProgressBar.closest(".cart-panel__progress");

  if (progress >= 1) {
    cartProgressLabel.textContent = "Free shipping unlocked!";
    progressContainer?.classList.add("is-achieved");
  } else {
    const remaining = shippingThreshold - total;
    cartProgressLabel.textContent = `Spend ${formatCurrency(
      remaining
    )} more for free shipping`;
    progressContainer?.classList.remove("is-achieved");
  }
}

function createEmptyCartMessage() {
  const emptyState = document.createElement("li");
  emptyState.classList.add("cart-panel__empty");
  emptyState.innerHTML = `
    <div class="cart-panel__empty-copy">
      <p class="cart-panel__empty-title">Your basket is feeling light</p>
      <p class="cart-panel__empty-subtitle">Add a best seller to start wagging tails.</p>
    </div>
  `;

  const exploreButton = document.createElement("button");
  exploreButton.classList.add("btn", "btn--accent", "cart-panel__explore");
  exploreButton.type = "button";
  exploreButton.textContent = "Explore weekly best sellers";
  exploreButton.addEventListener("click", () => {
    closeCart();
    document.querySelector("#treats")?.scrollIntoView({ behavior: "smooth" });
  });

  emptyState.appendChild(exploreButton);

  return emptyState;
}

function createCartItemElement(name, item) {
  const li = document.createElement("li");
  li.classList.add("cart-item");

  const infoDiv = document.createElement("div");
  infoDiv.classList.add("cart-item__info");

  const headingDiv = document.createElement("div");
  headingDiv.classList.add("cart-item__heading");

  const nameSpan = document.createElement("span");
  nameSpan.classList.add("cart-item__name");
  nameSpan.textContent = name;

  headingDiv.appendChild(nameSpan);

  if (item.pack) {
    const packSpan = document.createElement("span");
    packSpan.classList.add("cart-item__pack");
    packSpan.textContent = item.pack;
    headingDiv.appendChild(packSpan);
  }

  infoDiv.appendChild(headingDiv);

  const priceSpan = document.createElement("span");
  priceSpan.classList.add("cart-item__price");
  priceSpan.textContent = `${item.quantity} × ${formatCurrency(
    item.price
  )}`;

  infoDiv.appendChild(priceSpan);

  const lineTotal = document.createElement("span");
  lineTotal.classList.add("cart-item__line-total");
  lineTotal.textContent = formatCurrency(item.price * item.quantity);
  infoDiv.appendChild(lineTotal);

  li.appendChild(infoDiv);

  const controlsDiv = document.createElement("div");
  controlsDiv.classList.add("cart-item__controls");

  const quantityControl = document.createElement("div");
  quantityControl.classList.add("cart-item__quantity");

  const minusBtn = document.createElement("button");
  minusBtn.classList.add("cart-item__quantity-btn");
  minusBtn.type = "button";
  minusBtn.setAttribute("aria-label", `Decrease quantity of ${name}`);
  minusBtn.textContent = "−";
  minusBtn.addEventListener("click", () => {
    lastInteractedItem = name;
    updateItemQuantity(name, item.quantity - 1);
  });

  const quantityValue = document.createElement("span");
  quantityValue.classList.add("cart-item__quantity-value");
  quantityValue.setAttribute("aria-live", "polite");
  quantityValue.textContent = item.quantity;

  const plusBtn = document.createElement("button");
  plusBtn.classList.add("cart-item__quantity-btn");
  plusBtn.type = "button";
  plusBtn.setAttribute("aria-label", `Increase quantity of ${name}`);
  plusBtn.textContent = "+";
  plusBtn.addEventListener("click", () => {
    lastInteractedItem = name;
    updateItemQuantity(name, item.quantity + 1);
  });

  quantityControl.appendChild(minusBtn);
  quantityControl.appendChild(quantityValue);
  quantityControl.appendChild(plusBtn);

  const removeBtn = document.createElement("button");
  removeBtn.classList.add("cart-item__remove");
  removeBtn.type = "button";
  removeBtn.textContent = "Remove";
  removeBtn.setAttribute("aria-label", `Remove ${name} from basket`);
  removeBtn.addEventListener("click", () => {
    removeItem(name);
  });

  controlsDiv.appendChild(quantityControl);
  controlsDiv.appendChild(removeBtn);

  li.appendChild(controlsDiv);

  if (name === lastInteractedItem) {
    requestAnimationFrame(() => {
      li.classList.add("is-active");
      li.addEventListener(
        "animationend",
        () => {
          li.classList.remove("is-active");
        },
        { once: true }
      );
    });
  }

  return li;
}

function renderCart() {
  if (!cartItemsEl || !cartTotalEl || !checkoutBtn || !clearCartBtn) {
    return;
  }

  cartItemsEl.innerHTML = "";

  if (cart.size === 0) {
    cartItemsEl.appendChild(createEmptyCartMessage());
    cartTotalEl.textContent = formatCurrency(0);
    checkoutBtn.disabled = true;
    checkoutBtn.classList.add("btn--disabled");
    clearCartBtn.disabled = true;
    clearCartBtn.classList.add("btn--disabled");
    updateCartBadge();
    updateShippingProgress();
    lastInteractedItem = null;
    return;
  }

  checkoutBtn.disabled = false;
  checkoutBtn.classList.remove("btn--disabled");
  clearCartBtn.disabled = false;
  clearCartBtn.classList.remove("btn--disabled");

  cart.forEach((item, name) => {
    const itemElement = createCartItemElement(name, item);
    cartItemsEl.appendChild(itemElement);
  });

  const { total } = getCartMetrics();
  cartTotalEl.textContent = formatCurrency(total);
  updateCartBadge();
  updateShippingProgress();
  lastInteractedItem = null;
}

function addItemToCart(name, quantity = 1) {
  const product = productCatalog.get(name);

  if (!product) {
    return;
  }

  const existing = cart.get(name);

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.set(name, { price: product.price, quantity, pack: product.pack });
  }
}

function updateItemQuantity(name, newQuantity) {
  const item = cart.get(name);

  if (!item) {
    return;
  }

  if (newQuantity <= 0) {
    removeItem(name);
    return;
  }

  item.quantity = newQuantity;
  renderCart();
}

function removeItem(name) {
  if (!cart.has(name)) {
    return;
  }

  cart.delete(name);
  renderCart();
  showToast(name, "Removed from basket");
}

function animateCartBadge() {
  cartToggleBtn?.classList.add("cart-summary--pulse");
  cartNavCountEl?.classList.add("site-header__link-count--pulse");

  window.setTimeout(() => {
    cartToggleBtn?.classList.remove("cart-summary--pulse");
    cartNavCountEl?.classList.remove("site-header__link-count--pulse");
  }, prefersReducedMotion.matches ? 0 : 600);
}

function showToast(title, message) {
  if (!toastStack) {
    return;
  }

  const toast = document.createElement("div");
  toast.classList.add("toast");
  toast.innerHTML = `
    <strong>${title}</strong>
    <span>${message}</span>
  `;

  toastStack.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("is-visible");
  });

  const lifetime = prefersReducedMotion.matches ? 2500 : 4200;

  window.setTimeout(() => {
    toast.classList.remove("is-visible");
    window.setTimeout(() => {
      toast.remove();
    }, prefersReducedMotion.matches ? 0 : 250);
  }, lifetime);
}

function openCart() {
  if (!cartDrawer) {
    return;
  }

  showElement(cartDrawer, "is-open");
  cartDrawer.setAttribute("aria-hidden", "false");
  showElement(drawerOverlay, "is-visible");
  cartOpenTriggers.forEach((trigger) => trigger.setAttribute("aria-expanded", "true"));
  lockScroll();
  window.setTimeout(() => {
    (closeCartBtn ?? cartDrawer).focus({ preventScroll: true });
  }, prefersReducedMotion.matches ? 0 : 200);
}

function closeCart() {
  if (!cartDrawer) {
    return;
  }

  hideElement(cartDrawer, "is-open");
  cartDrawer.setAttribute("aria-hidden", "true");
  cartOpenTriggers.forEach((trigger) => trigger.setAttribute("aria-expanded", "false"));
  hideElement(drawerOverlay, "is-visible");
  unlockScroll();
  window.setTimeout(() => {
    lastCartOpener?.focus({ preventScroll: true });
  }, prefersReducedMotion.matches ? 0 : 200);
}

function openModal(modal, opener = null) {
  if (!modal) {
    return;
  }

  lastModalOpener = opener;
  activeModal = modal;
  showElement(modal, "is-visible");
  lockScroll();
  window.setTimeout(() => {
    modal.querySelector("[data-modal-close]")?.focus({ preventScroll: true });
  }, prefersReducedMotion.matches ? 0 : 200);
}

function closeModal(modal) {
  if (!modal) {
    return;
  }

  hideElement(modal, "is-visible");
  unlockScroll();

  if (activeModal === modal) {
    activeModal = null;
  }

  window.setTimeout(() => {
    if (!activeModal) {
      lastModalOpener?.focus({ preventScroll: true });
    }
  }, prefersReducedMotion.matches ? 0 : 150);
}

function openCelebration(summaryText) {
  if (!celebration || !celebrationSummary) {
    return;
  }

  celebrationSummary.textContent = summaryText;
  showElement(celebration, "is-visible");
  lockScroll();
  window.setTimeout(() => {
    celebrationClose?.focus({ preventScroll: true });
  }, prefersReducedMotion.matches ? 0 : 250);
}

function closeCelebration() {
  if (!celebration) {
    return;
  }

  hideElement(celebration, "is-visible");
  unlockScroll();
}

function handleFlavorRecommendation(formData) {
  const vibe = formData.get("vibe");
  const textures = formData.getAll("texture");
  const boosters = formData.getAll("booster");

  const picks = new Set();

  textures.forEach((texture) => {
    if (texture === "Crunchy") {
      picks.add("Maple Bacon Crunchies");
    }
    if (texture === "Soft") {
      picks.add("Peanut Butter Pumpkin Bites");
    }
    if (texture === "Chewy") {
      picks.add("Sweet Potato Chew Sticks");
    }
  });

  if (vibe === "Adventurous") {
    picks.add("Blueberry Yogurt Donuts");
  }

  if (vibe === "Sensitive") {
    picks.add("Peanut Butter Pumpkin Bites");
    picks.add("Sweet Potato Chew Sticks");
  }

  if (vibe === "Training") {
    picks.add("Peanut Butter Pumpkin Bites");
    picks.add("Maple Bacon Crunchies");
  }

  if (boosters.includes("Joint")) {
    picks.add("Sweet Potato Chew Sticks");
  }

  if (boosters.includes("Skin")) {
    picks.add("Blueberry Yogurt Donuts");
  }

  if (boosters.includes("Calm")) {
    picks.add("Peanut Butter Pumpkin Bites");
  }

  const selection = Array.from(picks).slice(0, 3);

  let recommendation = "";

  if (selection.length === 0) {
    recommendation =
      "Try mixing crunchy Maple Bacon Crunchies with the soft Pumpkin Bites for a balanced sampler.";
    selection.push("Maple Bacon Crunchies", "Peanut Butter Pumpkin Bites");
  } else {
    recommendation = `We curated a tasting flight built for ${vibe?.toLowerCase() ?? "your pup"}.`;
  }

  const listMarkup = selection
    .map((name) => `<li>${name}</li>`)
    .join("\n");

  flavorResult.innerHTML = `
    <p>${recommendation}</p>
    <ul class="modal__list">${listMarkup}</ul>
    <button class="btn btn--accent modal__bundle" type="button" data-add-bundle>
      Add tasting flight to basket
    </button>
  `;

  flavorResult.dataset.selection = JSON.stringify(selection);
}

function setupHeroTimers() {
  if (prefersReducedMotion.matches || heroTimers.length === 0) {
    return;
  }

  let index = 0;
  heroTimers[index].classList.add("is-active");

  window.setInterval(() => {
    heroTimers[index].classList.remove("is-active");
    index = (index + 1) % heroTimers.length;
    heroTimers[index].classList.add("is-active");
  }, 4000);
}

function setupSectionObserver() {
  if (sectionsToAnimate.length === 0) {
    return;
  }

  if (prefersReducedMotion.matches) {
    sectionsToAnimate.forEach((section) => section.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  sectionsToAnimate.forEach((section) => observer.observe(section));
}

if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

addToCartButtons.forEach((button) => {
  const name = button.dataset.product;
  const price = Number.parseFloat(button.dataset.price);
  const pack = button.dataset.pack || "";

  productCatalog.set(name, { price, pack });

  button.addEventListener("click", () => {
    lastInteractedItem = name;
    addItemToCart(name, 1);
    renderCart();
    animateCartBadge();
    showToast(name, "Added to basket");
  });
});

clearCartBtn?.addEventListener("click", () => {
  if (cart.size === 0) {
    return;
  }

  cart.clear();
  renderCart();
  showToast("Basket", "Cleared all items");
});

checkoutBtn?.addEventListener("click", () => {
  if (cart.size === 0) {
    return;
  }

  const items = Array.from(cart.entries()).map(([name, item]) => {
    const packInfo = item.pack ? ` (${item.pack})` : "";
    return `${item.quantity} × ${name}${packInfo}`;
  });
  const { total } = getCartMetrics();

  const summary = `You picked ${items.join(", ")}. Your total is ${formatCurrency(
    total
  )}. We\'ll email your invoice and baking schedule shortly.`;

  closeCart();
  openCelebration(summary);
  cart.clear();
  renderCart();
});

cartOpenTriggers.forEach((trigger) => {
  trigger.addEventListener("click", () => {
    lastCartOpener = trigger;
    renderCart();
    openCart();
  });
});

closeCartBtn?.addEventListener("click", () => {
  closeCart();
});

drawerOverlay?.addEventListener("click", () => {
  closeCart();
});

celebrationClose?.addEventListener("click", () => {
  closeCelebration();
});

celebration?.addEventListener("click", (event) => {
  if (event.target === celebration) {
    closeCelebration();
  }
});

celebrationCta?.addEventListener("click", () => {
  closeCelebration();
  document.querySelector("#treats")?.scrollIntoView({ behavior: "smooth" });
});

openTourBtn?.addEventListener("click", (event) => {
  openModal(tourModal, event.currentTarget);
});

openFlavorLabBtn?.addEventListener("click", (event) => {
  openModal(flavorModal, event.currentTarget);
});

flavorForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(flavorForm);
  handleFlavorRecommendation(formData);
});

flavorResult?.addEventListener("click", (event) => {
  if (!(event.target instanceof HTMLElement)) {
    return;
  }

  if (event.target.matches("[data-add-bundle]")) {
    const selection = flavorResult.dataset.selection
      ? JSON.parse(flavorResult.dataset.selection)
      : [];

    if (selection.length === 0) {
      return;
    }

    selection.forEach((name) => {
      lastInteractedItem = name;
      addItemToCart(name, 1);
    });

    renderCart();
    animateCartBadge();
    showToast("Flavor Lab", "Tasting flight added to basket");
    closeModal(flavorModal);
    openCart();
  }
});

const modalCloseButtons = document.querySelectorAll("[data-modal-close]");

modalCloseButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const modal = button.closest(".modal");
    closeModal(modal);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  if (celebration && !celebration.hidden) {
    closeCelebration();
    return;
  }

  if (activeModal) {
    closeModal(activeModal);
    return;
  }

  if (cartDrawer && !cartDrawer.hidden && cartDrawer.classList.contains("is-open")) {
    closeCart();
  }
});

setupHeroTimers();
setupSectionObserver();
renderCart();
