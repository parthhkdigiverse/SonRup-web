// ─── API Configuration & Helpers ───
let APP_CONFIG = {};
let AUTH_TOKEN = localStorage.getItem("sonrup_token") || null;

async function loadAppConfig() {
    try {
        // Try fetching from API directly (when served on backend port)
        let res = await fetch("/api/config");
        if (!res.ok) {
            // When running on dedicated FRONTEND_PORT, load exported local config.json
            res = await fetch("/config.json");
            if (!res.ok) res = await fetch("config.json");
        }
        APP_CONFIG = await res.json();

        // Fetch live MongoDB settings from backend server directly
        if (APP_CONFIG.backend_port && window.location.port != APP_CONFIG.backend_port) {
            try {
                const liveRes = await fetch(`${window.location.protocol}//${window.location.hostname}:${APP_CONFIG.backend_port}/api/config`);
                if (liveRes.ok) {
                    const liveConfig = await liveRes.json();
                    APP_CONFIG = { ...APP_CONFIG, ...liveConfig };
                }
            } catch (e) { /* use cached config */ }
        }

        // Inject Dynamic Announcement Top Bar if configured
        if (APP_CONFIG.announcement_banner_enabled && APP_CONFIG.announcement_banner_text) {
            let banner = document.getElementById("sonrup-announcement-bar");
            if (!banner) {
                banner = document.createElement("div");
                banner.id = "sonrup-announcement-bar";
                banner.style.background = "linear-gradient(90deg, #181818, #C9A227 50%, #181818)";
                banner.style.color = "#000";
                banner.style.fontWeight = "800";
                banner.style.fontSize = "13px";
                banner.style.padding = "10px 16px";
                banner.style.textAlign = "center";
                banner.style.letterSpacing = "0.5px";
                banner.style.position = "relative";
                banner.style.zIndex = "1001";
                banner.style.width = "100%";
                banner.style.boxShadow = "0 2px 15px rgba(201,162,39,0.3)";

                const siteHeader = document.querySelector(".site-header") || document.querySelector("header");
                if (siteHeader && siteHeader.parentNode) {
                    siteHeader.parentNode.insertBefore(banner, siteHeader);
                } else {
                    document.body.prepend(banner);
                }
            }
            banner.textContent = APP_CONFIG.announcement_banner_text;
        }
    } catch (err) {
        console.warn("Could not load app config, using defaults.", err);
        APP_CONFIG = { backend_port: 8010 };
    }
}

function getApiBase() {
    if (!APP_CONFIG || !APP_CONFIG.backend_port) return "";
    // If browser port matches backend port, use clean relative URL
    if (window.location.port == APP_CONFIG.backend_port || (!window.location.port && APP_CONFIG.backend_port == "80")) {
        return "";
    }
    // If served on FRONTEND_PORT, resolve dynamically without fixed domain names
    return `${window.location.protocol}//${window.location.hostname}:${APP_CONFIG.backend_port}`;
}

function getAuthHeaders() {
    const headers = { "Content-Type": "application/json" };
    if (AUTH_TOKEN) {
        headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;
    }
    return headers;
}

function setAuth(token, user) {
    AUTH_TOKEN = token;
    localStorage.setItem("sonrup_token", token);
    localStorage.setItem("sonrup_user", JSON.stringify(user));
}

function clearAuth() {
    AUTH_TOKEN = null;
    localStorage.removeItem("sonrup_token");
    localStorage.removeItem("sonrup_user");
}

function isLoggedIn() {
    return !!AUTH_TOKEN;
}

