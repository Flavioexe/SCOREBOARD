const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

// Struttura dati iniziale completa di tutte le personalizzazioni
let scoreboardData = {
    short1: "LIV", score1: 0, acc1a: "#e31b23", acc1b: "#ffffff", logo1: "", red1: 0,
    short2: "WOL", score2: 0, acc2a: "#fdb913", acc2b: "#231f20", logo2: "", red2: 0,
    colorNames: "#3d195b", colorScore: "#00ff88", colorTimerBg: "#ffffff", colorTimerText: "#3d195b",
    targetTime: "45", lastEvent: null
};

let timerMinutes = 0;
let timerSeconds = 0;
let timerInterval = null;
let isTimerRunning = false;

io.on('connection', (socket) => {
    console.log('🟢 [CONNESSIONE] Una sorgente si è collegata al cloud.');
    
    // Invia lo stato attuale appena una pagina viene aperta o ricaricata
    socket.emit('updateData', scoreboardData);
    socket.emit('timerTick', { m: timerMinutes, s: timerSeconds });

    socket.on('updateScoreboard', (data) => {
        // Rileva se l'utente ha cambiato la fase di gioco dal menu a tendina del pannello
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
        
        // Al reset, il timer torna all'inizio della fase attuale (es. 45 per il secondo tempo)
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
});

// 🛠️ CONFIGURAZIONE PER SERVER PUBBLICO: 
// Prende la porta assegnata automaticamente da Render, oppure la 3000 se testi in locale sul Mac
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`🚀 REGIA ONLINE SULLA PORTA ${PORT}!`);
});
