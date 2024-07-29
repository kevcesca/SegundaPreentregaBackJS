const socket = io();

socket.on('updateProducts', (product) => {
    const productList = document.getElementById('product-list');
    if (product.deleted) {
        const itemToRemove = document.querySelector(`#product-${product.id}`);
        if (itemToRemove) {
            productList.removeChild(itemToRemove);
        }
    } else {
        const newProduct = document.createElement('li');
        newProduct.id = `product-${product.id}`;
        newProduct.className = 'list-group-item d-flex justify-content-between align-items-center';
        newProduct.innerHTML = `<span>${product.title} - ${product.description} - $${product.price}</span> <button class="btn btn-danger btn-sm" onclick="deleteProduct(${product.id})">Eliminar</button>`;
        productList.appendChild(newProduct);
    }
});

document.getElementById('addProductForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const price = document.getElementById('price').value;
    const code = document.getElementById('code').value;
    const stock = document.getElementById('stock').value;
    const category = document.getElementById('category').value;

    fetch('/api/products', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            title,
            description,
            price,
            code,
            stock,
            category
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Producto agregado:', data);
    })
    .catch((error) => {
        console.error('Error:', error);
    });
});

function deleteProduct(id) {
    fetch(`/api/products/${id}`, {
        method: 'DELETE',
    })
    .then(response => response.json())
    .then(data => {
        console.log('Producto eliminado:', data);
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}
