document.addEventListener('DOMContentLoaded', () => {
    const user = window.AppAPI.getCurrentUser();
    if (!user || user.type !== 'farmer') {
        alert('Please login as a farmer');
        location.href = 'index.html';
        return;
    }

    document.getElementById('farmerName').textContent = user.name;
    document.getElementById('farmerLocation').textContent = user.location;

    const form = document.getElementById('productForm');
    const productList = document.getElementById('productList');
    const requestsTable = document.querySelector('#requestsTable tbody');
    const imageInput = document.getElementById('productImageFile');
    const imagePreview = document.getElementById('productImagePreview');

    function escapeHtml(str) {
        return String(str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    async function renderProducts() {
        try {
            const products = await window.AppAPI.getProducts({ farmerId: user.id });
            productList.innerHTML = products.items ? products.items.map(p => {
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
                        <p><strong>${p.quantity} ${escapeHtml(p.unit)}</strong> @ $${Number(p.price).toFixed(2)}/${escapeHtml(p.unit)}</p>
                        <p>${escapeHtml(p.description)}</p>
                        <button onclick="deleteProduct('${p.id}')">Delete</button>
                    </div>
                `;
            }).join('') : '<p>No products yet. Add your first product above.</p>';
        } catch (error) {
            console.error('Error loading products:', error);
            productList.innerHTML = '<p>Error loading products. Please refresh the page.</p>';
        }
    }

    async function renderRequests() {
        const requests = await window.AppAPI.getRequests({ farmerId: user.id });
        const rows = await Promise.all(requests.map(async (r) => {
            const vendor = await window.AppAPI.getUser(r.vendorId);
            const product = await window.AppAPI.getProduct(r.productId);
            const date = new Date(r.timestamp).toLocaleDateString();
            return `
                <tr>
                    <td>${escapeHtml(vendor?.name || 'Unknown')}</td>
                    <td>${escapeHtml(product?.name || 'Product')}</td>
                    <td>${r.quantity} ${escapeHtml(product?.unit || '')}</td>
                    <td><span class="status ${r.status}">${r.status}</span></td>
                    <td>${date}</td>
                    <td>
                        ${r.status === 'pending' ? `
                            <button onclick="updateStatus('${r.id}', 'approved')">Approve</button>
                            <button onclick="updateStatus('${r.id}', 'declined')">Decline</button>
                        ` : r.status === 'approved' ? `
                            <button onclick="updateStatus('${r.id}', 'in-transit')">Mark In Transit</button>
                        ` : r.status === 'in-transit' ? `
                            <button onclick="updateStatus('${r.id}', 'completed')">Mark Completed</button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }));
        requestsTable.innerHTML = rows.join('') || '<tr><td colspan="6">No requests yet</td></tr>';
    }

    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    imageInput?.addEventListener('change', async () => {
        const file = imageInput.files?.[0];
        if (!file) {
            imagePreview.style.display = 'none';
            imagePreview.src = '';
            return;
        }
        // Simple size guard: 2MB max to avoid huge localStorage entries
        if (file.size > 2 * 1024 * 1024) {
            alert('Image too large. Please choose a file under 2MB.');
            imageInput.value = '';
            return;
        }
        const dataUrl = await readFileAsDataURL(file);
        imagePreview.src = dataUrl;
        imagePreview.style.display = 'block';
        imagePreview.dataset.imageDataUrl = dataUrl;
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const file = imageInput?.files?.[0];
            
            if (file) {
                // Use file upload endpoint
                const formData = new FormData();
                formData.append('image', file);
                formData.append('farmerId', user.id);
                formData.append('name', document.getElementById('productName').value);
                formData.append('category', document.getElementById('productCategory').value);
                formData.append('quantity', document.getElementById('productQuantity').value);
                formData.append('unit', document.getElementById('productUnit').value);
                formData.append('price', document.getElementById('productPrice').value);
                formData.append('location', document.getElementById('productLocation').value);
                formData.append('description', document.getElementById('productDescription').value);
                
                await window.AppAPI.addProductWithFile(formData);
            } else {
                // Use regular JSON endpoint with base64 image or placeholder
                const dataUrl = imagePreview?.dataset?.imageDataUrl;
                await window.AppAPI.addProduct({
                    farmerId: user.id,
                    name: document.getElementById('productName').value,
                    category: document.getElementById('productCategory').value,
                    quantity: Number(document.getElementById('productQuantity').value),
                    unit: document.getElementById('productUnit').value,
                    price: Number(document.getElementById('productPrice').value),
                    location: document.getElementById('productLocation').value,
                    description: document.getElementById('productDescription').value,
                    image: dataUrl || 'https://via.placeholder.com/300x200?text=Product'
                });
            }
            
            form.reset();
            imagePreview.style.display = 'none';
            imagePreview.src = '';
            delete imagePreview.dataset.imageDataUrl;
            alert('Product added successfully!');
            await renderProducts();
        } catch (error) {
            console.error('Error adding product:', error);
            alert('Failed to add product: ' + error.message);
        }
    });

    window.deleteProduct = async (id) => {
        if (confirm('Delete this product?')) {
            try {
                await window.AppAPI.deleteProduct(id);
                alert('Product deleted successfully!');
                await renderProducts();
            } catch (error) {
                console.error('Error deleting product:', error);
                alert('Failed to delete product: ' + error.message);
            }
        }
    };

    window.updateStatus = async (id, status) => {
        try {
            await window.AppAPI.updateRequestStatus(id, status);
            alert('Status updated successfully!');
            await renderRequests();
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status: ' + error.message);
        }
    };

    (async () => {
        await renderProducts();
        await renderRequests();
    })();
});
