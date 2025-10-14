// ============= CONTROLLER: procesarTextoController.js =============
import { extraerConclusiones } from "../services/docService.js";
import { procesarConIA } from "../services/IAService.js";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Función para generar nombres únicos más robusta
function generarNombreUnico(originalName, processingId = null, tipo = "temp") {
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);
  const timestamp = Date.now();
  const randomId = Math.round(Math.random() * 1e9);
  const processId = processingId || uuidv4();
  
  return `${base}_${timestamp}_${randomId}_${processId}_${tipo}${ext}`;
}

// Función para crear directorio temporal único para cada operación
async function crearDirectorioTemporal() {
  const tempDir = path.join("uploads", "temp", uuidv4());
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
}

// Función para limpiar directorio temporal
async function limpiarDirectorioTemporal(dirPath) {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    console.warn(`⚠️ No se pudo limpiar directorio temporal: ${dirPath}`, error.message);
  }
}

export const procesar = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No se subieron archivos" });
    }
    console.log("Archivos recibidos:", req.files);
    console.log(`🔄 Iniciando procesamiento lógico de ${req.files.length} archivo(s)`);
    const resultados = await procesarArchivosSeguros(req.files, extraerConclusiones, "logica");
    
    res.json({ 
      resultados,
      totalProcesados: resultados.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("❌ Error en procesar:", err);
    res.status(500).json({ 
      error: "Error al procesar archivos", 
      details: err.message 
    });
  }
};

export const procesarIA = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No se subieron archivos" });
    }
    
    console.log(`🤖 Iniciando procesamiento IA de ${req.files.length} archivo(s)`);
    const resultados = await procesarArchivosSeguros(req.files, procesarConIA, "ia");
    
    res.json({ 
      resultados,
      totalProcesados: resultados.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("❌ Error en procesarIA:", err);
    res.status(500).json({ 
      error: "Error al procesar archivos con IA", 
      details: err.message 
    });
  }
};

