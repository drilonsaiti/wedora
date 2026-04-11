import imageCompression from 'browser-image-compression'

export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 3,
    maxWidthOrHeight: 2048,
    useWebWorker: true,
    fileType: 'image/jpeg' as const,
    initialQuality: 0.85,
    onProgress: undefined,
  }

  try {
    const compressed = await imageCompression(file, options)
    // Preserve a reasonable filename
    return new File([compressed], file.name.replace(/\.[^.]+$/, '.jpg'), {
      type: 'image/jpeg',
    })
  } catch {
    // Fallback: return original if compression fails
    return file
  }
}

export async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}