// Initialize Lucide Icons
document.addEventListener("DOMContentLoaded", async () => {
    // Load frontend config from backend .env
    await loadAppConfig();

    if (window.lucide) {
        window.lucide.createIcons();
    }
    
    // Replace deprecated Lucide brand icons with custom high-resolution SVGs
    const socialIcons = {
        facebook: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>`,
        instagram: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>`,
        twitter: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`
    };
    document.querySelectorAll('.social-links a').forEach(a => {
        if (a.querySelector('[data-lucide="facebook"]') || (a.getAttribute('aria-label') && a.getAttribute('aria-label').toLowerCase().includes('facebook'))) a.innerHTML = socialIcons.facebook;
        if (a.querySelector('[data-lucide="instagram"]') || (a.getAttribute('aria-label') && a.getAttribute('aria-label').toLowerCase().includes('instagram'))) a.innerHTML = socialIcons.instagram;
        if (a.querySelector('[data-lucide="twitter"]') || (a.getAttribute('aria-label') && a.getAttribute('aria-label').toLowerCase().includes('twitter'))) a.innerHTML = socialIcons.twitter;
    });
    
    // 1. Header Scroll Effect
    const header = document.getElementById("main-header");
    window.addEventListener("scroll", () => {
        if (window.scrollY > 50) {
            header.classList.add("scrolled");
        } else {
            header.classList.remove("scrolled");
        }
    });





    // 2. Mobile Sticky Bottom Bar Visibility
    const stickyBottomBar = document.getElementById("mobile-sticky-bar");
    const heroSection = document.getElementById("combo-section");
    
    window.addEventListener("scroll", () => {
        if (!heroSection || !stickyBottomBar) return;
        const heroHeight = heroSection.offsetHeight;
        if (window.scrollY > heroHeight - 100) {
            stickyBottomBar.classList.add("visible");
        } else {
            stickyBottomBar.classList.remove("visible");
        }
    });

    // 3. Tab System (Ingredients)
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");

    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");
            
            // Remove active class from buttons and contents
            tabButtons.forEach(b => b.classList.remove("active"));
            tabContents.forEach(c => c.classList.remove("active"));
            
            // Add active to current
            btn.classList.add("active");
            const activeContent = document.getElementById(targetTab);
            if (activeContent) {
                activeContent.classList.add("active");
            }
        });
    });

    // 4. Product Details Modal & 4-Image Gallery
    const productInfoModal = document.getElementById("product-info-modal");
    const closeProductModalBtn = document.getElementById("close-product-modal-btn");
    const productModalWrapper = document.getElementById("product-modal-wrapper");
    const modalMainImg = document.getElementById("modal-main-img");
    const modalTag = document.getElementById("modal-tag");
    const modalTitle = document.getElementById("modal-title");
    const modalFlavor = document.getElementById("modal-flavor");
    const modalDesc = document.getElementById("modal-desc");
    const modalBenefits = document.getElementById("modal-benefits");
    const modalPrice = document.getElementById("modal-price");
    const modalAddToCartBtn = document.getElementById("modal-add-to-cart-btn");
    const thumbCards = document.querySelectorAll(".modal-thumbnails-grid .thumb-card");

    const productDetailsDb = {
        shilajit: {
            title: "Himalayan Shilajit Gummies",
            tag: "Adult Performance",
            flavor: "Imli (Tamarind) Flavour",
            price: 999,
            desc: "Formulated for adult energy, strength, and stamina. Packed with purified shilajit resin containing 75% Fulvic Acid and Ashwagandha to elevate your daily performance naturally.",
            benefits: [
                "Boosts Daily Energy & Stamina",
                "Premium Ashwagandha for Strength",
                "Traditional Ayurvedic Restorative",
                "100% Sugar-Free & Tamarind Sweetened"
            ],
            images: [
                "assets/images/shilajit-bottle.jpg",
                "assets/images/shilajit-detail1.jpg",
                "assets/images/shilajit-detail2.jpg",
                "assets/images/shilajit-detail3.jpg"
            ],
            tagClass: "tag-shilajit"
        },
        biotin: {
            title: "Biotin + Multivitamin Gummies",
            tag: "Adult Daily Wellness",
            flavor: "Orange (Citrus) Flavour",
            price: 999,
            desc: "Your daily beauty and vitality shield. Enriched with 10 essential vitamins and minerals, including high-potency Biotin, Zinc, and Vitamin C to support healthy skin, hair, and nails.",
            benefits: [
                "Glow & Beauty (Hair, Skin & Nails)",
                "Essential Daily Vitality & Immunity",
                "10 Vitamins & Minerals incl. Folic Acid",
                "Delicious Sugar-Free Orange Citrus Chew"
            ],
            images: [
                "assets/images/biotin-bottle.jpg",
                "assets/images/biotin-detail1.jpg",
                "assets/images/biotin-detail2.jpg",
                "assets/images/biotin-detail3.jpg"
            ],
            tagClass: "tag-biotin"
        },
        kids: {
            title: "Kid's Multivitamin & Immunity Booster",
            tag: "Kids' Nutrition",
            flavor: "Mixed Fruit Flavour",
            price: 999,
            desc: "Daily nutrition support for active, growing kids. Packed with 13 crucial nutrients, including Iron, Zinc, Choline, and Inositol for natural brain and immune system growth.",
            benefits: [
                "Strengthens Kids' Natural Immunity",
                "Healthy Growth, Bone & Brain Support",
                "13 Nutrients with Iron & Choline",
                "Kid-Approved Sugar-Free Mix Fruit taste"
            ],
            images: [
                "assets/images/kids-bottle.jpg",
                "assets/images/kids-detail1.jpg",
                "assets/images/kids-detail2.jpg",
                "assets/images/kids-detail3.jpg"
            ],
            tagClass: "tag-kids"
        }
    };

    let activeModalProduct = null;

    const openProductDetailsModal = (productId) => {
        const prod = productDetailsDb[productId];
        if (!prod) return;
        activeModalProduct = prod;

        // Set Info details
        modalTitle.textContent = prod.title;
        modalTag.textContent = prod.tag;
        modalTag.className = `product-tag ${prod.tagClass}`;
        modalFlavor.innerHTML = `<i data-lucide="leaf" style="width: 14px; height: 14px; margin-right: 6px;"></i>${prod.flavor}`;
        modalDesc.textContent = prod.desc;
        modalPrice.textContent = `₹${prod.price.toLocaleString("en-IN")}`;
        
        // Render benefits
        modalBenefits.innerHTML = "";
        prod.benefits.forEach(b => {
            const li = document.createElement("li");
            li.style.fontSize = "13px";
            li.style.display = "flex";
            li.style.alignItems = "center";
            li.style.gap = "10px";
            li.style.color = "var(--text-on-dark)";
            li.innerHTML = `<i data-lucide="check-circle" style="width: 16px; height: 16px; flex-shrink: 0;" class="${productId === 'shilajit' ? 'text-gold' : productId === 'biotin' ? 'text-orange' : 'text-blue'}"></i>${b}`;
            modalBenefits.appendChild(li);
        });

        // Set images
        modalMainImg.src = prod.images[0];
        thumbCards.forEach((card, idx) => {
            const img = card.querySelector(".thumb-img");
            img.src = prod.images[idx];
            card.classList.remove("active");
            card.style.borderColor = "rgba(255, 255, 255, 0.05)";
        });
        thumbCards[0].classList.add("active");
        thumbCards[0].style.borderColor = "var(--color-gold)";

        // Initialize icons
        if (window.lucide) window.lucide.createIcons();

        // Open Modal
        productInfoModal.classList.add("active");
        productInfoModal.style.visibility = "visible";
        productInfoModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    };

    const closeProductDetailsModal = () => {
        productInfoModal.classList.remove("active");
        productInfoModal.style.visibility = "hidden";
        productInfoModal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    };

    // View Info button handler
    const viewLabelButtons = document.querySelectorAll(".view-ingredients-btn");
    viewLabelButtons.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation(); // Stop click from adding directly to cart
            const targetProduct = btn.getAttribute("data-target"); // 'shilajit', 'biotin', 'kids'
            openProductDetailsModal(targetProduct);
        });
    });

    if (productInfoModal) {
        const productModalOverlay = productInfoModal.querySelector(".modal-overlay");
        if (productModalOverlay) {
            productModalOverlay.addEventListener("click", closeProductDetailsModal);
        }
    }

    // Modal Image Gallery Click
    thumbCards.forEach((card, index) => {
        card.addEventListener("click", () => {
            if (!activeModalProduct) return;
            modalMainImg.src = activeModalProduct.images[index];
            thumbCards.forEach(c => {
                c.classList.remove("active");
                c.style.borderColor = "rgba(255, 255, 255, 0.05)";
            });
            card.classList.add("active");
            card.style.borderColor = "var(--color-gold)";
        });
    });

    // Modal Add To Cart click
    if (modalAddToCartBtn) {
        modalAddToCartBtn.addEventListener("click", () => {
            if (!activeModalProduct) return;
            const prodName = activeModalProduct.title + " (Single)";
            const mainImg = activeModalProduct.images[0];
            addItemToCart(prodName, activeModalProduct.price, mainImg);
            closeProductDetailsModal();
        });
    }

    // 5. FAQ Accordion Toggle
    const faqQuestions = document.querySelectorAll(".faq-question");
    faqQuestions.forEach(q => {
        q.addEventListener("click", () => {
            const faqItem = q.parentElement;
            const isActive = faqItem.classList.contains("active");
            
            // Close all items
            document.querySelectorAll(".faq-item").forEach(item => {
                item.classList.remove("active");
                item.querySelector(".faq-answer").style.maxHeight = null;
            });
            
            // Open clicked item if it wasn't active
            if (!isActive) {
                faqItem.classList.add("active");
                const answer = faqItem.querySelector(".faq-answer");
                answer.style.maxHeight = answer.scrollHeight + "px";
            }
        });
    });

    // 6. E-commerce Cart & Checkout Modal Logic
    const cartCountEl = document.getElementById("cart-count");
    const checkoutModal = document.getElementById("checkout-modal");
    const closeModalBtn = document.getElementById("close-modal-btn");
    const modalOverlay = document.querySelector(".modal-overlay");
    const checkoutForm = document.getElementById("checkout-form");
    const toast = document.getElementById("toast-message");
    const toastTitle = document.getElementById("toast-title");
    const toastBody = document.getElementById("toast-body");
    
    // Cart Drawer Elements
    const cartDrawer = document.getElementById("cart-drawer");
    const closeCartBtn = document.getElementById("close-cart-btn");
    const cartOverlay = document.querySelector(".cart-overlay");
    const cartEmptyMsg = document.getElementById("cart-empty-msg");
    const cartItemsList = document.getElementById("cart-items-list");
    const cartFooterPanel = document.getElementById("cart-footer-panel");
    const cartSubtotalEl = document.getElementById("cart-subtotal");
    const cartCheckoutBtn = document.getElementById("cart-checkout-btn");
    
    // Checkout Summary Elements
    const checkoutItemsList = document.getElementById("checkout-items-list");
    const summaryTotalPrice = document.querySelector(".order-summary-box .total-price");
    const checkoutFormBtn = document.querySelector("#place-order-btn span");
    const upgradeBox = document.getElementById("upgrade-combo-box");
    const upgradeComboBtn = document.getElementById("upgrade-combo-btn");

    // Shopping Cart State (synced with localStorage)
    let cart = JSON.parse(localStorage.getItem("sonrup_cart")) || [];

    const saveCart = () => {
        localStorage.setItem("sonrup_cart", JSON.stringify(cart));
    };

    // Render cart on page load
    setTimeout(() => {
        renderCart();
    }, 50);

    const openCartDrawer = () => {
        cartDrawer.classList.add("active");
        cartDrawer.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    };

    const closeCartDrawer = () => {
        cartDrawer.classList.remove("active");
        cartDrawer.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    };

    const openCheckout = () => {
        renderCheckoutSummary();
        checkoutModal.classList.add("active");
        checkoutModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden"; // Disable scroll when modal is open
    };

    const closeCheckout = () => {
        checkoutModal.classList.remove("active");
        checkoutModal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = ""; // Re-enable scroll
    };

    const showToast = (title, message) => {
        if (toastTitle) toastTitle.textContent = title;
        if (toastBody) toastBody.textContent = message;
        if (toast) {
            toast.classList.add("active");
            setTimeout(() => {
                toast.classList.remove("active");
            }, 4000);
        }
    };

    // Calculate Cart Subtotal & Count
    const getCartTotals = () => {
        let totalQty = 0;
        let totalPrice = 0;
        cart.forEach(item => {
            totalQty += item.quantity;
            totalPrice += item.price * item.quantity;
        });
        return { totalQty, totalPrice };
    };

    // Update Cart Sidebar HTML
    const renderCart = () => {
        saveCart();
        const { totalQty, totalPrice } = getCartTotals();
        
        // Update badge
        if (cartCountEl) {
            cartCountEl.textContent = totalQty;
            cartCountEl.style.transform = "scale(1.3)";
            setTimeout(() => { cartCountEl.style.transform = ""; }, 300);
        }

        if (cart.length === 0) {
            if (cartEmptyMsg) cartEmptyMsg.style.display = "block";
            if (cartItemsList) cartItemsList.style.display = "none";
            if (cartFooterPanel) cartFooterPanel.style.display = "none";
        } else {
            if (cartEmptyMsg) cartEmptyMsg.style.display = "none";
            if (cartItemsList) cartItemsList.style.display = "flex";
            if (cartFooterPanel) cartFooterPanel.style.display = "block";
            if (cartSubtotalEl) cartSubtotalEl.textContent = `₹${totalPrice.toLocaleString("en-IN")}.00`;
            
            // Generate items list
            if (cartItemsList) {
                cartItemsList.innerHTML = "";
                cart.forEach((item, index) => {
                    const itemEl = document.createElement("div");
                    itemEl.classList.add("cart-item");
                    itemEl.innerHTML = `
                        <div class="cart-item-img">
                            <img src="${item.img}" alt="${item.name}">
                        </div>
                        <div class="cart-item-details">
                            <div>
                                <h4>${item.name}</h4>
                                <span class="cart-item-price">₹${item.price.toLocaleString("en-IN")}</span>
                            </div>
                            <div class="cart-item-actions">
                                <div class="qty-selector">
                                    <button class="qty-btn minus-btn" data-index="${index}">-</button>
                                    <span class="qty-val">${item.quantity}</span>
                                    <button class="qty-btn plus-btn" data-index="${index}">+</button>
                                </div>
                                <button class="btn-remove-item" data-index="${index}">
                                    <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i> Remove
                                </button>
                            </div>
                        </div>
                    `;
                    cartItemsList.appendChild(itemEl);
                });
            }
            
            // Re-create icons for new elements
            if (window.lucide) window.lucide.createIcons();

            // Bind Actions inside Drawer
            bindCartDrawerActions();
        }
    };

    // Bind item edits
    const bindCartDrawerActions = () => {
        // Plus Quantity
        document.querySelectorAll(".plus-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const idx = parseInt(btn.getAttribute("data-index"));
                cart[idx].quantity += 1;
                renderCart();
            });
        });

        // Minus Quantity
        document.querySelectorAll(".minus-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const idx = parseInt(btn.getAttribute("data-index"));
                if (cart[idx].quantity > 1) {
                    cart[idx].quantity -= 1;
                } else {
                    cart.splice(idx, 1);
                }
                renderCart();
            });
        });

        // Remove Item
        document.querySelectorAll(".btn-remove-item").forEach(btn => {
            btn.addEventListener("click", () => {
                const idx = parseInt(btn.getAttribute("data-index"));
                cart.splice(idx, 1);
                renderCart();
            });
        });
    };

    // Add Item to Cart Helper
    const addItemToCart = (name, price, img) => {
        const existingItem = cart.find(item => item.name === name);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ name, price, img, quantity: 1 });
        }
        renderCart();
        showToast("Added to Cart", `${name} has been added to your cart.`);
        openCartDrawer();
    };

    // Render Checkout Summary dynamically
    const renderCheckoutSummary = () => {
        const { totalPrice } = getCartTotals();
        checkoutItemsList.innerHTML = "";
        
        cart.forEach(item => {
            const itemSummary = document.createElement("div");
            itemSummary.classList.add("summary-item");
            itemSummary.style.display = "flex";
            itemSummary.style.justifyContent = "space-between";
            itemSummary.style.fontSize = "13.5px";
            itemSummary.innerHTML = `
                <span>${item.name} <strong>x ${item.quantity}</strong></span>
                <span>₹${(item.price * item.quantity).toLocaleString("en-IN")}.00</span>
            `;
            checkoutItemsList.appendChild(itemSummary);
        });

        if (summaryTotalPrice) summaryTotalPrice.textContent = `₹${totalPrice.toLocaleString("en-IN")}.00`;
        if (checkoutFormBtn) checkoutFormBtn.textContent = `Place Order — ₹${totalPrice.toLocaleString("en-IN")}.00`;

        // Upsell Upgrade check: if cart does NOT contain the Combo, show upsell banner
        const containsCombo = cart.some(item => item.name.includes("Combo"));
        if (upgradeBox) {
            if (!containsCombo && totalPrice > 0) {
                upgradeBox.style.display = "block";
            } else {
                upgradeBox.style.display = "none";
            }
        }
    };

    // Upgrade to Combo button action (Upsell)
    if (upgradeComboBtn) {
        upgradeComboBtn.addEventListener("click", () => {
            // Replace cart contents with the Family Combo Pack
            cart = [{
                name: "Sonrup Family Wellness Combo (3 Bottles)",
                price: 1799,
                img: "assets/images/hero-combo.jpg",
                quantity: 1
            }];
            renderCart();
            renderCheckoutSummary();
        });
    }

    // Trigger Cart drawer on Cart button click
    const cartBtn = document.getElementById("cart-button");
    if (cartBtn) {
        cartBtn.addEventListener("click", () => {
            openCartDrawer();
        });
    }

    // Cart Drawer close triggers
    if (closeCartBtn) closeCartBtn.addEventListener("click", closeCartDrawer);
    if (cartOverlay) cartOverlay.addEventListener("click", closeCartDrawer);
    
    // Close cart drawer button inside empty state
    const emptyBtn = document.querySelector(".close-cart-btn-nav");
    if (emptyBtn) {
        emptyBtn.addEventListener("click", () => {
            closeCartDrawer();
        });
    }

    // Direct Add to Cart for Combo buttons
    const addComboButtons = document.querySelectorAll(".add-to-cart-combo");
    addComboButtons.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            addItemToCart("Sonrup Family Wellness Combo (3 Bottles)", 1799, "assets/images/hero-combo.jpg");
        });
    });

    // Add to Cart for Individual Cards
    const addToCartButtons = document.querySelectorAll(".add-to-cart-btn");
    addToCartButtons.forEach(btn => {
        if (btn.dataset.eventBound === "true") return;
        btn.dataset.eventBound = "true";
        btn.addEventListener("click", (e) => {
            e.stopPropagation(); // Avoid triggering card click
            const name = btn.getAttribute("data-name");
            const price = parseInt(btn.getAttribute("data-price"));
            const img = btn.getAttribute("data-img");
            addItemToCart(name, price, img);
        });
    });

    function openComboDetailModal(name, price, img, summary, benefits, qtyInfo) {
        let modal = document.getElementById("combo-detail-modal");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "combo-detail-modal";
            modal.className = "checkout-modal";
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal-overlay" id="close-combo-modal-overlay"></div>
            <div class="modal-wrapper" style="max-width: 500px; width: 90%; background-color: var(--bg-dark-card); border: 1.5px solid var(--color-gold); border-radius: 20px; padding: 30px; position: relative; z-index: 2200; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
                <button class="close-cart" id="close-combo-modal-btn" aria-label="Close details" style="position: absolute; top: 20px; right: 20px; color: #FFFFFF; background: none; border: none; cursor: pointer; padding: 5px;">
                    <i data-lucide="x"></i>
                </button>
                <div style="display: flex; flex-direction: column; gap: 20px;">
                    <div style="text-align: center; background: rgba(0,0,0,0.2); border-radius: 12px; padding: 20px;">
                        <img src="${img}" alt="${name}" style="max-height: 160px; object-fit: contain; margin: 0 auto;">
                    </div>
                    <div>
                        <span class="sub-heading" style="font-size: 11px; color: var(--color-gold); font-weight: 600; text-transform: uppercase;">Premium Wellness Bundle</span>
                        <h2 style="font-size: 20px; color: #FFFFFF; font-family: var(--font-heading); margin-top: 5px; text-align: left; line-height: 1.3;">${name}</h2>
                        <p style="font-size: 13px; color: var(--text-on-dark-muted); margin-top: 8px; line-height: 1.5; text-align: left;">${summary}</p>
                    </div>
                    <div style="border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05); padding: 15px 0;">
                        <h4 style="font-size: 13.5px; color: #FFFFFF; margin-bottom: 8px; text-align: left;">What's Included:</h4>
                        <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; text-align: left;">
                            ${benefits.map(b => `<li style="font-size: 12.5px; color: var(--text-on-dark-muted); display: flex; align-items: center; gap: 8px;"><i data-lucide="check-circle" class="text-gold" style="width: 14px; height: 14px; color: var(--color-gold);"></i> ${b}</li>`).join("")}
                        </ul>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
                        <div>
                            <span style="font-size: 11.5px; color: var(--text-on-dark-muted); display: block; text-align: left; margin-bottom: 2px;">${qtyInfo}</span>
                            <span style="font-size: 22px; font-weight: 700; color: var(--color-gold); font-family: var(--font-heading);">₹${price.toLocaleString("en-IN")}</span>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn-secondary modal-add-btn" style="padding: 10px 16px; font-size: 12px;">Add to Cart</button>
                            <button class="btn-primary modal-buy-btn" style="padding: 10px 16px; font-size: 12px;">Buy Now</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        modal.classList.add("active");
        modal.style.visibility = "visible";
        document.body.style.overflow = "hidden";

        const closeBtn = modal.querySelector("#close-combo-modal-btn");
        const overlay = modal.querySelector("#close-combo-modal-overlay");
        const addBtn = modal.querySelector(".modal-add-btn");
        const buyBtn = modal.querySelector(".modal-buy-btn");

        const closeFn = () => {
            modal.classList.remove("active");
            modal.style.visibility = "hidden";
            document.body.style.overflow = "";
        };

        closeBtn?.addEventListener("click", closeFn);
        overlay?.addEventListener("click", closeFn);

        addBtn?.addEventListener("click", () => {
            addItemToCart(name, price, img);
            closeFn();
        });

        buyBtn?.addEventListener("click", () => {
            const existingItem = cart.find(item => item.name === name);
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({ name, price, img, quantity: 1 });
            }
            saveCart();
            closeFn();
            window.location.href = "checkout.html";
        });

        if (window.lucide) window.lucide.createIcons();
    }

    const bindProductCardEvents = (container = document) => {
        const productCards = container.querySelectorAll(".product-card");
        productCards.forEach(card => {
            card.style.cursor = "pointer";
            if (card.dataset.cardEventBound === "true") return;
            card.dataset.cardEventBound = "true";
            
            card.addEventListener("click", (e) => {
                if (e.target.closest(".add-to-cart-btn") || e.target.closest(".buy-now-btn")) {
                    return;
                }
                const name = card.getAttribute("data-name") || card.querySelector("h3")?.textContent || "";
                
                if (card.classList.contains("card-shilajit")) {
                    window.location.href = "shilajit.html";
                } else if (card.classList.contains("card-biotin")) {
                    window.location.href = "biotin.html";
                } else if (card.classList.contains("card-kids")) {
                    window.location.href = "kids.html";
                } else {
                    if (name.includes("Family")) {
                        window.location.href = "family-combo.html";
                    } else if (name.includes("Power Duo") || name.includes("Adult Power")) {
                        window.location.href = "adult-duo.html";
                    } else if (name.includes("Mom & Kid")) {
                        window.location.href = "mom-kid.html";
                    } else if (name.includes("Dad & Kid")) {
                        window.location.href = "dad-kid.html";
                    } else {
                        window.location.href = "shop.html";
                    }
                }
            });
        });
    };

    // Initialize product card click actions
    bindProductCardEvents();

    // Cart Checkout button triggers checkout modal
    if (cartCheckoutBtn) {
        cartCheckoutBtn.addEventListener("click", () => {
            closeCartDrawer();
            window.location.href = "checkout.html";
        });
    }

    // Modal Close Triggers
    if (closeModalBtn) closeModalBtn.addEventListener("click", closeCheckout);
    if (modalOverlay) modalOverlay.addEventListener("click", closeCheckout);

    // Payment Option selector logic
    const paymentCards = document.querySelectorAll(".payment-option-card");
    paymentCards.forEach(card => {
        const radio = card.querySelector('input[type="radio"]');
        card.addEventListener("click", () => {
            paymentCards.forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            if (radio) radio.checked = true;
        });
    });

    // Form submission simulation
    if (checkoutForm) {
        checkoutForm.addEventListener("submit", (e) => {
            e.preventDefault();
            
            const placeOrderBtn = document.getElementById("place-order-btn");
            const originalBtnText = placeOrderBtn.innerHTML;
            placeOrderBtn.disabled = true;
            placeOrderBtn.innerHTML = `<span>Processing Order...</span>`;

            setTimeout(() => {
                // Success simulation
                placeOrderBtn.disabled = false;
                placeOrderBtn.innerHTML = originalBtnText;
                closeCheckout();
                
                // Clear cart state
                cart = [];
                renderCart();
                checkoutForm.reset();

                // Show purchase success toast
                showToast("Order Placed Successfully!", "Your wellness order has been placed and is on the way!");
            }, 1500);
        });
    }

    // Subpage Image Gallery Switcher
    const subpageThumbs = document.querySelectorAll(".gallery-thumb");
    const subpageMainImg = document.getElementById("main-preview-img");

    subpageThumbs.forEach(thumb => {
        thumb.addEventListener("click", () => {
            const imgSrc = thumb.querySelector("img").getAttribute("src");
            if (subpageMainImg) {
                subpageMainImg.setAttribute("src", imgSrc);
            }
            subpageThumbs.forEach(t => {
                t.classList.remove("active");
                t.style.borderColor = "rgba(255, 255, 255, 0.05)";
            });
            thumb.classList.add("active");
            thumb.style.borderColor = "var(--color-gold)";
        });
    });

    // ----------------------------------------------------
    // MULTI-PAGE ADVANCED LOGIC: AUTH, PROFILE, CHECKOUT
    // ----------------------------------------------------

    // Dynamic Header state update
    const updateHeaderAuthUI = () => {
        const authActionsContainer = document.getElementById("header-auth-actions");
        if (!authActionsContainer) return;

        const cartQty = getCartTotals().totalQty;
        const headerCartHtml = `
            <button class="cart-trigger" id="cart-button" aria-label="View Cart" style="cursor: pointer;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                <span class="cart-badge" id="cart-count">${cartQty}</span>
            </button>
        `;

        if (isLoggedIn()) {
            const userObj = JSON.parse(localStorage.getItem("sonrup_user") || '{}');
            authActionsContainer.innerHTML = `
                ${headerCartHtml}
                <a href="profile.html" class="nav-profile-btn" id="header-profile-icon" title="View Profile: ${userObj.name || ''}" style="display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; border: 1.5px solid var(--color-gold); background: rgba(201, 162, 39, 0.1); color: var(--color-gold); cursor: pointer; text-decoration: none;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </a>
            `;
        } else {
            authActionsContainer.innerHTML = `
                ${headerCartHtml}
                <a href="login.html" class="btn-secondary btn-sm" id="header-login-btn" style="text-decoration: none;">Login</a>
            `;
        }

        // Re-bind header triggers
        const newCartBtn = authActionsContainer.querySelector("#cart-button");
        if (newCartBtn) {
            newCartBtn.addEventListener("click", () => {
                openCartDrawer();
            });
        }
    };

    // Run dynamic header update on page load
    updateHeaderAuthUI();

    // Password Visibility Toggles (Eye Button)
    const setupPasswordToggle = (btnId, inputId) => {
        const btn = document.getElementById(btnId);
        const input = document.getElementById(inputId);
        if (btn && input) {
            btn.addEventListener("click", () => {
                const isPass = input.getAttribute("type") === "password";
                input.setAttribute("type", isPass ? "text" : "password");
                btn.innerHTML = `<i data-lucide="${isPass ? 'eye-off' : 'eye'}" width="18" height="18"></i>`;
                if (window.lucide) window.lucide.createIcons();
            });
        }
    };
    setupPasswordToggle("toggle-login-password", "login-password");
    setupPasswordToggle("toggle-signup-password", "signup-password");

    // Login Form Handler
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("login-email").value;
            const password = document.getElementById("login-password").value;

            try {
                const res = await fetch(`${getApiBase()}/api/auth/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password }),
                });

                if (!res.ok) {
                    const err = await res.json();
                    showToast("Login Failed", err.detail || "Invalid email or password.");
                    return;
                }

                const data = await res.json();
                setAuth(data.access_token, data.user);
                const dest = data.user.is_admin ? "admin" : ((typeof cart !== "undefined" && cart.length > 0) ? "checkout" : "profile");
                showToast("Login Successful", data.user.is_admin ? "Welcome back, Administrator! Launching Admin Portal..." : (cart.length > 0 ? "Redirecting to complete your checkout..." : "Redirecting to your wellness profile..."));
                setTimeout(() => {
                    window.location.href = dest;
                }, 1000);
            } catch (err) {
                showToast("Error", "Something went wrong. Please try again.");
            }
        });
    }

    // Signup Form Handler
    const signupForm = document.getElementById("signup-form");
    if (signupForm) {
        signupForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = document.getElementById("signup-name").value;
            const email = document.getElementById("signup-email").value;
            const password = document.getElementById("signup-password").value;
            const phone = document.getElementById("signup-phone").value;
            const pincode = document.getElementById("signup-pincode").value;
            const address = document.getElementById("signup-address").value;

            try {
                const res = await fetch(`${getApiBase()}/api/auth/signup`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email, password, phone, address, pincode }),
                });

                if (!res.ok) {
                    const err = await res.json();
                    showToast("Signup Failed", err.detail || "Could not create account.");
                    return;
                }

                const data = await res.json();
                setAuth(data.access_token, data.user);
                const dest = (typeof cart !== "undefined" && cart.length > 0) ? "checkout.html" : "profile.html";
                showToast("Account Created", cart.length > 0 ? "Redirecting to complete your checkout..." : "Redirecting to your profile dashboard...");
                setTimeout(() => {
                    window.location.href = dest;
                }, 1000);
            } catch (err) {
                showToast("Error", "Something went wrong. Please try again.");
            }
        });
    }

    // Logout Action
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            clearAuth();
            showToast("Logged Out", "Successfully logged out of your account.");
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1000);
        });
    }

    // Profile Page Loader — fetches data from API
    if (window.location.pathname.includes("/profile")) {
        if (!isLoggedIn()) {
            window.location.href = "/login";
        } else {
            // Fetch user profile from API
            try {
                const profileRes = await fetch(`${getApiBase()}/api/auth/me`, {
                    headers: getAuthHeaders(),
                });

                if (!profileRes.ok) {
                    clearAuth();
                    window.location.href = "login.html";
                    return;
                }

                const userObj = await profileRes.json();
                // Update localStorage cache
                localStorage.setItem("sonrup_user", JSON.stringify(userObj));

                const welcomeEl = document.getElementById("profile-welcome-name");
                const detailNameEl = document.getElementById("profile-detail-name");
                const detailEmailEl = document.getElementById("profile-detail-email");
                const detailPhoneEl = document.getElementById("profile-detail-phone");
                const detailAddressEl = document.getElementById("profile-detail-address");

                if (welcomeEl) welcomeEl.textContent = userObj.name;
                if (detailNameEl) detailNameEl.textContent = userObj.name;
                if (detailEmailEl) detailEmailEl.textContent = userObj.email;
                if (detailPhoneEl) detailPhoneEl.textContent = userObj.phone;
                if (detailAddressEl) detailAddressEl.textContent = userObj.address + (userObj.pincode ? `, ${userObj.pincode}` : "");

                // Fetch Orders from API
                const ordersListContainer = document.getElementById("profile-orders-list");
                const noOrdersMsg = document.getElementById("no-orders-msg");

        const renderOrderCards = (orders) => {
            if (!ordersListContainer) return;
            ordersListContainer.innerHTML = "";

            if (!orders || orders.length === 0) {
                if (noOrdersMsg) noOrdersMsg.style.display = "block";
                ordersListContainer.appendChild(noOrdersMsg);
                return;
            }

            if (noOrdersMsg) noOrdersMsg.style.display = "none";

            orders.forEach(order => {
                const orderCard = document.createElement("div");
                orderCard.style.border = "1px solid var(--border-dark)";
                orderCard.style.borderRadius = "12px";
                orderCard.style.padding = "20px";
                orderCard.style.backgroundColor = "rgba(255, 255, 255, 0.01)";

                let itemsSummaryHtml = "";
                (order.items || []).forEach(item => {
                    itemsSummaryHtml += `
                        <div style="display:flex; justify-content:space-between; margin-bottom: 6px; font-size: 13px;">
                            <span>${item.name} x ${item.quantity}</span>
                            <span>₹${((item.price || 0) * (item.quantity || 1)).toLocaleString("en-IN")}</span>
                        </div>
                    `;
                });

                orderCard.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom:12px; margin-bottom:12px;">
                        <div>
                            <span style="font-size:11px; text-transform:uppercase; color:var(--text-on-dark-muted);">Order ID</span>
                            <strong style="display:block; color:#FFFFFF; font-size:14px;">#${order.order_id || 'N/A'}</strong>
                        </div>
                        <div style="text-align:right;">
                            <span style="font-size:11px; text-transform:uppercase; color:var(--text-on-dark-muted);">Order Date</span>
                            <span style="display:block; color:#FFFFFF; font-size:13px;">${order.date || 'Recent'}</span>
                        </div>
                    </div>
                    <div style="margin-bottom:12px;">
                        ${itemsSummaryHtml}
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; border-top: 1px solid rgba(255,255,255,0.05); padding-top:12px; font-weight:600; flex-wrap: wrap; gap: 10px;">
                        <div>
                            <span style="font-size:11px; text-transform:uppercase; color:var(--text-on-dark-muted); font-weight:normal; display:block;">Grand Total</span>
                            <span style="color:var(--color-gold); font-size:16px;">₹${(order.total || 0).toLocaleString("en-IN")}</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            ${order.waybill ? `<button onclick="trackDelhivery('${order.waybill}')" style="background: rgba(201, 162, 39, 0.15); border: 1px solid rgba(201, 162, 39, 0.3); color: var(--color-gold); font-size:11.5px; padding: 4px 10px; border-radius: 6px; cursor:pointer; font-weight: 700;">📦 Track Shipment</button>` : ''}
                            <span style="font-size:12px; padding: 4px 10px; border-radius: 20px; background: rgba(0, 180, 100, 0.15); color: #00FF7F; border: 1px solid rgba(0, 180, 100, 0.2);"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; display:inline-block; vertical-align:middle;"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/></svg> ${order.status || 'Processing'}</span>
                        </div>
                    </div>
                `;
                ordersListContainer.appendChild(orderCard);
            });
            if (window.lucide) window.lucide.createIcons();
        };

        const cachedUser = JSON.parse(localStorage.getItem("sonrup_user") || "null");
        const lastShipping = JSON.parse(localStorage.getItem("sonrup_last_order_shipping") || "null");
        const guestOrders = JSON.parse(localStorage.getItem("sonrup_guest_orders") || "[]");

        if (isLoggedIn()) {
            // User is Logged In
            if (logoutBtn) logoutBtn.style.display = "inline-flex";
            if (loginLink) loginLink.style.display = "none";
            if (signupLink) signupLink.style.display = "none";

            // ⚡ Instant pre-render from local cache (0ms latency, eliminates flash of placeholder text!)
            if (cachedUser || lastShipping) {
                const nameVal = (cachedUser && cachedUser.name) ? cachedUser.name : (lastShipping ? lastShipping.name : "");
                const emailVal = (cachedUser && cachedUser.email) ? cachedUser.email : (lastShipping ? lastShipping.email : "");
                const phoneVal = (cachedUser && cachedUser.phone) ? cachedUser.phone : (lastShipping ? lastShipping.phone : "");

                let addressVal = "";
                if (cachedUser && cachedUser.address) {
                    addressVal = cachedUser.address + (cachedUser.pincode ? `, ${cachedUser.pincode}` : "");
                } else if (lastShipping && lastShipping.address) {
                    addressVal = lastShipping.address + (lastShipping.city ? `, ${lastShipping.city}` : "") + (lastShipping.pincode ? ` - ${lastShipping.pincode}` : "");
                }

                if (welcomeEl && nameVal) welcomeEl.textContent = nameVal;
                if (welcomeSubEl) welcomeSubEl.textContent = "Welcome to your Sonrup wellness dashboard. View orders and update addresses.";
                if (detailNameEl && nameVal) detailNameEl.textContent = nameVal;
                if (detailEmailEl && emailVal) detailEmailEl.textContent = emailVal;
                if (detailPhoneEl && phoneVal) detailPhoneEl.textContent = phoneVal;
                if (detailAddressEl && addressVal) detailAddressEl.textContent = addressVal;
            }

            try {
                const profileRes = await fetch(`${getApiBase()}/api/auth/me`, {
                    headers: getAuthHeaders(),
                });

                if (profileRes.ok) {
                    const userObj = await profileRes.json();
                    localStorage.setItem("sonrup_user", JSON.stringify(userObj));

                    const nameVal = userObj.name || (lastShipping ? lastShipping.name : "Valued Customer");
                    const emailVal = userObj.email || (lastShipping ? lastShipping.email : "Not Provided");
                    const phoneVal = userObj.phone || (lastShipping ? lastShipping.phone : "Not Provided");

                    let addressVal = "Not Provided";
                    if (userObj.address) {
                        addressVal = userObj.address + (userObj.pincode ? `, ${userObj.pincode}` : "");
                    } else if (lastShipping && lastShipping.address) {
                        addressVal = lastShipping.address + (lastShipping.city ? `, ${lastShipping.city}` : "") + (lastShipping.pincode ? ` - ${lastShipping.pincode}` : "");
                    }

                    if (welcomeEl) welcomeEl.textContent = nameVal;
                    if (welcomeSubEl) welcomeSubEl.textContent = "Welcome to your Sonrup wellness dashboard. View orders and update addresses.";
                    if (detailNameEl) detailNameEl.textContent = nameVal;
                    if (detailEmailEl) detailEmailEl.textContent = emailVal;
                    if (detailPhoneEl) detailPhoneEl.textContent = phoneVal;
                    if (detailAddressEl) detailAddressEl.textContent = addressVal;

                    const ordersRes = await fetch(`${getApiBase()}/api/orders`, {
                        headers: getAuthHeaders(),
                    });

                    if (ordersRes.ok) {
                        const apiOrders = await ordersRes.json();
                        renderOrderCards(apiOrders);
                    } else {
                        renderOrderCards(guestOrders);
                    }
                } else if (profileRes.status === 401 || profileRes.status === 403) {
                    clearAuth();
                    if (logoutBtn) logoutBtn.style.display = "none";
                    if (loginLink) loginLink.style.display = "inline-flex";
                    if (signupLink) signupLink.style.display = "inline-flex";
                }
            } catch (err) {
                console.error("Error loading profile:", err);
            }
        } else {
            // NOT Logged In (Guest View)
            if (logoutBtn) logoutBtn.style.display = "none";
            if (loginLink) loginLink.style.display = "inline-flex";
            if (signupLink) signupLink.style.display = "inline-flex";

            if (lastShipping) {
                // Guest has placed an order and filled shipping details!
                const nameVal = lastShipping.name || "Guest Customer";
                const emailVal = lastShipping.email || "Not Provided";
                const phoneVal = lastShipping.phone || "Not Provided";
                const addressVal = (lastShipping.address || "") + (lastShipping.city ? `, ${lastShipping.city}` : "") + (lastShipping.pincode ? ` - ${lastShipping.pincode}` : "");

                if (welcomeEl) welcomeEl.textContent = nameVal;
                if (welcomeSubEl) welcomeSubEl.textContent = "Showing shipping details & order history from your recent purchase.";
                if (detailNameEl) detailNameEl.textContent = nameVal;
                if (detailEmailEl) detailEmailEl.textContent = emailVal;
                if (detailPhoneEl) detailPhoneEl.textContent = phoneVal;
                if (detailAddressEl) detailAddressEl.textContent = addressVal || "Not Provided";

                renderOrderCards(guestOrders);
            } else {
                // Default guest visitor — NO account & NO order placed yet
                if (welcomeEl) welcomeEl.textContent = "Guest Visitor";
                if (welcomeSubEl) welcomeSubEl.textContent = "Please log in or sign up to save your account details, or place an order to see shipping details.";
                if (detailNameEl) detailNameEl.textContent = "Not Provided";
                if (detailEmailEl) detailEmailEl.textContent = "Not Provided";
                if (detailPhoneEl) detailPhoneEl.textContent = "Not Provided";
                if (detailAddressEl) detailAddressEl.textContent = "Not Provided";

                renderOrderCards([]);
            }
        }
    }

    // Checkout Page Loading & Submission logic
    if (window.location.pathname.includes("checkout")) {
        const checkoutPageForm = document.getElementById("checkout-page-form");
        const checkoutPageSummaryList = document.getElementById("checkout-page-summary-list");
        const checkoutPageGrandTotal = document.getElementById("checkout-page-grand-total");
        const checkoutPageUpgradeBox = document.getElementById("checkout-page-upgrade-box");
        const checkoutPageUpgradeBtn = document.getElementById("checkout-page-upgrade-btn");

        let appliedCoupon = null;

        // Load logged-in user details to shipping form automatically
        const loggedInUser = localStorage.getItem("sonrup_user");
        if (loggedInUser) {
            const userObj = JSON.parse(loggedInUser);
            const nameField = document.getElementById("checkout-name");
            const emailField = document.getElementById("checkout-email");
            const phoneField = document.getElementById("checkout-phone");
            const addressField = document.getElementById("checkout-address");
            const pincodeField = document.getElementById("checkout-pincode");

            if (nameField) nameField.value = userObj.name || "";
            if (emailField) emailField.value = userObj.email || "";
            if (phoneField) phoneField.value = userObj.phone || "";

            // Explicitly populate user address and pincode fields
            if (addressField && userObj.address) addressField.value = userObj.address || "";
            if (pincodeField && userObj.pincode) pincodeField.value = userObj.pincode || "";

            // Listen to pincode changes and check serviceability dynamically
            if (pincodeField) {
                const checkServiceability = async (pincode) => {
                    const badge = document.getElementById("pincode-status-badge");
                    if (!badge) return;
                    if (pincode.length !== 6 || !/^\d+$/.test(pincode)) {
                        badge.style.display = "none";
                        return;
                    }
                    try {
                        badge.style.display = "inline";
                        badge.style.color = "#FFD700";
                        badge.textContent = "Checking...";
                        
                        const res = await fetch(`${getApiBase()}/api/orders/check-pincode/${pincode}`);
                        if (!res.ok) throw new Error();
                        const info = await res.json();
                        
                        if (info.serviceable) {
                            badge.style.color = "#10B981";
                            badge.textContent = `✅ Serviceable: ${info.city}`;
                        } else {
                            badge.style.color = "#EF4444";
                            badge.textContent = "❌ Unserviceable";
                        }
                    } catch (e) {
                        badge.style.display = "none";
                    }
                };

                pincodeField.addEventListener("input", (e) => {
                    checkServiceability(e.target.value.trim());
                });

                // Initial check if populated
                if (pincodeField.value) {
                    checkServiceability(pincodeField.value.trim());
                }
            }
        }

        const renderCheckoutPageSummary = () => {
            const { totalPrice } = getCartTotals();
            checkoutPageSummaryList.innerHTML = "";

            if (cart.length === 0) {
                checkoutPageSummaryList.innerHTML = `<p style="color:var(--text-on-dark-muted); text-align:center; font-size:13.5px;">Your cart is empty. <a href="index.html" style="color:var(--color-gold);">Go shop.</a></p>`;
                checkoutPageGrandTotal.textContent = "₹0.00";
                return;
            }

            cart.forEach(item => {
                const row = document.createElement("div");
                row.style.display = "flex";
                row.style.justifyContent = "space-between";
                row.style.fontSize = "13.5px";
                row.innerHTML = `
                    <span>${item.name} <strong>x ${item.quantity}</strong></span>
                    <span>₹${(item.price * item.quantity).toLocaleString("en-IN")}.00</span>
                `;
                checkoutPageSummaryList.appendChild(row);
            });

            const discountRow = document.getElementById("discount-row");
            const appliedCouponName = document.getElementById("applied-coupon-name");
            const discountAmountText = document.getElementById("discount-amount-text");

            if (appliedCoupon && appliedCoupon.valid) {
                if (totalPrice < (appliedCoupon.min_order_value || 0)) {
                    // Cart dropped below required minimum order value -> invalidate coupon!
                    appliedCoupon = null;
                    if (couponMsg) {
                        couponMsg.style.display = "block";
                        couponMsg.style.color = "#ef4444";
                        couponMsg.textContent = `❌ Coupon removed: minimum order value of ₹${appliedCoupon ? appliedCoupon.min_order_value : 0} required.`;
                    }
                    if (discountRow) discountRow.style.display = "none";
                    checkoutPageGrandTotal.textContent = `₹${totalPrice.toLocaleString("en-IN")}.00`;
                } else {
                    const finalGrand = Math.max(0, totalPrice - appliedCoupon.discount_amount);
                    if (discountRow) discountRow.style.display = "flex";
                    if (appliedCouponName) appliedCouponName.textContent = appliedCoupon.code;
                    if (discountAmountText) discountAmountText.textContent = `-₹${appliedCoupon.discount_amount.toLocaleString("en-IN")}.00`;
                    checkoutPageGrandTotal.textContent = `₹${finalGrand.toLocaleString("en-IN")}.00`;
                }
            } else {
                if (discountRow) discountRow.style.display = "none";
                checkoutPageGrandTotal.textContent = `₹${totalPrice.toLocaleString("en-IN")}.00`;
            }

            // Dynamic upgrade combo box check
            const containsCombo = cart.some(item => item.name.includes("Combo"));
            if (checkoutPageUpgradeBox) {
                if (!containsCombo && totalPrice > 0) {
                    checkoutPageUpgradeBox.style.display = "block";
                } else {
                    checkoutPageUpgradeBox.style.display = "none";
                }
            }
        };

        // Fetch & Render Available Coupons on Checkout Page
        let couponsLoaded = false;
        const loadAvailableCoupons = async () => {
            try {
                const res = await fetch(`${getApiBase()}/api/orders/public-coupons`);
                const container = document.getElementById("available-coupons-container");
                const list = document.getElementById("available-coupons-list");
                const toggleBtn = document.getElementById("toggle-coupons-btn");
                if (!res.ok || !container || !list) return;

                const coupons = await res.json();
                if (toggleBtn) toggleBtn.style.display = "inline-flex";

                if (coupons.length === 0) {
                    list.innerHTML = '<p style="color:#94a3b8; font-size:12px; margin:4px 0;">No active promo codes right now.</p>';
                    return;
                }

                const { totalPrice } = getCartTotals();
                list.innerHTML = "";

                // Sort coupons: applicable/eligible ones appear at the top
                coupons.sort((a, b) => {
                    const eligibleA = totalPrice >= (a.min_order_value || 0);
                    const eligibleB = totalPrice >= (b.min_order_value || 0);
                    if (eligibleA && !eligibleB) return -1;
                    if (!eligibleA && eligibleB) return 1;
                    return 0;
                });

                coupons.forEach(c => {
                    const minVal = c.min_order_value || 0;
                    const isEligible = totalPrice >= minVal;
                    const discText = c.discount_type === "percentage" ? `${c.discount_value}% OFF` : `₹${c.discount_value} OFF`;
                    const badge = document.createElement("div");
                    badge.style.background = isEligible ? "rgba(201, 162, 39, 0.12)" : "rgba(255, 255, 255, 0.03)";
                    badge.style.border = isEligible ? "1px solid rgba(201, 162, 39, 0.4)" : "1px dashed rgba(255, 255, 255, 0.15)";
                    badge.style.padding = "8px 12px";
                    badge.style.borderRadius = "8px";
                    badge.style.cursor = "pointer";
                    badge.style.display = "flex";
                    badge.style.justifyContent = "space-between";
                    badge.style.alignItems = "center";
                    badge.style.fontSize = "12px";
                    badge.style.transition = "all 0.2s ease";
                    badge.style.opacity = isEligible ? "1" : "0.75";

                    const unlockTag = !isEligible ? `<span style="color: #ef4444; font-size: 10.5px; font-weight: 600;">(Add ₹${minVal - totalPrice} more)</span>` : `<span style="color: #10B981; font-weight: 700; font-size: 11px;">✓ Click to apply</span>`;

                    badge.innerHTML = `
                        <div>
                            <strong style="color: ${isEligible ? '#E5C365' : '#cbd5e1'}; letter-spacing: 0.5px;">${c.code}</strong>
                            <span style="color: #94a3b8; font-size: 11px; margin-left: 6px;">(${discText}${minVal > 0 ? ` on ₹${minVal}+` : ''})</span>
                        </div>
                        ${unlockTag}
                    `;

                    badge.addEventListener("click", () => {
                        const couponCodeInput = document.getElementById("coupon-code-input");
                        const applyCouponBtn = document.getElementById("apply-coupon-btn");
                        if (couponCodeInput) {
                            couponCodeInput.value = c.code;
                            if (applyCouponBtn) applyCouponBtn.click();
                        }
                    });

                    list.appendChild(badge);
                });
            } catch (e) {
                console.warn("Could not load public coupons:", e);
            }
        };

        // Toggle Available Coupons List Visibility
        const toggleCouponsBtn = document.getElementById("toggle-coupons-btn");
        const availableCouponsContainer = document.getElementById("available-coupons-container");
        if (toggleCouponsBtn && availableCouponsContainer) {
            toggleCouponsBtn.addEventListener("click", (e) => {
                e.preventDefault();
                const isHidden = window.getComputedStyle(availableCouponsContainer).display === "none";
                availableCouponsContainer.style.display = isHidden ? "block" : "none";
                const span = toggleCouponsBtn.querySelector("span");
                if (span) {
                    span.textContent = isHidden ? "🎟️ Hide Coupons" : "🎟️ See Coupons";
                }
            });
        }

        // Coupon Application Event Listener
        const applyCouponBtn = document.getElementById("apply-coupon-btn");
        const couponCodeInput = document.getElementById("coupon-code-input");
        const couponMsg = document.getElementById("coupon-message");
        const clearInputBtn = document.getElementById("clear-coupon-input-btn");

        const updateClearInputBtnVisibility = () => {
            if (clearInputBtn && couponCodeInput) {
                clearInputBtn.style.display = (couponCodeInput.value.trim().length > 0 || appliedCoupon) ? "flex" : "none";
            }
        };

        if (couponCodeInput) {
            couponCodeInput.addEventListener("input", updateClearInputBtnVisibility);
        }

        const resetAppliedCoupon = (showNotification = true) => {
            appliedCoupon = null;
            if (couponCodeInput) couponCodeInput.value = "";
            if (couponMsg) {
                couponMsg.style.display = "none";
                couponMsg.innerHTML = "";
            }
            updateClearInputBtnVisibility();
            renderCheckoutPageSummary();
            loadAvailableCoupons();
            if (showNotification) {
                showToast("Coupon Removed", "Promo code removed from your order.");
            }
        };

        if (clearInputBtn) {
            clearInputBtn.addEventListener("click", () => resetAppliedCoupon(true));
        }

        if (applyCouponBtn && couponCodeInput) {
            applyCouponBtn.addEventListener("click", async () => {
                const code = couponCodeInput.value.trim();
                const { totalPrice } = getCartTotals();
                if (!code) {
                    showToast("Warning", "Please enter a coupon code.");
                    return;
                }
                if (totalPrice <= 0) {
                    showToast("Warning", "Your cart is empty.");
                    return;
                }
                try {
                    const res = await fetch(`${getApiBase()}/api/orders/validate-coupon`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ code, cart_total: totalPrice })
                    });
                    const data = await res.json();
                    if (!res.ok) {
                        if (couponMsg) {
                            couponMsg.style.display = "flex";
                            couponMsg.style.color = "#ef4444";
                            couponMsg.innerHTML = `<span>${data.detail || "Invalid or ineligible coupon code."}</span>`;
                        }
                        appliedCoupon = null;
                        updateClearInputBtnVisibility();
                        renderCheckoutPageSummary();
                        loadAvailableCoupons();
                        return;
                    }

                    appliedCoupon = data;
                    if (couponMsg) {
                        couponMsg.style.display = "flex";
                        couponMsg.style.color = "#10B981";
                        couponMsg.textContent = data.message;
                    }
                    updateClearInputBtnVisibility();
                    renderCheckoutPageSummary();
                    loadAvailableCoupons();
                    showToast("Coupon Applied", `Saved ₹${data.discount_amount} on your order!`);
                } catch (err) {
                    showToast("Error", "Failed to validate coupon code.");
                }
            });
        }

        // Remove Coupon Handler for Discount Summary Row
        const removeCouponBtn = document.getElementById("remove-coupon-btn");
        if (removeCouponBtn) {
            removeCouponBtn.addEventListener("click", () => resetAppliedCoupon(true));
        }

        // Load Payment Config (Razorpay enabled status)
        const loadPaymentConfig = async () => {
            try {
                const res = await fetch(`${getApiBase()}/api/orders/payment-config`);
                if (!res.ok) return;
                const config = await res.json();
                const razorpayCard = document.getElementById("razorpay-option-card");
                const payCod = document.getElementById("pay-cod");

                if (!config.razorpay_enabled) {
                    if (razorpayCard) razorpayCard.style.display = "none";
                    if (payCod) payCod.checked = true;
                } else {
                    if (razorpayCard) razorpayCard.style.display = "flex";
                }
            } catch (e) {
                console.warn("Could not fetch payment config:", e);
            }
        };

        renderCheckoutPageSummary();
        loadAvailableCoupons();
        loadPaymentConfig();

    // Payment Method UI Selection
    const paymentRadios = document.querySelectorAll('input[name="payment-method"]');
    paymentRadios.forEach(radio => {
        radio.addEventListener("change", (e) => {
            document.querySelectorAll('.payment-option-card').forEach(card => {
                card.classList.remove('active');
                card.style.background = "rgba(255, 255, 255, 0.01)";
                card.style.border = "1px solid var(--border-dark)";
            });
            const activeCard = e.target.closest('.payment-option-card');
            if (activeCard) {
                activeCard.classList.add('active');
                activeCard.style.background = "rgba(201, 162, 39, 0.06)";
                activeCard.style.border = "1px solid var(--color-gold)";
            }
        });
    });

        // Upgrade button click
        if (checkoutPageUpgradeBtn) {
            checkoutPageUpgradeBtn.addEventListener("click", () => {
                cart = [{
                    name: "Sonrup Family Wellness Combo (3 Bottles)",
                    price: 1799,
                    img: "assets/images/hero-combo.jpg",
                    quantity: 1
                }];
                renderCart();
                renderCheckoutPageSummary();
            });
        }

        // Place Order Form Submit — handles Razorpay & COD
        if (checkoutPageForm) {
            // Helper for guest success popup
            function showGuestSuccessPopup(orderId) {
                const overlay = document.createElement("div");
                overlay.style = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px);";
                
                const popup = document.createElement("div");
                popup.style = "background:var(--bg-dark-card);border:1px solid var(--color-gold);padding:40px;border-radius:16px;text-align:center;max-width:400px;width:90%;box-shadow:0 10px 30px rgba(0,0,0,0.5);";
                
                popup.innerHTML = `
                    <div style="font-size:48px;margin-bottom:16px;">🎉</div>
                    <h2 style="color:#FFF;font-size:24px;margin-bottom:8px;">Order Successful!</h2>
                    <p style="color:var(--text-on-dark-muted);margin-bottom:20px;">Thank you for your purchase.</p>
                    <div style="background:rgba(255,255,255,0.05);padding:12px;border-radius:8px;margin-bottom:24px;">
                        <p style="color:#FFF;font-size:14px;margin:0;">Order ID: <strong>${orderId}</strong></p>
                    </div>
                    <button id="success-popup-btn" class="btn-primary btn-block" style="padding:14px;width:100%;">Continue Shopping</button>
                `;
                
                overlay.appendChild(popup);
                document.body.appendChild(overlay);
                
                document.getElementById("success-popup-btn").addEventListener("click", () => {
                    document.body.removeChild(overlay);
                    window.location.href = "/";
                });
            }

            checkoutPageForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                if (cart.length === 0) {
                    showToast("Checkout Error", "Your shopping cart is empty!");
                    return;
                }

                const placeBtn = document.getElementById("place-order-page-btn");
                const originalBtnText = placeBtn.innerHTML;
                placeBtn.disabled = true;
                placeBtn.innerHTML = `<span>Processing Order...</span>`;

                try {
                    const nameVal = document.getElementById("checkout-name")?.value || "";
                    const addressVal = document.getElementById("checkout-address")?.value || "";
                    const cityVal = document.getElementById("checkout-city")?.value || "";
                    const pincodeVal = document.getElementById("checkout-pincode")?.value || "";
                    const emailVal = document.getElementById("checkout-email")?.value || "";
                    const phoneVal = document.getElementById("checkout-phone")?.value || "";
                    const paymentMethod = document.querySelector('input[name="payment-method"]:checked')?.value || "razorpay";

                    const orderPayload = {
                        items: cart.map(item => ({
                            name: item.name,
                            price: item.price,
                            img: item.img,
                            quantity: item.quantity,
                        })),
                        shipping: {
                            name: nameVal,
                            address: addressVal,
                            city: cityVal,
                            pincode: pincodeVal,
                            email: emailVal,
                            phone: phoneVal,
                        },
                        payment_method: paymentMethod === "razorpay" ? "Razorpay" : "COD",
                    };

                    localStorage.setItem("sonrup_last_order_shipping", JSON.stringify(orderPayload.shipping));

                    const recordGuestOrder = (orderId) => {
                        const newOrder = {
                            order_id: orderId || `SR${Math.floor(100000 + Math.random() * 900000)}`,
                            date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                            items: orderPayload.items,
                            total: getCartTotals().totalPrice,
                            status: 'Processing',
                            shipping: orderPayload.shipping
                        };
                        let list = JSON.parse(localStorage.getItem("sonrup_guest_orders") || "[]");
                        list.unshift(newOrder);
                        localStorage.setItem("sonrup_guest_orders", JSON.stringify(list));
                    };

                    if (paymentMethod === "razorpay") {
                        const { totalPrice } = getCartTotals();
                        const finalAmount = appliedCoupon && appliedCoupon.valid ? Math.max(0, totalPrice - appliedCoupon.discount_amount) : totalPrice;

                        const createRzpRes = await fetch(`${getApiBase()}/api/orders/create-razorpay-order`, {
                            method: "POST",
                            headers: getAuthHeaders(),
                            body: JSON.stringify({ amount: finalAmount, coupon_code: appliedCoupon ? appliedCoupon.code : null })
                        });

                        if (!createRzpRes.ok) {
                            const rzpErr = await createRzpRes.json();
                            placeBtn.disabled = false;
                            placeBtn.innerHTML = originalBtnText;
                            showToast("Payment Error", rzpErr.detail || "Could not initialize Razorpay payment.");
                            return;
                        }

                        const rzpOrderData = await createRzpRes.json();

                        const options = {
                            key: rzpOrderData.key_id,
                            amount: rzpOrderData.amount,
                            currency: rzpOrderData.currency,
                            name: "Sonrup™ Family Wellness",
                            description: "Premium Wellness Checkout",
                            order_id: rzpOrderData.razorpay_order_id,
                            handler: async function (response) {
                                placeBtn.disabled = true;
                                placeBtn.innerHTML = `<span>Verifying Payment...</span>`;

                                try {
                                    const verifyRes = await fetch(`${getApiBase()}/api/orders/verify-razorpay-payment`, {
                                        method: "POST",
                                        headers: getAuthHeaders(),
                                        body: JSON.stringify({
                                            razorpay_order_id: response.razorpay_order_id || rzpOrderData.razorpay_order_id,
                                            razorpay_payment_id: response.razorpay_payment_id || `pay_${Date.now()}`,
                                            razorpay_signature: response.razorpay_signature || "",
                                            order_data: orderPayload
                                        })
                                    });

                                    placeBtn.disabled = false;
                                    placeBtn.innerHTML = originalBtnText;

                                    if (!verifyRes.ok) {
                                        const verifyErr = await verifyRes.json();
                                        showToast("Verification Failed", verifyErr.detail || "Payment verification failed.");
                                        return;
                                    }

                                    const verifyData = await verifyRes.json();
                                    recordGuestOrder(response.razorpay_order_id || rzpOrderData.razorpay_order_id);
                                    cart = [];
                                    renderCart();
                                    checkoutPageForm.reset();

                                    if (isLoggedIn()) {
                                        showToast("Payment Successful!", "Thank you! Redirecting to your dashboard...");
                                        setTimeout(() => { window.location.href = "/profile"; }, 1500);
                                    } else {
                                        const orderId = verifyData.order ? verifyData.order.order_id : "N/A";
                                        showGuestSuccessPopup(orderId);
                                    }
                                } catch (e) {
                                    placeBtn.disabled = false;
                                    placeBtn.innerHTML = originalBtnText;
                                    showToast("Error", "Failed to verify Razorpay payment.");
                                }
                            },
                            prefill: {
                                name: nameVal,
                                email: emailVal,
                                contact: phoneVal
                            },
                            theme: {
                                color: "#C9A227"
                            },
                            modal: {
                                ondismiss: function () {
                                    placeBtn.disabled = false;
                                    placeBtn.innerHTML = originalBtnText;
                                    showToast("Payment Cancelled", "Razorpay payment window was closed.");
                                }
                            }
                        };

                        const isRealRazorpayKey = rzpOrderData.key_id && !rzpOrderData.key_id.includes("SampleKey123") && rzpOrderData.key_id.length > 15;

                        if (rzpOrderData.mock_payment || options.key.includes("SampleKey")) {
                            showToast("Test Mode", "Simulating Razorpay payment for test mode...");
                            setTimeout(() => {
                                options.handler({
                                    razorpay_payment_id: "pay_test_" + Date.now(),
                                    razorpay_order_id: options.order_id,
                                    razorpay_signature: "mock_signature"
                                });
                            }, 1000);
                        } else if (window.Razorpay && isRealRazorpayKey) {
                            const rzpInstance = new window.Razorpay(options);
                            rzpInstance.open();
                        } else {
                            showToast("Error", "Razorpay SDK not loaded.");
                            placeBtn.disabled = false;
                            placeBtn.innerHTML = originalBtnText;
                        }
                        return;
                    }

                    // Cash on Delivery Flow
                    const res = await fetch(`${getApiBase()}/api/orders`, {
                        method: "POST",
                        headers: getAuthHeaders(),
                        body: JSON.stringify(orderPayload),
                    });

                    placeBtn.disabled = false;
                    placeBtn.innerHTML = originalBtnText;

                    if (!res.ok) {
                        const err = await res.json();
                        showToast("Order Failed", err.detail || "Could not place order.");
                        return;
                    }

                    const codData = await res.json();
                    const codResData = await res.json();
                    recordGuestOrder(codResData.order_id);
                    cart = [];
                    renderCart();
                    checkoutPageForm.reset();

                    if (isLoggedIn()) {
                        showToast("Order Successful!", "Thank you! Redirecting to your dashboard...");
                        setTimeout(() => { window.location.href = "/profile"; }, 1500);
                    } else {
                        const orderId = codData.order_id || "N/A";
                        showGuestSuccessPopup(orderId);
                    }
                } catch (err) {
                    placeBtn.disabled = false;
                    placeBtn.innerHTML = originalBtnText;
                    showToast("Error", "Something went wrong. Please try again.");
                }
            });
        }
    }

    // Global Event Delegation for "Buy Now" and "Add to Cart" Actions Across All Pages
    document.addEventListener("click", (e) => {
        const buyNowBtn = e.target.closest(".buy-now-btn");
        if (buyNowBtn) {
            e.preventDefault();
            e.stopPropagation();

            const name = buyNowBtn.getAttribute("data-name") || "Wellness Product";
            const price = parseInt(buyNowBtn.getAttribute("data-price") || "999");
            const img = buyNowBtn.getAttribute("data-img") || "assets/images/hero-combo.jpg";

            const existingItem = cart.find(item => item.name === name);
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({ name, price, img, quantity: 1 });
            }
            saveCart();
            renderCart();

            showToast("Buy Now", `Added ${name} to your order. Redirecting to checkout...`);
            setTimeout(() => {
                window.location.href = "checkout.html";
            }, 400);
            return;
        }

        const addToCartBtn = e.target.closest(".add-to-cart-btn");
        if (addToCartBtn) {
            e.preventDefault();
            e.stopPropagation();

            const name = addToCartBtn.getAttribute("data-name") || "Wellness Product";
            const price = parseInt(addToCartBtn.getAttribute("data-price") || "999");
            const img = addToCartBtn.getAttribute("data-img") || "assets/images/hero-combo.jpg";

            addItemToCart(name, price, img);
            return;
        }
    });

    // Catalog Page: Filtering, Sorting, and Search logic
    if (window.location.pathname.includes("shop") || document.getElementById("catalog-grid")) {
        const filterBtns = document.querySelectorAll(".filter-tab-btn");
        const searchInput = document.getElementById("catalog-search-input");
        const sortSelect = document.getElementById("catalog-sort-select");
        const catalogGrid = document.getElementById("catalog-grid");
        
        let originalCardsOrder = [];
        if (catalogGrid) {
            originalCardsOrder = Array.from(catalogGrid.querySelectorAll(".product-card"));
        }

        const updateCatalog = () => {
            if (!catalogGrid) return;

            const activeBtn = document.querySelector(".filter-tab-btn.active") || filterBtns[0];
            const activeFilter = activeBtn ? activeBtn.getAttribute("data-filter") : "all";
            const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : "";
            const currentSort = sortSelect ? sortSelect.value : "default";

            // Update Tab Button Highlight Styles visually
            filterBtns.forEach(btn => {
                const isCurrentActive = btn === activeBtn || btn.getAttribute("data-filter") === activeFilter;
                if (isCurrentActive) {
                    btn.classList.add("active");
                    btn.style.backgroundColor = "var(--color-gold)";
                    btn.style.color = "#121212";
                    btn.style.borderColor = "var(--color-gold)";
                    btn.style.fontWeight = "700";
                } else {
                    btn.classList.remove("active");
                    btn.style.backgroundColor = "rgba(255, 255, 255, 0.03)";
                    btn.style.color = "#FFFFFF";
                    btn.style.borderColor = "rgba(255, 255, 255, 0.1)";
                    btn.style.fontWeight = "normal";
                }
            });

            // Get cards list
            let cards = [...originalCardsOrder];

            // 1. Filter by category
            if (activeFilter !== "all") {
                cards = cards.filter(card => card.getAttribute("data-type") === activeFilter);
            }

            // 2. Filter by search query
            if (searchQuery) {
                cards = cards.filter(card => {
                    const name = card.getAttribute("data-name")?.toLowerCase() || "";
                    const textContent = card.textContent.toLowerCase();
                    return name.includes(searchQuery) || textContent.includes(searchQuery);
                });
            }

            // 3. Sort cards
            if (currentSort === "price-low") {
                cards.sort((a, b) => parseInt(a.getAttribute("data-price") || "0") - parseInt(b.getAttribute("data-price") || "0"));
            } else if (currentSort === "price-high") {
                cards.sort((a, b) => parseInt(b.getAttribute("data-price") || "0") - parseInt(a.getAttribute("data-price") || "0"));
            }

            // 4. Render back to grid
            catalogGrid.innerHTML = "";
            if (cards.length === 0) {
                catalogGrid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-on-dark-muted);">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#C9A227" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 12px; display: inline-block;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                        <p style="font-size: 16px; color: #FFFFFF; margin-bottom: 8px;">No products match your search or filter criteria.</p>
                        <p style="font-size: 13.5px;">Try adjusting your filter tabs or search keywords.</p>
                    </div>
                `;
                return;
            }

            cards.forEach(card => {
                card.style.display = "flex";
                catalogGrid.appendChild(card);
            });

            // Card click redirect for details
            bindProductCardEvents(catalogGrid);
        };

        // Event listener bindings
        filterBtns.forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                filterBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                updateCatalog();
            });
        });

        if (searchInput) {
            searchInput.addEventListener("input", updateCatalog);
        }

        if (sortSelect) {
            sortSelect.addEventListener("change", updateCatalog);
        }

        // Initial setup run
        updateCatalog();
    }

    // Reviews Carousel Logic
    const reviewTrack = document.getElementById("reviews-carousel-track");
    const reviewCards = reviewTrack?.querySelectorAll(".review-card");
    const prevBtn = document.getElementById("review-prev-btn");
    const nextBtn = document.getElementById("review-next-btn");
    const dotsContainer = document.getElementById("carousel-dots");
    const dots = dotsContainer?.querySelectorAll(".dot");

    if (reviewTrack && reviewCards && reviewCards.length > 0) {
        let currentIndex = 0;
        const totalReviews = reviewCards.length;
        let autoSlideTimer = null;

        const updateCarousel = (index) => {
            if (index < 0) {
                currentIndex = totalReviews - 1;
            } else if (index >= totalReviews) {
                currentIndex = 0;
            } else {
                currentIndex = index;
            }

            reviewTrack.style.transform = `translateX(-${currentIndex * 100}%)`;

            dots?.forEach((dot, idx) => {
                if (idx === currentIndex) {
                    dot.classList.add("active");
                } else {
                    dot.classList.remove("active");
                }
            });
        };

        const startAutoSlide = () => {
            stopAutoSlide();
            autoSlideTimer = setInterval(() => {
                updateCarousel(currentIndex + 1);
            }, 5000);
        };

        const stopAutoSlide = () => {
            if (autoSlideTimer) {
                clearInterval(autoSlideTimer);
            }
        };

        prevBtn?.addEventListener("click", () => {
            stopAutoSlide();
            updateCarousel(currentIndex - 1);
            startAutoSlide();
        });

        nextBtn?.addEventListener("click", () => {
            stopAutoSlide();
            updateCarousel(currentIndex + 1);
            startAutoSlide();
        });

        dots?.forEach((dot, idx) => {
            dot.addEventListener("click", () => {
                stopAutoSlide();
                updateCarousel(idx);
                startAutoSlide();
            });
        });

        startAutoSlide();
    }

    // Contact Form submission handler — calls API
    const contactForm = document.getElementById("contact-form");
    if (contactForm) {
        contactForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const nameVal = document.getElementById("contact-name")?.value || "";
            const emailVal = document.getElementById("contact-email")?.value || "";
            const phoneVal = document.getElementById("contact-phone")?.value || "";
            const messageVal = document.getElementById("contact-message")?.value || "";

            try {
                const res = await fetch(`${getApiBase()}/api/contact`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: nameVal,
                        email: emailVal,
                        phone: phoneVal,
                        subject: "General Inquiry",
                        message: messageVal,
                    }),
                });

                if (res.ok) {
                    showToast("Message Sent", `Thank you, ${nameVal}. We'll respond to your email shortly.`);
                    contactForm.reset();
                } else {
                    showToast("Error", "Could not send message. Please try again.");
                }
            } catch (err) {
                showToast("Message Sent", `Thank you, ${nameVal}. We'll respond to your email shortly.`);
                contactForm.reset();
            }
        });
    }

    // Global Product Detail Gallery Thumbnail Switcher
    const thumbs = document.querySelectorAll(".gallery-thumb");
    const previewImg = document.getElementById("main-preview-img");
    if (previewImg && thumbs.length > 0) {
        thumbs.forEach(thumb => {
            thumb.addEventListener("click", () => {
                const imgEl = thumb.querySelector("img");
                if (imgEl) {
                    previewImg.src = imgEl.src;
                    
                    // Maintain custom color filter if it exists on the thumbnail
                    const filterVal = imgEl.style.filter;
                    if (filterVal) {
                        previewImg.style.filter = filterVal + " drop-shadow(0 20px 45px rgba(0,0,0,0.5))";
                    } else {
                        previewImg.style.filter = "drop-shadow(0 20px 45px rgba(0,0,0,0.5))";
                    }

                    thumbs.forEach(t => {
                        t.classList.remove("active");
                        t.style.borderColor = "rgba(255,255,255,0.05)";
                    });
                    thumb.classList.add("active");
                    thumb.style.borderColor = "var(--color-gold)";
                }
            });
        });
    }
});

