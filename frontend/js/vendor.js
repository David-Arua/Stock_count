document.addEventListener('DOMContentLoaded', () => {
    const user = window.AppAPI.getCurrentUser();
    if (!user || user.type !== 'vendor') {
        alert('Please login as a vendor');
        location.href = 'index.html';
        return;
    }

    document.getElementById('vendorName').textContent = user.name;
    document.getElementById('vendorLocation').textContent = user.location;

    const productCatalogue = document.getElementById('productCatalogue');
    const requestsTable = document.querySelector('#requestsTable tbody');
    const searchInput = document.getElementById('searchInput');

    function escapeHtml(str) {
        return String(str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    async function renderProducts(filters = {}) {
        const result = await window.AppAPI.getProducts(filters);
        const products = result.items || result;
        const cards = await Promise.all(products.map(async (p) => {
            const farmer = await window.AppAPI.getUser(p.farmerId);
            // Handle different image types: server path, base64, or placeholder
            let imageSrc = 'https://via.placeholder.com/300x200?text=Product';
            if (p.image) {
                if (p.image.startsWith('/uploads/')) {
                    imageSrc = `http://localhost:5000${p.image}`;
                } else if (p.image.startsWith('data:') || p.image.startsWith('http')) {
                    imageSrc = p.image;
                }
            }
            return `
                <div class="product-card">
                    <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(p.name)}">
                    <h3>${escapeHtml(p.name)}</h3>
                    <p class="category">${escapeHtml(p.category)}</p>
                    <p><strong>$${Number(p.price).toFixed(2)}</strong> per ${escapeHtml(p.unit)}</p>
                    <p>${p.quantity} ${escapeHtml(p.unit)} available</p>
                    <p class="location">📍 ${escapeHtml(p.location)}</p>
                    <p class="farmer">👨‍🌾 ${escapeHtml(farmer?.name || 'Unknown')}</p>
                    <a href="logistics.html?id=${p.id}" class="btn">View Details</a>
                </div>
            `;
        }));
        productCatalogue.innerHTML = cards.join('') || '<p>No products found. Try a different search.</p>';
    }

    async function renderRequests() {
        const requests = await window.AppAPI.getRequests({ vendorId: user.id });
        const rows = await Promise.all(requests.map(async (r) => {
            const product = await window.AppAPI.getProduct(r.productId);
            const farmer = await window.AppAPI.getUser(r.farmerId);
            const date = new Date(r.timestamp).toLocaleDateString();
            const total = (product?.price || 0) * r.quantity;
            return `
                <tr>
                    <td>${escapeHtml(product?.name || 'Product')}</td>
                    <td>${escapeHtml(farmer?.name || 'Unknown')}</td>
                    <td>${r.quantity} ${escapeHtml(product?.unit || '')}</td>
                    <td>$${total.toFixed(2)}</td>
                    <td><span class="status ${r.status}">${r.status}</span></td>
                    <td>${date}</td>
                    <td>
                        <a href="messages.html?chat=${r.farmerId}" class="btn small">Chat</a>
                    </td>
                </tr>
            `;
        }));
        requestsTable.innerHTML = rows.join('') || '<tr><td colspan="7">No requests yet</td></tr>';
    }

    window.searchProducts = async () => {
        const search = searchInput.value.trim();
        await renderProducts(search ? { search } : {});
    };

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') window.searchProducts();
    });

    (async () => {
        await renderProducts();
        await renderRequests();
    })();
});
