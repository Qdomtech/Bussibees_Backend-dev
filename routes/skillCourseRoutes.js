const express = require('express');
const router = express.Router();
const SkillController = require('../controllers/skillCourseController');
const auth = require('../middleware/auth');
const upload = require('../middleware/uploadS3');

router.post(
  "/SkillCourse/Course",
  auth,
   upload.any(),  
  SkillController.createSkillCourse
);

router.get("/SkillCourse/Course", SkillController.SkillCourses);
router.get("/SkillCourse/Course/:id", SkillController.getSkillCourseById);
router.get("/SkillCourse/UserById/:id", SkillController.UserSkillCourseById);
router.delete("/SkillCourse/Course/:id", SkillController.deleteSkillCourse);
router.put("/SkillCourse/Update/:id", auth,upload.any(),SkillController.updateSkillCourse);


router.post("/SkillCourse/submitSkillCourseAnswer", auth,SkillController.submitSkillCourseAnswer);
router.post("/SkillCourse/calculateSkillResult", auth,SkillController.calculateSkillCourseResult);
router.get("/SkillCourse/SkillCourseResult", auth,SkillController.SkillCourseResult);
router.get("/SkillCourse/LatestSkillResult", auth,SkillController.LatestSkillResult);
router.get("/SkillCourse/AssessmentQuestions", auth,SkillController.AssessmentQuestions);

router.post("/referral", SkillController.createOrUpdateReferral);
router.get("/referral", SkillController.getAllReferrals);

router.get("/SkillCourse/Certificate", auth,SkillController.UsersCertificate);

module.exports = router;
