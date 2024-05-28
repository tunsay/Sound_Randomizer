let countdownIntervalId = null;

self.onmessage = function(e) {
    const { type, interval } = e.data;

    if (type === 'start') {
        let timeLeft = Math.floor(interval / 1000); // in seconds
        self.postMessage({ timeLeft });

        countdownIntervalId = setInterval(() => {
            timeLeft--;
            self.postMessage({ timeLeft });

            if (timeLeft <= 0) {
                clearInterval(countdownIntervalId);
                self.postMessage({ timeLeft: 0 });
                self.postMessage({ type: 'complete' });
            }
        }, 1000);
    } else if (type === 'stop') {
        clearInterval(countdownIntervalId);
    }
};