const express = require('express');
const router = express.Router();
const { persistenceManager } = require('../modules/persist_module');
const { asyncWrapper } = require('../modules/error-handler');

router.get('/', asyncWrapper(async (req, res) => {
    const { search, category } = req.query;
    
    let products = await persistenceManager.getAllProducts();
    
    if (search) {
        products = await persistenceManager.searchProducts(search);
    }
    
    if (category) {
        products = await persistenceManager.getProductsByCategory(category);
    }
    
    res.json({
        success: true,
        data: products,
        message: `Found ${products.length} products`
    });
}));

router.get('/:id', asyncWrapper(async (req, res) => {
    const product = await persistenceManager.getProductById(req.params.id);
    
    res.json({
        success: true,
        data: product
    });
}));

router.post('/', asyncWrapper(async (req, res) => {
    const { title, description, price, category, image } = req.body;
    
    if (!title || !description || !price || !category) {
        return res.status(400).json({
            success: false,
            error: 'MISSING_REQUIRED_FIELDS',
            message: 'Missing required fields: title, description, price, category'
        });
    }
    
    const newProduct = await persistenceManager.createProduct({
        title,
        description,
        price: parseFloat(price),
        category,
        image: image || '/images/products/default.jpg'
    });
    
    res.status(201).json({
        success: true,
        data: newProduct,
        message: 'Product created successfully'
    });
}));

router.put('/:id', asyncWrapper(async (req, res) => {
    const { title, description, price, category, image, inStock } = req.body;
    
    const updatedProduct = await persistenceManager.updateProduct(req.params.id, {
        title,
        description,
        price: price ? parseFloat(price) : undefined,
        category,
        image,
        inStock
    });
    
    res.json({
        success: true,
        data: updatedProduct,
        message: 'Product updated successfully'
    });
}));

router.delete('/:id', asyncWrapper(async (req, res) => {
    await persistenceManager.deleteProduct(req.params.id);
    
    res.json({
        success: true,
        message: 'Product deleted successfully'
    });
}));

module.exports = router;