async function procesarArchivosSeguros(files, procesarArchivoFunc, tipo = "logica") {
  // Crear directorio temporal único para esta operación
  const tempDir = await crearDirectorioTemporal();
  const processingId = uuidv4(); // ID único para toda la operación
  
  console.log(`📁 Directorio temporal creado: ${tempDir}`);
  console.log(`🆔 ID de procesamiento: ${processingId}`);
  
  const resultados = [];
  const archivosOriginales = [];
  const archivosTemporales = [];

  try {
    // Procesar archivos de forma secuencial para evitar conflictos
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileId = `${processingId}_${i}`;
      
      console.log(`📄 Procesando archivo ${i + 1}/${files.length}: ${file.originalname}`);
      archivosOriginales.push(file.path);
      console.log(`🔗 Rutas originales: ${archivosOriginales}`);

      try {
        // Crear nombres únicos para cada etapa del procesamiento
        const nombreBase = path.basename(file.originalname, path.extname(file.originalname));
        const extension = path.extname(file.originalname);
        
        // Archivo de trabajo en directorio temporal
        const archivoTrabajo = path.join(tempDir, `${nombreBase}_${fileId}_work${extension}`);
        
        // Archivo específico para procesamiento
        const archivoProcesamientoUnique = path.join(tempDir, `${nombreBase}_${fileId}_${tipo}_processing${extension}`);
        
        archivosTemporales.push(archivoTrabajo, archivoProcesamientoUnique);

        // Copiar archivo original al directorio temporal
        await fs.copyFile(file.path, archivoTrabajo);
        console.log(`📋 Archivo copiado a: ${archivoTrabajo}`);
        
        // Crear copia específica para procesamiento
        await fs.copyFile(archivoTrabajo, archivoProcesamientoUnique);
        console.log(`🔄 Archivo preparado para procesamiento: ${archivoProcesamientoUnique}`);

        // Procesar con la función correspondiente
        console.log(`⚙️ Ejecutando procesamiento ${tipo} para: ${file.originalname}`);
        const resultado = await procesarArchivoFunc(archivoProcesamientoUnique);
        
        // Validar y limpiar resultado
        let resultadoFinal;
        if (typeof resultado === "string") {
          resultadoFinal = resultado.trim();
        } else if (resultado && typeof resultado === "object") {
          resultadoFinal = JSON.stringify(resultado);
        } else {
          resultadoFinal = String(resultado || `Sin resultado para procesamiento ${tipo}`);
        }

        resultados.push({
          nombreArchivo: file.originalname,
          resultado: resultadoFinal,
          processingId: fileId,
          tipo: tipo,
          timestamp: new Date().toISOString()
        });

        console.log(`✅ Resultado ${tipo} obtenido para: ${file.originalname} (${resultadoFinal.length} caracteres)`);

      } catch (error) {
        console.error(`❌ Error procesando ${tipo} ${file.originalname}:`, error);
        resultados.push({
          nombreArchivo: file.originalname,
          resultado: `Error en procesamiento ${tipo}: ${error.message}`,
          processingId: `${processingId}_${i}`,
          tipo: tipo,
          error: true,
          timestamp: new Date().toISOString()
        });
      }
    }

    console.log(`📊 Procesamiento completado: ${resultados.length} resultados obtenidos`);
    return resultados;

  } catch (error) {
    console.error("❌ Error general en procesarArchivosSeguros:", error);
    throw error;
  } finally {
    // Limpiar archivos originales
    for (const archivoOriginal of archivosOriginales) {
      try {
        await fs.unlink(archivoOriginal);
        console.log(`🗑️ Archivo original eliminado: ${archivoOriginal}`);
      } catch (error) {
        console.warn(`⚠️ No se pudo eliminar archivo original: ${archivoOriginal}`, error.message);
      }
    }

    // Limpiar directorio temporal completo
    await limpiarDirectorioTemporal(tempDir);
    console.log(`🧹 Directorio temporal limpiado: ${tempDir}`);
  }
}

// Función de utilidad para verificar el estado de archivos temporales (útil para debugging)
export const verificarEstadoTemporal = async (req, res) => {
  try {
    const uploadsDir = path.join("uploads");
    const tempDir = path.join(uploadsDir, "temp");
    
    let archivos = [];
    try {
      const contenido = await fs.readdir(uploadsDir, { withFileTypes: true });
      for (const item of contenido) {
        if (item.isFile()) {
          const stats = await fs.stat(path.join(uploadsDir, item.name));
          archivos.push({
            nombre: item.name,
            tamaño: stats.size,
            fechaCreacion: stats.birthtime,
            fechaModificacion: stats.mtime
          });
        }
      }
    } catch (error) {
      console.log("No se pudo acceder al directorio uploads");
    }
    
    let directoriosTemp = [];
    try {
      const contenidoTemp = await fs.readdir(tempDir, { withFileTypes: true });
      directoriosTemp = contenidoTemp.filter(item => item.isDirectory()).map(dir => dir.name);
    } catch (error) {
      console.log("No existen directorios temporales");
    }
    
    res.json({
      archivosEnUploads: archivos,
      directoriosTemporales: directoriosTemp,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: "Error verificando estado temporal", details: error.message });
  }
};

// Endpoint para diagnosticar duplicados en archivos subidos
export const diagnosticarDuplicados = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No se subieron archivos para diagnosticar" });
    }

    const { archivosUnicos, duplicados, stats } = filtrarArchivosDuplicados(req.files);
    
    res.json({
      estadisticas: stats,
      archivosUnicos: archivosUnicos.map(file => ({
        nombre: file.originalname,
        path: file.path,
        tamaño: file.size,
        mimetype: file.mimetype
      })),
      duplicados: duplicados,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: "Error diagnosticando duplicados", 
      details: error.message 
    });
  }
};