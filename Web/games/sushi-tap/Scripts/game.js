import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import {
    fetchGlobalRanking,
    getRanking,
    saveScoreToRankings,
    resizeCanvas,
    drawStartScreen,
    drawGameScreen,
    drawGameOverScreen,
    fillRoundRect,
    bindCanvasPointerStart,
    createLangState,
    createParentGameStateNotifier,
    resetGame,
    endGame,
} from "../../shared/Scripts/game-common.js";
import {
    RANKING_MAX_ENTRIES,
    RANKING_TOP_N,
    TARGET_ARC_RADIUS_DIVISOR,
    TARGET_BASE_SPEED,
    TARGET_BODY_CORNER_RADIUS,
    TARGET_CULL_Y_MARGIN,
    TARGET_MAX_COUNT,
    TARGET_MAX_SPEED,
    TARGET_MISS_Y_MARGIN,
    TARGET_SHADOW_Y_OFFSET,
    TARGET_SIZE_MIN,
    TARGET_SIZE_RANGE,
    TARGET_SPAWN_PROBABILITY_PER_FRAME,
    TARGET_SPEED_INCREASE_PER_SECOND,
    TARGET_STROKE_WIDTH,
    RESIZE_DEBOUNCE_MS,
} from "./constants.js";

// --- Firebase Configuration ---
const firebaseConfig = { 
    apiKey: "AIzaSyDqId4B-kbsT0Xn_QbfCIh88vgr0yDNQu0", 
    authDomain: "sushicious-games.firebaseapp.com", 
    projectId: "sushicious-games", 
    storageBucket: "sushicious-games.firebasestorage.app", 
    messagingSenderId: "597158694276", 
    appId: "1:597158694276:web:b4ed18046b6711770d61d1", 
    measurementId: "G-NS62XTVFTP" 
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
        game_title: "Sushi Tap",
        tap_to_start: "Tap to Start",
        score: "Score",
        game_over: "GAME OVER",
        all_time_top: "--- YOUR BEST 3 ---",
        today_top: "--- TODAY BEST 3 ---",
        community_top: "--- GLOBAL TOP 3 ---",
        tap_to_retry: "Tap to Retry",
        pts: "pts",
        loading: "Loading..."
    },
    ja: {
        game_title: "寿司タップ",
        tap_to_start: "タップしてスタート",
        score: "スコア",
        game_over: "ゲームオーバー",
        all_time_top: "--- あなたのベスト3 ---",
        today_top: "--- 本日のベスト3 ---",
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
let gameState = 'start'; // 'start', 'playing', 'gameOver'
const rankingState = { globalRanking: [], isLoadingRanking: false };

// --- Ranking Configuration ---
const STORAGE_KEY_ALL_TIME = 'sushicious_all_time_rank';
const STORAGE_KEY_DAILY = 'sushicious_daily_rank';
const GLOBAL_COLLECTION = 'rankings_tap';

// --- Game Objects ---
let targets = [];
let targetSpeed = TARGET_BASE_SPEED;
let playStartTimeMs = 0;

function applyResize() {
    const size = resizeCanvas({ canvas });
    canvasWidth = size.canvasWidth;
    canvasHeight = size.canvasHeight;
}

function startPlaying(now) {
    gameState = 'playing';
    score = 0;
    targets = [];
    targetSpeed = TARGET_BASE_SPEED;
    playStartTimeMs = performance.now();
    lastStateChange = now;
}

function update() {
    if (gameState !== 'playing') return;
    const elapsedSeconds = (performance.now() - playStartTimeMs) / 1000;
    targetSpeed = Math.min(TARGET_BASE_SPEED + elapsedSeconds * TARGET_SPEED_INCREASE_PER_SECOND, TARGET_MAX_SPEED);
    targets.forEach(target => {
        target.y += targetSpeed;
    });
    if (Math.random() < TARGET_SPAWN_PROBABILITY_PER_FRAME) {
        const size = TARGET_SIZE_MIN + Math.random() * TARGET_SIZE_RANGE;
        targets.push({
            x: size/2 + Math.random() * (canvasWidth - size),
            y: -size,
            size: size
        });
    }
    if (targets.some(t => t.y > canvasHeight + TARGET_MISS_Y_MARGIN)) {
        const changed = endGame({
            getGameState: () => gameState,
            setGameState: (next) => { gameState = next; },
            onSaveScore: () => saveScoreToRankings({
                score,
                storageKeyAllTime: STORAGE_KEY_ALL_TIME,
                storageKeyDaily: STORAGE_KEY_DAILY,
                dailyKey: STORAGE_KEY_DAILY,
                maxEntries: RANKING_MAX_ENTRIES,
                includeTimestamp: true,
                global: {
                    db,
                    firebase: firebaseOps,
                    collectionName: GLOBAL_COLLECTION,
                    topN: RANKING_TOP_N,
                    state: rankingState
                }
            })
        });
        if (changed) lastStateChange = Date.now;
    }
    if (targets.length > TARGET_MAX_COUNT) {
        targets = targets.filter(t => t.y < canvasHeight + TARGET_CULL_Y_MARGIN);
    }
}

const notifyParentState = createParentGameStateNotifier();

function gameLoop() {
    update();
    notifyParentState(gameState);
    langState.sync();
    if (gameState === 'start') {
        drawStartScreen({
            ctx,
            canvasWidth,
            canvasHeight,
            t,
            globalRanking: rankingState.globalRanking,
            isLoadingRanking: rankingState.isLoadingRanking
        });
    } else if (gameState === 'playing') {
        drawGameScreen({
            ctx,
            canvasWidth,
            canvasHeight,
            t,
            score,
            drawPlayfield: () => {
                targets.forEach(target => {
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    if (ctx.ellipse) {
                        ctx.ellipse(target.x, target.y + TARGET_SHADOW_Y_OFFSET, target.size / 2, target.size / 3, 0, 0, Math.PI * 2);
                    } else {
                        ctx.arc(target.x, target.y + TARGET_SHADOW_Y_OFFSET, target.size / TARGET_ARC_RADIUS_DIVISOR, 0, Math.PI * 2);
                    }
                    ctx.fill();
                    ctx.strokeStyle = '#e0e0e0';
                    ctx.lineWidth = TARGET_STROKE_WIDTH;
                    ctx.stroke();
                    ctx.fillStyle = '#ff3e3e';
                    fillRoundRect(ctx, target.x - target.size / 2, target.y - target.size / 4, target.size, target.size / 2, TARGET_BODY_CORNER_RADIUS);
                });
            }
        });
    } else if (gameState === 'gameOver') {
        drawGameOverScreen({
            ctx,
            canvasWidth,
            canvasHeight,
            t,
            score,
            storageKeyAllTime: STORAGE_KEY_ALL_TIME,
            storageKeyDaily: STORAGE_KEY_DAILY,
            getRanking
        });
    }
    requestAnimationFrame(gameLoop);
}

let lastStateChange = 0;

function handleTap({ x, y } = {}) {
    const now = Date.now();
    const tapX = x;
    const tapY = y;

    if (gameState === 'start') {
        startPlaying(now);
    } else if (gameState === 'playing') {
        for (let i = targets.length - 1; i >= 0; i--) {
            const target = targets[i];
            const dx = tapX - target.x;
            const dy = tapY - target.y;
            const r = target.size / 2;
            if (dx * dx + dy * dy < r * r) {
                targets.splice(i, 1);
                score++;
            }
        }
    } else if (gameState === 'gameOver') {
        resetGame({
            setGameState: (next) => { gameState = next; },
            setScore: (next) => { score = next; },
            extraReset: () => {
                lastStateChange = now;
            },
            fetchRanking: () => fetchGlobalRanking({
                db,
                firebase: firebaseOps,
                collectionName: GLOBAL_COLLECTION,
                topN: RANKING_TOP_N,
                state: rankingState
            })
        });
    }
}

window.addEventListener('resize', () => {
    setTimeout(applyResize, RESIZE_DEBOUNCE_MS);
}, false);
bindCanvasPointerStart({
    canvas,
    onPoint: ({ x, y }) => handleTap({ x, y })
});

applyResize();
fetchGlobalRanking({ db, firebase: firebaseOps, collectionName: GLOBAL_COLLECTION, topN: RANKING_TOP_N, state: rankingState });
gameLoop();
