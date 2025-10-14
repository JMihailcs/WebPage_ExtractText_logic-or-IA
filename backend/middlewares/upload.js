// middlewares/upload.js
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e9)}_${uuidv4()}`;
    cb(null, `${file.fieldname}_${uniqueSuffix}${ext}`);
  }
});

export const upload = multer({ storage });
