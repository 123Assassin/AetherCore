import type { UploadedImageInput } from '@package/shared';

export type UploadedImageFileList = {
  [index: number]: File | undefined;
  length?: number;
};

type FileReaderLike = {
  error: unknown;
  onerror: (() => void) | null;
  onload: (() => void) | null;
  readAsDataURL: (file: File) => void;
  result: unknown;
};

type FileReaderConstructor = new () => FileReaderLike;
type UploadedImageResponse = UploadedImageInput & {
  size?: number;
  url?: string;
};

export function readUploadedImages(
  files: UploadedImageFileList | null | undefined
): Promise<UploadedImageInput[]> {
  const imageFiles = getImageFiles(files);

  return Promise.all(imageFiles.map(uploadImageFile));
}

function getImageFiles(files: UploadedImageFileList | null | undefined): File[] {
  const length = typeof files?.length === 'number' ? files.length : 0;
  const imageFiles: File[] = [];

  for (let index = 0; index < length; index += 1) {
    const file = files?.[index];

    if (file?.type.startsWith('image/')) {
      imageFiles.push(file);
    }
  }

  return imageFiles;
}

async function uploadImageFile(file: File): Promise<UploadedImageInput> {
  const formData = new FormData();

  formData.append('file', file);

  const response = await fetch('/api/uploads/images', {
    body: formData,
    credentials: 'include',
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Image upload failed');
  }

  const result = (await response.json()) as UploadedImageResponse;

  if (typeof result.url === 'string' && result.url.trim()) {
    return {
      mimeType: result.mimeType,
      name: result.name,
      ...(typeof result.size === 'number' ? { size: result.size } : {}),
      url: result.url,
    };
  }

  return readUploadedImageAsDataUrl(file);
}

function readUploadedImageAsDataUrl(file: File): Promise<UploadedImageInput> {
  return new Promise((resolve, reject) => {
    const FileReaderClass = (
      globalThis as typeof globalThis & {
        FileReader?: FileReaderConstructor;
      }
    ).FileReader;

    if (!FileReaderClass) {
      reject(new Error('FileReader is unavailable'));
      return;
    }

    const reader = new FileReaderClass();

    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const data = result.split(',')[1] ?? '';

      resolve({
        data,
        mimeType: file.type,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
  });
}
