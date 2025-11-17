import html2canvas from 'html2canvas'

export interface MapExportOptions {
  filename?: string
  format?: 'png' | 'jpg'
  quality?: number
  scale?: number
}

/**
 * Export map element as PNG/JPG image
 * @param element - DOM element containing the map
 * @param options - Export options (filename, format, quality, scale)
 * @returns Promise that resolves when download completes
 */
export async function exportMapAsImage(
  element: HTMLElement,
  options: MapExportOptions = {}
): Promise<void> {
  const {
    filename = `map-export-${new Date().toISOString().split('T')[0]}.png`,
    format = 'png',
    quality = 0.95,
    scale = 2
  } = options

  try {
    // Capture the map element as canvas
    const canvas = await html2canvas(element, {
      useCORS: true,
      allowTaint: true,
      scale: scale,
      logging: false,
      backgroundColor: '#ffffff'
    })

    // Convert to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b)
          else reject(new Error('Failed to create blob'))
        },
        format === 'jpg' ? 'image/jpeg' : 'image/png',
        quality
      )
    })

    // Trigger download
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Map export failed:', error)
    throw new Error('Failed to export map image')
  }
}

/**
 * Copy map image to clipboard
 * @param element - DOM element containing the map
 * @param scale - Image scale factor (default 2)
 */
export async function copyMapToClipboard(
  element: HTMLElement,
  scale: number = 2
): Promise<void> {
  try {
    const canvas = await html2canvas(element, {
      useCORS: true,
      allowTaint: true,
      scale: scale,
      logging: false,
      backgroundColor: '#ffffff'
    })

    // Convert to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b)
          else reject(new Error('Failed to create blob'))
        },
        'image/png'
      )
    })

    // Copy to clipboard
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ])
  } catch (error) {
    console.error('Copy to clipboard failed:', error)
    throw new Error('Failed to copy map to clipboard')
  }
}

/**
 * Get map as base64 data URL
 * @param element - DOM element containing the map
 * @param format - Image format ('png' or 'jpg')
 * @param quality - Image quality (0-1)
 * @returns Base64 data URL
 */
export async function getMapAsDataURL(
  element: HTMLElement,
  format: 'png' | 'jpg' = 'png',
  quality: number = 0.95
): Promise<string> {
  const canvas = await html2canvas(element, {
    useCORS: true,
    allowTaint: true,
    scale: 2,
    logging: false,
    backgroundColor: '#ffffff'
  })

  return canvas.toDataURL(
    format === 'jpg' ? 'image/jpeg' : 'image/png',
    quality
  )
}
