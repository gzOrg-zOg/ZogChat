export class AudioManager {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.soundEnabled = true;
        this.musicEnabled = false;
        this.globalVolume = 0.5;
        this.ambientMusic = null;
        this.sounds = this.createSounds();
        this.init();
    }

    init() {
        // Initialiser les contrôles audio
        this.updateAudioControls();
        this.bindAudioEvents();
    }

    createSounds() {
        return {
            // Son de cor de guerre / fanfare (Warcraft)
            startup: () => {
                if (window.themeManager?.getCurrentTheme() === 'neon') {
                    // Son électronique pour Neon
                    const osc = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(100, this.audioContext.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(2000, this.audioContext.currentTime + 0.1);
                    osc.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.3);
                    
                    gainNode.gain.setValueAtTime(0.3 * this.globalVolume, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
                    
                    osc.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    osc.start(this.audioContext.currentTime);
                    osc.stop(this.audioContext.currentTime + 0.3);
                } else if (window.themeManager?.getCurrentTheme() === 'onepiece') {
                    // Son de corne de brume pour One Piece
                    const osc = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(80, this.audioContext.currentTime);
                    osc.frequency.setValueAtTime(82, this.audioContext.currentTime + 0.5);
                    osc.frequency.setValueAtTime(80, this.audioContext.currentTime + 1);
                    
                    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                    gainNode.gain.linearRampToValueAtTime(0.3 * this.globalVolume, this.audioContext.currentTime + 0.1);
                    gainNode.gain.linearRampToValueAtTime(0.3 * this.globalVolume, this.audioContext.currentTime + 0.9);
                    gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 1);
                    
                    osc.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    osc.start(this.audioContext.currentTime);
                    osc.stop(this.audioContext.currentTime + 1);
                } else {
                    // Son original pour Warcraft
                    const duration = 1.5;
                    const osc1 = this.audioContext.createOscillator();
                    const osc2 = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    
                    osc1.type = 'sawtooth';
                    osc2.type = 'square';
                    osc1.frequency.setValueAtTime(220, this.audioContext.currentTime);
                    osc1.frequency.exponentialRampToValueAtTime(440, this.audioContext.currentTime + duration);
                    osc2.frequency.setValueAtTime(110, this.audioContext.currentTime);
                    osc2.frequency.exponentialRampToValueAtTime(220, this.audioContext.currentTime + duration);
                    
                    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                    gainNode.gain.linearRampToValueAtTime(0.3 * this.globalVolume, this.audioContext.currentTime + 0.1);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
                    
                    osc1.connect(gainNode);
                    osc2.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    osc1.start(this.audioContext.currentTime);
                    osc2.start(this.audioContext.currentTime);
                    osc1.stop(this.audioContext.currentTime + duration);
                    osc2.stop(this.audioContext.currentTime + duration);
                }
            },
            
            // Son métallique (clic de bouton)
            buttonClick: () => {
                const duration = 0.1;
                const osc = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                const filter = this.audioContext.createBiquadFilter();
                
                if (window.themeManager?.getCurrentTheme() === 'neon') {
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(2000, this.audioContext.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(1000, this.audioContext.currentTime + duration);
                } else {
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + duration);
                }
                
                filter.type = 'highpass';
                filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
                
                gainNode.gain.setValueAtTime(0.2 * this.globalVolume, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
                
                osc.connect(filter);
                filter.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                osc.start(this.audioContext.currentTime);
                osc.stop(this.audioContext.currentTime + duration);
            },
            
            // Son de changement de thème
            themeChange: () => {
                const osc1 = this.audioContext.createOscillator();
                const osc2 = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                osc1.type = 'sine';
                osc2.type = 'sine';
                
                if (window.themeManager?.getCurrentTheme() === 'neon') {
                    osc1.frequency.setValueAtTime(1000, this.audioContext.currentTime);
                    osc1.frequency.exponentialRampToValueAtTime(2000, this.audioContext.currentTime + 0.2);
                    osc2.frequency.setValueAtTime(1500, this.audioContext.currentTime);
                    osc2.frequency.exponentialRampToValueAtTime(3000, this.audioContext.currentTime + 0.2);
                } else {
                    osc1.frequency.setValueAtTime(400, this.audioContext.currentTime);
                    osc1.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.2);
                    osc2.frequency.setValueAtTime(600, this.audioContext.currentTime);
                    osc2.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 0.2);
                }
                
                gainNode.gain.setValueAtTime(0.15 * this.globalVolume, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
                
                osc1.connect(gainNode);
                osc2.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                osc1.start(this.audioContext.currentTime);
                osc2.start(this.audioContext.currentTime);
                osc1.stop(this.audioContext.currentTime + 0.2);
                osc2.stop(this.audioContext.currentTime + 0.2);
            },
            
            // Son de sélection de fichier
            fileSelect: () => {
                const duration = 0.2;
                const osc = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                if (window.themeManager?.getCurrentTheme() === 'neon') {
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(1500, this.audioContext.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(2000, this.audioContext.currentTime + duration);
                } else {
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(600, this.audioContext.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + duration);
                }
                
                gainNode.gain.setValueAtTime(0.2 * this.globalVolume, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
                
                osc.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                osc.start(this.audioContext.currentTime);
                osc.stop(this.audioContext.currentTime + duration);
            },
            
            // Son de transfert de fichier
            fileTransfer: () => {
                if (window.themeManager?.getCurrentTheme() === 'neon') {
                    // Son de data stream
                    const duration = 0.5;
                    const osc = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    const filter = this.audioContext.createBiquadFilter();
                    
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(100, this.audioContext.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(1000, this.audioContext.currentTime + duration);
                    
                    filter.type = 'bandpass';
                    filter.frequency.setValueAtTime(500, this.audioContext.currentTime);
                    filter.Q.setValueAtTime(10, this.audioContext.currentTime);
                    
                    gainNode.gain.setValueAtTime(0.1 * this.globalVolume, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
                    
                    osc.connect(filter);
                    filter.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    osc.start(this.audioContext.currentTime);
                    osc.stop(this.audioContext.currentTime + duration);
                } else {
                    // Son de parchemin qui se déroule
                    const duration = 0.8;
                    const noise = this.audioContext.createBufferSource();
                    const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
                    const data = noiseBuffer.getChannelData(0);
                    
                    for (let i = 0; i < data.length; i++) {
                        data[i] = (Math.random() * 2 - 1) * 0.2;
                    }
                    
                    noise.buffer = noiseBuffer;
                    
                    const filter = this.audioContext.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(3000, this.audioContext.currentTime);
                    filter.frequency.exponentialRampToValueAtTime(500, this.audioContext.currentTime + duration);
                    
                    const gainNode = this.audioContext.createGain();
                    gainNode.gain.setValueAtTime(0.2 * this.globalVolume, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
                    
                    noise.connect(filter);
                    filter.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    noise.start(this.audioContext.currentTime);
                }
            },
            
            // Son de fin de transfert
            fileComplete: () => {
                const osc1 = this.audioContext.createOscillator();
                const osc2 = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                osc1.type = 'sine';
                osc2.type = 'sine';
                
                if (window.themeManager?.getCurrentTheme() === 'neon') {
                    osc1.frequency.setValueAtTime(1000, this.audioContext.currentTime);
                    osc2.frequency.setValueAtTime(1500, this.audioContext.currentTime);
                } else if (window.themeManager?.getCurrentTheme() === 'onepiece') {
                    osc1.frequency.setValueAtTime(600, this.audioContext.currentTime);
                    osc2.frequency.setValueAtTime(900, this.audioContext.currentTime);
                } else {
                    osc1.frequency.setValueAtTime(523.25, this.audioContext.currentTime); // C5
                    osc2.frequency.setValueAtTime(783.99, this.audioContext.currentTime); // G5
                }
                
                gainNode.gain.setValueAtTime(0.3 * this.globalVolume, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);
                
                osc1.connect(gainNode);
                osc2.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                osc1.start(this.audioContext.currentTime);
                osc2.start(this.audioContext.currentTime);
                osc1.stop(this.audioContext.currentTime + 0.5);
                osc2.stop(this.audioContext.currentTime + 0.5);
            }
        };
    }

    playSound(soundName) {
        if (!this.soundEnabled || !this.sounds[soundName]) return;
        
        // Débloquer l'AudioContext si nécessaire
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        try {
            this.sounds[soundName]();
        } catch (e) {
            console.error('Erreur lors de la lecture du son:', e);
        }
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        this.updateAudioControls();
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (this.musicEnabled) {
            this.createAmbientMusic();
        } else if (this.ambientMusic) {
            this.ambientMusic.stop();
        }
        this.updateAudioControls();
    }

    changeVolume(value) {
        this.globalVolume = value / 100;
        this.updateAudioControls();
    }

    updateAudioControls() {
        const soundBtn = document.getElementById('soundToggle');
        const musicBtn = document.getElementById('musicToggle');
        const volumeSlider = document.getElementById('volumeSlider');
        
        if (soundBtn) {
            soundBtn.textContent = this.soundEnabled ? '🔊' : '🔇';
            soundBtn.classList.toggle('muted', !this.soundEnabled);
        }
        
        if (musicBtn) {
            musicBtn.textContent = this.musicEnabled ? '🎵' : '🎶';
            musicBtn.classList.toggle('muted', !this.musicEnabled);
        }
        
        if (volumeSlider) {
            volumeSlider.value = this.globalVolume * 100;
        }
    }

    bindAudioEvents() {
        // Attendre que le DOM soit chargé
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.bindAudioEvents());
            return;
        }

        const soundBtn = document.getElementById('soundToggle');
        const musicBtn = document.getElementById('musicToggle');
        const volumeSlider = document.getElementById('volumeSlider');
        
        if (soundBtn) {
            soundBtn.addEventListener('click', () => this.toggleSound());
        }
        
        if (musicBtn) {
            musicBtn.addEventListener('click', () => this.toggleMusic());
        }
        
        if (volumeSlider) {
            volumeSlider.addEventListener('change', (e) => this.changeVolume(e.target.value));
        }
    }

    createAmbientMusic() {
        if (this.ambientMusic) {
            this.ambientMusic.stop();
        }
        
        if (window.themeManager?.getCurrentTheme() === 'neon') {
            // Musique électronique pour Neon
            const bassOsc = this.audioContext.createOscillator();
            const bassGain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            bassOsc.type = 'sawtooth';
            bassOsc.frequency.setValueAtTime(55, this.audioContext.currentTime); // A1
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(200, this.audioContext.currentTime);
            filter.Q.setValueAtTime(10, this.audioContext.currentTime);
            
            // LFO pour moduler le filtre
            const lfo = this.audioContext.createOscillator();
            const lfoGain = this.audioContext.createGain();
            lfo.type = 'sine';
            lfo.frequency.setValueAtTime(0.5, this.audioContext.currentTime);
            lfoGain.gain.setValueAtTime(100, this.audioContext.currentTime);
            
            lfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);
            
            bassGain.gain.setValueAtTime(0.05 * this.globalVolume, this.audioContext.currentTime);
            
            bassOsc.connect(filter);
            filter.connect(bassGain);
            bassGain.connect(this.audioContext.destination);
            
            bassOsc.start();
            lfo.start();
            
            this.ambientMusic = {
                stop: () => {
                    bassOsc.stop();
                    lfo.stop();
                    this.ambientMusic = null;
                }
            };
        } else {
            // Musique originale pour les autres thèmes
            const chord = window.themeManager?.getCurrentTheme() === 'onepiece' ? 
                [146.83, 185.00, 220.00, 293.66] : // D3, F#3, A3, D4 (plus joyeux pour One Piece)
                [130.81, 164.81, 196.00, 261.63]; // C3, E3, G3, C4 (original pour Warcraft)
                
            const oscillators = [];
            const gainNode = this.audioContext.createGain();
            
            chord.forEach((freq, index) => {
                const osc = this.audioContext.createOscillator();
                const oscGain = this.audioContext.createGain();
                
                osc.type = index < 2 ? 'sine' : 'triangle';
                osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                
                // Légère modulation de fréquence
                const lfo = this.audioContext.createOscillator();
                const lfoGain = this.audioContext.createGain();
                lfo.type = 'sine';
                lfo.frequency.setValueAtTime(0.2 + index * 0.1, this.audioContext.currentTime);
                lfoGain.gain.setValueAtTime(2, this.audioContext.currentTime);
                
                lfo.connect(lfoGain);
                lfoGain.connect(osc.frequency);
                
                oscGain.gain.setValueAtTime(0.05 * this.globalVolume, this.audioContext.currentTime);
                
                osc.connect(oscGain);
                oscGain.connect(gainNode);
                
                osc.start();
                lfo.start();
                
                oscillators.push({ osc, lfo });
            });
            
            // Filtre pour adoucir le son
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, this.audioContext.currentTime);
            filter.Q.setValueAtTime(2, this.audioContext.currentTime);
            
            gainNode.connect(filter);
            filter.connect(this.audioContext.destination);
            
            this.ambientMusic = {
                stop: () => {
                    oscillators.forEach(({ osc, lfo }) => {
                        osc.stop();
                        lfo.stop();
                    });
                    this.ambientMusic = null;
                }
            };
        }
    }
}
