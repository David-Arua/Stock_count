document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    const user = window.AppAPI.getCurrentUser();

    if (!productId) {
        alert('Product not found');
        location.href = 'vendor.html';
        return;
    }

    function escapeHtml(str) {
        return String(str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    async function init() {
        const product = await window.AppAPI.getProduct(productId);
        if (!product) {
            alert('Product not found');
            location.href = 'vendor.html';
            return;
        }

        const farmer = await window.AppAPI.getUser(product.farmerId);

        // Handle different image types: server path, base64, or placeholder
        let imageSrc = 'https://via.placeholder.com/600x400?text=Product';
        if (product.image) {
            if (product.image.startsWith('/uploads/')) {
                imageSrc = `http://localhost:5000${product.image}`;
            } else if (product.image.startsWith('data:') || product.image.startsWith('http')) {
                imageSrc = product.image;
            }
        }

        // Render product details
        document.getElementById('productImage').src = imageSrc;
        document.getElementById('productImage').alt = escapeHtml(product.name);
        document.getElementById('productName').textContent = product.name;
        document.getElementById('productCategory').textContent = product.category;
        document.getElementById('productPrice').textContent = `$${Number(product.price).toFixed(2)} per ${product.unit}`;
        document.getElementById('productQuantity').textContent = `${product.quantity} ${product.unit} available`;
        document.getElementById('productLocation').textContent = `📍 ${product.location}`;
        document.getElementById('productDescription').textContent = product.description || 'No description available';

        // Render farmer info
        document.getElementById('farmerName').textContent = farmer?.name || 'Unknown Farmer';
        document.getElementById('farmerLocation').textContent = `Location: ${farmer?.location || 'Unknown'}`;
        document.getElementById('farmerContact').textContent = `Contact: ${farmer?.phone || 'N/A'}`;

        // Show request form only for logged-in vendors
        if (user && user.type === 'vendor') {
            document.getElementById('requestForm').style.display = 'block';
            document.getElementById('chatBtn').style.display = 'inline-block';
        }

        // Handle purchase request
        document.getElementById('purchaseForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!user || user.type !== 'vendor') {
                alert('Please login as a vendor to send requests');
                return;
            }

            const quantity = Number(document.getElementById('requestQuantity').value);
            const notes = document.getElementById('requestNotes').value;

            if (quantity > product.quantity) {
                alert(`Only ${product.quantity} ${product.unit} available`);
                return;
            }

            await window.AppAPI.addRequest({
                productId: product.id,
                farmerId: product.farmerId,
                vendorId: user.id,
                quantity,
                notes
            });

            alert('Purchase request sent successfully!');
            document.getElementById('purchaseForm').reset();
        });

        // Chat button
        document.getElementById('chatBtn')?.addEventListener('click', () => {
            location.href = `messages.html?chat=${product.farmerId}`;
        });

        // Render other products from same farmer
        const allProducts = await window.AppAPI.getProducts({ farmerId: product.farmerId });
        const otherProducts = (allProducts.items || allProducts)
            .filter(p => p.id !== productId)
            .slice(0, 4);
        
        const otherProductsDiv = document.getElementById('otherProducts');
        otherProductsDiv.innerHTML = otherProducts.map(p => {
            // Handle different image types
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
                    <a href="logistics.html?id=${p.id}" class="btn">View Details</a>
                </div>
            `;
        }).join('') || '<p>No other products from this farmer</p>';
    }

    init();
});
