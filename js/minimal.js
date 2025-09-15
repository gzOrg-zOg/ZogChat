// Configuration de l'application
const APP_CONFIG = {
    version: '2.10.1'
};

// JavaScript minimal pour QChat sobre
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

        if (soundBtn) {
            soundBtn.textContent = this.soundEnabled ? '🔊' : '🔇';
            soundBtn.classList.toggle('disabled', !this.soundEnabled);
        }
    }
}

class MinimalThemeManager {
    constructor() {
        // Récupérer le thème sauvegardé ou utiliser le mode sombre par défaut
        const savedTheme = localStorage.getItem('qchat-theme');
        if (savedTheme) {
            this.isDark = savedTheme === 'dark';
        } else {
            // Mode sombre par défaut
            this.isDark = true;
        }
    }

    init() {
        this.applyTheme();
        this.updateIcons();
        this.bindEvents();
    }

    applyTheme() {
        const body = document.body;
        
        if (this.isDark) {
            body.classList.add('dark');
            // Forcer le background noir en mode sombre
            body.style.setProperty('background-color', 'black', 'important');
        } else {
            body.classList.remove('dark');
            // Remettre le background blanc en mode clair
            body.style.setProperty('background-color', 'white', 'important');
        }
        
        // Sauvegarder la préférence
        localStorage.setItem('qchat-theme', this.isDark ? 'dark' : 'light');
        
        this.updateIcons();
    }

    toggleTheme() {
        this.isDark = !this.isDark;
        this.applyTheme();
        window.audioManager?.playSound('click');
    }

    updateIcons() {
        const themeToggle = document.getElementById('theme-toggle');
        
        const icon = this.isDark ? '☀️' : '🌙';
        const title = this.isDark ? 'Passer au thème clair' : 'Passer au thème sombre';
        
        if (themeToggle) {
            themeToggle.textContent = icon;
            themeToggle.title = title;
        }
    }

    bindEvents() {
        const themeToggle = document.getElementById('theme-toggle');
        
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    }
}

class MinimalChatManager {
    constructor() {
        this.peer = null;
        this.connection = null;
        this.isConnected = false;
        this.shareLink = '';
        this.username = '';
        this.remoteUsername = '';
        this.inviterName = '';
        this.expectedRecipient = '';
        this.currentStep = 'username'; // 'username', 'share', 'chat'
        this.isCreator = false;
        this.isGuest = false;
        this.sessionIdToConnect = null;
        this.failedAttempts = 0;
        this.maxAttempts = 3;
    }

    init() {
        // Vérifier si on a un ID de session dans l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session');
        const inviterName = urlParams.get('inviter');
        
        if (sessionId) {
            // Invité se connecte via le lien
            this.isCreator = false;
            this.inviterName = inviterName ? decodeURIComponent(inviterName) : null;
            this.autoConnectToSession(sessionId);
        } else {
            // Commencer par l'étape de saisie du nom
            this.showUsernameStep();
        }
        
        this.bindEvents();
    }

    showUsernameStep() {
        this.currentStep = 'username';
        document.getElementById('username-section').classList.remove('hidden');
        document.getElementById('share-section').classList.add('hidden');
        document.getElementById('chat-section').classList.add('hidden');
    }

    showShareStep() {
        this.currentStep = 'share';
        document.getElementById('username-section').classList.add('hidden');
        document.getElementById('share-section').classList.remove('hidden');
        document.getElementById('chat-section').classList.add('hidden');
        
        // Personnaliser les messages de partage
        this.updateShareMessages();
        
        // Initialiser PeerJS maintenant qu'on a le nom
        this.initializePeer();
    }

