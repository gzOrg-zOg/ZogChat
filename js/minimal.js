// JavaScript minimal pour ZogChat sobre
class MinimalAudioManager {
    constructor() {
        this.audioContext = null;
        this.soundEnabled = true;
        this.musicEnabled = false; // Désactivé par défaut pour version sobre
        this.currentMusic = null;
        this.sounds = {};
    }

    async init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.createMinimalSounds();
            this.updateAudioControls();
        } catch (error) {
            console.warn('Audio non disponible:', error);
        }
    }

    createMinimalSounds() {
        // Sons minimalistes et discrets
        this.sounds = {
            click: () => this.createTone(800, 0.1, 0.05),
            connect: () => this.createTone(600, 0.2, 0.1),
            message: () => this.createTone(400, 0.15, 0.08),
            notification: () => this.createTone(1000, 0.1, 0.05)
        };
    }

    createTone(frequency, duration, volume = 0.1) {
        if (!this.audioContext || !this.soundEnabled) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    playSound(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName]();
        }
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        this.updateAudioControls();
        this.playSound('click');
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        this.updateAudioControls();
        // Pas de musique dans la version sobre
    }

    updateAudioControls() {
        const soundBtn = document.getElementById('sound-toggle');
        const musicBtn = document.getElementById('music-toggle');

        if (soundBtn) {
            soundBtn.textContent = this.soundEnabled ? '🔊' : '🔇';
            soundBtn.classList.toggle('disabled', !this.soundEnabled);
        }

        if (musicBtn) {
            musicBtn.textContent = this.musicEnabled ? '🎵' : '🎶';
            musicBtn.classList.toggle('disabled', !this.musicEnabled);
        }
    }
}

class MinimalThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('zogchat-theme') || 'light';
        this.systemPreference = window.matchMedia('(prefers-color-scheme: dark)');
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.bindEvents();
        
        // Écouter les changements de préférence système
        this.systemPreference.addEventListener('change', (e) => {
            if (this.currentTheme === 'auto') {
                this.applyTheme('auto');
            }
        });
    }

    applyTheme(theme) {
        const body = document.body;
        
        // Nettoyer les anciens thèmes
        body.removeAttribute('data-theme');
        
        if (theme === 'auto') {
            const prefersDark = this.systemPreference.matches;
            body.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            body.setAttribute('data-theme', theme);
        }
        
        this.currentTheme = theme;
        localStorage.setItem('zogchat-theme', theme);
        
        // Mettre à jour les boutons
        this.updateThemeButtons();
    }

    updateThemeButtons() {
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.getElementById(`theme-${this.currentTheme}`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    bindEvents() {
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.id.replace('theme-', '');
                this.applyTheme(theme);
                window.audioManager?.playSound('click');
            });
        });
    }
}

class MinimalChatManager {
    constructor() {
        this.peer = null;
        this.connection = null;
        this.isConnected = false;
        this.shareLink = '';
    }

    init() {
        // Vérifier si on a un ID de session dans l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session');
        
        if (sessionId) {
            this.autoConnectToSession(sessionId);
        } else {
            this.initializePeer();
        }
        
        this.bindEvents();
    }

    initializePeer() {
        try {
            this.peer = new Peer();
            
            this.peer.on('open', (id) => {
                this.generateShareLink(id);
                this.updateStatus('En attente de connexion...', 'waiting');
            });

            this.peer.on('connection', (conn) => {
                this.handleConnection(conn);
            });

            this.peer.on('error', (error) => {
                console.error('Erreur PeerJS:', error);
                this.updateStatus('Erreur de connexion', 'disconnected');
            });

        } catch (error) {
            console.error('Impossible d\'initialiser PeerJS:', error);
            this.updateStatus('Service indisponible', 'disconnected');
        }
    }

    generateShareLink(peerId) {
        const baseUrl = window.location.origin + window.location.pathname;
        this.shareLink = `${baseUrl}?session=${peerId}`;
        
        const shareLinkElement = document.getElementById('share-link');
        if (shareLinkElement) {
            shareLinkElement.value = this.shareLink;
        } else {
            console.warn('Élément share-link non trouvé');
        }
    }

    async autoConnectToSession(sessionId) {
        try {
            this.peer = new Peer();
            
            this.peer.on('open', () => {
                console.log('Connexion automatique à:', sessionId);
                this.connectToPeer(sessionId);
                this.updateStatus('Connexion automatique en cours...', 'waiting');
                
                // Masquer la section de partage puisqu'on se connecte
                const shareSection = document.querySelector('section:first-child');
                if (shareSection) shareSection.style.display = 'none';
            });

            this.peer.on('error', (err) => {
                console.error('Erreur de connexion automatique:', err);
                this.updateStatus('Erreur de connexion automatique', 'disconnected');
            });
        } catch (error) {
            console.error('Erreur de connexion automatique:', error);
            this.updateStatus('Erreur de connexion automatique', 'disconnected');
        }
    }

