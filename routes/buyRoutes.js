const express = require('express');
const router = express.Router();
const BuyController = require('../controllers/buyController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/buy',auth, BuyController.createBuy);
router.post('/buy/phonepe-status/:orderId', BuyController.phonepeStatus);

router.get('/buy', auth, BuyController.getBuysByUser);
router.get('/refercount', auth, BuyController.getReferCount );
router.get('/my-courses', auth,BuyController.getPurchasedCourses);
router.get("/buy/check-status/:orderId", BuyController.checkPaymentStatus);

router.get('/courseNames', auth,BuyController.CourseNames);
router.get('/buyCourseId/:id', auth, BuyController.courseById);
router.get('/courseByIdComplimentary/:id', auth, BuyController.courseByIdComplimentary);
router.get('/allData/:testSeriesId',auth, BuyController.History);

router.get("/get-user-details", auth, BuyController.getUserDetailsByRefer)

router.post('/ocr', upload.single('image'),  BuyController.ocrFromPdf);

module.exports = router;

