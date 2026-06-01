/**
 * Descarga un JSON desde una URL con seguimiento de progreso por chunks.
 *
 * Usa fetch nativo + ReadableStream (response.body.getReader()) para poder
 * reportar el avance de la descarga, algo que axios / RTK Query baseQuery no
 * exponen de forma natural. Pensado para URLs presignadas de S3 que envía el
 * catálogo (MapsAnalytics) por postMessage.
 *
 * @param {string} url - URL del JSON a descargar (presignada de S3).
 * @param {Object} [options]
 * @param {(progress: {receivedLength: number, chunks: Uint8Array[], currentChunk: Uint8Array, done: boolean, fraction: number}) => void} [options.onProgress]
 * @param {(result: string) => void} [options.onComplete]
 * @returns {Promise<Object>} Promesa que resuelve con el JSON parseado.
 */
export const getJsonItem = (url, {onProgress, onComplete} = {}) =>
  new Promise((resolve, reject) => {
    const handleProgress = async () => {
      try {
        // Paso 1: iniciar la descarga y obtener un reader del stream
        const response = await fetch(url);
        if (!response.ok) {
          reject(new Error(`Error fetching map: ${response.status}`));
          return;
        }

        const reader = response.body.getReader();

        // Paso 2: tamaño total (para calcular la fracción de progreso)
        const contentLength = +response.headers.get('Content-Length');

        // Paso 3: leer el cuerpo en chunks
        let receivedLength = 0;
        const chunks = [];
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const {done, value} = await reader.read();
          if (done) {
            break;
          }

          chunks.push(value);
          receivedLength += value.length;
          onProgress?.({
            receivedLength,
            chunks,
            currentChunk: value,
            done,
            fraction: contentLength ? receivedLength / contentLength : 0
          });
        }

        // Paso 4: concatenar los chunks en un único Uint8Array
        const chunksAll = new Uint8Array(receivedLength);
        let position = 0;
        for (const chunk of chunks) {
          chunksAll.set(chunk, position);
          position += chunk.length;
        }

        // Paso 5: decodificar a string y parsear
        const result = new TextDecoder('utf-8').decode(chunksAll);

        onComplete?.(result);
        resolve(JSON.parse(result));
      } catch (error) {
        reject(error);
      }
    };

    handleProgress();
  });

export default getJsonItem;
