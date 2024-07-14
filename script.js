// Sélection des éléments HTML
const elements = {
    chooseFolderButton: document.getElementById('choose-folder'),
    ruleBeforeField: document.getElementById('rule-before'),
    stopButton: document.getElementById('stop'),
    volumeControl: document.getElementById('volume'),
    currentTrackDiv: document.getElementById('current-track'),
    nextTrackTimerDiv: document.getElementById('next-track-timer'),
    nextTrackTimerDiv2: document.getElementById('next-track-timer2'),
    trackTableBody: document.getElementById('track-table').querySelector('tbody'),
    minIntervalInput: document.getElementById('min-interval'),
    maxIntervalInput: document.getElementById('max-interval'),
    errorMessageDiv: document.getElementById('error-message'),
    playButton: document.getElementById('play'),
    progressBar: document.getElementById('progress-bar')
};

// Initialisation des variables audio et de contrôle
let audioFiles = [];
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let currentSource = null;
const gainNode = audioContext.createGain();
let intervalId = null;
let progressIntervalId = null;
const timerWorker = new Worker('timeWorker.js');
let startTime = 0;
let duration = 0;

// Définir le volume initial
gainNode.gain.value = elements.volumeControl.value;

// Mettre à jour le volume en fonction de la valeur de l'entrée
elements.volumeControl.addEventListener('input', () => {
    gainNode.gain.value = elements.volumeControl.value;
});

// Gérer le clic sur le bouton de sélection de dossier
elements.chooseFolderButton.addEventListener('click', async () => {
    try {
        stopCurrentPlayback();

        elements.playButton.disabled = true;  // Désactiver le bouton Play pendant le chargement
        elements.stopButton.disabled = true;  // Désactiver le bouton Stop pendant le chargement

        const minInterval = parseInt(elements.minIntervalInput.value);
        const maxInterval = parseInt(elements.maxIntervalInput.value);
        if (!validateIntervals(minInterval, maxInterval)) return;

        elements.errorMessageDiv.style.display = 'none';
        elements.ruleBeforeField.textContent = "";

        const handle = await window.showDirectoryPicker();
        audioFiles = [];
        elements.trackTableBody.innerHTML = '';

        for await (const entry of handle.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.mp3')) {
                audioFiles.push(entry);
                const row = document.createElement('tr');
                const cell = document.createElement('td');
                cell.textContent = entry.name.replace('.mp3', '');
                row.appendChild(cell);
                elements.trackTableBody.appendChild(row);
            }
        }

        if (audioFiles.length > 0) {
            elements.stopButton.disabled = false;  // Réactiver le bouton Stop lorsque le chargement est terminé
            elements.playButton.disabled = false;  // Réactiver le bouton Play lorsque le chargement est terminé
            scheduleNextFile();
        }
    } catch (error) {
        displayError('Erreur lors de la sélection du dossier. Veuillez réessayer.');
        console.error('Error selecting folder:', error);
    }
});

// Gérer le clic sur le bouton d'arrêt
elements.stopButton.addEventListener('click', () => {
    stopCurrentPlayback();
    elements.progressBar.value = 0;
    elements.playButton.disabled = false;
});

// Gérer le clic sur le bouton de lecture
elements.playButton.addEventListener('click', () => {
    const minInterval = parseInt(elements.minIntervalInput.value);
    const maxInterval = parseInt(elements.maxIntervalInput.value);
    if (!validateIntervals(minInterval, maxInterval)) return;

    if (audioFiles.length > 0) {
        elements.stopButton.disabled = false;
        elements.playButton.disabled = true;
        scheduleNextFile();
    } else {
        elements.playButton.disabled = true;
    }
});

function stopCurrentPlayback() {
    if (currentSource) currentSource.stop();
    clearTimeout(intervalId);
    timerWorker.postMessage({ type: 'stop' });
    elements.stopButton.disabled = true;
    elements.playButton.disabled = false;
    elements.currentTrackDiv.textContent = 'Aucune piste en cours';
    elements.nextTrackTimerDiv.textContent = '';
    elements.nextTrackTimerDiv2.textContent = '';
    clearInterval(progressIntervalId);
}