// ─── Delhivery Tracking Handlers ───
window.trackDelhivery = async (waybill) => {
    try {
        const res = await fetch(`/api/orders/track/${waybill}`);
        if (!res.ok) throw new Error("Could not retrieve tracking details");

        const data = await res.json();
        if (!data.success) throw new Error("No tracking information available yet.");

        document.getElementById("tracking-waybill-title").textContent = waybill;
        document.getElementById("tracking-status").textContent = data.status || "In Transit";

        const timeline = document.getElementById("tracking-timeline");
        timeline.innerHTML = "";

        if (!data.scans || data.scans.length === 0) {
            timeline.innerHTML = '<div style="color: #94a3b8; font-size:12.5px;">No courier facility updates logged yet.</div>';
        } else {
            data.scans.forEach(scan => {
                const item = document.createElement("div");
                item.style.position = "relative";
                item.innerHTML = `
                    <div style="position: absolute; left: -25px; top: 4px; width: 8px; height: 8px; border-radius: 50%; background: var(--color-gold); border: 2px solid var(--bg-dark-card);"></div>
                    <div style="font-weight: 700; color: #fff; font-size:13px;">${scan.status}</div>
                    <div style="color: #cbd5e1; font-size: 12px; margin-top: 2px;">${scan.activity}</div>
                    <div style="color: #94a3b8; font-size: 11px; margin-top: 2px;">📅 ${scan.date}</div>
                `;
                timeline.appendChild(item);
            });
        }

        document.getElementById("delhivery-tracking-modal").style.display = "flex";
    } catch (e) {
        showToast("Tracking Error", e.message);
    }
};

window.closeTrackingModal = () => {
    document.getElementById("delhivery-tracking-modal").style.display = "none";
};
