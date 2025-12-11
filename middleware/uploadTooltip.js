import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar almacenamiento en public/tooltips/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/tooltips/');
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Usar el entry del item como nombre: 50730.png
    const entry = req.params.entry || req.body.entry;
    
    if (!entry) {
      return cb(new Error('Entry del item no especificado'));
    }
    
    // Obtener extensión del archivo
    const extension = path.extname(file.originalname).toLowerCase();
    
    // Validar extensión
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.bmp'];
    if (!allowedExtensions.includes(extension)) {
      return cb(new Error('Formato de imagen no permitido. Use JPG, PNG o BMP'));
    }
    
    // Nombre del archivo: entry + extensión (ej: 50730.png)
    const filename = `${entry}${extension}`;
    
    cb(null, filename);
  }
});

// Validar tipo MIME
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Use imágenes JPG, PNG o BMP'));
  }
};

// Configurar multer
const uploadTooltip = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1280 * 1280, // tamaño máximo
    files: 1 // Solo un archivo
  },
  fileFilter: fileFilter
});

export default uploadTooltip;