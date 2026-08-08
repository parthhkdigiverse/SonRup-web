/**
 * SonRup™ Enterprise Admin Portal Controller (admin.js)
 * Manages Bearer authentication, KPI synchronization, Catalog CRUD, Order fulfillment, and Dynamic Site Configuration.
 */

let API_BASE_URL = "http://localhost:8030/api";
let currentProducts = [];

// Initialize Dashboard on load
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Resolve Dynamic API URL
    try {
        const configRes = await fetch("/config.json");
        if (configRes.ok) {
            const config = await configRes.json();
            if (config.backend_url) {
                // Use explicit backend URL from .env
                API_BASE_URL = `${config.backend_url}/api`;
            } else if (config.backend_port) {
                // Fallback to local port mapping
                API_BASE_URL = `http://localhost:${config.backend_port}/api`;
            }
        }
    } catch (e) {
        console.warn("Using default API fallback URL:", API_BASE_URL);
    }

    // 2. Initialize Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // 3. Setup Listeners & INSTANTLY Restore Active Page before network requests!
    setupEventListeners();
    restoreActiveTab();

    // 4. Authenticate & Verify Admin Status
    const token = localStorage.getItem("sonrup_token") || localStorage.getItem("access_token") || localStorage.getItem("auth_token") || localStorage.getItem("token");
    if (!token) {
        showAdminLoginScreen();
        return;
    }

    await initDashboard();
});

// Also listen for browser back/forward navigation or hash changes
window.addEventListener("hashchange", () => {
    restoreActiveTab();
});


/**
 * Get authenticated fetch headers
 */
function getHeaders(isJson = true) {
    const token = localStorage.getItem("sonrup_token") || localStorage.getItem("access_token") || localStorage.getItem("auth_token") || localStorage.getItem("token");
    const headers = { "Authorization": `Bearer ${token}` };
    if (isJson) {
        headers["Content-Type"] = "application/json";
    }
    return headers;
}


/**
 * Toast Notification Popup (Fixed Simple Top-Right Corner)
 */
function showToast(message, isError = false) {
    let toast = document.getElementById("admin-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "admin-toast";
        toast.style.position = "fixed";
        toast.style.top = "24px";
        toast.style.right = "24px";
        toast.style.left = "auto";
        toast.style.bottom = "auto";
        toast.style.zIndex = "999999";
        toast.style.background = "rgba(18, 18, 18, 0.95)";
        toast.style.color = "#ffffff";
        toast.style.padding = "14px 22px";
        toast.style.borderRadius = "10px";
        toast.style.border = "1px solid rgba(201, 162, 39, 0.4)";
        toast.style.borderLeft = `4px solid ${isError ? "#ef4444" : "#C9A227"}`;
        toast.style.boxShadow = "0 10px 30px rgba(0, 0, 0, 0.5), 0 0 12px rgba(201, 162, 39, 0.25)";
        toast.style.fontFamily = "'Outfit', sans-serif";
        toast.style.fontSize = "13.5px";
        toast.style.fontWeight = "600";
        toast.style.display = "flex";
        toast.style.alignItems = "center";
        toast.style.gap = "10px";
        toast.style.backdropFilter = "blur(10px)";
        toast.style.transition = "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)";
        toast.style.opacity = "0";
        toast.style.transform = "translateX(40px)";
        
        toast.innerHTML = `<i data-lucide="${isError ? 'alert-circle' : 'check-circle'}" style="width: 18px; height: 18px; color: ${isError ? '#ef4444' : '#C9A227'}; flex-shrink: 0;"></i><span id="toast-msg"></span>`;
        document.body.appendChild(toast);
    }

    const msg = toast.querySelector("#toast-msg") || toast;
    msg.textContent = message;
    toast.style.borderLeftColor = isError ? "#ef4444" : "#C9A227";
    toast.style.opacity = "1";
    toast.style.transform = "translateX(0)";

    if (window.lucide) {
        window.lucide.createIcons();
    }

    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(40px)";
    }, 3200);
}


/**
 * Load all operational modules
 */
async function initDashboard() {
    showToast("Connecting to SonRup Enterprise Backend...");
    const statsSuccess = await loadStats();
    if (!statsSuccess) return;

    await Promise.all([
        loadProducts(),
        loadOrders(),
        loadSettings(),
        loadUsers(),
        loadCoupons(),
        loadInquiries()
    ]);
    
    // Restore exact active tab & step on refresh
    restoreActiveTab();

    showToast("✅ Admin Dashboard fully synchronized.");
}

window.refreshAdminData = initDashboard;


/**
 * 1. DASHBOARD METRICS
 */
async function loadStats() {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/stats`, { headers: getHeaders() });
        if (res.status === 401 || res.status === 403 || res.status === 404) {
            localStorage.removeItem("sonrup_token");
            localStorage.removeItem("access_token");
            localStorage.removeItem("auth_token");
            localStorage.removeItem("token");
            showAdminLoginScreen("🔒 Please log in with your Admin credentials.");
            return false;
        }
        if (!res.ok) throw new Error("Failed to pull platform metrics");

        const data = await res.json();
        document.getElementById("kpi-revenue").textContent = `₹${data.revenue.toLocaleString('en-IN')}`;
        document.getElementById("kpi-orders").textContent = data.orders_count;
        document.getElementById("kpi-products").textContent = data.products_count;
        document.getElementById("kpi-users").textContent = data.users_count;
        if (document.getElementById("kpi-inquiries")) {
            document.getElementById("kpi-inquiries").textContent = data.inquiries_count || 0;
        }
        return true;
    } catch (e) {
        console.error(e);
        showToast("⚠️ Could not connect to Admin API. Verify backend server is running.", true);
        return false;
    }
}


/**
 * 2. PRODUCT CATALOG MANAGER
 */
async function loadProducts() {
    try {
        const res = await fetch(`${API_BASE_URL}/products`);
        const tbody = document.getElementById("products-table-body");
        if (!res.ok) throw new Error("Could not fetch product catalog");

        currentProducts = await res.json();
        tbody.innerHTML = "";

        if (currentProducts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No products in catalog.</td></tr>';
            return;
        }

        currentProducts.forEach(prod => {
            const imgPath = prod.images && prod.images.length ? prod.images[0] : "assets/images/hero-combo.jpg";
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><img src="${imgPath}" alt="${prod.name}" style="width: 54px; height: 54px; border-radius: 10px; object-fit: cover; border: 1px solid rgba(201,162,39,0.3);"></td>
                <td>
                    <div style="font-weight: 700; color: #fff; font-size: 15px;">${prod.name}</div>
                    <code style="color: #94a3b8; font-size: 12px;">/shop/${prod.slug}</code>
                </td>
                <td>
                    <span style="background: rgba(201,162,39,0.15); color: #E5C365; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight:600;">${prod.tag || 'Wellness'}</span>
                    <div style="color: #cbd5e1; font-size: 13px; margin-top: 4px;">${prod.flavor || 'Regular'}</div>
                </td>
                <td style="font-family: 'Outfit', sans-serif; font-weight: 700; color: #C9A227; font-size: 17px;">₹${prod.price}</td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-action btn-edit" onclick="openEditModal('${prod.slug}')"><i data-lucide="edit-3" width="14"></i> Edit</button>
                        <button class="btn-action btn-danger" onclick="deleteProduct('${prod.slug}', '${prod.name.replace(/'/g, "")}')"><i data-lucide="trash-2" width="14"></i> Delete</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        if (window.lucide) window.lucide.createIcons();
    } catch (e) {
        console.error("Error loading products:", e);
    }
}


window.renderImagePreviews = () => {
    const previewContainer = document.getElementById("prod-images-preview");
    const textArea = document.getElementById("prod-all-images");
    if (!previewContainer || !textArea) return;

    const urls = textArea.value.split("\n").map(l => l.trim()).filter(Boolean);
    previewContainer.innerHTML = "";

    if (urls.length === 0) {
        previewContainer.innerHTML = '<span style="color: #94a3b8; font-size: 13px; align-self: center; width: 100%; text-align: center;">No images added yet.</span>';
        return;
    }

    urls.forEach((url, idx) => {
        const imgDiv = document.createElement("div");
        imgDiv.style.position = "relative";
        imgDiv.style.width = "64px";
        imgDiv.style.height = "64px";
        imgDiv.style.borderRadius = "8px";
        imgDiv.style.border = idx === 0 ? "2px solid #E5C365" : "1px solid rgba(255,255,255,0.2)";
        
        const img = document.createElement("img");
        img.src = url;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        img.style.borderRadius = "6px";
        
        const deleteBtn = document.createElement("button");
        deleteBtn.innerHTML = "×";
        deleteBtn.style.position = "absolute";
        deleteBtn.style.top = "-5px";
        deleteBtn.style.right = "-5px";
        deleteBtn.style.width = "20px";
        deleteBtn.style.height = "20px";
        deleteBtn.style.borderRadius = "50%";
        deleteBtn.style.background = "#ef4444";
        deleteBtn.style.color = "white";
        deleteBtn.style.border = "none";
        deleteBtn.style.cursor = "pointer";
        deleteBtn.style.display = "flex";
        deleteBtn.style.alignItems = "center";
        deleteBtn.style.justifyContent = "center";
        deleteBtn.style.fontSize = "14px";
        deleteBtn.style.fontWeight = "bold";
        deleteBtn.style.boxShadow = "0 2px 4px rgba(0,0,0,0.4)";
        
        deleteBtn.onclick = (e) => {
            e.preventDefault();
            const newUrls = [...urls];
            newUrls.splice(idx, 1);
            textArea.value = newUrls.join("\n");
            window.renderImagePreviews();
        };
        
        imgDiv.appendChild(img);
        imgDiv.appendChild(deleteBtn);
        previewContainer.appendChild(imgDiv);
    });
};

document.getElementById("prod-all-images")?.addEventListener("input", window.renderImagePreviews);

document.getElementById("prod-image-file")?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    showToast("Uploading image...");
    const formData = new FormData();
    formData.append("file", file);
    try {
        const uploadRes = await fetch(`${API_BASE_URL}/admin/upload-image`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${localStorage.getItem("sonrup_token") || localStorage.getItem("access_token") || localStorage.getItem("auth_token") || localStorage.getItem("token")}` },
            body: formData
        });
        if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            const textArea = document.getElementById("prod-all-images");
            if (textArea) {
                const current = textArea.value.trim();
                textArea.value = current ? current + "\n" + uploadData.image_path : uploadData.image_path;
                window.renderImagePreviews();
            }
            showToast("✅ Image uploaded and added to gallery.");
        } else {
            showToast("Warning: Image upload failed.", true);
        }
    } catch (err) {
        console.error("Image upload error:", err);
    }
    e.target.value = ""; // Reset file input
});

window.openEditModal = (slug) => {
    const prod = currentProducts.find(p => p.slug === slug);
    if (!prod) return;

    document.getElementById("modal-title").textContent = `Edit Product: ${prod.name}`;
    document.getElementById("prod-original-slug").value = prod.slug;
    document.getElementById("prod-slug").value = prod.slug;
    document.getElementById("prod-slug").disabled = true; // Protect slug ID during edits
    document.getElementById("prod-name").value = prod.name;
    document.getElementById("prod-price").value = prod.price;
    document.getElementById("prod-flavor").value = prod.flavor || "";
    document.getElementById("prod-tag").value = prod.tag || "Adult Performance";
    document.getElementById("prod-description").value = prod.description || "";
    document.getElementById("prod-benefits").value = (prod.benefits || []).join("\n");
    document.getElementById("prod-suggested-usage").value = prod.suggested_usage || "";
    if (prod.ingredients && prod.ingredients.length > 0) {
        document.getElementById("prod-ingredients").value = prod.ingredients.map(ing => `${ing.component} | ${ing.feature} | ${ing.amount}`).join("\n");
    } else {
        document.getElementById("prod-ingredients").value = "";
    }
    document.getElementById("prod-type").value = prod.product_type || "single";
    document.getElementById("prod-tag-class").value = prod.tag_class || "tag-shilajit";
    document.getElementById("prod-all-images").value = (prod.images && prod.images.length) ? prod.images.join("\n") : "assets/images/hero-combo.jpg";
    document.getElementById("prod-image-file").value = "";
    if (window.renderImagePreviews) window.renderImagePreviews();

    document.getElementById("product-modal").classList.add("active");
};

window.deleteProduct = async (slug, name) => {
    if (!confirm(`⚠️ Are you sure you want to permanently delete '${name}' from the online catalog?`)) return;

    try {
        const res = await fetch(`${API_BASE_URL}/admin/products/${slug}`, {
            method: "DELETE",
            headers: getHeaders()
        });
        if (!res.ok) throw new Error("Delete request failed");

        showToast(`🗑️ Product '${name}' removed from catalog.`);
        loadProducts();
        loadStats();
    } catch (e) {
        showToast("Error deleting product. Please try again.", true);
    }
};


/**
 * 3. GLOBAL ORDERS CONTROLLER
 */
async function loadOrders() {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/orders`, { headers: getHeaders() });
        const tbody = document.getElementById("orders-table-body");
        if (!res.ok) throw new Error("Could not fetch customer orders");

        const orders = await res.json();
        tbody.innerHTML = "";

        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No customer orders placed yet.</td></tr>';
            return;
        }

        orders.forEach(order => {
            const orderDate = order.date || (order.created_at ? new Date(order.created_at).toLocaleDateString() : "Today");
            const itemsText = (order.items || []).map(i => `${i.quantity}x ${i.name}`).join("<br>");
            const status = order.status || "Processing";
            
            const shipping = order.shipping || {};
            const shippingName = shipping.name || "Customer";
            const phone = shipping.phone || "N/A";
            const address = shipping.address || "";
            const pincode = shipping.pincode || "";

            let deliveryActionHtml = "";
            if (order.waybill) {
                deliveryActionHtml = `
                    <div style="margin-top: 6px; font-size: 11.5px; color: #94a3b8;">
                        🚚 Delhivery Waybill:<br>
                        <span style="font-family: monospace; font-weight: 700; color: #fff;">${order.waybill}</span>
                        <button class="btn-action btn-edit" onclick="trackDelhivery('${order.waybill}')" style="margin-top: 4px; padding: 4px 8px; font-size: 10px; width: 100%; justify-content: center; height: auto;">📍 Track</button>
                    </div>
                `;
            } else {
                deliveryActionHtml = `
                    <button class="btn-action btn-gold" onclick="shipDelhivery('${order.order_id || order.id}')" style="margin-top: 6px; padding: 4px 8px; font-size: 10px; width: 100%; justify-content: center; height: auto;">🚚 Ship Delhivery</button>
                `;
            }

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>
                    <span style="font-weight: 800; color: #E5C365; font-size: 15px;">#${order.order_id || 'SR001'}</span>
                    <div style="color: #94a3b8; font-size: 12px; margin-top: 4px;">📅 ${orderDate}</div>
                </td>
                <td>
                    <div style="font-weight: 700; color: #fff;">${shippingName}</div>
                    <div style="color: #cbd5e1; font-size: 12px;">📞 ${phone}</div>
                    <div style="color: #94a3b8; font-size: 12px; max-width: 240px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">📍 ${address}, ${pincode}</div>
                </td>
                <td style="font-size: 13px; color: #e2e8f0;">
                    ${itemsText}
                    <div style="margin-top: 4px;"><span style="background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; font-size: 11px; text-transform: uppercase; font-weight: 700;">${order.payment_method || 'Online / COD'}</span></div>
                </td>
                <td style="font-family: 'Outfit', sans-serif; font-weight: 700; color: #10B981; font-size: 17px;">₹${order.total || 0}</td>
                <td>
                    <select class="status-select" onchange="changeOrderStatus('${order.order_id || order._id}', this.value)">
                        <option value="Processing" ${status === 'Processing' ? 'selected' : ''}>🟡 Processing</option>
                        <option value="Shipped" ${status === 'Shipped' ? 'selected' : ''}>🔵 Shipped</option>
                        <option value="Delivered" ${status === 'Delivered' ? 'selected' : ''}>🟢 Delivered</option>
                        <option value="Cancelled" ${status === 'Cancelled' ? 'selected' : ''}>🔴 Cancelled</option>
                    </select>
                    ${deliveryActionHtml}
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("Error loading orders:", e);
    }
}

window.changeOrderStatus = async (orderRef, newStatus) => {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/orders/${orderRef}/status`, {
            method: "PUT",
            headers: getHeaders(true),
            body: JSON.stringify({ status: newStatus })
        });
        if (!res.ok) throw new Error("Status update failed");
        showToast(`🚚 Order #${orderRef} marked as: ${newStatus}`);
    } catch (e) {
        showToast("Error updating order status.", true);
    }
};


/**
 * 4. WEBSITE SETTINGS CONTROLLER
 */
