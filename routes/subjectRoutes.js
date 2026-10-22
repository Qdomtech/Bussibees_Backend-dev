const express = require('express');
const router = express.Router();
const SubjectController = require('../controllers/subjectController');
const auth = require('../middleware/auth');
router.post('/Subject/create',auth, SubjectController.createSubject);
router.get('/Subject/all', SubjectController.getAllSubjects);
router.get('/Subject/filter', SubjectController.filterSubjectsByCategory);
router.get('/Subject/:id', SubjectController.getSubjectById);
router.put('/Subject/update/:id',auth, SubjectController.updateSubject);
router.delete('/Subject/delete/:id',auth, SubjectController.deleteSubject);



module.exports = router;
