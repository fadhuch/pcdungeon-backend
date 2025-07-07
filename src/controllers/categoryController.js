const categoryService = require('../services/categoryService');

exports.createCategory = async (req, res, next) => {
    try {
        const category = await categoryService.createCategory(req.body);
        res.status(201).json(category);
    } catch (err) {
        next(err);
    }
};

exports.getCategories = async (req, res, next) => {
    try {
        const categories = await categoryService.getCategories();
        res.json(categories);
    } catch (err) {
        next(err);
    }
};

exports.getCategoryById = async (req, res, next) => {
    try {
        const category = await categoryService.getCategoryById(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });
        res.json(category);
    } catch (err) {
        next(err);
    }
};

exports.updateCategory = async (req, res, next) => {
    try {
        const category = await categoryService.updateCategory(req.params.id, req.body);
        if (!category) return res.status(404).json({ message: 'Category not found' });
        res.json(category);
    } catch (err) {
        next(err);
    }
};

exports.deleteCategory = async (req, res, next) => {
    try {
        const category = await categoryService.deleteCategory(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });
        res.json({ message: 'Category deleted' });
    } catch (err) {
        next(err);
    }
};
