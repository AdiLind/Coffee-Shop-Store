class ThemeManager {
    constructor() {
        this.themes = {
            light: {
                name: 'Light',
                colors: {
                    '--primary-color': '#8B4513',
                    '--primary-dark': '#654321',
                    '--primary-light': '#A0522D',
                    '--secondary-color': '#D2691E',
                    '--background-color': '#FFFFFF',
                    '--surface-color': '#F8F9FA',
                    '--card-bg': '#FFFFFF',
                    '--text-color': '#212529',
                    '--text-secondary': '#6C757D',
                    '--border-color': '#DEE2E6',
                    '--shadow-color': 'rgba(0, 0, 0, 0.1)',
                    '--success-color': '#28A745',
                    '--warning-color': '#FFC107',
                    '--error-color': '#DC3545',
                    '--info-color': '#17A2B8'
                }
            },
            dark: {
                name: 'Dark',
                colors: {
                    '--primary-color': '#D2691E',
                    '--primary-dark': '#B8860B',
                    '--primary-light': '#DAA520',
                    '--secondary-color': '#CD853F',
                    '--background-color': '#121212',
                    '--surface-color': '#1E1E1E',
                    '--card-bg': '#2D2D2D',
                    '--text-color': '#FFFFFF',
                    '--text-secondary': '#B0B0B0',
                    '--border-color': '#404040',
                    '--shadow-color': 'rgba(0, 0, 0, 0.3)',
                    '--success-color': '#4CAF50',
                    '--warning-color': '#FF9800',
                    '--error-color': '#F44336',
                    '--info-color': '#2196F3'
                }
            },
            coffee: {
                name: 'Coffee',
                colors: {
                    '--primary-color': '#6F4E37',
                    '--primary-dark': '#5D4037',
                    '--primary-light': '#8D6E63',
                    '--secondary-color': '#A0522D',
                    '--background-color': '#FFF8E1',
                    '--surface-color': '#F3E5AB',
                    '--card-bg': '#FFECB3',
                    '--text-color': '#3E2723',
                    '--text-secondary': '#5D4037',
                    '--border-color': '#D7CCC8',
                    '--shadow-color': 'rgba(101, 67, 33, 0.2)',
                    '--success-color': '#689F38',
                    '--warning-color': '#F57C00',
                    '--error-color': '#D32F2F',
                    '--info-color': '#1976D2'
                }
            },
            sepia: {
                name: 'Sepia',
                colors: {
                    '--primary-color': '#8B4513',
                    '--primary-dark': '#654321',
                    '--primary-light': '#A0522D',
                    '--secondary-color': '#CD853F',
                    '--background-color': '#F4F1E8',
                    '--surface-color': '#EDE4D1',
                    '--card-bg': '#F9F6F0',
                    '--text-color': '#3C2E26',
                    '--text-secondary': '#6B5B4F',
                    '--border-color': '#D4C4B0',
                    '--shadow-color': 'rgba(60, 46, 38, 0.15)',
                    '--success-color': '#7CB342',
                    '--warning-color': '#FB8C00',
                    '--error-color': '#E53935',
                    '--info-color': '#1E88E5'
                }
            }
        };

        this.fontSizes = {
            small: {
                name: 'Small',
                scale: 0.875
            },
            normal: {
                name: 'Normal',
                scale: 1.0
            },
            large: {
                name: 'Large',
                scale: 1.125
            },
            xlarge: {
                name: 'Extra Large',
                scale: 1.25
            }
        };

        this.currentTheme = 'light';
        this.currentFontSize = 'normal';
        this.preferences = this.loadPreferences();
    }

    init() {
        // Load saved preferences
        this.applyPreferences();
        
        // Create theme controls if they don't exist
        this.createThemeControls();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Apply theme on page load
        this.applyTheme(this.currentTheme);
        this.applyFontSize(this.currentFontSize);
    }

    loadPreferences() {
        try {
            const saved = localStorage.getItem('coffee-shop-theme-preferences');
            if (saved) {
                const prefs = JSON.parse(saved);
                this.currentTheme = prefs.theme || 'light';
                this.currentFontSize = prefs.fontSize || 'normal';
                return prefs;
            }
        } catch (error) {
            console.error('Failed to load theme preferences:', error);
        }
        
        return {
            theme: 'light',
            fontSize: 'normal',
            autoSwitch: false,
            transitions: true
        };
    }

    savePreferences() {
        try {
            const preferences = {
                theme: this.currentTheme,
                fontSize: this.currentFontSize,
                autoSwitch: this.preferences.autoSwitch || false,
                transitions: this.preferences.transitions !== false,
                lastUpdated: new Date().toISOString()
            };
            
            localStorage.setItem('coffee-shop-theme-preferences', JSON.stringify(preferences));
            this.preferences = preferences;
        } catch (error) {
            console.error('Failed to save theme preferences:', error);
        }
    }

    applyPreferences() {
        // Apply saved theme and font size
        this.currentTheme = this.preferences.theme || 'light';
        this.currentFontSize = this.preferences.fontSize || 'normal';
        
        // Auto-switch based on system preference if enabled
        if (this.preferences.autoSwitch && window.matchMedia) {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
            if (prefersDark.matches && this.currentTheme === 'light') {
                this.currentTheme = 'dark';
            }
            
            // Listen for system theme changes
            prefersDark.addEventListener('change', (e) => {
                if (this.preferences.autoSwitch) {
                    this.setTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }

    createThemeControls() {
        // Check if theme controls already exist
        if (document.getElementById('theme-controls')) {
            return;
        }

        // Create theme control panel
        const themeControls = document.createElement('div');
        themeControls.id = 'theme-controls';
        themeControls.className = 'theme-controls';
        themeControls.innerHTML = `
            <button id="theme-toggle-btn" class="theme-toggle-btn" title="Theme Settings">
                <span class="theme-icon">🎨</span>
            </button>
            
            <div id="theme-panel" class="theme-panel">
                <h3>Theme Settings</h3>
                
                <div class="theme-section">
                    <label>Color Theme:</label>
                    <div class="theme-options">
                        <button class="theme-option" data-theme="light">
                            <span class="theme-preview light-preview"></span>
                            Light
                        </button>
                        <button class="theme-option" data-theme="dark">
                            <span class="theme-preview dark-preview"></span>
                            Dark
                        </button>
                        <button class="theme-option" data-theme="coffee">
                            <span class="theme-preview coffee-preview"></span>
                            Coffee
                        </button>
                        <button class="theme-option" data-theme="sepia">
                            <span class="theme-preview sepia-preview"></span>
                            Sepia
                        </button>
                    </div>
                </div>
                
                <div class="theme-section">
                    <label>Font Size:</label>
                    <div class="font-size-options">
                        <button class="font-size-option" data-size="small">Small</button>
                        <button class="font-size-option" data-size="normal">Normal</button>
                        <button class="font-size-option" data-size="large">Large</button>
                        <button class="font-size-option" data-size="xlarge">XL</button>
                    </div>
                </div>
                
                <div class="theme-section">
                    <label class="checkbox-label">
                        <input type="checkbox" id="auto-switch-checkbox">
                        Auto-switch with system
                    </label>
                </div>
                
                <div class="theme-section">
                    <label class="checkbox-label">
                        <input type="checkbox" id="transitions-checkbox" checked>
                        Enable transitions
                    </label>
                </div>
                
                <div class="theme-actions">
                    <button id="reset-theme-btn" class="btn-secondary">Reset to Default</button>
                </div>
            </div>
        `;

        // Add styles
        const themeStyles = document.createElement('style');
        themeStyles.textContent = `
            .theme-controls {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
            }
            
            .theme-toggle-btn {
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: var(--primary-color, #8B4513);
                color: white;
                border: none;
                cursor: pointer;
                font-size: 20px;
                box-shadow: 0 4px 12px var(--shadow-color, rgba(0,0,0,0.2));
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .theme-toggle-btn:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 16px var(--shadow-color, rgba(0,0,0,0.3));
            }
            
            .theme-panel {
                position: absolute;
                top: 60px;
                right: 0;
                width: 300px;
                background: var(--card-bg, #fff);
                border: 1px solid var(--border-color, #ddd);
                border-radius: 10px;
                padding: 20px;
                box-shadow: 0 8px 25px var(--shadow-color, rgba(0,0,0,0.15));
                display: none;
                animation: slideIn 0.3s ease;
            }
            
            .theme-panel.active {
                display: block;
            }
            
            .theme-panel h3 {
                margin: 0 0 20px 0;
                color: var(--text-color, #333);
                font-size: 18px;
            }
            
            .theme-section {
                margin-bottom: 20px;
            }
            
            .theme-section label {
                display: block;
                margin-bottom: 10px;
                color: var(--text-color, #333);
                font-weight: bold;
            }
            
            .theme-options {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
            }
            
            .theme-option, .font-size-option {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px;
                border: 2px solid var(--border-color, #ddd);
                border-radius: 8px;
                background: var(--surface-color, #f8f9fa);
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 14px;
                color: var(--text-color, #333);
            }
            
            .theme-option:hover, .font-size-option:hover {
                border-color: var(--primary-color, #8B4513);
                transform: translateY(-1px);
            }
            
            .theme-option.active, .font-size-option.active {
                border-color: var(--primary-color, #8B4513);
                background: var(--primary-color, #8B4513);
                color: white;
            }
            
            .theme-preview {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                border: 1px solid #ccc;
            }
            
            .light-preview { background: linear-gradient(45deg, #fff 50%, #f8f9fa 50%); }
            .dark-preview { background: linear-gradient(45deg, #121212 50%, #2d2d2d 50%); }
            .coffee-preview { background: linear-gradient(45deg, #6F4E37 50%, #A0522D 50%); }
            .sepia-preview { background: linear-gradient(45deg, #F4F1E8 50%, #8B4513 50%); }
            
            .font-size-options {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .font-size-option {
                flex: 1;
                min-width: 60px;
                justify-content: center;
            }
            
            .checkbox-label {
                display: flex !important;
                align-items: center;
                gap: 10px;
                cursor: pointer;
                font-weight: normal !important;
                margin-bottom: 0 !important;
            }
            
            .checkbox-label input[type="checkbox"] {
                width: auto;
                margin: 0;
            }
            
            .theme-actions {
                padding-top: 15px;
                border-top: 1px solid var(--border-color, #ddd);
            }
            
            .btn-secondary {
                width: 100%;
                padding: 10px;
                background: var(--surface-color, #f8f9fa);
                color: var(--text-color, #333);
                border: 1px solid var(--border-color, #ddd);
                border-radius: 5px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .btn-secondary:hover {
                background: var(--border-color, #ddd);
            }
            
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @media (max-width: 768px) {
                .theme-controls {
                    top: 10px;
                    right: 10px;
                }
                
                .theme-panel {
                    width: 280px;
                    right: -130px;
                }
                
                .theme-options {
                    grid-template-columns: 1fr;
                }
            }
        `;

        document.head.appendChild(themeStyles);
        document.body.appendChild(themeControls);
    }

    setupEventListeners() {
        // Theme toggle button
        const toggleBtn = document.getElementById('theme-toggle');
        const panel = document.getElementById('theme-panel');
        
        if (toggleBtn && panel) {
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                panel.classList.toggle('active');
            });

            // Close panel when clicking outside
            document.addEventListener('click', (e) => {
                if (!panel.contains(e.target) && !toggleBtn.contains(e.target)) {
                    panel.classList.remove('active');
                }
            });
        }

        // Theme option buttons
        document.querySelectorAll('.theme-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.dataset.theme;
                this.setTheme(theme);
            });
        });

        // Font size buttons
        document.querySelectorAll('.font-size-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const size = btn.dataset.size;
                this.setFontSize(size);
            });
        });

        // Checkboxes
        const autoSwitchCheckbox = document.getElementById('auto-switch-checkbox');
        if (autoSwitchCheckbox) {
            autoSwitchCheckbox.checked = this.preferences.autoSwitch || false;
            autoSwitchCheckbox.addEventListener('change', (e) => {
                this.preferences.autoSwitch = e.target.checked;
                this.savePreferences();
                if (e.target.checked) {
                    this.applyPreferences();
                }
            });
        }

        const transitionsCheckbox = document.getElementById('transitions-checkbox');
        if (transitionsCheckbox) {
            transitionsCheckbox.checked = this.preferences.transitions !== false;
            transitionsCheckbox.addEventListener('change', (e) => {
                this.preferences.transitions = e.target.checked;
                this.savePreferences();
                this.toggleTransitions(e.target.checked);
            });
        }

        // Reset button
        const resetBtn = document.getElementById('reset-theme-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetToDefault();
            });
        }
    }

    setTheme(themeName) {
        if (!this.themes[themeName]) {
            console.warn(`Theme "${themeName}" not found`);
            return;
        }

        this.currentTheme = themeName;
        this.applyTheme(themeName);
        this.updateThemeControls();
        this.savePreferences();
    }

    setFontSize(sizeName) {
        if (!this.fontSizes[sizeName]) {
            console.warn(`Font size "${sizeName}" not found`);
            return;
        }

        this.currentFontSize = sizeName;
        this.applyFontSize(sizeName);
        this.updateFontSizeControls();
        this.savePreferences();
    }

    applyTheme(themeName) {
        const theme = this.themes[themeName];
        if (!theme) return;

        const root = document.documentElement;
        
        // Apply CSS custom properties
        Object.entries(theme.colors).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });

        // Add theme class to body for additional styling
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        document.body.classList.add(`theme-${themeName}`);

        // Update meta theme color for mobile browsers
        let themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (!themeColorMeta) {
            themeColorMeta = document.createElement('meta');
            themeColorMeta.name = 'theme-color';
            document.head.appendChild(themeColorMeta);
        }
        themeColorMeta.content = theme.colors['--primary-color'];
    }

    applyFontSize(sizeName) {
        const fontSize = this.fontSizes[sizeName];
        if (!fontSize) return;

        const root = document.documentElement;
        root.style.setProperty('--font-scale', fontSize.scale);
        
        // Apply scaling to common elements
        const scalableElements = ['body', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'button', 'input', 'textarea', 'select'];
        scalableElements.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (!el.style.fontSize || el.style.fontSize === '') {
                    const computedSize = window.getComputedStyle(el).fontSize;
                    const baseSize = parseFloat(computedSize);
                    el.style.fontSize = `${baseSize * fontSize.scale}px`;
                }
            });
        });
    }

    updateThemeControls() {
        document.querySelectorAll('.theme-option').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.theme === this.currentTheme) {
                btn.classList.add('active');
            }
        });
    }

    updateFontSizeControls() {
        document.querySelectorAll('.font-size-option').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.size === this.currentFontSize) {
                btn.classList.add('active');
            }
        });
    }

    toggleTransitions(enable) {
        const root = document.documentElement;
        if (enable) {
            root.style.removeProperty('--transition-duration');
        } else {
            root.style.setProperty('--transition-duration', '0s');
        }
    }

    resetToDefault() {
        if (confirm('Reset all theme settings to default?')) {
            localStorage.removeItem('coffee-shop-theme-preferences');
            this.preferences = {
                theme: 'light',
                fontSize: 'normal',
                autoSwitch: false,
                transitions: true
            };
            this.currentTheme = 'light';
            this.currentFontSize = 'normal';
            
            this.applyTheme('light');
            this.applyFontSize('normal');
            this.updateThemeControls();
            this.updateFontSizeControls();
            this.toggleTransitions(true);
            
            // Update checkboxes
            const autoSwitchCheckbox = document.getElementById('auto-switch-checkbox');
            const transitionsCheckbox = document.getElementById('transitions-checkbox');
            if (autoSwitchCheckbox) autoSwitchCheckbox.checked = false;
            if (transitionsCheckbox) transitionsCheckbox.checked = true;
        }
    }

    // Public API methods
    getCurrentTheme() {
        return this.currentTheme;
    }

    getCurrentFontSize() {
        return this.currentFontSize;
    }

    getThemes() {
        return Object.keys(this.themes);
    }

    getFontSizes() {
        return Object.keys(this.fontSizes);
    }
}

// Global instance
const ThemeManager = new ThemeManager();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
} else {
    ThemeManager.init();
}