async function loadSettings() {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/settings?_t=${Date.now()}`, { 
            headers: getHeaders(),
            cache: "no-store"
        });
        if (!res.ok) throw new Error("Could not fetch general website settings");
        const data = await res.json();

        
        
        
        // Shop Page Settings
        const shop = data.shop_settings || {};
        if (document.getElementById("setting-shop-heading")) document.getElementById("setting-shop-heading").value = shop.heading || "SONRUP WELLNESS SHELF";
        if (document.getElementById("setting-shop-title")) document.getElementById("setting-shop-title").value = shop.title || "PREMIUM GUMMIES & BUNDLES";
        if (document.getElementById("setting-shop-desc")) document.getElementById("setting-shop-desc").value = shop.desc || "Sugar-free, clinical-grade formulations crafted to elevate active health, glow, and immunity for your entire household.";
        
        // Contact Page Settings
        const cs = data.contact_settings || {};
        if (document.getElementById("setting-contact-page-hq")) document.getElementById("setting-contact-page-hq").value = cs.hq || "SONRUP\\nA 584 Sitaram Society, Punagam Road,\\nSurat - 395010, Gujarat, India";
        if (document.getElementById("setting-contact-page-lab")) document.getElementById("setting-contact-page-lab").value = cs.lab || "KELLEN HEALTHCARE\\nGMP & ISO Certified Facility";
        if (document.getElementById("setting-contact-page-emails")) document.getElementById("setting-contact-page-emails").value = cs.emails || "info@sonrup.com\\nsales@sonrup.com";
        if (document.getElementById("setting-contact-page-phone")) document.getElementById("setting-contact-page-phone").value = cs.phone || "+91 76001 75193";
        if (document.getElementById("setting-contact-page-hours")) document.getElementById("setting-contact-page-hours").value = cs.hours || "Mon - Sat, 10:00 AM - 6:00 PM IST";
        
        // Footer Settings
        const fs = data.footer_settings || {};
        if (document.getElementById("setting-footer-logo-input")) document.getElementById("setting-footer-logo-input").value = fs.logo || "";
        if (document.getElementById("setting-footer-logo-preview")) document.getElementById("setting-footer-logo-preview").src = fs.logo || "";
        if (document.getElementById("setting-favicon-input")) document.getElementById("setting-favicon-input").value = fs.favicon || "";
        if (document.getElementById("setting-favicon-preview")) document.getElementById("setting-favicon-preview").src = fs.favicon || "";
        if (document.getElementById("setting-footer-desc")) document.getElementById("setting-footer-desc").value = fs.desc || "Premium natural wellness solutions. Empowering health, strength, and happiness across generations.";
        
        if (document.getElementById("setting-social-facebook")) document.getElementById("setting-social-facebook").value = fs.facebook || "";
        if (document.getElementById("setting-social-instagram")) document.getElementById("setting-social-instagram").value = fs.instagram || "";
        if (document.getElementById("setting-social-twitter")) document.getElementById("setting-social-twitter").value = fs.twitter || "";
        if (document.getElementById("setting-social-whatsapp")) document.getElementById("setting-social-whatsapp").value = fs.whatsapp || "";
        
        if (document.getElementById("setting-license")) document.getElementById("setting-license").value = fs.license || "GA/646-A";
        if (document.getElementById("setting-fssai")) document.getElementById("setting-fssai").value = fs.fssai || "10726997000544";
        if (document.getElementById("setting-reg-disclaimer")) document.getElementById("setting-reg-disclaimer").value = fs.disclaimer || "Disclaimer: These products are nutraceuticals and not intended to diagnose, treat, cure, or prevent any disease.";


        document.getElementById("setting-site-name").value = data.site_name || "Sonrup";
        document.getElementById("setting-support-email").value = data.support_email || "info@sonrup.com";
        document.getElementById("setting-support-phone").value = data.support_phone || "+91 76001 75193";
        if (document.getElementById("setting-fssai")) document.getElementById("setting-fssai").value = data.fssai_number || "10726997000544";
        document.getElementById("setting-address").value = data.support_address || "A 584 Sitaram Society, Punagam Road, Surat-395010";
        if (document.getElementById("setting-license")) document.getElementById("setting-license").value = data.license_number || "GA/646-A";
        document.getElementById("setting-banner-enabled").value = data.announcement_banner_enabled ? "true" : "false";
        document.getElementById("setting-banner-text").value = data.announcement_banner_text || "";
        document.getElementById("setting-razorpay-enabled").value = data.razorpay_enabled !== false ? "true" : "false";
        document.getElementById("setting-razorpay-key-id").value = data.razorpay_key_id || "";
        document.getElementById("setting-razorpay-key-secret").value = data.razorpay_key_secret || "";
        
        // Hero Section
        document.getElementById("setting-hero-badge").value = data.hero_badge_text || "PREMIUM NATURAL WELLNESS";
        
        // Clean Plain Text Titles (No raw HTML tags in inputs)
        const mainTitle = data.hero_title_main || "Premium Gummies for";
        const goldTitle = data.hero_title_gold || "Active Health & Beauty.";
        document.getElementById("setting-hero-title-main").value = mainTitle;
        document.getElementById("setting-hero-title-gold").value = goldTitle;
        
        document.getElementById("setting-hero-subtitle").value = data.hero_subtitle || "Sugar-free, clinical-grade formulations crafted to fuel adult performance, daily glow, and kids' active growth. Experience modern Ayurveda and advanced science combined.";
        document.getElementById("setting-hero-cta-text").value = data.hero_cta_text || "Explore Collection";
        document.getElementById("setting-hero-cta-link").value = data.hero_cta_link || "/shop";
        document.getElementById("setting-hero-trust1").value = data.hero_trust_1 || "100% Sugar-Free & Safe";
        document.getElementById("setting-hero-trust2").value = data.hero_trust_2 || "Free Shipping India-Wide";
        document.getElementById("setting-hero-float1").value = data.hero_float_badge_1 || "Adult Performance";
        document.getElementById("setting-hero-float2").value = data.hero_float_badge_2 || "Beauty & Energy";
        document.getElementById("setting-hero-float3").value = data.hero_float_badge_3 || "Kids' Immunity";
        
        const imgPath = data.hero_image_path || "assets/images/hero-combo.jpg";
        document.getElementById("setting-hero-image-path").value = imgPath;
        const previewImg = document.getElementById("setting-hero-image-preview");
        if (previewImg) previewImg.src = imgPath;

        // Dynamic Trust Badges Section
        currentTrustBadges = (data.trust_badges && data.trust_badges.length > 0) ? data.trust_badges : [
            { id: "tb_1", icon: "ban", title: "Sugar Free", subtitle: "No Added Sugar" },
            { id: "tb_2", icon: "droplet-off", title: "No Artificial Color", subtitle: "100% Safe Formulas" },
            { id: "tb_3", icon: "apple", title: "Natural Fruit Flavor", subtitle: "Imli, Citrus & Mixed Fruit" },
            { id: "tb_4", icon: "shield-check", title: "FSSAI Licensed", subtitle: "Regulated Quality" },
            { id: "tb_5", icon: "calendar", title: "36-Month Shelf Life", subtitle: "Long-Lasting Freshness" },
            { id: "tb_6", icon: "map-pin", title: "Made in India", subtitle: "Kellen Healthcare" }
        ];
        renderTrustBadgesCRUD();

        // Dynamic Label Transparency Section
        if (document.getElementById("setting-transparency-subheading")) document.getElementById("setting-transparency-subheading").value = data.transparency_subheading || "TRANSPARENCY";
        if (document.getElementById("setting-transparency-title")) document.getElementById("setting-transparency-title").value = data.transparency_title || "Amount Per Gummy & Label Details";
        if (document.getElementById("setting-transparency-desc")) document.getElementById("setting-transparency-desc").value = data.transparency_desc || "We believe in complete ingredient transparency. Here is the exact nutritional profile printed on our labels, tested for quality and purity.";

        currentTransparencyTabs = (data.transparency_tabs && data.transparency_tabs.length > 0 && data.transparency_tabs[2]?.rows?.length >= 5) ? data.transparency_tabs : [
            {
                id: "tab_shilajit",
                name: "Himalayan Shilajit",
                suggested_usage: "Take 1 Gummy daily or as directed by a healthcare professional. Best consumed after a meal.",
                rows: [
                    { component: "Gummy Shilajit Resin", feature: "75% Fulvic Acid Strength", amount: "200 mg" },
                    { component: "Ashwagandha", feature: "Withania somnifera", amount: "25 mg" },
                    { component: "Flavour", feature: "Imli (Tamarind)", amount: "Natural Blend" },
                    { component: "Sugar", feature: "Sugar-Free", amount: "0g" }
                ]
            },
            {
                id: "tab_biotin",
                name: "Biotin + Multivitamin",
                suggested_usage: "1 Gummy daily for adults. Chew thoroughly before swallowing.",
                rows: [
                    { component: "Vitamin C", feature: "Ascorbic Acid", amount: "30 mcg" },
                    { component: "Vitamin B6", feature: "Pyridoxine Hcl", amount: "0.25 Mg" },
                    { component: "Biotin", feature: "Vitamin H / Hair Vitality", amount: "30 Mcg" },
                    { component: "Vitamin E", feature: "Dl-A-Tocopheryl Acetate", amount: "5 Mg" },
                    { component: "Vitamin A", feature: "Retinol Acetate", amount: "500 Mcg" },
                    { component: "Vitamin B12", feature: "Cyanocobalamin", amount: "1.1 Mcg" },
                    { component: "Folic Acid", feature: "Vitamin B9 / Folate", amount: "169 Mcg" },
                    { component: "Vitamin K2-7", feature: "Menaquinone", amount: "22.7 Mcg" },
                    { component: "Zinc Citrate", feature: "Immune Mineral", amount: "3 Mg" },
                    { component: "Iodine", feature: "Potassium Iodide", amount: "35 Mcg" }
                ]
            },
            {
                id: "tab_kids",
                name: "Kid's Multivitamin",
                suggested_usage: "1 Gummy daily for children above 4 years of age under adult supervision.",
                rows: [
                    { component: "Vitamin A", feature: "Retinol Acetate", amount: "500 Iu" },
                    { component: "Vitamin C", feature: "Ascorbic Acid", amount: "5 mg" },
                    { component: "Vitamin D", feature: "Cholecalciferol", amount: "200 Iu" },
                    { component: "Vitamin E", feature: "Dl-A-Tocopherol", amount: "0.5 Iu" },
                    { component: "Vitamin B6", feature: "Pyridoxine Hcl", amount: "0.6 Mg" },
                    { component: "Folic Acid", feature: "Vitamin B9", amount: "70 Mcg" },
                    { component: "Vitamin B12", feature: "Cyanocobalamin", amount: "3 Mcg" },
                    { component: "Biotin", feature: "Vitamin H", amount: "30 Mcg" },
                    { component: "Pantothenic Acid", feature: "Vitamin B5", amount: "0.6 Mg" },
                    { component: "Iodine", feature: "Potassium Iodide", amount: "21 Mcg" },
                    { component: "Zinc", feature: "Zinc Citrate", amount: "1.35 Mg" },
                    { component: "Choline", feature: "Brain Development Support", amount: "20 Mcg" },
                    { component: "Inositol", feature: "Cellular Signal Transduction", amount: "20 Mcg" },
                    { component: "Iron", feature: "Ferrous Fumarate", amount: "1 Mcg" }
                ]
            }
        ];
        renderTransparencyCRUD();

        // Dynamic The Advantage Section
        if (document.getElementById("setting-advantage-subheading")) document.getElementById("setting-advantage-subheading").value = data.advantage_subheading || "THE ADVANTAGE";
        if (document.getElementById("setting-advantage-title")) document.getElementById("setting-advantage-title").value = data.advantage_title || "Why The Family Wellness Combo?";
        if (document.getElementById("setting-advantage-desc")) document.getElementById("setting-advantage-desc").value = data.advantage_desc || "Why buy multiple packs from different brands when you can cover the daily nutrient requirements of the entire household with one premium bundle?";

        currentAdvantageCards = (data.advantage_cards && data.advantage_cards.length > 0) ? data.advantage_cards : [
            { id: "adv_1", icon: "zap", title: "Energy & Performance", description: "Himalayan Shilajit (75% Fulvic Acid) combined with Ashwagandha helps increase stamina, strength, and daily energy levels for active adults." },
            { id: "adv_2", icon: "sparkles", title: "Glowing Beauty & Health", description: "Essential Biotin and Folic Acid ensure healthy skin, strong nails, and glowing hair, while 10 vitamins regulate cellular health." },
            { id: "adv_3", icon: "shield-alert", title: "Shielded Kids' Immunity", description: "Loaded with Vitamin C, D, Zinc, and Iron, our kids' formula boosts immunity, builds strong bones, and supports memory growth." },
            { id: "adv_4", icon: "smile", title: "Delicious & Sugar Free", description: "Enjoyable fruit flavors without the guilt. Formulated entirely sugar-free, making it the perfect daily chewable supplement." }
        ];
        renderAdvantageCRUD();

        // Dynamic Guidance Section
        if (document.getElementById("setting-guidance-subheading")) document.getElementById("setting-guidance-subheading").value = data.guidance_subheading || "GUIDANCE";
        if (document.getElementById("setting-guidance-title")) document.getElementById("setting-guidance-title").value = data.guidance_title || "How & Who It's For";
        if (document.getElementById("setting-guidance-desc")) document.getElementById("setting-guidance-desc").value = data.guidance_desc || "Simple guidelines for the daily routine of each family member.";

        currentGuidanceColumns = (data.guidance_columns && data.guidance_columns.length > 0) ? data.guidance_columns : [
            {
                id: "col_him",
                icon: "user",
                title: "Him",
                subtitle: "Father / Adult Male",
                items: [
                    { product: "Himalayan Shilajit Gummies", usage: "Take 1 Gummy daily after breakfast or dinner." },
                    { product: "Biotin + Multivitamin", usage: "Take 1 Gummy daily for overall vitality and daily energy support." }
                ],
                warning: ""
            },
            {
                id: "col_her",
                icon: "user-plus",
                title: "Her",
                subtitle: "Mother / Adult Female",
                items: [
                    { product: "Biotin + Multivitamin", usage: "Take 1 Gummy daily in the morning to support hair, skin, nails, and energy." },
                    { product: "Himalayan Shilajit", usage: "Take 1 Gummy daily for strength and stamina, if active or exercising." }
                ],
                warning: ""
            },
            {
                id: "col_kids",
                icon: "users",
                title: "Kids",
                subtitle: "Children (Ages 4+)",
                items: [
                    { product: "Kid's Multivitamin", usage: "Chew 1 Gummy daily after school or lunch under parental supervision." }
                ],
                warning: "Not suitable for kids under 4 years of age."
            }
        ];
        renderGuidanceCRUD();

        // Dynamic FAQ Section & Dietary Guide Cards
        if (document.getElementById("setting-faq-subheading")) document.getElementById("setting-faq-subheading").value = data.faq_subheading || "ANSWERS";
        if (document.getElementById("setting-faq-title")) document.getElementById("setting-faq-title").value = data.faq_title || "Frequently Asked Questions";
        if (document.getElementById("setting-faq-desc")) document.getElementById("setting-faq-desc").value = data.faq_desc || "Got questions about dosage, safety, or suitability? We've got you covered.";

        if (document.getElementById("setting-dietary-subheading")) document.getElementById("setting-dietary-subheading").value = data.dietary_guide_subheading || "DIETARY USER GUIDE";
        if (document.getElementById("setting-dietary-title")) document.getElementById("setting-dietary-title").value = data.dietary_guide_title || "Dosages & Usage Instructions";
        if (document.getElementById("setting-dietary-desc")) document.getElementById("setting-dietary-desc").value = data.dietary_guide_desc || "Follow our certified dietary guides to maximize the energy, vitality, and cellular protection benefits of your daily Sonrup gummies.";

        currentDietaryCards = (data.dietary_guide_cards && data.dietary_guide_cards.length > 0) ? data.dietary_guide_cards : [
            {
                id: "dg_1",
                icon: "zap",
                title: "Himalayan Shilajit",
                card_type: "him",
                timing: "Best consumed in the morning after breakfast for sustained, clean day-long active stamina.",
                dosage: "1 Gummy daily. Do not exceed the recommended dose.",
                target: "Exclusively formulated for adults. Not recommended for children or pregnant mothers."
            },
            {
                id: "dg_2",
                icon: "sparkles",
                title: "Biotin & Multivitamin",
                card_type: "her",
                timing: "Can be consumed anytime. We recommend taking it after lunch or dinner as a healthy sugar-free dessert.",
                dosage: "1 Gummy daily. Supports skin hydration and nail/hair keratin vitality.",
                target: "Perfect for adults seeking glowing health."
            },
            {
                id: "dg_3",
                icon: "smile",
                title: "Kid's Immunity booster",
                card_type: "kids",
                timing: "Take 1 gummy in the evening after playtime or school to replenish essential active micronutrients.",
                dosage: "1 Gummy daily. Carefully balanced with Iron, Zinc, and Choline.",
                target: "Formulated for active growing kids aged 5 to 16. Chew thoroughly before swallowing."
            }
        ];
        renderDietaryCardsCRUD();

        currentFaqItems = (data.faq_items && data.faq_items.length > 0) ? data.faq_items : [
            { id: "faq_1", question: "What is the recommended age suitability for the kids' gummies?", answer: "Our Kid's Multivitamin and Immunity Booster gummies are specifically formulated for kids aged 4 and above. We recommend 1 gummy daily under parental supervision. For children under 4, please consult your family pediatrician." },
            { id: "faq_2", question: "Are these gummies completely sugar-free?", answer: "Yes! All three gummies in the Sonrup Family Wellness Combo are completely sugar-free and contain no added sugars. They are sweetened with premium natural substitutes, making them delicious without raising blood sugar levels." },
            { id: "faq_3", question: "What is the shelf life of these products?", answer: "Each bottle has a shelf life of 36 months from the date of manufacture. Please store them in a cool, dry place away from direct sunlight, and keep the container tightly closed to preserve moisture levels." },
            { id: "faq_4", question: "How does the return policy work?", answer: "We stand behind the quality of our products. If you are not satisfied with your purchase, you can contact our customer support team within 30 days of delivery for a full replacement or refund. No questions asked." },
            { id: "faq_5", question: "Can both men and women take the Shilajit and Biotin gummies?", answer: "Absolutely. Both products are unisex. Shilajit gummies help improve stamina and strength for anyone, while Biotin + Multivitamin gummies support skin, hair, and nail health for all adults." }
        ];
        renderFaqCRUD();

        // Dynamic Our Story / About Us Section
        window.LAST_SETTINGS_DATA = data;
        currentStorySections = (data.story_sections && data.story_sections.length > 0) ? data.story_sections : [
            { id: "story_1", badge: "01. PURE SOURCE", title: "Harvested From the Peaks", image: "assets/images/shilajit-detail1.jpg", p1: "Our flagship ingredient, pure Shilajit resin, is wild-harvested at elevations above 16,000 feet in the pristine Himalayan ranges. Formed over centuries, this dense Ayurvedic restorative is packed with over 84 ionic minerals.", p2: "We purify this raw resin under strict laboratory standards to achieve an industry-leading 75% Fulvic Acid concentration, ensuring maximum bioavailability and strength in every single bite." },
            { id: "story_2", badge: "02. THE SCIENCE", title: "100% Sugar-Free Nutrition", image: "assets/images/biotin-detail1.jpg", p1: "Most wellness gummies on the market are packed with processed sugars, glucose syrups, and gelatin—turning vital supplements into unhealthy candy. At Sonrup, we knew there was a better way.", p2: "Our research team formulated a completely sugar-free gummie base that retains premium textures and natural, kid-approved fruit flavours (like Tamarind and Orange Citrus) without compromising your metabolic health." },
            { id: "story_3", badge: "03. TRUST & HYGIENE", title: "GMP & ISO Certified Labs", image: "assets/images/kids-detail1.jpg", p1: "Quality and safety are the core pillars of Sonrup. Every bottle is manufactured at our state-of-the-art facility operated by Kellen Healthcare. Our plant operates under strict GMP (Good Manufacturing Practices) and ISO-9001 quality guidelines.", p2: "From heavy-metal clearance tests to batch consistency, we guarantee a safe, pure, and premium supplement that you can trust for your children, parents, and yourself." }
        ];

        currentStoryStats = (data.story_stats && data.story_stats.length > 0) ? data.story_stats : [
            { id: "stat_1", number: "16k+ Ft", label: "Himalayan Sourcing" },
            { id: "stat_2", number: "100%", label: "Sugar-Free Formula" },
            { id: "stat_3", number: "GMP", label: "Certified Facility" }
        ];
        renderStoryCRUD();

        // Blog Page Settings
        if (document.getElementById("setting-blog-subheading")) document.getElementById("setting-blog-subheading").value = data.blog_subheading || "WELLNESS CORNER";
        if (document.getElementById("setting-blog-title")) document.getElementById("setting-blog-title").value = data.blog_title || "The Sonrup Blog";
        if (document.getElementById("setting-blog-desc")) document.getElementById("setting-blog-desc").value = data.blog_desc || "Expert insights, lifestyle tips, and the scientific research behind sugar-free Ayurvedic restauratives and premium multivitamin gummies.";

        currentBlogArticles = (data.blog_articles && data.blog_articles.length > 0) ? data.blog_articles : [
            { id: "blog_1", title: "The Power of Pure Shilajit: Why Fulvic Acid Matters", category: "Ayurveda", date: "June 28, 2026", read_time: "5 Min Read", image: "assets/images/shilajit-bottle.jpg", excerpt: "Discover how Himalayan shilajit resin boosts stamina, supports cellular rejuvenation, and why our 75% Fulvic Acid Ayurvedic extract is safe for daily performance.", link: "blog-shilajit.html" },
            { id: "blog_2", title: "Biotin & Zinc: The Daily Vitality Shield", category: "Science", date: "June 15, 2026", read_time: "4 Min Read", image: "assets/images/biotin-bottle.jpg", excerpt: "Unpack the biological functions of high-potency Biotin (Vitamin H), Vitamin C, and Zinc in protecting nail strength, hair growth, and overall skin cell turnover.", link: "blog-biotin.html" },
            { id: "blog_3", title: "Sugar-Free Kids Nutrition: Safety & Pediatric Care", category: "Nutrition", date: "May 29, 2026", read_time: "6 Min Read", image: "assets/images/kids-bottle.jpg", excerpt: "Why we completely avoid high fructose corn syrup and sugar in children's multivitamins, focusing instead on safe fruit pectin, Iron, Zinc, and Choline.", link: "blog-kids.html" }
        ];
        renderBlogCRUD();
    } catch (e) {
        console.error("Error loading settings:", e);
    }
}

let currentTrustBadges = [];

/**
 * Render Dynamic Trust Badges CRUD Items
 */
function renderTrustBadgesCRUD() {
    const container = document.getElementById("trust-badges-list-container");
    if (!container) return;

    if (!currentTrustBadges || currentTrustBadges.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 10px; color: #94a3b8;">
                <p style="margin: 0; font-size: 14px;">No trust badges currently configured. Click <strong>+ Add New Trust Badge</strong> to create one.</p>
            </div>
        `;
        return;
    }

    const availableIcons = [
        { value: "ban", label: "🚫 Ban / Sugar-Free" },
        { value: "droplet-off", label: "💧 Droplet-Off / No Color" },
        { value: "apple", label: "🍎 Apple / Fruit Flavor" },
        { value: "shield-check", label: "🛡️ Shield / FSSAI Quality" },
        { value: "calendar", label: "📅 Calendar / Shelf Life" },
        { value: "map-pin", label: "📍 Map Pin / Made in India" },
        { value: "truck", label: "🚚 Truck / Express Delivery" },
        { value: "award", label: "🏆 Award / Certified" },
        { value: "heart", label: "❤️ Heart / Wellness" },
        { value: "zap", label: "⚡ Zap / Energy" },
        { value: "check-circle", label: "✅ Checkmark / Approved" },
        { value: "sparkles", label: "✨ Sparkles / Premium" },
        { value: "leaf", label: "🌿 Leaf / 100% Herbal" }
    ];

    container.innerHTML = currentTrustBadges.map((badge, idx) => {
        const iconOptionsHTML = availableIcons.map(ic => 
            `<option value="${ic.value}" ${ic.value === (badge.icon || 'shield-check') ? 'selected' : ''}>${ic.label}</option>`
        ).join("");

        return `
            <div class="glass-panel trust-badge-item-card" data-badge-id="${badge.id || ('tb_' + idx)}" style="padding: 18px 20px; border: 1px solid rgba(201,162,39,0.25); border-radius: 12px; background: rgba(20, 24, 32, 0.6); display: flex; flex-direction: column; gap: 14px; position: relative;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="width: 28px; height: 28px; border-radius: 50%; background: rgba(201,162,39,0.15); border: 1px solid #C9A227; color: #E5C365; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800;">${idx + 1}</span>
                        <h4 style="margin: 0; font-family: 'Outfit', sans-serif; font-size: 15px; color: #fff; font-weight: 600;">Trust Indicator #${idx + 1}</h4>
                    </div>
                    <button type="button" class="btn-action btn-danger delete-trust-badge-btn" data-index="${idx}" title="Delete Trust Badge" style="padding: 7px 10px; font-size: 12px; border-radius: 8px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;">
                        <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                    </button>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1.5fr 1.5fr; gap: 16px; align-items: center;">
                    <div class="form-group" style="margin: 0;">
                        <label class="form-label" style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Select Icon</label>
                        <select class="form-input trust-badge-icon-input" data-index="${idx}" style="padding: 9px 12px; font-size: 13px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 8px; cursor: pointer;">
                            ${iconOptionsHTML}
                        </select>
                    </div>

                    <div class="form-group" style="margin: 0;">
                        <label class="form-label" style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Headline Title</label>
                        <input type="text" class="form-input trust-badge-title-input" data-index="${idx}" value="${(badge.title || '').replace(/"/g, '&quot;')}" placeholder="e.g. SUGAR FREE" style="padding: 9px 12px; font-size: 13px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 8px;">
                    </div>

                    <div class="form-group" style="margin: 0;">
                        <label class="form-label" style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Subtitle Copy</label>
                        <input type="text" class="form-input trust-badge-sub-input" data-index="${idx}" value="${(badge.subtitle || '').replace(/"/g, '&quot;')}" placeholder="e.g. No Added Sugar" style="padding: 9px 12px; font-size: 13px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 8px;">
                    </div>
                </div>
            </div>
        `;
    }).join("");

    if (window.lucide) window.lucide.createIcons();

    // Attach Delete Event Listeners
    container.querySelectorAll(".delete-trust-badge-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const idx = parseInt(btn.dataset.index);
            if (confirm(`Delete trust badge #${idx + 1}?`)) {
                currentTrustBadges.splice(idx, 1);
                renderTrustBadgesCRUD();
                showToast("🗑️ Trust badge deleted from list.");
            }
        });
    });
}

