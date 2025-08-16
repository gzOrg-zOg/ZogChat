import { themeTexts } from '../constants/themeTexts.js';

export class ThemeManager {
    constructor() {
        this.currentTheme = 'warcraft';
        this.init();
    }

    init() {
        // Charger le thème sauvegardé
        const savedTheme = localStorage.getItem('zogchat-theme') || 'warcraft';
        this.changeTheme(savedTheme);
    }

    changeTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('zogchat-theme', theme);
        
        // Mettre à jour les boutons actifs
        document.querySelectorAll('.theme-selector button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById('theme-' + theme).classList.add('active');
        
        // Mettre à jour les textes
        const texts = themeTexts[theme];
        document.getElementById('mainTitle').textContent = texts.title;
        document.getElementById('subtitle').textContent = texts.subtitle;
        document.getElementById('sectionTitle1').textContent = texts.section1;
        document.getElementById('sectionTitle2').textContent = texts.section2;
        document.getElementById('sectionTitle3').textContent = texts.section3;
        document.getElementById('sectionTitle4').textContent = texts.section4;
        document.getElementById('copyBtn').textContent = texts.copyBtn;
        document.getElementById('connectBtn').textContent = texts.connectBtn;
        document.getElementById('sendBtn').textContent = texts.sendBtn;
        document.getElementById('connectPeerId').placeholder = texts.connectPlaceholder;
        document.getElementById('messageInput').placeholder = texts.messagePlaceholder;
        
        // Mettre à jour les instructions
        const instructionsList = document.getElementById('instructions');
        instructionsList.innerHTML = '';
        texts.instructions.forEach(instruction => {
            const li = document.createElement('li');
            li.textContent = instruction;
            instructionsList.appendChild(li);
        });
        
        // Mettre à jour le titre de la page
        document.title = 'ZogChat - ' + (theme === 'warcraft' ? 'Communication Mystique' : 
                                       theme === 'onepiece' ? 'Pirates du Grand Line' : 
                                       'Réseau Cyberpunk');
        
        // Jouer un son de changement de thème
        if (window.audioManager) {
            window.audioManager.playSound('themeChange');
            // Redémarrer la musique d'ambiance pour le nouveau thème
            setTimeout(() => {
                window.audioManager.restartMusic();
            }, 500);
        }
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    getThemeTexts(theme = null) {
        return themeTexts[theme || this.currentTheme];
    }
}
