// Initialize Lucide Icons
document.addEventListener("DOMContentLoaded", () => {
    if (window.lucide) {
        window.lucide.createIcons();
    }
    
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
                "https://res.cloudinary.com/dr3vva4uq/image/upload/v1783158362/shilajit-bottle.jpg",
                "https://res.cloudinary.com/dr3vva4uq/image/upload/v1783158366/shilajit-detail1.jpg",
                "https://res.cloudinary.com/dr3vva4uq/image/upload/v1783158370/shilajit-detail2.jpg",
                "https://res.cloudinary.com/dr3vva4uq/image/upload/v1783158375/shilajit-detail3.jpg"
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
                "https://res.cloudinary.com/dr3vva4uq/image/upload/v1783158317/biotin-bottle.jpg",
                "https://res.cloudinary.com/dr3vva4uq/image/upload/v1783158321/biotin-detail1.jpg",
                "https://res.cloudinary.com/dr3vva4uq/image/upload/v1783158326/biotin-detail2.jpg",
                "https://res.cloudinary.com/dr3vva4uq/image/upload/v1783158331/biotin-detail3.jpg"
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
                "https://res.cloudinary.com/dr3vva4uq/image/upload/v1783158339/kids-bottle.jpg",
                "https://res.cloudinary.com/dr3vva4uq/image/upload/v1783158343/kids-detail1.jpg",
                "https://res.cloudinary.com/dr3vva4uq/image/upload/v1783158348/kids-detail2.jpg",
                "https://res.cloudinary.com/dr3vva4uq/image/upload/v1783158358/kids-detail3.jpg"
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
                img: "https://res.cloudinary.com/dr3vva4uq/image/upload/v1783158335/hero-combo.jpg",
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
            addItemToCart("Sonrup Family Wellness Combo (3 Bottles)", 1799, "https://res.cloudinary.com/dr3vva4uq/image/upload/v1783158335/hero-combo.jpg");
        });
    });

    // Add to Cart for Individual Cards
    const addToCartButtons = document.querySelectorAll(".add-to-cart-btn");
    addToCartButtons.forEach(btn => {
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
            
            // Remove existing listener to prevent duplicates by cloning
            const newCard = card.cloneNode(true);
            card.parentNode.replaceChild(newCard, card);
            
            newCard.addEventListener("click", (e) => {
                if (e.target.closest(".add-to-cart-btn") || e.target.closest(".buy-now-btn")) {
                    return;
                }
                const name = newCard.getAttribute("data-name") || newCard.querySelector("h3")?.textContent || "";
                
                if (newCard.classList.contains("card-shilajit")) {
                    window.location.href = "shilajit.html";
                } else if (newCard.classList.contains("card-biotin")) {
                    window.location.href = "biotin.html";
                } else if (newCard.classList.contains("card-kids")) {
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
        const loggedInUser = localStorage.getItem("sonrup_user");
        const authActionsContainer = document.getElementById("header-auth-actions");
        if (!authActionsContainer) return;

        // Keep cart trigger
        const headerButtonsHtml = `
            <button class="cart-trigger" id="cart-button" aria-label="View Cart" style="cursor: pointer;">
                <i data-lucide="shopping-cart" style="width: 18px; height: 18px;"></i>
                <span class="cart-badge" id="cart-count">${getCartTotals().totalQty}</span>
            </button>
        `;

        if (loggedInUser) {
            const userObj = JSON.parse(loggedInUser);
            authActionsContainer.innerHTML = `
                ${headerButtonsHtml}
                <a href="profile.html" class="nav-profile-btn" id="header-profile-icon" title="View Profile: ${userObj.name}" style="display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; border: 1.5px solid var(--color-gold); background: rgba(201, 162, 39, 0.1); color: var(--color-gold); cursor: pointer; text-decoration: none;">
                    <i data-lucide="user" style="width: 16px; height: 16px;"></i>
                </a>
            `;
        } else {
            authActionsContainer.innerHTML = `
                ${headerButtonsHtml}
                <a href="login.html" class="btn-secondary btn-sm" id="header-login-btn">Login</a>
            `;
        }

        // Re-bind header triggers
        const newCartBtn = authActionsContainer.querySelector("#cart-button");
        if (newCartBtn) {
            newCartBtn.addEventListener("click", () => {
                openCartDrawer();
            });
        }

        if (window.lucide) window.lucide.createIcons();
    };

    // Run dynamic header update on page load
    updateHeaderAuthUI();

    // Login Form Handler
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const email = document.getElementById("login-email").value;
            // Simulated user database check or auto-create details
            const mockUser = {
                name: "John Doe",
                email: email,
                phone: "9876543210",
                address: "Flat 12, Sitaram Society, Punagam Road, Surat - 395010"
            };
            localStorage.setItem("sonrup_user", JSON.stringify(mockUser));
            showToast("Login Successful", "Redirecting to your wellness profile...");
            setTimeout(() => {
                window.location.href = "profile.html";
            }, 1000);
        });
    }

    // Signup Form Handler
    const signupForm = document.getElementById("signup-form");
    if (signupForm) {
        signupForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const name = document.getElementById("signup-name").value;
            const email = document.getElementById("signup-email").value;
            const phone = document.getElementById("signup-phone").value;
            const pincode = document.getElementById("signup-pincode").value;
            const address = document.getElementById("signup-address").value;
            
            const newUser = {
                name: name,
                email: email,
                phone: phone,
                address: address + ", Pincode: " + pincode
            };
            localStorage.setItem("sonrup_user", JSON.stringify(newUser));
            showToast("Account Created", "Redirecting to your profile dashboard...");
            setTimeout(() => {
                window.location.href = "profile.html";
            }, 1000);
        });
    }

    // Logout Action
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("sonrup_user");
            showToast("Logged Out", "Successfully logged out of your account.");
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1000);
        });
    }

    // Profile Page Loader
    if (window.location.pathname.includes("profile.html")) {
        const loggedInUser = localStorage.getItem("sonrup_user");
        if (!loggedInUser) {
            window.location.href = "login.html";
        } else {
            const userObj = JSON.parse(loggedInUser);
            const welcomeEl = document.getElementById("profile-welcome-name");
            const detailNameEl = document.getElementById("profile-detail-name");
            const detailEmailEl = document.getElementById("profile-detail-email");
            const detailPhoneEl = document.getElementById("profile-detail-phone");
            const detailAddressEl = document.getElementById("profile-detail-address");

            if (welcomeEl) welcomeEl.textContent = userObj.name;
            if (detailNameEl) detailNameEl.textContent = userObj.name;
            if (detailEmailEl) detailEmailEl.textContent = userObj.email;
            if (detailPhoneEl) detailPhoneEl.textContent = userObj.phone;
            if (detailAddressEl) detailAddressEl.textContent = userObj.address;

            // Render Orders List
            const ordersListContainer = document.getElementById("profile-orders-list");
            const noOrdersMsg = document.getElementById("no-orders-msg");
            const orders = JSON.parse(localStorage.getItem("sonrup_orders")) || [];

            if (orders.length > 0) {
                noOrdersMsg.style.display = "none";
                
                // Sort orders by date/time (newest first)
                orders.reverse();
                
                orders.forEach(order => {
                    const orderCard = document.createElement("div");
                    orderCard.style.border = "1px solid var(--border-dark)";
                    orderCard.style.borderRadius = "12px";
                    orderCard.style.padding = "20px";
                    orderCard.style.backgroundColor = "rgba(255, 255, 255, 0.01)";
                    
                    let itemsSummaryHtml = "";
                    order.items.forEach(item => {
                        itemsSummaryHtml += `
                            <div style="display:flex; justify-content:space-between; margin-bottom: 6px; font-size: 13px;">
                                <span>${item.name} x ${item.quantity}</span>
                                <span>₹${(item.price * item.quantity).toLocaleString("en-IN")}</span>
                            </div>
                        `;
                    });

                    orderCard.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom:12px; margin-bottom:12px;">
                            <div>
                                <span style="font-size:11px; text-transform:uppercase; color:var(--text-on-dark-muted);">Order ID</span>
                                <strong style="display:block; color:#FFFFFF; font-size:14px;">#${order.id}</strong>
                            </div>
                            <div style="text-align:right;">
                                <span style="font-size:11px; text-transform:uppercase; color:var(--text-on-dark-muted);">Order Date</span>
                                <span style="display:block; color:#FFFFFF; font-size:13px;">${order.date}</span>
                            </div>
                        </div>
                        <div style="margin-bottom:12px;">
                            ${itemsSummaryHtml}
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; border-top: 1px solid rgba(255,255,255,0.05); padding-top:12px; font-weight:600;">
                            <div>
                                <span style="font-size:11px; text-transform:uppercase; color:var(--text-on-dark-muted); font-weight:normal; display:block;">Grand Total</span>
                                <span style="color:var(--color-gold); font-size:16px;">₹${order.total.toLocaleString("en-IN")}</span>
                            </div>
                            <span style="font-size:12px; padding: 4px 10px; border-radius: 20px; background: rgba(0, 180, 100, 0.15); color: #00FF7F; border: 1px solid rgba(0, 180, 100, 0.2);"><i data-lucide="truck" style="width: 12px; height: 12px; margin-right: 4px; display:inline-block; vertical-align:middle;"></i> ${order.status}</span>
                        </div>
                    `;
                    ordersListContainer.appendChild(orderCard);
                });
                
                if (window.lucide) window.lucide.createIcons();
            }
        }
    }

    // Checkout Page Loading & Submission logic
    if (window.location.pathname.includes("checkout.html")) {
        const checkoutPageForm = document.getElementById("checkout-page-form");
        const checkoutPageSummaryList = document.getElementById("checkout-page-summary-list");
        const checkoutPageGrandTotal = document.getElementById("checkout-page-grand-total");
        const checkoutPageUpgradeBox = document.getElementById("checkout-page-upgrade-box");
        const checkoutPageUpgradeBtn = document.getElementById("checkout-page-upgrade-btn");

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
            
            // Extract address and pincode from address string if possible
            if (userObj.address && addressField && pincodeField) {
                const parts = userObj.address.split(", Pincode: ");
                addressField.value = parts[0] || "";
                if (parts[1]) {
                    pincodeField.value = parts[1] || "";
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

            checkoutPageGrandTotal.textContent = `₹${totalPrice.toLocaleString("en-IN")}.00`;

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

        renderCheckoutPageSummary();

        // Upgrade button click
        if (checkoutPageUpgradeBtn) {
            checkoutPageUpgradeBtn.addEventListener("click", () => {
                cart = [{
                    name: "Sonrup Family Wellness Combo (3 Bottles)",
                    price: 1799,
                    img: "https://res.cloudinary.com/dr3vva4uq/image/upload/v1783158335/hero-combo.jpg",
                    quantity: 1
                }];
                renderCart();
                renderCheckoutPageSummary();
            });
        }

        // Place Order Form Submit
        if (checkoutPageForm) {
            checkoutPageForm.addEventListener("submit", (e) => {
                e.preventDefault();
                if (cart.length === 0) {
                    showToast("Checkout Error", "Your shopping cart is empty!");
                    return;
                }

                const placeBtn = document.getElementById("place-order-page-btn");
                const originalBtnText = placeBtn.innerHTML;
                placeBtn.disabled = true;
                placeBtn.innerHTML = `<span>Processing Order...</span>`;

                setTimeout(() => {
                    placeBtn.disabled = false;
                    placeBtn.innerHTML = originalBtnText;

                    const { totalPrice } = getCartTotals();
                    // Save to order history database in localStorage
                    const newOrder = {
                        id: "SR" + Math.floor(Math.random() * 900000 + 100000),
                        date: new Date().toLocaleDateString("en-IN"),
                        items: cart,
                        total: totalPrice,
                        status: "Processing"
                    };

                    const pastOrders = JSON.parse(localStorage.getItem("sonrup_orders")) || [];
                    pastOrders.push(newOrder);
                    localStorage.setItem("sonrup_orders", JSON.stringify(pastOrders));

                    // Clear shopping cart
                    cart = [];
                    renderCart();
                    checkoutPageForm.reset();

                    showToast("Order Successful!", "Thank you! Redirecting to your dashboard...");
                    setTimeout(() => {
                        window.location.href = "profile.html";
                    }, 1500);
                }, 1500);
            });
        }
    }

    // "Buy Now" Button Actions
    const buyNowButtons = document.querySelectorAll(".buy-now-btn");
    buyNowButtons.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const name = btn.getAttribute("data-name");
            const price = parseInt(btn.getAttribute("data-price"));
            const img = btn.getAttribute("data-img");
            
            // Add item to cart state, save cart, and redirect to checkout page instantly!
            const existingItem = cart.find(item => item.name === name);
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({ name, price, img, quantity: 1 });
            }
            saveCart();
            window.location.href = "checkout.html";
        });
    });
    // Catalog Page: Filtering, Sorting, and Search logic
    if (window.location.pathname.includes("shop.html")) {
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

            const activeFilter = document.querySelector(".filter-tab-btn.active")?.getAttribute("data-filter") || "all";
            const searchQuery = searchInput?.value.toLowerCase().trim() || "";
            const currentSort = sortSelect?.value || "default";

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
                cards.sort((a, b) => parseInt(a.getAttribute("data-price")) - parseInt(b.getAttribute("data-price")));
            } else if (currentSort === "price-high") {
                cards.sort((a, b) => parseInt(b.getAttribute("data-price")) - parseInt(a.getAttribute("data-price")));
            }

            // 4. Render back to grid
            catalogGrid.innerHTML = "";
            cards.forEach(card => {
                // Ensure card remains visible/hidden correctly
                card.style.display = "flex";
                catalogGrid.appendChild(card);
            });

            // Re-bind actions for newly arranged/rendered cards
            bindProductCatalogEvents();
        };

        // Event listener bindings
        filterBtns.forEach(btn => {
            btn.addEventListener("click", () => {
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

        // Re-bind cart & buy now actions for dynamically ordered items
        const bindProductCatalogEvents = () => {
            const addToCartBtns = catalogGrid.querySelectorAll(".add-to-cart-btn");
            addToCartBtns.forEach(btn => {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                
                newBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const name = newBtn.getAttribute("data-name");
                    const price = parseInt(newBtn.getAttribute("data-price"));
                    const img = newBtn.getAttribute("data-img");
                    addItemToCart(name, price, img);
                });
            });

            const buyNowBtns = catalogGrid.querySelectorAll(".buy-now-btn");
            buyNowBtns.forEach(btn => {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                
                newBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const name = newBtn.getAttribute("data-name");
                    const price = parseInt(newBtn.getAttribute("data-price"));
                    const img = newBtn.getAttribute("data-img");

                    const existingItem = cart.find(item => item.name === name);
                    if (existingItem) {
                        existingItem.quantity += 1;
                    } else {
                        cart.push({ name, price, img, quantity: 1 });
                    }
                    saveCart();
                    window.location.href = "checkout.html";
                });
            });

            // Tap/click card to redirect or open combo details modal
            bindProductCardEvents(catalogGrid);
        };

        // Initialize grid events on load
        bindProductCatalogEvents();
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

    // Contact Form submission handler
    const contactForm = document.getElementById("contact-form");
    if (contactForm) {
        contactForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const nameEl = document.getElementById("contact-name");
            const name = nameEl ? nameEl.value : "there";
            showToast("Message Sent", `Thank you, ${name}. We'll respond to your email shortly.`);
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
