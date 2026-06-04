import {cleanupExportImage, startExportingImage} from '@kepler.gl/actions';

const DEFAULT_CONTAINER_SELECTOR = '#kepler-gl__map';
const MIN_THUMBNAIL_BYTES = 1024;
const YELLOW_PIXEL_THRESHOLD = 0.85;

/**
 * Convierte un data URI (ej. "data:image/png;base64,....") en un Blob binario,
 * apto para adjuntar a un FormData.
 */
export function dataURItoBlob(dataURI) {
  if (!dataURI?.startsWith('data:image/png')) {
    throw new Error('La captura del mapa no es un PNG válido');
  }
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], {type: mimeString});
}

function getMapDimensions(containerSelector) {
  const container = document.querySelector(containerSelector);
  const rect = container?.getBoundingClientRect();
  const mapW = Math.round(rect?.width || window.innerWidth || 0);
  const mapH = Math.round(rect?.height || window.innerHeight || 0);

  if (mapW <= 0 || mapH <= 0) {
    throw new Error('No se pudieron calcular las dimensiones del mapa para capturar el thumbnail');
  }

  return {mapW, mapH};
}

function loadImage(dataURI) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo leer la captura del mapa'));
    image.src = dataURI;
  });
}

async function assertNotYellowPlaceholder(dataURI) {
  const image = await loadImage(dataURI);
  const canvas = document.createElement('canvas');
  const sampleW = 24;
  const sampleH = 24;
  canvas.width = sampleW;
  canvas.height = sampleH;

  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  context.drawImage(image, 0, 0, sampleW, sampleH);
  const pixels = context.getImageData(0, 0, sampleW, sampleH).data;
  let visiblePixels = 0;
  let yellowPixels = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];
    if (alpha < 16) {
      continue;
    }

    visiblePixels += 1;
    const red = pixels[i];
    const green = pixels[i + 1];
    const blue = pixels[i + 2];
    if (red > 200 && green > 160 && blue < 90) {
      yellowPixels += 1;
    }
  }

  if (visiblePixels && yellowPixels / visiblePixels >= YELLOW_PIXEL_THRESHOLD) {
    throw new Error('La captura del mapa parece ser el placeholder amarillo, no el thumbnail real');
  }
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
  const {
    intervalMs = 500,
    timeoutMs = 15000,
    containerSelector = DEFAULT_CONTAINER_SELECTOR,
    minBytes = MIN_THUMBNAIL_BYTES,
    ratio = '16:9',
    resolution = '1x',
    center = false
  } = opts;

  return new Promise((resolve, reject) => {
    let settled = false;
    let validating = false;
    let intervalId = null;
    let timeoutId = null;

    const cleanup = () => {
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
      dispatch(cleanupExportImage());
    };

    const fail = error => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const complete = blob => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(blob);
    };

    let mapW;
    let mapH;
    try {
      ({mapW, mapH} = getMapDimensions(containerSelector));
    } catch (error) {
      reject(error);
      return;
    }

    dispatch(cleanupExportImage());

    dispatch(
      startExportingImage({
        ratio,
        resolution,
        center,
        mapH,
        mapW
      })
    );

    const check = () => {
      const exportImage = getState()?.demo?.keplerGl?.map?.uiState?.exportImage;
      if (exportImage?.error) {
        fail(exportImage.error);
        return;
      }
      if (exportImage?.processing) {
        return;
      }
      const imageDataUri = exportImage?.imageDataUri;
      if (imageDataUri && !validating) {
        validating = true;
        try {
          const blob = dataURItoBlob(imageDataUri);
          if (blob.size < minBytes) {
            throw new Error(`La captura del mapa es demasiado pequeña (${blob.size} bytes)`);
          }
          assertNotYellowPlaceholder(imageDataUri).then(() => complete(blob)).catch(fail);
        } catch (error) {
          fail(error);
        }
      }
    };

    intervalId = setInterval(check, intervalMs);
    timeoutId = setTimeout(() => {
      fail(new Error('Timeout esperando la captura de imagen del mapa'));
    }, timeoutMs);

    // Comprobación inmediata por si la imagen ya estuviese disponible.
    check();
  });
}
