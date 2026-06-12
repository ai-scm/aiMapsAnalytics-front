import {cleanupExportImage, startExportingImage} from '@kepler.gl/actions'

const DEFAULT_CONTAINER_SELECTOR = '#kepler-gl__map'
const MIN_THUMBNAIL_BYTES = 1024
const YELLOW_PIXEL_THRESHOLD = 0.85

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function waitForAnimationFrame() {
  return new Promise(resolve => {
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => resolve())
      return
    }

    setTimeout(resolve, 16)
  })
}

async function waitForFrames(count = 1) {
  for (let index = 0; index < count; index += 1) {
    await waitForAnimationFrame()
  }
}

function normalizeError(error) {
  if (error instanceof Error) {
    return error
  }

  if (typeof error === 'string') {
    return new Error(error)
  }

  return new Error('No se pudo exportar la imagen del mapa')
}

export function dataURItoBlob(dataURI) {
  if (!dataURI?.startsWith('data:image/png')) {
    throw new Error('La captura del mapa no es un PNG válido')
  }

  const byteString = atob(dataURI.split(',')[1])
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)

  for (let i = 0; i < byteString.length; i += 1) {
    ia[i] = byteString.charCodeAt(i)
  }

  return new Blob([ab], {type: mimeString})
}

function getMapContainer(containerSelector) {
  return document.querySelector(containerSelector)
}

function getMapDimensions(containerSelector) {
  const container = getMapContainer(containerSelector)
  const rect = container?.getBoundingClientRect()
  const mapW = Math.round(rect?.width || window.innerWidth || 0)
  const mapH = Math.round(rect?.height || window.innerHeight || 0)

  if (mapW <= 0 || mapH <= 0) {
    throw new Error('No se pudieron calcular las dimensiones del mapa para capturar el thumbnail')
  }

  return {mapW, mapH}
}

function hasRenderableCanvas(container) {
  const canvases = container?.querySelectorAll?.('canvas')
  if (!canvases?.length) {
    return false
  }

  return Array.from(canvases).some(canvas => {
    const style = window.getComputedStyle(canvas)
    return (
      canvas.width > 0 &&
      canvas.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden'
    )
  })
}

async function waitForMapRender(containerSelector, waitMs, stableFrames) {
  const deadline = Date.now() + waitMs

  while (Date.now() <= deadline) {
    const container = getMapContainer(containerSelector)
    const rect = container?.getBoundingClientRect()

    if (rect?.width > 0 && rect?.height > 0 && hasRenderableCanvas(container)) {
      await waitForFrames(stableFrames)
      return
    }

    await waitForAnimationFrame()
    await delay(80)
  }

  throw new Error('Timeout esperando a que el mapa termine de renderizar para generar el thumbnail')
}

function loadImage(dataURI) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('No se pudo leer la captura del mapa'))
    image.src = dataURI
  })
}

async function assertNotYellowPlaceholder(dataURI) {
  const image = await loadImage(dataURI)
  const canvas = document.createElement('canvas')
  const sampleW = 24
  const sampleH = 24
  canvas.width = sampleW
  canvas.height = sampleH

  const context = canvas.getContext('2d')
  if (!context) {
    return
  }

  context.drawImage(image, 0, 0, sampleW, sampleH)
  const pixels = context.getImageData(0, 0, sampleW, sampleH).data
  let visiblePixels = 0
  let yellowPixels = 0

  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3]
    if (alpha < 16) {
      continue
    }

    visiblePixels += 1
    const red = pixels[i]
    const green = pixels[i + 1]
    const blue = pixels[i + 2]

    if (red > 200 && green > 160 && blue < 90) {
      yellowPixels += 1
    }
  }

  if (visiblePixels && yellowPixels / visiblePixels >= YELLOW_PIXEL_THRESHOLD) {
    throw new Error('La captura del mapa parece ser el placeholder amarillo, no el thumbnail real')
  }
}

function requestImageExport(dispatch, getState, options) {
  const {ratio, resolution, center, mapH, mapW, intervalMs, timeoutMs} = options

  return new Promise((resolve, reject) => {
    let intervalId = null
    let timeoutId = null

    const cleanupTimers = () => {
      if (intervalId) clearInterval(intervalId)
      if (timeoutId) clearTimeout(timeoutId)
    }

    const rejectWith = error => {
      cleanupTimers()
      reject(normalizeError(error))
    }

    const resolveWith = imageDataUri => {
      cleanupTimers()
      resolve(imageDataUri)
    }

    dispatch(cleanupExportImage())
    dispatch(
      startExportingImage({
        ratio,
        resolution,
        center,
        mapH,
        mapW
      })
    )

    const checkExportState = () => {
      const exportImage = getState()?.demo?.keplerGl?.map?.uiState?.exportImage

      if (exportImage?.error) {
        rejectWith(exportImage.error)
        return
      }

      if (exportImage?.processing) {
        return
      }

      if (exportImage?.imageDataUri) {
        resolveWith(exportImage.imageDataUri)
      }
    }

    intervalId = setInterval(checkExportState, intervalMs)
    timeoutId = setTimeout(() => {
      rejectWith(new Error('Timeout esperando la captura de imagen del mapa'))
    }, timeoutMs)

    checkExportState()
  })
}

export async function captureMapImageBlob(dispatch, getState, opts = {}) {
  const {
    intervalMs = 300,
    timeoutMs = 24000,
    containerSelector = DEFAULT_CONTAINER_SELECTOR,
    minBytes = MIN_THUMBNAIL_BYTES,
    ratio = '16:9',
    resolution = '1x',
    center = false,
    retryCount = 3,
    retryDelayMs = 350,
    renderWaitMs = 2500,
    stableFrames = 3
  } = opts

  const attempts = Math.max(1, retryCount)
  const perAttemptTimeout = Math.max(4000, Math.floor(timeoutMs / attempts))
  let lastError = null

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await waitForMapRender(containerSelector, renderWaitMs, stableFrames)
      const {mapW, mapH} = getMapDimensions(containerSelector)
      const imageDataUri = await requestImageExport(dispatch, getState, {
        ratio,
        resolution,
        center,
        mapH,
        mapW,
        intervalMs,
        timeoutMs: perAttemptTimeout
      })

      const blob = dataURItoBlob(imageDataUri)
      if (blob.size < minBytes) {
        throw new Error(`La captura del mapa es demasiado pequeña (${blob.size} bytes)`)
      }

      await assertNotYellowPlaceholder(imageDataUri)
      dispatch(cleanupExportImage())
      return blob
    } catch (error) {
      lastError = normalizeError(error)
      dispatch(cleanupExportImage())

      if (attempt < attempts) {
        await waitForFrames(stableFrames)
        await delay(retryDelayMs)
      }
    }
  }

  throw lastError || new Error('No se pudo capturar el thumbnail del mapa')
}
