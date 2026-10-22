const express = require('express');
const router = express.Router();
const examtypeController = require('../controllers/examTypeController');
const auth = require('../middleware/auth');

router.post('/examType',auth,examtypeController.createExamtype);
router.get('/examType',examtypeController.getExamType);
router.delete('/examType/:id',auth,examtypeController.deleteExamType);
router.put('/examType/:id',auth,examtypeController.updateExamType);
module.exports = router;