    handleConnection(conn) {
        this.connection = conn;
        
        conn.on('open', () => {
            this.isConnected = true;
            this.updateStatus('Connecté', 'connected');
            this.showChatSection();
            this.enterChatMode();
            
            // Nettoyer l'URL après connexion
            if (window.location.search) {
                window.history.replaceState({}, document.title, window.location.pathname);
            }
            
            window.audioManager?.playSound('connect');
        });

        conn.on('data', (data) => {
            if (data.type === 'message') {
                this.displayMessage(data.content, 'received');
                window.audioManager?.playSound('message');
            } else if (data.type === 'file') {
                this.handleFileReceived(data);
            }
        });

        conn.on('close', () => {
            this.isConnected = false;
            this.updateStatus('Connexion fermée', 'disconnected');
            this.hideChatSection();
            this.exitChatMode();
        });

        conn.on('error', (error) => {
            console.error('Erreur de connexion:', error);
            this.updateStatus('Erreur de connexion', 'disconnected');
        });
    }

    connectToPeer(peerId) {
        if (!this.peer) return;

        try {
            const conn = this.peer.connect(peerId);
            this.handleConnection(conn);
            this.updateStatus('Connexion en cours...', 'waiting');
        } catch (error) {
            console.error('Erreur de connexion:', error);
            this.updateStatus('Impossible de se connecter', 'disconnected');
        }
    }

    sendMessage(message) {
        if (!this.connection || !this.isConnected) return;

        this.connection.send({
            type: 'message',
            content: message,
            timestamp: Date.now()
        });

        this.displayMessage(message, 'sent');
        window.audioManager?.playSound('click');
    }