let currentTransparencyTabs = [];

/**
 * Render Dynamic Label Transparency CRUD Items
 */
function renderTransparencyCRUD() {
    const container = document.getElementById("transparency-tabs-list-container");
    if (!container) return;

    if (!currentTransparencyTabs || currentTransparencyTabs.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 10px; color: #94a3b8;">
                <p style="margin: 0; font-size: 14px;">No product tabs configured yet. Click <strong>+ Add New Product Tab</strong> above to create one.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = currentTransparencyTabs.map((tab, tabIdx) => {
        const rowsHTML = (tab.rows || []).map((row, rowIdx) => `
            <tr class="transparency-row-item" data-tab-idx="${tabIdx}" data-row-idx="${rowIdx}">
                <td style="padding: 8px;">
                    <input type="text" class="form-input row-component-input" value="${(row.component || '').replace(/"/g, '&quot;')}" placeholder="e.g. Gummy Shilajit Resin" style="padding: 7px 10px; font-size: 13px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 6px;">
                </td>
                <td style="padding: 8px;">
                    <input type="text" class="form-input row-feature-input" value="${(row.feature || '').replace(/"/g, '&quot;')}" placeholder="e.g. 75% Fulvic Acid Strength" style="padding: 7px 10px; font-size: 13px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 6px;">
                </td>
                <td style="padding: 8px;">
                    <input type="text" class="form-input row-amount-input" value="${(row.amount || '').replace(/"/g, '&quot;')}" placeholder="e.g. 200 mg" style="padding: 7px 10px; font-size: 13px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 6px;">
                </td>
                <td style="padding: 8px; text-align: center; width: 50px;">
                    <button type="button" class="btn-action btn-danger delete-transparency-row-btn" data-tab-idx="${tabIdx}" data-row-idx="${rowIdx}" title="Delete Row" style="padding: 6px 8px; font-size: 11px; border-radius: 6px; background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.4); color: #f87171; cursor: pointer;">
                        <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                    </button>
                </td>
            </tr>
        `).join("");

        return `
            <div class="glass-panel transparency-tab-card" data-tab-id="${tab.id || ('tab_' + tabIdx)}" style="padding: 22px; border: 1px solid rgba(201,162,39,0.3); border-radius: 14px; background: rgba(22, 26, 35, 0.7); display: flex; flex-direction: column; gap: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px; flex-wrap: wrap; gap: 12px;">
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1; max-width: 400px;">
                        <span style="background: rgba(201,162,39,0.15); border: 1px solid #C9A227; color: #E5C365; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0;">${tabIdx + 1}</span>
                        <input type="text" class="form-input tab-name-input" data-tab-idx="${tabIdx}" value="${(tab.name || '').replace(/"/g, '&quot;')}" placeholder="e.g. HIMALAYAN SHILAJIT" style="padding: 8px 12px; font-size: 14px; font-weight: 700; background: rgba(0,0,0,0.6); border: 1px solid rgba(201,162,39,0.4); color: #fff; border-radius: 8px;">
                    </div>
                    <button type="button" class="btn-action btn-danger delete-transparency-tab-btn" data-tab-idx="${tabIdx}" title="Delete Product Tab" style="padding: 7px 12px; font-size: 12px; border-radius: 8px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                        <i data-lucide="trash-2" style="width: 15px; height: 15px;"></i> Delete Tab
                    </button>
                </div>

                <!-- Nutritional Profile Table -->
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left;">
                        <thead>
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                                <th style="padding: 8px; font-size: 11px; color: #94a3b8; text-transform: uppercase;">Component</th>
                                <th style="padding: 8px; font-size: 11px; color: #94a3b8; text-transform: uppercase;">Key Features / Source</th>
                                <th style="padding: 8px; font-size: 11px; color: #94a3b8; text-transform: uppercase;">Unit Amount Per Gummy</th>
                                <th style="padding: 8px; font-size: 11px; color: #94a3b8; text-transform: uppercase; text-align: center;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHTML}
                        </tbody>
                    </table>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 4px; flex-wrap: wrap;">
                    <button type="button" class="btn-action add-row-to-tab-btn" data-tab-idx="${tabIdx}" style="padding: 6px 14px; font-size: 12px; border-radius: 6px; background: rgba(201,162,39,0.12); border: 1px solid rgba(201,162,39,0.3); color: #E5C365; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                        <i data-lucide="plus" style="width: 14px; height: 14px;"></i> Add Nutritional Row
                    </button>

                    <div style="flex: 1; min-width: 300px;">
                        <label style="font-size: 11px; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 4px;">Suggested Usage Note</label>
                        <input type="text" class="form-input tab-usage-input" data-tab-idx="${tabIdx}" value="${(tab.suggested_usage || '').replace(/"/g, '&quot;')}" placeholder="e.g. Take 1 Gummy daily after meal." style="padding: 7px 10px; font-size: 12.5px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.12); color: #cbd5e1; border-radius: 6px; width: 100%;">
                    </div>
                </div>
            </div>
        `;
    }).join("");

    if (window.lucide) window.lucide.createIcons();

    // Attach Event Listeners
    container.querySelectorAll(".delete-transparency-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const idx = parseInt(btn.dataset.tabIdx);
            if (confirm(`Delete product tab '${currentTransparencyTabs[idx]?.name || (idx+1)}'?`)) {
                currentTransparencyTabs.splice(idx, 1);
                renderTransparencyCRUD();
                showToast("🗑️ Product tab deleted.");
            }
        });
    });

    container.querySelectorAll(".add-row-to-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const tabIdx = parseInt(btn.dataset.tabIdx);
            syncTransparencyInputsFromDOM();
            if (currentTransparencyTabs[tabIdx]) {
                if (!currentTransparencyTabs[tabIdx].rows) currentTransparencyTabs[tabIdx].rows = [];
                currentTransparencyTabs[tabIdx].rows.push({ component: "", feature: "", amount: "" });
                renderTransparencyCRUD();
                showToast("➕ Nutritional row added.");
            }
        });
    });

    container.querySelectorAll(".delete-transparency-row-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const tabIdx = parseInt(btn.dataset.tabIdx);
            const rowIdx = parseInt(btn.dataset.rowIdx);
            syncTransparencyInputsFromDOM();
            if (currentTransparencyTabs[tabIdx] && currentTransparencyTabs[tabIdx].rows) {
                currentTransparencyTabs[tabIdx].rows.splice(rowIdx, 1);
                renderTransparencyCRUD();
                showToast("🗑️ Row removed.");
            }
        });
    });
}

function syncTransparencyInputsFromDOM() {
    const container = document.getElementById("transparency-tabs-list-container");
    if (!container) return;

    const cards = container.querySelectorAll(".transparency-tab-card");
    cards.forEach((card, tabIdx) => {
        if (!currentTransparencyTabs[tabIdx]) return;

        const nameVal = card.querySelector(".tab-name-input")?.value.trim() || "";
        const usageVal = card.querySelector(".tab-usage-input")?.value.trim() || "";

        currentTransparencyTabs[tabIdx].name = nameVal;
        currentTransparencyTabs[tabIdx].suggested_usage = usageVal;

        const rowElements = card.querySelectorAll(".transparency-row-item");
        const updatedRows = [];
        rowElements.forEach(rowEl => {
            const comp = rowEl.querySelector(".row-component-input")?.value.trim() || "";
            const feat = rowEl.querySelector(".row-feature-input")?.value.trim() || "";
            const amt = rowEl.querySelector(".row-amount-input")?.value.trim() || "";
            updatedRows.push({ component: comp, feature: feat, amount: amt });
        });
        currentTransparencyTabs[tabIdx].rows = updatedRows;
    });
}

let currentAdvantageCards = [];

/**
 * Render Dynamic The Advantage CRUD Items
 */
function renderAdvantageCRUD() {
    const container = document.getElementById("advantage-cards-list-container");
    if (!container) return;

    if (!currentAdvantageCards || currentAdvantageCards.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 10px; color: #94a3b8;">
                <p style="margin: 0; font-size: 14px;">No advantage cards configured yet. Click <strong>+ Add New Advantage Card</strong> above to create one.</p>
            </div>
        `;
        return;
    }

    const availableIcons = ["zap", "sparkles", "shield-alert", "smile", "heart", "award", "star", "thumbs-up", "check-circle", "leaf", "package", "activity"];

    container.innerHTML = currentAdvantageCards.map((card, idx) => {
        const iconOptions = availableIcons.map(ic => `
            <option value="${ic}" ${card.icon === ic ? 'selected' : ''}>${ic.toUpperCase()}</option>
        `).join("");

        return `
            <div class="glass-panel advantage-card-item" data-id="${card.id || ('adv_' + idx)}" style="padding: 20px; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; background: rgba(0,0,0,0.3); display: flex; flex-direction: column; gap: 14px;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 10px; flex-wrap: wrap; gap: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="background: rgba(201,162,39,0.15); border: 1px solid #C9A227; color: #E5C365; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800;">${idx + 1}</span>
                        <h4 style="font-family: 'Outfit', sans-serif; font-size: 14px; color: #fff; margin: 0;">Advantage Feature #${idx + 1}</h4>
                    </div>
                    <button type="button" class="btn-action btn-danger delete-advantage-card-btn" data-index="${idx}" title="Delete Advantage Card" style="padding: 6px 10px; font-size: 12px; border-radius: 6px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; cursor: pointer; display: inline-flex; align-items: center;">
                        <i data-lucide="trash-2" style="width: 15px; height: 15px;"></i>
                    </button>
                </div>

                <div class="form-grid">
                    <div class="form-group" style="max-width: 220px;">
                        <label class="form-label">Lucide Icon</label>
                        <select class="form-input advantage-icon-input" data-index="${idx}" style="background: #181818; color: #fff; border: 1px solid rgba(255,255,255,0.15);">
                            ${iconOptions}
                        </select>
                    </div>

                    <div class="form-group" style="flex: 1;">
                        <label class="form-label">Feature Card Title</label>
                        <input type="text" class="form-input advantage-title-input" data-index="${idx}" value="${(card.title || '').replace(/"/g, '&quot;')}" placeholder="Title" style="background: rgba(0,0,0,0.5);">
                    </div>

                    <div class="form-group full-width">
                        <label class="form-label">Feature Description Copy</label>
                        <textarea class="form-input advantage-desc-input" data-index="${idx}" rows="2" placeholder="Description" style="background: rgba(0,0,0,0.5);">${card.description || ''}</textarea>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    if (window.lucide) window.lucide.createIcons();

    // Attach Delete Card Handlers
    container.querySelectorAll(".delete-advantage-card-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const idx = parseInt(btn.dataset.index);
            if (confirm(`Delete advantage card #${idx + 1}?`)) {
                currentAdvantageCards.splice(idx, 1);
                renderAdvantageCRUD();
                showToast("🗑️ Advantage card deleted.");
            }
        });
    });
}

let currentGuidanceColumns = [];

/**
 * Render Dynamic Guidance Section CRUD Items
 */
