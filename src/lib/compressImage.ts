import imageCompression from 'browser-image-compression';

/**
 * compressEvidencePhoto — client-side compress/resize before upload (D-02).
 *
 * Targets: max 1.5MB, max dimension 1600px, JPEG output (quality ~0.8),
 * offloaded to a web worker so it doesn't block the main thread on low-end
 * Android phones. If the canvas decode fails (unsupported input format), the
 * original file is uploaded unmodified rather than blocking the user
 * (RESEARCH.md §6, UI-SPEC interaction contract step 3).
 */
export async function compressEvidencePhoto(file: File): Promise<File> {
  try {
    return await imageCompression(file, {
      maxSizeMB: 1.5,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.8,
    });
  } catch {
    // Canvas decode failed — fall back to the original file rather than
    // blocking the user's upload.
    return file;
  }
}
