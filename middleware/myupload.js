


const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads folder exists
const uploadPath = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  if (extname) cb(null, true);
  else cb(new Error('Invalid file type'));
};


const customUpload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 500
  },
  fileFilter
});


const myupload = (req, res, next) => {
  customUpload.any()(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: "File upload error", error: err.message });
    }
    

    if (req.files) {
      const organizedFiles = {};
      
      req.files.forEach(file => {
        
        const match = file.fieldname.match(/(\w+)\[(\d+)\]\[(\d+)\]/);
        
        if (match) {
          const fieldName = match[1]; 
          const topicIndex = parseInt(match[2]); 
          const questionIndex = parseInt(match[3]); 
          
          if (!organizedFiles[fieldName]) {
            organizedFiles[fieldName] = {};
          }
          
          if (!organizedFiles[fieldName][topicIndex]) {
            organizedFiles[fieldName][topicIndex] = {};
          }
          
          organizedFiles[fieldName][topicIndex][questionIndex] = file;
        } else {
         
          const simpleMatch = file.fieldname.match(/(\w+)\[(\d+)\]/);
          if (simpleMatch) {
            const fieldName = simpleMatch[1];
            const index = parseInt(simpleMatch[2]);
            
            if (!organizedFiles[fieldName]) {
              organizedFiles[fieldName] = {};
            }
            
            organizedFiles[fieldName][index] = file;
          } else {
           
            const baseFieldName = file.fieldname;
            if (!organizedFiles[baseFieldName]) {
              organizedFiles[baseFieldName] = [];
            }
            organizedFiles[baseFieldName].push(file);
          }
        }
      });
      
      req.files = organizedFiles;
    }
    
    next();
  });
};

module.exports = myupload;