    updateShareMessages() {
        const shareTitle = document.getElementById('share-title');
        const shareSubtitle = document.getElementById('share-subtitle');
        
        if (shareTitle && shareSubtitle) {
            // Message personnalisé avec le nom de l'utilisateur
            shareTitle.textContent = `Bonjour ${this.username} !`;
            
            // Message selon qu'on a un destinataire spécifique ou non
            if (this.expectedRecipient && this.expectedRecipient.trim()) {
                shareSubtitle.textContent = `Vous pouvez maintenant transmettre ce lien de communication sécurisée à ${this.expectedRecipient} :`;
            } else {
                shareSubtitle.textContent = `Vous pouvez maintenant transmettre ce lien de communication sécurisée à votre destinataire :`;
            }
        }
    }

    showChatStep() {
        this.currentStep = 'chat';
        document.getElementById('connection-section').classList.add('hidden');
        document.getElementById('chat-section').classList.remove('hidden');
        this.enterChatMode();
        
        // Mettre à jour les informations utilisateur
        this.updateUserInfo();
        
        // S'assurer que le statut est affiché même pour le maître
        if (this.isCreator && this.isConnected) {
            this.updateConnectionStatus('connected', true);
        }
        
        // Mettre le focus automatiquement dans le champ de saisie
        setTimeout(() => {
            const messageInput = document.getElementById('message-input');
            if (messageInput) {
                messageInput.focus();
            }
        }, 300);
    }

