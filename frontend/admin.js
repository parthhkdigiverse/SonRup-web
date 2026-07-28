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
            if (config.backend_port) {
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

    // 3. Authenticate & Verify Admin Status
    const token = localStorage.getItem("sonrup_token") || localStorage.getItem("access_token") || localStorage.getItem("auth_token") || localStorage.getItem("token");
    if (!token) {
        showAdminLoginScreen();
        setupEventListeners();
        return;
    }

    await initDashboard();
    setupEventListeners();
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
 * Toast Notification Popup
 */
function showToast(message, isError = false) {
    const toast = document.getElementById("admin-toast");
    const icon = document.getElementById("toast-icon");
    const msg = document.getElementById("toast-msg");

    msg.textContent = message;
    toast.style.borderLeftColor = isError ? "#ef4444" : "#C9A227";
    toast.classList.add("show");

    if (window.lucide) {
        window.lucide.createIcons();
    }

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3800);
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
        loadUsers()
    ]);
    showToast("✅ Admin Dashboard fully synchronized.");
}

window.refreshAdminData = initDashboard;


/**
 * 1. DASHBOARD METRICS
 */
async function loadStats() {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/stats`, { headers: getHeaders() });
        if (res.status === 401 || res.status === 403) {
            showAdminLoginScreen("❌ Session expired or unauthorized. Please authenticate with Admin credentials.");
            return false;
        }
        if (!res.ok) throw new Error("Failed to pull platform metrics");

        const data = await res.json();
        document.getElementById("kpi-revenue").textContent = `₹${data.revenue.toLocaleString('en-IN')}`;
        document.getElementById("kpi-orders").textContent = data.orders_count;
        document.getElementById("kpi-products").textContent = data.products_count;
        document.getElementById("kpi-users").textContent = data.users_count;
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
    document.getElementById("prod-tag-class").value = prod.tag_class || "tag-shilajit";
    document.getElementById("prod-description").value = prod.description || "";
    const variantLines = (prod.variants || []).map(v => `${v.name} - ${v.price}`).join("\n");
    document.getElementById("prod-variants").value = variantLines;
    document.getElementById("prod-benefits").value = (prod.benefits || []).join("\n");
    document.getElementById("prod-image-path").value = (prod.images && prod.images[0]) ? prod.images[0] : "assets/images/hero-combo.jpg";
    document.getElementById("prod-image-file").value = "";

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
            const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString() : "Today";
            const itemsText = (order.items || []).map(i => `${i.quantity}x ${i.name}`).join("<br>");
            const status = order.status || "Processing";

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>
                    <span style="font-weight: 800; color: #E5C365; font-size: 15px;">#${order.order_id || 'SR001'}</span>
                    <div style="color: #94a3b8; font-size: 12px; margin-top: 4px;">📅 ${orderDate}</div>
                </td>
                <td>
                    <div style="font-weight: 700; color: #fff;">${order.shipping_name || 'Valued Customer'}</div>
                    <div style="color: #cbd5e1; font-size: 12px;">📞 ${order.phone || 'N/A'}</div>
                    <div style="color: #94a3b8; font-size: 12px; max-width: 240px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">📍 ${order.address || 'India'}, ${order.pincode || ''}</div>
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
        const res = await fetch(`${API_BASE_URL}/admin/settings`, { headers: getHeaders() });
        if (!res.ok) throw new Error("Could not fetch general website settings");
        const data = await res.json();

        document.getElementById("setting-site-name").value = data.site_name || "Sonrup";
        document.getElementById("setting-support-email").value = data.support_email || "info@sonrup.com";
        document.getElementById("setting-support-phone").value = data.support_phone || "+91 76001 75193";
        document.getElementById("setting-fssai").value = data.fssai_number || "10726997000544";
        document.getElementById("setting-address").value = data.support_address || "A 584 Sitaram Society, Punagam Road, Surat-395010";
        document.getElementById("setting-license").value = data.license_number || "GA/646-A";
        document.getElementById("setting-banner-enabled").value = data.announcement_banner_enabled ? "true" : "false";
        document.getElementById("setting-banner-text").value = data.announcement_banner_text || "";
    } catch (e) {
        console.error("Error loading settings:", e);
    }
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
        tbody.innerHTML = "";

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
    }
}

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
 * Event Listeners & Interactive Modals Setup
 */
function setupEventListeners() {
    // Sidebar Tabs
    const tabs = document.querySelectorAll(".sidebar-tab");
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            const targetId = tab.getAttribute("data-target");
            document.querySelectorAll(".admin-section").forEach(sec => sec.classList.remove("active"));
            document.getElementById(targetId).classList.add("active");
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
            document.getElementById("prod-image-path").value = "assets/images/hero-combo.jpg";
            document.getElementById("product-modal").classList.add("active");
        });
    }

    // Modal Close Buttons
    const closeModal = () => document.getElementById("product-modal").classList.remove("active");
    document.getElementById("modal-close-btn")?.addEventListener("click", closeModal);
    document.getElementById("modal-cancel-btn")?.addEventListener("click", closeModal);

    // Product Form Submit Handler (Create & Edit)
    document.getElementById("product-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const originalSlug = document.getElementById("prod-original-slug").value;
        const isEdit = !!originalSlug;

        let imagePath = document.getElementById("prod-image-path").value.trim();
        const fileInput = document.getElementById("prod-image-file");

        // Handle File Upload if provided
        if (fileInput && fileInput.files && fileInput.files[0]) {
            showToast("Uploading product photo...");
            const formData = new FormData();
            formData.append("file", fileInput.files[0]);
            try {
                const uploadRes = await fetch(`${API_BASE_URL}/admin/upload-image`, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${localStorage.getItem("sonrup_token") || localStorage.getItem("access_token") || localStorage.getItem("auth_token") || localStorage.getItem("token")}` },
                    body: formData
                });
                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    imagePath = uploadData.image_path;
                } else {
                    showToast("Warning: Image upload failed, defaulting to provided path.", true);
                }
            } catch (err) {
                console.error("Image upload error:", err);
            }
        }

        const benefitsText = document.getElementById("prod-benefits").value.trim();
        const benefitsArray = benefitsText ? benefitsText.split("\n").map(line => line.trim()).filter(Boolean) : [];

        // Parse Variants Textarea
        const variantsText = (document.getElementById("prod-variants")?.value || "").trim();
        const variantsArray = [];
        if (variantsText) {
            variantsText.split("\n").forEach(line => {
                const parts = line.split(/[-:]/);
                if (parts.length >= 2) {
                    const vName = parts[0].trim();
                    const vPrice = parseInt(parts[1].trim()) || 0;
                    if (vName && vPrice > 0) {
                        variantsArray.push({ name: vName, price: vPrice, sku: "", in_stock: true });
                    }
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
            variants: variantsArray,
            images: [imagePath],
            tag_class: document.getElementById("prod-tag-class").value,
            product_type: "single"
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
            fssai_number: document.getElementById("setting-fssai").value.trim(),
            license_number: document.getElementById("setting-license").value.trim(),
            announcement_banner_enabled: document.getElementById("setting-banner-enabled").value === "true",
            announcement_banner_text: document.getElementById("setting-banner-text").value.trim()
        };

        try {
            const res = await fetch(`${API_BASE_URL}/admin/settings`, {
                method: "PUT",
                headers: getHeaders(true),
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error("Could not save settings");

            showToast("🌟 Website Configuration successfully published across the live site!");
        } catch (err) {
            showToast("Failed to save website settings.", true);
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