function renderGuidanceCRUD() {
    const container = document.getElementById("guidance-cols-list-container");
    if (!container) return;

    if (!currentGuidanceColumns || currentGuidanceColumns.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 10px; color: #94a3b8;">
                <p style="margin: 0; font-size: 14px;">No guidance cards configured yet. Click <strong>+ Add New Guidance Card</strong> above to create one.</p>
            </div>
        `;
        return;
    }

    const availableIcons = ["user", "user-plus", "users", "heart", "shield-check", "star", "sparkles", "zap", "smile", "check-circle"];

    container.innerHTML = currentGuidanceColumns.map((col, colIdx) => {
        const iconOptions = availableIcons.map(ic => `
            <option value="${ic}" ${col.icon === ic ? 'selected' : ''}>${ic.toUpperCase()}</option>
        `).join("");

        const itemsHTML = (col.items || []).map((item, itemIdx) => `
            <div class="guidance-item-row" data-col-idx="${colIdx}" data-item-idx="${itemIdx}" style="display: flex; gap: 10px; align-items: center; margin-bottom: 8px;">
                <input type="text" class="form-input item-product-input" value="${(item.product || '').replace(/"/g, '&quot;')}" placeholder="Product Name (e.g. Himalayan Shilajit)" style="padding: 7px 10px; font-size: 13px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 6px; flex: 1;">
                <input type="text" class="form-input item-usage-input" value="${(item.usage || '').replace(/"/g, '&quot;')}" placeholder="Usage Instruction Line" style="padding: 7px 10px; font-size: 13px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 6px; flex: 2;">
                <button type="button" class="btn-action btn-danger delete-guidance-item-btn" data-col-idx="${colIdx}" data-item-idx="${itemIdx}" title="Delete Item" style="padding: 6px 8px; font-size: 11px; border-radius: 6px; background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.4); color: #f87171; cursor: pointer;">
                    <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                </button>
            </div>
        `).join("");

        return `
            <div class="glass-panel guidance-col-card" data-id="${col.id || ('col_' + colIdx)}" style="padding: 22px; border: 1px solid rgba(201,162,39,0.3); border-radius: 14px; background: rgba(22, 26, 35, 0.7); display: flex; flex-direction: column; gap: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px; flex-wrap: wrap; gap: 12px;">
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1; max-width: 400px;">
                        <span style="background: rgba(201,162,39,0.15); border: 1px solid #C9A227; color: #E5C365; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0;">${colIdx + 1}</span>
                        <input type="text" class="form-input col-title-input" data-col-idx="${colIdx}" value="${(col.title || '').replace(/"/g, '&quot;')}" placeholder="Group Title (e.g. Him / Her / Kids)" style="padding: 8px 12px; font-size: 14px; font-weight: 700; background: rgba(0,0,0,0.6); border: 1px solid rgba(201,162,39,0.4); color: #fff; border-radius: 8px;">
                    </div>
                    <button type="button" class="btn-action btn-danger delete-guidance-col-btn" data-col-idx="${colIdx}" title="Delete Guidance Card" style="padding: 7px 12px; font-size: 12px; border-radius: 8px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                        <i data-lucide="trash-2" style="width: 15px; height: 15px;"></i> Delete Card
                    </button>
                </div>

                <div class="form-grid">
                    <div class="form-group" style="max-width: 200px;">
                        <label class="form-label">Avatar Icon</label>
                        <select class="form-input col-icon-input" data-col-idx="${colIdx}" style="background: #181818; color: #fff; border: 1px solid rgba(255,255,255,0.15);">
                            ${iconOptions}
                        </select>
                    </div>

                    <div class="form-group" style="flex: 1;">
                        <label class="form-label">Sub-Title / Target Description</label>
                        <input type="text" class="form-input col-sub-input" data-col-idx="${colIdx}" value="${(col.subtitle || '').replace(/"/g, '&quot;')}" placeholder="e.g. Father / Adult Male" style="background: rgba(0,0,0,0.5);">
                    </div>
                </div>

                <!-- Product Guidelines List -->
                <div>
                    <label style="font-size: 11px; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 8px;">Product Guidelines List</label>
                    <div class="guidance-items-container">
                        ${itemsHTML}
                    </div>
                    <button type="button" class="btn-action add-item-to-guidance-btn" data-col-idx="${colIdx}" style="padding: 6px 12px; font-size: 12px; border-radius: 6px; background: rgba(201,162,39,0.12); border: 1px solid rgba(201,162,39,0.3); color: #E5C365; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; margin-top: 4px;">
                        <i data-lucide="plus" style="width: 14px; height: 14px;"></i> + Add Instruction Line
                    </button>
                </div>

                <div>
                    <label style="font-size: 11px; color: #f87171; text-transform: uppercase; display: block; margin-bottom: 4px;">Warning Note (Optional)</label>
                    <input type="text" class="form-input col-warning-input" data-col-idx="${colIdx}" value="${(col.warning || '').replace(/"/g, '&quot;')}" placeholder="e.g. Not suitable for kids under 4 years of age." style="padding: 7px 10px; font-size: 12.5px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #fca5a5; border-radius: 6px; width: 100%;">
                </div>
            </div>
        `;
    }).join("");

    if (window.lucide) window.lucide.createIcons();

    // Event Listeners
    container.querySelectorAll(".delete-guidance-col-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const idx = parseInt(btn.dataset.colIdx);
            if (confirm(`Delete guidance card '${currentGuidanceColumns[idx]?.title || (idx+1)}'?`)) {
                currentGuidanceColumns.splice(idx, 1);
                renderGuidanceCRUD();
                showToast("🗑️ Guidance card deleted.");
            }
        });
    });

    container.querySelectorAll(".add-item-to-guidance-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const colIdx = parseInt(btn.dataset.colIdx);
            syncGuidanceInputsFromDOM();
            if (currentGuidanceColumns[colIdx]) {
                if (!currentGuidanceColumns[colIdx].items) currentGuidanceColumns[colIdx].items = [];
                currentGuidanceColumns[colIdx].items.push({ product: "", usage: "" });
                renderGuidanceCRUD();
                showToast("➕ Instruction line added.");
            }
        });
    });

    container.querySelectorAll(".delete-guidance-item-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const colIdx = parseInt(btn.dataset.colIdx);
            const itemIdx = parseInt(btn.dataset.itemIdx);
            syncGuidanceInputsFromDOM();
            if (currentGuidanceColumns[colIdx] && currentGuidanceColumns[colIdx].items) {
                currentGuidanceColumns[colIdx].items.splice(itemIdx, 1);
                renderGuidanceCRUD();
                showToast("🗑️ Instruction line removed.");
            }
        });
    });
}

function syncGuidanceInputsFromDOM() {
    const container = document.getElementById("guidance-cols-list-container");
    if (!container) return;

    const cards = container.querySelectorAll(".guidance-col-card");
    cards.forEach((card, colIdx) => {
        if (!currentGuidanceColumns[colIdx]) return;

        currentGuidanceColumns[colIdx].title = card.querySelector(".col-title-input")?.value.trim() || "";
        currentGuidanceColumns[colIdx].subtitle = card.querySelector(".col-sub-input")?.value.trim() || "";
        currentGuidanceColumns[colIdx].icon = card.querySelector(".col-icon-input")?.value || "user";
        currentGuidanceColumns[colIdx].warning = card.querySelector(".col-warning-input")?.value.trim() || "";

        const itemRows = card.querySelectorAll(".guidance-item-row");
        const updatedItems = [];
        itemRows.forEach(rowEl => {
            const prod = rowEl.querySelector(".item-product-input")?.value.trim() || "";
            const usg = rowEl.querySelector(".item-usage-input")?.value.trim() || "";
            updatedItems.push({ product: prod, usage: usg });
        });
        currentGuidanceColumns[colIdx].items = updatedItems;
    });
}

let currentFaqItems = [];

/**
 * Render Dynamic FAQ Section CRUD Items
 */
function renderFaqCRUD() {
    const container = document.getElementById("faq-items-list-container");
    if (!container) return;

    if (!currentFaqItems || currentFaqItems.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 10px; color: #94a3b8;">
                <p style="margin: 0; font-size: 14px;">No FAQ questions configured yet. Click <strong>+ Add New FAQ Question</strong> above to create one.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = currentFaqItems.map((faq, idx) => `
        <div class="glass-panel faq-item-card" data-id="${faq.id || ('faq_' + idx)}" style="padding: 14px 18px; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; background: rgba(0,0,0,0.35); display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                    <span style="background: rgba(201,162,39,0.15); border: 1px solid #C9A227; color: #E5C365; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; flex-shrink: 0;">${idx + 1}</span>
                    <input type="text" class="form-input faq-question-input" data-index="${idx}" value="${(faq.question || '').replace(/"/g, '&quot;')}" placeholder="Question Text" style="padding: 6px 10px; font-size: 13px; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 6px; font-weight: 600; width: 100%;">
                </div>
                <button type="button" class="btn-action btn-danger delete-faq-item-btn" data-index="${idx}" title="Delete FAQ Item" style="padding: 5px 8px; font-size: 11px; border-radius: 6px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; cursor: pointer; display: inline-flex; align-items: center;">
                    <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                </button>
            </div>

            <div>
                <textarea class="form-input faq-answer-input" data-index="${idx}" rows="2" placeholder="Detailed Answer..." style="padding: 6px 10px; font-size: 12.5px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; border-radius: 6px; width: 100%;">${faq.answer || ''}</textarea>
            </div>
        </div>
    `).join("");

    if (window.lucide) window.lucide.createIcons();

    // Attach Delete Handlers
    container.querySelectorAll(".delete-faq-item-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const idx = parseInt(btn.dataset.index);
            if (confirm(`Delete FAQ question #${idx + 1}?`)) {
                currentFaqItems.splice(idx, 1);
                renderFaqCRUD();
                showToast("🗑️ FAQ question deleted.");
            }
        });
    });
}

let currentDietaryCards = [];

/**
 * Render Dynamic Dietary Guide Cards CRUD Items
 */
function renderDietaryCardsCRUD() {
    const container = document.getElementById("dietary-cards-list-container");
    if (!container) return;

    if (!currentDietaryCards || currentDietaryCards.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 8px; color: #94a3b8;">
                <p style="margin: 0; font-size: 13px;">No dietary dosage cards configured. Click <strong>+ Add Dosage Card</strong> above.</p>
            </div>
        `;
        return;
    }

    const availableIcons = ["zap", "sparkles", "smile", "heart", "shield-check", "star", "activity", "check-circle"];

    container.innerHTML = currentDietaryCards.map((card, idx) => {
        const iconOptions = availableIcons.map(ic => `
            <option value="${ic}" ${card.icon === ic ? 'selected' : ''}>${ic.toUpperCase()}</option>
        `).join("");

        return `
            <div class="glass-panel dietary-card-item" data-id="${card.id || ('dg_' + idx)}" style="padding: 14px 18px; border: 1px solid rgba(201,162,39,0.25); border-radius: 10px; background: rgba(0,0,0,0.35); display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 8px; gap: 10px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                        <span style="background: rgba(201,162,39,0.15); border: 1px solid #C9A227; color: #E5C365; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; flex-shrink: 0;">${idx + 1}</span>
                        <input type="text" class="form-input dietary-title-input" data-index="${idx}" value="${(card.title || '').replace(/"/g, '&quot;')}" placeholder="Card Title (e.g. Himalayan Shilajit)" style="padding: 6px 10px; font-size: 13.5px; font-weight: 700; background: rgba(0,0,0,0.6); border: 1px solid rgba(201,162,39,0.4); color: #fff; border-radius: 6px; max-width: 280px;">
                        <select class="form-input dietary-icon-input" data-index="${idx}" style="background: #181818; color: #fff; border: 1px solid rgba(255,255,255,0.15); padding: 6px 10px; font-size: 12px; width: 120px;">
                            ${iconOptions}
                        </select>
                    </div>
                    <button type="button" class="btn-action btn-danger delete-dietary-card-btn" data-index="${idx}" title="Delete Dosage Card" style="padding: 5px 8px; font-size: 11px; border-radius: 6px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; cursor: pointer; display: inline-flex; align-items: center;">
                        <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                    </button>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px;">
                    <div>
                        <label style="font-size: 10.5px; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 3px;">Timing Line</label>
                        <input type="text" class="form-input dietary-timing-input" data-index="${idx}" value="${(card.timing || '').replace(/"/g, '&quot;')}" placeholder="e.g. Best consumed in the morning..." style="padding: 6px 10px; font-size: 12px; background: rgba(0,0,0,0.5);">
                    </div>

                    <div>
                        <label style="font-size: 10.5px; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 3px;">Daily Dosage Line</label>
                        <input type="text" class="form-input dietary-dosage-input" data-index="${idx}" value="${(card.dosage || '').replace(/"/g, '&quot;')}" placeholder="e.g. 1 Gummy daily..." style="padding: 6px 10px; font-size: 12px; background: rgba(0,0,0,0.5);">
                    </div>

                    <div>
                        <label style="font-size: 10.5px; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 3px;">Target User Line</label>
                        <input type="text" class="form-input dietary-target-input" data-index="${idx}" value="${(card.target || '').replace(/"/g, '&quot;')}" placeholder="e.g. Formulated for adults." style="padding: 6px 10px; font-size: 12px; background: rgba(0,0,0,0.5);">
                    </div>
                </div>
            </div>
        `;
    }).join("");

    if (window.lucide) window.lucide.createIcons();

    // Attach Delete Handlers
    container.querySelectorAll(".delete-dietary-card-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const idx = parseInt(btn.dataset.index);
            if (confirm(`Delete dosage card #${idx + 1}?`)) {
                currentDietaryCards.splice(idx, 1);
                renderDietaryCardsCRUD();
                showToast("🗑️ Dosage card deleted.");
            }
        });
    });
}


/**
 * 5. REGISTERED USERS CONTROLLER
 */
async function loadUsers() {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/users`, { headers: getHeaders() });
        const tbody = document.getElementById("users-table-body");
        if (!res.ok) throw new Error("Could not fetch registered accounts");

        const users = await res.json();
        
        if (!Array.isArray(users)) {
            throw new Error("Invalid response format: expected an array");
        }

        tbody.innerHTML = "";

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #94a3b8;">No registered users found.</td></tr>';
            return;
        }

        users.forEach(user => {
            const regDate = user.created_at ? new Date(user.created_at).toLocaleDateString() : "Active Account";
            const isAdmin = user.is_admin === true;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>
                    <div style="font-weight: 700; color: #fff; font-size: 15px;">${user.name || 'Customer Account'} ${isAdmin ? '🛡️' : ''}</div>
                    <div style="color: #94a3b8; font-size: 12px;">✉️ ${user.email}</div>
                </td>
                <td>
                    <div style="color: #cbd5e1; font-size: 13px;">📞 ${user.phone || 'N/A'}</div>
                    <div style="color: #94a3b8; font-size: 12px; max-width: 220px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">📍 ${user.address || 'India'}, ${user.pincode || ''}</div>
                </td>
                <td style="color: #cbd5e1; font-size: 13px;">📅 ${regDate}</td>
                <td>
                    ${isAdmin ? 
                      '<span style="background: rgba(201,162,39,0.2); color: #E5C365; padding: 4px 10px; border-radius: 99px; font-weight: 700; font-size: 12px; border: 1px solid #C9A227;">⚡ Administrator</span>' : 
                      '<span style="background: rgba(255,255,255,0.06); color: #cbd5e1; padding: 4px 10px; border-radius: 99px; font-size: 12px;">🛒 Customer</span>'}
                </td>
                <td>
                    <button class="btn-action ${isAdmin ? 'btn-danger' : 'btn-edit'}" onclick="toggleUserRole('${user._id}', ${!isAdmin})">
                        <i data-lucide="${isAdmin ? 'shield-off' : 'shield'}" width="14"></i> ${isAdmin ? 'Revoke Admin' : 'Make Admin'}
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        if (window.lucide) window.lucide.createIcons();
    } catch (e) {
        console.error("Error loading users:", e);
        const tbody = document.getElementById("users-table-body");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #ef4444;">Failed to load users: ${e.message}</td></tr>`;
        }
    }
}

// ─── Blog Articles CRUD Controller ───
function syncBlogInputsFromDOM() {
    const container = document.getElementById("blog-articles-list-container");
    if (!container) return;

    const cards = container.querySelectorAll(".blog-article-card");
    const updated = [];
    cards.forEach((cardEl, idx) => {
        const title = cardEl.querySelector(".blog-title-input")?.value.trim() || "";
        const category = cardEl.querySelector(".blog-category-input")?.value.trim() || "Wellness";
        const link = `article.html?id=${currentBlogArticles[idx]?.id || 'blog_' + Date.now() + '_' + idx}`;
        const image = cardEl.querySelector(".blog-img-input")?.value.trim() || "assets/images/shilajit-bottle.jpg";
        const excerpt = cardEl.querySelector(".blog-excerpt-input")?.value.trim() || "";
        const content = cardEl.querySelector(".ql-editor")?.innerHTML || "";
        const inner_image = cardEl.querySelector(".blog-inner-img-input")?.value.trim() || "";

        updated.push({
            id: currentBlogArticles[idx]?.id || `blog_${Date.now()}_${idx}`,
            title,
            category,
            link,
            image,
            inner_image,
            excerpt,
            content
        });
    });
    currentBlogArticles = updated;
}

