/* =============================================
   INTERNATIONALIZATION (i18n)
   Hỗ trợ đa ngôn ngữ (Tiếng Việt / English)
   ============================================= */

class I18n {
    constructor() {
        this.currentLang = localStorage.getItem('denhung_lang') || 'vi';
        this.langData = {};
        this.elements = document.querySelectorAll('[data-i18n]');


        this.loadLanguage(this.currentLang);
    }



    async loadLanguage(lang) {
        try {
            const response = await fetch(`lang/${lang}.json`);
            this.langData = await response.json();
            this.updateUI();

            // Update button text
            const btn = document.getElementById('lang-toggle');
            if (btn) btn.innerHTML = lang === 'vi' ? '🇬🇧 EN' : '🇻🇳 VI';

            // Save preference
            localStorage.setItem('denhung_lang', lang);
            this.currentLang = lang;

            // Update global data if needed (complex)
            // For simple app, we might reload page or replace text manually

        } catch (e) {
            console.error('Error loading language:', e);
        }
    }

    switchLanguage(lang) {
        this.loadLanguage(lang);
    }

    updateUI() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (this.langData[key]) {
                if (el.placeholder) {
                    el.placeholder = this.langData[key];
                } else {
                    el.innerHTML = this.langData[key];
                }
            }
        });

        // Update dynamic content via event if needed
        document.dispatchEvent(new CustomEvent('langChanged', { detail: { lang: this.currentLang, data: this.langData } }));
    }

    // Helper to get text by key
    t(key) {
        return this.langData[key] || key;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.i18n = new I18n();
});
