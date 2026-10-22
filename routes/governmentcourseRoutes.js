const express = require('express');
const router = express.Router();
const governmentController = require('../controllers/governmentController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const myupload = require('../middleware/myupload');

// router.post(
//   '/governmentCourse',
//   auth,
//   upload.fields([
//     { name: 'courseImages', maxCount: 1 },
//     { name: 'ebookFile', maxCount: 1 },
//     { name: 'studyNoteFile', maxCount: 10 },
    
//   ]),
//   governmentController.createGovernmentCourse
// );


router.post(
  "/governmentCourse",
auth,
myupload,
  governmentController.createGovernmentCourse
);


router.post('/addquiz', auth, governmentController.addQuizToTopic);

router.get('/governmentcourses', governmentController.getGovernmentCourses);
router.get('/GovernmentCourseById/:id', governmentController.GovernmentCourseById);
router.put('/CourseStatus/:id',auth, governmentController.updateCourseStatus);
router.put(
  '/governmentCourse/:id',
  auth,
  upload.fields([
    { name: 'courseImages', maxCount: 1 },
    { name: 'ebookFile', maxCount: 20 },
     { name: 'studyNoteFile', maxCount: 20 }
  ]),
  governmentController.updateGovernmentCourse
);
router.delete(
  '/governmentCourse/:id',
  auth,
  governmentController.deleteGovernmentCourse
);

router.get('/filterGovernment', governmentController.filterGovernmentCourses);
router.get('/getCategory', governmentController.getCategory);
router.put('/saveUserCategory', governmentController.saveUserCategory);
router.get('/dashboardfilter',auth, governmentController.dashboardfiltercourse);
router.post('/coursePercentages/:id',governmentController.saveCoursePercentages);
router.get('/complimentary', auth, governmentController.complimentaryCourses);
router.post('/submitGovCourseAnswer', auth,governmentController.submitGovCourseAnswer);
router.post('/calculateAllGovTestResult', auth, governmentController.calculateGovCourseResult);
router.get('/gov-course-result', auth, governmentController.getGovCourseResult);
router.get('/getLatestResult', auth, governmentController.getLatestResult);
router.get('/getTestQuestions', auth, governmentController.getTestQuestions);

router.get(
  "/answers-with-result",
  auth,
  governmentController.getGovCourseAnswersWithResult
);


module.exports = router;