function renderBlogCRUD() {
    const container = document.getElementById("blog-articles-list-container");
    if (!container) return;

    if (!currentBlogArticles || currentBlogArticles.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 10px; color: #94a3b8;">
                <p style="margin: 0; font-size: 14px;">No blog articles currently configured. Click <strong>+ Add Article</strong> to create one.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = currentBlogArticles.map((art, idx) => {
        return `
            <div class="glass-panel blog-article-card" data-id="${art.id || ('blog_' + idx)}" style="padding: 20px; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; background: rgba(0,0,0,0.3); display: flex; flex-direction: column; gap: 14px;">
                <!-- Card Header -->
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 10px; flex-wrap: wrap; gap: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="background: rgba(201,162,39,0.15); border: 1px solid #C9A227; color: #E5C365; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0;">${idx + 1}</span>
                        <h4 style="font-family: 'Outfit', sans-serif; font-size: 14px; color: #fff; margin: 0;">Article #${idx + 1}: ${art.title ? (art.title.length > 30 ? art.title.substring(0, 30) + '...' : art.title) : 'Untitled Article'}</h4>
                    </div>

                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button type="button" class="btn-action btn-secondary move-blog-up-btn" data-index="${idx}" ${idx === 0 ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''} style="padding: 4px 8px; font-size: 11px; border-radius: 4px;">
                            <i data-lucide="arrow-up" style="width: 14px; height: 14px;"></i> Move Up
                        </button>
                        <button type="button" class="btn-action btn-secondary move-blog-down-btn" data-index="${idx}" ${idx === currentBlogArticles.length - 1 ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''} style="padding: 4px 8px; font-size: 11px; border-radius: 4px;">
                            <i data-lucide="arrow-down" style="width: 14px; height: 14px;"></i> Move Down
                        </button>
                        <button type="button" class="btn-action btn-danger delete-blog-article-btn" data-index="${idx}" title="Delete Article" style="padding: 6px 10px; font-size: 12px; border-radius: 6px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; cursor: pointer; display: inline-flex; align-items: center;">
                            <i data-lucide="trash-2" style="width: 15px; height: 15px;"></i>
                        </button>
                    </div>
                </div>

                <!-- Form Fields Grid -->
                <div class="form-grid">
                    <div class="form-group" style="grid-column: 1 / span 2;">
                        <label class="form-label">Article Title</label>
                        <input type="text" class="form-input blog-title-input" value="${(art.title || '').replace(/"/g, '&quot;')}" placeholder="e.g. The Power of Pure Shilajit" style="background: rgba(0,0,0,0.5);">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Category Badge</label>
                        <input type="text" class="form-input blog-category-input" value="${(art.category || 'Ayurveda').replace(/"/g, '&quot;')}" placeholder="e.g. Ayurveda, Science, Nutrition" style="background: rgba(0,0,0,0.5);">
                    </div>
                    </div>
                </div>

                <!-- Cover Photo Upload Picker -->
                <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-top: 8px;">
                    <div style="width: 90px; height: 60px; border-radius: 8px; overflow: hidden; border: 1.5px solid #C9A227; background: #000; flex-shrink: 0;">
                        <img class="blog-img-preview" src="${art.image || 'assets/images/shilajit-bottle.jpg'}" alt="Preview" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
                        <p style="font-size: 12px; color: #94a3b8; margin: 0;">Select a photo file to set as the blog article <strong>Cover Image</strong>.</p>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <input type="file" class="form-input blog-img-file" accept="image/*" onchange="uploadBlogArticleImage(this, ${idx})" style="padding: 6px; font-size: 12px; cursor: pointer; flex: 1;">
                            <input type="text" class="form-input blog-img-input" value="${(art.image || '').replace(/"/g, '&quot;')}" placeholder="assets/images/shilajit-bottle.jpg" style="background: rgba(0,0,0,0.5); flex: 2; font-size: 12px; padding: 6px 10px;">
                        </div>
                    </div>
                </div>

                <!-- Inner Detail Photo Upload Picker -->
                <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-top: 12px; padding-top: 12px; border-top: 1px dashed rgba(255,255,255,0.08);">
                    <div style="width: 90px; height: 60px; border-radius: 8px; overflow: hidden; border: 1.5px solid #C9A227; background: #000; flex-shrink: 0;">
                        <img class="blog-inner-img-preview" src="${art.inner_image || 'assets/images/shilajit-detail1.jpg'}" alt="Preview" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
                        <p style="font-size: 12px; color: #94a3b8; margin: 0;">Select a photo file to set as the <strong>Inner Content Image</strong> (shown inside the article).</p>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <input type="file" class="form-input blog-inner-img-file" accept="image/*" onchange="uploadBlogInnerImage(this, ${idx})" style="padding: 6px; font-size: 12px; cursor: pointer; flex: 1;">
                            <input type="text" class="form-input blog-inner-img-input" value="${(art.inner_image || '').replace(/"/g, '&quot;')}" placeholder="assets/images/shilajit-detail1.jpg" style="background: rgba(0,0,0,0.5); flex: 2; font-size: 12px; padding: 6px 10px;">
                        </div>
                    </div>
                </div>

                <!-- Excerpt / Short Summary -->
                <div class="form-group full-width" style="margin-top: 12px;">
                    <label class="form-label">Article Excerpt / Card Summary</label>
                    <textarea class="form-input blog-excerpt-input" rows="2" placeholder="Brief 1-2 sentence description shown on the blog grid..." style="background: rgba(0,0,0,0.5);">${art.excerpt || ''}</textarea>
                </div>

                <!-- Full Article Rich Text Content -->
                <div class="form-group full-width" style="margin-top: 16px;">
                    <label class="form-label" style="color: #E5C365;">Full Article Content (Rich Text)</label>
                    <div class="blog-content-editor" id="blog_quill_${idx}"></div>
                </div>
            </div>
        `;
    }).join("");

    if (window.lucide) window.lucide.createIcons();

    // Initialize Quill Editors
    currentBlogArticles.forEach((art, idx) => {
        const editorContainer = document.getElementById(`blog_quill_${idx}`);
        if (editorContainer && window.Quill) {
            const quill = new Quill(editorContainer, {
                theme: 'snow',
                placeholder: 'Write the full blog article here...',
                modules: {
                    toolbar: [
                        [{ 'header': [2, 3, 4, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        ['link', 'image', 'video'],
                        ['clean']
                    ]
                }
            });
            // Load existing content safely into Quill
            if (art.content) {
                quill.clipboard.dangerouslyPasteHTML(art.content);
            }
        }
    });

    // Attach Move Up / Down Handlers
    container.querySelectorAll(".move-blog-up-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            syncBlogInputsFromDOM();
            const idx = parseInt(btn.dataset.index);
            if (idx > 0) {
                const temp = currentBlogArticles[idx];
                currentBlogArticles[idx] = currentBlogArticles[idx - 1];
                currentBlogArticles[idx - 1] = temp;
                renderBlogCRUD();
                showToast("⬆️ Article moved up!");
            }
        });
    });

    container.querySelectorAll(".move-blog-down-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            syncBlogInputsFromDOM();
            const idx = parseInt(btn.dataset.index);
            if (idx < currentBlogArticles.length - 1) {
                const temp = currentBlogArticles[idx];
                currentBlogArticles[idx] = currentBlogArticles[idx + 1];
                currentBlogArticles[idx + 1] = temp;
                renderBlogCRUD();
                showToast("⬇️ Article moved down!");
            }
        });
    });

    // Attach Delete Handlers
    container.querySelectorAll(".delete-blog-article-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            syncBlogInputsFromDOM();
            const idx = parseInt(btn.dataset.index);
            if (confirm(`Delete blog article #${idx + 1}?`)) {
                currentBlogArticles.splice(idx, 1);
                renderBlogCRUD();
                showToast("⏳ Deleting article...");
                await saveBlogArticlesToDB();
                showToast("🗑️ Article permanently deleted.");
            }
        });
    });
}




/**
 * 6. PROMO COUPONS CONTROLLER
 */
let cachedCoupons = [];

async function loadCoupons() {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/coupons`, { headers: getHeaders() });
        const tbody = document.getElementById("coupons-table-body");
        if (!res.ok) throw new Error("Could not fetch promo coupons");

        cachedCoupons = await res.json();
        
        if (!Array.isArray(cachedCoupons)) {
            throw new Error("Invalid response format: expected an array");
        }

        tbody.innerHTML = "";

        if (cachedCoupons.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #94a3b8;">No active promo coupons. Click "Create New Coupon" to publish one.</td></tr>';
            return;
        }

        cachedCoupons.forEach(c => {
            const tr = document.createElement("tr");
            const discLabel = c.discount_type === "percentage" ? `${c.discount_value}% OFF` : `₹${c.discount_value} OFF`;
            const isActive = c.is_active !== false;
            tr.innerHTML = `
                <td>
                    <code style="background: rgba(201,162,39,0.15); color: #E5C365; padding: 6px 12px; border-radius: 6px; font-weight: 800; font-size: 14px; letter-spacing: 1px; border: 1px solid rgba(201,162,39,0.3);">${c.code}</code>
                </td>
                <td>
                    <div style="font-weight: 700; color: #fff; font-size: 15px;">${discLabel}</div>
                    <div style="color: #94a3b8; font-size: 12px;">Type: ${c.discount_type}</div>
                </td>
                <td style="font-family: 'Outfit', sans-serif; font-weight: 600; color: #cbd5e1;">
                    ${c.min_order_value > 0 ? `₹${c.min_order_value}` : 'No Minimum'}
                </td>
                <td style="color: #94a3b8; font-size: 13px;">
                    🎟️ ${c.usage_count || 0} times
                </td>
                <td>
                    ${isActive ? 
                      '<span style="background: rgba(16,185,129,0.15); color: #10B981; padding: 4px 10px; border-radius: 99px; font-size: 12px; font-weight: 700;">🟢 Active</span>' : 
                      '<span style="background: rgba(239,68,68,0.15); color: #f87171; padding: 4px 10px; border-radius: 99px; font-size: 12px; font-weight: 700;">🔴 Inactive</span>'}
                </td>
                <td>
                    <div style="display: flex; gap: 6px;">
                        <button class="btn-action btn-edit" onclick="editCoupon('${c.code}')">
                            <i data-lucide="edit" width="14"></i> Edit
                        </button>
                        <button class="btn-action btn-danger" onclick="deleteCoupon('${c.code}')">
                            <i data-lucide="trash-2" width="14"></i> Delete
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        if (window.lucide) window.lucide.createIcons();
    } catch (e) {
        console.error("Error loading coupons:", e);
        const tbody = document.getElementById("coupons-table-body");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ef4444;">Failed to load coupons: ${e.message}</td></tr>`;
        }
    }
}

window.editCoupon = (code) => {
    const coupon = cachedCoupons.find(c => c.code === code);
    if (!coupon) return;

    document.getElementById("coupon-modal-title").textContent = `Edit Promo Coupon: ${coupon.code}`;
    document.getElementById("coupon-original-code").value = coupon.code;
    document.getElementById("coupon-code").value = coupon.code;
    document.getElementById("coupon-code").disabled = true;
    document.getElementById("coupon-type").value = coupon.discount_type;
    document.getElementById("coupon-value").value = coupon.discount_value;
    document.getElementById("coupon-min-order").value = coupon.min_order_value || 0;
    document.getElementById("coupon-is-active").value = coupon.is_active !== false ? "true" : "false";

    document.getElementById("coupon-modal")?.classList.add("active");
};

window.deleteCoupon = async (code) => {
    if (!confirm(`Are you sure you want to delete promo coupon '${code}'?`)) return;
    try {
        const res = await fetch(`${API_BASE_URL}/admin/coupons/${code}`, {
            method: "DELETE",
            headers: getHeaders()
        });
        if (!res.ok) throw new Error("Delete failed");
        showToast(`🗑️ Coupon '${code}' deleted.`);
        loadCoupons();
    } catch (e) {
        showToast("Error deleting coupon.", true);
    }
};

window.toggleUserRole = async (userId, makeAdmin) => {
    if (!confirm(`Are you sure you want to change administrative access for this user?`)) return;
    try {
        const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
            method: "PUT",
            headers: getHeaders(true),
            body: JSON.stringify({ is_admin: makeAdmin })
        });
        if (!res.ok) throw new Error("Role upgrade failed");
        showToast(makeAdmin ? "🛡️ User upgraded to Administrator." : "🚫 Administrator role revoked.");
        loadUsers();
    } catch (e) {
        showToast("Error altering user privileges.", true);
    }
};


/**
 * Helper to format date/time in Indian Standard Time (IST / Asia/Kolkata)
 */
function formatIndianDateTime(isoString) {
    if (!isoString) return 'N/A';
    try {
        let str = isoString;
        if (typeof str === 'string' && !str.includes('Z') && !str.includes('+') && !str.includes('-')) {
            str += 'Z';
        }
        const d = new Date(str);
        if (isNaN(d.getTime())) return isoString;
        return d.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch (e) {
        return isoString;
    }
}


/**
 * 7. CONTACT INQUIRIES MANAGER
 */
let currentInquiries = [];

async function loadInquiries() {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/inquiries`, { headers: getHeaders() });
        const tbody = document.getElementById("inquiries-table-body");
        if (!tbody) return;
        if (!res.ok) throw new Error("Could not fetch contact inquiries");

        currentInquiries = await res.json();
        tbody.innerHTML = "";

        if (currentInquiries.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #94a3b8;">No contact inquiries received yet.</td></tr>';
            return;
        }

        currentInquiries.forEach(item => {
            const dateStr = formatIndianDateTime(item.created_at);

            const rawMsg = item.message || '';
            const msgSnippet = rawMsg.length > 60 ? rawMsg.substring(0, 60) + '...' : rawMsg;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td style="font-size: 13px; color: #E5C365; font-weight: 500;">📅 ${dateStr}</td>
                <td>
                    <div style="font-weight: 700; color: #fff; font-size: 14px;">${item.name || 'Anonymous'}</div>
                    <div style="color: #C9A227; font-size: 12px;">📧 ${item.email || 'No Email'}</div>
                </td>
                <td>
                    <a href="tel:${item.phone || ''}" style="color: #60a5fa; font-weight: 600; font-size: 13px; text-decoration: none;">📞 ${item.phone || 'N/A'}</a>
                </td>
                <td style="color: #cbd5e1; font-size: 13px; max-width: 320px; overflow: hidden; text-overflow: ellipsis;">${msgSnippet}</td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-action btn-edit" onclick="viewInquiryDetail('${item._id}')"><i data-lucide="eye" width="14"></i> View</button>
                        <a href="mailto:${item.email}?subject=Re: Sonrup Customer Inquiry" class="btn-action btn-gold" style="text-decoration: none;" onclick="updateInquiryStatus('${item._id}', 'Replied')"><i data-lucide="mail" width="14"></i> Reply</a>
                        <button class="btn-action btn-danger" onclick="deleteInquiry('${item._id}')"><i data-lucide="trash-2" width="14"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        if (window.lucide) window.lucide.createIcons();
    } catch (e) {
        console.error("Error loading contact inquiries:", e);
    }
}
window.loadInquiries = loadInquiries;

window.viewInquiryDetail = (id) => {
    const item = currentInquiries.find(i => i._id === id);
    if (!item) return;

    document.getElementById("inquiry-modal-date").textContent = `📅 Received on: ${formatIndianDateTime(item.created_at)}`;
    document.getElementById("inquiry-modal-name").textContent = item.name || 'Anonymous';

    const emailLink = document.getElementById("inquiry-modal-email-link");
    emailLink.textContent = item.email || 'N/A';
    emailLink.href = `mailto:${item.email}`;

    const phoneLink = document.getElementById("inquiry-modal-phone-link");
    if (phoneLink) {
        phoneLink.textContent = item.phone ? `📞 ${item.phone}` : 'N/A';
        phoneLink.href = item.phone ? `tel:${item.phone}` : '#';
    }
    document.getElementById("inquiry-modal-message").textContent = item.message || '';

    const replyBtn = document.getElementById("inquiry-modal-reply-btn");
    replyBtn.href = `mailto:${item.email}?subject=Re: Sonrup Customer Inquiry`;
    replyBtn.onclick = () => {
        updateInquiryStatus(id, 'Replied');
        closeInquiryModal();
    };

    document.getElementById("inquiry-modal").classList.add("active");

    if (!item.status || item.status === 'New') {
        updateInquiryStatus(id, 'Read');
    }
};

window.closeInquiryModal = () => {
    document.getElementById("inquiry-modal").classList.remove("active");
};

window.updateInquiryStatus = async (id, newStatus) => {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/inquiries/${id}/status`, {
            method: "PUT",
            headers: getHeaders(true),
            body: JSON.stringify({ status: newStatus })
        });
        if (!res.ok) throw new Error("Status update failed");
        showToast(`Inquiry status updated to '${newStatus}'`);
        loadInquiries();
    } catch (e) {
        showToast("Error updating inquiry status", true);
    }
};

window.deleteInquiry = async (id) => {
    if (!confirm("Are you sure you want to delete this contact inquiry?")) return;
    try {
        const res = await fetch(`${API_BASE_URL}/admin/inquiries/${id}`, {
            method: "DELETE",
            headers: getHeaders(true)
        });
        if (!res.ok) throw new Error("Deletion failed");
        showToast("🗑️ Contact inquiry deleted.");
        loadInquiries();
        loadStats();
    } catch (e) {
        showToast("Error deleting contact inquiry.", true);
    }
};


/**
 * Tab & Step Navigation State Persister (Remembers tab instantly on page refresh)
 */
function activateAdminTab(targetId, stepNum = null) {
    if (!targetId || !document.getElementById(targetId)) return;

    localStorage.setItem("sonrup_admin_active_tab", targetId);
    sessionStorage.setItem("sonrup_admin_active_tab", targetId);
    if (stepNum) {
        localStorage.setItem("sonrup_admin_active_step", stepNum);
        sessionStorage.setItem("sonrup_admin_active_step", stepNum);
    }

    const hashVal = stepNum ? `${targetId}?step=${stepNum}` : targetId;
    if (window.history && window.history.replaceState) {
        window.history.replaceState(null, "", `#${hashVal}`);
    } else {
        window.location.hash = hashVal;
    }

    document.querySelectorAll(".admin-section").forEach(sec => sec.classList.remove("active"));
    document.getElementById(targetId)?.classList.add("active");

    document.querySelectorAll(".sidebar-tab").forEach(t => t.classList.remove("active"));

    if (targetId === "section-site-builder") {
        const toggleSettingsBtn = document.getElementById("toggle-site-settings-menu");
        const settingsSubmenu = document.getElementById("site-settings-submenu");
        const settingsArrow = document.getElementById("site-settings-arrow");

        toggleSettingsBtn?.classList.add("active");
        if (settingsSubmenu) settingsSubmenu.style.display = "block";
        if (settingsArrow) settingsArrow.style.transform = "rotate(180deg)";

        const activeStep = stepNum || localStorage.getItem("sonrup_admin_active_step") || sessionStorage.getItem("sonrup_admin_active_step") || "2";
        document.querySelectorAll(".builder-step-btn").forEach(b => {
            const isTarget = b.dataset.step === activeStep;
            b.classList.toggle("active", isTarget);
            b.style.background = isTarget ? "rgba(201,162,39,0.12)" : "none";
            b.style.border = isTarget ? "1px solid rgba(201,162,39,0.3)" : "none";
            b.style.color = isTarget ? "#ffffff" : "#94a3b8";
            b.style.fontWeight = isTarget ? "700" : "400";

            const circle = b.querySelector(".subtab-step-num");
            if (circle) {
                circle.style.background = isTarget ? "#2b231c" : "#1a1a1a";
                circle.style.borderColor = isTarget ? "#C9A227" : "rgba(255, 255, 255, 0.2)";
                circle.style.color = isTarget ? "#E5C365" : "#94a3b8";
                circle.style.boxShadow = isTarget ? "0 0 8px rgba(201,162,39,0.4)" : "none";
            }
        });

        document.querySelectorAll(".builder-step-panel").forEach(p => p.style.display = "none");
        const targetPanel = document.getElementById(`builder-step-${activeStep}`);
        if (targetPanel) targetPanel.style.display = "block";
    } else {
        const activeTabBtn = document.querySelector(`.sidebar-tab[data-target="${targetId}"]`);
        activeTabBtn?.classList.add("active");
    }

    // Clean up pre-render instant style after activating classes
    const tempStyle = document.getElementById("instant-tab-style");
    if (tempStyle) tempStyle.remove();
}

