/**
 * ImgBB Image Upload Service
 * Upload ảnh miễn phí lên ImgBB, trả về URL vĩnh viễn
 */

const IMGBB_API_KEY = '08e744c32edeb3d90a081c4fdd7ef02d';

export interface ImgBBResponse {
    url: string;
    thumb: string;
    medium: string;
    delete_url: string;
}

/**
 * Upload image file to ImgBB
 * @param file - Image file to upload
 * @returns ImgBB response with URLs or null on error
 */
export const uploadToImgBB = async (file: File): Promise<ImgBBResponse | null> => {
    try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('key', IMGBB_API_KEY);

        const response = await fetch('https://api.imgbb.com/1/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            return {
                url: data.data.url,
                thumb: data.data.thumb?.url || data.data.url,
                medium: data.data.medium?.url || data.data.url,
                delete_url: data.data.delete_url || ''
            };
        }

        console.error('ImgBB upload failed:', data);
        return null;
    } catch (error) {
        console.error('Error uploading to ImgBB:', error);
        return null;
    }
};

/**
 * Upload from base64 string
 */
export const uploadBase64ToImgBB = async (base64: string): Promise<ImgBBResponse | null> => {
    try {
        const formData = new FormData();
        // Remove data:image prefix if present
        const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
        formData.append('image', cleanBase64);
        formData.append('key', IMGBB_API_KEY);

        const response = await fetch('https://api.imgbb.com/1/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            return {
                url: data.data.url,
                thumb: data.data.thumb?.url || data.data.url,
                medium: data.data.medium?.url || data.data.url,
                delete_url: data.data.delete_url || ''
            };
        }

        return null;
    } catch (error) {
        console.error('Error uploading base64 to ImgBB:', error);
        return null;
    }
};
