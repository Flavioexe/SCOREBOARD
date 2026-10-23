const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let scoreboardData = {
    short1: "LIV", score1: 0, acc1a: "#e31b23", acc1b: "#ffffff", logo1: "", red1: 0,
    short2: "WOL", score2: 0, acc2a: "#fdb913", acc2b: "#231f20", logo2: "", red2: 0,
    colorNames: "#ffffff", colorScore: "#00ff88", colorTimerBg: "#ffffff", 
    colorTimerText: "#000000",
    targetTime: "45", lastEvent: null,
    fullscreenUrl: "" // <--- INCLUSO NELLO STATO GLOBALE
};

let timerMinutes = 0;
let timerSeconds = 0;
let timerInterval = null;
let isTimerRunning = false;

io.on('connection', (socket) => {
    console.log('🟢 [CONNESSIONE] Una sorgente si è collegata al cloud.');
    
    socket.emit('updateData', scoreboardData);
    socket.emit('timerTick', { m: timerMinutes, s: timerSeconds });

    socket.on('updateScoreboard', (data) => {
        if (data.targetTime !== scoreboardData.targetTime) {
            let startMinute = 0;
            if (data.targetTime === "45") startMinute = 0;
            if (data.targetTime === "90") startMinute = 45;
            if (data.targetTime === "105") startMinute = 90;
            if (data.targetTime === "120") startMinute = 105;
            
            timerMinutes = startMinute;
            timerSeconds = 0;
            io.emit('timerTick', { m: timerMinutes, s: timerSeconds });
        }

        scoreboardData = data;
        io.emit('updateData', scoreboardData);
    });

    socket.on('startTimer', () => {
        if (!isTimerRunning) {
            isTimerRunning = true;
            timerInterval = setInterval(() => {
                timerSeconds++;
                if (timerSeconds >= 60) { 
                    timerMinutes++; 
                    timerSeconds = 0; 
                }
                io.emit('timerTick', { m: timerMinutes, s: timerSeconds });
            }, 1000);
        }
    });

    socket.on('pauseTimer', () => {
        if (isTimerRunning) {
            isTimerRunning = false;
            clearInterval(timerInterval);
        }
    });

    socket.on('resetTimer', () => {
        isTimerRunning = false;
        clearInterval(timerInterval);
        
        let startMinute = 0;
        if (scoreboardData.targetTime === "45") startMinute = 0;
        if (scoreboardData.targetTime === "90") startMinute = 45;
        if (scoreboardData.targetTime === "105") startMinute = 90;
        if (scoreboardData.targetTime === "120") startMinute = 105;
        
        timerMinutes = startMinute; 
        timerSeconds = 0;
        io.emit('timerTick', { m: timerMinutes, s: timerSeconds });
    });

    socket.on('setTime', (minutes) => {
        timerMinutes = parseInt(minutes, 10) || 0;
        timerSeconds = 0;
        io.emit('timerTick', { m: timerMinutes, s: timerSeconds });
    });

    socket.on('triggerSponsor', () => {
        io.emit('showSponsor');
    });

    socket.on('toggleFullscreen', (show) => {
        io.emit('updateFullscreen', show);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`🚀 REGIA ONLINE SULLA PORTA ${PORT}!`);
});