function restoreActiveTab() {
    let targetTab = null;
    let targetStep = null;

    if (window.location.hash) {
        const rawHash = window.location.hash.replace("#", "");
        if (rawHash.includes("?step=")) {
            const parts = rawHash.split("?step=");
            targetTab = parts[0];
            targetStep = parts[1];
        } else {
            targetTab = rawHash;
        }
    }

    if (!targetTab || !document.getElementById(targetTab)) {
        targetTab = localStorage.getItem("sonrup_admin_active_tab") || sessionStorage.getItem("sonrup_admin_active_tab") || "section-overview";
    }
    if (!targetStep) {
        targetStep = localStorage.getItem("sonrup_admin_active_step") || sessionStorage.getItem("sonrup_admin_active_step") || "2";
    }

    activateAdminTab(targetTab, targetStep);
}

/**
 * Event Listeners & Interactive Modals Setup
 */
function setupEventListeners() {
    // Sidebar Tabs
    const tabs = document.querySelectorAll(".sidebar-tab");
    tabs.forEach(tab => {
        tab.addEventListener("click", (e) => {
            // Let the toggle-site-settings-menu handle its own click logic
            if (tab.id === "toggle-site-settings-menu") return;
            
            const targetId = tab.getAttribute("data-target");
            if (targetId) {
                activateAdminTab(targetId);
            }
        });
    });

    // Add Product Modal Trigger
    const btnOpenAdd = document.getElementById("btn-open-add-product");
    if (btnOpenAdd) {
        btnOpenAdd.addEventListener("click", () => {
            document.getElementById("modal-title").textContent = "Add New Wellness Product";
            document.getElementById("prod-original-slug").value = "";
            document.getElementById("prod-slug").disabled = false;
            document.getElementById("product-form").reset();

            document.getElementById("prod-type").value = "single";
            document.getElementById("prod-tag-class").value = "tag-shilajit";
            document.getElementById("prod-all-images").value = "assets/images/hero-combo.jpg";
            document.getElementById("prod-image-file").value = "";
            if (window.renderImagePreviews) window.renderImagePreviews();
            document.getElementById("product-modal").classList.add("active");
        });
    }

    // Modal Close Buttons
    const closeModal = () => document.getElementById("product-modal").classList.remove("active");
    document.getElementById("modal-close-btn")?.addEventListener("click", closeModal);
    document.getElementById("modal-cancel-btn")?.addEventListener("click", closeModal);

    // Coupon Modal Handlers
    const btnOpenCoupon = document.getElementById("btn-open-add-coupon");
    if (btnOpenCoupon) {
        btnOpenCoupon.addEventListener("click", () => {
            document.getElementById("coupon-modal-title").textContent = "Create New Promo Coupon";
            document.getElementById("coupon-original-code").value = "";
            document.getElementById("coupon-code").disabled = false;
            document.getElementById("coupon-form")?.reset();
            document.getElementById("coupon-modal")?.classList.add("active");
        });
    }

    const closeCouponModal = () => document.getElementById("coupon-modal")?.classList.remove("active");
    document.getElementById("coupon-modal-close-btn")?.addEventListener("click", closeCouponModal);
    document.getElementById("coupon-modal-cancel-btn")?.addEventListener("click", closeCouponModal);

    document.getElementById("coupon-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const originalCode = document.getElementById("coupon-original-code").value;
        const isEdit = !!originalCode;

        const code = document.getElementById("coupon-code").value.trim().toUpperCase();
        const discount_type = document.getElementById("coupon-type").value;
        const discount_value = parseFloat(document.getElementById("coupon-value").value) || 0;
        const min_order_value = parseInt(document.getElementById("coupon-min-order").value) || 0;
        const is_active = document.getElementById("coupon-is-active").value === "true";

        try {
            const url = isEdit ? `${API_BASE_URL}/admin/coupons/${originalCode}` : `${API_BASE_URL}/admin/coupons`;
            const method = isEdit ? "PUT" : "POST";

            const res = await fetch(url, {
                method: method,
                headers: getHeaders(true),
                body: JSON.stringify({ code, discount_type, discount_value, min_order_value, is_active })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Failed to save coupon");
            }

            showToast(isEdit ? `✏️ Updated promo coupon '${code}'!` : `🎟️ Published promo coupon '${code}'!`);
            closeCouponModal();
            loadCoupons();
        } catch (err) {
            showToast(`Error: ${err.message}`, true);
        }
    });

    // Product Form Submit Handler (Create & Edit)
    document.getElementById("product-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const originalSlug = document.getElementById("prod-original-slug").value;
        const isEdit = !!originalSlug;


        const benefitsText = document.getElementById("prod-benefits").value.trim();
        const benefitsArray = benefitsText ? benefitsText.split("\n").map(line => line.trim()).filter(Boolean) : [];
        
        const allImagesText = document.getElementById("prod-all-images").value.trim();
        const allImagesArray = allImagesText ? allImagesText.split("\n").map(l => l.trim()).filter(Boolean) : ["assets/images/hero-combo.jpg"];

        const ingredientsText = document.getElementById("prod-ingredients").value.trim();
        const ingredientsArray = [];
        if (ingredientsText) {
            ingredientsText.split("\n").forEach(line => {
                const parts = line.split("|").map(p => p.trim());
                if (parts.length > 0 && parts[0]) {
                    ingredientsArray.push({
                        component: parts[0],
                        feature: parts[1] || "",
                        amount: parts[2] || ""
                    });
                }
            });
        }

        const payload = {
            name: document.getElementById("prod-name").value.trim(),
            tag: document.getElementById("prod-tag").value.trim(),
            flavor: document.getElementById("prod-flavor").value.trim(),
            price: parseInt(document.getElementById("prod-price").value) || 999,
            description: document.getElementById("prod-description").value.trim(),
            benefits: benefitsArray,
            suggested_usage: document.getElementById("prod-suggested-usage").value.trim(),
            ingredients: ingredientsArray,
            variants: [],
            images: allImagesArray,
            tag_class: document.getElementById("prod-tag-class") ? document.getElementById("prod-tag-class").value : "tag-shilajit",
            product_type: document.getElementById("prod-type") ? document.getElementById("prod-type").value : "single"
        };

        try {
            let res;
            if (isEdit) {
                res = await fetch(`${API_BASE_URL}/admin/products/${originalSlug}`, {
                    method: "PUT",
                    headers: getHeaders(true),
                    body: JSON.stringify(payload)
                });
            } else {
                payload.slug = document.getElementById("prod-slug").value.trim().toLowerCase().replace(/\s+/g, "-");
                res = await fetch(`${API_BASE_URL}/admin/products`, {
                    method: "POST",
                    headers: getHeaders(true),
                    body: JSON.stringify(payload)
                });
            }

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "Database save error");
            }

            showToast(isEdit ? `✅ Updated '${payload.name}'` : `🚀 Published '${payload.name}' to catalog!`);
            closeModal();
            loadProducts();
            loadStats();
        } catch (err) {
            showToast(`Error: ${err.message}`, true);
        }
    });

    // Settings Form Submit Handler
    document.getElementById("settings-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const payload = {
            site_name: document.getElementById("setting-site-name").value.trim(),
            support_email: document.getElementById("setting-support-email").value.trim(),
            support_phone: document.getElementById("setting-support-phone").value.trim(),
            support_address: document.getElementById("setting-address").value.trim(),
            fssai_number: document.getElementById("setting-fssai")?.value?.trim() || "",
            license_number: document.getElementById("setting-license")?.value?.trim() || "",
            announcement_banner_enabled: document.getElementById("setting-banner-enabled").value === "true",
            announcement_banner_text: document.getElementById("setting-banner-text").value.trim(),
            razorpay_enabled: document.getElementById("setting-razorpay-enabled").value === "true",
            razorpay_key_id: document.getElementById("setting-razorpay-key-id").value.trim(),
            razorpay_key_secret: document.getElementById("setting-razorpay-key-secret").value.trim(),
            delhivery_enabled: document.getElementById("setting-delhivery-enabled").value === "true",
            delhivery_environment: document.getElementById("setting-delhivery-environment").value.trim(),
            delhivery_api_token: document.getElementById("setting-delhivery-api-token").value.trim(),
            delhivery_warehouse_name: document.getElementById("setting-delhivery-warehouse-name").value.trim(),
            delhivery_warehouse_address: document.getElementById("setting-delhivery-warehouse-address").value.trim(),
            delhivery_warehouse_city: document.getElementById("setting-delhivery-warehouse-city").value.trim(),
            delhivery_warehouse_state: document.getElementById("setting-delhivery-warehouse-state").value.trim(),
            delhivery_warehouse_pincode: document.getElementById("setting-delhivery-warehouse-pincode").value.trim(),
            delhivery_warehouse_phone: document.getElementById("setting-delhivery-warehouse-phone").value.trim()
        ,
            footer_settings: {
                logo: document.getElementById("setting-footer-logo-input")?.value.trim(),
                favicon: document.getElementById("setting-favicon-input")?.value.trim(),
                desc: document.getElementById("setting-footer-desc")?.value.trim(),
                facebook: document.getElementById("setting-social-facebook")?.value.trim(),
                instagram: document.getElementById("setting-social-instagram")?.value.trim(),
                twitter: document.getElementById("setting-social-twitter")?.value.trim(),
                whatsapp: document.getElementById("setting-social-whatsapp")?.value.trim(),
                license: document.getElementById("setting-license")?.value.trim(),
                fssai: document.getElementById("setting-fssai")?.value.trim(),
                disclaimer: document.getElementById("setting-reg-disclaimer")?.value.trim(),
                marketed_by: document.getElementById("setting-contact-marketed")?.value.trim(),
                manufactured_by: document.getElementById("setting-contact-manufactured")?.value.trim(),
                email: document.getElementById("setting-contact-email")?.value.trim(),
                phone: document.getElementById("setting-contact-phone")?.value.trim()
            }
        };

        try {
            const res = await fetch(`${API_BASE_URL}/admin/settings`, {
                method: "PUT",
                headers: getHeaders(true),
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error("Could not save settings");

            showToast("🌟 Website Configuration successfully published across the live site!");
            localStorage.removeItem("sonrup_config");
            localStorage.removeItem("sonrup_config_time");
        } catch (err) {
            showToast("Failed to save website settings.", true);
        }
    });

    // Collapsible Site Settings Submenu Toggle Handler
    const toggleSettingsBtn = document.getElementById("toggle-site-settings-menu");
    const settingsSubmenu = document.getElementById("site-settings-submenu");
    const settingsArrow = document.getElementById("site-settings-arrow");

    if (toggleSettingsBtn && settingsSubmenu) {
        toggleSettingsBtn.addEventListener("click", (e) => {
            const isActive = document.getElementById("section-site-builder")?.classList.contains("active");
            
            if (isActive) {
                // If already on the site builder tab, just toggle the submenu visibility
                const isHidden = settingsSubmenu.style.display === "none";
                settingsSubmenu.style.display = isHidden ? "block" : "none";
                if (settingsArrow) {
                    settingsArrow.style.transform = isHidden ? "rotate(180deg)" : "rotate(0deg)";
                }
            } else {
                // If not active, activate the tab (which forces menu open via activateAdminTab)
                activateAdminTab("section-site-builder");
            }
        });
    }

    // Builder Steps Sub-tab Switching inside Sidebar
    document.querySelectorAll(".builder-step-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            activateAdminTab("section-site-builder", btn.dataset.step);
        });
    });

    // Live Hero Image File Selection & Instant Upload
    document.getElementById("setting-hero-image-file")?.addEventListener("change", async (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const previewImg = document.getElementById("setting-hero-image-preview");
            if (previewImg) previewImg.src = URL.createObjectURL(file);

            showToast("⏳ Uploading Hero banner photo...");
            const formData = new FormData();
            formData.append("file", file);
            try {
                const uploadRes = await fetch(`${API_BASE_URL}/admin/upload-image`, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${localStorage.getItem("sonrup_token") || localStorage.getItem("access_token") || localStorage.getItem("auth_token") || localStorage.getItem("token")}` },
                    body: formData
                });
                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    const path = uploadData.path || uploadData.image_path || uploadData.url;
                    document.getElementById("setting-hero-image-path").value = path;
                    if (previewImg) previewImg.src = path;
                    showToast("✨ Hero photo uploaded successfully!");
                }
            } catch (err) {
                console.error("Hero upload error:", err);
            }
        }
    });

    // Hero Builder Form Submit Handler
    document.getElementById("hero-builder-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();

        let heroImagePath = document.getElementById("setting-hero-image-path").value.trim() || "assets/images/hero-combo.jpg";
        const heroFile = document.getElementById("setting-hero-image-file");

        if (heroFile && heroFile.files && heroFile.files[0]) {
            showToast("Uploading selected banner photo...");
            const formData = new FormData();
            formData.append("file", heroFile.files[0]);
            try {
                const uploadRes = await fetch(`${API_BASE_URL}/admin/upload-image`, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${localStorage.getItem("sonrup_token") || localStorage.getItem("access_token") || localStorage.getItem("auth_token") || localStorage.getItem("token")}` },
                    body: formData
                });
                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    heroImagePath = uploadData.path || uploadData.image_path || uploadData.url;
                    document.getElementById("setting-hero-image-path").value = heroImagePath;
                    const previewImg = document.getElementById("setting-hero-image-preview");
                    if (previewImg) previewImg.src = heroImagePath;
                    showToast("✨ Hero photo uploaded!");
                }
            } catch (err) {
                console.error("Hero upload error:", err);
            }
        }

        let currentSettings = {};
        try {
            const res = await fetch(`${API_BASE_URL}/admin/settings`, { headers: getHeaders() });
            if (res.ok) currentSettings = await res.json();
        } catch (e) {}

        const titleMain = document.getElementById("setting-hero-title-main").value.trim() || "Premium Gummies for";
        const titleGold = document.getElementById("setting-hero-title-gold").value.trim() || "Active Health & Beauty.";
        const combinedTitle = `${titleMain}<br><span class="text-gold">${titleGold}</span>`;

        const payload = {
            ...currentSettings,
            hero_badge_text: document.getElementById("setting-hero-badge").value.trim(),
            hero_title_main: titleMain,
            hero_title_gold: titleGold,
            hero_title: combinedTitle,
            hero_subtitle: document.getElementById("setting-hero-subtitle").value.trim(),
            hero_cta_text: document.getElementById("setting-hero-cta-text").value.trim(),
            hero_cta_link: document.getElementById("setting-hero-cta-link").value.trim(),
            hero_trust_1: document.getElementById("setting-hero-trust1").value.trim(),
            hero_trust_2: document.getElementById("setting-hero-trust2").value.trim(),
            hero_float_badge_1: document.getElementById("setting-hero-float1").value.trim(),
            hero_float_badge_2: document.getElementById("setting-hero-float2").value.trim(),
            hero_float_badge_3: document.getElementById("setting-hero-float3").value.trim(),
            hero_image_path: heroImagePath
        };

        try {
            const res = await fetch(`${API_BASE_URL}/admin/settings`, {
                method: "PUT",
                headers: getHeaders(true),
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error("Could not save hero settings");

            showToast("🌟 Hero Section updated & live on homepage!");
        } catch (err) {
            showToast("Failed to save hero section.", true);
        }
    });

    // Add Trust Badge Button Handler
    document.getElementById("btn-add-trust-badge")?.addEventListener("click", () => {
        const newBadgeId = `tb_${Date.now()}`;
        currentTrustBadges.push({
            id: newBadgeId,
            icon: "check-circle",
            title: "",
            subtitle: ""
        });
        renderTrustBadgesCRUD();
        showToast("✨ New trust badge added! Fill in details below.");

        setTimeout(() => {
            const newCard = document.querySelector(`.trust-badge-item-card[data-badge-id="${newBadgeId}"]`);
            if (newCard) {
                newCard.scrollIntoView({ behavior: "smooth", block: "center" });
                newCard.style.outline = "2px solid #C9A227";
                newCard.style.boxShadow = "0 0 20px rgba(201, 162, 39, 0.45)";
                const titleInput = newCard.querySelector(".trust-badge-title-input");
                if (titleInput) titleInput.focus();
                setTimeout(() => {
                    newCard.style.outline = "none";
                    newCard.style.boxShadow = "none";
                }, 2200);
            }
        }, 120);
    });

    // Add New Transparency Tab Handler
    document.getElementById("btn-add-transparency-tab")?.addEventListener("click", () => {
        syncTransparencyInputsFromDOM();
        const newTabId = `tab_${Date.now()}`;
        currentTransparencyTabs.push({
            id: newTabId,
            name: "",
            suggested_usage: "",
            rows: [
                { component: "", feature: "", amount: "" }
            ]
        });
        renderTransparencyCRUD();
        showToast("✨ New product tab added! Fill in details below.");

        setTimeout(() => {
            const newCard = document.querySelector(`.transparency-tab-card[data-tab-id="${newTabId}"]`);
            if (newCard) {
                newCard.scrollIntoView({ behavior: "smooth", block: "center" });
                newCard.style.outline = "2px solid #C9A227";
                newCard.style.boxShadow = "0 0 20px rgba(201, 162, 39, 0.45)";
                const nameInput = newCard.querySelector(".tab-name-input");
                if (nameInput) nameInput.focus();
                setTimeout(() => {
                    newCard.style.outline = "none";
                    newCard.style.boxShadow = "none";
                }, 2200);
            }
        }, 120);
    });

    // Add New Advantage Card Handler
    document.getElementById("btn-add-advantage-card")?.addEventListener("click", () => {
        const newId = `adv_${Date.now()}`;
        currentAdvantageCards.push({
            id: newId,
            icon: "zap",
            title: "",
            description: ""
        });
        renderAdvantageCRUD();
        showToast("✨ New advantage card added!");

        setTimeout(() => {
            const newCard = document.querySelector(`.advantage-card-item[data-id="${newId}"]`);
            if (newCard) {
                newCard.scrollIntoView({ behavior: "smooth", block: "center" });
                newCard.style.outline = "2px solid #C9A227";
                newCard.style.boxShadow = "0 0 20px rgba(201, 162, 39, 0.45)";
                const titleInput = newCard.querySelector(".advantage-title-input");
                if (titleInput) titleInput.focus();
                setTimeout(() => {
                    newCard.style.outline = "none";
                    newCard.style.boxShadow = "none";
                }, 2200);
            }
        }, 120);
    });

    // Add New Guidance Card Handler
    document.getElementById("btn-add-guidance-col")?.addEventListener("click", () => {
        syncGuidanceInputsFromDOM();
        const newColId = `col_${Date.now()}`;
        currentGuidanceColumns.push({
            id: newColId,
            icon: "user",
            title: "",
            subtitle: "",
            items: [
                { product: "", usage: "" }
            ],
            warning: ""
        });
        renderGuidanceCRUD();
        showToast("✨ New guidance card added! Fill in details below.");

        setTimeout(() => {
            const newCard = document.querySelector(`.guidance-col-card[data-id="${newColId}"]`);
            if (newCard) {
                newCard.scrollIntoView({ behavior: "smooth", block: "center" });
                newCard.style.outline = "2px solid #C9A227";
                newCard.style.boxShadow = "0 0 20px rgba(201, 162, 39, 0.45)";
                const titleInput = newCard.querySelector(".col-title-input");
                if (titleInput) titleInput.focus();
                setTimeout(() => {
                    newCard.style.outline = "none";
                    newCard.style.boxShadow = "none";
                }, 2200);
            }
        }, 120);
    });

    // Add New Dietary Card Handler
    document.getElementById("btn-add-dietary-card")?.addEventListener("click", () => {
        const newId = `dg_${Date.now()}`;
        const cardTypes = ["him", "her", "kids"];
        currentDietaryCards.push({
            id: newId,
            icon: "zap",
            title: "",
            card_type: cardTypes[currentDietaryCards.length % 3],
            timing: "",
            dosage: "",
            target: ""
        });
        renderDietaryCardsCRUD();
        showToast("✨ New dosage card added!");

        setTimeout(() => {
            const newCard = document.querySelector(`.dietary-card-item[data-id="${newId}"]`);
            if (newCard) {
                newCard.scrollIntoView({ behavior: "smooth", block: "center" });
                newCard.style.outline = "2px solid #C9A227";
                const titleInput = newCard.querySelector(".dietary-title-input");
                if (titleInput) titleInput.focus();
                setTimeout(() => { newCard.style.outline = "none"; }, 2200);
            }
        }, 120);
    });

    // Add New FAQ Item Handler
    document.getElementById("btn-add-faq-item")?.addEventListener("click", () => {
        const newId = `faq_${Date.now()}`;
        currentFaqItems.push({
            id: newId,
            question: "",
            answer: ""
        });
        renderFaqCRUD();
        showToast("✨ New FAQ question added!");

        setTimeout(() => {
            const newCard = document.querySelector(`.faq-item-card[data-id="${newId}"]`);
            if (newCard) {
                newCard.scrollIntoView({ behavior: "smooth", block: "center" });
                newCard.style.outline = "2px solid #C9A227";
                newCard.style.boxShadow = "0 0 20px rgba(201, 162, 39, 0.45)";
                const qInput = newCard.querySelector(".faq-question-input");
                if (qInput) qInput.focus();
                setTimeout(() => {
                    newCard.style.outline = "none";
                    newCard.style.boxShadow = "none";
                }, 2200);
            }
        }, 120);
    });

    // FAQ Builder Form Submit Handler
    document.getElementById("faq-builder-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();

        // 1. Sync Dietary Cards
        const dietaryContainer = document.getElementById("dietary-cards-list-container");
        if (dietaryContainer) {
            const updatedDietary = [];
            const cards = dietaryContainer.querySelectorAll(".dietary-card-item");
            const cardTypes = ["him", "her", "kids"];
            cards.forEach((cardEl, idx) => {
                const titleVal = cardEl.querySelector(".dietary-title-input")?.value.trim() || "";
                const iconVal = cardEl.querySelector(".dietary-icon-input")?.value || "zap";
                const timingVal = cardEl.querySelector(".dietary-timing-input")?.value.trim() || "";
                const dosageVal = cardEl.querySelector(".dietary-dosage-input")?.value.trim() || "";
                const targetVal = cardEl.querySelector(".dietary-target-input")?.value.trim() || "";
                updatedDietary.push({
                    id: currentDietaryCards[idx]?.id || `dg_${Date.now()}_${idx}`,
                    icon: iconVal,
                    title: titleVal,
                    card_type: cardTypes[idx % 3],
                    timing: timingVal,
                    dosage: dosageVal,
                    target: targetVal
                });
            });
            currentDietaryCards = updatedDietary;
        }

        // 2. Sync FAQ Items
        const container = document.getElementById("faq-items-list-container");
        if (container) {
            const updatedItems = [];
            const cards = container.querySelectorAll(".faq-item-card");
            cards.forEach((cardEl, idx) => {
                const qVal = cardEl.querySelector(".faq-question-input")?.value.trim() || "";
                const aVal = cardEl.querySelector(".faq-answer-input")?.value.trim() || "";
                updatedItems.push({
                    id: currentFaqItems[idx]?.id || `faq_${Date.now()}_${idx}`,
                    question: qVal,
                    answer: aVal
                });
            });
            currentFaqItems = updatedItems;
        }

        let currentSettings = {};
        try {
            const res = await fetch(`${API_BASE_URL}/admin/settings`, { headers: getHeaders() });
            if (res.ok) currentSettings = await res.json();
        } catch (e) {}

        const payload = {
            ...currentSettings,
            faq_subheading: document.getElementById("setting-faq-subheading").value.trim(),
            faq_title: document.getElementById("setting-faq-title").value.trim(),
            faq_desc: document.getElementById("setting-faq-desc").value.trim(),
            dietary_guide_subheading: document.getElementById("setting-dietary-subheading")?.value.trim() || "DIETARY USER GUIDE",
            dietary_guide_title: document.getElementById("setting-dietary-title")?.value.trim() || "Dosages & Usage Instructions",
            dietary_guide_desc: document.getElementById("setting-dietary-desc")?.value.trim() || "Follow our certified dietary guides to maximize the energy, vitality, and cellular protection benefits of your daily Sonrup gummies.",
            faq_items: currentFaqItems,
            dietary_guide_cards: currentDietaryCards
        };

        try {
            const res = await fetch(`${API_BASE_URL}/admin/settings`, {
                method: "PUT",
                headers: getHeaders(true),
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error("Could not save FAQ section");

            showToast("🌟 FAQ & Dietary Guide updated & live on website!");
        } catch (err) {
            showToast("Failed to save FAQ section.", true);
        }
    });

    // ─── Our Story Builder CRUD Handlers ───
    document.getElementById("setting-story-bg-file")?.addEventListener("change", async (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const previewImg = document.getElementById("setting-story-bg-preview");
            if (previewImg) previewImg.src = URL.createObjectURL(file);

            showToast("⏳ Uploading header background photo...");
            const formData = new FormData();
            formData.append("file", file);
            try {
                const uploadRes = await fetch(`${API_BASE_URL}/admin/upload-image`, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${localStorage.getItem("sonrup_token") || localStorage.getItem("access_token") || localStorage.getItem("auth_token") || localStorage.getItem("token")}` },
                    body: formData
                });
                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    const path = uploadData.path || uploadData.image_path || uploadData.url;
                    document.getElementById("setting-story-bg-path").value = path;
                    if (previewImg) previewImg.src = path;
                    showToast("✨ Story Header background uploaded!");
                }
            } catch (err) {
                console.error("Story bg upload error:", err);
            }
        }
    });

    document.getElementById("btn-add-story-section")?.addEventListener("click", () => {
        syncStoryInputsFromDOM();
        const newId = `story_${Date.now()}`;
        currentStorySections.push({
            id: newId,
            badge: `0${currentStorySections.length + 1}. NEW SECTION`,
            title: "",
            image: "assets/images/shilajit-detail1.jpg",
            p1: "",
            p2: ""
        });
        renderStoryCRUD();
        showToast("✨ New Story Block added!");

        setTimeout(() => {
            const newCard = document.querySelector(`.story-section-card[data-id="${newId}"]`);
            if (newCard) {
                newCard.scrollIntoView({ behavior: "smooth", block: "center" });
                newCard.style.outline = "2px solid #C9A227";
                newCard.style.boxShadow = "0 0 25px rgba(201, 162, 39, 0.5)";
                const titleInput = newCard.querySelector(".story-title-input") || newCard.querySelector("input");
                if (titleInput) titleInput.focus();
                setTimeout(() => {
                    newCard.style.outline = "none";
                    newCard.style.boxShadow = "none";
                }, 2200);
            }
        }, 100);
    });

    document.getElementById("btn-add-story-stat")?.addEventListener("click", () => {
        syncStoryInputsFromDOM();
        const newId = `stat_${Date.now()}`;
        currentStoryStats.push({
            id: newId,
            number: "100%",
            label: "Quality Certified"
        });
        renderStoryCRUD();
        showToast("✨ New Stat Card added!");

        setTimeout(() => {
            const newCard = document.querySelector(`.story-stat-card[data-id="${newId}"]`);
            if (newCard) {
                newCard.scrollIntoView({ behavior: "smooth", block: "center" });
                newCard.style.outline = "2px solid #C9A227";
                newCard.style.boxShadow = "0 0 25px rgba(201, 162, 39, 0.5)";
                const numInput = newCard.querySelector(".story-stat-num-input") || newCard.querySelector("input");
                if (numInput) numInput.focus();
                setTimeout(() => {
                    newCard.style.outline = "none";
                    newCard.style.boxShadow = "none";
                }, 2200);
            }
        }, 100);
    });

    document.getElementById("story-builder-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        syncStoryInputsFromDOM();

        let currentSettings = {};
        try {
            const res = await fetch(`${API_BASE_URL}/admin/settings`, { headers: getHeaders() });
            if (res.ok) currentSettings = await res.json();
        } catch (e) {}

        let bgImgPath = document.getElementById("setting-story-bg-path")?.value.trim() || "assets/images/wellness-login-hero.jpg";
        const bgFile = document.getElementById("setting-story-bg-file");
        if (bgFile && bgFile.files && bgFile.files[0]) {
            showToast("Uploading header background photo...");
            const formData = new FormData();
            formData.append("file", bgFile.files[0]);
            try {
                const uploadRes = await fetch(`${API_BASE_URL}/admin/upload-image`, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${localStorage.getItem("sonrup_token") || localStorage.getItem("access_token") || localStorage.getItem("auth_token") || localStorage.getItem("token")}` },
                    body: formData
                });
                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    bgImgPath = uploadData.path || uploadData.image_path || uploadData.url;
                    document.getElementById("setting-story-bg-path").value = bgImgPath;
                    const previewImg = document.getElementById("setting-story-bg-preview");
                    if (previewImg) previewImg.src = bgImgPath;
                }
            } catch (err) {}
        }

        const payload = {
            ...currentSettings,
            story_subheading: document.getElementById("setting-story-subheading")?.value.trim() || "OUR STORY",
            story_title: document.getElementById("setting-story-title")?.value.trim() || "Himalayan Purity, Modern Scientific Wellness",
            story_desc: document.getElementById("setting-story-desc")?.value.trim() || "At Sonrup™, we bridge the wisdom of traditional Ayurveda...",
            story_bg_image: bgImgPath,
            story_sections: currentStorySections,
            story_stats: currentStoryStats
        };

        try {
            const res = await fetch(`${API_BASE_URL}/admin/settings`, {
                method: "PUT",
                headers: getHeaders(true),
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error("Could not save Our Story section");

            showToast("🌟 Our Story section updated & live on website!");
        } catch (err) {
            showToast("Failed to save Our Story section.", true);
        }
    });

    // ─── Blog Builder CRUD Handlers ───
    document.getElementById("btn-add-blog-article")?.addEventListener("click", () => {
        syncBlogInputsFromDOM();
        const newId = `blog_${Date.now()}`;
        currentBlogArticles.push({
            id: newId,
            title: "",
            category: "Ayurveda",
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            read_time: "5 Min Read",
            image: "assets/images/shilajit-bottle.jpg",
            excerpt: "",
            link: "blog-shilajit.html"
        });
        renderBlogCRUD();
        showToast("✨ New Blog Article added!");

        setTimeout(() => {
            const newCard = document.querySelector(`.blog-article-card[data-id="${newId}"]`);
            if (newCard) {
                newCard.scrollIntoView({ behavior: "smooth", block: "center" });
                newCard.style.outline = "2px solid #C9A227";
                newCard.style.boxShadow = "0 0 20px rgba(201, 162, 39, 0.45)";
                const titleInput = newCard.querySelector(".blog-title-input");
                if (titleInput) titleInput.focus();
                setTimeout(() => {
                    newCard.style.outline = "none";
                    newCard.style.boxShadow = "none";
                }, 2200);
            }
        }, 120);
    });

    async function saveBlogArticlesToDB() {
        let currentSettings = {};
        try {
            const res = await fetch(`${API_BASE_URL}/admin/settings`, { headers: getHeaders() });
            if (res.ok) currentSettings = await res.json();
        } catch (e) {}

        const payload = {
            ...currentSettings,
            blog_subheading: document.getElementById("setting-blog-subheading")?.value.trim() || "WELLNESS CORNER",
            blog_title: document.getElementById("setting-blog-title")?.value.trim() || "The Sonrup Blog",
            blog_desc: document.getElementById("setting-blog-desc")?.value.trim() || "Expert insights, lifestyle tips, and the scientific research behind sugar-free Ayurvedic restauratives and premium multivitamin gummies.",
            blog_articles: currentBlogArticles
        };

        try {
            const res = await fetch(`${API_BASE_URL}/admin/settings`, {
                method: "PUT",
                headers: getHeaders(true),
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error("Could not save Blog section");
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    }

    // Attach function to window so it can be called from dynamically rendered elements
    window.saveBlogArticlesToDB = saveBlogArticlesToDB;

    document.getElementById("blog-builder-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        syncBlogInputsFromDOM();
        const success = await saveBlogArticlesToDB();
        if (success) {
            showToast("🌟 Blog Articles updated & live on website!");
        } else {
            showToast("Failed to save Blog section.", true);
        }
    });

    // Logout Handler
    document.getElementById("admin-logout-btn")?.addEventListener("click", () => {
        if (confirm("Log out from Administrator Session?")) {
            localStorage.removeItem("sonrup_token");
            localStorage.removeItem("sonrup_user");
            localStorage.removeItem("access_token");
            localStorage.removeItem("auth_token");
            localStorage.removeItem("token");
            localStorage.removeItem("user_profile");
            showAdminLoginScreen("Logged out successfully.");
        }
    });

    // Admin Direct Login Form Handler
    document.getElementById("admin-direct-login-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("admin-login-email").value.trim();
        const password = document.getElementById("admin-login-password").value;

        try {
            showToast("Authenticating Administrator...");
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            if (!res.ok) {
                const err = await res.json();
                showToast(err.detail || "Invalid admin email or password.", true);
                return;
            }

            const data = await res.json();
            if (!data.user || !data.user.is_admin) {
                showToast("Access Denied: This account lacks Administrator privileges.", true);
                return;
            }

            // Save tokens & user profile
            localStorage.setItem("sonrup_token", data.access_token);
            localStorage.setItem("sonrup_user", JSON.stringify(data.user));

            hideAdminLoginScreen();
            showToast("⚡ Admin Portal Unlocked!");
            await initDashboard();
        } catch (err) {
            showToast("Authentication server error.", true);
        }
    });

    // Password Visibility Toggle for Admin Login
    const toggleBtn = document.getElementById("toggle-admin-password");
    const passInput = document.getElementById("admin-login-password");
    if (toggleBtn && passInput) {
        toggleBtn.addEventListener("click", () => {
            const isPass = passInput.getAttribute("type") === "password";
            passInput.setAttribute("type", isPass ? "text" : "password");
            toggleBtn.innerHTML = `<i data-lucide="${isPass ? 'eye-off' : 'eye'}" width="18" height="18"></i>`;
            if (window.lucide) window.lucide.createIcons();
        });
    }
}

