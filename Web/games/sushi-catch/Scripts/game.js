import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import {
    fetchGlobalRanking,
    saveGlobalScore,
    getRanking,
    saveRanking,
    resizeCanvas,
    drawStartScreen,
    drawGameScreen,
    drawGameOverScreen,
    fillRoundRect,
    getCanvasPointFromEvent,
    createLangState,
    createParentGameStateNotifier
} from "../../shared/Scripts/game-common.js";

// --- Firebase Configuration ---
const firebaseConfig = { 
    apiKey: "AIzaSyDffNMWkocUzsvZkbX_sOXtk5NHr8-KQME", 
    authDomain: "sushicious-games.firebaseapp.com", 
    projectId: "sushicious-games", 
    storageBucket: "sushicious-games.firebasestorage.app", 
    messagingSenderId: "597158694276", 
    appId: "1:597158694276:web:28d7699f3e4ef4050d61d1", 
    measurementId: "G-H309XJ7ST6" 
}; 

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const firebaseOps = { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp };

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Multilingual Support ---
const translations = {
    en: {
        game_title: "Sushi Catch",
        tap_to_start: "Move Plate to Start",
        score: "Score",
        lives: "Lives",
        game_over: "GAME OVER",
        all_time_top: "--- YOUR BEST 3 ---",
        community_top: "--- GLOBAL TOP 3 ---",
        tap_to_retry: "Tap to Retry",
        pts: "pts",
        loading: "Loading..."
    },
    ja: {
        game_title: "寿司キャッチ",
        tap_to_start: "お皿を動かしてスタート",
        score: "スコア",
        lives: "ライフ",
        game_over: "ゲームオーバー",
        all_time_top: "--- あなたのベスト3 ---",
        community_top: "--- 世界ランキング ---",
        tap_to_retry: "タップしてリトライ",
        pts: "点",
        loading: "読み込み中..."
    }
};

const langState = createLangState({ translations, defaultLang: 'en' });
const t = langState.t;

// --- Game Configuration ---
let canvasWidth, canvasHeight;
let score = 0;
let lives = 3;
let gameState = 'start'; // 'start', 'playing', 'gameOver'
const rankingState = { globalRanking: [], isLoadingRanking: false };

const STORAGE_KEY_ALL_TIME = 'sushicious_catch_all_time_rank';
const GLOBAL_COLLECTION = 'rankings_catch';

// --- Sushi & Plate ---
let plate = { x: 0, y: 0, width: 80, height: 20 };
let sushis = [];
const sushiTypes = [
    { name: 'salmon', color: '#ff7f50', textColor: '#fff', label: '🍣' },
    { name: 'tuna', color: '#dc143c', textColor: '#fff', label: '🍣' },
    { name: 'ebi', color: '#ffa07a', textColor: '#fff', label: '🦐' },
    { name: 'egg', color: '#ffd700', textColor: '#000', label: '🍳' }
];

function applyResize() {
    const size = resizeCanvas({ canvas });
    canvasWidth = size.canvasWidth;
    canvasHeight = size.canvasHeight;
    
    plate.width = canvasWidth * 0.25;
    plate.height = 20;
    plate.y = canvasHeight - plate.height - 40;
}

function spawnSushi() {
    const type = sushiTypes[Math.floor(Math.random() * sushiTypes.length)];
    const size = canvasWidth * 0.1;
    sushis.push({
        x: Math.random() * (canvasWidth - size),
        y: -size,
        size: size,
        speed: 2 + Math.random() * 2 + (score / 100),
        type: type
    });
}

function update() {
    if (gameState !== 'playing') return;

    if (Math.random() < 0.02) spawnSushi();

    for (let i = sushis.length - 1; i >= 0; i--) {
        const s = sushis[i];
        s.y += s.speed;

        // Check collision with plate
        if (s.y + s.size > plate.y && s.y < plate.y + plate.height &&
            s.x + s.size > plate.x && s.x < plate.x + plate.width) {
            score += 10;
            sushis.splice(i, 1);
            continue;
        }

        // Check miss
        if (s.y > canvasHeight) {
            lives--;
            sushis.splice(i, 1);
            if (lives <= 0) {
                gameState = 'gameOver';
                saveRanking({
                    key: STORAGE_KEY_ALL_TIME,
                    score,
                    maxEntries: 3,
                    includeTimestamp: true,
                    onSave: () => {
                        saveGlobalScore({ db, firebase: firebaseOps, collectionName: GLOBAL_COLLECTION, score, topN: 3, state: rankingState });
                    }
                });
            }
        }
    }
}

