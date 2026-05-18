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
    console.log('🟢 [CONNESSIONE] Una sorgente (Pannello o Overlay) si è collegata.');
    
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
            console.log(`🔄 [FASE] Nuova fase impostata: ${data.targetTime}'. Il timer si adatta a: ${timerMinutes}:00`);
            io.emit('timerTick', { m: timerMinutes, s: timerSeconds });
        }

        scoreboardData = data;
        
        // Stampa lo stato dei punti corrente nel terminale
        console.log(`📊 [MATCH] ${data.short1} [${data.score1}] - [${data.score2}] ${data.short2}`);
        
        // Se c'è un evento speciale come cartellino o sostituzione, lo logga nel terminale
        if (data.lastEvent) {
            const teamLabel = data.lastEvent.team === 1 ? data.short1 : data.short2;
            console.log(`⚠️ [REGIA] Animazione inviata -> Tipo: ${data.lastEvent.type} | Squadra: ${teamLabel}`);
        }

        io.emit('updateData', scoreboardData);
    });

    socket.on('startTimer', () => {
        if (!isTimerRunning) {
            console.log('▶️ [CRONOMETRO] Timer avviato.');
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
            console.log('⏸️ [CRONOMETRO] Timer in pausa.');
            isTimerRunning = false;
            clearInterval(timerInterval);
        }
    });

    socket.on('resetTimer', () => {
        console.log('⏹️ [CRONOMETRO] Reset premuto.');
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
        console.log(`⏳ [CRONOMETRO] Timer ripristinato all'inizio della fase corrente: ${timerMinutes}:00`);
        io.emit('timerTick', { m: timerMinutes, s: timerSeconds });
    });

    socket.on('setTime', (minutes) => {
        timerMinutes = parseInt(minutes, 10) || 0;
        timerSeconds = 0;
        console.log(`🔧 [CRONOMETRO] Modifica manuale: il tempo è stato forzato a: ${timerMinutes}:00`);
        io.emit('timerTick', { m: timerMinutes, s: timerSeconds });
    });

    socket.on('disconnect', () => {
        console.log('🔴 [DISCONNESSIONE] Una sorgente si è disconnessa.');
    });
});

http.listen(3000, () => {
    console.log('\n==================================================');
    console.log('🚀 REGIA STREAMING PRO ACCESA ED OPERATIVA!');
    console.log('==================================================');
    console.log('👉 Pannello Controllo: http://localhost:3000/panel.html');
    console.log('📺 Overlay Streamlabs: http://localhost:3000/overlay.html');
    console.log('==================================================\n');
});