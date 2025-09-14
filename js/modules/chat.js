export class ChatManager {
    constructor() {
        this.peer = null;
        this.connection = null;
        this.isConnected = false;
        this.init();
    }

    init() {
        this.createPeer();
        this.bindChatEvents();
        this.setupDragAndDrop();
    }

    createPeer() {
        this.peer = new Peer();
        
        this.peer.on('open', (id) => {
            document.getElementById('myPeerId').textContent = id;
            this.updateStatus('disconnected', window.themeManager?.getThemeTexts().statusDisconnected);
        });

        this.peer.on('connection', (conn) => {
            this.handleConnection(conn);
        });

        this.peer.on('error', (err) => {
            console.error('Erreur PeerJS:', err);
            this.updateStatus('disconnected', 'Erreur de connexion');
        });
    }

    handleConnection(conn) {
        this.connection = conn;
        this.isConnected = true;
        
        conn.on('open', () => {
            this.updateStatus('connected', window.themeManager?.getThemeTexts().statusConnected + conn.peer);
            this.enableChat();
            this.displayMessage('Système', 'Alliance forgée ! Vous pouvez maintenant échanger des messages.', 'system');
        });

        conn.on('data', (data) => {
            this.handleIncomingData(data);
        });

        conn.on('close', () => {
            this.handleDisconnection();
        });

        conn.on('error', (err) => {
            console.error('Erreur de connexion:', err);
            this.handleDisconnection();
        });
    }

    handleIncomingData(data) {
        if (data.type === 'message') {
            this.displayMessage('Allié', data.content, 'received');
        } else if (data.type === 'file') {
            this.handleIncomingFile(data);
        }
    }

    handleIncomingFile(data) {
        const { filename, content, fileType } = data;
        
        if (fileType.startsWith('image/')) {
            this.displayImageMessage('Allié', content, filename);
        } else {
            this.displayFileMessage('Allié', filename, content, fileType);
        }
        
        if (window.audioManager) {
            window.audioManager.playSound('fileComplete');
        }
    }

    connectToPeer() {
        const peerId = document.getElementById('connectPeerId').value.trim();
        
        if (!peerId) {
            alert(window.themeManager?.getThemeTexts().alertNoPeer);
            return;
        }

        if (!this.peer) {
            alert(window.themeManager?.getThemeTexts().alertNotReady);
            return;
        }

        this.updateStatus('waiting', window.themeManager?.getThemeTexts().statusPortal);
        
        try {
            const conn = this.peer.connect(peerId);
            this.handleConnection(conn);
        } catch (err) {
            console.error('Erreur de connexion:', err);
            this.updateStatus('disconnected', 'Erreur de connexion');
        }
    }

    handleDisconnection() {
        this.connection = null;
        this.isConnected = false;
        this.disableChat();
        this.updateStatus('disconnected', window.themeManager?.getThemeTexts().statusBroken);
        this.displayMessage('Système', 'Alliance rompue. Vous êtes déconnecté.', 'system');
    }

    sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();
        
        if (!message || !this.isConnected) return;
        
        this.displayMessage('Vous', message, 'sent');
        this.connection.send({
            type: 'message',
            content: message,
            timestamp: Date.now()
        });
        
        messageInput.value = '';
        
        if (window.audioManager) {
            window.audioManager.playSound('buttonClick');
        }
    }

    displayMessage(sender, content, type) {
        const chatContainer = document.getElementById('chatContainer');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        messageDiv.innerHTML = `
            <strong>${sender}</strong> 
            <span style="opacity: 0.7; font-size: 0.8em;">${timestamp}</span><br>
            ${content}
        `;
        
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    displayImageMessage(sender, imageData, filename) {
        const chatContainer = document.getElementById('chatContainer');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message image received';
        
        const timestamp = new Date().toLocaleTimeString();
        messageDiv.innerHTML = `
            <strong>${sender}</strong> 
            <span style="opacity: 0.7; font-size: 0.8em;">${timestamp}</span><br>
            <img src="${imageData}" alt="${filename}" onclick="this.style.transform = this.style.transform === 'scale(1.5)' ? 'scale(1)' : 'scale(1.5)'">
            <div style="font-size: 0.8em; opacity: 0.7;">${filename}</div>
        `;
        
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    displayFileMessage(sender, filename, fileData, fileType) {
        const chatContainer = document.getElementById('chatContainer');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message file received';
        
        const timestamp = new Date().toLocaleTimeString();
        const fileIcon = this.getFileIcon(fileType);
        
        messageDiv.innerHTML = `
            <strong>${sender}</strong> 
            <span style="opacity: 0.7; font-size: 0.8em;">${timestamp}</span><br>
            <span class="file-icon">${fileIcon}</span>
            <span onclick="downloadFile('${filename}', '${fileData}', '${fileType}')">${filename}</span>
        `;
        
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    getFileIcon(fileType) {
        if (fileType.startsWith('image/')) return '🖼️';
        if (fileType.startsWith('video/')) return '🎥';
        if (fileType.startsWith('audio/')) return '🎵';
        if (fileType.includes('pdf')) return '📄';
        if (fileType.includes('text')) return '📝';
        return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32" class="inline"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v15c0 4 3 6 6 6s6-2 6-6V6c0-3-2-4-4-4s-4 1-4 4v17c0 1 1 2 2 2s2-1 2-2V9"/></svg>';
    }

    enableChat() {
        document.getElementById('messageInput').disabled = false;
        document.getElementById('sendBtn').disabled = false;
        document.getElementById('fileBtn').disabled = false;
        document.getElementById('fileInput').disabled = false;
        
        // Vider le conteneur de chat
        const chatContainer = document.getElementById('chatContainer');
        chatContainer.innerHTML = '';
    }

    disableChat() {
        document.getElementById('messageInput').disabled = true;
        document.getElementById('sendBtn').disabled = true;
        document.getElementById('fileBtn').disabled = true;
        document.getElementById('fileInput').disabled = true;
    }

    updateStatus(status, message) {
        const statusElement = document.getElementById('connectionStatus');
        statusElement.className = `status ${status}`;
        statusElement.textContent = message;
    }

    copyPeerId() {
        const peerId = document.getElementById('myPeerId').textContent;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(peerId).then(() => {
                alert(window.themeManager?.getThemeTexts().alertCopy);
            });
        } else {
            // Fallback pour les navigateurs plus anciens
            const textArea = document.createElement('textarea');
            textArea.value = peerId;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert(window.themeManager?.getThemeTexts().alertCopy);
        }
        
        if (window.audioManager) {
            window.audioManager.playSound('buttonClick');
        }
    }

    bindChatEvents() {
        // Attendre que le DOM soit chargé
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.bindChatEvents());
            return;
        }

        const sendBtn = document.getElementById('sendBtn');
        const messageInput = document.getElementById('messageInput');
        const connectBtn = document.getElementById('connectBtn');
        const copyBtn = document.getElementById('copyBtn');
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }
        
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
        }
        
        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.connectToPeer());
        }
        
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyPeerId());
        }
    }

    setupDragAndDrop() {
        const chatContainer = document.getElementById('chatContainer');
        
        if (!chatContainer) return;
        
        chatContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            chatContainer.classList.add('drag-over');
        });
        
        chatContainer.addEventListener('dragleave', () => {
            chatContainer.classList.remove('drag-over');
        });
        
        chatContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            chatContainer.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect({ target: { files } });
            }
        });
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (file.size > 10 * 1024 * 1024) { // 10MB max
            alert('Fichier trop volumineux. Taille maximum : 10MB');
            return;
        }
        
        if (window.audioManager) {
            window.audioManager.playSound('fileSelect');
        }
        
        this.sendFile(file);
    }

    sendFile(file) {
        if (!this.isConnected) {
            alert('Vous devez être connecté pour envoyer un fichier');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const fileData = e.target.result;
            
            if (file.type.startsWith('image/')) {
                this.displayImageMessage('Vous', fileData, file.name);
            } else {
                this.displayFileMessage('Vous', file.name, fileData, file.type);
            }
            
            this.connection.send({
                type: 'file',
                filename: file.name,
                content: fileData,
                fileType: file.type,
                timestamp: Date.now()
            });
        };
        
        reader.readAsDataURL(file);
    }
}

// Fonction globale pour le téléchargement de fichiers
window.downloadFile = function(filename, fileData, fileType) {
    const link = document.createElement('a');
    link.href = fileData;
    link.download = filename;
    link.click();
};
