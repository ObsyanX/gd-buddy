// Frame Capture Utility
// Captures video frames as base64 JPEG for backend analysis

const DEFAULT_QUALITY = 0.7; // JPEG quality (0-1)
const MAX_WIDTH = 640;
const MAX_HEIGHT = 480;

/**
 * Capture a frame from a video element as base64 JPEG
 */
export function captureFrameAsBase64(
  video: HTMLVideoElement,
  quality: number = DEFAULT_QUALITY
): string | null {
  if (!video || video.readyState < video.HAVE_CURRENT_DATA) {
    return null;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return null;
  }

  // Use actual video dimensions, capped at max
  const width = Math.min(video.videoWidth || MAX_WIDTH, MAX_WIDTH);
  const height = Math.min(video.videoHeight || MAX_HEIGHT, MAX_HEIGHT);
  
  canvas.width = width;
  canvas.height = height;

  // Draw video frame to canvas
  ctx.drawImage(video, 0, 0, width, height);

  // Convert to base64 JPEG
  try {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    // Remove the data URL prefix to get just the base64 string
    return dataUrl.replace(/^data:image\/jpeg;base64,/, '');
  } catch (error) {
    console.error('Frame capture failed:', error);
    return null;
  }
}

/**
 * Capture a frame and return as Blob for upload
 */
export function captureFrameAsBlob(
  video: HTMLVideoElement,
  quality: number = DEFAULT_QUALITY
): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (!video || video.readyState < video.HAVE_CURRENT_DATA) {
      resolve(null);
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      resolve(null);
      return;
    }

    const width = Math.min(video.videoWidth || MAX_WIDTH, MAX_WIDTH);
    const height = Math.min(video.videoHeight || MAX_HEIGHT, MAX_HEIGHT);
    
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => resolve(blob),
      'image/jpeg',
      quality
    );
  });
}
