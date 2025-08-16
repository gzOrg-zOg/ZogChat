import { ThemeManager } from './modules/themes.js';
import { AudioManager } from './modules/audio.js';
import { ChatManager } from './modules/chat.js';

class ZogChat {
    constructor() {
        this.themeManager = null;
        this.audioManager = null;
        this.chatManager = null;
        this.init();
    }

    async init() {
        try {
            // Attendre que le DOM soit chargé
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.init());
                return;
            }

            console.log('🚀 Initialisation de ZogChat...');

            // Initialiser les modules dans l'ordre
            this.themeManager = new ThemeManager();
            this.audioManager = new AudioManager();
            this.chatManager = new ChatManager();

            // Rendre les modules accessibles globalement pour la compatibilité
            window.themeManager = this.themeManager;
            window.audioManager = this.audioManager;
            window.chatManager = this.chatManager;

            // Initialiser les événements des thèmes
            this.bindThemeEvents();

            // Jouer le son de démarrage
            if (this.audioManager) {
                this.audioManager.playSound('startup');
            }

            console.log('✅ ZogChat initialisé avec succès !');
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation de ZogChat:', error);
        }
    }

    bindThemeEvents() {
        // Attendre que le DOM soit chargé
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.bindThemeEvents());
            return;
        }

        const themeButtons = document.querySelectorAll('.theme-selector button');
        
        themeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const theme = button.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
                if (theme) {
                    this.themeManager.changeTheme(theme);
                }
            });
        });

        // Supprimer les onclick inline et les remplacer par des event listeners
        themeButtons.forEach(button => {
            button.removeAttribute('onclick');
        });
    }
}

// Initialiser l'application quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
    new ZogChat();
});

// Exporter pour utilisation externe si nécessaire
window.ZogChat = ZogChat;
