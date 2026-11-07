const ISL = /[?&]island=1/.test(location.search); // fenêtre séparée de l'île musique (posée sur un autre écran)
if (ISL) document.body.classList.add('isl-mode');
let streamDid = null, restarting = false, rsT = 0;
let idragI = false, islExt = false, detT = 0;
let SCR = [], UPD = { state: 'idle', cur: '' }, updDis = '', updSig = '', vstream = null;
let cfg, SYS = { lang: 'fr', tz: 'UTC', name: '' }, UL = 'fr', media = {}, draft = {}, lastIgnore = null, lastS = null, idrag = null, islShown = false;
const $ = s => document.querySelector(s), bar = $('#bar'), tray = $('#tray');
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const uid = () => 'b' + Math.random().toString(36).slice(2, 9);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ===== Traductions (langue détectée automatiquement ; repli sur l'anglais) ===== */
const I18N = {
  fr: {
    expand: 'Dérouler', collapse: 'Réduire', settings: 'Paramètres', hide: 'Cacher', leave: 'Quitter', addApp: 'Ajouter une app', uptime: 'Allumé depuis {0}', uD: 'j', uH: 'h', uM: 'min', gb: 'Go', tb: 'To',
    mProfile: 'Profil', mStats: 'Statistiques système', mSep: 'Séparateur', mSpacer: 'Espace flexible', mBuiltin: 'Bouton intégré', mUptime: 'Durée d’activité',
    tGeneral: 'Général', tLook: 'Apparence', tMusic: 'Musique', tBar: 'Barre latérale',
    profilePhoto: 'Photo de profil', photoSub: 'Image recadrée automatiquement en carré', choose: 'Choisir', nickname: 'Pseudo', nickSub: 'Affiché dans la barre étendue', lang: 'Langue', tz: 'Fuseau horaire',
    autoSys: 'Détection automatique', autoSub: 'La langue et le fuseau horaire suivent ceux du système', tScreens: 'Écrans', scrTitle: 'Écran d’affichage', scrSub: 'Choisis l’écran où s’affichent la barre, les fenêtres et la barre des tâches', scrCount: '{0} écran(s) détecté(s)', scrMain: 'Principal', scrUse: 'Utiliser', scrCur: 'Actuel', scrId: 'Identifier', scrIdSub: 'Affiche le numéro sur chaque écran', scrName: 'Écran {0}', updTitle: 'Mises à jour', updAuto: 'Mise à jour automatique', updAutoSub: 'Télécharge les nouvelles versions en arrière-plan et les installe à la fermeture', updCheck: 'Rechercher', updDl: 'Télécharger', updRestart: 'Redémarrer', updView: 'Voir', updLater: 'Plus tard', updNew: 'Version {0} disponible', updIdle: 'Version {0}', updChk: 'Recherche en cours…', updOk: 'À jour (version {0})', updAvail: 'La version {0} est disponible', updDling: 'Téléchargement… {0}%', updReady: 'Version {0} prête : redémarre pour l’installer', updErr: 'Erreur : {0}', updErrRepo: 'dépôt GitHub non configuré dans package.json', updErr404: 'aucune version publiée', updManual: 'Installation manuelle requise (version non portable)', mScreen: 'Écran de la fenêtre', mScreenSub: 'Où afficher la fenêtre de musique', mWithDock: 'Avec le dock', scrIsl: 'Astuce : glisse la fenêtre de musique hors de l’écran pour la poser sur un autre écran, et ramène-la sur l’écran du dock pour la remettre dans la barre.', autoStart: 'Lancer au démarrage', autoStartSub: 'Halo s’ouvre automatiquement à l’ouverture de session Windows', initSetup: 'Configuration initiale', initSub: 'Refaire la création du profil pas à pas', relaunch: 'Relancer', quit: 'Quitter', quitApp: 'Quitter Halo',
    accent: 'Couleur d’accent', blur: 'Flou', glass: 'Intensité du verre', round: 'Arrondi',
    mIsland: 'Île musique', mIslandSub: 'Affiche le média en cours de lecture', mPos: 'Position', mPosSub: 'Clique une case, ou fais glisser l’île directement', mLayout: 'Disposition', lH: 'Horizontale', lV: 'Verticale',
    mWidth: 'Largeur', mRadius: 'Arrondi de l’île', mText: 'Taille du texte', mGlass: 'Intensité du verre', mGlassAuto: 'Auto = suit le réglage global', mCover: 'Pochette', mCoverSize: 'Taille de la pochette', mCoverRound: 'Arrondi de la pochette',
    mArtist: 'Artiste', mProg: 'Barre de progression', mTimes: 'Temps écoulé / durée', mCtl: 'Contrôles de lecture', mSkip: 'Boutons précédent / suivant', mHidePaused: 'Masquer en pause', mHidePausedSub: 'L’île disparaît quand la lecture est en pause',
    mUseAccent: 'Progression à la couleur d’accent', mColor: 'Couleur de la progression', mReset: 'Réinitialiser l’île', auto: 'Auto',
    sProfile: 'Profil', sLocale: 'Langue et heure', sStartup: 'Démarrage', sUpdates: 'Mises à jour', sApp: 'Application', sColors: 'Couleurs', sGlass: 'Verre et forme', sMIsland: 'Île musique', sMLayout: 'Disposition et style', sMContent: 'Contenu affiché', sBState: 'Affichage', sBModules: 'Éléments de la barre', sTkApps: 'Applications épinglées', sScrMap: 'Disposition des écrans', sScrList: 'Écrans détectés', bState: 'État de la barre', sRed: 'Réduite', sExp: 'Étendue', sHid: 'Cachée', bAdd: 'Ajouter un élément', bAddApp: 'App', bAddSep: 'Séparateur', bAddSpacer: 'Espace', mFolder: 'Dossier', bAddFolder: 'Dossier', emptyFolder: 'Dossier vide : glisse des apps ici', tTask: 'Barre des tâches', tStart: 'Démarrer', tSearch: 'Rechercher…', tWeb: 'Rechercher « {0} » sur le web', tPin: 'Épingler', tkOn: 'Barre des tâches personnalisée', tkOnSub: 'Affiche la barre en bas à la place de celle de Windows', tkHide: 'Masquer la barre Windows', tkHideSub: 'Masque la barre Windows tant que Halo tourne (restaurée à la fermeture)', tkAdd: 'Applications épinglées', tkImport: 'Importer de Windows', tBg: 'Applications en arrière-plan', tWifi: 'Wi‑Fi', tNoNet: 'Non connecté', tWifiSet: 'Paramètres Wi‑Fi', tNoBg: 'Aucune application', tMute: 'Muet', tVol: 'Volume : {0}%', mApps: '{0} app(s)', bReset: 'Réinitialiser la barre', bResetSub: 'Remet les modules par défaut (tes apps sont conservées)',
    editItem: 'Modifier l’élément', newApp: 'Nouvelle app', name: 'Nom', namePh: 'Ex : Steam', path: 'Chemin / lien', pathSub: 'Exécutable, raccourci ou lien', label: 'Libellé', labelSub: 'Laisse vide pour le nom par défaut', icon: 'Icône', iconSearch: 'Chercher une icône…',
    logo: 'Logo personnalisé', logoSub: 'Remplace l’icône (PNG, JPG, WebP, GIF…)', cancel: 'Annuler', add: 'Ajouter', save: 'Enregistrer', byDefault: 'Par défaut', statsShow: 'Informations affichées',
    suTitle: 'Configuration du profil', step: 'Étape {0} / {1}', start: 'Commencer', cont: 'Continuer', finish: 'Terminer', back: 'Retour', modify: 'Modifier', detected: 'Détecté automatiquement',
    wTitle: 'Bienvenue sur Halo', wText: 'On va créer ton profil en quelques étapes, une information à la fois. Ça prend moins d’une minute.',
    nTitle: 'Ton nom d’utilisateur', nSub: 'C’est le nom affiché dans la barre.', nPh: 'Ex : Alex', bTitle: 'Ta date d’anniversaire', bSub: 'Sélectionne le jour de ta naissance.',
    tTitle: 'Ton fuseau horaire', tSub: 'Il sert à afficher la bonne heure dans la barre.', tNow: 'Heure actuelle dans ce fuseau : {0}', lTitle: 'Ta langue', lSub: 'Elle sert à l’interface et au format de la date et de l’heure.',
    pTitle: 'Ta photo de profil', pSub: 'Facultatif : l’image est recadrée automatiquement en carré.', rTitle: 'Récapitulatif', rPhoto: 'Photo', rName: 'Nom', rBirth: 'Anniversaire', rTz: 'Fuseau horaire', rLang: 'Langue'
  },
  en: {
    expand: 'Expand', collapse: 'Collapse', settings: 'Settings', hide: 'Hide', leave: 'Quit', addApp: 'Add an app', uptime: 'Up for {0}', uD: 'd', uH: 'h', uM: 'min', gb: 'GB', tb: 'TB',
    mProfile: 'Profile', mStats: 'System stats', mSep: 'Separator', mSpacer: 'Flexible space', mBuiltin: 'Built-in button', mUptime: 'Uptime',
    tGeneral: 'General', tLook: 'Appearance', tMusic: 'Music', tBar: 'Sidebar',
    profilePhoto: 'Profile picture', photoSub: 'Automatically cropped to a square', choose: 'Choose', nickname: 'Nickname', nickSub: 'Shown in the expanded bar', lang: 'Language', tz: 'Time zone',
    autoSys: 'Automatic detection', autoSub: 'Language and time zone follow the system', tScreens: 'Displays', scrTitle: 'Display', scrSub: 'Choose the screen where the bar, windows and taskbar are shown', scrCount: '{0} display(s) detected', scrMain: 'Main', scrUse: 'Use', scrCur: 'Current', scrId: 'Identify', scrIdSub: 'Shows the number on each screen', scrName: 'Display {0}', updTitle: 'Updates', updAuto: 'Automatic updates', updAutoSub: 'Downloads new versions in the background and installs them on exit', updCheck: 'Check', updDl: 'Download', updRestart: 'Restart', updView: 'View', updLater: 'Later', updNew: 'Version {0} available', updIdle: 'Version {0}', updChk: 'Checking…', updOk: 'Up to date (version {0})', updAvail: 'Version {0} is available', updDling: 'Downloading… {0}%', updReady: 'Version {0} ready: restart to install', updErr: 'Error: {0}', updErrRepo: 'GitHub repository not set in package.json', updErr404: 'no release published', updManual: 'Manual install required (non-portable build)', mScreen: 'Window display', mScreenSub: 'Where to show the music window', mWithDock: 'With the dock', scrIsl: 'Tip: drag the music window off the screen to place it on another display, and drag it back onto the dock’s display to put it back in the bar.', autoStart: 'Launch at startup', autoStartSub: 'Halo opens automatically when you sign in to Windows', initSetup: 'Initial setup', initSub: 'Redo the profile creation step by step', relaunch: 'Restart', quit: 'Quit', quitApp: 'Quit Halo',
    accent: 'Accent color', blur: 'Blur', glass: 'Glass intensity', round: 'Roundness',
    mIsland: 'Music island', mIslandSub: 'Shows the media currently playing', mPos: 'Position', mPosSub: 'Click a cell, or drag the island directly', mLayout: 'Layout', lH: 'Horizontal', lV: 'Vertical',
    mWidth: 'Width', mRadius: 'Island roundness', mText: 'Text size', mGlass: 'Glass intensity', mGlassAuto: 'Auto = follows the global setting', mCover: 'Cover art', mCoverSize: 'Cover size', mCoverRound: 'Cover roundness',
    mArtist: 'Artist', mProg: 'Progress bar', mTimes: 'Elapsed / duration', mCtl: 'Playback controls', mSkip: 'Previous / next buttons', mHidePaused: 'Hide when paused', mHidePausedSub: 'The island disappears when playback is paused',
    mUseAccent: 'Progress in accent color', mColor: 'Progress color', mReset: 'Reset island', auto: 'Auto',
    sProfile: 'Profile', sLocale: 'Language & time', sStartup: 'Startup', sUpdates: 'Updates', sApp: 'Application', sColors: 'Colors', sGlass: 'Glass & shape', sMIsland: 'Music island', sMLayout: 'Layout & style', sMContent: 'Displayed content', sBState: 'Display', sBModules: 'Bar items', sTkApps: 'Pinned apps', sScrMap: 'Screen layout', sScrList: 'Detected displays', bState: 'Bar state', sRed: 'Reduced', sExp: 'Expanded', sHid: 'Hidden', bAdd: 'Add an item', bAddApp: 'App', bAddSep: 'Separator', bAddSpacer: 'Space', mFolder: 'Folder', bAddFolder: 'Folder', emptyFolder: 'Empty folder: drag apps here', tTask: 'Taskbar', tStart: 'Start', tSearch: 'Search…', tWeb: 'Search the web for “{0}”', tPin: 'Pin', tkOn: 'Custom taskbar', tkOnSub: 'Shows the bar at the bottom instead of Windows’', tkHide: 'Hide the Windows taskbar', tkHideSub: 'Hides the Windows taskbar while Halo runs (restored on exit)', tkAdd: 'Pinned apps', tkImport: 'Import from Windows', tBg: 'Background apps', tWifi: 'Wi‑Fi', tNoNet: 'Not connected', tWifiSet: 'Wi‑Fi settings', tNoBg: 'No apps', tMute: 'Mute', tVol: 'Volume: {0}%', mApps: '{0} app(s)', bReset: 'Reset the bar', bResetSub: 'Restores default modules (your apps are kept)',
    editItem: 'Edit item', newApp: 'New app', name: 'Name', namePh: 'E.g. Steam', path: 'Path / link', pathSub: 'Executable, shortcut or link', label: 'Label', labelSub: 'Leave empty for the default name', icon: 'Icon', iconSearch: 'Search an icon…',
    logo: 'Custom logo', logoSub: 'Replaces the icon (PNG, JPG, WebP, GIF…)', cancel: 'Cancel', add: 'Add', save: 'Save', byDefault: 'Default', statsShow: 'Displayed information',
    suTitle: 'Profile setup', step: 'Step {0} / {1}', start: 'Get started', cont: 'Continue', finish: 'Finish', back: 'Back', modify: 'Edit', detected: 'Detected automatically',
    wTitle: 'Welcome to Halo', wText: 'We’ll create your profile in a few steps, one piece of information at a time. It takes less than a minute.',
    nTitle: 'Your username', nSub: 'This is the name shown in the bar.', nPh: 'E.g. Alex', bTitle: 'Your birthday', bSub: 'Select the day you were born.',
    tTitle: 'Your time zone', tSub: 'Used to show the right time in the bar.', tNow: 'Current time in this zone: {0}', lTitle: 'Your language', lSub: 'Used for the interface and the date and time format.',
    pTitle: 'Your profile picture', pSub: 'Optional: the image is automatically cropped to a square.', rTitle: 'Summary', rPhoto: 'Photo', rName: 'Name', rBirth: 'Birthday', rTz: 'Time zone', rLang: 'Language'
  },
  es: {
    expand: 'Expandir', collapse: 'Reducir', settings: 'Ajustes', hide: 'Ocultar', leave: 'Salir', addApp: 'Añadir una app', uptime: 'Encendido desde hace {0}', uD: 'd', uH: 'h', uM: 'min', gb: 'GB', tb: 'TB',
    mProfile: 'Perfil', mStats: 'Estadísticas del sistema', mSep: 'Separador', mSpacer: 'Espacio flexible', mBuiltin: 'Botón integrado', mUptime: 'Tiempo de actividad',
    tGeneral: 'General', tLook: 'Apariencia', tMusic: 'Música', tBar: 'Barra lateral',
    profilePhoto: 'Foto de perfil', photoSub: 'Imagen recortada automáticamente en cuadrado', choose: 'Elegir', nickname: 'Apodo', nickSub: 'Se muestra en la barra expandida', lang: 'Idioma', tz: 'Zona horaria',
    autoSys: 'Detección automática', autoSub: 'El idioma y la zona horaria siguen los del sistema', autoStart: 'Iniciar con el sistema', autoStartSub: 'Halo se abre automáticamente al iniciar sesión en Windows', initSetup: 'Configuración inicial', initSub: 'Rehacer la creación del perfil paso a paso', relaunch: 'Reiniciar', quit: 'Salir', quitApp: 'Salir de Halo',
    accent: 'Color de acento', blur: 'Desenfoque', glass: 'Intensidad del cristal', round: 'Redondeo',
    mIsland: 'Isla de música', mIslandSub: 'Muestra el contenido en reproducción', mPos: 'Posición', mPosSub: 'Haz clic en una casilla o arrastra la isla', mLayout: 'Disposición', lH: 'Horizontal', lV: 'Vertical',
    mWidth: 'Ancho', mRadius: 'Redondeo de la isla', mText: 'Tamaño del texto', mGlass: 'Intensidad del cristal', mGlassAuto: 'Auto = sigue el ajuste global', mCover: 'Carátula', mCoverSize: 'Tamaño de la carátula', mCoverRound: 'Redondeo de la carátula',
    mArtist: 'Artista', mProg: 'Barra de progreso', mTimes: 'Tiempo transcurrido / duración', mCtl: 'Controles de reproducción', mSkip: 'Botones anterior / siguiente', mHidePaused: 'Ocultar en pausa', mHidePausedSub: 'La isla desaparece cuando la reproducción está en pausa',
    mUseAccent: 'Progreso con color de acento', mColor: 'Color del progreso', mReset: 'Restablecer la isla', auto: 'Auto',
    sProfile: 'Perfil', sLocale: 'Idioma y hora', sStartup: 'Inicio', sUpdates: 'Actualizaciones', sApp: 'Aplicación', sColors: 'Colores', sGlass: 'Cristal y forma', sMIsland: 'Isla de música', sMLayout: 'Diseño y estilo', sMContent: 'Contenido mostrado', sBState: 'Visualización', sBModules: 'Elementos de la barra', sTkApps: 'Apps ancladas', sScrMap: 'Disposición de pantallas', sScrList: 'Pantallas detectadas', bState: 'Estado de la barra', sRed: 'Reducida', sExp: 'Expandida', sHid: 'Oculta', bAdd: 'Añadir un elemento', bAddApp: 'App', bAddSep: 'Separador', bAddSpacer: 'Espacio', mFolder: 'Carpeta', bAddFolder: 'Carpeta', emptyFolder: 'Carpeta vacía: arrastra apps aquí', tTask: 'Barra de tareas', tStart: 'Inicio', tSearch: 'Buscar…', tWeb: 'Buscar «{0}» en la web', tPin: 'Anclar', tkOn: 'Barra de tareas personalizada', tkOnSub: 'Muestra la barra abajo en lugar de la de Windows', tkHide: 'Ocultar la barra de Windows', tkHideSub: 'Oculta la barra de Windows mientras Halo está activo (se restaura al salir)', tkAdd: 'Aplicaciones ancladas', tkImport: 'Importar de Windows', tBg: 'Aplicaciones en segundo plano', tWifi: 'Wi‑Fi', tNoNet: 'Sin conexión', tWifiSet: 'Ajustes de Wi‑Fi', tNoBg: 'Ninguna aplicación', tMute: 'Silenciar', tVol: 'Volumen: {0}%', mApps: '{0} app(s)', bReset: 'Restablecer la barra', bResetSub: 'Restaura los módulos por defecto (se conservan tus apps)',
    editItem: 'Editar elemento', newApp: 'Nueva app', name: 'Nombre', namePh: 'Ej.: Steam', path: 'Ruta / enlace', pathSub: 'Ejecutable, acceso directo o enlace', label: 'Etiqueta', labelSub: 'Déjalo vacío para el nombre por defecto', icon: 'Icono', iconSearch: 'Buscar un icono…',
    logo: 'Logo personalizado', logoSub: 'Sustituye el icono (PNG, JPG, WebP, GIF…)', cancel: 'Cancelar', add: 'Añadir', save: 'Guardar', byDefault: 'Por defecto', statsShow: 'Información mostrada',
    suTitle: 'Configuración del perfil', step: 'Paso {0} / {1}', start: 'Empezar', cont: 'Continuar', finish: 'Terminar', back: 'Atrás', modify: 'Editar', detected: 'Detectado automáticamente',
    wTitle: 'Te damos la bienvenida a Halo', wText: 'Crearemos tu perfil en unos pasos, un dato cada vez. Lleva menos de un minuto.',
    nTitle: 'Tu nombre de usuario', nSub: 'Es el nombre que se muestra en la barra.', nPh: 'Ej.: Alex', bTitle: 'Tu fecha de cumpleaños', bSub: 'Selecciona el día en que naciste.',
    tTitle: 'Tu zona horaria', tSub: 'Sirve para mostrar la hora correcta en la barra.', tNow: 'Hora actual en esta zona: {0}', lTitle: 'Tu idioma', lSub: 'Se usa para la interfaz y el formato de fecha y hora.',
    pTitle: 'Tu foto de perfil', pSub: 'Opcional: la imagen se recorta automáticamente en cuadrado.', rTitle: 'Resumen', rPhoto: 'Foto', rName: 'Nombre', rBirth: 'Cumpleaños', rTz: 'Zona horaria', rLang: 'Idioma'
  },
  de: {
    expand: 'Erweitern', collapse: 'Verkleinern', settings: 'Einstellungen', hide: 'Ausblenden', leave: 'Beenden', addApp: 'App hinzufügen', uptime: 'Läuft seit {0}', uD: 'T', uH: 'Std', uM: 'Min', gb: 'GB', tb: 'TB',
    mProfile: 'Profil', mStats: 'Systemstatistiken', mSep: 'Trennlinie', mSpacer: 'Flexibler Abstand', mBuiltin: 'Integrierte Schaltfläche', mUptime: 'Laufzeit',
    tGeneral: 'Allgemein', tLook: 'Darstellung', tMusic: 'Musik', tBar: 'Seitenleiste',
    profilePhoto: 'Profilbild', photoSub: 'Wird automatisch quadratisch zugeschnitten', choose: 'Auswählen', nickname: 'Spitzname', nickSub: 'Wird in der erweiterten Leiste angezeigt', lang: 'Sprache', tz: 'Zeitzone',
    autoSys: 'Automatische Erkennung', autoSub: 'Sprache und Zeitzone folgen dem System', autoStart: 'Beim Start ausführen', autoStartSub: 'Halo startet automatisch bei der Windows-Anmeldung', initSetup: 'Ersteinrichtung', initSub: 'Profilerstellung Schritt für Schritt wiederholen', relaunch: 'Neu starten', quit: 'Beenden', quitApp: 'Halo beenden',
    accent: 'Akzentfarbe', blur: 'Unschärfe', glass: 'Glasintensität', round: 'Rundung',
    mIsland: 'Musik-Insel', mIslandSub: 'Zeigt die aktuelle Wiedergabe an', mPos: 'Position', mPosSub: 'Feld anklicken oder die Insel direkt ziehen', mLayout: 'Anordnung', lH: 'Horizontal', lV: 'Vertikal',
    mWidth: 'Breite', mRadius: 'Rundung der Insel', mText: 'Textgröße', mGlass: 'Glasintensität', mGlassAuto: 'Auto = globale Einstellung', mCover: 'Cover', mCoverSize: 'Covergröße', mCoverRound: 'Cover-Rundung',
    mArtist: 'Künstler', mProg: 'Fortschrittsbalken', mTimes: 'Verstrichen / Dauer', mCtl: 'Wiedergabesteuerung', mSkip: 'Zurück-/Weiter-Tasten', mHidePaused: 'Bei Pause ausblenden', mHidePausedSub: 'Die Insel verschwindet, wenn die Wiedergabe pausiert',
    mUseAccent: 'Fortschritt in Akzentfarbe', mColor: 'Farbe des Fortschritts', mReset: 'Insel zurücksetzen', auto: 'Auto',
    sProfile: 'Profil', sLocale: 'Sprache & Zeit', sStartup: 'Start', sUpdates: 'Updates', sApp: 'Anwendung', sColors: 'Farben', sGlass: 'Glas & Form', sMIsland: 'Musik-Insel', sMLayout: 'Layout & Stil', sMContent: 'Angezeigte Inhalte', sBState: 'Anzeige', sBModules: 'Leistenelemente', sTkApps: 'Angeheftete Apps', sScrMap: 'Bildschirmanordnung', sScrList: 'Erkannte Bildschirme', bState: 'Zustand der Leiste', sRed: 'Verkleinert', sExp: 'Erweitert', sHid: 'Ausgeblendet', bAdd: 'Element hinzufügen', bAddApp: 'App', bAddSep: 'Trennlinie', bAddSpacer: 'Abstand', mFolder: 'Ordner', bAddFolder: 'Ordner', emptyFolder: 'Leerer Ordner: Apps hierher ziehen', tTask: 'Taskleiste', tStart: 'Start', tSearch: 'Suchen…', tWeb: 'Im Web nach „{0}“ suchen', tPin: 'Anheften', tkOn: 'Eigene Taskleiste', tkOnSub: 'Zeigt die Leiste unten anstelle der Windows-Leiste', tkHide: 'Windows-Taskleiste ausblenden', tkHideSub: 'Blendet die Windows-Taskleiste aus, solange Halo läuft (beim Beenden wiederhergestellt)', tkAdd: 'Angeheftete Apps', tkImport: 'Aus Windows importieren', tBg: 'Hintergrund-Apps', tWifi: 'WLAN', tNoNet: 'Nicht verbunden', tWifiSet: 'WLAN-Einstellungen', tNoBg: 'Keine Apps', tMute: 'Stumm', tVol: 'Lautstärke: {0}%', mApps: '{0} App(s)', bReset: 'Leiste zurücksetzen', bResetSub: 'Stellt die Standardmodule wieder her (Apps bleiben erhalten)',
    editItem: 'Element bearbeiten', newApp: 'Neue App', name: 'Name', namePh: 'z. B. Steam', path: 'Pfad / Link', pathSub: 'Programm, Verknüpfung oder Link', label: 'Beschriftung', labelSub: 'Leer lassen für den Standardnamen', icon: 'Symbol', iconSearch: 'Symbol suchen…',
    logo: 'Eigenes Logo', logoSub: 'Ersetzt das Symbol (PNG, JPG, WebP, GIF…)', cancel: 'Abbrechen', add: 'Hinzufügen', save: 'Speichern', byDefault: 'Standard', statsShow: 'Angezeigte Informationen',
    suTitle: 'Profil einrichten', step: 'Schritt {0} / {1}', start: 'Los geht’s', cont: 'Weiter', finish: 'Fertig', back: 'Zurück', modify: 'Ändern', detected: 'Automatisch erkannt',
    wTitle: 'Willkommen bei Halo', wText: 'Wir erstellen dein Profil in wenigen Schritten, eine Angabe nach der anderen. Das dauert weniger als eine Minute.',
    nTitle: 'Dein Benutzername', nSub: 'Dieser Name wird in der Leiste angezeigt.', nPh: 'z. B. Alex', bTitle: 'Dein Geburtstag', bSub: 'Wähle deinen Geburtstag aus.',
    tTitle: 'Deine Zeitzone', tSub: 'Damit wird die richtige Uhrzeit in der Leiste angezeigt.', tNow: 'Aktuelle Uhrzeit in dieser Zone: {0}', lTitle: 'Deine Sprache', lSub: 'Gilt für die Oberfläche sowie das Datums- und Zeitformat.',
    pTitle: 'Dein Profilbild', pSub: 'Optional: Das Bild wird automatisch quadratisch zugeschnitten.', rTitle: 'Zusammenfassung', rPhoto: 'Foto', rName: 'Name', rBirth: 'Geburtstag', rTz: 'Zeitzone', rLang: 'Sprache'
  }
};
const setUL = l => { UL = l; document.documentElement.lang = l; };
const T = (k, ...a) => { let s = (I18N[UL] && I18N[UL][k]) ?? I18N.en[k] ?? k; a.forEach((v, i) => s = s.replace('{' + i + '}', v)); return s; };

const avatarHtml = () => cfg.avatar ? `<img src="${cfg.avatar}" draggable="false">` : esc(Array.from((cfg.name || '?').trim() || '?')[0].toUpperCase());
const toAvatar = src => new Promise(res => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'), n = 192, s = Math.min(i.width, i.height); c.width = c.height = n; c.getContext('2d').drawImage(i, (i.width - s) / 2, (i.height - s) / 2, s, s, 0, 0, n, n); res(c.toDataURL('image/png')); }; i.onerror = () => res(null); i.src = src; });
// logo : image contenue (non rognée) dans un carré 128px, transparence conservée
const toLogo = src => new Promise(res => { const i = new Image(); i.onload = () => { const n = 128, c = document.createElement('canvas'), k = Math.min(n / i.width, n / i.height), w = i.width * k, h = i.height * k; c.width = c.height = n; c.getContext('2d').drawImage(i, (n - w) / 2, (n - h) / 2, w, h); res(c.toDataURL('image/png')); }; i.onerror = () => res(null); i.src = src; });
const POS = [[0, 0], [.5, 0], [1, 0], [0, .5], [.5, .5], [1, .5], [0, 1], [.5, 1], [1, 1]];
const posOn = (p, q) => Math.abs(p.x - q[0]) < .02 && Math.abs(p.y - q[1]) < .02;
const markPos = () => document.querySelectorAll('.pos span').forEach(c => c.classList.toggle('on', posOn(cfg.mediaPos || { x: 0, y: .5 }, POS[c.dataset.i])));
const B = b => b >= 1e12 ? (b / 1e12).toFixed(2) + ' ' + T('tb') : (b / 1073741824).toFixed(1) + ' ' + T('gb');
const fmtUp = u => { const d = Math.floor(u / 86400), h = Math.floor(u % 86400 / 3600), m = Math.floor(u % 3600 / 60), D = T('uD'), H = T('uH'), M = T('uM'); return d ? `${d} ${D} ${h} ${H}` : h ? `${h} ${H} ${String(m).padStart(2, '0')} ${M}` : `${m} ${M}`; };
function paintStats(s) {
  if (!s) return;
  const set = (k, v, d) => { const f = document.getElementById('f' + k); if (!f) return; f.style.width = v + '%'; document.getElementById('v' + k).textContent = Math.round(v) + '%'; document.getElementById('d' + k).textContent = d; };
  set('CPU', s.cpu, `${s.threads} threads`);
  set('RAM', s.ram, `${B(s.ramUsed)} / ${B(s.ramTotal)}`);
  set('SSD', s.disk, s.diskTotal ? `${B(s.diskUsed)} / ${B(s.diskTotal)}` : '');
  const u = document.getElementById('up'); if (u) u.textContent = T('uptime', fmtUp(s.uptime));
}
const ic = (n, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${(api.icons[n] || api.icons['app-window']).map(([t, a]) => `<${t} ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`).join('')}</svg>`;
const fmt = s => isFinite(s) ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '0:00';
const clockStr = () => { const o = { weekday: 'short', hour: '2-digit', minute: '2-digit' }; try { return new Date().toLocaleString(cfg.lang || 'en', { ...o, timeZone: cfg.timezone || undefined }); } catch { return new Date().toLocaleString('en', o); } };
const persist = p => { Object.assign(cfg, p); return api.setCfg(p); };
const theme = () => { const r = document.documentElement.style; const dpr = window.devicePixelRatio || 1; r.setProperty('--bw', Math.max(1, Math.round(1.5 * dpr)) / dpr + 'px'); r.setProperty('--accent', cfg.accent); r.setProperty('--blur', cfg.blur + 'px'); r.setProperty('--op', cfg.opacity / 100); r.setProperty('--r', cfg.radius + 'px'); paintGlass(); };
const item = (iconH, label, id, i, extra = '') => `<div class="item" data-tip="${esc(label)}" ${id ? `id="${id}"` : ''} ${extra} style="--i:${i}"><span class="ic">${iconH}</span><span class="lbl">${esc(label)}</span></div>`;

/* ===== Modules de la barre latérale (cfg.layout : liste ordonnée) ===== */
const ICD = { folder: 'folder', profile: 'user', stats: 'activity', sep: 'minus', spacer: 'move-vertical', app: 'app-window', add: 'plus', set: 'settings', hid: 'eye-off', out: 'log-out' };
const LBLK = { add: 'addApp', set: 'settings', hid: 'hide', out: 'leave' };
const togRed = () => cfg.state === 'reduced';
const defIcon = b => b.type === 'tog' ? (togRed() ? 'chevrons-right' : 'chevrons-left') : (ICD[b.type] || 'app-window');
const defLbl = b => b.type === 'tog' ? T(togRed() ? 'expand' : 'collapse') : T(LBLK[b.type] || 'mBuiltin');
const tintH = b => `<span class="tint" style="--m:url(${b.mask})"></span>`;
const isTint = b => !!(b.tint && b.mask && b.logo);
const miniIcon = a => isTint(a) ? tintH(a) : a.logo ? `<img src="${a.logo}" draggable="false">` : ic(a.icon || 'app-window', 12);
const folderIcon = (b, s = 22) => (b.items || []).length ? `<span class="fg">${b.items.slice(0, 4).map(a => `<i>${miniIcon(a)}</i>`).join('')}</span>` : ic('folder', s);
const bname = b => b.type === 'folder' ? (b.name || T('mFolder')) : b.type === 'app' ? (b.name || '') : b.type === 'profile' ? T('mProfile') : b.type === 'stats' ? T('mStats') : b.type === 'sep' ? T('mSep') : b.type === 'spacer' ? T('mSpacer') : (b.label || defLbl(b));
const bicon = (b, s = 22) => b.type === 'folder' ? folderIcon(b, s) : isTint(b) ? tintH(b) : b.logo ? `<img src="${b.logo}" draggable="false">` : ic(b.icon || defIcon(b), s);
const defLayout = (apps = []) => [{ type: 'profile' }, { type: 'stats', cpu: true, ram: true, ssd: true, up: true }, ...apps.map(a => ({ type: 'app', ...a })), { type: 'add' }, { type: 'spacer' }, { type: 'sep' }, { type: 'tog' }, { type: 'set' }, { type: 'hid' }, { type: 'out' }].map(b => ({ id: uid(), visible: true, ...b }));
const setLayout = L => { persist({ layout: L }); buildBar(); refreshFold(); };
const addBlock = b => { const L = cfg.layout.slice(), i = L.findIndex(x => x.type === 'add'); L.splice(i < 0 ? L.length : i, 0, { id: uid(), visible: true, ...b }); setLayout(L); };

let hdrag = null, hmoved = false;
// position de la flèche (barre masquée) : libre dans l'écran ; à la réouverture on revient à la position de base (centrée)
function placeHid() {
  const hp = cfg.state === 'hidden' && cfg.hidPos;
  if (!hp) { bar.style.position = bar.style.left = bar.style.top = bar.style.margin = ''; return; }
  bar.style.position = 'fixed'; bar.style.margin = '0';
  bar.style.left = Math.round(Math.max(0, Math.min(hp.x, innerWidth - 40))) + 'px';
  bar.style.top = Math.round(Math.max(0, Math.min(hp.y, innerHeight - 124))) + 'px';
}
function setState(s) { closeFold(); persist(s === 'hidden' ? { state: s } : { state: s, hidPos: null }); applyState(); }
function applyState() {
  bar.className = 'glass ' + cfg.state; placeHid(); placeIsland();
  ['reduced', 'expanded', 'hidden'].forEach(c => tray.classList.toggle(c, cfg.state === c)); placeTray();
  const t = $('#tog'), tb = cfg.layout.find(x => x.type === 'tog');
  if (t && tb) {
    if (!tb.logo && !tb.icon) t.querySelector('.ic').innerHTML = ic(defIcon(tb));
    if (!tb.label) { t.querySelector('.lbl').textContent = defLbl(tb); t.dataset.tip = defLbl(tb); }
  }
  if (cfg.state === 'expanded') tick();
}
function blockHtml(b, i) {
  const t = b.type;
  if (t === 'sep') return '<div class="sep"></div>';
  if (t === 'spacer') return '<div class="spacer"></div>';
  if (t === 'profile') return `<div class="profile" id="prof"><div class="avatar">${avatarHtml()}</div><div class="pinfo"><b>${esc(cfg.name)}</b><br><small id="clock"></small></div></div>`;
  if (t === 'stats') {
    const ks = ['CPU', 'RAM', 'SSD'].filter(k => b[k.toLowerCase()]);
    if (!ks.length && !b.up) return '';
    return `<div class="stats">${ks.map(k => `<div class="stat"><span>${k}</span><div class="track"><div class="fill" id="f${k}"></div></div><span id="v${k}">–</span><small id="d${k}"></small></div>`).join('')}${b.up ? `<div class="sys">${ic('clock', 13)}<span id="up">–</span></div>` : ''}</div>`;
  }
  return item(bicon(b), bname(b), t === 'app' || t === 'folder' ? '' : t, i, `data-b="${b.id}"`);
}
const launchB = b => b.args ? api.launchApp(b.path, b.args, b.cwd || '') : api.launch(b.path);
const act = b => ({
  app: () => launchB(b), folder: () => openFold(b.id), add: () => editItem(null, 'app'), tog: () => setState(togRed() ? 'expanded' : 'reduced'),
  set: () => openWin('set'), hid: () => setState('hidden'), out: () => api.quit()
})[b.type]?.();
function buildBar() {
  const vis = cfg.layout.filter(b => b.visible !== false);
  bar.innerHTML = `<div id="tab">${ic('chevron-right', 20)}</div><div id="content">${vis.map((b, i) => blockHtml(b, i)).join('')}</div>`;
  bar.querySelectorAll('[data-b]').forEach(e => {
    const b = cfg.layout.find(x => x.id === e.dataset.b); if (!b) return;
    e.onclick = () => act(b);
    if (b.type === 'app' || b.type === 'folder') bindDrag(e, b);
    bindDrop(e, b, null, false);
    if (b.type === 'app' || b.type === 'folder') e.oncontextmenu = ev => { ev.preventDefault(); editItem(b.id); };
  });
  bindCtn($('#content'), null);
  const pf = $('#prof'); if (pf) pf.onclick = () => openWin('set');
  $('#tab').onclick = () => { if (hmoved) return; setState('reduced'); };
  applyState(); paintStats(lastS);
}
const islLB = () => 10 + ({ reduced: 76, expanded: 280, hidden: 40 }[cfg.state] || 76) + 14;
function placeIsland() {
  const el = $('#isl'); if (!el || !el.firstChild || idrag) return;
  if (ISL) { el.style.left = el.style.top = '50px'; return; }
  const w = el.offsetWidth, h = el.offsetHeight, lb = islLB(), rb = Math.max(lb, innerWidth - w - 10), bb = Math.max(10, innerHeight - h - 10), p = cfg.mediaPos || { x: 0, y: .5 };
  el.style.left = Math.round(lb + p.x * (rb - lb)) + 'px'; el.style.top = Math.round(10 + p.y * (bb - 10)) + 'px';
}
addEventListener('resize', () => { theme(); placeHid(); placeIsland(); placeTray(); if (FO) placeFold(); });

/* ===== Île musique (entièrement personnalisable) ===== */
const MD = { layout: 'h', width: 340, cover: true, coverSize: 76, coverRadius: 18, artist: true, progress: true, times: true, controls: true, skip: true, hidePaused: false, useAccent: false, color: '#ffffff', op: 0, radius: 30, text: 100 };
const mus = () => ({ ...MD, ...cfg.music });
const setM = (k, v) => { cfg.music = { ...mus(), [k]: v }; api.setCfg({ music: cfg.music }); };
const islandOn = () => !!(cfg.showMedia && media.title && (!mus().hidePaused || media.playing) && (ISL || !cfg.islDet));
// en mode fenêtre séparée, la fenêtre épouse la taille de l'île (marge 50px pour l'ombre) ; masquée quand l'île est vide
function fitIsl() { if (!ISL) return; const el = $('#isl'); if (el.firstElementChild) api.islFit(el.offsetWidth, el.offsetHeight); else api.islFit(0, 0); }
if (ISL) new ResizeObserver(() => fitIsl()).observe($('#isl'));
function drawIsland() {
  const el = $('#isl'), cur = el.firstElementChild, on = islandOn(); islShown = on;
  if (!on) {
    if (cur && !cur.classList.contains('closing')) play(cur, 'closing', () => { if (!islandOn()) { el.innerHTML = ''; fitIsl(); } });
    return;
  }
  const M = mus(), isNew = !cur || cur.classList.contains('closing');
  el.style.width = M.width + 'px'; islSig = JSON.stringify(M);
  const st = `--rr:${M.radius}px;border-radius:${M.radius}px;font-size:${16 * M.text / 100}px;${M.op ? `--op:${M.op / 100};` : ''}`;
  const cs = `width:${M.coverSize}px;height:${M.coverSize}px;border-radius:${M.coverRadius}px;`;
  const pc = M.useAccent ? 'var(--accent)' : M.color;
  el.innerHTML = `<div class="island glass ${M.layout === 'v' ? 'v' : ''}" style="${st}">${M.cover ? `<div class="cover" id="cv" style="${cs}">${ic('music', Math.round(M.coverSize * .37))}</div>` : ''}<div class="meta"><b id="mtl"></b>${M.artist ? '<span id="mar"></span>' : ''}
  ${M.progress ? `<div class="bar2"><i id="mp" style="background:${pc}"></i></div>` : ''}${M.times ? `<div class="time"${M.progress ? '' : ' style="margin-top:6px"'}><span id="mt1"></span><span id="mt2"></span></div>` : ''}
  ${M.controls ? `<div class="ctl">${M.skip ? `<button onclick="api.mediaCmd('prev')">${ic('skip-back', 16)}</button>` : ''}<button id="mpl" onclick="api.mediaCmd('toggle')"></button>${M.skip ? `<button onclick="api.mediaCmd('next')">${ic('skip-forward', 16)}</button>` : ''}</div>` : ''}</div></div>`;
  $('#mtl').textContent = media.title; if ($('#mar')) $('#mar').textContent = media.artist || '';
  if (M.cover && media.cover) { $('#cv').style.backgroundImage = `url("${media.cover}")`; $('#cv').innerHTML = ''; $('#cv').dataset.u = '1'; }
  updateMedia(); placeIsland(); fitIsl();
  if (isNew) play(el.firstElementChild, 'opening');
}
function updateMedia() {
  const p = $('#mp');
  if (p) {
    const w = media.dur ? Math.min(100, media.pos / media.dur * 100) : 0;
    if (w < (+p.dataset.w || 0) - 5) { p.style.transition = 'none'; p.style.width = w + '%'; void p.offsetWidth; p.style.transition = ''; } else p.style.width = w + '%'; // nouvelle piste : pas de balayage arrière
    p.dataset.w = w;
  }
  const a = $('#mt1'); if (a) { a.textContent = fmt(media.pos); $('#mt2').textContent = fmt(media.dur); }
  const b = $('#mpl'); if (b && b.dataset.p !== String(media.playing)) { b.dataset.p = media.playing; b.innerHTML = ic(media.playing ? 'pause' : 'play', 16); }
}
/* ===== Fenêtres style macOS (Paramètres + Nouvelle app / édition) ===== */
const WINS = {
  set: { el: '#win', tk: 'settings', icon: 'settings', dw: 820, dh: 540, minW: 560, minH: 380, tab: 'general' },
  add: { el: '#wadd', tk: 'newApp', icon: 'plus', dw: 560, dh: 640, minW: 460, minH: 500 }
};
Object.values(WINS).forEach(s => Object.assign(s, { open: false, min: false, max: false, x: 0, y: 0, w: s.dw, h: s.dh, prev: null }));
let drag = null, zTop = 5;
const TABS = [['general', 'user', 'tGeneral'], ['look', 'palette', 'tLook'], ['music', 'music', 'tMusic'], ['bar', 'panel-left', 'tBar'], ['task', 'panel-bottom', 'tTask'], ['screens', 'monitor', 'tScreens']];
const winEl = k => document.querySelector(WINS[k].el);
function play(el, c, done) {
  el.classList.remove('opening', 'closing', 'mini'); void el.offsetWidth; el.classList.add(c);
  const f = e => { if (e.target !== el) return; el.removeEventListener('animationend', f); el.classList.remove(c); done && done(); };
  el.addEventListener('animationend', f);
}
function place(k) { const s = WINS[k], w = winEl(k); w.style.left = s.x + 'px'; w.style.top = s.y + 'px'; w.style.width = s.w + 'px'; w.style.height = s.h + 'px'; }
function openWin(k) {
  const s = WINS[k], w = winEl(k);
  if (s.open && !s.min) return closeWin(k);
  w.style.zIndex = ++zTop;
  if (s.min) { s.min = false; w.style.display = ''; drawTray(); return play(w, 'opening'); }
  s.open = true; s.w = Math.min(s.dw, innerWidth - 40); s.h = Math.min(s.dh, innerHeight - 40);
  s.x = Math.round((innerWidth - s.w) / 2) + (k === 'add' ? 40 : 0); s.y = Math.round((innerHeight - s.h) / 2);
  buildWin(k); play(w, 'opening');
}
function closeWin(k) {
  const s = WINS[k], w = winEl(k);
  play(w, 'closing', () => { Object.assign(s, { open: false, min: false, max: false }); w.className = 'mwin'; w.style.display = 'none'; w.innerHTML = ''; drawTray(); });
}
// bouton orange : la fenêtre sort (même animation que la fermeture) et une mini-fenêtre sous la sidebar permet de la rouvrir
function minWin(k) {
  const s = WINS[k], w = winEl(k);
  s.min = true; drawTray();
  play(w, 'closing', () => { w.style.display = 'none'; });
}
function maxWin(k) {
  const s = WINS[k], w = winEl(k); w.classList.add('anim');
  if (!s.max) { s.prev = { x: s.x, y: s.y, w: s.w, h: s.h }; Object.assign(s, { x: 100, y: 10, w: innerWidth - 110, h: innerHeight - 20, max: true }); }
  else Object.assign(s, s.prev, { max: false });
  place(k); setTimeout(() => w.classList.remove('anim'), 700);
}
function startDrag(e, m, k) {
  const s = WINS[k];
  if (e.button || e.target.closest('.lights') || (s.max && m === 'move')) return;
  drag = { k, m, sx: e.clientX, sy: e.clientY, x: s.x, y: s.y, w: s.w, h: s.h }; winEl(k).classList.add('dragging'); e.preventDefault();
}
addEventListener('mousemove', e => {
  if (idrag) {
    const el = $('#isl'), w = el.offsetWidth, h = el.offsetHeight, lb = islLB();
    el.style.left = cl(idrag.l + e.clientX - idrag.sx, lb, Math.max(lb, innerWidth - w - 10)) + 'px';
    el.style.top = cl(idrag.t + e.clientY - idrag.sy, 10, Math.max(10, innerHeight - h - 10)) + 'px';
    // curseur sorti de l'écran du dock : l'île devient une fenêtre à part (main.js vérifie qu'il y a bien un autre écran)
    if (!ISL && SCR.length > 1 && (e.clientX < 0 || e.clientX >= innerWidth || e.clientY < 0 || e.clientY >= innerHeight) && Date.now() - detT > 200) { detT = Date.now(); api.islDetach(el.offsetWidth, el.offsetHeight); }
    paintGlass(); return;
  }
  if (!drag) return; const s = WINS[drag.k], dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
  if (drag.m === 'move') { s.x = cl(drag.x + dx, 90 - s.w, innerWidth - 90); s.y = cl(drag.y + dy, 0, innerHeight - 50); }
  else { s.w = Math.max(s.minW, drag.w + dx); s.h = Math.max(s.minH, drag.h + dy); }
  place(drag.k); paintGlass();
});
document.addEventListener('mousedown', e => {
  if (e.button || !e.target.closest('.island') || e.target.closest('button')) return;
  if (ISL) { idragI = true; api.islDragStart(e.clientX, e.clientY); e.preventDefault(); return; }
  const el = $('#isl'), b = el.getBoundingClientRect();
  api.dragHold(true);
  idrag = { sx: e.clientX, sy: e.clientY, l: b.left, t: b.top }; el.classList.add('dragging'); e.preventDefault();
});
addEventListener('mouseup', () => {
  if (drag) { winEl(drag.k).classList.remove('dragging'); drag = null; }
  if (idragI) { idragI = false; api.islDragEnd(); }
  if (islExt) { islExt = false; api.dragHold(false); api.islDragEnd(); }
  if (idrag) {
    const el = $('#isl'), w = el.offsetWidth, h = el.offsetHeight, lb = islLB(), rb = Math.max(lb, innerWidth - w - 10), bb = Math.max(10, innerHeight - h - 10);
    el.classList.remove('dragging'); idrag = null; api.dragHold(false);
    persist({ mediaPos: { x: cl((parseFloat(el.style.left) - lb) / Math.max(1, rb - lb), 0, 1), y: cl((parseFloat(el.style.top) - 10) / Math.max(1, bb - 10), 0, 1) } });
    markPos();
  }
});
function buildWin(k) {
  const s = WINS[k], w = winEl(k); w.className = 'mwin glass'; w.style.display = ''; place(k);
  w.innerHTML = `<div class="wbar"><span class="wt">${ic(s.icon, 17)}${esc(T(s.tk))}</span>
   <div class="lights"><span class="tl g">${ic('maximize-2', 9)}</span><span class="tl o">${ic('minus', 10)}</span><span class="tl r">${ic('x', 10)}</span></div></div>
   <div class="wbody">${k === 'set' ? '<div class="wside"></div>' : ''}<div class="wmain"></div></div><div class="rz"></div>`;
  const q = x => w.querySelector(x);
  q('.tl.r').onclick = () => closeWin(k); q('.tl.o').onclick = () => minWin(k); q('.tl.g').onclick = () => maxWin(k);
  q('.wbar').ondblclick = e => { if (!e.target.closest('.lights')) maxWin(k); };
  q('.wbar').onmousedown = e => startDrag(e, 'move', k); q('.rz').onmousedown = e => startDrag(e, 'size', k);
  w.onmousedown = () => { w.style.zIndex = ++zTop; };
  if (k === 'set') drawWinTabs(); else drawAdd();
}
// change la langue de toute l'interface à chaud
function refreshUI() {
  setUL(cfg.lang || SYS.lang); buildBar(); drawTray();
  Object.keys(WINS).forEach(k => { const s = WINS[k]; if (s.open) { buildWin(k); if (s.min) winEl(k).style.display = 'none'; } });
}
const sec = k => `<div class="ssec">${k ? `<span>${esc(T(k))}</span>` : ''}</div>`;
const rowHtml = (l, c, sub = '') => `<div class="row"><div><b>${l}</b>${sub ? `<small>${sub}</small>` : ''}</div>${c}</div>`;
const stagger = m => [...m.children].forEach((c, i) => c.style.setProperty('--n', i));
const sw = (id, on, extra = '') => `<label class="sw"><input type="checkbox" id="${id}" ${on ? 'checked' : ''} ${extra}><i></i></label>`;
const seg = (id, opts, cur) => `<div class="seg" id="${id}">${opts.map(([v, l]) => `<span data-v="${v}" class="${v === cur ? 'on' : ''}">${l}</span>`).join('')}</div>`;
function drawWinTabs() {
  const w = winEl('set'), s = w.querySelector('.wside'); if (!s) return;
  s.innerHTML = TABS.map(([k, i, l], n) => `${n === 1 || n === 3 ? '<div class="tsep"></div>' : ''}<div class="tab ${k === WINS.set.tab ? 'on' : ''}" data-t="${k}">${ic(i, 18)}${esc(T(l))}</div>`).join('');
  s.querySelectorAll('.tab').forEach(t => t.onclick = () => { if (WINS.set.tab === t.dataset.t) return; WINS.set.tab = t.dataset.t; drawWinTabs(); });
  drawWinMain();
}
function drawWinMain(still) {
  const w = winEl('set'), m = w.querySelector('.wmain'); if (!m) return;
  m.classList.toggle('still', !!still);
  const t = WINS.set.tab, g = id => document.getElementById(id), row = rowHtml, M = mus();
  const rng = (id, v, min, max, u = '', z = '') => `<div class="rg"><input type="range" id="${id}" min="${min}" max="${max}" value="${v}"><span class="val" id="v-${id}">${v === 0 && z ? z : v + u}</span></div>`;
  const title = T({ general: 'tGeneral', look: 'tLook', music: 'tMusic', bar: 'tBar', task: 'tTask', screens: 'tScreens' }[t]);
  let body = '';
  if (t === 'general') {
    const tzs = getTz().slice(); if (!tzs.some(x => x[0] === cfg.timezone)) tzs.unshift([cfg.timezone, cfg.timezone]);
    body = sec('sProfile') + row(T('profilePhoto'), `<div class="rg"><span class="avatar sm">${avatarHtml()}</span><span class="btn" id="s-av">${ic('image', 16)} ${T('choose')}</span>${cfg.avatar ? `<span class="btn" id="s-avx">${ic('trash-2', 16)}</span>` : ''}</div>`, T('photoSub'))
      + row(T('nickname'), `<input type="text" id="s-name" value="${esc(cfg.name)}">`, T('nickSub'))
      + sec('sLocale') + row(T('lang'), `<select class="sin" id="s-lang">${LANGS.map(([c, n]) => `<option value="${c}" ${c === cfg.lang ? 'selected' : ''}>${n}</option>`).join('')}</select>`)
      + row(T('tz'), `<select class="sin" id="s-tz">${tzs.map(([v, l]) => `<option value="${esc(v)}" ${v === cfg.timezone ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`)
      + row(T('autoSys'), sw('s-auto', cfg.autoLocale !== false), T('autoSub'))
      + sec('sStartup') + row(T('autoStart'), sw('s-start', !!cfg.autoStart), T('autoStartSub'))
      + sec('sUpdates') + row(T('updTitle'), '<span class="btn" id="u-btn"></span>', '<span id="u-txt"></span>')
      + row(T('updAuto'), sw('s-upd', cfg.autoUpdate !== false), T('updAutoSub'))
      + sec('sApp') + row(T('initSetup'), `<span class="btn" id="s-setup">${ic('rotate-ccw', 16)} ${T('relaunch')}</span>`, T('initSub'))
      + row(T('quit'), `<span class="btn" id="s-quit">${ic('log-out', 16)} ${T('quitApp')}</span>`);
  } else if (t === 'look') body = sec('sColors') + row(T('accent'), `<input type="color" id="s-acc" value="${cfg.accent}">`) + sec('sGlass') + row(T('blur'), rng('s-blur', cfg.blur, 0, 60, 'px')) + row(T('glass'), rng('s-op', cfg.opacity, 4, 60, '%')) + row(T('round'), rng('s-r', cfg.radius, 8, 44, 'px'));
  else if (t === 'music') {
    body = sec('sMIsland') + row(T('mIsland'), sw('s-med', cfg.showMedia), T('mIslandSub'))
      + row(T('mPos'), `<div class="pos">${POS.map((q, i) => `<span data-i="${i}" class="${posOn(cfg.mediaPos || { x: 0, y: .5 }, q) ? 'on' : ''}"></span>`).join('')}</div>`, T('mPosSub'))
      + (SCR.length > 1 ? row(T('mScreen'), `<select class="sin" id="m-scr"><option value="" ${cfg.islDet ? '' : 'selected'}>${esc(T('mWithDock'))}</option>${SCR.filter(s => !s.current).map(s => `<option value="${s.id}" ${cfg.islDet && cfg.islDet.did === s.id ? 'selected' : ''}>${esc(T('scrName', s.n))}</option>`).join('')}</select>`, T('mScreenSub')) : '')
      + sec('sMLayout') + row(T('mLayout'), seg('m-layout', [['h', T('lH')], ['v', T('lV')]], M.layout))
      + row(T('mWidth'), rng('m-width', M.width, 220, 520, 'px'))
      + row(T('mRadius'), rng('m-radius', M.radius, 8, 44, 'px'))
      + row(T('mText'), rng('m-text', M.text, 80, 140, '%'))
      + row(T('mGlass'), rng('m-op', M.op, 0, 60, '%', T('auto')), T('mGlassAuto'))
      + sec('sMContent') + row(T('mCover'), sw('m-cover', M.cover))
      + row(T('mCoverSize'), rng('m-coverSize', M.coverSize, 40, 140, 'px'))
      + row(T('mCoverRound'), rng('m-coverRadius', M.coverRadius, 0, 70, 'px'))
      + row(T('mArtist'), sw('m-artist', M.artist))
      + row(T('mProg'), sw('m-progress', M.progress))
      + row(T('mTimes'), sw('m-times', M.times))
      + row(T('mCtl'), sw('m-controls', M.controls))
      + row(T('mSkip'), sw('m-skip', M.skip))
      + row(T('mHidePaused'), sw('m-hidePaused', M.hidePaused), T('mHidePausedSub'))
      + sec('sColors') + row(T('mUseAccent'), sw('m-useAccent', M.useAccent))
      + row(T('mColor'), `<input type="color" id="m-color" value="${M.color}">`)
      + sec('') + row(T('mReset'), `<span class="btn" id="m-reset">${ic('rotate-ccw', 16)}</span>`);
  } else if (t === 'screens') {
    const S = SCR;
    if (!S.length) body = '<div class="fempty">…</div>';
    else {
      const x0 = Math.min(...S.map(s => s.x)), y0 = Math.min(...S.map(s => s.y)), x1 = Math.max(...S.map(s => s.x + s.w)), y1 = Math.max(...S.map(s => s.y + s.h));
      const k = Math.min(500 / (x1 - x0), 190 / (y1 - y0)), mw = Math.round((x1 - x0) * k), mh = Math.round((y1 - y0) * k);
      body = sec('sScrMap') + `<div class="smapw"><div class="smap" style="width:${mw}px;height:${mh}px">${S.map(s => `<div class="scr ${s.current ? 'on' : ''}" data-id="${s.id}" style="left:${Math.round((s.x - x0) * k)}px;top:${Math.round((s.y - y0) * k)}px;width:${Math.round(s.w * k) - 4}px;height:${Math.round(s.h * k) - 4}px"><b>${s.n}</b><small>${s.pw}×${s.ph}</small></div>`).join('')}</div></div>`
        + sec('sScrList') + row(T('scrTitle'), `<span class="btn" id="sc-id">${ic('monitor', 16)} ${T('scrId')}</span>`, T('scrCount', S.length) + ' · ' + T('scrIdSub'))
        + S.map(s => row(T('scrName', s.n) + (s.primary ? ' · ' + T('scrMain') : ''), s.current ? `<span class="btn sm off">${ic('check', 14)} ${T('scrCur')}</span>` : `<span class="btn sm" data-sc="${s.id}">${T('scrUse')}</span>`, `${s.pw}×${s.ph} · ${Math.round(s.sf * 100)}%`)).join('')
        + `<div class="hint">${esc(T('scrSub'))}</div><div class="hint">${esc(T('scrIsl'))}</div>`;
    }
  } else if (t === 'task') {
    const K = cfg.task, I = K.items || [];
    body = sec('tGeneral') + row(T('tkOn'), sw('k-on', K.enabled), T('tkOnSub')) + row(T('tkHide'), sw('k-hide', K.hideWin), T('tkHideSub'))
      + sec('sTkApps') + row(T('tkAdd'), `<div class="rg tight wrap"><span class="btn sm" id="k-add">${ic('plus', 14)} ${T('bAddApp')}</span><span class="btn sm" id="k-imp">${ic('download', 14)} ${T('tkImport')}</span></div>`)
      + I.map((b, i) => `<div class="row mrow"><div class="appn"><span class="lprev">${b.logo ? `<img src="${b.logo}">` : ic(b.icon || 'app-window', 20)}</span><span><b>${esc(b.name)}</b><small>${esc(b.path || '')}</small></span></div>
        <div class="rg tight"><span class="btn sm ib ${i ? '' : 'off'}" data-k="up" data-id="${b.id}">${ic('arrow-up', 14)}</span><span class="btn sm ib ${i < I.length - 1 ? '' : 'off'}" data-k="dn" data-id="${b.id}">${ic('arrow-down', 14)}</span><span class="btn sm ib" data-k="rm" data-id="${b.id}">${ic('trash-2', 14)}</span></div></div>`).join('');
  } else {
    const L = cfg.layout, nm = b => b.type === 'folder' ? T('mApps', (b.items || []).length) : b.type === 'app' ? esc(b.path || '') : ['add', 'tog', 'set', 'hid', 'out'].includes(b.type) ? T('mBuiltin') : '';
    body = sec('sBState') + row(T('bState'), seg('b-state', [['reduced', T('sRed')], ['expanded', T('sExp')], ['hidden', T('sHid')]], cfg.state))
      + sec('sBModules') + row(T('bAdd'), `<div class="rg tight wrap"><span class="btn sm" id="b-app">${ic('plus', 14)} ${T('bAddApp')}</span><span class="btn sm" id="b-fold">${ic('folder', 14)} ${T('bAddFolder')}</span><span class="btn sm" id="b-sep">${ic('minus', 14)} ${T('bAddSep')}</span><span class="btn sm" id="b-spc">${ic('move-vertical', 14)} ${T('bAddSpacer')}</span></div>`)
      + L.map((b, i) => `<div class="row mrow ${b.visible === false ? 'hid' : ''}"><div class="appn"><span class="lprev">${bicon(b, 20)}</span><span><b>${esc(bname(b))}</b>${nm(b) ? `<small>${nm(b)}</small>` : ''}</span></div>
        <div class="rg tight"><span class="btn sm ib ${i ? '' : 'off'}" data-a="up" data-id="${b.id}">${ic('arrow-up', 14)}</span><span class="btn sm ib ${i < L.length - 1 ? '' : 'off'}" data-a="dn" data-id="${b.id}">${ic('arrow-down', 14)}</span>
        ${['sep', 'spacer', 'profile'].includes(b.type) ? '' : `<span class="btn sm ib" data-a="ed" data-id="${b.id}">${ic('pencil', 14)}</span>`}
        ${['app', 'folder', 'sep', 'spacer'].includes(b.type) ? `<span class="btn sm ib" data-a="rm" data-id="${b.id}">${ic('trash-2', 14)}</span>` : ''}
        ${sw('', b.visible !== false, `data-vis="${b.id}" ${b.type === 'set' ? 'disabled' : ''}`)}</div></div>`).join('')
      + sec('') + row(T('bReset'), `<span class="btn" id="b-reset">${ic('rotate-ccw', 16)}</span>`, T('bResetSub'));
  }
  m.innerHTML = `<h2>${title}</h2>${body}`; stagger(m);
  // --- général
  if (g('s-name')) g('s-name').onchange = e => { persist({ name: e.target.value }); buildBar(); };
  if (g('s-quit')) g('s-quit').onclick = () => api.quit();
  if (g('s-setup')) g('s-setup').onclick = () => openSetup(false);
  if (g('s-av')) g('s-av').onclick = async () => { const raw = await api.pickImage(); if (!raw) return; const a = await toAvatar(raw); if (!a) return; persist({ avatar: a }); buildBar(); drawWinMain(true); };
  if (g('s-avx')) g('s-avx').onclick = () => { persist({ avatar: '' }); buildBar(); drawWinMain(true); };
  if (g('s-lang')) g('s-lang').onchange = e => { persist({ lang: e.target.value, autoLocale: false }); refreshUI(); };
  if (g('s-tz')) g('s-tz').onchange = e => { persist({ timezone: e.target.value, autoLocale: false }); drawWinMain(true); };
  if (g('s-start')) g('s-start').onchange = e => persist({ autoStart: e.target.checked });
  if (g('s-upd')) g('s-upd').onchange = e => persist({ autoUpdate: e.target.checked });
  paintUpdRow();
  if (t === 'screens') {
    m.querySelectorAll('[data-sc],.scr').forEach(e => e.onclick = () => { const id = +(e.dataset.sc || e.dataset.id), s = SCR.find(x => x.id === id); if (s && !s.current) persist({ display: id }); });
    if (g('sc-id')) g('sc-id').onclick = () => api.identifyScreens();
  }
  if (g('s-auto')) g('s-auto').onchange = e => { if (e.target.checked) { persist({ autoLocale: true, lang: SYS.lang, timezone: SYS.tz }); refreshUI(); } else persist({ autoLocale: false }); };
  // --- apparence
  [['s-acc', 'accent', v => v], ['s-blur', 'blur', Number], ['s-op', 'opacity', Number], ['s-r', 'radius', Number]].forEach(([id, k, f]) => {
    const e = g(id); if (!e) return;
    e.oninput = ev => { cfg[k] = f(ev.target.value); theme(); api.setCfg({ [k]: cfg[k] }); const v = g('v-' + id); if (v) v.textContent = cfg[k] + (id === 's-op' ? '%' : 'px'); };
  });
  // --- musique
  if (g('s-med')) g('s-med').onchange = e => { persist({ showMedia: e.target.checked }); drawIsland(); };
  if (g('m-scr')) g('m-scr').onchange = e => { const v = e.target.value, el = $('#isl'); if (!v) api.islAttach(); else api.islTo(+v, el.firstElementChild ? el.offsetWidth : mus().width, el.firstElementChild ? el.offsetHeight : 120); };
  m.querySelectorAll('.pos span').forEach(c => c.onclick = () => { const q = POS[c.dataset.i]; persist({ mediaPos: { x: q[0], y: q[1] } }); if (cfg.islDet) api.islTo(cfg.islDet.did); placeIsland(); markPos(); });
  [['width', 'px'], ['radius', 'px'], ['text', '%'], ['op', '%'], ['coverSize', 'px'], ['coverRadius', 'px']].forEach(([k, u]) => {
    const e = g('m-' + k); if (!e) return;
    e.oninput = ev => { const v = +ev.target.value; setM(k, v); g('v-m-' + k).textContent = k === 'op' && !v ? T('auto') : v + u; drawIsland(); };
  });
  ['cover', 'artist', 'progress', 'times', 'controls', 'skip', 'hidePaused', 'useAccent'].forEach(k => { const e = g('m-' + k); if (e) e.onchange = ev => { setM(k, ev.target.checked); drawIsland(); }; });
  if (g('m-color')) g('m-color').oninput = e => { setM('color', e.target.value); drawIsland(); };
  if (g('m-layout')) g('m-layout').querySelectorAll('span').forEach(s => s.onclick = () => { setM('layout', s.dataset.v); g('m-layout').querySelectorAll('span').forEach(x => x.classList.toggle('on', x === s)); drawIsland(); });
  if (g('m-reset')) g('m-reset').onclick = () => { cfg.music = { ...MD }; api.setCfg({ music: cfg.music }); drawIsland(); drawWinMain(true); };
  // --- barre des tâches
  if (g('k-on')) g('k-on').onchange = e => { setTask({ enabled: e.target.checked }); buildTask(); applyWinTask(); };
  if (g('k-hide')) g('k-hide').onchange = e => { setTask({ hideWin: e.target.checked }); applyWinTask(); };
  if (g('k-add')) g('k-add').onclick = async () => {
    const p = await api.pick(); if (!p) return;
    const logo = await api.iconFile(p), name = p.split(/[\\/]/).pop().replace(/\.\w+$/, '');
    setTask({ items: [...cfg.task.items, { id: uid(), name, path: p, logo }] }); buildTask(); drawWinMain(true);
  };
  if (g('k-imp')) g('k-imp').onclick = async () => {
    const l = await api.pinnedWin(), have = new Set(cfg.task.items.map(a => a.path));
    setTask({ items: [...cfg.task.items, ...l.filter(a => !have.has(a.path)).map(a => ({ id: uid(), ...a }))] }); buildTask(); drawWinMain(true);
  };
  m.querySelectorAll('[data-k]').forEach(e => e.onclick = () => {
    const I = cfg.task.items.slice(), i = I.findIndex(x => x.id === e.dataset.id), a = e.dataset.k; if (i < 0) return;
    if (a === 'rm') I.splice(i, 1); else { const j = i + (a === 'up' ? -1 : 1); if (j < 0 || j >= I.length) return; [I[i], I[j]] = [I[j], I[i]]; }
    setTask({ items: I }); buildTask(); drawWinMain(true);
  });
  // --- barre latérale
  if (g('b-state')) g('b-state').querySelectorAll('span').forEach(s => s.onclick = () => { setState(s.dataset.v); drawWinMain(true); });
  if (g('b-app')) g('b-app').onclick = () => editItem(null, 'app');
  if (g('b-fold')) g('b-fold').onclick = () => { addBlock({ type: 'folder', name: T('mFolder'), items: [] }); drawWinMain(true); };
  if (g('b-sep')) g('b-sep').onclick = () => { addBlock({ type: 'sep' }); drawWinMain(true); };
  if (g('b-spc')) g('b-spc').onclick = () => { addBlock({ type: 'spacer' }); drawWinMain(true); };
  if (g('b-reset')) g('b-reset').onclick = () => { setLayout(defLayout(cfg.layout.filter(b => b.type === 'app'))); drawWinMain(true); };
  m.querySelectorAll('[data-a]').forEach(e => e.onclick = () => {
    const id = e.dataset.id, a = e.dataset.a, i = cfg.layout.findIndex(x => x.id === id); if (i < 0) return;
    if (a === 'ed') return editItem(id);
    const L = cfg.layout.slice();
    if (a === 'rm') L.splice(i, 1, ...(L[i].type === 'folder' ? (L[i].items || []) : []));
    else { const j = i + (a === 'up' ? -1 : 1); if (j < 0 || j >= L.length) return; [L[i], L[j]] = [L[j], L[i]]; }
    setLayout(L); drawWinMain(true);
  });
  m.querySelectorAll('[data-vis]').forEach(e => e.onchange = () => { setLayout(cfg.layout.map(b => b.id === e.dataset.vis ? { ...b, visible: e.checked } : b)); drawWinMain(true); });
}
/* ===== Dossiers d'apps (style iPhone) ===== */
const cloneL = () => cfg.layout.map(b => b.type === 'folder' ? { ...b, items: (b.items || []).slice() } : b);
const arrays = L => [L, ...L.filter(x => x.type === 'folder').map(f => f.items || (f.items = []))];
const locB = (L, id) => { for (const a of arrays(L)) { const i = a.findIndex(x => x.id === id); if (i >= 0) return { a, i }; } return null; };
const findB = id => { const r = locB(cfg.layout, id); return r ? r.a[r.i] : null; };
const replaceB = (L, o) => { const r = locB(L, o.id); if (r) r.a[r.i] = o; };
function moveB(id, tid, mode) {
  const L = cloneL(), s = locB(L, id); if (!s || id === tid) return;
  const srcF = L.find(f => f.type === 'folder' && f.items === s.a);
  const [it] = s.a.splice(s.i, 1), t = locB(L, tid); if (!t || (it.type === 'folder' && t.a !== L)) return;
  const tg = t.a[t.i];
  if (mode === 'into' && it.type !== 'folder') {
    if (tg.type === 'folder') tg.items.push(it);
    else if (tg.type === 'app' && t.a === L) t.a[t.i] = { id: uid(), type: 'folder', visible: true, name: T('mFolder'), items: [tg, it] };
    else t.a.splice(t.i + 1, 0, it);
  } else t.a.splice(t.i + (mode === 'after' ? 1 : 0), 0, it);
  if (srcF && !srcF.items.length) L.splice(L.indexOf(srcF), 1);
  setLayout(L);
}
let dg = null, FO = null;
const fold = $('#fold');
const clrDrop = () => document.querySelectorAll('.dropin,.dropb,.dropa').forEach(x => x.classList.remove('dropin', 'dropb', 'dropa'));
function bindDrag(e, b) {
  e.draggable = true;
  e.ondragstart = ev => { dg = { id: b.id, folder: b.type === 'folder' }; ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', b.id); setTimeout(() => e.classList.add('dragging-item')); };
  e.ondragend = () => { dg = null; e.classList.remove('dragging-item'); clrDrop(); };
}
function bindDrop(e, b, inFold, horiz) {
  const mode = ev => {
    const r = e.getBoundingClientRect(), p = horiz ? (ev.clientX - r.left) / r.width : (ev.clientY - r.top) / r.height;
    const into = !inFold && !dg.folder && (b.type === 'folder' || b.type === 'app') && p > .25 && p < .75;
    return into ? 'into' : p < .5 ? 'before' : 'after';
  };
  e.ondragover = ev => {
    if (!dg || (dg.folder && inFold)) return;
    ev.preventDefault(); ev.stopPropagation(); if (dg.id === b.id) return;
    ev.dataTransfer.dropEffect = 'move'; clrDrop();
    const m = mode(ev); e.classList.add(m === 'into' ? 'dropin' : m === 'before' ? 'dropb' : 'dropa');
  };
  e.ondragleave = () => e.classList.remove('dropin', 'dropb', 'dropa');
  e.ondrop = ev => { if (!dg) return; ev.preventDefault(); ev.stopPropagation(); const m = mode(ev), id = dg.id; dg = null; clrDrop(); moveB(id, b.id, m); };
}
function bindCtn(el, fid) {
  if (!el) return;
  el.ondragover = ev => { if (!dg || (fid && dg.folder)) return; ev.preventDefault(); };
  el.ondrop = ev => {
    if (!dg) return; ev.preventDefault(); const id = dg.id; dg = null; clrDrop();
    if (fid) return moveB(id, fid, 'into');
    const a = cfg.layout.find(x => x.type === 'add'), last = cfg.layout[cfg.layout.length - 1];
    moveB(id, (a || last).id, a ? 'before' : 'after');
  };
}
function openFold(id) {
  if (FO === id) return closeFold();
  FO = id;
  const isNew = !fold.classList.contains('glass') || fold.classList.contains('closing');
  fold.className = 'glass fold'; drawFold();
  if (isNew) play(fold, 'opening');
}
const refreshFold = () => { if (FO) drawFold(); };
function drawFold() {
  const b = FO && findB(FO); if (!b) return closeFold(true);
  const it = b.items || [];
  fold.innerHTML = `<h3 id="fn" contenteditable="true" spellcheck="false">${esc(b.name || T('mFolder'))}</h3><div class="fgrid" id="fgr">${it.length ? it.map(a => `<div class="ftile" data-b="${a.id}"><div class="ti">${bicon(a, 28)}</div><span class="n">${esc(a.name || '')}</span></div>`).join('') : `<div class="fempty">${esc(T('emptyFolder'))}</div>`}</div>`;
  const n = $('#fn');
  n.onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); n.blur(); } };
  n.onblur = () => { const v = n.textContent.trim() || T('mFolder'); if (v !== (b.name || '')) setLayout(cfg.layout.map(x => x.id === b.id ? { ...x, name: v } : x)); };
  const g = $('#fgr'); bindCtn(g, b.id);
  g.querySelectorAll('.ftile').forEach(e => {
    const a = it.find(x => x.id === e.dataset.b); if (!a) return;
    bindDrag(e, a); bindDrop(e, a, b.id, true);
    e.onclick = () => { launchB(a); closeFold(); };
    e.oncontextmenu = ev => { ev.preventDefault(); editItem(a.id); };
  });
  placeFold();
}
function placeFold() {
  if (!fold.classList.contains('glass')) return;
  const el = bar.querySelector(`[data-b="${FO}"]`), br = bar.getBoundingClientRect(), r = el ? el.getBoundingClientRect() : br, h = fold.offsetHeight;
  fold.style.left = Math.round(br.right + 12) + 'px';
  fold.style.top = Math.round(cl(r.top + r.height / 2 - h / 2, 10, Math.max(10, innerHeight - h - 10))) + 'px';
}
function closeFold(now) {
  FO = null;
  if (!fold.classList.contains('glass')) return;
  if (now) { fold.className = ''; fold.innerHTML = ''; return; }
  play(fold, 'closing', () => { if (FO === null) { fold.className = ''; fold.innerHTML = ''; } });
}
document.addEventListener('mousedown', e => { if (FO && !e.target.closest('#fold') && !e.target.closest(`[data-b="${FO}"]`)) closeFold(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && FO) closeFold(); });
/* ===== Éditeur d'élément (nouvelle app / modification d'un module) ===== */
function editItem(id, type) {
  const b = id ? findB(id) : null, s = WINS.add;
  draft = b ? { ...b } : { type: type || 'app', visible: true, icon: 'gamepad-2', name: '', path: '', label: '', logo: '' };
  s.tk = b ? 'editItem' : 'newApp';
  if (s.open) { const w = winEl('add'), was = s.min; s.min = false; buildWin('add'); w.style.zIndex = ++zTop; if (was) play(w, 'opening'); drawTray(); }
  else openWin('add');
}
function drawAdd(still) {
  const w = winEl('add'), m = w.querySelector('.wmain'); if (!m) return;
  m.classList.toggle('still', !!still);
  const g = id => document.getElementById(id), t = draft.type, isApp = t === 'app', isF = t === 'folder', isStats = t === 'stats';
  const ST = [['cpu', 'CPU'], ['ram', 'RAM'], ['ssd', 'SSD'], ['up', T('mUptime')]];
  const cur = draft.icon || defIcon(draft);
  m.innerHTML = `<h2>${esc(T(draft.id ? 'editItem' : 'newApp'))}</h2>
   ${isApp || isF ? rowHtml(T('name'), `<input type="text" id="a-name" value="${esc(draft.name || '')}" placeholder="${esc(T('namePh'))}">`)
      + (isF ? '' : rowHtml(T('path'), `<div class="rg"><input type="text" id="a-path" value="${esc(draft.path || '')}" placeholder="C:\\...exe / steam://…"><span class="btn" id="a-pick">${ic('folder-open', 16)}</span></div>`, T('pathSub'))) : ''}
   ${!isApp && !isStats && !isF ? rowHtml(T('label'), `<input type="text" id="a-label" value="${esc(draft.label || '')}" placeholder="${esc(defLbl(draft))}">`, T('labelSub')) : ''}
   ${isStats ? rowHtml(T('statsShow'), '') + ST.map(([k, l]) => rowHtml(l, sw('a-st-' + k, draft[k] !== false && !!draft[k]))).join('') : ''}
   ${!isStats && !isF ? rowHtml(T('logo'), `<div class="rg"><span class="lprev" id="a-lp">${draft.logo ? `<img src="${draft.logo}">` : ic(cur, 18)}</span><span class="btn" id="a-logo">${ic('image', 16)} ${T('choose')}</span>${draft.logo ? `<span class="btn" id="a-logox">${ic('trash-2', 16)}</span>` : ''}</div>`, T('logoSub'))
      + rowHtml(T('icon'), `<input type="text" id="a-q" placeholder="${esc(T('iconSearch'))}">`) + '<div class="grid" id="a-grid"></div>' : ''}
   <div class="foot">${!isApp && !isStats && !isF ? `<span class="btn" id="a-def">${T('byDefault')}</span>` : ''}<span class="btn" id="a-cancel">${T('cancel')}</span><span class="btn pri" id="a-ok">${ic(draft.id ? 'check' : 'plus', 16)} ${T(draft.id ? 'save' : 'add')}</span></div>`;
  stagger(m);
  if (isF) {} else if (!isStats) {
    const names = Object.keys(api.icons), grid = g('a-grid');
    const show = q => {
      grid.innerHTML = names.filter(n => n.includes(q.toLowerCase())).slice(0, 140).map(n => `<div title="${n}" data-n="${n}" class="${n === draft.icon ? 'sel' : ''}">${ic(n, 22)}</div>`).join('');
      grid.querySelectorAll('div').forEach(d => d.onclick = () => { draft.icon = d.dataset.n; grid.querySelectorAll('.sel').forEach(x => x.classList.remove('sel')); d.classList.add('sel'); if (!draft.logo) g('a-lp').innerHTML = ic(draft.icon, 18); });
    };
    show(''); g('a-q').oninput = e => show(e.target.value);
    g('a-logo').onclick = async () => { const raw = await api.pickImage(); if (!raw) return; const l = await toLogo(raw); if (!l) return; draft.logo = l; draft.tint = false; draft.mask = ''; drawAdd(true); };
    if (g('a-logox')) g('a-logox').onclick = () => { draft.logo = ''; drawAdd(true); };
    if (g('a-def')) g('a-def').onclick = () => { draft.icon = ''; draft.logo = ''; draft.label = ''; drawAdd(true); };
  } else ST.forEach(([k]) => g('a-st-' + k).onchange = e => draft[k] = e.target.checked);
  if (isF) g('a-name').oninput = e => draft.name = e.target.value;
  else if (isApp) {
    g('a-name').oninput = e => draft.name = e.target.value; g('a-path').oninput = e => draft.path = e.target.value;
    g('a-pick').onclick = async () => {
      const p = await api.pick(); if (!p) return;
      draft.path = p; g('a-path').value = p;
      if (!g('a-name').value) { draft.name = p.split(/[\\/]/).pop().replace(/\.\w+$/, ''); g('a-name').value = draft.name; }
    };
  } else if (!isStats) g('a-label').oninput = e => draft.label = e.target.value;
  g('a-cancel').onclick = () => closeWin('add');
  g('a-ok').onclick = () => {
    const o = { ...draft };
    if (isF) o.name = (o.name || '').trim() || T('mFolder');
    else if (isApp) { o.name = (o.name || '').trim(); o.path = (o.path || '').trim(); if (!o.name || !o.path) return; }
    else if (!isStats) o.label = (o.label || '').trim();
    const L = cloneL();
    if (o.id) replaceB(L, o);
    else { o.id = uid(); o.visible = true; const i = L.findIndex(x => x.type === 'add'); L.splice(i < 0 ? L.length : i, 0, o); }
    setLayout(L); closeWin('add'); if (WINS.set.open) drawWinMain(true);
  };
}
/* ===== Barre des tâches (remplace celle de Windows) ===== */
const WINLOGO = '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M2 4.6 10.3 3.5v7.6H2zM11.4 3.4 22 2v9.1H11.4zM2 12.9h8.3v7.6L2 19.4zM11.4 12.9H22V22l-10.6-1.5z"/></svg>';
let tkInit = false, tdg = null, resList = [], resSel = 0, qSeq = 0;
const setTask = p => { cfg.task = { ...cfg.task, ...p }; persist({ task: cfg.task }); };
const applyWinTask = () => api.hideWinTask(!!(cfg.task.enabled && cfg.task.hideWin));
const tkIcon = a => a.logo && a.logo.length > 200 ? `<img src="${a.logo}" draggable="false">` : ic(a.icon || 'app-window', 24);
function tickTask() {
  const c = document.getElementById('t-clock'); if (!c) return;
  const o = { hour: '2-digit', minute: '2-digit' };
  try { c.textContent = new Date().toLocaleTimeString(cfg.lang || 'en', { ...o, timeZone: cfg.timezone || undefined }); } catch { c.textContent = new Date().toLocaleTimeString('en', o); }
}
function moveT(id, tid, after) {
  const I = cfg.task.items.slice(), i = I.findIndex(x => x.id === id); if (i < 0 || id === tid) return;
  const [it] = I.splice(i, 1), j = I.findIndex(x => x.id === tid); if (j < 0) return;
  I.splice(j + (after ? 1 : 0), 0, it); setTask({ items: I }); buildTask();
}
function pinApp(r) {
  if (cfg.task.items.some(a => a.path === r.path)) return;
  setTask({ items: [...cfg.task.items, { id: uid(), name: r.name, path: r.path, logo: r.logo || '', icon: r.icon || '', exe: r.exe, args: r.args || '', cwd: r.cwd || '' }] }); buildTask();
}
let wins = { fp: 0, w: [] }, appSig = '';
const exeKey = p => (p || '').toLowerCase();
function focusGroup(ws) { const i = ws.findIndex(w => w.pid === wins.fp), w = ws[i >= 0 ? (i + 1) % ws.length : 0]; wins = { ...wins, fp: w.pid }; drawApps(); api.focusWin(w.h, w.pid); }
// résout l'exécutable cible des raccourcis (pour associer épinglé <-> ouvert) et répare les logos manquants
async function ensureTaskItems() {
  let ch = false;
  for (const a of cfg.task.items || []) {
    if (a.exe === undefined) { a.exe = exeKey(await api.linkTarget(a.path) || a.path); ch = true; }
    if (!a.logo || a.logo.length < 200) { const l = await api.iconFile(a.path); if (l && l.length > 200) { a.logo = l; ch = true; } }
  }
  if (ch) persist({ task: cfg.task });
  return ch;
}
function drawApps(force) {
  const ap = document.getElementById('t-apps'); if (!ap || tdg || !cfg.task) return;
  const G = {}; (wins.w || []).forEach(w => (G[exeKey(w.p)] = G[exeKey(w.p)] || []).push(w));
  const used = new Set(), ents = [], act = ws => ws.some(w => w.pid === wins.fp);
  (cfg.task.items || []).forEach(a => { const k = exeKey(a.exe), ws = k && G[k] ? G[k] : []; if (ws.length) used.add(k); ents.push({ a, ws, key: 'p:' + a.id }); });
  Object.keys(G).forEach(k => { if (!used.has(k)) ents.push({ k, ws: G[k], key: 'r:' + k }); });
  const sig = ents.map(e => e.key + (e.a ? (e.a.logo || '').length + e.a.name : (e.ws[0].logo ? 1 : 0)) + ':' + e.ws.map(w => w.h).join(',') + (act(e.ws) ? '*' : '')).join('|');
  if (!force && sig === appSig) return; appSig = sig;
  ap.ondragover = e => { if (tdg || (dg && !dg.folder)) e.preventDefault(); };
  ap.ondrop = e => {
    if (tdg || !dg) return; e.preventDefault();
    const a = findB(dg.id); dg = null; clrDrop();
    if (a && a.type === 'app') pinApp({ name: a.name, path: a.path, logo: a.logo, icon: a.icon, args: a.args, cwd: a.cwd });
  };
  // mise à jour différentielle : les éléments existants sont conservés (pas de clignotement, survol et animations préservés)
  const keep = new Set(ents.map(e => e.key));
  [...ap.children].forEach(c => { if (!keep.has(c.dataset.key) && !c.classList.contains('out')) { c.classList.add('out'); c.style.pointerEvents = 'none'; c._t = setTimeout(() => c.remove(), 230); } });
  const cur = new Map([...ap.children].map(c => [c.dataset.key, c]));
  let prev = null;
  ents.forEach(e => {
    const w = e.ws[0], html = e.a ? tkIcon(e.a) : (w.logo && w.logo.length > 200 ? `<img src="${w.logo}" draggable="false">` : ic('app-window', 22));
    let el = cur.get(e.key);
    if (!el) { el = document.createElement('div'); el.className = 'titem new'; el.dataset.key = e.key; setTimeout(() => el.classList.remove('new'), 500); }
    if (el.classList.contains('out')) { el.classList.remove('out'); clearTimeout(el._t); el.style.pointerEvents = ''; }
    if (el._h !== html) { el.innerHTML = html; el._h = html; }
    el.classList.toggle('run', !!e.ws.length); el.classList.toggle('act', act(e.ws));
    el.dataset.tip = e.a ? e.a.name : w.t;
    const ref = prev ? prev.nextSibling : ap.firstChild; if (ref !== el) ap.insertBefore(el, ref); prev = el;
    if (!e.a) {
      el.draggable = false; el.ondragstart = el.ondragend = el.ondragover = el.ondragleave = el.ondrop = null;
      el.onclick = () => focusGroup(e.ws);
      el.oncontextmenu = ev => { ev.preventDefault(); pinApp({ name: w.n, path: w.p, logo: w.logo, exe: e.k }); };
      return;
    }
    const a = e.a; el.draggable = true;
    el.onclick = () => {
      if (e.ws.length) return focusGroup(e.ws);
      el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); setTimeout(() => el.classList.remove('bump'), 650);
      launchB(a);
    };
    el.oncontextmenu = ev => { ev.preventDefault(); setTask({ items: cfg.task.items.filter(x => x.id !== a.id) }); buildTask(); };
    el.ondragstart = ev => { tdg = a.id; ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', a.id); setTimeout(() => el.classList.add('dragging-item')); };
    el.ondragend = () => { tdg = null; el.classList.remove('dragging-item'); clrDrop(); drawApps(true); };
    el.ondragover = ev => {
      if (!tdg) return; ev.preventDefault(); ev.stopPropagation(); clrDrop();
      const r = el.getBoundingClientRect(); el.classList.add(ev.clientX - r.left < r.width / 2 ? 'dropb' : 'dropa');
    };
    el.ondragleave = () => el.classList.remove('dropb', 'dropa');
    el.ondrop = ev => { if (!tdg) return; ev.preventDefault(); ev.stopPropagation(); const r = el.getBoundingClientRect(), id = tdg; tdg = null; clrDrop(); moveT(id, a.id, ev.clientX - r.left >= r.width / 2); };
  });
}
function buildTask() {
  if (popK) closePop();
  const el = $('#task'), t = cfg.task, app = $('#app');
  if (!t.enabled) { el.className = ''; el.innerHTML = ''; app.classList.remove('tk'); closeRes(); return; }
  const isNew = !el.classList.contains('glass'); app.classList.add('tk'); el.className = 'glass';
  el.innerHTML = `<div class="titem start" id="t-start" data-tip="${esc(T('tStart'))}">${WINLOGO}</div>
   <div class="tsearch">${ic('search', 16)}<input id="t-q" type="text" placeholder="${esc(T('tSearch'))}" spellcheck="false" autocomplete="off"></div><div class="tsep"></div>
   <div class="tapps" id="t-apps"></div><div class="tsep"></div><div class="ttray"><div class="titem sm" id="t-chev" data-tip="${esc(T('tBg'))}">${ic('chevron-up', 18)}</div><div class="titem sm" id="t-wifi"></div><div class="titem sm" id="t-vol"></div></div><div class="tclock" id="t-clock"></div>`;
  $('#t-start').onclick = () => api.startMenu();
  paintTray();
  $('#t-chev').onclick = () => openPop('bg', $('#t-chev'));
  $('#t-wifi').onclick = () => openPop('wifi', $('#t-wifi'));
  $('#t-vol').onclick = () => openPop('vol', $('#t-vol'));
  $('#t-vol').onwheel = e => { e.preventDefault(); setVol(cl(SY.v + (e.deltaY < 0 ? 5 : -5), 0, 100)); };
  drawApps(true); ensureTaskItems().then(ch => ch && drawApps(true));
  const q = $('#t-q');
  let qT = 0;
  q.oninput = () => {
    const v = q.value.trim(), n = ++qSeq; clearTimeout(qT); if (!v) return closeRes();
    qT = setTimeout(async () => {
      const r = await api.searchApps(v); if (n !== qSeq) return;
      resList = r.concat([{ web: true, name: T('tWeb', v), q: v }]); resSel = 0; drawRes();
    }, 70);
  };
  q.onkeydown = e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!resList.length) return; resSel = cl(resSel + (e.key === 'ArrowDown' ? 1 : -1), 0, resList.length - 1); drawRes(); }
    else if (e.key === 'Enter') pickRes(resList[resSel]);
    else if (e.key === 'Escape') { q.value = ''; closeRes(); q.blur(); }
  };
  tickTask(); if (isNew) play(el, 'opening');
}
function pickRes(r) {
  if (!r) return;
  api.launch(r.web ? 'https://www.bing.com/search?q=' + encodeURIComponent(r.q) : r.path);
  const q = $('#t-q'); if (q) { q.value = ''; q.blur(); } closeRes();
}
function drawRes() {
  const el = $('#res'), isNew = !el.classList.contains('glass') || el.classList.contains('closing');
  el.className = 'glass res';
  el.innerHTML = resList.map((r, i) => `<div class="ritem ${i === resSel ? 'on' : ''}" data-i="${i}">${r.web ? `<span class="rw">${ic('globe', 22)}</span>` : r.logo ? `<img src="${r.logo}" draggable="false">` : `<span class="rw">${ic('app-window', 22)}</span>`}<span class="rn">${esc(r.name)}</span>${r.web ? '' : `<span class="rpin" data-pin="${i}" title="${esc(T('tPin'))}">${ic('pin', 14)}</span>`}</div>`).join('');
  el.querySelectorAll('.ritem').forEach(e => e.onclick = () => pickRes(resList[+e.dataset.i]));
  el.querySelectorAll('[data-pin]').forEach(e => e.onclick = ev => { ev.stopPropagation(); pinApp(resList[+e.dataset.pin]); });
  const tr = $('#task').getBoundingClientRect(), sr = document.querySelector('.tsearch').getBoundingClientRect();
  el.style.left = Math.round(cl(sr.left, 10, innerWidth - 370)) + 'px'; el.style.top = Math.round(tr.top - el.offsetHeight - 10) + 'px';
  if (isNew) play(el, 'opening');
}
function closeRes() {
  resList = []; qSeq++;
  const el = $('#res'); if (!el.classList.contains('glass')) return;
  play(el, 'closing', () => { if (!resList.length) { el.className = ''; el.innerHTML = ''; } });
}
document.addEventListener('mousedown', e => { if (resList.length && !e.target.closest('#res') && !e.target.closest('.tsearch')) closeRes(); });
/* ===== Zone système : applications en arrière-plan, Wi-Fi, volume ===== */
let SY = { v: 50, m: false, wifi: null, bg: null, list: null }, popK = null, popA = null, volDrag = false, vTT = 0;
addEventListener('pointerup', () => { volDrag = false; });
const volIcon = () => SY.m || SY.v === 0 ? 'volume-x' : SY.v < 34 ? 'volume' : SY.v < 67 ? 'volume-1' : 'volume-2';
const sigIcon = g => g < 25 ? 'wifi-zero' : g < 50 ? 'wifi-low' : g < 75 ? 'wifi-high' : 'wifi';
const wifiIcon = () => { const w = SY.wifi; if (!w) return 'wifi-off'; if (w.ssid) return sigIcon(w.sig); return w.eth ? 'network' : w.up ? 'wifi' : 'wifi-off'; };
function paintTray() {
  const w = document.getElementById('t-wifi'), v = document.getElementById('t-vol');
  if (w) { w.innerHTML = ic(wifiIcon(), 18); w.dataset.tip = T('tWifi') + (SY.wifi && SY.wifi.ssid ? ' : ' + SY.wifi.ssid : SY.wifi && SY.wifi.eth ? ' : Ethernet' : ' : ' + T('tNoNet')); }
  if (v) { v.innerHTML = ic(volIcon(), 18); v.dataset.tip = SY.m ? T('tMute') : T('tVol', SY.v); }
}
function setVol(n) {
  SY.v = n; if (SY.m) { SY.m = false; api.sysCmd('mute 0'); }
  paintTray(); updVolUi(); clearTimeout(vTT); vTT = setTimeout(() => api.sysCmd('setvol ' + n), 40);
}
function updVolUi() {
  const s = document.getElementById('p-vol'); if (!s) return;
  if (!volDrag) s.value = SY.v;
  document.getElementById('p-vv').textContent = SY.v + '%'; document.getElementById('p-mute').innerHTML = ic(volIcon(), 18);
}
function openPop(k, anchor) {
  if (popK === k) return closePop();
  const pop = $('#pop'), isNew = !pop.classList.contains('glass') || pop.classList.contains('closing');
  popK = k; popA = anchor; pop.className = 'glass pop';
  if (k === 'wifi') { SY.list = null; api.sysCmd('wifi'); api.sysCmd('wifilist'); }
  if (k === 'bg') { SY.bg = null; api.sysCmd('bg'); }
  if (k === 'vol') api.sysCmd('vol');
  drawPop(); if (isNew) play(pop, 'opening');
}
function closePop() {
  popK = null; const pop = $('#pop'); if (!pop.classList.contains('glass')) return;
  play(pop, 'closing', () => { if (!popK) { pop.className = ''; pop.innerHTML = ''; } });
}
function drawPop() {
  const pop = $('#pop'), k = popK; if (!k) return;
  const cur = SY.wifi && SY.wifi.ssid, img = a => a.logo && a.logo.length > 200 ? `<img src="${a.logo}" draggable="false">` : ic('app-window', 24);
  let title = '', h = '';
  if (k === 'vol') {
    title = T('tVol', SY.v).split(' ')[0];
    h = `<div class="pvol"><span class="btn ib" id="p-mute">${ic(volIcon(), 18)}</span><input type="range" id="p-vol" min="0" max="100" value="${SY.v}"><span class="val" id="p-vv">${SY.v}%</span></div>`;
  } else if (k === 'bg') {
    title = T('tBg');
    h = SY.bg == null ? '<div class="fempty">…</div>' : SY.bg.length ? `<div class="fgrid">${SY.bg.map((a, i) => `<div class="ftile" data-i="${i}" title="${esc(a.p)}"><div class="ti">${img(a)}</div><span class="n">${esc(a.n)}</span></div>`).join('')}</div>` : `<div class="fempty">${esc(T('tNoBg'))}</div>`;
  } else {
    title = cur || T('tNoNet');
    h = (SY.list == null ? '<div class="fempty">…</div>' : SY.list.map((n, i) => `<div class="ritem" data-i="${i}">${ic(sigIcon(n.g), 18)}<span class="rn">${esc(n.s)}</span>${n.s === cur ? ic('check', 14) : ''}</div>`).join(''))
      + `<div class="ritem" id="p-wset">${ic('settings', 18)}<span class="rn">${esc(T('tWifiSet'))}</span></div>`;
  }
  pop.innerHTML = `<h3>${esc(title)}</h3>${h}`;
  if (k === 'vol') {
    const s = $('#p-vol'); s.oninput = e => setVol(+e.target.value); s.onpointerdown = () => { volDrag = true; };
    $('#p-mute').onclick = () => { SY.m = !SY.m; api.sysCmd('mute ' + (SY.m ? 1 : 0)); paintTray(); updVolUi(); };
  } else if (k === 'bg') pop.querySelectorAll('.ftile').forEach(e => e.onclick = () => { api.launch(SY.bg[+e.dataset.i].p); closePop(); });
  else {
    pop.querySelectorAll('.ritem[data-i]').forEach(e => e.onclick = () => {
      const n = SY.list[+e.dataset.i]; if (n.s === cur) return;
      if (n.k) { api.sysCmd('wificonn ' + btoa(unescape(encodeURIComponent(n.s)))); setTimeout(() => api.sysCmd('wifi'), 3500); closePop(); }
      else { api.launch('ms-availablenetworks:'); closePop(); }
    });
    $('#p-wset').onclick = () => { api.launch('ms-settings:network-wifi'); closePop(); };
  }
  const tr = $('#task').getBoundingClientRect(), ar = popA ? popA.getBoundingClientRect() : tr;
  pop.style.width = (k === 'vol' ? 260 : 300) + 'px';
  const w = pop.offsetWidth;
  pop.style.left = Math.round(cl(ar.left + ar.width / 2 - w / 2, 10, innerWidth - w - 10)) + 'px';
  pop.style.top = Math.round(tr.top - pop.offsetHeight - 10) + 'px';
}
document.addEventListener('mousedown', e => { if (popK && !e.target.closest('#pop') && !e.target.closest('#t-chev,#t-wifi,#t-vol')) closePop(); });
async function initTask() {
  if (tkInit) return; tkInit = true;
  cfg.task = { enabled: true, hideWin: true, items: null, ...cfg.task };
  if (!Array.isArray(cfg.task.items)) { const l = await api.pinnedWin(); cfg.task.items = l.map(a => ({ id: uid(), ...a })); persist({ task: cfg.task }); }
  cfg.task.items.forEach(a => { if (!a.id) a.id = uid(); });
  api.onSys(d => {
    if (d.t === 'vol') { SY.v = d.d.v; SY.m = d.d.m; paintTray(); updVolUi(); }
    else if (d.t === 'wifi') { SY.wifi = d.d; paintTray(); if (popK === 'wifi') drawPop(); }
    else if (d.t === 'wifilist') { SY.list = d.d; if (popK === 'wifi') drawPop(); }
    else if (d.t === 'bg') { SY.bg = d.d; if (popK === 'bg') drawPop(); }
  });
  api.sysCmd('vol'); api.sysCmd('wifi'); setInterval(() => api.sysCmd('vol'), 2500); setInterval(() => api.sysCmd('wifi'), 10000);
  api.onWins(d => { wins = d; if (cfg.task && cfg.task.enabled) drawApps(); });
  buildTask(); applyWinTask(); setInterval(tickTask, 10000);
  const tt = $('#ttip'), tk = $('#task');
  tk.addEventListener('mouseover', e => {
    const t = e.target.closest('[data-tip]'); if (!t) return tt.classList.remove('on');
    tt.textContent = t.dataset.tip; const r = t.getBoundingClientRect();
    tt.style.left = Math.round(r.left + r.width / 2) + 'px'; tt.style.top = Math.round(r.top - tt.offsetHeight - 12) + 'px'; tt.classList.add('on');
  });
  tk.addEventListener('mouseleave', () => tt.classList.remove('on'));
  tk.addEventListener('mousedown', () => tt.classList.remove('on'));
}
/* ===== Mini-fenêtre des fenêtres réduites (sous la sidebar, suit son état) ===== */
function placeTray() {
  const bw = { reduced: 76, expanded: 280, hidden: 40 }[cfg.state] || 76, bh = cfg.state === 'hidden' ? 124 : Math.min(680, innerHeight - 20);
  const hp = cfg.state === 'hidden' && cfg.hidPos, th = tray.offsetHeight, top = hp ? Math.max(0, Math.min(hp.y, innerHeight - 124)) + bh + 10 : (innerHeight - bh) / 2 + bh + 10;
  tray.style.width = bw + 'px'; tray.style.left = hp ? Math.round(Math.max(0, Math.min(hp.x, innerWidth - 40))) + 'px' : '10px';
  tray.style.top = Math.round(Math.min(top, Math.max(10, innerHeight - th - 10))) + 'px';
}
function drawTray() {
  const list = Object.keys(WINS).filter(k => WINS[k].open && WINS[k].min);
  if (!list.length) {
    if (tray.classList.contains('glass') && !tray.classList.contains('closing')) play(tray, 'closing', () => { if (!Object.values(WINS).some(s => s.open && s.min)) { tray.className = ''; tray.innerHTML = ''; } });
    return;
  }
  const isNew = !tray.classList.contains('glass') || tray.classList.contains('closing');
  tray.className = 'glass tray ' + cfg.state;
  tray.innerHTML = list.map((k, i) => item(ic(WINS[k].icon), T(WINS[k].tk), '', i, `data-w="${k}"`)).join('');
  tray.querySelectorAll('[data-w]').forEach(e => e.onclick = () => openWin(e.dataset.w));
  placeTray(); if (isNew) play(tray, 'opening');
}

