const multer = require('multer');
const path = require('path');
const fs = require('fs');
const uploadPath = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  if (extname) cb(null, true);
  else cb(new Error('Invalid file type'));
};

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 500                  
  },
  fileFilter
});


module.exports = upload;
