/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");
const typingIndicator = document.getElementById("typingIndicator");
const productSearchInput = document.getElementById("productSearchInput");

let products = [];
let selectedProducts = [];
let chatHistory = [];
// Track search keyword
let searchKeyword = "";

/* Load product data from JSON file */
async function loadProducts() {
  // Fetch products.json and store products array
  const response = await fetch("products.json");
  const data = await response.json();
  products = data.products;
  renderProducts();
}

/* Create HTML for displaying product cards */
function renderProducts() {
  productsContainer.innerHTML = "";

  // Get current filter values
  const selectedCategory = categoryFilter.value;
  const hasCategory = selectedCategory && selectedCategory !== "";
  const hasSearch = searchKeyword && searchKeyword.length > 0;

  // Filtering logic:
  // - If neither filter is set, show all products.
  // - If only category is set, show products in that category.
  // - If only search is set, show products matching search.
  // - If both are set, show products matching both.
  let filtered = products;
  if (hasCategory && hasSearch) {
    filtered = products.filter(
      (p) =>
        p.category === selectedCategory &&
        (p.name.toLowerCase().includes(searchKeyword) ||
          p.description.toLowerCase().includes(searchKeyword))
    );
  } else if (hasCategory) {
    filtered = products.filter((p) => p.category === selectedCategory);
  } else if (hasSearch) {
    filtered = products.filter(
      (p) =>
        p.name.toLowerCase().includes(searchKeyword) ||
        p.description.toLowerCase().includes(searchKeyword)
    );
  }
  // If neither filter is set, filtered = products (all products)

  // Show placeholder only if no products match
  if (filtered.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No products found. Try another category or search.
      </div>
    `;
    return;
  }

  // Render product cards
  filtered.forEach((product, idx) => {
    // Check if selected
    const isSelected = selectedProducts.some((p) => p.name === product.name);
    // Product card HTML
    const card = document.createElement("div");
    card.className = `product-card${isSelected ? " selected" : ""}`;
    card.innerHTML = `
      <img src="${product.image}" alt="${product.name}" />
      <div class="product-info">
        <div class="product-brand">${product.brand}</div>
        <div class="product-name">${product.name}</div>
        <button class="more-info-btn" data-idx="${idx}">
          <i class="fa-solid fa-circle-info"></i>
        </button>
      </div>
      <div class="product-desc-overlay">
        <strong>Description:</strong>
        <p>${product.description}</p>
        <button class="more-info-btn close-desc-btn">Close</button>
      </div>
    `;
    // Select/unselect product
    card.addEventListener("click", (e) => {
      // Prevent toggle if clicking "More Info"
      if (e.target.closest(".more-info-btn")) return;
      toggleProductSelection(product);
    });
    // Show/hide description overlay
    card.querySelector(".more-info-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      card.classList.add("show-desc");
    });
    card.querySelector(".close-desc-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      card.classList.remove("show-desc");
    });
    productsContainer.appendChild(card);
  });
}

/* Toggle product selection */
function toggleProductSelection(product) {
  const idx = selectedProducts.findIndex((p) => p.name === product.name);
  if (idx > -1) {
    selectedProducts.splice(idx, 1);
  } else {
    selectedProducts.push(product);
  }
  saveSelectedProducts();
  renderProducts();
  renderSelectedProducts();
}

/* Render selected products panel */
function renderSelectedProducts() {
  selectedProductsList.innerHTML = "";
  selectedProducts.forEach((product, idx) => {
    const item = document.createElement("div");
    item.className = "selected-product-item";
    item.innerHTML = `
      <span>
        <strong>${product.name}</strong> <span style="color:var(--loreal-gold)">(${product.brand})</span>
      </span>
      <button class="remove-btn tooltip" data-idx="${idx}">
        <i class="fa-solid fa-xmark"></i>
        <span class="tooltiptext">Remove</span>
      </button>
    `;
    item.querySelector(".remove-btn").addEventListener("click", () => {
      selectedProducts.splice(idx, 1);
      saveSelectedProducts();
      renderProducts();
      renderSelectedProducts();
    });
    selectedProductsList.appendChild(item);
  });
  // Add clear all button if any selected
  if (selectedProducts.length) {
    const clearBtn = document.createElement("button");
    clearBtn.className = "clear-btn";
    clearBtn.textContent = "Clear All";
    clearBtn.addEventListener("click", () => {
      selectedProducts = [];
      saveSelectedProducts();
      renderProducts();
      renderSelectedProducts();
    });
    selectedProductsList.appendChild(clearBtn);
  }
}

/* Persist selected products in localStorage */
function saveSelectedProducts() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}
function loadSelectedProducts() {
  const saved = localStorage.getItem("selectedProducts");
  if (saved) {
    selectedProducts = JSON.parse(saved);
  }
}

/* Filter products by category */
categoryFilter.addEventListener("change", renderProducts);

/* Product search functionality */
productSearchInput.addEventListener("input", () => {
  searchKeyword = productSearchInput.value.trim().toLowerCase();
  renderProducts();
});

/* Detect RTL language from browser and set direction automatically */
const rtlLangs = ["ar", "he", "fa", "ur"];
const userLang = navigator.language || navigator.userLanguage || "";
if (rtlLangs.some((lang) => userLang.startsWith(lang))) {
  document.documentElement.dir = "rtl";
} else {
  document.documentElement.dir = "ltr";
}

/* Initial load */
loadSelectedProducts();
loadProducts();
renderSelectedProducts();

/* Show/hide typing indicator */
function showTypingIndicator() {
  typingIndicator.style.display = "flex";
}
function hideTypingIndicator() {
  typingIndicator.style.display = "none";
}

/* Generate Routine with AI */
generateRoutineBtn.addEventListener("click", async () => {
  if (!selectedProducts.length) return;
  showLoadingSpinner();
  showTypingIndicator();

  const inputString = `Generate a personalized beauty routine using these products: ${selectedProducts
    .map((p) => p.name)
    .join(", ")}`;

  chatHistory.push({
    role: "user",
    content: inputString,
  });

  renderChat();

  const res = await fetch(
    "https://loralchatbot-worker-gca.bennett-j1804.workers.dev/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: inputString,
        history: chatHistory,
      }),
    }
  );
  const data = await res.json();

  // Show error if backend returns error
  if (data.error) {
    chatHistory.push({
      role: "assistant",
      content: `Error: ${data.error} ${data.details ? data.details : ""}`,
    });
  } else {
    chatHistory.push({
      role: "assistant",
      content: data.reply,
    });
    showCopyRoutineBtn(data.reply);
  }
  hideLoadingSpinner();
  hideTypingIndicator();
  renderChat();
});

/* Loading animation */
function showLoadingSpinner() {
  chatWindow.innerHTML += `<div class="loading-spinner"></div>`;
  generateRoutineBtn.disabled = true;
}
function hideLoadingSpinner() {
  chatWindow.querySelector(".loading-spinner")?.remove();
  generateRoutineBtn.disabled = false;
}

/* Render chat window with bubbles and markdown formatting */
function renderChat() {
  chatWindow.innerHTML = "";
  chatHistory.forEach((msg) => {
    const div = document.createElement("div");
    div.className = `chat-message ${msg.role}`;
    // Use bubble for both user and assistant
    const bubble = document.createElement("span");
    bubble.className =
      "bubble " + (msg.role === "user" ? "user-bubble" : "assistant-bubble");
    if (msg.role === "assistant") {
      bubble.innerHTML = markdownToHtml(msg.content);
    } else {
      bubble.textContent = msg.content;
    }
    div.appendChild(bubble);
    chatWindow.appendChild(div);
  });
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Markdown to HTML (improved for headings, bold, italics, lists, links, emojis) */
function markdownToHtml(md) {
  let html = md;

  // Headings (###, ##, #)
  html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Lists (unordered)
  html = html.replace(/(^|\n)[*-] (.+)/g, "$1<li>$2</li>");
  html = html.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");

  // Ordered lists
  html = html.replace(/(^|\n)\d+\. (.+)/g, "$1<li>$2</li>");
  html = html.replace(/(<li>.*<\/li>)/gs, function (match) {
    // If previous <ul> exists, don't wrap again
    if (match.includes("<ul>")) return match;
    return "<ol>" + match + "</ol>";
  });

  // Markdown links [text](url)
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank">$1</a>'
  );

  // Emojis: convert :emoji: to Unicode using a simple map
  const emojiMap = {
    sparkle: "✨",
    star: "⭐",
    fire: "🔥",
    heart: "❤️",
    smile: "😊",
    blush: "😊",
    wink: "😉",
    wave: "👋",
    check: "✅",
    warning: "⚠️",
    info: "ℹ️",
    lipstick: "💄",
    eyes: "👀",
    sun: "☀️",
    moon: "🌙",
    droplet: "💧",
    face: "🧑",
    hair: "💇",
    perfume: "🧴",
    // Add more as needed
  };
  html = html.replace(/:([a-z_]+):/g, (match, p1) => emojiMap[p1] || match);

  // Line breaks
  html = html.replace(/\n/g, "<br>");

  return html;
}

/* Copy routine button */
function showCopyRoutineBtn(routineText) {
  // Remove previous copy button
  document.querySelector(".copy-btn")?.remove();
  const btn = document.createElement("button");
  btn.className = "copy-btn tooltip";
  btn.innerHTML = `<i class="fa-solid fa-copy"></i> Copy Routine
    <span class="tooltiptext">Copy to clipboard</span>`;
  btn.addEventListener("click", () => {
    navigator.clipboard.writeText(routineText);
    btn.textContent = "Copied!";
    setTimeout(() => {
      btn.innerHTML = `<i class="fa-solid fa-copy"></i> Copy Routine
        <span class="tooltiptext">Copy to clipboard</span>`;
    }, 1200);
  });
  chatWindow.appendChild(btn);
}

/* Chatbox follow-up */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const question = userInput.value.trim();
  if (!question) return;
  if (!isBeautyQuestion(question)) {
    chatWindow.innerHTML += `<div class="chat-message assistant"><span class="bubble assistant-bubble">Sorry, I can only answer questions about beauty, skincare, makeup, fragrance, and L'Oréal brand products.</span></div>`;
    userInput.value = "";
    return;
  }

  chatHistory.push({ role: "user", content: question });
  renderChat();
  showLoadingSpinner();
  showTypingIndicator();

  const res = await fetch(
    "https://loralchatbot-worker-gca.bennett-j1804.workers.dev/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: question,
        history: chatHistory,
      }),
    }
  );
  const data = await res.json();

  // Show error if backend returns error
  if (data.error) {
    chatHistory.push({
      role: "assistant",
      content: `Error: ${data.error} ${data.details ? data.details : ""}`,
    });
  } else {
    chatHistory.push({ role: "assistant", content: data.reply });
  }
  hideLoadingSpinner();
  hideTypingIndicator();
  renderChat();
  userInput.value = "";
});

/* Beauty question filter (simple) */
function isBeautyQuestion(q) {
  const keywords = [
    "beauty",
    "skincare",
    "makeup",
    "fragrance",
    "hair",
    "routine",
    "product",
    "l'oréal",
    "cerave",
    "garnier",
    "lancôme",
    "nyx",
    "maybelline",
  ];
  return keywords.some((k) => q.toLowerCase().includes(k));
}

/* End of script.js */
