import {startExportingImage} from '@kepler.gl/actions';

/**
 * Convierte un data URI (ej. "data:image/png;base64,....") en un Blob binario,
 * apto para adjuntar a un FormData.
 */
export function dataURItoBlob(dataURI) {
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], {type: mimeString});
}

/**
 * Dispara la exportación de imagen de Kepler.gl y resuelve con el Blob PNG del
 * mapa actual (thumbnail). Equivalente a `downloadImageBlob` de la v1, pero con
 * polling acotado y limpieza de timers para evitar fugas si la imagen nunca llega.
 *
 * @param {Function} dispatch  store.dispatch
 * @param {Function} getState  store.getState (react-redux useStore().getState)
 * @param {Object}   [opts]
 * @param {number}   [opts.intervalMs=500]  frecuencia de polling
 * @param {number}   [opts.timeoutMs=15000] tiempo máximo de espera
 * @returns {Promise<Blob>}
 */
export function captureMapImageBlob(dispatch, getState, opts = {}) {
  const {intervalMs = 500, timeoutMs = 15000} = opts;

  return new Promise((resolve, reject) => {
    const mapH = window.innerHeight;
    const mapW = window.innerWidth;

    dispatch(
      startExportingImage({
        ratio: '16:9',
        resolution: '1x',
        mapH,
        mapW
      })
    );

    let intervalId = null;
    let timeoutId = null;

    const cleanup = () => {
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };

    const check = () => {
      const exportImage = getState()?.demo?.keplerGl?.map?.uiState?.exportImage;
      const imageDataUri = exportImage?.imageDataUri;
      if (imageDataUri) {
        cleanup();
        try {
          resolve(dataURItoBlob(imageDataUri));
        } catch (error) {
          reject(error);
        }
      }
    };

    intervalId = setInterval(check, intervalMs);
    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout esperando la captura de imagen del mapa'));
    }, timeoutMs);

    // Comprobación inmediata por si la imagen ya estuviese disponible.
    check();
  });
}
