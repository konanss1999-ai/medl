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

const PORT = process.env.PORT || 3000;

/*
العناصر:
0 = 5x
1 = 45x
2 = 3x
3 = 25x
4 = 7x
5 = 10x
6 = 2x
7 = 15x
*/

const items = [
    { id: 0, multiplier: 5, weight: 22 },
    { id: 1, multiplier: 45, weight: 1 },
    { id: 2, multiplier: 3, weight: 28 },
    { id: 3, multiplier: 25, weight: 2 },
    { id: 4, multiplier: 7, weight: 18 },
    { id: 5, multiplier: 10, weight: 12 },
    { id: 6, multiplier: 2, weight: 35 },
    { id: 7, multiplier: 15, weight: 6 }
];

let countdown = 30;
let spinCountdown = 5;

let isBetting = true;
let isSpinning = false;

let winnerIndex = 0;

function chooseWinner() {

    let totalWeight = 0;

    items.forEach(item => {
        totalWeight += item.weight;
    });

    let random = Math.random() * totalWeight;

    for (let item of items) {

        if (random < item.weight) {
            return item.id;
        }

        random -= item.weight;
    }

    return 0;
}

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
                multiplier: items[winnerIndex].multiplier
            });

            setTimeout(() => {

                startBettingPhase();

            }, 5000);
        }

    }, 1000);
}

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

app.get("/", (req, res) => {

    res.send("Greedy Star Server Running");

});

server.listen(PORT, () => {

    console.log("Server Running On Port:", PORT);

    startBettingPhase();

});