    initializePeer() {
        try {
            this.peer = new Peer();
            
            this.peer.on('open', (id) => {
                this.generateShareLink(id);
                this.updateStatus('En attente de connexion...', 'waiting');
                
                // Marquer comme créateur
                this.isCreator = true;
                
                // Mettre à jour les informations utilisateur et statut
                this.updateUserInfo();
                this.updateConnectionStatus('waiting');
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

    initializePeerWithId(sessionId) {
        try {
            // Créer un peer avec l'ID spécifique pour restaurer la session du créateur
            this.peer = new Peer(sessionId);
            
            this.peer.on('open', (id) => {
                console.log('🔄 Session restaurée pour le créateur:', id);
                this.generateShareLink(id);
                this.updateStatus('En attente de connexion...', 'waiting');
                
                // Protection F5 temporairement désactivée pour éviter l'erreur
                // this.enableUnloadProtection();
            });

            this.peer.on('connection', (conn) => {
                this.handleConnection(conn);
            });

            this.peer.on('error', (error) => {
                console.error('Erreur lors de la restauration:', error);
                // Si l'ID est déjà pris, créer une nouvelle session
                console.log('🔄 ID occupé, création d\'une nouvelle session...');
                localStorage.removeItem('zogchat_creator_session');
                this.initializePeer();
            });

        } catch (error) {
            console.error('Impossible de restaurer la session:', error);
            this.updateStatus('Erreur de restauration', 'disconnected');
        }
    }

    generateShareLink(peerId) {
        // Utiliser systématiquement l'URL de l'host du créateur
        const baseUrl = window.location.origin + window.location.pathname;
        
        this.shareLink = `${baseUrl}?session=${peerId}&inviter=${encodeURIComponent(this.username)}`;
        
        const shareLinkElement = document.getElementById('share-link');
        if (shareLinkElement) {
            shareLinkElement.value = this.shareLink;
        } else {
            console.warn('Élément share-link non trouvé');
        }
        
        console.log('🔗 Lien de partage généré:', this.shareLink);
    }

    async autoConnectToSession(sessionId) {
        // D'abord demander le nom d'utilisateur pour l'invité
        this.showUsernameStep();
        this.sessionIdToConnect = sessionId;
        this.isGuest = true;
        
        // Personnaliser l'interface pour l'invité
        this.personalizeGuestInterface();
    }
    
    personalizeGuestInterface() {
        const usernameSection = document.getElementById('username-section');
        if (!usernameSection) return;
        
        // Modifier le titre
        const title = usernameSection.querySelector('h2');
        if (title) {
            title.textContent = 'Rejoindre la conversation';
        }
        
        // Modifier la description
        const description = usernameSection.querySelector('p');
        if (description && this.inviterName) {
            description.innerHTML = `<strong>${this.inviterName}</strong> vous invite à rejoindre la conversation sécurisée.<br>Confirmez votre nom :`;
        } else if (description) {
            description.textContent = 'Vous êtes invité à rejoindre une conversation sécurisée.';
        }
        
        // Modifier le texte du bouton
        const createBtn = document.getElementById('create-session-btn');
        if (createBtn) {
            createBtn.textContent = 'Rejoindre la conversation';
        }
        
        // Modifier le label du champ
        const label = usernameSection.querySelector('label[for="username-input"]');
        if (label) {
            label.textContent = 'Votre nom';
        }
    }
    
    connectAsGuest() {
        try {
            this.peer = new Peer();
            
            this.peer.on('open', () => {
                console.log('Connexion automatique à:', this.sessionIdToConnect);
                this.connectToPeer(this.sessionIdToConnect);
                this.updateStatus('Connexion automatique en cours...', 'waiting');
                this.updateConnectionStatus('connecting');
                
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
            this.updateConnectionStatus('connected', true); // Avec animation de pulsation
            this.showChatStep();
            
            // Envoyer le nom d'utilisateur au correspondant
            if (this.username) {
                conn.send({
                    type: 'username',
                    username: this.username
                });
                console.log('👤 Nom envoyé au correspondant:', this.username);
            }
            
            // Mettre à jour le titre si on a déjà le nom du correspondant
            this.updateChatTitle();
            
            // Garder le paramètre session dans l'URL pour permettre le rechargement
            // (Commenté pour conserver la session lors du rechargement)
            // if (window.location.search) {
            //     window.history.replaceState({}, document.title, window.location.pathname);
            // }
            
            window.audioManager?.playSound('connect');
        });

        conn.on('data', (data) => {
            if (data.type === 'message') {
                this.displayMessage(data.content, 'received', data.username);
                window.audioManager?.playSound('message');
            } else if (data.type === 'file') {
                this.handleFileReceived(data);
            } else if (data.type === 'username') {
                // Recevoir le nom d'utilisateur du correspondant
                this.remoteUsername = data.username;
                console.log('👤 Nom du correspondant reçu:', this.remoteUsername);
                
                // Vérifier la sécurité si un destinataire est attendu
                if (this.expectedRecipient && this.isCreator) {
                    const normalizedExpected = this.expectedRecipient.toLowerCase().replace(/\s+/g, '');
                    const normalizedReceived = this.remoteUsername.toLowerCase().replace(/\s+/g, '');
                    
                    if (normalizedExpected !== normalizedReceived) {
                        this.failedAttempts++;
                        console.warn(`🚫 Connexion refusée - nom incorrect (${this.failedAttempts}/${this.maxAttempts}):`, this.remoteUsername);
                        
                        if (this.failedAttempts >= this.maxAttempts) {
                            this.updateStatus(`Connexion fermée - ${this.maxAttempts} tentatives échouées`, 'disconnected');
                            conn.close();
                            // Fermer définitivement la session
                            if (this.peer) {
                                this.peer.destroy();
                                this.peer = null;
                            }
                            return;
                        } else {
                            const remaining = this.maxAttempts - this.failedAttempts;
                            this.updateStatus(`Nom incorrect - ${remaining} tentative(s) restante(s)`, 'waiting');
                            conn.close();
                            return;
                        }
                    } else {
                        console.log('✅ Connexion autorisée - nom vérifié:', this.remoteUsername);
                        this.failedAttempts = 0; // Réinitialiser les tentatives en cas de succès
                    }
                }
                
                this.updateChatTitle();
            }
        });

        conn.on('close', () => {
            this.isConnected = false;
            
            // Si c'est une fermeture due à un nom incorrect et qu'il reste des tentatives
            if (this.failedAttempts > 0 && this.failedAttempts < this.maxAttempts) {
                // Ne pas sortir du mode chat, juste attendre une nouvelle connexion
                console.log('🔄 Attente d\'une nouvelle tentative de connexion...');
                // Garder le chat visible avec les messages existants
            } else {
                // Fermeture normale ou définitive
            this.updateStatus('Connexion fermée', 'disconnected');
            this.updateConnectionStatus('disconnected');
                this.hideChatSection(true); // Vider les messages lors d'une fermeture définitive
            this.exitChatMode();
            }
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
            username: this.username,
            timestamp: Date.now()
        });

        this.displayMessage(message, 'sent', this.username);
        window.audioManager?.playSound('click');
    }

    displayMessage(content, type, username = null) {
        const chatContainer = document.getElementById('chat-container');
        const welcomeMessage = document.getElementById('welcome-message');
        
        // Vérifier si l'utilisateur était en bas avant d'ajouter le message
        const wasAtBottom = chatContainer.scrollTop + chatContainer.clientHeight >= chatContainer.scrollHeight - 10;
        
        // Masquer le message d'accueil au premier message
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
        
        // Vérifier si le message précédent est du même type pour les arrondis
        const messages = chatContainer.querySelectorAll('.message');
        const lastMessage = messages[messages.length - 1];
        const isConsecutive = lastMessage && lastMessage.classList.contains(type);
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        // Le nom est déjà affiché dans le titre, pas besoin de le répéter à chaque message
        
        const messageContent = document.createElement('div');
        
        // Appliquer les arrondis adaptatifs
        let roundingClass = 'message-content px-4 py-2 max-w-xs break-words';
        if (type === 'sent') {
            roundingClass += isConsecutive 
                ? ' rounded-br-md' 
                : '';
        } else {
            roundingClass += isConsecutive 
                ? ' bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-2xl rounded-bl-md' 
                : ' bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-2xl';
        }
        
        messageContent.className = roundingClass;
        messageContent.innerHTML = content;
        
        
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time text-xs text-slate-500 dark:text-slate-400 mt-1';
        messageTime.textContent = new Date().toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(messageTime);
        
        // Mettre à jour l'arrondi du message précédent s'il est du même type
        if (isConsecutive && lastMessage) {
            const lastMessageContent = lastMessage.querySelector('.message-content');
            if (lastMessageContent && type === 'sent') {
                // Le message précédent devient "milieu de conversation" (pas d'arrondi en bas à droite)
                lastMessageContent.className = lastMessageContent.className.replace('rounded-2xl', 'rounded-2xl rounded-br-md');
            } else if (lastMessageContent && type === 'received') {
                // Le message précédent devient "milieu de conversation" (pas d'arrondi en bas à gauche)
                lastMessageContent.className = lastMessageContent.className.replace('rounded-2xl', 'rounded-2xl rounded-bl-md');
            }
        }
        
        chatContainer.appendChild(messageDiv);
        
        // Animation d'apparition
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateY(20px)';
        requestAnimationFrame(() => {
            messageDiv.style.transition = 'all 0.3s ease-out';
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateY(0)';
        });
        
        // Scroll automatique seulement si l'utilisateur était en bas
        if (wasAtBottom) {
            setTimeout(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
            }, 100);
        }
    }

    updateStatus(message, type) {
        const statusElement = document.getElementById('status');
        statusElement.textContent = message;
        statusElement.className = `status ${type}`;
    }

    showChatSection() {
        document.getElementById('chat-section').style.display = 'flex';
    }

    hideChatSection(clearMessages = true) {
        document.getElementById('chat-section').style.display = 'none';
        
        // Seulement vider le chat si demandé (pas lors des tentatives de reconnexion)
        if (clearMessages) {
        document.getElementById('chat-container').innerHTML = '';
        }
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
            this.connection = null;
        }
        this.updateConnectionStatus('disconnected');
        
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        
        this.isConnected = false;
        this.shareLink = '';
        
        // Réinitialiser le statut de créateur
        this.isCreator = false;
        
        // Vider le chat
        const chatContainer = document.getElementById('chat-container');
        if (chatContainer) {
            chatContainer.innerHTML = `
                <!-- Indicateur de frappe -->
                <div class="hidden items-center gap-2 mb-4 opacity-75" id="typing-indicator">
                    <div class="flex gap-1">
                        <div class="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                        <div class="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                        <div class="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                    </div>
                    <span class="text-sm text-slate-500 dark:text-slate-400">En train d'écrire...</span>
                </div>
                
                <!-- Message d'accueil -->
                <div class="flex flex-col items-center justify-center h-full text-center" id="welcome-message">
                    <div class="text-6xl mb-4">💬</div>
                    <h3 class="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">Conversation sécurisée</h3>
                    <p class="text-slate-500 dark:text-slate-400 max-w-md">Vos messages sont chiffrés de bout en bout. Seuls vous et votre correspondant pouvez les lire.</p>
                </div>
            `;
        }
        
        // Retourner à l'étape de partage pour créer une nouvelle session
        this.showShareStep();
        this.exitChatMode();
    }

    createSession() {
        const usernameInput = document.getElementById('username-input');
        this.username = usernameInput.value.trim();
        
        if (this.username.length >= 2) {
            console.log(`👤 ${this.isGuest ? 'Connexion' : 'Création de session'} pour: ${this.username}`);
            
            if (this.isGuest) {
                // Si c'est un invité, se connecter directement
                this.connectAsGuest();
            } else {
                // Si c'est le créateur, récupérer le nom du destinataire
                const recipientInput = document.getElementById('recipient-input');
                if (recipientInput) {
                    this.expectedRecipient = recipientInput.value.trim();
                    if (this.expectedRecipient) {
                        console.log(`🔒 Destinataire attendu: ${this.expectedRecipient}`);
                    }
                }
                
                // Aller à l'étape de partage
                this.showShareStep();
            }
            
            window.audioManager?.playSound('click');
        }
    }

    bindEvents() {
        // Gestion de la saisie du nom d'utilisateur
        const usernameInput = document.getElementById('username-input');
        const createSessionBtn = document.getElementById('create-session-btn');
        
        console.log('🔍 Éléments trouvés:', { usernameInput: !!usernameInput, createSessionBtn: !!createSessionBtn });
        
        if (usernameInput && createSessionBtn) {
            // Fonction pour vérifier et mettre à jour l'état du bouton
            const updateButtonState = () => {
                const username = usernameInput.value.trim();
                console.log('👤 Nom saisi:', username, 'Longueur:', username.length);
                if (username.length >= 2) {
                    createSessionBtn.disabled = false;
                    createSessionBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                    
                    // Afficher le champ destinataire pour les créateurs
                    if (!this.isGuest) {
                        const recipientField = document.getElementById('recipient-field');
                        if (recipientField) {
                            recipientField.classList.remove('hidden');
                        }
                    }
                    
                    console.log('✅ Bouton activé');
                } else {
                    createSessionBtn.disabled = true;
                    createSessionBtn.classList.add('opacity-50', 'cursor-not-allowed');
                    
                    // Masquer le champ destinataire
                    const recipientField = document.getElementById('recipient-field');
                    if (recipientField) {
                        recipientField.classList.add('hidden');
                    }
                    
                    console.log('❌ Bouton désactivé');
                }
            };
            
            // Vérifier l'état initial (au cas où le nom serait pré-rempli)
            updateButtonState();
            
            // Écouter les changements
            usernameInput.addEventListener('input', updateButtonState);
            
            usernameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !createSessionBtn.disabled) {
                    this.createSession();
                }
            });
            
            createSessionBtn.addEventListener('click', () => {
                this.createSession();
            });
        }
        
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


        // Partage Email
        const emailBtn = document.getElementById('share-email');
        if (emailBtn) {
            emailBtn.addEventListener('click', () => {
                const subject = 'Invitation QChat - Communication sécurisée';
                const body = `Bonjour,

Veuillez trouver ci-dessous le lien de communication QChat pour une conversation sécurisée et privée.

Cliquez sur ce lien ou copiez-le dans un navigateur pour que nous puissions échanger en toute confidentialité :

${this.shareLink || 'Lien non disponible'}

Merci pour votre collaboration,`;
                console.log('📧 Email avec lien:', this.shareLink);
                window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
            });
        }



        // Envoyer un message
        document.getElementById('send-btn').addEventListener('click', () => {
            const messageInput = document.getElementById('message-input');
            const message = messageInput.value.trim();
            if (message) {
                this.sendMessage(message);
                messageInput.value = '';
                
                // Remettre le focus dans le champ de saisie
                setTimeout(() => {
                    messageInput.focus();
                }, 50);
            }
        });

        // Envoyer avec Entrée
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('send-btn').click();
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
                
                // Créer un lien de téléchargement pour l'expéditeur aussi
                this.displayFileSent({
                    name: file.name,
                    data: e.target.result,
                    size: file.size
                });
                window.audioManager?.playSound('notification');
            }
        };
        reader.readAsDataURL(file);
    }

    displayFileSent(data) {
        const chatContainer = document.getElementById('chat-container');
        const welcomeMessage = document.getElementById('welcome-message');
        
        // Vérifier si l'utilisateur était en bas avant d'ajouter le message
        const wasAtBottom = chatContainer.scrollTop + chatContainer.clientHeight >= chatContainer.scrollHeight - 10;
        
        // Masquer le message d'accueil
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
        
        // Créer un lien de téléchargement pour l'expéditeur
        const link = document.createElement('a');
        link.href = data.data;
        link.download = data.name;
        link.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32" class="inline mr-1"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v15c0 4 3 6 6 6s6-2 6-6V6c0-3-2-4-4-4s-4 1-4 4v17c0 1 1 2 2 2s2-1 2-2V9"/></svg>${data.name}`;
        link.className = 'text-blue-200 hover:text-blue-100 hover:underline font-medium';
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message sent';
        
        // Vérifier si le message précédent est du même type pour les arrondis
        const messages = chatContainer.querySelectorAll('.message');
        const lastMessage = messages[messages.length - 1];
        const isConsecutive = lastMessage && lastMessage.classList.contains('sent');
        
        const messageContent = document.createElement('div');
        let roundingClass = 'message-content px-4 py-2 max-w-xs break-words';
        roundingClass += isConsecutive ? ' rounded-br-md' : '';
        
        messageContent.className = roundingClass;
        messageContent.appendChild(link);
        
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time text-xs text-slate-500 dark:text-slate-400 mt-1';
        messageTime.textContent = new Date().toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(messageTime);
        chatContainer.appendChild(messageDiv);
        
        // Scroll automatique si l'utilisateur était en bas
        if (wasAtBottom) {
            setTimeout(() => {
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }, 10);
        }
    }

    handleFileReceived(data) {
        const chatContainer = document.getElementById('chat-container');
        const welcomeMessage = document.getElementById('welcome-message');
        
        // Vérifier si l'utilisateur était en bas avant d'ajouter le message
        const wasAtBottom = chatContainer.scrollTop + chatContainer.clientHeight >= chatContainer.scrollHeight - 10;
        
        // Masquer le message d'accueil
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
        
        const link = document.createElement('a');
        link.href = data.data;
        link.download = data.name;
        link.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32" class="inline mr-1"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v15c0 4 3 6 6 6s6-2 6-6V6c0-3-2-4-4-4s-4 1-4 4v17c0 1 1 2 2 2s2-1 2-2V9"/></svg>${data.name}`;
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
        
        // Scroll automatique seulement si l'utilisateur était en bas
        if (wasAtBottom) {
            setTimeout(() => {
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }, 100);
        }
        
        window.audioManager?.playSound('notification');
    }

    updateChatTitle() {
        // Mettre à jour le titre du chat avec le nom du correspondant
        const chatTitle = document.querySelector('#chat-section h2 span');
        if (chatTitle && this.remoteUsername) {
            chatTitle.textContent = `Conversation avec ${this.remoteUsername}`;
            console.log('📝 Titre mis à jour:', `Conversation avec ${this.remoteUsername}`);
        }
        
        
        // Mettre à jour le nom dans la barre de conversation mobile
        const chatPeerNameMobile = document.getElementById('chat-peer-name-mobile');
        if (chatPeerNameMobile && this.remoteUsername) {
            chatPeerNameMobile.textContent = this.remoteUsername;
            console.log('💬 Nom conversation mobile mis à jour:', this.remoteUsername);
        }
    }

    updateConnectionStatus(status, animate = false) {
        const statusIndicator = document.getElementById('connection-status');
        if (!statusIndicator) return;

        // Supprimer toutes les classes d'animation et de statut
        statusIndicator.classList.remove('status-connecting', 'status-pulse', 'status-connected', 'status-waiting', 'status-disconnected');

        switch (status) {
            case 'connected':
                statusIndicator.textContent = '🟢';
                statusIndicator.classList.add('status-connected');
                statusIndicator.title = 'Connecté';
                if (animate) {
                    statusIndicator.classList.add('status-pulse');
                    setTimeout(() => statusIndicator.classList.remove('status-pulse'), 3000);
                }
                break;
            case 'waiting':
            case 'connecting':
                statusIndicator.textContent = '🟡';
                statusIndicator.classList.add('status-waiting', 'status-connecting');
                statusIndicator.title = 'Connexion en cours...';
                break;
            case 'disconnected':
            default:
                statusIndicator.textContent = '🔴';
                statusIndicator.classList.add('status-disconnected');
                statusIndicator.title = 'Déconnecté';
                break;
        }

        console.log('🔄 Statut de connexion mis à jour:', status);
    }

    updateUserInfo() {
        const userRole = document.getElementById('user-role');
        const userName = document.getElementById('user-name');
        
        if (userRole && userName) {
            // Déterminer le rôle
            const role = this.isCreator ? 'Maître' : 'Invité';
            userRole.textContent = role;
            
            // Afficher le nom d'utilisateur
            userName.textContent = this.username || 'Non défini';
            
            console.log('👤 Informations utilisateur mises à jour:', { role, username: this.username });
        }
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


    // Gestion du bouton fichier
    document.getElementById('file-btn').addEventListener('click', () => {
        document.getElementById('file-input').click();
    });
    
    // Amélioration de l'input message
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    
    if (messageInput && sendBtn) {
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
        
        // Focus automatique quand on clique dans la zone de chat
        const chatContainer = document.getElementById('chat-container');
        if (chatContainer) {
            chatContainer.addEventListener('click', () => {
                messageInput.focus();
            });
        }
    }
    
    // Initialiser les informations de version
    initVersionInfo();
    
    console.log(`QChat Minimal initialisé ✨ - Version ${APP_CONFIG.version} avec partage par liens`);
    
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
        // Plus besoin de synchronisation complexe avec le nouveau système simplifié
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

    // Afficher un message dans le chat avec scroll automatique
    displayMessage(content, type = 'received') {
        const chatContainer = document.getElementById('chat-container');
        if (!chatContainer) return;

        // Masquer le message de bienvenue s'il existe
        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }

        // Créer l'élément message
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type} flex items-end gap-2 mb-3 animate-fadeIn`;
        
        // Contenu du message avec heure
        const now = new Date();
        const timeStr = now.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        // Déterminer les arrondis selon la position dans la conversation
        const messages = chatContainer.querySelectorAll('.message');
        const lastMessage = messages[messages.length - 1];
        const isConsecutive = lastMessage && lastMessage.classList.contains(type);
        
        let roundingClass = 'rounded-lg';
        if (type === 'sent') {
            roundingClass = isConsecutive ? 'rounded-lg rounded-br-md' : 'rounded-lg';
        } else {
            roundingClass = isConsecutive ? 'rounded-lg rounded-bl-md' : 'rounded-lg';
        }

        messageDiv.innerHTML = `
            <div class="message-content max-w-xs lg:max-w-md px-3 py-2 ${roundingClass} ${
                type === 'sent' 
                    ? 'text-white' 
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
            }">
                ${content}
            </div>
            <div class="message-time text-xs text-slate-500 dark:text-slate-400 min-w-fit">
                ${timeStr}
            </div>
        `;

        // Ajouter le message au container
        chatContainer.appendChild(messageDiv);
        
        
        console.log('💬 Message ajouté:', { content, type, container: !!chatContainer });

        // Scroll automatique vers le bas
        this.scrollToBottom();
    }

    // Gérer la réception de fichiers
    handleFileReceived(data) {
        console.log('Fichier reçu:', data);
        // Pour l'instant, afficher comme message texte
        this.displayMessage(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32" class="inline mr-1"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v15c0 4 3 6 6 6s6-2 6-6V6c0-3-2-4-4-4s-4 1-4 4v17c0 1 1 2 2 2s2-1 2-2V9"/></svg>Fichier reçu: ${data.name || 'fichier'}`, 'received');
    }

    // Scroll automatique vers le bas du chat
    scrollToBottom() {
        const chatContainer = document.getElementById('chat-container');
        if (chatContainer) {
            // Attendre que le DOM soit mis à jour, puis scroller
            setTimeout(() => {
                // Utiliser scrollTop pour une meilleure compatibilité
                chatContainer.scrollTop = chatContainer.scrollHeight;
                
                console.log('📜 Scroll vers le bas:', {
                    scrollTop: chatContainer.scrollTop,
                    scrollHeight: chatContainer.scrollHeight,
                    clientHeight: chatContainer.clientHeight
                });
            }, 10);
        }
    }

    // Envoyer un message
    sendMessage(content) {
        if (!this.connection || !this.isConnected) {
            console.warn('Pas de connexion active pour envoyer le message');
            return;
        }

        try {
            // Envoyer le message via PeerJS
            this.connection.send({
                type: 'message',
                content: content
            });

            // Afficher le message localement
            this.displayMessage(content, 'sent');
            
            console.log('Message envoyé:', content);
            window.audioManager?.playSound('send');
        } catch (error) {
            console.error('Erreur lors de l\'envoi du message:', error);
        }
    }

}

// Fonction pour initialiser les informations de version
function initVersionInfo() {
    const appVersion = document.getElementById('app-version');
    
    if (appVersion) {
        appVersion.textContent = `v${APP_CONFIG.version}`;
    }
}

// Fonction pour détecter le navigateur
function getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = 'Inconnu';
    
    if (ua.includes('Chrome') && !ua.includes('Edg')) {
        browser = 'Chrome';
    } else if (ua.includes('Firefox')) {
        browser = 'Firefox';
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
        browser = 'Safari';
    } else if (ua.includes('Edg')) {
        browser = 'Edge';
    } else if (ua.includes('Opera')) {
        browser = 'Opera';
    }
    
    return browser;
}

// Initialiser le menu mobile
document.addEventListener('DOMContentLoaded', () => {
    window.mobileMenu = new MobileMenuManager();
    
    // Initialiser le chat manager seulement si pas déjà fait
    if (!window.chatManager) {
        window.chatManager = new MinimalChatManager();
        window.chatManager.init();
        console.log('✅ QChat initialisé');
    }
});
