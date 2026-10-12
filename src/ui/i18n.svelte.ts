const de = {
  privacy: 'Datenschutz',
  source: 'Quellcode',
  cancel: 'Abbrechen',
  close: 'Schließen',
  language: 'Sprache',
  slider: (label: string) => `${label} (Regler)`,

  tagline: 'Bilder im Takt der Musik, fertig als MP4. Alles bleibt auf deinem Gerät.',
  projectName: 'Name des Projekts',
  newProject: 'Neues Projekt',
  projects: 'Projekte',
  noProjects: 'Noch keine Projekte.',
  openProject: (name: string) => `${name} öffnen`,
  renameProject: (name: string) => `${name} umbenennen`,
  deleteProject: (name: string) => `${name} löschen`,
  newName: 'Neuer Name',
  images: (n: number) => (n === 1 ? '1 Bild' : `${n} Bilder`),
  songs: (n: number) => (n === 1 ? '1 Musikstück' : `${n} Musikstücke`),
  modified: (date: string) => `Geändert ${date}`,
  storageUsage: (used: string, quota: string) => `Speicher auf diesem Gerät: ${used} von ${quota} belegt.`,
  storagePersisted: 'Der Browser hat dauerhaften Speicher zugesagt.',
  storageVolatile:
    'Der Browser kann lokale Daten von sich aus löschen, etwa bei Speichermangel oder (Safari) wenn die Seite länger nicht besucht wurde.',
  deleteAllData: 'Alle Daten löschen',
  confirmDeleteProject: (name: string) => `Projekt „${name}“ mit allen Bildern und Musikstücken löschen?`,
  deleteAction: 'Löschen',
  confirmDeleteAll: 'Wirklich alle Projekte und alle auf diesem Gerät gespeicherten Daten löschen?',
  deleteAllAction: 'Alles löschen',

  backToProjects: 'Zur Projektliste',
  saved: 'Alle Änderungen gespeichert',
  saving: 'Speichert …',
  video: 'Video',
  music: 'Musik',
  musicRepeats: 'Musik wird wiederholt',
  tooLong: (minutes: number) => `Länger als ${minutes} Minuten: bitte weniger Bilder oder eine kürzere Zeit pro Bild wählen.`,
  dropHere: 'Bilder und Musik hier ablegen',
  quotaFull: 'Der Speicher des Browsers ist voll. Bitte Projekte oder Dateien löschen und erneut versuchen.',
  saveFailed: (reason: string) => `Speichern fehlgeschlagen: ${reason}`,

  stepImages: 'Bilder',
  addImages: 'Bilder hinzufügen',
  sortByName: 'Nach Name sortieren',
  removeAllImages: 'Alle Bilder entfernen',
  imagesEmpty: 'Zieh deine Fotos hierher oder wähle sie aus.',
  imagesEmptyNote: 'PNG und JPG, sortiert nach Dateiname.',
  select: (name: string) => `${name} auswählen`,
  remove: (name: string) => `${name} entfernen`,
  imagesHint:
    'Zum Umsortieren ziehen (am Touchscreen kurz gedrückt halten). Über „Auswählen“ lassen sich mehrere Bilder gemeinsam verschieben oder entfernen.',
  onlyImages: (name: string) => `${name}: Nur PNG- und JPG-Bilder werden unterstützt.`,
  unreadableImage: (name: string) => `${name} konnte nicht als Bild gelesen werden.`,
  confirmRemove: (what: string) => `${what} aus dem Projekt entfernen?`,
  removeAction: 'Entfernen',
  confirmRemoveAll: (what: string) => `Alle ${what} aus dem Projekt entfernen?`,
  removeAllAction: 'Alle entfernen',
  confirmSort: 'Alle Bilder nach Dateiname sortieren? Die jetzige Reihenfolge geht dabei verloren.',
  sortAction: 'Sortieren',

  selection: 'Auswahl',
  selected: (n: number) => `${n} ausgewählt`,
  toStart: 'An den Anfang',
  toEnd: 'Ans Ende',
  removeSelection: 'Auswahl entfernen',
  selectAll: 'Alle auswählen',
  selectMode: 'Auswählen',
  doneSelecting: 'Fertig',
  selectHint: 'Antippen, um auszuwählen; Umschalt-Klick wählt einen Bereich. Die Auswahl lässt sich gemeinsam ziehen.',

  stepMusic: 'Musik',
  addMusic: 'Musik hinzufügen',
  removeAllSongs: 'Alle Musikstücke entfernen',
  musicEmpty: 'Optional: MP3-Dateien hierher ziehen oder auswählen.',
  musicEmptyNote: 'Dann können die Bilder im Takt wechseln.',
  analysing: (name: string) => `${name} wird analysiert …`,
  unreadableAudio: (name: string) => `${name} konnte nicht als Audiodatei gelesen werden.`,
  beatsPerImage: 'Beats pro Bild',
  perImage: (seconds: string) => `= ${seconds} pro Bild`,
  downbeatShift: 'Die Eins verschieben um',
  beats: 'Beats',
  downbeatHint: 'Wechseln die Bilder nicht auf der Eins des Takts? Hier verschieben und in der Vorschau prüfen.',
  noTempo: 'Kein Tempo erkannt. Trag die BPM unten von Hand ein, sonst gilt für dieses Stück die feste Zeit pro Bild.',
  fixTempo: 'Tempo korrigieren',
  halveBpm: 'BPM halbieren',
  doubleBpm: 'BPM verdoppeln',
  manualBpm: 'BPM von Hand',
  beatOffset: 'Beat-Versatz (ms)',
  trimSilence: (start: string, end: string) => `Stille abschneiden (${start} am Anfang, ${end} am Ende)`,
  tempoHint: 'Erkennt die Analyse das doppelte oder halbe Tempo, hilft ×½ oder ×2. Der Versatz verschiebt alle Beats.',
  musicHint:
    'Die Stücke laufen in dieser Reihenfolge, werden ineinander überblendet und wiederholen sich bei Bedarf. Zum Umsortieren ziehen.',

  stepStyle: 'Stil & Timing',
  beatSync: 'Übergänge auf den Beat legen',
  beatSyncHint: 'Jeder Bildwechsel fällt genau auf einen Schlag der Musik.',
  needMusic: 'Füge zuerst Musik hinzu.',
  durationVia: 'Dauer pro Bild festlegen über',
  targetTime: 'Wunschzeit',
  targetTimePerImage: 'Wunschzeit pro Bild',
  targetHint: 'Bei jedem Musikstück ist die Beat-Anzahl vorgewählt, die der Wunschzeit am nächsten kommt.',
  beatsHint: 'Die Beat-Anzahl stellst du bei jedem Musikstück ein.',
  secondsPerImage: 'Sekunden pro Bild',
  transition: 'Übergang',
  transitions: {
    none: 'Kein Übergang',
    crossfade: 'Überblenden',
    fadeBlack: 'Über Schwarz',
    zoom: 'Zoom',
    wipe: 'Wischen →',
    wipeLeft: 'Wischen ←',
    wipeDown: 'Wischen ↓',
    wipeUp: 'Wischen ↑',
    slide: 'Einschieben',
    push: 'Schieben ←',
    pushUp: 'Schieben ↑',
    reveal: 'Aufdecken',
    circle: 'Kreis',
    blinds: 'Jalousie',
  },
  transitionGroups: { fades: 'Blenden', wipes: 'Wischen', slides: 'Schieben', shapes: 'Formen' },
  allTransitions: 'Alle Übergänge anzeigen',
  fewerTransitions: 'Weniger anzeigen',
  transitionDuration: 'Dauer des Übergangs',
  fadeIn: 'Einblenden aus Schwarz',
  fadeOut: 'Ausblenden nach Schwarz',
  audioCrossfade: 'Überblendung zwischen Musikstücken',
  resolution: 'Auflösung',
  small: 'klein',
  watermark: 'Wasserzeichen',
  chooseWatermark: 'Wasserzeichen wählen',
  replaceWatermark: 'Wasserzeichen ersetzen',
  removeWatermark: 'Wasserzeichen entfernen',
  watermarkHint: 'Erscheint klein unten rechts in jedem Bild.',

  preview: 'Vorschau',
  previewEmpty: 'Hier siehst du die Vorschau, sobald Bilder da sind.',
  playPreview: 'Vorschau abspielen',
  pausePreview: 'Vorschau anhalten',
  resumePreview: 'Vorschau fortsetzen',
  previewPosition: 'Position in der Vorschau',
  previewVolume: 'Lautstärke der Vorschau',
  loadingMusic: 'Musik wird geladen …',

  create: 'Diashow erstellen',
  stages: {
    prepare: 'Export wird vorbereitet',
    decode: 'Musik wird dekodiert',
    video: 'Bilder werden gerendert',
    audio: 'Ton wird kodiert',
    finalize: 'Datei wird fertiggestellt',
  },
  exporting: 'Deine Diashow entsteht …',
  keepOpen: 'Alles wird auf diesem Gerät berechnet. Lass dieses Fenster so lange geöffnet.',
  done: 'Fertig!',
  downloadStarted: 'Der Download wurde gestartet.',
  download: 'diashow.mp4 herunterladen',
  failed: 'Das hat nicht geklappt',
  unsupported:
    'Dieser Browser kann kein MP4-Video (H.264/AAC) erzeugen. Bitte eine aktuelle Version von Chrome, Edge, Safari oder Firefox auf einem Computer verwenden.',
  exportError: (reason: string) => `Die Diashow konnte nicht erstellt werden: ${reason}`,
}

