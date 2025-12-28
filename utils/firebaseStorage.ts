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
