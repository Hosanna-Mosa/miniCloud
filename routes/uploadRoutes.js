const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
]);

// Sanitize and validate the requested folder name to prevent traversal and unsafe chars.
function sanitizeFolderName(input) {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  // Allow only letters, numbers, underscore, and hyphen.
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return null;
  }

  // Extra guard against traversal patterns.
  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
    return null;
  }

  return trimmed;
}

// Sanitize filename to avoid traversal and illegal path characters.
function sanitizeFileName(input) {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  // Keep names safe and predictable for disk access.
  if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
    return null;
  }

  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
    return null;
  }

  return trimmed;
}

function getSafeUploadPath(folder) {
  const baseUploadsPath = path.resolve(__dirname, '..', 'uploads');
  const targetPath = path.resolve(baseUploadsPath, folder);

  // Ensure the resolved path is still under /uploads.
  if (!targetPath.startsWith(baseUploadsPath + path.sep) && targetPath !== baseUploadsPath) {
    throw new Error('Invalid folder path');
  }

  return targetPath;
}

function getBaseUrl(req) {
  return (process.env.BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

function buildPublicFileUrl(req, folder, filename) {
  return `${getBaseUrl(req)}/uploads/${folder}/${filename}`;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const safeFolder = sanitizeFolderName(req.body.folder);
      if (!safeFolder) {
        const err = new Error('Invalid folder name. Use only letters, numbers, _ and -.');
        err.statusCode = 400;
        return cb(err);
      }

      const uploadPath = getSafeUploadPath(safeFolder);

      // Auto-create folder recursively if it does not exist.
      fs.mkdirSync(uploadPath, { recursive: true });

      req.safeFolder = safeFolder;
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  const isAllowedExt = ALLOWED_EXTENSIONS.has(ext);
  const isAllowedMime = ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase());

  if (!isAllowedExt || !isAllowedMime) {
    const err = new Error('Only image files (jpg, jpeg, png, webp) are allowed.');
    err.statusCode = 400;
    return cb(err);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max per file
  }
});

router.post('/upload', (req, res, next) => {
  upload.array('images[]')(req, res, (err) => {
    if (err) {
      // Normalize Multer errors into API-friendly messages.
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          err.statusCode = 400;
          err.message = 'File too large. Max allowed size is 10MB.';
        } else {
          err.statusCode = 400;
        }
      }
      return next(err);
    }

    try {
      const safeFolder = req.safeFolder || sanitizeFolderName(req.body.folder);
      if (!safeFolder) {
        const folderError = new Error('Invalid folder name.');
        folderError.statusCode = 400;
        throw folderError;
      }

      if (!req.files || req.files.length === 0) {
        const noFilesError = new Error('No image files uploaded. Use field name images[].');
        noFilesError.statusCode = 400;
        throw noFilesError;
      }

      const files = req.files.map((file) => buildPublicFileUrl(req, safeFolder, file.filename));

      return res.status(200).json({
        success: true,
        folder: safeFolder,
        files
      });
    } catch (error) {
      return next(error);
    }
  });
});

// List all folders inside /uploads.
router.get('/folders', (req, res, next) => {
  try {
    const baseUploadsPath = path.resolve(__dirname, '..', 'uploads');
    const entries = fs.readdirSync(baseUploadsPath, { withFileTypes: true });

    const folders = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    return res.status(200).json({
      success: true,
      folders
    });
  } catch (error) {
    return next(error);
  }
});

// List files for one folder and return public URLs.
router.get('/folders/:folder/files', (req, res, next) => {
  try {
    const safeFolder = sanitizeFolderName(req.params.folder);
    if (!safeFolder) {
      const err = new Error('Invalid folder name.');
      err.statusCode = 400;
      throw err;
    }

    const folderPath = getSafeUploadPath(safeFolder);
    if (!fs.existsSync(folderPath)) {
      const err = new Error('Folder not found.');
      err.statusCode = 404;
      throw err;
    }

    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    const fileUrls = files.map((filename) => buildPublicFileUrl(req, safeFolder, filename));

    return res.status(200).json({
      success: true,
      folder: safeFolder,
      files: fileUrls
    });
  } catch (error) {
    return next(error);
  }
});

// Delete a single file from a folder.
router.delete('/folders/:folder/files/:filename', (req, res, next) => {
  try {
    const safeFolder = sanitizeFolderName(req.params.folder);
    const safeFileName = sanitizeFileName(req.params.filename);

    if (!safeFolder || !safeFileName) {
      const err = new Error('Invalid folder or filename.');
      err.statusCode = 400;
      throw err;
    }

    const folderPath = getSafeUploadPath(safeFolder);
    if (!fs.existsSync(folderPath)) {
      const err = new Error('Folder not found.');
      err.statusCode = 404;
      throw err;
    }

    const filePath = path.resolve(folderPath, safeFileName);
    if (!filePath.startsWith(folderPath + path.sep)) {
      const err = new Error('Invalid file path.');
      err.statusCode = 400;
      throw err;
    }

    if (!fs.existsSync(filePath)) {
      const err = new Error('File not found.');
      err.statusCode = 404;
      throw err;
    }

    fs.unlinkSync(filePath);

    return res.status(200).json({
      success: true,
      message: 'File deleted successfully.',
      folder: safeFolder,
      filename: safeFileName
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
