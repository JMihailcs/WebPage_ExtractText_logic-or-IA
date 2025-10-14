// ============= SERVICE: docService.js =============
import mammoth from "mammoth";
import fs from "fs/promises";

export async function extraerConclusiones(filePath) {
  try {
    console.log(`📄 Extrayendo texto de: ${filePath}`);
    
    const stats = await fs.stat(filePath);
    if (stats.size === 0) throw new Error("El archivo está vacío");
    
    const resultado = await mammoth.extractRawText({ path: filePath });
    const texto = resultado.value;

    if (!texto || texto.trim().length === 0) throw new Error("No se pudo extraer texto");

    const patronesConclusiones = [
      /(?:^|\n)\s*(?:CONCLUSIONES?|CONCLUSIÓN)\s*:?\s*\n*([\s\S]*?)(?=\n\s*(?:RECOMENDACIONES?|BIBLIOGRAFÍA?|REFERENCIAS?|ANEXOS?|APÉNDICES?)|$)/i,
      /(?:^|\n)\s*(?:VI|V|6|5)\.?\s*CONCLUSIONES?\s*:?\s*\n*([\s\S]*?)(?=\n\s*(?:VII|VI|7|6)\.?|$)/i,
    ];

    let conclusiones = null;

    for (const patron of patronesConclusiones) {
      const match = texto.match(patron);
      if (match && match[1] && match[1].trim().length > 30) {
        conclusiones = match[1].trim();
        break;
      }
    }

    if (!conclusiones) {
      // fallback simple: tomar solo la primera ocurrencia de "conclusion" + 400 chars
      const indice = texto.toLowerCase().indexOf('conclusion');
      if (indice !== -1) conclusiones = texto.substring(indice, indice + 400).trim();
    }

    if (conclusiones) {
      // limpieza final: eliminar saltos de línea y numeración al inicio
      // conclusiones = conclusiones
      //   .replace(/\s+/g, ' ')
      //   .replace(/^\s*[\d\w\.\-]+\s*/, '')
      //   .trim();

      console.log(`📏 Conclusiones finales: ${conclusiones.length} caracteres`);
      return conclusiones;
    }

    return null;

  } catch (error) {
    console.error(`💥 Error en extraerConclusiones para ${filePath}:`, error);
    throw new Error(`Error extrayendo conclusiones: ${error.message}`);
  }
}
