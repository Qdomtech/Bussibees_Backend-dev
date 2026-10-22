const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const schduletestController = require('../controllers/schduletestController');
const myupload = require('../middleware/myupload');


router.post("/createTest",auth,myupload,schduletestController.createTest);
router.put('/publisTest/:id',auth, schduletestController.publiSchduletest);
router.get('/getschduleTest', schduletestController.getschduleTest);
router.get('/getschduleTest/:id', schduletestController.getschduleTest);
router.delete('/getschduleTest/:id', schduletestController.deleteScheduleTest);
router.get('/UserScheduleTests',auth, schduletestController.UserScheduleTests);
router.get('/usercompletdtest',auth, schduletestController.userStatuscompletd);



router.post("/buyTest", auth,schduletestController.buyScheduleTest);
router.get("/test/phonepe-status/:orderId", schduletestController.phonepeStatusTest);
router.get("/test/check-payment-status/:orderId", schduletestController.checkPaymentStatusTest);
module.exports = router;