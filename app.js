const STORAGE_KEY = 'trasi_cart';

function safeJsonParse(data, fallback) {
  try {
    return JSON.parse(data) || fallback;
  } catch (error) {
    return fallback;
  }
}

function getCart() {
  return safeJsonParse(localStorage.getItem(STORAGE_KEY), []);
}

function saveCart(cart) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const cart = getCart();
  const total = cart.reduce((sum, item) => sum + item.qty, 0);
  document.querySelectorAll('#cart-count').forEach((node) => {
    node.textContent = total;
  });
}

function getFallbackImage() {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
      <rect width="100%" height="100%" fill="#f2f2f2"/>
      <rect x="20" y="20" width="760" height="760" rx="26" fill="#ffffff" stroke="#d8d8d8"/>
      <text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="54" fill="#111111">TRASI</text>
      <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="22" fill="#666666">Produit</text>
    </svg>
  `)}`;
}

function bindImageFallback(element, src) {
  const fallback = getFallbackImage();
  element.src = src;
  element.onerror = () => {
    element.src = fallback;
  };
}

async function loadProducts() {
  const response = await fetch('produits.json');
  const data = await response.json();
  return data.produits || [];
}

function buildProductCard(product) {
  const percentage = Math.round(((product.ancienPrix - product.prix) / product.ancienPrix) * 100);

  return `
    <article class="product-card">
      <div class="image-wrap">
        <span class="discount-tag">- ${percentage}%</span>
        <img src="${product.image}" alt="${product.nom}" onerror="this.onerror=null;this.src='${getFallbackImage()}'" />
      </div>
      <div class="content">
        <div class="meta">
          <span class="category">${product.categorie}</span>
          <span class="badge">${product.badge}</span>
        </div>
        <h3>${product.nom}</h3>
        <p>${product.description}</p>
        <div class="product-price">
          <strong>${product.prix} €</strong>
          <span class="old">${product.ancienPrix} €</span>
        </div>
        <span class="stock">En stock - Expédition 24h</span>
        <a href="produit.html?id=${product.id}" class="btn">Voir le produit</a>
      </div>
    </article>
  `;
}

async function renderHomeProducts() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  const products = await loadProducts();
  grid.innerHTML = products.slice(0, 8).map(buildProductCard).join('');

  document.getElementById('searchInput')?.addEventListener('input', async (event) => {
    const q = event.target.value.trim().toLowerCase();
    const products = await loadProducts();
    const filtered = products.filter((product) =>
      product.nom.toLowerCase().includes(q) || product.categorie.toLowerCase().includes(q)
    );
    grid.innerHTML = filtered.slice(0, 8).map(buildProductCard).join('');
  });
}

function addToCart(productId) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === productId);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: productId, qty: 1 });
  }

  saveCart(cart);
  window.location.href = 'checkout.html';
}

async function renderProductDetail() {
  const container = document.getElementById('productDetail');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get('id')) || 1;
  const products = await loadProducts();
  const product = products.find((item) => Number(item.id) === id) || products[0];

  if (!product) {
    container.innerHTML = '<div class="empty-state">Produit introuvable.</div>';
    return;
  }

  const percentage = Math.round(((product.ancienPrix - product.prix) / product.ancienPrix) * 100);

  container.innerHTML = `
    <div class="product-detail-layout">
      <div class="product-gallery">
        <img src="${product.image}" alt="${product.nom}" onerror="this.onerror=null;this.src='${getFallbackImage()}'" />
      </div>

      <div class="product-detail">
        <span class="category">${product.categorie}</span>
        <h1>${product.nom}</h1>

        <div class="detail-price">
          <strong>${product.prix} €</strong>
          <span class="old">${product.ancienPrix} €</span>
          <span class="badge">- ${percentage}%</span>
        </div>

        <div class="stock-row">
          <span>En stock</span>
          <span>Expédition 24h</span>
        </div>

        <p>${product.description}</p>

        <button class="purchase-btn" onclick="addToCart(${product.id})">Ajouter au panier</button>

        <div class="meta-list">
          <div><strong>Livraison estimée :</strong> 48h</div>
          <div><strong>Retours :</strong> 14 jours</div>
          <div><strong>Paiement :</strong> à la livraison</div>
          <div><strong>Garantie :</strong> 2 ans</div>
        </div>
      </div>
    </div>

    <div class="product-info-grid">
      <div class="info-panel">
        <h3>Pourquoi ce produit ?</h3>
        <p>Une solution pratique, bien pensée et design pour améliorer votre quotidien.</p>
        <ul>
          <li>Qualité premium</li>
          <li>Conception robuste</li>
          <li>Simple d’utilisation</li>
          <li>Livraison rapide</li>
        </ul>
      </div>

      <div class="info-panel">
        <h3>Informations de livraison</h3>
        <ul>
          <li>Expédition sous 24h après validation</li>
          <li>Livraison rapide partout en France</li>
          <li>Retours sous 14 jours</li>
          <li>Garantie constructeur 2 ans</li>
        </ul>
      </div>
    </div>
  `;
}

function renderCart() {
  const container = document.getElementById('cartItems');
  if (!container) return;

  const cart = getCart();
  if (!cart.length) {
    container.innerHTML = '<div class="empty-state">Votre panier est vide pour le moment.</div>';
    document.getElementById('checkoutTotal')?.textContent = '0.00 €';
    return;
  }

  loadProducts().then((products) => {
    const items = cart
      .map((entry) => {
        const product = products.find((item) => Number(item.id) === Number(entry.id));
        if (!product) return null;
        return {
          ...product,
          qty: entry.qty,
          lineTotal: product.prix * entry.qty,
        };
      })
      .filter(Boolean);

    const total = items.reduce((sum, item) => sum + item.lineTotal, 0);

    container.innerHTML = items
      .map(
        (item) => `
          <div class="summary-item">
            <span>${item.nom} x${item.qty}</span>
            <span>${item.lineTotal.toFixed(2)} €</span>
          </div>
        `
      )
      .join('');

    const totalNode = document.getElementById('checkoutTotal');
    if (totalNode) totalNode.textContent = `${total.toFixed(2)} €`;
  });
}

function handleCheckoutSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('customerName')?.value?.trim();
  const phone = document.getElementById('customerPhone')?.value?.trim();
  const address = document.getElementById('customerAddress')?.value?.trim();
  const message = document.getElementById('orderMessage');

  if (!name || !phone || !address) {
    message.textContent = 'Veuillez remplir tous les champs du formulaire.';
    return;
  }

  const cart = getCart();
  if (!cart.length) {
    message.textContent = 'Votre panier est vide. Ajoutez un article avant de commander.';
    return;
  }

  const order = {
    name,
    phone,
    address,
    items: cart,
    date: new Date().toISOString(),
  };

  localStorage.setItem('trasi_last_order', JSON.stringify(order));
  localStorage.removeItem(STORAGE_KEY);
  updateCartCount();

  message.textContent = 'Commande enregistrée ! Vous recevrez un appel pour confirmer votre livraison.';
  message.style.color = '#1e9e5a';

  const form = document.getElementById('checkoutForm');
  if (form) form.reset();
  renderCart();
}

function initCheckoutPage() {
  const form = document.getElementById('checkoutForm');
  if (form) form.addEventListener('submit', handleCheckoutSubmit);
  renderCart();
}

document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  renderHomeProducts();
  renderProductDetail();
  initCheckoutPage();
});













































