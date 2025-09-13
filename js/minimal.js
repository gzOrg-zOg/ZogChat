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
    }

    init() {
        this.initializePeer();
        this.bindEvents();
    }

    initializePeer() {
        try {
            this.peer = new Peer();
            
            this.peer.on('open', (id) => {
                document.getElementById('peer-id').value = id;
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

    handleConnection(conn) {
        this.connection = conn;
        
        conn.on('open', () => {
            this.isConnected = true;
            this.updateStatus('Connecté', 'connected');
            this.showChatSection();
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
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const messageContent = document.createElement('div');
        messageContent.textContent = content;
        
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = new Date().toLocaleTimeString();
        
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(messageTime);
        chatContainer.appendChild(messageDiv);
        
        // Scroll vers le bas
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    updateStatus(message, type) {
        const statusElement = document.getElementById('status');
        statusElement.textContent = message;
        statusElement.className = `status ${type}`;
    }

    showChatSection() {
        document.getElementById('chat-section').style.display = 'block';
    }

    hideChatSection() {
        document.getElementById('chat-section').style.display = 'none';
        document.getElementById('chat-container').innerHTML = '';
    }

    bindEvents() {
        // Copier l'ID
        document.getElementById('copy-id').addEventListener('click', () => {
            const peerIdInput = document.getElementById('peer-id');
            peerIdInput.select();
            document.execCommand('copy');
            window.audioManager?.playSound('click');
            
            // Feedback visuel
            const btn = document.getElementById('copy-id');
            const originalText = btn.textContent;
            btn.textContent = 'Copié !';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 1000);
        });

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
        const link = document.createElement('a');
        link.href = data.data;
        link.download = data.name;
        link.textContent = `📎 ${data.name}`;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message received';
        messageDiv.appendChild(link);
        
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = new Date().toLocaleTimeString();
        messageDiv.appendChild(messageTime);
        
        document.getElementById('chat-container').appendChild(messageDiv);
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

    console.log('ZogChat Minimal initialisé ✨');
});
