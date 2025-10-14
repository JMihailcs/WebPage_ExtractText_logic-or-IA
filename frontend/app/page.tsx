"use client";
import { useState, useRef } from "react";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [resultados, setResultados] = useState<
    { nombreArchivo: string; resultado: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [currentEndpoint, setCurrentEndpoint] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    
    const docxFiles = Array.from(newFiles).filter(file => 
      file.name.toLowerCase().endsWith('.docx')
    );
    
    setFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      const uniqueFiles = docxFiles.filter(f => !existingNames.has(f.name));
      return [...prev, ...uniqueFiles];
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };
  const enviarArchivo = async (endpoint: string) => {
    console.log("Archivos seleccionados:", files);
    if (!files.length) return;

    setLoading(true);
    setCurrentEndpoint(endpoint);
    setResultados([]);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("archivos", file));

      const res = await fetch(`http://localhost:4000/procesarTexto/${endpoint}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Error HTTP: ${res.status}`);
      }

      const data = await res.json();
      setResultados(data.resultados || []);
    } catch (err) {
      console.error("Error al procesar archivos:", err);
      setResultados([{ 
        nombreArchivo: "Error", 
        resultado: `No se pudo procesar: ${err instanceof Error ? err.message : 'Error desconocido'}` 
      }]);
    } finally {
      setLoading(false);
      setCurrentEndpoint("");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Extractor de Conclusiones
          </h1>
          <p className="text-gray-600">
            Sube tus documentos .docx y extrae conclusiones usando lógica o IA
          </p>
        </div>

        <div className="flex flex-col xl:flex-row gap-8">
          {/* Panel de Archivos */}
          <div className="w-full xl:w-2/5 space-y-6">
            {/* Zona de Drop */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`
                relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
                ${dragOver 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400 bg-white'
                }
              `}
            >
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                
                <div>
                  <p className="text-lg font-medium text-gray-900 mb-1">
                    Arrastra archivos aquí
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    o selecciona manualmente
                  </p>
                  
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
                    >
                      Seleccionar archivos
                    </button>
                    
                    {files.length > 0 && (
                      <button
                        onClick={clearAllFiles}
                        disabled={loading}
                        className="bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                      >
                        Limpiar todo
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx"
                multiple
                onChange={(e) => addFiles(e.target.files)}
                className="hidden"
                disabled={loading}
              />
            </div>

            {/* Lista de Archivos */}
            {files.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Archivos seleccionados ({files.length})
                  </h3>
                </div>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => removeFile(index)}
                        disabled={loading}
                        className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 disabled:text-gray-300 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                
                {/* Botones de Procesamiento */}
                <div className="mt-6 space-y-3">
                  <button
                    onClick={() => enviarArchivo("logica")}
                    disabled={!files.length || loading}
                    className="w-full bg-gray-700 hover:bg-gray-800 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                  >
                    {loading && currentEndpoint === "logica" ? (
                      <>
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Procesando con Lógica...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span>Extraer con Lógica</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => enviarArchivo("ia")}
                    disabled={!files.length || loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 text-white py-3 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    {loading && currentEndpoint === "ia" ? (
                      <>
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Procesando con IA...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Extraer con IA</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Panel de Resultados */}
          <div className="w-full xl:w-3/5">
            {loading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 flex items-center justify-center min-h-[500px]">
                <div className="text-center">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    Procesando archivos
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Extrayendo conclusiones con {currentEndpoint === "logica" ? "Lógica" : "IA"}...
                  </p>
                </div>
              </div>
            ) : resultados.length > 0 ? (
              <div className="space-y-6">
                {resultados.map((resultado, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                  >
                    <div className={`px-6 py-4 ${
                      resultado.nombreArchivo === "Error" 
                        ? "bg-gradient-to-r from-red-500 to-red-600" 
                        : "bg-gradient-to-r from-green-500 to-emerald-600"
                    }`}>
                      <div className="flex items-center space-x-2">
                        {resultado.nombreArchivo === "Error" ? (
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        <h3 className="text-lg font-semibold text-white">
                          {"CONCLUSIONES <- " + resultado.nombreArchivo}
                        </h3>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="prose max-w-none">
                        <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                          {resultado.resultado}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 flex items-center justify-center min-h-[500px]">
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    Sin resultados aún
                  </h3>
                  <p className="text-gray-500">
                    Los resultados aparecerán aquí después del procesamiento
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}