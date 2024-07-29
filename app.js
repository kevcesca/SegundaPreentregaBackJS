const express = require('express');
const fs = require('fs');
const { Server } = require("socket.io");
const http = require('http');
const exphbs = require('express-handlebars').create({});
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = 8080;

const pathProductos = './data/productos.json';
const pathCarrito = './data/carrito.json';

app.use(express.json()); // Middleware para parsear el cuerpo de las solicitudes como JSON

// Configurar Handlebars
app.engine('handlebars', exphbs.engine);
app.set('view engine', 'handlebars');
app.set('views', './views');

// Función para leer productos desde el archivo
const leerProductos = () => {
    const data = fs.readFileSync(pathProductos);
    return JSON.parse(data);
};

// Función para escribir productos en el archivo
const escribirProductos = (products) => {
    fs.writeFileSync(pathProductos, JSON.stringify(products, null, 2));
};

// Función para leer carritos desde el archivo
const leerCarrito = () => {
    const data = fs.readFileSync(pathCarrito);
    return JSON.parse(data);
};

// Función para escribir carritos en el archivo
const escribirCarrito = (carts) => {
    fs.writeFileSync(pathCarrito, JSON.stringify(carts, null, 2));
};

// Ruta raíz - Mostrar productos sin tiempo real
app.get('/', (req, res) => {
    const products = leerProductos();
    res.render('index', { title: 'Lista de Productos', products });
});

// Implementar routers
const productsRouter = express.Router();
const cartsRouter = express.Router();

// Rutas para productos
productsRouter.get('/', (req, res) => {
    const products = leerProductos();
    res.json(products);
});

productsRouter.get('/:pid', (req, res) => {
    const products = leerProductos();
    const product = products.find(p => p.id == req.params.pid);
    if (product) {
        res.json(product);
    } else {
        res.status(404).send('Product not found');
    }
});

productsRouter.post('/', (req, res) => {
    const { title, description, code, price, stock, category } = req.body;

    if (!title || !description || !code || !price || stock === undefined || !category) {
        return res.status(400).send('Todos los campos son obligatorios');
    }

    const products = leerProductos();
    const newProduct = {
        id: products.length ? products[products.length - 1].id + 1 : 1,
        title,
        description,
        code,
        price,
        stock,
        category,
        thumbnails: req.body.thumbnails || [],
        status: req.body.status !== undefined ? req.body.status : true
    };
    products.push(newProduct);
    escribirProductos(products);
    res.status(201).json(newProduct);
    io.emit('updateProducts', newProduct); // Emitir evento de WebSocket
});

productsRouter.put('/:pid', (req, res) => {
    const products = leerProductos();
    const index = products.findIndex(p => p.id == req.params.pid);
    if (index !== -1) {
        const updatedProduct = { ...products[index], ...req.body };
        updatedProduct.id = products[index].id;
        products[index] = updatedProduct;
        escribirProductos(products);
        res.json(updatedProduct);
    } else {
        res.status(404).send('Product not found');
    }
});

productsRouter.delete('/:pid', (req, res) => {
    const products = leerProductos();
    const index = products.findIndex(p => p.id == req.params.pid);
    if (index !== -1) {
        const deletedProduct = products.splice(index, 1);
        escribirProductos(products);
        res.json(deletedProduct);
        io.emit('updateProducts', { id: req.params.pid, deleted: true }); // Emitir evento de WebSocket
    } else {
        res.status(404).send('Product not found');
    }
});

// Rutas para carritos
cartsRouter.get('/:cid', (req, res) => {
    const carts = leerCarrito();
    const cart = carts.find(c => c.id == req.params.cid);
    if (cart) {
        res.json(cart.products);
    } else {
        res.status(404).send('Cart not found');
    }
});

cartsRouter.post('/', (req, res) => {
    const carts = leerCarrito();
    const newCart = { id: carts.length ? carts[carts.length - 1].id + 1 : 1, products: req.body.products || [] };
    carts.push(newCart);
    escribirCarrito(carts);
    res.status(201).json(newCart);
});

cartsRouter.post('/:cid/product/:pid', (req, res) => {
    const carts = leerCarrito();
    const cart = carts.find(c => c.id == req.params.cid);
    if (!cart) {
        return res.status(404).send('Cart not found');
    }

    const products = leerProductos();
    const product = products.find(p => p.id == req.params.pid);
    if (!product) {
        return res.status(404).send('Product not found');
    }

    const productIndex = cart.products.findIndex(p => p.id == product.id);
    if (productIndex !== -1) {
        cart.products[productIndex].quantity += req.body.quantity || 1;
    } else {
        cart.products.push({ id: product.id, quantity: req.body.quantity || 1 });
    }

    escribirCarrito(carts);
    res.json(cart);
});

// Usar los routers
app.use('/api/products', productsRouter);
app.use('/api/carts', cartsRouter);

// Ruta para la vista en tiempo real
app.get('/realtimeproducts', (req, res) => {
    const products = leerProductos();
    res.render('realTimeProducts', { title: 'Productos en Tiempo Real', products });
});

// Manejo de archivos y levantar el servidor
if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data');
}

if (!fs.existsSync(pathProductos)) {
    fs.writeFileSync(pathProductos, JSON.stringify([]));
}

if (!fs.existsSync(pathCarrito)) {
    fs.writeFileSync(pathCarrito, JSON.stringify([]));
}

server.listen(port, () => {
    console.log(`Servidor inicializado en http://localhost:${port}/`);
});

// Manejar conexiones WebSocket
io.on('connection', (socket) => {
    console.log('Cliente conectado');
    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});
