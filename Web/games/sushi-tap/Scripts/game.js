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
const baseTargetSpeed = 3;
const targetSpeedIncreasePerSecond = 0.02;
const maxTargetSpeed = 30;
let targetSpeed = baseTargetSpeed;
let playStartTimeMs = 0;

function applyResize() {
    const size = resizeCanvas({ canvas });
    canvasWidth = size.canvasWidth;
    canvasHeight = size.canvasHeight;
}

function update() {
    if (gameState !== 'playing') return;
    const elapsedSeconds = (performance.now() - playStartTimeMs) / 1000;
    targetSpeed = Math.min(baseTargetSpeed + elapsedSeconds * targetSpeedIncreasePerSecond, maxTargetSpeed);
    targets.forEach(target => {
        target.y += targetSpeed;
    });
    if (Math.random() < 0.04) {
        const size = 50 + Math.random() * 30;
        targets.push({
            x: size/2 + Math.random() * (canvasWidth - size),
            y: -size,
            size: size
        });
    }
    if (targets.some(t => t.y > canvasHeight + 50)) {
        gameState = 'gameOver';
        saveRanking({
            key: STORAGE_KEY_ALL_TIME,
            score,
            maxEntries: 3,
            includeTimestamp: true,
            onSave: () => {
                saveGlobalScore({
                    db,
                    firebase: firebaseOps,
                    collectionName: GLOBAL_COLLECTION,
                    score,
                    topN: 3,
                    state: rankingState
                });
            }
        });
        saveRanking({
            key: STORAGE_KEY_DAILY,
            score,
            maxEntries: 3,
            dailyKey: STORAGE_KEY_DAILY,
            includeTimestamp: true
        });
        lastStateChange = Date.now();
    }
    if (targets.length > 50) {
        targets = targets.filter(t => t.y < canvasHeight + 100);
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
                        ctx.ellipse(target.x, target.y + 10, target.size / 2, target.size / 3, 0, 0, Math.PI * 2);
                    } else {
                        ctx.arc(target.x, target.y + 10, target.size / 2.5, 0, Math.PI * 2);
                    }
                    ctx.fill();
                    ctx.strokeStyle = '#e0e0e0';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.fillStyle = '#ff3e3e';
                    fillRoundRect(ctx, target.x - target.size / 2, target.y - target.size / 4, target.size, target.size / 2, 8);
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

function handleTap(event) {
    const now = Date.now();
    const canChangeState = (now - lastStateChange > 300);
    if (event.type === 'touchstart' && event.cancelable) {
        event.preventDefault();
    }
    const p = getCanvasPointFromEvent({ canvas, event });
    const tapX = p.x;
    const tapY = p.y;

    if (gameState === 'start' && canChangeState) {
        gameState = 'playing';
        score = 0;
        targets = [];
        targetSpeed = baseTargetSpeed;
        playStartTimeMs = performance.now();
        lastStateChange = now;
    } else if (gameState === 'playing') {
        targets.forEach((target, index) => {
            const distance = Math.sqrt(Math.pow(tapX - target.x, 2) + Math.pow(tapY - target.y, 2));
            if (distance < target.size / 2) {
                targets.splice(index, 1);
                score++;
            }
        });
    } else if (gameState === 'gameOver' && canChangeState) {
        gameState = 'start';
        lastStateChange = now;
        // Fetch latest rankings when returning to start screen
        fetchGlobalRanking({
            db,
            firebase: firebaseOps,
            collectionName: GLOBAL_COLLECTION,
            topN: 3,
            state: rankingState
        });
    }
}

window.addEventListener('resize', () => {
    setTimeout(applyResize, 100);
}, false);
canvas.addEventListener('touchstart', handleTap, { passive: false });
canvas.addEventListener('mousedown', handleTap, false);

applyResize();
fetchGlobalRanking({ db, firebase: firebaseOps, collectionName: GLOBAL_COLLECTION, topN: 3, state: rankingState });
gameLoop();