/* ===== Setup : création du profil, une fenêtre par information (valeurs détectées au préalable) ===== */
const LANGS = [['fr', 'Français'], ['en', 'English'], ['es', 'Español'], ['de', 'Deutsch'], ['it', 'Italiano'], ['pt', 'Português'], ['nl', 'Nederlands'], ['ja', '日本語']];
const STEPS = ['welcome', 'name', 'birthday', 'tz', 'lang', 'pfp', 'recap'];
let tzList = null;
function getTz() {
  if (tzList) return tzList;
  let z = []; try { z = Intl.supportedValuesOf('timeZone'); } catch {}
  tzList = [...new Set([SYS.tz, 'UTC', ...z])].map(t => {
    let o = ''; try { o = new Intl.DateTimeFormat('en', { timeZone: t, timeZoneName: 'shortOffset' }).formatToParts(new Date()).find(p => p.type === 'timeZoneName').value; } catch {}
    return [t, t.replace(/_/g, ' ') + (o ? ` (${o})` : '')];
  });
  return tzList;
}
const tzNow = (tz, l) => { try { return new Date().toLocaleTimeString(l, { hour: '2-digit', minute: '2-digit', timeZone: tz }); } catch { return ''; } };
const todayStr = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const fmtBd = (b, l) => { try { return new Date(b + 'T12:00:00').toLocaleDateString(l, { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return b; } };
let SU = { open: false, step: 0, d: {}, first: false, ret: false };
const suEl = () => $('#wsetup');
const suValid = () => { const st = STEPS[SU.step], d = SU.d; if (st === 'name') return d.name.trim().length > 0; if (st === 'birthday') return !!d.birthday && d.birthday <= todayStr() && d.birthday >= '1900-01-01'; return true; };
const suAv = () => SU.d.avatar ? `<img src="${SU.d.avatar}" draggable="false">` : esc(Array.from(SU.d.name.trim() || '?')[0].toUpperCase());
function openSetup(first) {
  if (SU.open) return;
  const w = suEl(), b = cfg.setupDone ? cfg : {};
  SU = { open: true, first, step: 0, ret: false, d: { name: b.name || SYS.name || '', birthday: b.birthday || '', tz: b.timezone || SYS.tz, lang: b.lang || SYS.lang, avatar: b.avatar || '' } };
  setUL(SU.d.lang); // la langue est appliquée AVANT l'affichage du setup
  const W = Math.min(560, innerWidth - 40), H = Math.min(600, innerHeight - 40);
  w.className = 'mwin glass'; w.style.display = ''; w.style.zIndex = ++zTop;
  w.style.width = W + 'px'; w.style.height = H + 'px'; w.style.left = Math.round((innerWidth - W) / 2) + 'px'; w.style.top = Math.round((innerHeight - H) / 2) + 'px';
  w.innerHTML = `<div class="wbar nodrag"><span class="wt">${ic('user', 17)}<span id="su-t"></span></span><span class="sstep" id="su-n"></span></div>
   <div class="prog"><i id="su-p"></i></div><div class="wmain sbody" id="su-b"></div><div class="sfoot" id="su-f"></div>`;
  drawSetup(); play(w, 'opening');
}
function drawSetup() {
  const st = STEPS[SU.step], d = SU.d, N = STEPS.length - 1, g = id => document.getElementById(id), body = g('su-b'), foot = g('su-f');
  g('su-p').style.width = (SU.step / N * 100) + '%';
  g('su-t').textContent = T('suTitle');
  g('su-n').textContent = SU.step ? T('step', SU.step, N) : '';
  const go = (label, idx, v) => `<div class="row"><b>${label}</b><div class="rg"><span>${v}</span><span class="btn sm" data-go="${idx}">${ic('pencil', 13)} ${T('modify')}</span></div></div>`;
  const det = ok => ok ? `<small>${ic('check', 12)} ${T('detected')}</small>` : '';
  const H = {
    welcome: () => `<div class="hero">${ic('sparkles', 40)}</div><h2>${T('wTitle')}</h2><p>${T('wText')}</p>`,
    name: () => `<h2>${T('nTitle')}</h2><p>${T('nSub')}</p><input class="sin" id="su-name" type="text" maxlength="24" placeholder="${esc(T('nPh'))}" value="${esc(d.name)}">${det(!!SYS.name && d.name === SYS.name)}`,
    birthday: () => `<h2>${T('bTitle')}</h2><p>${T('bSub')}</p><input class="sin" id="su-bd" type="date" min="1900-01-01" max="${todayStr()}" value="${esc(d.birthday)}">`,
    tz: () => { const l = getTz().slice(); if (!l.some(x => x[0] === d.tz)) l.unshift([d.tz, d.tz]); return `<h2>${T('tTitle')}</h2><p>${T('tSub')}</p><select class="sin" id="su-tz">${l.map(([v, t]) => `<option value="${esc(v)}" ${v === d.tz ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select><small id="su-time"></small><span id="su-det">${det(d.tz === SYS.tz)}</span>`; },
    lang: () => `<h2>${T('lTitle')}</h2><p>${T('lSub')}</p><div class="langs">${LANGS.map(([c, n]) => `<div class="lg ${c === d.lang ? 'on' : ''}" data-l="${c}"><b>${c.toUpperCase()}</b>${n}</div>`).join('')}</div>${det(d.lang === SYS.lang)}`,
    pfp: () => `<h2>${T('pTitle')}</h2><p>${T('pSub')}</p><div class="pfp"><div class="avatar big">${suAv()}</div><div class="rg"><span class="btn" id="su-av">${ic('image', 16)} ${T('choose')}</span>${d.avatar ? `<span class="btn" id="su-avx">${ic('trash-2', 16)}</span>` : ''}</div></div>`,
    recap: () => `<h2>${T('rTitle')}</h2>${go(T('rPhoto'), 5, `<span class="avatar sm">${suAv()}</span>`)}${go(T('rName'), 1, esc(d.name.trim()))}${go(T('rBirth'), 2, esc(fmtBd(d.birthday, d.lang)))}${go(T('rTz'), 3, esc(d.tz.replace(/_/g, ' ')))}${go(T('rLang'), 4, esc((LANGS.find(x => x[0] === d.lang) || [0, d.lang])[1]))}`
  };
  body.innerHTML = H[st](); stagger(body);
  const next = () => { if (!suValid()) return; if (st === 'recap') return finishSetup(); if (SU.ret) { SU.ret = false; SU.step = STEPS.length - 1; } else SU.step++; drawSetup(); };
  const lbl = st === 'welcome' ? T('start') : st === 'recap' ? T('finish') : T('cont');
  foot.innerHTML = `<div>${SU.step ? `<span class="btn" id="su-back">${ic('arrow-left', 16)} ${T('back')}</span>` : ''}</div><div>${!SU.first ? `<span class="btn" id="su-cancel">${T('cancel')}</span>` : ''}<span class="btn pri ${suValid() ? '' : 'dis'}" id="su-next">${lbl}${st === 'recap' ? ic('check', 16) : st === 'welcome' ? '' : ic('arrow-right', 16)}</span></div>`;
  g('su-next').onclick = next;
  if (g('su-back')) g('su-back').onclick = () => { SU.step--; drawSetup(); };
  if (g('su-cancel')) g('su-cancel').onclick = () => closeSetup();
  const upd = () => g('su-next').classList.toggle('dis', !suValid());
  const bind = (id, k) => { const i = g(id); i.oninput = e => { d[k] = e.target.value; upd(); }; i.onkeydown = e => { if (e.key === 'Enter') next(); }; setTimeout(() => i.focus(), 60); };
  if (st === 'name') bind('su-name', 'name');
  if (st === 'birthday') bind('su-bd', 'birthday');
  if (st === 'tz') { const t = () => g('su-time').textContent = T('tNow', tzNow(d.tz, d.lang)); t(); g('su-tz').onchange = e => { d.tz = e.target.value; t(); g('su-det').innerHTML = det(d.tz === SYS.tz); }; }
  if (st === 'lang') body.querySelectorAll('.lg').forEach(e => e.onclick = () => { d.lang = e.dataset.l; setUL(d.lang); drawSetup(); });
  if (st === 'pfp') {
    g('su-av').onclick = async () => { const raw = await api.pickImage(); if (!raw) return; const a = await toAvatar(raw); if (!a) return; d.avatar = a; drawSetup(); };
    if (g('su-avx')) g('su-avx').onclick = () => { d.avatar = ''; drawSetup(); };
  }
  body.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { SU.step = +b.dataset.go; SU.ret = true; drawSetup(); });
}
function closeSetup(done) {
  if (!SU.open) return; SU.open = false;
  const w = suEl();
  setUL(cfg.lang || SYS.lang);
  play(w, 'closing', () => { w.className = 'mwin'; w.style.display = 'none'; w.innerHTML = ''; done && done(); });
}
function finishSetup() {
  const d = SU.d, first = SU.first;
  persist({ name: d.name.trim(), birthday: d.birthday, timezone: d.tz, lang: d.lang, avatar: d.avatar, setupDone: true, autoLocale: d.tz === SYS.tz && d.lang === SYS.lang });
  setUL(cfg.lang); buildBar(); if (WINS.set.open) { buildWin('set'); }
  closeSetup(() => { if (first) { bar.style.display = ''; $('#isl').style.display = ''; placeIsland(); paintGlass(); play(bar, 'opening'); initTask(); } });
}
let ticking = false;
async function tick() {
  if (cfg.state !== 'expanded' || ticking) return;
  ticking = true; let s; try { s = await api.stats(); } finally { ticking = false; }
  lastS = s; paintStats(s);
  const c = document.getElementById('clock'); if (c) c.textContent = clockStr();
}
let mv = null;
document.addEventListener('mousemove', e => {
  if (drag || idrag || idragI || hdrag) return;
  const g = e.target.closest('.glass'), ig = !g;
  if (ig !== lastIgnore) { lastIgnore = ig; api.ignore(ig); }
  if (g && !mv) mv = requestAnimationFrame(() => { mv = null; const r = g.getBoundingClientRect(); g.style.setProperty('--lx', e.clientX - r.left + 'px'); g.style.setProperty('--ly', e.clientY - r.top + 'px'); });
});
/* Fond du verre en TEMPS RÉEL : chaque élément .glass a son propre <canvas class="gbg"> qui ne reçoit QUE la portion d'écran
   située exactement derrière lui (rectangle mesuré à chaque peinture). Pour que le flou ne dépende pas de ce qui est
   autour, la portion est prolongée sur ses bords par symétrie (miroir) avant d'être floutée. */
let bmp = null, pg = 0, live = false, geo = null, vid = null, animUntil = 0, animRaf = 0;
const SC = .25;
function ensureCanvases() {
  document.querySelectorAll('.glass').forEach(g => { if (!g.querySelector(':scope > canvas.gbg')) { const c = document.createElement('canvas'); c.className = 'gbg'; g.prepend(c); } });
}
new MutationObserver(() => { ensureCanvases(); paintGlass(); }).observe(document.getElementById('app'), { childList: true, subtree: true });
function paintGlass() { if (!pg) pg = requestAnimationFrame(() => { pg = 0; doPaint(); }); }
// pendant une transition/animation d'un verre (taille, position), l'écran ne change pas mais le rectangle si : on repeint à chaque image
function animLoop() { animRaf = 0; doPaint(); if (performance.now() < animUntil) animRaf = requestAnimationFrame(animLoop); }
const kick = ms => { animUntil = Math.max(animUntil, performance.now() + ms); if (!animRaf) animRaf = requestAnimationFrame(animLoop); };
['transitionrun', 'animationstart'].forEach(ev => addEventListener(ev, e => { const t = e.target; if (t.classList && (t.classList.contains('glass') || t.id === 'isl')) kick(1100); }, true));
const mkCv = () => document.createElement('canvas');
// dessine la portion d'écran en la rognant à l'image (fenêtre à cheval sur deux écrans => on ne sort jamais de la capture)
function dImg(t, img, sx, sy, sw, sh, dw, dh) {
  const iw = img.videoWidth || img.width, ih = img.videoHeight || img.height, fx = dw / sw, fy = dh / sh;
  let dx = 0, dy = 0;
  if (sx < 0) { dx = -sx * fx; sw += sx; sx = 0; }
  if (sy < 0) { dy = -sy * fy; sh += sy; sy = 0; }
  if (sx + sw > iw) sw = iw - sx;
  if (sy + sh > ih) sh = ih - sy;
  if (sw <= 0 || sh <= 0) return;
  t.drawImage(img, sx, sy, sw, sh, dx, dy, sw * fx, sh * fy);
}
function doPaint() {
  let img, ox = 0, oy = 0, kx, ky;
  if (live && geo && vid && vid.videoWidth && geo.did === streamDid) { kx = vid.videoWidth / geo.db.width; ky = vid.videoHeight / geo.db.height; img = vid; ox = (geo.wb.x - geo.db.x) * kx; oy = (geo.wb.y - geo.db.y) * ky; }
  else if (bmp) { kx = bmp.width / innerWidth; ky = bmp.height / innerHeight; img = bmp; }
  else return;
  const bl = cfg.blur * SC, m = bl > 0 ? Math.ceil(bl * 2.5) : 0;
  document.querySelectorAll('.glass').forEach(g => {
    const c = g.querySelector(':scope > canvas.gbg'); if (!c) return;
    const r = g.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
    const cw = Math.max(1, Math.round(r.width * SC)), ch = Math.max(1, Math.round(r.height * SC));
    if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
    const tx = c.getContext('2d'); tx.clearRect(0, 0, cw, ch);
    const sx = ox + r.left * kx, sy = oy + r.top * ky, sw = r.width * kx, sh = r.height * ky;
    if (!m) { tx.filter = 'saturate(1.9) brightness(1.1)'; dImg(tx, img, sx, sy, sw, sh, cw, ch); return; }
    const o = g._o || (g._o = { tl: mkCv(), sc: mkCv() }), W = cw + 2 * m, H = ch + 2 * m;
    if (o.tl.width !== cw || o.tl.height !== ch) { o.tl.width = cw; o.tl.height = ch; }
    if (o.sc.width !== W || o.sc.height !== H) { o.sc.width = W; o.sc.height = H; }
    const tc = o.tl.getContext('2d'); tc.clearRect(0, 0, cw, ch); dImg(tc, img, sx, sy, sw, sh, cw, ch);
    const sc = o.sc.getContext('2d'); sc.clearRect(0, 0, W, H);
    const li = Math.ceil(m / cw), lj = Math.ceil(m / ch);
    for (let i = -li; i <= li; i++) for (let j = -lj; j <= lj; j++) {
      sc.save(); sc.translate(m + i * cw + (i & 1 ? cw : 0), m + j * ch + (j & 1 ? ch : 0)); sc.scale(i & 1 ? -1 : 1, j & 1 ? -1 : 1); sc.drawImage(o.tl, 0, 0); sc.restore();
    }
    tx.filter = `blur(${bl}px) saturate(1.9) brightness(1.1)`; tx.drawImage(o.sc, -m, -m); tx.filter = 'none';
  });
}
let lastP = 0;
function onFrame(now) { vid.requestVideoFrameCallback(onFrame); if (now - lastP < 55 && performance.now() > animUntil) return; lastP = now; paintGlass(); }
async function startLive() {
  try {
    const src = await api.captureSource(); if (!src || !src.id) throw new Error('no source');
    const id = src.id; streamDid = src.did;
    geo = await api.geom();
    const st = await navigator.mediaDevices.getUserMedia({ audio: false, video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: id, maxWidth: 1280, maxHeight: 1280, maxFrameRate: 30 } } });
    vstream = st; vid = document.createElement('video'); vid.muted = true; vid.srcObject = st; await vid.play();
    live = true; vid.requestVideoFrameCallback(onFrame);
    st.getVideoTracks()[0].onended = () => { live = false; api.captureFallback(); };
  } catch (e) { live = false; api.captureFallback(); }
}
// changement d'écran d'affichage : le flux de capture (fond du verre) doit suivre le nouvel écran
function restartLive() {
  if (restarting) return; restarting = true;
  try { if (vstream) vstream.getTracks().forEach(t => { t.onended = null; t.stop(); }); } catch (e) {}
  live = false;
  startLive().finally(() => { restarting = false; if (geo && streamDid != null && geo.did !== streamDid) restartLive(); });
}
// l'écran sous la fenêtre a changé : on relance la capture sur le bon écran (petit délai pour ne pas relancer à chaque va-et-vient)
api.onGeom(g => { geo = g; if (streamDid != null && g.did !== streamDid) { clearTimeout(rsT); rsT = setTimeout(() => { if (geo && geo.did !== streamDid) restartLive(); }, 120); } paintGlass(); });
/* ===== Écrans + mises à jour ===== */
api.screens().then(l => { SCR = l; }).catch(() => {});
api.onScreens(l => { SCR = l; if (WINS.set && WINS.set.open && WINS.set.tab === 'screens') drawWinMain(true); });
function updStatus(u) {
  const e = u.err === 'repo' ? T('updErrRepo') : u.err === '404' ? T('updErr404') : u.err;
  return { idle: T('updIdle', u.cur), checking: T('updChk'), uptodate: T('updOk', u.cur), available: T('updAvail', u.ver) + (u.canInstall ? '' : ' · ' + T('updManual')), downloading: T('updDling', u.pct), ready: T('updReady', u.ver), error: T('updErr', e) }[u.state] || '';
}
function updBtn(u) {
  if (u.state === 'ready') return [T('updRestart'), 'rotate-ccw', false];
  if (u.state === 'available') return u.canInstall && u.exe ? [T('updDl'), 'download', false] : [T('updView'), 'external-link', false];
  if (u.state === 'downloading') return [T('updDling', u.pct), 'download', true];
  return [T('updCheck'), 'refresh-cw', u.state === 'checking'];
}
function paintUpdRow() {
  const t = document.getElementById('u-txt'), b = document.getElementById('u-btn'); if (!t || !b) return;
  const u = UPD, [l, i, off] = updBtn(u);
  t.textContent = updStatus(u); b.innerHTML = `${ic(i, 16)} ${esc(l)}`; b.classList.toggle('off', !!off);
  b.onclick = () => (u.state === 'ready' || u.state === 'available') ? api.updInstall() : api.updCheck();
}
// pastille « nouvelle version » en haut à droite
function drawUpdToast() {
  const el = $('#upd'), u = UPD, key = u.ver + (u.state === 'ready' ? ':r' : '');
  const show = ['available', 'downloading', 'ready'].includes(u.state) && updDis !== key;
  if (!show) {
    if (el.classList.contains('glass') && !el.classList.contains('closing')) play(el, 'closing', () => { el.className = ''; el.innerHTML = ''; updSig = ''; });
    return;
  }
  if (updSig !== u.ver || !el.classList.contains('glass')) {
    const isNew = !el.classList.contains('glass') || el.classList.contains('closing'); updSig = u.ver; el.className = 'glass upd';
    el.innerHTML = `<div class="uh">${ic('download', 22)}<div><b>${esc(T('updNew', u.ver))}</b><small id="u-sub"></small></div></div><div class="ubar" id="u-bar"><i></i></div><div class="uact"><span class="btn sm" id="u-later">${esc(T('updLater'))}</span><span class="btn sm pri" id="u-go"></span></div>`;
    $('#u-later').onclick = () => { updDis = UPD.ver + (UPD.state === 'ready' ? ':r' : ''); drawUpdToast(); };
    $('#u-go').onclick = () => api.updInstall();
    if (isNew) play(el, 'opening');
  }
  const [l, i, off] = updBtn(u);
  $('#u-sub').textContent = updStatus(u); $('#u-go').innerHTML = `${ic(i, 14)} ${esc(l)}`; $('#u-go').classList.toggle('off', off);
  $('#u-bar').style.display = u.state === 'downloading' ? '' : 'none'; $('#u-bar i').style.width = (u.pct || 0) + '%';
}
if (!ISL) api.updGet().then(u => { UPD = u; paintUpdRow(); drawUpdToast(); }).catch(() => {});
api.onUpd(u => { UPD = { ...u }; paintUpdRow(); drawUpdToast(); });
api.onScreen(async buf => { try { const nb = await createImageBitmap(new Blob([buf], { type: 'image/jpeg' })); if (bmp) bmp.close(); bmp = nb; paintGlass(); } catch (e) {} });
// la fenêtre est click-through : main.js sonde le curseur, ici on fait le vrai hit-test avant de rendre la souris à la fenêtre
api.onProbe(p => { const e = document.elementFromPoint(p.x, p.y); if (e && e.closest('.glass')) { lastIgnore = false; api.ignore(false); } });
// la pochette n'est envoyée qu'au changement de piste : on la conserve entre deux messages
let islSig = '', hideT = 0, coverT = 0;
// fondu enchaîné de la pochette (ancienne image conservée jusqu'à l'arrivée de la nouvelle)
function setCover(url) {
  const cv = $('#cv'); if (!cv) return;
  if (!url) { cv.style.backgroundImage = ''; cv.innerHTML = ic('music', Math.round(mus().coverSize * .37)); delete cv.dataset.u; return; }
  if (!cv.dataset.u) { cv.style.backgroundImage = `url("${url}")`; cv.innerHTML = ''; cv.dataset.u = '1'; return; }
  const o = document.createElement('div');
  o.style.cssText = `position:absolute;inset:0;border-radius:inherit;background:center/cover url("${url}");opacity:0;transition:opacity .6s ease`;
  cv.style.position = 'relative'; cv.appendChild(o); void o.offsetWidth; o.style.opacity = 1;
  setTimeout(() => { cv.style.backgroundImage = `url("${url}")`; o.remove(); }, 620);
}
// fondu du titre / de l'artiste au changement de piste
function swapText() {
  const els = ['#mtl', '#mar'].map($).filter(Boolean);
  els.forEach(e => { e.style.transition = 'opacity .22s ease,transform .22s ease'; e.style.opacity = 0; e.style.transform = 'translateY(5px)'; });
  setTimeout(() => {
    if ($('#mtl')) $('#mtl').textContent = media.title; if ($('#mar')) $('#mar').textContent = media.artist || '';
    els.forEach(e => { e.style.opacity = ''; e.style.transform = ''; });
  }, 230);
}
function onMediaMsg(m) {
  if (!m.title) { // trou passager entre deux pistes : on laisse l'île en place
    if (media.title && !hideT) hideT = setTimeout(() => { hideT = 0; media = {}; drawIsland(); }, 3000);
    return;
  }
  clearTimeout(hideT); hideT = 0;
  const had = media.title, oldCover = media.cover, changed = !!had && m.title !== had;
  media = { ...m, cover: m.cover || oldCover };
  if (m.cover) clearTimeout(coverT);
  else if (changed && oldCover) { clearTimeout(coverT); coverT = setTimeout(() => { media.cover = undefined; setCover(null); }, 6000); }
  if (!$('#isl').firstElementChild || $('#isl .island.closing') || islandOn() !== islShown) { drawIsland(); return; }
  if (changed) swapText();
  if (media.cover !== oldCover) setCover(media.cover);
  updateMedia();
}
let pendMedia = null;
api.onIslState(d => { if (ISL) return; cfg.islDet = d; if (idrag) { $('#isl').classList.remove('dragging'); idrag = null; islExt = true; } drawIsland(); });
api.onIslAttached(pt => {
  if (ISL) return; cfg.islDet = null;
  if (pt) { const lb = islLB(), rb = Math.max(lb, innerWidth - pt.w - 10), bb = Math.max(10, innerHeight - pt.h - 10); persist({ mediaPos: { x: cl((pt.x - lb) / Math.max(1, rb - lb), 0, 1), y: cl((pt.y - 10) / Math.max(1, bb - 10), 0, 1) } }); markPos(); }
  drawIsland();
});
api.onCfg(p => { if (!cfg) return; Object.assign(cfg, p); if (ISL) { theme(); if ('music' in p || 'showMedia' in p) { islSig = ''; drawIsland(); } } });
api.onMedia(m => cfg ? onMediaMsg(m) : (pendMedia = m));
Promise.all([api.getCfg(), api.sys()]).then(([c, s]) => {
  cfg = c; SYS = s; setUL(cfg.lang || SYS.lang); // langue détectée appliquée avant tout affichage (barre et setup)
  if (ISL) { theme(); if (pendMedia) onMediaMsg(pendMedia); return; } // fond du verre : captures envoyées par main.js (pas de flux vidéo)
  theme(); buildBar(); setInterval(tick, 1500); startLive(); if (pendMedia) onMediaMsg(pendMedia);
  if (!cfg.setupDone) { bar.style.display = 'none'; $('#isl').style.display = 'none'; openSetup(true); } else initTask(); // premier lancement : seul le setup est affiché
});

/* ===== Glisser une app depuis le bureau / l'explorateur (.lnk, .exe, .url…) =====
   Un raccourci est résolu vers le vrai programme (cible + arguments) ; le logo est ajouté en couleur d'accent. */
const fileDrag = e => !!(e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files'));
// logo -> silhouette : si l'icône a un fond uni dominant (cercle, carré arrondi…), on garde le dessin par-dessus ce fond ; sinon sa transparence
const toMask = src => new Promise(res => {
  const i = new Image();
  i.onload = () => {
    try {
      const n = 128, c = document.createElement('canvas'); c.width = c.height = n;
      const x = c.getContext('2d', { willReadFrequently: true }), k = Math.min(n / i.width, n / i.height), w = i.width * k, h = i.height * k;
      x.imageSmoothingQuality = 'high'; x.drawImage(i, (n - w) / 2, (n - h) / 2, w, h);
      const d = x.getImageData(0, 0, n, n), p = d.data, cnt = new Map(); let op = 0;
      for (let j = 0; j < p.length; j += 4) if (p[j + 3] > 200) { op++; const key = ((p[j] >> 4) << 8) | ((p[j + 1] >> 4) << 4) | (p[j + 2] >> 4); cnt.set(key, (cnt.get(key) || 0) + 1); }
      let bk = 0, bn = 0; cnt.forEach((v, key) => { if (v > bn) { bn = v; bk = key; } });
      const br = ((bk >> 8) & 15) * 17, bg = ((bk >> 4) & 15) * 17, bb = (bk & 15) * 17;
      const A = new Float32Array(n * n); let sum = 0;
      for (let j = 0; j < A.length; j++) { const q = j * 4; A[j] = (p[q + 3] / 255) * Math.min(1, Math.hypot(p[q] - br, p[q + 1] - bg, p[q + 2] - bb) / 110); sum += A[j]; }
      const glyph = op > n * n * .3 && bn > op * .4 && sum > n * n * .02;
      for (let j = 0; j < A.length; j++) { const q = j * 4; p[q] = p[q + 1] = p[q + 2] = 255; p[q + 3] = Math.round((glyph ? A[j] : p[q + 3] / 255) * 255); }
      x.putImageData(d, 0, 0); res(c.toDataURL('image/png'));
    } catch { res(''); }
  };
  i.onerror = () => res(''); i.src = src;
});
async function dropApp(file) {
  if (!file) return null;
  let target = file, args = '', cwd = '';
  if (/\.lnk$/i.test(file)) { const li = await api.linkInfo(file); if (li && li.target) { target = li.target; args = li.args || ''; cwd = li.cwd || ''; } }
  if (cfg.layout.some(b => b.type === 'app' && b.path === target && (b.args || '') === args)) return null;
  const name = file.split(/[\\/]/).pop().replace(/\.\w+$/, '');
  const logo = (await api.iconFile(file)) || (await api.iconFile(target)) || '';
  const mask = logo ? await toMask(logo) : '';
  return { type: 'app', name, path: target, args, cwd, logo, mask, tint: !!(logo && mask), icon: 'app-window' };
}
if (!ISL) {
  let dropT = 0;
  const hitOf = e => (e.target.closest && e.target.closest('#bar [data-b]')) || null;
  const after = (e, el) => { const r = el.getBoundingClientRect(); return e.clientY > r.top + r.height / 2; };
  document.addEventListener('dragover', e => {
    if (!fileDrag(e)) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; clrDrop();
    const el = hitOf(e); if (el) el.classList.add(after(e, el) ? 'dropa' : 'dropb');
    bar.classList.toggle('filedrop', !!(e.target.closest && e.target.closest('#bar')));
    clearTimeout(dropT); dropT = setTimeout(() => { clrDrop(); bar.classList.remove('filedrop'); }, 250);
  });
  document.addEventListener('drop', async e => {
    if (!fileDrag(e)) return;
    e.preventDefault(); clearTimeout(dropT); clrDrop(); bar.classList.remove('filedrop');
    const el = hitOf(e), aft = el ? after(e, el) : false, hid = el ? el.dataset.b : '';
    const files = [...e.dataTransfer.files].map(f => { try { return api.filePath(f); } catch { return ''; } }).filter(Boolean);
    const added = []; for (const f of files) { const b = await dropApp(f); if (b) added.push(b); }
    if (!added.length) return;
    const L = cloneL(); let i = hid ? L.findIndex(x => x.id === hid) : -1;
    if (i >= 0) { if (aft) i++; } else { i = L.findIndex(x => x.type === 'add'); if (i < 0) i = L.length; }
    added.forEach((b, k) => L.splice(i + k, 0, { id: uid(), visible: true, ...b }));
    setLayout(L); if (WINS.set.open) drawWinMain(true);
  });
}


/* ===== Barre masquée : la flèche se déplace où on veut (glisser) ===== */
bar.addEventListener('mousedown', e => {
  if (cfg.state !== 'hidden' || e.button !== 0 || !e.target.closest('#tab')) return;
  const r = bar.getBoundingClientRect(); hdrag = { sx: e.clientX, sy: e.clientY, x: r.left, y: r.top, on: false }; hmoved = false;
});
document.addEventListener('mousemove', e => {
  if (!hdrag) return;
  const dx = e.clientX - hdrag.sx, dy = e.clientY - hdrag.sy;
  if (!hdrag.on) { if (Math.hypot(dx, dy) < 5) return; hdrag.on = true; hmoved = true; api.dragHold(true); bar.classList.add('hdragging'); }
  cfg.hidPos = { x: Math.max(0, Math.min(hdrag.x + dx, innerWidth - 40)), y: Math.max(0, Math.min(hdrag.y + dy, innerHeight - 124)) };
  placeHid(); placeTray(); placeIsland(); paintGlass();
});
document.addEventListener('mouseup', () => {
  if (!hdrag) return; const on = hdrag.on; hdrag = null;
  if (!on) return;
  api.dragHold(false); bar.classList.remove('hdragging'); persist({ hidPos: cfg.hidPos }); setTimeout(() => { hmoved = false; }, 0);
});