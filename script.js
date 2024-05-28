const chooseFolderButton = document.getElementById('choose-folder');
const ruleBeforeField = document.getElementById('rule-before');
const stopButton = document.getElementById('stop');
const volumeControl = document.getElementById('volume');
const currentTrackDiv = document.getElementById('current-track');
const nextTrackTimerDiv = document.getElementById('next-track-timer');
const nextTrackTimerDiv2 = document.getElementById('next-track-timer2');
const trackTableBody = document.getElementById('track-table').querySelector('tbody');
const minIntervalInput = document.getElementById('min-interval');
const maxIntervalInput = document.getElementById('max-interval');
const errorMessageDiv = document.getElementById('error-message');
const playButton = document.getElementById('play');
let audioFiles = [];
let audioContext = new (window.AudioContext || window.webkitAudioContext)();
let currentSource = null;
let gainNode = audioContext.createGain();
let intervalId = null;
let progressIntervalId = null;
let timerWorker = new Worker('timeWorker.js');
const progressBar = document.getElementById('progress-bar');
let startTime = 0;
let duration = 0;

// Set initial volume
gainNode.gain.value = volumeControl.value;

// Update volume based on the input range value
volumeControl.addEventListener('input', () => {
    gainNode.gain.value = volumeControl.value;
});

chooseFolderButton.addEventListener('click', async () => {
    try {
        stopCurrentPlayback();

        // Validate minInterval and maxInterval
        const minInterval = parseInt(minIntervalInput.value);
        const maxInterval = parseInt(maxIntervalInput.value);
        if (validateIntervals(minInterval, maxInterval)) {
            errorMessageDiv.style.display = 'none';
        } else {
            return;
        }

        ruleBeforeField.textContent = "";

        const handle = await window.showDirectoryPicker();
        audioFiles = [];
        trackTableBody.innerHTML = '';
        for await (const entry of handle.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.mp3')) {
                audioFiles.push(entry);
                const row = document.createElement('tr');
                const cell = document.createElement('td');
                cell.textContent = entry.name.replace('.mp3', '');
                row.appendChild(cell);
                trackTableBody.appendChild(row);
            }
        }

        if (audioFiles.length > 0) {
            stopButton.disabled = false;
            playButton.disabled = false;
            scheduleNextFile();
        }
    } catch (error) {
        console.error('Error selecting folder:', error);
    }
});

stopButton.addEventListener('click', () => {
    stopCurrentPlayback();
    // Réinitialiser la barre de progression
    progressBar.value = 0;
    playButton.disabled = false;
});

playButton.addEventListener('click', () => {
    if (audioFiles.length > 0) {
        stopButton.disabled = false;
        playButton.disabled = true;
        scheduleNextFile();
    } else {
        playButton.disabled = true;
    }
});

function stopCurrentPlayback() {
    if (currentSource) {
        currentSource.stop();
    }
    clearTimeout(intervalId);
    timerWorker.postMessage({ type: 'stop' });
    stopButton.disabled = true;
    playButton.disabled = false;
    currentTrackDiv.textContent = 'Aucune piste en cours';
    nextTrackTimerDiv.textContent = '';
    nextTrackTimerDiv2.textContent = '';

    // Ajouter cette ligne pour stopper la mise à jour de la barre de progression
    clearInterval(progressIntervalId);
}

function validateIntervals(minInterval, maxInterval) {
    let errorMessages = [];

    if (minInterval <= 0) {
        errorMessages.push("Erreur : L'intervalle minimum doit être supérieur à zéro.");
    }
    if (minInterval > maxInterval) {
        errorMessages.push("Erreur : L'intervalle minimum ne peut pas être supérieur à l'intervalle maximum.");
    }
    if (minInterval < 0) {
        errorMessages.push("Erreur : L'intervalle minimum ne peut pas être inférieur à 0.");
    }
    if (maxInterval > maxIntervalInput.max) {
        errorMessages.push("Erreur : L'intervalle maximum ne peut pas être supérieur à " + maxIntervalInput.max + ".");
    }

    if (errorMessages.length > 0) {
        errorMessageDiv.innerHTML = errorMessages.join('<br>');
        errorMessageDiv.style.display = 'block';
        return false;
    }

    errorMessageDiv.style.display = 'none';
    return true;
}



function scheduleNextFile() {
    const minInterval = parseInt(minIntervalInput.value) * 1000;
    const maxInterval = parseInt(maxIntervalInput.value) * 1000;
    const randomInterval = Math.random() * (maxInterval - minInterval) + minInterval;
    let timeLeft = Math.floor(randomInterval / 1000);

    playButton.disabled = true;

    timerWorker.postMessage({ type: 'start', interval: randomInterval });

    timerWorker.onmessage = function(e) {
        console.log(e.data.type);
        if (e.data.type === 'complete') {
            console.log("Le fichier est lancé: " + e);
            playRandomFile();
        } else {
            timeLeft = e.data.timeLeft;
            if (timeLeft <= 3) {
                nextTrackTimerDiv.style.color = "red";
                nextTrackTimerDiv2.style.color = "red";
            } else {
                nextTrackTimerDiv.style.color = "rgb(254, 255, 255)";
                nextTrackTimerDiv2.style.color = "black";
            }
            nextTrackTimerDiv.textContent = `${timeLeft}`;
            nextTrackTimerDiv2.textContent = `${timeLeft}`;
        }
    };
}

async function playRandomFile() {
    //S'il n'y a pas de fichiers dans audiofiles[], return la fonction
    if (audioFiles.length === 0) return;

    //Prend le fichier numéro audioFiles[x]
    const randomFile = audioFiles[Math.floor(Math.random() * audioFiles.length)];

    //Prevent duplication
    if (currentSource) {
        currentSource.stop();
    }

    playButton.disabled = false; // Enable the play button when the playback is stopped
    const file = await randomFile.getFile();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    currentSource = audioContext.createBufferSource();
    currentSource.buffer = audioBuffer;
    currentSource.connect(gainNode).connect(audioContext.destination);
    //add duration and startime for progressbar
    duration = audioBuffer.duration;
    startTime = audioContext.currentTime;
    currentSource.start();

    // Update current track display
    currentTrackDiv.textContent = `Lecture en cours : ${randomFile.name.split('.mp3')[0]}`; //Remove .mp3 of the name

    // Start updating progress bar
    clearInterval(progressIntervalId); // Clear any existing interval
    progressIntervalId = setInterval(updateProgressBar, 1);

    // Schedule the next file
    scheduleNextFile();
}

//Add Progress bar
function updateProgressBar() {
    if (currentSource) {
        const elapsed = audioContext.currentTime - startTime;
        const progress = (elapsed / duration) * 100;
        progressBar.value = progress;
    }
}