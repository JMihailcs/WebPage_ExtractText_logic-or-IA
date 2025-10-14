// ============= SERVICE: IAService.js =============
import mammoth from "mammoth";
import { Ollama } from "ollama";
import fs from "fs/promises";

// Configuración más robusta de Ollama
const ollamaConfig = {
  host: 'http://localhost:11434',
  timeout: 60000, // 60 segundos de timeout
};

let ollama;

// Función para inicializar Ollama con manejo de errores
async function initOllama() {
  if (!ollama) {
    try {
      ollama = new Ollama(ollamaConfig);
      // Probar conexión
      await ollama.list();
      console.log('✅ Conexión a Ollama establecida');
    } catch (error) {
      console.error('❌ Error conectando a Ollama:', error.message);
      throw new Error(`No se pudo conectar a Ollama: ${error.message}`);
    }
  }
  return ollama;
}

export async function procesarConIA(filePath) {
  try {
    console.log(`🤖 Iniciando procesamiento IA para: ${filePath}`);
    
    // Inicializar Ollama
    const ollamaInstance = await initOllama();
    
    // Verificar archivo
    const stats = await fs.stat(filePath);
    console.log(`📊 Tamaño del archivo: ${stats.size} bytes`);
    
    if (stats.size === 0) {
      throw new Error("El archivo está vacío");
    }
    
    // Extraer texto con timeout
    const resultado = await Promise.race([
      mammoth.extractRawText({ path: filePath }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout extrayendo texto para IA')), 30000)
      )
    ]);
    
    const { value: texto, messages } = resultado;
    
    if (messages && messages.length > 0) {
      console.log(`⚠ Advertencias mammoth IA:`, messages.map(m => m.message).join(', '));
    }
    
    console.log(`📝 Texto extraído para IA: ${texto.length} caracteres`);
    
    if (!texto || texto.trim().length === 0) {
      throw new Error("No se pudo extraer texto del documento para IA");
    }

    // Truncar texto si es muy largo
    const textoParaIA = texto.length > 6000 ? 
      texto.substring(0, 6000) + "\n\n[TEXTO TRUNCADO...]" : 
      texto;
    
    console.log(`🧠 Enviando a IA: ${textoParaIA.length} caracteres`);
    
    // Verificar que el modelo existe antes de usarlo
    const modelos = await ollamaInstance.list();
    const modelosDisponibles = modelos.models.map(m => m.name);
    console.log('📋 Modelos disponibles:', modelosDisponibles);
    
    // Intentar diferentes modelos en orden de preferencia
    const modelosIntentar = ['gemma3:1b', 'gemma:2b', 'llama3.2:1b', 'llama3.2', 'llama2'];
    let modeloUsado = null;
    
    for (const modelo of modelosIntentar) {
      if (modelosDisponibles.some(m => m.includes(modelo.split(':')[0]))) {
        modeloUsado = modelo;
        break;
      }
    }
    
    if (!modeloUsado) {
      throw new Error(`Ningún modelo compatible encontrado. Disponibles: ${modelosDisponibles.join(', ')}`);
    }
    
    console.log(`🎯 Usando modelo: ${modeloUsado}`);
    
    // Hacer la consulta con reintentos
    let response;
    let intentos = 0;
    const maxIntentos = 3;
    
    while (intentos < maxIntentos) {
      try {
        intentos++;
        console.log(`🔄 Intento ${intentos}/${maxIntentos} con IA...`);
        
        response = await Promise.race([
          ollamaInstance.chat({
            model: modeloUsado,
            messages: [
              { 
                role: "system", 
                content: "Extrae únicamente la sección de CONCLUSIONES de documentos. Responde solo con el contenido de las conclusiones, sin agregar texto adicional. Responde en español." 
              },
              { 
                role: "user", 
                content: `Extrae las CONCLUSIONES del siguiente documento:\n\n${textoParaIA}` 
              },
            ],
            options: {
              temperature: 0.1,
              num_predict: 400,
              top_p: 0.9,
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout en consulta IA')), 45000)
          )
        ]);
        
        break; // Si llegamos aquí, la consulta fue exitosa
        
      } catch (error) {
        console.error(`❌ Intento ${intentos} fallido:`, error.message);
        
        if (intentos === maxIntentos) {
          throw error;
        }
        
        // Esperar antes del siguiente intento
        await new Promise(resolve => setTimeout(resolve, 3000 * intentos));
      }
    }

    const resultadoIA = response.message.content;
    console.log(`✅ Respuesta IA recibida: ${resultadoIA.length} caracteres`);
    
    return resultadoIA;
    
  } catch (error) {
    console.error(`💥 Error en procesarConIA para ${filePath}:`, error);
    
    // Mensajes de error más específicos
    if (error.message.includes('ECONNREFUSED')) {
      throw new Error('Ollama no está ejecutándose. Inicia Ollama con: ollama serve');
    }
    if (error.message.includes('EOF')) {
      throw new Error('Conexión interrumpida con Ollama. Reinicia Ollama e inténtalo de nuevo');
    }
    if (error.message.includes('model')) {
      throw new Error('Modelo no disponible. Instala un modelo con: ollama pull gemma2:2b');
    }
    
    throw new Error(`Error IA: ${error.message}`);
  }
}