function validateIntervals(minInterval, maxInterval) {
    const errorMessages = [];

    if (minInterval <= 0) {
        errorMessages.push("Erreur : L'intervalle minimum doit être supérieur à zéro.");
    }
    if (minInterval > maxInterval) {
        errorMessages.push("Erreur : L'intervalle minimum ne peut pas être supérieur à l'intervalle maximum.");
    }
    if (maxInterval > elements.maxIntervalInput.max) {
        errorMessages.push("Erreur : L'intervalle maximum ne peut pas être supérieur à " + elements.maxIntervalInput.max + ".");
    }
    if (!maxInterval || !minInterval) {
        errorMessages.push("Erreur : Remplissez les champs correctement.");
    }

    if (errorMessages.length > 0) {
        elements.errorMessageDiv.innerHTML = errorMessages.join('<br>');
        elements.errorMessageDiv.style.display = 'block';
        return false;
    }

    elements.errorMessageDiv.style.display = 'none';
    return true;
}

function scheduleNextFile() {
    const minInterval = parseInt(elements.minIntervalInput.value);
    const maxInterval = parseInt(elements.maxIntervalInput.value);
    if (!validateIntervals(minInterval, maxInterval)) {
        elements.playButton.disabled = false;
        return;
    }

    const minIntervalMs = minInterval * 1000;
    const maxIntervalMs = maxInterval * 1000;
    const randomInterval = Math.random() * (maxIntervalMs - minIntervalMs) + minIntervalMs;
    let timeLeft = Math.floor(randomInterval / 1000);

    elements.playButton.disabled = true;
    timerWorker.postMessage({ type: 'start', interval: randomInterval });

    timerWorker.onmessage = function(e) {
        if (e.data.type === 'complete') {
            playRandomFile();
        } else {
            timeLeft = e.data.timeLeft;
            elements.nextTrackTimerDiv.style.color = timeLeft <= 3 ? "red" : "rgb(254, 255, 255)";
            elements.nextTrackTimerDiv2.style.color = timeLeft <= 3 ? "red" : "black";
            elements.nextTrackTimerDiv.textContent = `${timeLeft}`;
            elements.nextTrackTimerDiv2.textContent = `${timeLeft}`;
        }
    };
}

async function playRandomFile() {
    if (audioFiles.length === 0) return;

    const randomFile = audioFiles[Math.floor(Math.random() * audioFiles.length)];

    if (currentSource) currentSource.stop();

    elements.playButton.disabled = true;  // Désactiver le bouton Play avant la lecture du fichier
    elements.stopButton.disabled = true;  // Désactiver le bouton Stop avant la lecture du fichier

    const file = await randomFile.getFile();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    currentSource = audioContext.createBufferSource();
    currentSource.buffer = audioBuffer;
    currentSource.connect(gainNode).connect(audioContext.destination);

    duration = audioBuffer.duration;
    startTime = audioContext.currentTime;
    currentSource.start();

    elements.currentTrackDiv.textContent = `Lecture en cours : ${randomFile.name.split('.mp3')[0]}`;

    clearInterval(progressIntervalId);
    progressIntervalId = setInterval(updateProgressBar, 1);

    elements.playButton.disabled = false;  // Réactiver le bouton Play après le chargement du fichier
    elements.stopButton.disabled = false;  // Réactiver le bouton Stop après le chargement du fichier

    scheduleNextFile();
}

function updateProgressBar() {
    if (currentSource) {
        const elapsed = audioContext.currentTime - startTime;
        const progress = (elapsed / duration) * 100;
        elements.progressBar.value = progress;
    }
}

function displayError(message) {
    elements.errorMessageDiv.textContent = message;
    elements.errorMessageDiv.style.display = 'block';
}