    displayMessage(content, type) {
        const chatContainer = document.getElementById('chat-container');
        const welcomeMessage = document.getElementById('welcome-message');
        
        // Masquer le message d'accueil au premier message
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = content;
        
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = new Date().toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(messageTime);
        chatContainer.appendChild(messageDiv);
        
        // Animation d'apparition
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateY(20px)';
        requestAnimationFrame(() => {
            messageDiv.style.transition = 'all 0.3s ease-out';
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateY(0)';
        });
        
        // Scroll vers le bas avec animation fluide
        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: 'smooth'
        });
    }

    updateStatus(message, type) {
        const statusElement = document.getElementById('status');
        statusElement.textContent = message;
        statusElement.className = `status ${type}`;
    }

    showChatSection() {
        document.getElementById('chat-section').style.display = 'flex';
    }

    hideChatSection() {
        document.getElementById('chat-section').style.display = 'none';
        document.getElementById('chat-container').innerHTML = '';
    }

    enterChatMode() {
        // Compacter le header
        const header = document.getElementById('main-header');
        header.classList.add('compact');
        
        // Masquer la section de connexion
        const connectionSection = document.getElementById('connection-section');
        connectionSection.classList.add('hidden');
        
        // Activer le mode chat
        const mainContent = document.getElementById('main-content');
        mainContent.classList.add('chat-mode');
        
        // Mettre à jour les infos de connexion
        const connectionInfo = document.getElementById('connection-info');
        if (connectionInfo && this.connection) {
            connectionInfo.textContent = `Connecté à ${this.connection.peer}`;
        }
    }

    exitChatMode() {
        // Restaurer le header normal
        const header = document.getElementById('main-header');
        header.classList.remove('compact');
        
        // Afficher la section de connexion
        const connectionSection = document.getElementById('connection-section');
        connectionSection.classList.remove('hidden');
        
        // Désactiver le mode chat
        const mainContent = document.getElementById('main-content');
        mainContent.classList.remove('chat-mode');
    }

    disconnect() {
        if (this.connection) {
            this.connection.close();
        }
        this.isConnected = false;
        this.connection = null;
        this.updateStatus('Déconnecté', 'disconnected');
        this.hideChatSection();
        this.exitChatMode();
    }

    bindEvents() {
        // Copier le lien de partage
        const copyLinkBtn = document.getElementById('copy-link');
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', () => {
                const shareLinkInput = document.getElementById('share-link');
                if (shareLinkInput) {
                    shareLinkInput.select();
                    document.execCommand('copy');
                    
                    // Feedback visuel
                    const originalText = copyLinkBtn.innerHTML;
                    copyLinkBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"></path><circle cx="12" cy="12" r="9"></circle></svg> Copié !';
                    setTimeout(() => {
                        copyLinkBtn.innerHTML = originalText;
                    }, 2000);
                    
                    window.audioManager?.playSound('click');
                }
            });
        }

        // Partage WhatsApp
        const whatsappBtn = document.getElementById('share-whatsapp');
        if (whatsappBtn) {
            whatsappBtn.addEventListener('click', () => {
                const message = `Rejoins-moi sur ZogChat pour une conversation sécurisée : ${this.shareLink}`;
                window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
            });
        }

        // Partage Email
        const emailBtn = document.getElementById('share-email');
        if (emailBtn) {
            emailBtn.addEventListener('click', () => {
                const subject = 'Invitation ZogChat - Conversation sécurisée';
                const body = `Salut !\\n\\nJe t'invite à me rejoindre sur ZogChat pour une conversation sécurisée et privée.\\n\\nClique sur ce lien pour te connecter automatiquement :\\n${this.shareLink}\\n\\nÀ bientôt !`;
                window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
            });
        }

        // Partage Telegram
        const telegramBtn = document.getElementById('share-telegram');
        if (telegramBtn) {
            telegramBtn.addEventListener('click', () => {
                const message = `Rejoins-moi sur ZogChat pour une conversation sécurisée : ${this.shareLink}`;
                window.open(`https://t.me/share/url?url=${encodeURIComponent(this.shareLink)}&text=${encodeURIComponent(message)}`, '_blank');
            });
        }

        // Se connecter
        document.getElementById('connect-btn').addEventListener('click', () => {
            const peerId = document.getElementById('connect-id').value.trim();
            if (peerId) {
                this.connectToPeer(peerId);
                window.audioManager?.playSound('click');
            }
        });

        // Envoyer un message
        document.getElementById('send-btn').addEventListener('click', () => {
            const messageInput = document.getElementById('message-input');
            const message = messageInput.value.trim();
            if (message) {
                this.sendMessage(message);
                messageInput.value = '';
            }
        });

        // Envoyer avec Entrée
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('send-btn').click();
            }
        });

        // Connexion avec Entrée
        document.getElementById('connect-id').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('connect-btn').click();
            }
        });

        // Bouton de déconnexion
        document.getElementById('disconnect-btn').addEventListener('click', () => {
            this.disconnect();
            window.audioManager?.playSound('click');
        });

        // Gestion des fichiers (simplifié)
        const fileInput = document.getElementById('file-input');
        const fileDrop = document.getElementById('file-drop');

        fileDrop.addEventListener('click', () => {
            fileInput.click();
        });

        fileDrop.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileDrop.classList.add('dragover');
        });

        fileDrop.addEventListener('dragleave', () => {
            fileDrop.classList.remove('dragover');
        });

        fileDrop.addEventListener('drop', (e) => {
            e.preventDefault();
            fileDrop.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileUpload(files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0]);
            }
        });
    }

    handleFileUpload(file) {
        // Simplification pour la version sobre
        if (file.size > 1024 * 1024) { // 1MB max
            alert('Fichier trop volumineux (max 1MB)');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            if (this.connection && this.isConnected) {
                this.connection.send({
                    type: 'file',
                    name: file.name,
                    data: e.target.result,
                    size: file.size
                });
                this.displayMessage(`📎 Fichier envoyé: ${file.name}`, 'sent');
                window.audioManager?.playSound('notification');
            }
        };
        reader.readAsDataURL(file);
    }

    handleFileReceived(data) {
        const chatContainer = document.getElementById('chat-container');
        const welcomeMessage = document.getElementById('welcome-message');
        
        // Masquer le message d'accueil
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
        
        const link = document.createElement('a');
        link.href = data.data;
        link.download = data.name;
        link.textContent = `📎 ${data.name}`;
        link.className = 'text-blue-600 dark:text-blue-400 hover:underline font-medium';
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message received';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.appendChild(link);
        
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = new Date().toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(messageTime);
        chatContainer.appendChild(messageDiv);
        
        // Animation d'apparition
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateY(20px)';
        requestAnimationFrame(() => {
            messageDiv.style.transition = 'all 0.3s ease-out';
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateY(0)';
        });
        
        // Scroll vers le bas avec animation fluide
        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: 'smooth'
        });
        
        window.audioManager?.playSound('notification');
    }
}

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', async () => {
    // Initialiser les managers
    window.audioManager = new MinimalAudioManager();
    window.themeManager = new MinimalThemeManager();
    window.chatManager = new MinimalChatManager();

    // Initialiser dans l'ordre
    await window.audioManager.init();
    window.themeManager.init();
    window.chatManager.init();

    // Bind les contrôles audio
    document.getElementById('sound-toggle').addEventListener('click', () => {
        window.audioManager.toggleSound();
    });

    document.getElementById('music-toggle').addEventListener('click', () => {
        window.audioManager.toggleMusic();
    });

    // Gestion du bouton fichier
    document.getElementById('file-btn').addEventListener('click', () => {
        document.getElementById('file-input').click();
    });
    
    // Amélioration de l'input message
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    
    // Désactiver le bouton si l'input est vide
    messageInput.addEventListener('input', () => {
        if (messageInput.value.trim()) {
            sendBtn.disabled = false;
            sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            sendBtn.disabled = true;
            sendBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    });
    
    // État initial du bouton
    sendBtn.disabled = true;
    sendBtn.classList.add('opacity-50', 'cursor-not-allowed');
    
    console.log('ZogChat Minimal initialisé ✨ - Version 2.0 avec partage par liens');
    
    // Debug: vérifier que les éléments existent
    console.log('Éléments trouvés:', {
        shareLink: !!document.getElementById('share-link'),
        copyLink: !!document.getElementById('copy-link'),
        whatsapp: !!document.getElementById('share-whatsapp'),
        email: !!document.getElementById('share-email'),
        telegram: !!document.getElementById('share-telegram')
    });
});

