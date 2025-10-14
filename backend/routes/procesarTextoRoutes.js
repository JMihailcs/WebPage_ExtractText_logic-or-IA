// routes/procesar.js
import express from 'express';
import { procesar, procesarIA } from '../controllers/procesarTextoController.js';
import { upload } from '../middlewares/upload.js';

const router = express.Router();

// Endpoint para procesamiento lógico
router.post('/logica', upload.array('archivos', 10), procesar);

// Endpoint para procesamiento IA
router.post('/ia', upload.array('archivos', 10), procesarIA);

export default router;
