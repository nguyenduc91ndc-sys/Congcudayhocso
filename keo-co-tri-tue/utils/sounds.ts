/**
 * Sound utility for KCT (Kéo Co Trí Tuệ)
 */

export const playSound = (type: 'correct' | 'wrong' | 'victory' | 'countdown') => {
    let url = '';
    switch (type) {
        case 'victory':
            url = '/sounds/Am_thanh_chuc_mung_chien_thang-www_tiengdong_com.mp3';
            break;
        case 'wrong':
            url = '/sounds/Am_thanh_tra_loi_sai-www_tiengdong_com.mp3';
            break;
        case 'countdown':
            url = '/sounds/video_dem_nguoc_5s-www_tiengdong_com.mp4'; // Though it is mp4, Audio can often play it if it has an audio track
            break;
        case 'correct':
            // Using a generic success beep if a specific one isn't found, 
            // or we can reuse victory if it's short (but it might be long)
            url = '/sounds/Am_thanh_chuc_mung_chien_thang-www_tiengdong_com.mp3'; 
            break;
    }

    if (url) {
        const audio = new Audio(url);
        audio.volume = 0.5;
        audio.play().catch(e => console.error("Sound play failed:", e));
    }
};
