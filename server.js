require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

const PORT = process.env.PORT || 8080;

/*
==========================
العناصر
==========================
0 = 0x (ذرة)
1 = 45x
2 = 3x
3 = 25x
4 = 7x
5 = 10x
6 = 2x
7 = 15x
8 = 5x
9 = 0x (جزر)
==========================
*/

const items = [

    { id: 0, multiplier: 0, weight: 145 },

    { id: 1, multiplier: 45, weight: 3 },

    { id: 2, multiplier: 3, weight: 180 },

    { id: 3, multiplier: 25, weight: 9 },

    { id: 4, multiplier: 7, weight: 55 },

    { id: 5, multiplier: 10, weight: 35 },

    { id: 6, multiplier: 2, weight: 300 },

    { id: 7, multiplier: 15, weight: 18 },

    { id: 8, multiplier: 5, weight: 110 },

    { id: 9, multiplier: 0, weight: 145 }
];

let countdown = 30;
let spinCountdown = 5;

let isBetting = true;
let isSpinning = false;

let winnerIndex = 0;

let loseStreak = 0;

/*
==========================
اختيار عشوائي بالوزن
==========================
*/

function weightedRandom(list) {

    let totalWeight = 0;

    list.forEach(item => {
        totalWeight += item.weight;
    });

    let random = Math.random() * totalWeight;

    for (let item of list) {

        if (random < item.weight) {
            return item;
        }

        random -= item.weight;
    }

    return list[0];
}

/*
==========================
اختيار الفائز
==========================
*/

function chooseWinner() {

    /*
    بعد 8 خسائر -> ربح قوي
    */

    if (loseStreak >= 8) {

        const strongWins = items.filter(item =>
            item.multiplier >= 5
        );

        const result = weightedRandom(strongWins);

        loseStreak = 0;

        return result.id;
    }

    /*
    بعد 5 خسائر -> ربح متوسط
    */

    if (loseStreak >= 5) {

        const mediumWins = items.filter(item =>
            item.multiplier >= 2 &&
            item.multiplier <= 10
        );

        const result = weightedRandom(mediumWins);

        loseStreak = 0;

        return result.id;
    }

    /*
    النظام الطبيعي
    */

    const result = weightedRandom(items);

    /*
    تحديث streak
    */

    if (result.multiplier === 0) {
        loseStreak++;
    } else {
        loseStreak = 0;
    }

    return result.id;
}

/*
==========================
مرحلة الرهان
==========================
*/

function startBettingPhase() {

    isBetting = true;
    isSpinning = false;

    countdown = 30;

    io.emit("phase", {
        betting: true,
        spinning: false
    });

    io.emit("message", "بدأت جولة جديدة");

    const bettingInterval = setInterval(() => {

        io.emit("countdown", countdown);

        countdown--;

        if (countdown < 0) {

            clearInterval(bettingInterval);

            startSpinningPhase();
        }

    }, 1000);
}

/*
==========================
مرحلة الدوران
==========================
*/

function startSpinningPhase() {

    isBetting = false;
    isSpinning = true;

    spinCountdown = 5;

    winnerIndex = chooseWinner();

    io.emit("phase", {
        betting: false,
        spinning: true
    });

    io.emit("winnerSelected", {
        winner: winnerIndex
    });

    const spinningInterval = setInterval(() => {

        io.emit("spinCountdown", spinCountdown);

        spinCountdown--;

        if (spinCountdown < 0) {

            clearInterval(spinningInterval);

            io.emit("roundEnded", {
                winner: winnerIndex,
                multiplier: items.find(i => i.id === winnerIndex).multiplier
            });

            setTimeout(() => {

                startBettingPhase();

            }, 5000);
        }

    }, 1000);
}

/*
==========================
Socket
==========================
*/

io.on("connection", (socket) => {

    console.log("User Connected:", socket.id);

    socket.emit("connected", {
        success: true
    });

    socket.emit("phase", {
        betting: isBetting,
        spinning: isSpinning
    });

    socket.emit("countdown", countdown);

    socket.on("disconnect", () => {
        console.log("User Disconnected:", socket.id);
    });
});

/*
==========================
API
==========================
*/

app.get("/", (req, res) => {

    res.send("Greedy Star Server Running");

});

/*
==========================
تشغيل السيرفر
==========================
*/

server.listen(PORT, () => {

    console.log("Server Running On Port:", PORT);

    startBettingPhase();

});