// Gestionnaire de menu mobile
class MobileMenuManager {
    constructor() {
        this.menuBtn = document.getElementById('mobile-menu-btn');
        this.menu = document.getElementById('mobile-menu');
        this.isOpen = false;
        this.init();
    }

    init() {
        if (!this.menuBtn || !this.menu) return;

        // Toggle menu
        this.menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Fermer le menu en cliquant ailleurs
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.menu.contains(e.target)) {
                this.close();
            }
        });

        // Synchroniser les boutons de thème mobile avec les principaux
        this.syncThemeButtons();
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.menu.classList.remove('hidden');
        this.menu.classList.add('block');
        this.menuBtn.innerHTML = '✕';
        this.isOpen = true;
    }

    close() {
        this.menu.classList.remove('block');
        this.menu.classList.add('hidden');
        this.menuBtn.innerHTML = '☰';
        this.isOpen = false;
    }

    syncThemeButtons() {
        // Synchroniser les boutons de thème mobile
        const mobileThemeButtons = {
            light: document.getElementById('mobile-theme-light'),
            dark: document.getElementById('mobile-theme-dark'),
            auto: document.getElementById('mobile-theme-auto')
        };

        const desktopThemeButtons = {
            light: document.getElementById('theme-light'),
            dark: document.getElementById('theme-dark'),
            auto: document.getElementById('theme-auto')
        };

        // Écouter les clics sur les boutons mobiles
        Object.keys(mobileThemeButtons).forEach(theme => {
            const mobileBtn = mobileThemeButtons[theme];
            const desktopBtn = desktopThemeButtons[theme];
            
            if (mobileBtn && desktopBtn) {
                mobileBtn.addEventListener('click', () => {
                    desktopBtn.click();
                    this.close();
                });
            }
        });

        // Observer les changements sur les boutons desktop pour synchroniser mobile
        const observer = new MutationObserver(() => {
            Object.keys(desktopThemeButtons).forEach(theme => {
                const desktopBtn = desktopThemeButtons[theme];
                const mobileBtn = mobileThemeButtons[theme];
                
                if (desktopBtn && mobileBtn) {
                    if (desktopBtn.classList.contains('bg-blue-600')) {
                        mobileBtn.classList.add('bg-blue-600', 'text-white');
                        mobileBtn.classList.remove('hover:bg-slate-100', 'dark:hover:bg-slate-700');
                    } else {
                        mobileBtn.classList.remove('bg-blue-600', 'text-white');
                        mobileBtn.classList.add('hover:bg-slate-100', 'dark:hover:bg-slate-700');
                    }
                }
            });
        });

        Object.values(desktopThemeButtons).forEach(btn => {
            if (btn) {
                observer.observe(btn, { attributes: true, attributeFilter: ['class'] });
            }
        });
    }

    updateConnectionInfo(peerId) {
        const mobileConnectionInfo = document.getElementById('mobile-connection-info');
        const mobilePeerDisplay = document.getElementById('mobile-peer-display');
        
        if (mobileConnectionInfo && mobilePeerDisplay) {
            if (peerId) {
                mobileConnectionInfo.style.display = 'flex';
                mobilePeerDisplay.textContent = peerId;
            } else {
                mobileConnectionInfo.style.display = 'none';
            }
        }
    }
}

// Initialiser le menu mobile
document.addEventListener('DOMContentLoaded', () => {
    window.mobileMenu = new MobileMenuManager();
});
