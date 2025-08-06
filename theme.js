/**
 * Gestionnaire de thèmes pour Sound Randomizer
 * Gère le basculement entre thème sombre et clair
 */
class ThemeManager {
  constructor() {
    // Thème sombre par défaut, ou récupérer depuis localStorage
    this.currentTheme = localStorage.getItem('soundRandomizerTheme') || 'dark';
    this.init();
  }

  init() {
    this.applyTheme(this.currentTheme);
    this.createToggleButton();
    
    // Écouter les changements de préférence système (optionnel)
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addListener(() => {
        // Ne pas changer automatiquement si l'utilisateur a déjà fait un choix
        if (!localStorage.getItem('soundRandomizerTheme')) {
          this.detectSystemTheme();
        }
      });
    }
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.currentTheme = theme;
    localStorage.setItem('soundRandomizerTheme', theme);
    this.updateToggleButton();
    
    // Émettre un événement personnalisé pour d'autres composants si nécessaire
    window.dispatchEvent(new CustomEvent('themeChanged', { 
      detail: { theme: theme } 
    }));
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(newTheme);
  }

  createToggleButton() {
    // Vérifier si le bouton existe déjà
    if (document.querySelector('.theme-toggle')) {
      return;
    }

    const toggleButton = document.createElement('button');
    toggleButton.className = 'theme-toggle';
    toggleButton.setAttribute('aria-label', 'Basculer le thème');
    toggleButton.setAttribute('title', 'Changer entre thème sombre et clair');
    
    // Ajouter l'événement de clic
    toggleButton.addEventListener('click', () => {
      this.toggleTheme();
    });
    
    // Ajouter le bouton au body
    document.body.appendChild(toggleButton);
    this.toggleButton = toggleButton;
    
    // Mettre à jour le contenu initial
    this.updateToggleButton();
  }

  updateToggleButton() {
    if (this.toggleButton) {
      const isDark = this.currentTheme === 'dark';
      const icon = isDark ? '☀️' : '🌙';
      const text = isDark ? 'Clair' : 'Sombre';
      
      this.toggleButton.innerHTML = `
        <span class="theme-icon">${icon}</span>
        <span class="theme-text">${text}</span>
      `;
      
      // Mettre à jour l'aria-label pour l'accessibilité
      this.toggleButton.setAttribute('aria-label', 
        `Passer en mode ${text.toLowerCase()}`
      );
    }
  }

  detectSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  getCurrentTheme() {
    return this.currentTheme;
  }
}

// Initialiser le gestionnaire de thème dès que le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
  // S'assurer qu'on n'initialise qu'une seule fois
  if (!window.themeManager) {
    window.themeManager = new ThemeManager();
  }
});

// Exporter pour utilisation dans d'autres scripts si nécessaire
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeManager;
}
