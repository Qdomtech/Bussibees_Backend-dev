const express = require('express');
const router = express.Router();
const wishListController = require('../controllers/wishListController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
// Add courses to wishlist
router.post('/wishlist', auth, wishListController.saveToWishList);
router.get('/wishlist', auth, wishListController.getWishListByUser);
router.post('/ask/question',  wishListController.askAI);
router.delete('/wishlist/:courseId', auth, wishListController.removeFromWishList);
router.post('/upload-pdf',upload.single("file"),wishListController.extractFromPDF);

module.exports = router;