function showAdminLoginScreen(msg = null) {
    const screen = document.getElementById("admin-login-screen");
    if (screen) {
        screen.style.display = "flex";
    }
    if (msg) showToast(msg, true);
}

function hideAdminLoginScreen() {
    const screen = document.getElementById("admin-login-screen");
    if (screen) {
        screen.style.display = "none";
    }
}

// ─── Delhivery Shipment Handlers ───
window.shipDelhivery = async (orderRef) => {
    if (!confirm(`Manifest this shipment via Delhivery Logistics for Order #${orderRef}?`)) return;
    try {
        const res = await fetch(`${API_BASE_URL}/admin/orders/${orderRef}/ship-delhivery`, {
            method: "POST",
            headers: getHeaders(true)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Manifestation failed");

        showToast(`🚚 Shipment successfully created! Waybill: ${data.waybill}`);
        loadOrders();
    } catch (e) {
        showToast(e.message, true);
    }
};

window.trackDelhivery = async (waybill) => {
    try {
        const res = await fetch(`${API_BASE_URL}/orders/track/${waybill}`);
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
                    <div style="position: absolute; left: -25px; top: 4px; width: 8px; height: 8px; border-radius: 50%; background: #C9A227; border: 2px solid #121212;"></div>
                    <div style="font-weight: 700; color: #fff; font-size:13px;">${scan.status}</div>
                    <div style="color: #cbd5e1; font-size: 12px; margin-top: 2px;">${scan.activity}</div>
                    <div style="color: #94a3b8; font-size: 11px; margin-top: 2px;">📅 ${scan.date}</div>
                `;
                timeline.appendChild(item);
            });
        }

        document.getElementById("delhivery-tracking-modal").style.display = "flex";
    } catch (e) {
        showToast(e.message, true);
    }
};

window.closeTrackingModal = () => {
    document.getElementById("delhivery-tracking-modal").style.display = "none";
};

// ─── Our Story Builder CRUD Renderers & Helper Handlers ───
let currentStorySections = [];
let currentStoryStats = [];

function renderStoryCRUD() {
    // 1. Render Story Header Texts & Background Image Preview
    if (document.getElementById("setting-story-subheading") && window.LAST_SETTINGS_DATA) document.getElementById("setting-story-subheading").value = window.LAST_SETTINGS_DATA.story_subheading || "OUR STORY";
    if (document.getElementById("setting-story-title") && window.LAST_SETTINGS_DATA) document.getElementById("setting-story-title").value = window.LAST_SETTINGS_DATA.story_title || "Himalayan Purity, Modern Scientific Wellness";
    if (document.getElementById("setting-story-desc") && window.LAST_SETTINGS_DATA) document.getElementById("setting-story-desc").value = window.LAST_SETTINGS_DATA.story_desc || "At Sonrup™, we bridge the wisdom of traditional Ayurveda with clean, modern dietary science to empower the health of your entire household.";

    const bgImgPath = window.LAST_SETTINGS_DATA?.story_bg_image || "assets/images/wellness-login-hero.jpg";
    if (document.getElementById("setting-story-bg-path")) document.getElementById("setting-story-bg-path").value = bgImgPath;
    if (document.getElementById("setting-story-bg-preview")) document.getElementById("setting-story-bg-preview").src = bgImgPath;

    // 2. Render Story Blocks Container
    const secContainer = document.getElementById("story-sections-list-container");
    if (secContainer) {
        if (!currentStorySections || currentStorySections.length === 0) {
            secContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: #94a3b8; background: rgba(0,0,0,0.2); border-radius: 8px;">No story narrative blocks yet. Click <strong>+ Add Story Block</strong>.</div>`;
        } else {
            secContainer.innerHTML = currentStorySections.map((item, idx) => `
                <div class="story-section-card glass-panel" data-id="${item.id}" style="padding: 16px 20px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; position: relative;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">
                        <span style="font-size: 13px; font-weight: 700; color: #E5C365;">BLOCK #${idx + 1} (${item.badge || '0' + (idx+1) + '. STORY'})</span>
                        <div style="display: flex; gap: 6px;">
                            <button type="button" onclick="moveStoryBlock(${idx}, -1)" class="btn-action" style="padding: 4px 8px; font-size: 11px; background: rgba(255,255,255,0.05); color: #ccc;" title="Move Up">▲</button>
                            <button type="button" onclick="moveStoryBlock(${idx}, 1)" class="btn-action" style="padding: 4px 8px; font-size: 11px; background: rgba(255,255,255,0.05); color: #ccc;" title="Move Down">▼</button>
                            <button type="button" onclick="deleteStoryBlock(${idx})" class="btn-action btn-danger" style="padding: 6px 9px; font-size: 12px; border-radius: 6px; background: rgba(239,68,68,0.18); border: 1px solid rgba(239,68,68,0.35); color: #f87171; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;" title="Delete Story Block"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i></button>
                        </div>
                    </div>
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label" style="font-size: 11.5px;">Badge Label</label>
                            <input type="text" class="form-input story-badge-input" value="${item.badge || ''}" placeholder="01. PURE SOURCE" style="padding: 7px 10px; font-size: 13px;">
                        </div>
                        <div class="form-group">
                            <label class="form-label" style="font-size: 11.5px;">Block Title</label>
                            <input type="text" class="form-input story-title-input" value="${item.title || ''}" placeholder="Harvested From the Peaks" style="padding: 7px 10px; font-size: 13px;">
                        </div>
                        <div class="form-group full-width" style="background: rgba(255,255,255,0.02); border: 1px dashed rgba(201,162,39,0.25); padding: 12px 14px; border-radius: 10px;">
                            <label class="form-label" style="font-size: 11.5px; font-weight: 700; color: #E5C365; display: flex; align-items: center; gap: 6px;">
                                <i data-lucide="image"></i> Block Image (Upload Custom Photo File or Edit Path)
                            </label>
                            <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-top: 6px;">
                                <div style="width: 70px; height: 70px; border-radius: 8px; overflow: hidden; border: 1.5px solid #C9A227; background: #000; flex-shrink: 0;">
                                    <img class="story-img-preview" src="${item.image || 'assets/images/shilajit-detail1.jpg'}" alt="Preview" style="width: 100%; height: 100%; object-fit: cover;">
                                </div>
                                <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
                                    <input type="file" class="form-input story-image-file" accept="image/*" onchange="uploadStoryBlockImage(this, ${idx})" style="padding: 5px; font-size: 11.5px; cursor: pointer;">
                                    <input type="text" class="form-input story-image-input" value="${item.image || ''}" placeholder="assets/images/shilajit-detail1.jpg" style="padding: 5px 8px; font-size: 12px;">
                                </div>
                            </div>
                        </div>
                        <div class="form-group full-width">
                            <label class="form-label" style="font-size: 11.5px;">Paragraph 1 Text</label>
                            <textarea class="form-input story-p1-input" rows="2" style="padding: 7px 10px; font-size: 13px;">${item.p1 || ''}</textarea>
                        </div>
                        <div class="form-group full-width">
                            <label class="form-label" style="font-size: 11.5px;">Paragraph 2 Text (Optional)</label>
                            <textarea class="form-input story-p2-input" rows="2" style="padding: 7px 10px; font-size: 13px;">${item.p2 || ''}</textarea>
                        </div>
                    </div>
                </div>
            `).join("");
        }
    }

    // 3. Render Stat Cards Container
    const statContainer = document.getElementById("story-stats-list-container");
    if (statContainer) {
        if (!currentStoryStats || currentStoryStats.length === 0) {
            statContainer.innerHTML = `<div style="padding: 16px; text-align: center; color: #94a3b8; background: rgba(0,0,0,0.2); border-radius: 8px;">No stat cards. Click <strong>+ Add Stat Card</strong>.</div>`;
        } else {
            statContainer.innerHTML = currentStoryStats.map((stat, idx) => `
                <div class="story-stat-card glass-panel" data-id="${stat.id}" style="padding: 12px 16px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                        <div style="flex: 1;">
                            <label class="form-label" style="font-size: 10.5px; margin-bottom: 2px;">Number Highlight</label>
                            <input type="text" class="form-input story-stat-num-input" value="${stat.number || ''}" placeholder="16k+ Ft" style="padding: 5px 8px; font-size: 12.5px;">
                        </div>
                        <div style="flex: 1.5;">
                            <label class="form-label" style="font-size: 10.5px; margin-bottom: 2px;">Label Text</label>
                            <input type="text" class="form-input story-stat-label-input" value="${stat.label || ''}" placeholder="Himalayan Sourcing" style="padding: 5px 8px; font-size: 12.5px;">
                        </div>
                    </div>
                    <button type="button" onclick="deleteStoryStat(${idx})" class="btn-action btn-danger" style="padding: 6px 9px; font-size: 12px; border-radius: 6px; background: rgba(239,68,68,0.18); border: 1px solid rgba(239,68,68,0.35); color: #f87171; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;" title="Delete Stat Card"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i></button>
                </div>
            `).join("");
        }
    }

    if (window.lucide) window.lucide.createIcons();
}

window.deleteStoryBlock = function(idx) {
    syncStoryInputsFromDOM();
    currentStorySections.splice(idx, 1);
    renderStoryCRUD();
};

window.moveStoryBlock = function(idx, dir) {
    syncStoryInputsFromDOM();
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= currentStorySections.length) return;
    const temp = currentStorySections[idx];
    currentStorySections[idx] = currentStorySections[newIdx];
    currentStorySections[newIdx] = temp;
    renderStoryCRUD();
};

