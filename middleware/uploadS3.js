const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const s3 = require("../config/s3");

// const upload = multer({
//   storage: multerS3({
//     s3: s3,
//     bucket: process.env.AWS_S3_BUCKET_NAME,
//     contentType: multerS3.AUTO_CONTENT_TYPE,
//     // acl: "private",
//     key: function (req, file, cb) {
//       cb(
//         null,
//         `SkillcourseImages/${req.user.id}-${Date.now()}${path.extname(file.originalname)}`
//       );
//     },
//   }),
// });



const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      cb(
        null,
        `SkillImages/${req.user.id}-${Date.now()}${path.extname(file.originalname)}`
      );
    },
  }),
});

module.exports = upload;


