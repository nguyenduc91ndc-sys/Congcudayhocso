/**
 * Firebase Storage utilities for image upload
 */
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebaseConfig';

/**
 * Upload an image file to Firebase Storage
 * @param file - The file to upload
 * @param folder - The folder to store the image in
 * @returns The download URL of the uploaded image
 */
export const uploadImage = async (file: File, folder: string = 'video-thumbnails'): Promise<string | null> => {
    try {
        // Create unique filename with timestamp
        const timestamp = Date.now();
        const fileName = `${folder}/${timestamp}_${file.name}`;
        const storageRef = ref(storage, fileName);

        // Upload file
        const snapshot = await uploadBytes(storageRef, file);

        // Get download URL
        const downloadURL = await getDownloadURL(snapshot.ref);

        return downloadURL;
    } catch (error) {
        console.error('Error uploading image:', error);
        return null;
    }
};

interface CompressImageOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    outputType?: 'image/webp' | 'image/jpeg';
}

const loadImageFile = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const url = URL.createObjectURL(file);

        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Cannot load image'));
        };
        image.src = url;
    });
};

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Cannot compress image'));
        }, type, quality);
    });
};

const getCompressedFileName = (fileName: string, outputType: string): string => {
    const extension = outputType === 'image/webp' ? 'webp' : 'jpg';
    const baseName = fileName.replace(/\.[^.]+$/, '') || 'image';
    return `${baseName}.${extension}`;
};

/**
 * Resize and compress image before upload.
 * Returns the original file when compression is unsupported or not beneficial.
 */
export const compressImageForUpload = async (
    file: File,
    {
        maxWidth = 1280,
        maxHeight = 720,
        quality = 0.82,
        outputType = 'image/webp'
    }: CompressImageOptions = {}
): Promise<File> => {
    try {
        const image = await loadImageFile(file);
        const widthRatio = maxWidth / (image.naturalWidth || maxWidth);
        const heightRatio = maxHeight / (image.naturalHeight || maxHeight);
        const ratio = Math.min(1, widthRatio, heightRatio);
        const width = Math.max(1, Math.round((image.naturalWidth || maxWidth) * ratio));
        const height = Math.max(1, Math.round((image.naturalHeight || maxHeight) * ratio));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');
        if (!context) return file;

        context.drawImage(image, 0, 0, width, height);

        let blob: Blob;
        try {
            blob = await canvasToBlob(canvas, outputType, quality);
        } catch {
            blob = await canvasToBlob(canvas, 'image/jpeg', quality);
            outputType = 'image/jpeg';
        }

        if (blob.size >= file.size) return file;

        return new File([blob], getCompressedFileName(file.name, outputType), {
            type: outputType,
            lastModified: Date.now()
        });
    } catch (error) {
        console.error('Error compressing image:', error);
        return file;
    }
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

/**
 * Validate if file is an image
 */
export const isValidImage = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    return validTypes.includes(file.type);
};