window.deleteStoryStat = function(idx) {
    syncStoryInputsFromDOM();
    currentStoryStats.splice(idx, 1);
    renderStoryCRUD();
};

window.uploadStoryBlockImage = async function(fileInput, idx) {
    if (!fileInput.files || fileInput.files.length === 0) return;
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
        showToast("⏳ Uploading photo...");
        const res = await fetch(`${API_BASE_URL}/admin/upload-image`, {
            method: "POST",
            headers: getHeaders(false),
            body: formData
        });
        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();

        const cardEl = fileInput.closest(".story-section-card");
        if (cardEl) {
            const pathInput = cardEl.querySelector(".story-image-input");
            if (pathInput) pathInput.value = data.path;
            const imgPreview = cardEl.querySelector(".story-img-preview");
            if (imgPreview) imgPreview.src = data.path;
        }

        if (currentStorySections[idx]) {
            currentStorySections[idx].image = data.path;
        }

        showToast("✨ Photo uploaded successfully!");
    } catch (e) {
        showToast("Could not upload image.", true);
    }
};

function syncStoryInputsFromDOM() {
    const secContainer = document.getElementById("story-sections-list-container");
    if (secContainer) {
        const cards = secContainer.querySelectorAll(".story-section-card");
        cards.forEach((cardEl, idx) => {
            if (currentStorySections[idx]) {
                currentStorySections[idx].badge = cardEl.querySelector(".story-badge-input")?.value.trim() || "";
                currentStorySections[idx].title = cardEl.querySelector(".story-title-input")?.value.trim() || "";
                currentStorySections[idx].image = cardEl.querySelector(".story-image-input")?.value.trim() || "";
                currentStorySections[idx].p1 = cardEl.querySelector(".story-p1-input")?.value.trim() || "";
                currentStorySections[idx].p2 = cardEl.querySelector(".story-p2-input")?.value.trim() || "";
            }
        });
    }

    const statContainer = document.getElementById("story-stats-list-container");
    if (statContainer) {
        const cards = statContainer.querySelectorAll(".story-stat-card");
        cards.forEach((cardEl, idx) => {
            if (currentStoryStats[idx]) {
                currentStoryStats[idx].number = cardEl.querySelector(".story-stat-num-input")?.value.trim() || "";
                currentStoryStats[idx].label = cardEl.querySelector(".story-stat-label-input")?.value.trim() || "";
            }
        });
    }
}

window.uploadBlogInnerImage = async function(fileInput, idx) {
    const file = fileInput.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const preview = fileInput.closest(".blog-article-card").querySelector(".blog-inner-img-preview");
    const input = fileInput.closest(".blog-article-card").querySelector(".blog-inner-img-input");
    try {
        preview.style.opacity = "0.5";
        const res = await fetch(`${API_BASE_URL}/admin/upload-image`, { method: "POST", headers: getHeaders(false), body: formData });
        const data = await res.json();
        if (res.ok && data.image_path) {
            const imgUrl = data.image_path;
            input.value = imgUrl;
            preview.src = imgUrl;
            showToast("Inner Image uploaded!");
            syncBlogInputsFromDOM();
        } else {
            throw new Error("Upload failed");
        }
    } catch (e) {
        showToast("Upload failed", true);
    } finally {
        preview.style.opacity = "1";
    }
};

window.uploadBlogArticleImage = async function(fileInput, idx) {
    const file = fileInput.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const preview = fileInput.closest(".blog-article-card").querySelector(".blog-img-preview");
    const input = fileInput.closest(".blog-article-card").querySelector(".blog-img-input");
    try {
        preview.style.opacity = "0.5";
        const res = await fetch(`${API_BASE_URL}/admin/upload-image`, { method: "POST", headers: getHeaders(false), body: formData });
        const data = await res.json();
        if (res.ok && data.image_path) {
            const imgUrl = data.image_path;
            input.value = imgUrl;
            preview.src = imgUrl;
            showToast("Cover Image uploaded!");
            syncBlogInputsFromDOM();
        } else {
            throw new Error("Upload failed");
        }
    } catch (e) {
        showToast("Upload failed", true);
    } finally {
        preview.style.opacity = "1";
    }
};


window.saveSiteSettingsToDB = async function() {
    try {
        const btn = document.querySelector("#form-footer-settings button[type='submit']");
        if(btn) btn.innerHTML = '<i data-lucide="loader" class="spin"></i> Saving...';
        
        // Let's reuse the existing settings form handler's logic by triggering it, or we can just fetch all current inputs
        const payload = {
            site_name: document.getElementById("setting-site-name")?.value?.trim() || "Sonrup",
            support_email: document.getElementById("setting-support-email")?.value?.trim() || "",
            support_phone: document.getElementById("setting-support-phone")?.value?.trim() || "",
            support_address: document.getElementById("setting-address")?.value?.trim() || "",
            fssai_number: document.getElementById("setting-fssai")?.value?.trim() || "",
            license_number: document.getElementById("setting-license")?.value?.trim() || "",
            announcement_banner_enabled: document.getElementById("setting-banner-enabled")?.value === "true",
            announcement_banner_text: document.getElementById("setting-banner-text")?.value?.trim() || "",
            razorpay_enabled: document.getElementById("setting-razorpay-enabled")?.value === "true",
            razorpay_key_id: document.getElementById("setting-razorpay-key-id")?.value?.trim(),
            razorpay_key_secret: document.getElementById("setting-razorpay-key-secret")?.value?.trim(),
            delhivery_enabled: document.getElementById("setting-delhivery-enabled") ? document.getElementById("setting-delhivery-enabled").value === "true" : false,
            delhivery_environment: document.getElementById("setting-delhivery-environment")?.value?.trim(),
            delhivery_api_token: document.getElementById("setting-delhivery-api-token")?.value?.trim(),
            delhivery_warehouse_name: document.getElementById("setting-delhivery-warehouse-name")?.value?.trim(),
            delhivery_warehouse_address: document.getElementById("setting-delhivery-warehouse-address")?.value?.trim(),
            delhivery_warehouse_city: document.getElementById("setting-delhivery-warehouse-city")?.value?.trim(),
            delhivery_warehouse_state: document.getElementById("setting-delhivery-warehouse-state")?.value?.trim(),
            delhivery_warehouse_pincode: document.getElementById("setting-delhivery-warehouse-pincode")?.value?.trim(),
            delhivery_warehouse_phone: document.getElementById("setting-delhivery-warehouse-phone")?.value?.trim(),
            footer_settings: {
                logo: document.getElementById("setting-footer-logo-input")?.value?.trim() || "",
                favicon: document.getElementById("setting-favicon-input")?.value?.trim() || "",
                desc: document.getElementById("setting-footer-desc")?.value?.trim() || "",
                facebook: document.getElementById("setting-social-facebook")?.value?.trim() || "",
                instagram: document.getElementById("setting-social-instagram")?.value?.trim() || "",
                twitter: document.getElementById("setting-social-twitter")?.value?.trim() || "",
                license: document.getElementById("setting-license")?.value?.trim() || "",
                fssai: document.getElementById("setting-fssai")?.value?.trim() || "",
                disclaimer: document.getElementById("setting-reg-disclaimer")?.value?.trim() || ""
            }
        };

        const res = await fetch(`${API_BASE_URL}/admin/settings`, {
            method: "PUT",
            headers: getHeaders(true),
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Could not save settings");
        
        showToast("🌟 Footer Settings successfully published!");
        localStorage.removeItem("sonrup_config");
        localStorage.removeItem("sonrup_config_time");
        if(btn) {
            btn.innerHTML = '<i data-lucide="check"></i> Saved';
            setTimeout(() => { btn.innerHTML = '<i data-lucide="save"></i> Save & Publish Footer Settings'; lucide.createIcons(); }, 2000);
        }
    } catch (err) {
        showToast("Failed to save footer settings.", true);
    }
};

window.uploadFooterLogo = async function(fileInput) {
    const file = fileInput.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const preview = document.getElementById("setting-footer-logo-preview");
    const input = document.getElementById("setting-footer-logo-input");
    try {
        if(preview) preview.style.opacity = "0.5";
        const res = await fetch(`${API_BASE_URL}/admin/upload-image`, { method: "POST", headers: getHeaders(false), body: formData });
        const data = await res.json();
        if (res.ok && data.image_path) {
            const imgUrl = data.image_path;
            if(input) input.value = imgUrl;
            if(preview) preview.src = imgUrl;
            showToast("Footer logo uploaded!");
        } else {
            throw new Error("Upload failed");
        }
    } catch (e) {
        showToast("Upload failed", true);
    } finally {
        if(preview) preview.style.opacity = "1";
    }
};

window.uploadFavicon = async function(fileInput) {
    const file = fileInput.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const preview = document.getElementById("setting-favicon-preview");
    const input = document.getElementById("setting-favicon-input");
    try {
        if(preview) preview.style.opacity = "0.5";
        const res = await fetch(`${API_BASE_URL}/admin/upload-image`, { method: "POST", headers: getHeaders(false), body: formData });
        const data = await res.json();
        if (res.ok && data.image_path) {
            const imgUrl = data.image_path;
            if(input) input.value = imgUrl;
            if(preview) preview.src = imgUrl;
            showToast("Favicon uploaded!");
        } else {
            throw new Error("Upload failed");
        }
    } catch (e) {
        showToast("Upload failed", true);
    } finally {
        if(preview) preview.style.opacity = "1";
    }
};


window.saveContactPageSettingsToDB = async function() {
    try {
        const btn = document.querySelector("#form-contact-page-settings button[type='submit']");
        if(btn) btn.innerHTML = '<i data-lucide="loader" class="spin"></i> Saving...';
        
        // We reuse the existing settings fetch to pull all settings, then PUT it back with updated contact_settings
        const getRes = await fetch(`${API_BASE_URL}/admin/settings?_t=${Date.now()}`, { headers: getHeaders() });
        const existingData = getRes.ok ? await getRes.json() : {};

        const payload = {
            ...existingData,
            contact_settings: {
                hq: document.getElementById("setting-contact-page-hq")?.value.trim(),
                lab: document.getElementById("setting-contact-page-lab")?.value.trim(),
                emails: document.getElementById("setting-contact-page-emails")?.value.trim(),
                phone: document.getElementById("setting-contact-page-phone")?.value.trim(),
                hours: document.getElementById("setting-contact-page-hours")?.value.trim()
            }
        };

        const res = await fetch(`${API_BASE_URL}/admin/settings`, {
            method: "PUT",
            headers: getHeaders(true),
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Could not save settings");
        
        showToast("🌟 Contact Page Settings successfully published!");
        if(btn) {
            btn.innerHTML = '<i data-lucide="check"></i> Saved';
            setTimeout(() => { btn.innerHTML = '<i data-lucide="save"></i> Save Contact Page Settings'; lucide.createIcons(); }, 2000);
        }
    } catch (err) {
        showToast("Failed to save contact settings.", true);
    }
};


window.saveShopSettingsToDB = async function() {
    try {
        const btn = document.querySelector("#form-shop-settings button[type='submit']");
        if(btn) btn.innerHTML = '<i data-lucide="loader" class="spin"></i> Saving...';
        
        const getRes = await fetch(`${API_BASE_URL}/admin/settings?_t=${Date.now()}`, { headers: getHeaders() });
        const existingData = getRes.ok ? await getRes.json() : {};

        const payload = {
            ...existingData,
            shop_settings: {
                heading: document.getElementById("setting-shop-heading")?.value.trim(),
                title: document.getElementById("setting-shop-title")?.value.trim(),
                desc: document.getElementById("setting-shop-desc")?.value.trim()
            }
        };

        const res = await fetch(`${API_BASE_URL}/admin/settings`, {
            method: "PUT",
            headers: getHeaders(true),
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Could not save settings");
        
        showToast("🌟 Shop Page Text successfully published!");
        if(btn) {
            btn.innerHTML = '<i data-lucide="check"></i> Saved';
            setTimeout(() => { btn.innerHTML = '<i data-lucide="save"></i> Save Shop Text'; lucide.createIcons(); }, 2000);
        }
    } catch (err) {
        showToast("Failed to save shop settings.", true);
    }
};

// --- Close Modals on Outside Click ---
document.addEventListener("click", (e) => {
    if (e.target.classList.contains("admin-modal")) {
        e.target.classList.remove("active");
    }
});