const en: typeof de = {
  privacy: 'Privacy',
  source: 'Source code',
  cancel: 'Cancel',
  close: 'Close',
  language: 'Language',
  slider: (label) => `${label} (slider)`,

  tagline: 'Photos cut to the beat of your music, exported as MP4. Everything stays on your device.',
  projectName: 'Project name',
  newProject: 'New project',
  projects: 'Projects',
  noProjects: 'No projects yet.',
  openProject: (name) => `Open ${name}`,
  renameProject: (name) => `Rename ${name}`,
  deleteProject: (name) => `Delete ${name}`,
  newName: 'New name',
  images: (n) => (n === 1 ? '1 image' : `${n} images`),
  songs: (n) => (n === 1 ? '1 song' : `${n} songs`),
  modified: (date) => `Modified ${date}`,
  storageUsage: (used, quota) => `Storage on this device: ${used} of ${quota} used.`,
  storagePersisted: 'The browser has granted persistent storage.',
  storageVolatile:
    'The browser may delete local data on its own, for example when storage runs low or (Safari) when the site has not been visited for a while.',
  deleteAllData: 'Delete all data',
  confirmDeleteProject: (name) => `Delete project “${name}” with all its images and songs?`,
  deleteAction: 'Delete',
  confirmDeleteAll: 'Really delete all projects and all data stored on this device?',
  deleteAllAction: 'Delete everything',

  backToProjects: 'Back to projects',
  saved: 'All changes saved',
  saving: 'Saving…',
  video: 'Video',
  music: 'Music',
  musicRepeats: 'Music repeats',
  tooLong: (minutes) => `Longer than ${minutes} minutes: please use fewer images or less time per image.`,
  dropHere: 'Drop images and music here',
  quotaFull: 'The browser storage is full. Please delete projects or files and try again.',
  saveFailed: (reason) => `Saving failed: ${reason}`,

  stepImages: 'Images',
  addImages: 'Add images',
  sortByName: 'Sort by name',
  removeAllImages: 'Remove all images',
  imagesEmpty: 'Drag your photos here or pick them.',
  imagesEmptyNote: 'PNG and JPG, sorted by file name.',
  select: (name) => `Select ${name}`,
  remove: (name) => `Remove ${name}`,
  imagesHint:
    'Drag to reorder (on a touchscreen, press and hold briefly). Use “Select” to move or remove several images together.',
  onlyImages: (name) => `${name}: only PNG and JPG images are supported.`,
  unreadableImage: (name) => `${name} could not be read as an image.`,
  confirmRemove: (what) => `Remove ${what} from the project?`,
  removeAction: 'Remove',
  confirmRemoveAll: (what) => `Remove all ${what} from the project?`,
  removeAllAction: 'Remove all',
  confirmSort: 'Sort all images by file name? The current order will be lost.',
  sortAction: 'Sort',

  selection: 'Selection',
  selected: (n) => `${n} selected`,
  toStart: 'Move to start',
  toEnd: 'Move to end',
  removeSelection: 'Remove selection',
  selectAll: 'Select all',
  selectMode: 'Select',
  doneSelecting: 'Done',
  selectHint: 'Tap to select; Shift-click selects a range. The selection can be dragged together.',

  stepMusic: 'Music',
  addMusic: 'Add music',
  removeAllSongs: 'Remove all songs',
  musicEmpty: 'Optional: drag MP3 files here or pick them.',
  musicEmptyNote: 'Then the images can change on the beat.',
  analysing: (name) => `Analysing ${name}…`,
  unreadableAudio: (name) => `${name} could not be read as an audio file.`,
  beatsPerImage: 'Beats per image',
  perImage: (seconds) => `= ${seconds} per image`,
  downbeatShift: 'Shift the downbeat by',
  beats: 'beats',
  downbeatHint: 'Images not changing on the “one” of the bar? Shift it here and check in the preview.',
  noTempo: 'No tempo detected. Enter the BPM by hand below, otherwise this song uses the fixed time per image.',
  fixTempo: 'Fix tempo',
  halveBpm: 'Halve BPM',
  doubleBpm: 'Double BPM',
  manualBpm: 'Manual BPM',
  beatOffset: 'Beat offset (ms)',
  trimSilence: (start, end) => `Cut silence (${start} at the start, ${end} at the end)`,
  tempoHint: 'If the analysis found double or half the tempo, ×½ or ×2 helps. The offset shifts all beats.',
  musicHint:
    'Songs play in this order, crossfade into each other and repeat if needed. Drag to reorder.',

  stepStyle: 'Style & timing',
  beatSync: 'Put transitions on the beat',
  beatSyncHint: 'Every image change lands exactly on a beat of the music.',
  needMusic: 'Add music first.',
  durationVia: 'Set time per image by',
  targetTime: 'Target time',
  targetTimePerImage: 'Target time per image',
  targetHint: 'For each song, the beat count closest to the target time is preselected.',
  beatsHint: 'You set the beat count on each song.',
  secondsPerImage: 'Seconds per image',
  transition: 'Transition',
  transitions: {
    none: 'No transition',
    crossfade: 'Crossfade',
    fadeBlack: 'Through black',
    zoom: 'Zoom',
    wipe: 'Wipe →',
    wipeLeft: 'Wipe ←',
    wipeDown: 'Wipe ↓',
    wipeUp: 'Wipe ↑',
    slide: 'Slide in',
    push: 'Push ←',
    pushUp: 'Push ↑',
    reveal: 'Reveal',
    circle: 'Circle',
    blinds: 'Blinds',
  },
  transitionGroups: { fades: 'Fades', wipes: 'Wipes', slides: 'Slides', shapes: 'Shapes' },
  allTransitions: 'Show all transitions',
  fewerTransitions: 'Show fewer',
  transitionDuration: 'Transition duration',
  fadeIn: 'Fade in from black',
  fadeOut: 'Fade out to black',
  audioCrossfade: 'Crossfade between songs',
  resolution: 'Resolution',
  small: 'small',
  watermark: 'Watermark',
  chooseWatermark: 'Choose watermark',
  replaceWatermark: 'Replace watermark',
  removeWatermark: 'Remove watermark',
  watermarkHint: 'Shown small in the bottom right corner of every image.',

  preview: 'Preview',
  previewEmpty: 'The preview appears here once there are images.',
  playPreview: 'Play preview',
  pausePreview: 'Pause preview',
  resumePreview: 'Resume preview',
  previewPosition: 'Preview position',
  previewVolume: 'Preview volume',
  loadingMusic: 'Loading music…',

  create: 'Create slideshow',
  stages: {
    prepare: 'Preparing export',
    decode: 'Decoding music',
    video: 'Rendering images',
    audio: 'Encoding audio',
    finalize: 'Finishing the file',
  },
  exporting: 'Creating your slideshow…',
  keepOpen: 'Everything is computed on this device. Keep this window open until it is done.',
  done: 'Done!',
  downloadStarted: 'The download has started.',
  download: 'Download diashow.mp4',
  failed: 'That did not work',
  unsupported:
    'This browser cannot create MP4 video (H.264/AAC). Please use a current version of Chrome, Edge, Safari or Firefox on a computer.',
  exportError: (reason) => `The slideshow could not be created: ${reason}`,
}

const MESSAGES = { de, en }
export type Language = keyof typeof MESSAGES
const STORAGE_KEY = 'language'

function initialLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'de' || stored === 'en') return stored
  return navigator.language.toLowerCase().startsWith('de') ? 'de' : 'en'
}

class I18n {
  #language = $state<Language>(initialLanguage())

  constructor() {
    document.documentElement.lang = this.#language
  }

  get language() {
    return this.#language
  }

  set language(language: Language) {
    this.#language = language
    localStorage.setItem(STORAGE_KEY, language)
    document.documentElement.lang = language
  }

  get m() {
    return MESSAGES[this.#language]
  }

  /** locale for number and date formatting */
  get locale() {
    return this.#language === 'de' ? 'de-DE' : 'en-GB'
  }
}

export const i18n = new I18n()