function draw() {
    if (gameState === 'start') {
        drawStartScreen({
            ctx,
            canvasWidth,
            canvasHeight,
            t,
            subtitleText: t('tap_to_start'),
            sections: [
                {
                    title: t('community_top'),
                    list: rankingState.globalRanking,
                    yStart: canvasHeight * 0.35,
                    isGlobal: true,
                    isLoadingRanking: rankingState.isLoadingRanking
                },
                {
                    title: t('all_time_top'),
                    list: getRanking(STORAGE_KEY_ALL_TIME),
                    yStart: canvasHeight * 0.70
                }
            ]
        });
        return;
    }
    if (gameState === 'gameOver') {
        drawGameOverScreen({
            ctx,
            canvasWidth,
            canvasHeight,
            t,
            score,
            showScore: false,
            sections: [
                {
                    title: t('community_top'),
                    list: rankingState.globalRanking,
                    yStart: canvasHeight * 0.45,
                    isGlobal: true,
                    isLoadingRanking: rankingState.isLoadingRanking
                },
                {
                    title: t('all_time_top'),
                    list: getRanking(STORAGE_KEY_ALL_TIME),
                    yStart: canvasHeight * 0.70
                }
            ]
        });
        return;
    }

    drawGameScreen({
        ctx,
        canvasWidth,
        canvasHeight,
        t,
        score,
        showDefaultScore: false,
        backgroundColor: '#0f0f0f',
        drawPlayfield: () => {
            ctx.fillStyle = '#f0f0f0';
            fillRoundRect(ctx, plate.x, plate.y, plate.width, plate.height, 5);

            sushis.forEach(s => {
                ctx.font = `${s.size}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#fff';
                ctx.fillText(s.type.label, s.x + s.size / 2, s.y + s.size / 2);
            });

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 20px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`${t('score')}: ${score}`, 20, 40);
            ctx.textAlign = 'right';
            ctx.fillText(`${t('lives')}: ${'❤️'.repeat(lives)}`, canvasWidth - 20, 40);
        }
    });
}
const notifyParentState = createParentGameStateNotifier();

function gameLoop() {
    langState.sync();

    update();
    draw();
    notifyParentState(gameState);
    requestAnimationFrame(gameLoop);
}

// --- Events ---
window.addEventListener('resize', () => {
    setTimeout(applyResize, 100);
});

let isInputActive = false;
function handleInput(event) {
    const p = getCanvasPointFromEvent({ canvas, event });
    plate.x = Math.max(0, Math.min(p.x - plate.width / 2, canvasWidth - plate.width));
    
    if (gameState === 'start' && isInputActive) {
        gameState = 'playing';
    }
}

canvas.addEventListener('mousedown', (e) => {
    isInputActive = true;
    if (gameState === 'gameOver') {
        gameState = 'start';
        score = 0;
        lives = 3;
        sushis = [];
        fetchGlobalRanking({ db, firebase: firebaseOps, collectionName: GLOBAL_COLLECTION, topN: 3, state: rankingState });
    } else {
        handleInput(e);
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isInputActive || gameState === 'playing') {
        handleInput(e);
    }
});

window.addEventListener('mouseup', () => {
    isInputActive = false;
});

canvas.addEventListener('touchstart', (e) => {
    isInputActive = true;
    if (gameState === 'gameOver') {
        gameState = 'start';
        score = 0;
        lives = 3;
        sushis = [];
        fetchGlobalRanking({ db, firebase: firebaseOps, collectionName: GLOBAL_COLLECTION, topN: 3, state: rankingState });
    } else {
        if (e.cancelable) e.preventDefault();
        handleInput(e);
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (isInputActive || gameState === 'playing') {
        handleInput(e);
    }
}, { passive: false });

window.addEventListener('touchend', () => {
    isInputActive = false;
});

applyResize();
fetchGlobalRanking({ db, firebase: firebaseOps, collectionName: GLOBAL_COLLECTION, topN: 3, state: rankingState });
gameLoop();
