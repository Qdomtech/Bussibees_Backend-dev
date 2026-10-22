const express = require('express');
const router = express.Router();
const BundleController = require('../controllers/BundleController');
const auth = require('../middleware/auth');
const upload = require('../middleware/uploadS3');

router.post(
  "/BundleCreate",auth,
  upload.any(),BundleController.createSkillBundle
);

router.put(
  "/updateBundle/:id",
  auth,
  upload.single("BundleImages"),
  BundleController.updateSkillBundle
);



router.get("/SkillBundle", BundleController.getAllSkillBundles);

router.get("/SkillBundle/MyPurchasedBundle", auth, BundleController.MyPurchasedBundle);
router.get("/SkillBundle/MyPurchasedBundle/:id", auth, BundleController.MyPurchasedBundleById);
router.get(
  "/SkillBundle/my-payment-history",
  auth,
  BundleController.getUserPaymentHistory
);
router.post("/SkillBundle/MarkedAsRead", auth, BundleController.MarkContentAsRead);

router.post(
  "/phonepe/webhook1",
  express.json({ type: "*/*" }),
 BundleController.phonePeWebhook
);


router.get("/PaymentSuccess/:merchantOrderId",BundleController.checkPaymentStatus);



router.get("/SkillBundle/my-referrer-details", auth, BundleController.getMyReferrerDetails);
router.get("/SkillBundle/referrer-details", auth, BundleController.MyReferrerDetails);
router.get("/SkillBundle/my-Skillwallet", auth, BundleController.getMySkillWallet);
router.get("/SkillBundle/my-payment-history",auth,BundleController.getUserPaymentHistory);
router.get("/UserBundles",auth, BundleController.UserBundles);
router.get("/UserBundles/:id",auth, BundleController.UserBundlesBuId);
router.get("/SkillBundle/:id", BundleController.SingleSkillBundle);
router.delete("/SkillBundle/:id", BundleController.deleteSkillBundle);

router.post("/SkillBundle/buyBundlePayment", auth, BundleController.buyBundlePayment);



module.exports = router;
