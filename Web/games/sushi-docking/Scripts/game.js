import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDffNMWkocUzsvZkbX_sOXtk5NHr8-KQME",
    authDomain: "sushicious-games.firebaseapp.com",
    projectId: "sushicious-games",
    storageBucket: "sushicious-games.firebasestorage.app",
    messagingSenderId: "597158694276",
    appId: "1:597158694276:web:c52ac21a53f9637d0d61d1",
    measurementId: "G-3CY5YW1H20"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const translations = {
    en: {
        all_time_top: "--- YOUR BEST 3 ---",
        today_top: "--- TODAY BEST 3 ---",
        community_top: "--- GLOBAL TOP 3 ---",
        tap_to_start: "Tap to Start",
        tap_to_retry: "Tap to Retry",
        score: "Score",
        loading: "Loading..."
    },
    ja: {
        all_time_top: "--- あなたのベスト3 ---",
        today_top: "--- 本日のベスト3 ---",
        community_top: "--- 世界ランキング ---",
        tap_to_start: "タップしてスタート",
        tap_to_retry: "タップしてリトライ",
        score: "スコア",
        loading: "読み込み中..."
    }
};

let currentLang = localStorage.getItem('sushicious_lang') || (navigator.language.startsWith('ja') ? 'ja' : 'en');
const t = (key) => translations[currentLang]?.[key] || key;

const STORAGE_KEY_ALL_TIME = 'sushicious_docking_all_time_rank';
const STORAGE_KEY_DAILY = 'sushicious_docking_daily_rank';
const GLOBAL_COLLECTION = 'rankings_docking';

function getRanking(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

function saveRanking(key, score) {
    let ranking = getRanking(key);
    const today = new Date().toLocaleDateString();

    if (key === STORAGE_KEY_DAILY) {
        const lastDate = localStorage.getItem(key + '_date');
        if (lastDate !== today) {
            ranking = [];
            localStorage.setItem(key + '_date', today);
        }
    }

    ranking.push({ score, date: today, timestamp: Date.now() });
    ranking.sort((a, b) => b.score - a.score);
    ranking = ranking.slice(0, 3);
    localStorage.setItem(key, JSON.stringify(ranking));
}

async function fetchGlobalRankingTop3() {
    const q = query(collection(db, GLOBAL_COLLECTION), orderBy("score", "desc"), limit(3));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
}

async function saveGlobalScore(score) {
    if (score <= 0) return;
    await addDoc(collection(db, GLOBAL_COLLECTION), {
        score,
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent
    });
}

(() => {
    const GAME_WIDTH = 540;
    const GAME_HEIGHT = 960;

    const CONTAINER = {
        x: 70,
        y: 140,
        width: 400,
        height: 770
    };

    const CONTAINER_LEFT = CONTAINER.x;
    const CONTAINER_RIGHT = CONTAINER.x + CONTAINER.width;
    const CONTAINER_TOP = CONTAINER.y;
    const CONTAINER_BOTTOM = CONTAINER.y + CONTAINER.height;
    const DEADLINE_Y = CONTAINER_TOP + 70;
    const CONTROLLED_FALL_SPEED = 4.3;

    const TYPES = [
        { id: 'shrimp', emoji: '🦐', radius: 26, weight: 389, score: 10 },
        { id: 'puffer', emoji: '🐡', radius: 45, weight: 100, score: 25 },
        { id: 'fish', emoji: '🐟', radius: 70, weight: 10, score: 60 },
        { id: 'sprout', emoji: '🌱', radius: 26, weight: 389, score: 10 },
        { id: 'ricePlant', emoji: '🌾', radius: 45, weight: 100, score: 25 },
        { id: 'rice', emoji: '🍚', radius: 70, weight: 10, score: 60 },
        { id: 'sushi', emoji: '🍣', radius: 100, weight: 2, score: 200 }
    ];

    const TYPE_BY_ID = new Map(TYPES.map(t => [t.id, t]));

    const SAME_MERGE_TO = {
        shrimp: 'puffer',
        puffer: 'fish',
        sprout: 'ricePlant',
        ricePlant: 'rice'
    };

    const SUSHI_BONUS = 500;

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function pickWeightedTypeId(rng = Math.random) {
        let total = 0;
        for (const t of TYPES) total += t.weight;
        let r = rng() * total;
        for (const t of TYPES) {
            r -= t.weight;
            if (r <= 0) return t.id;
        }
        return TYPES[0].id;
    }

    class MainScene extends Phaser.Scene {
        constructor() {
            super('MainScene');
            this.pieces = new Set();
            this.score = 0;
            this.gameOver = false;
            this.restartQueued = false;
            this.scoreSubmitted = false;
            this.dangerMs = 0;
            this.pointerWorldX = GAME_WIDTH / 2;
            this.controlled = null;
            this.nextTypeId = null;
            this.scoreText = null;
            this.nextText = null;
            this.overlay = null;
            this.startOverlay = null;
            this.rankingsContainer = null;
            this.globalRanking = [];
            this.isLoadingGlobalRanking = false;
            this.sparkTextureKey = 'spark-dot';
            this.started = false;
            this._onPointerMove = null;
            this._onPointerDown = null;
            this._onCollisionStart = null;
        }

        create() {
            this.cameras.main.setBackgroundColor('#0f0f0f');
            this.pieces = new Set();
            this.score = 0;
            this.gameOver = false;
            this.restartQueued = false;
            this.scoreSubmitted = false;
            this.dangerMs = 0;
            currentLang = localStorage.getItem('sushicious_lang') || (navigator.language.startsWith('ja') ? 'ja' : 'en');

            this.started = false;
            this.controlled = null;
            this.overlay = null;
            this.startOverlay = null;
            this.rankingsContainer = null;
            this.globalRanking = [];
            this.isLoadingGlobalRanking = false;
            if (this.matter?.world?.removeAll) {
                this.matter.world.removeAll();
            }
            this.matter.world.setGravity(0, 0.805);
            this.matter.world.resume();
            this.matter.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT, 48, true, true, true, true);


            this.createTextures();
            this.drawBackdrop();
            this.createContainerBounds();
            this.createUI();

            this.nextTypeId = pickWeightedTypeId();
            const nextType = TYPE_BY_ID.get(this.nextTypeId);
            if (nextType) this.nextText.setText(nextType.emoji);
            this.showStartOverlay();
            this.refreshGlobalRanking();

            this._onPointerMove = () => {
                const p = this.input.activePointer;
                const worldPoint = p.positionToCamera(this.cameras.main);
                this.pointerWorldX = worldPoint.x;
            };

            this._onPointerDown = () => {
                if (!this.started && !this.gameOver) {
                    this.startGame();
                    return;
                }
                if (this.gameOver) {
                    if (this.restartQueued) return;
                    this.restartQueued = true;
                    this.scene.restart();
                }
            };

            this.input.on('pointermove', this._onPointerMove);
            this.input.on('pointerdown', this._onPointerDown);

            this._onCollisionStart = (event) => {
                if (this.gameOver || !this.started) return;
                for (const pair of event.pairs) {
                    const bodyA = pair.bodyA;
                    const bodyB = pair.bodyB;
                    const goA = bodyA?.gameObject;
                    const goB = bodyB?.gameObject;

                    if (this.controlled && this.controlled.active && this.controlled.body) {
                        const controlledBody = this.controlled.body;
                        if (bodyA === controlledBody || bodyB === controlledBody) {
                            const otherBody = bodyA === controlledBody ? bodyB : bodyA;
                            const otherGo = otherBody?.gameObject;
                            const hitsPiece = !!otherGo?.getData?.('kind');
                            const hitsFloor = otherBody?.label === 'floor';
                            if (this.controlled.getData('controllable') && (hitsPiece || hitsFloor)) {
                                this.releaseControlled(this.controlled);
                            }
                        }
                    }

                    if (goA && goB) {
                        this.tryMergeFromCollision(goA, goB);
                    }
                }
            };

            const world = this.matter?.world;
            if (world) {
                world.on('collisionstart', this._onCollisionStart);
            }

            this.events.once('shutdown', () => {
                if (this._onPointerMove && this.input) this.input.off('pointermove', this._onPointerMove);
                if (this._onPointerDown && this.input) this.input.off('pointerdown', this._onPointerDown);
                if (this._onCollisionStart && world) world.off('collisionstart', this._onCollisionStart);
            });
        }

        showStartOverlay() {
            const g = this.add.graphics();
            g.fillStyle(0x0f0f0f, 0.82);
            g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

            const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.34, 'SUSHI-Docking', {
                fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
                fontSize: '54px',
                color: '#ffffff',
                fontStyle: '900'
            }).setOrigin(0.5);

            const hint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.52, t('tap_to_start'), {
                fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
                fontSize: '26px',
                color: '#f0f0f0'
            }).setOrigin(0.5).setAlpha(0.92);

            const sub = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.59, '← Drag / →', {
                fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
                fontSize: '18px',
                color: '#d4af37'
            }).setOrigin(0.5).setAlpha(0.9);

            this.startOverlay = this.add.container(0, 0, [g, title, hint, sub]);
        }

        startGame() {
            if (this.started || this.gameOver) return;
            this.started = true;
            if (this.startOverlay) {
                this.startOverlay.destroy();
                this.startOverlay = null;
            }
            this.spawnControlledPiece();
        }

        createTextures() {
            if (this.textures.exists(this.sparkTextureKey)) return;
            const g = this.add.graphics();
            g.fillStyle(0xffffff, 1);
            g.fillCircle(3, 3, 3);
            g.generateTexture(this.sparkTextureKey, 6, 6);
            g.destroy();
        }

        drawBackdrop() {
            const g = this.add.graphics();

            g.fillStyle(0x14110d, 1);
            g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

            for (let y = 0; y < GAME_HEIGHT; y += 28) {
                const alpha = 0.05 + ((y / 28) % 2) * 0.02;
                g.lineStyle(2, 0x7a5230, alpha);
                g.beginPath();
                g.moveTo(0, y);
                g.lineTo(GAME_WIDTH, y + 14);
                g.strokePath();
            }

            g.fillStyle(0xffffff, 0.04);
            g.fillRoundedRect(CONTAINER.x - 14, CONTAINER.y - 14, CONTAINER.width + 28, CONTAINER.height + 28, 10);

            g.fillStyle(0x000000, 0.10);
            g.fillRoundedRect(CONTAINER.x, CONTAINER.y, CONTAINER.width, CONTAINER.height, 8);

            g.lineStyle(4, 0xd4af37, 0.65);
            g.strokeRoundedRect(CONTAINER.x, CONTAINER.y, CONTAINER.width, CONTAINER.height, 8);

            const seaLeft = CONTAINER.x;
            const seaRight = CONTAINER.x + CONTAINER.width;
            const waveAmp = 7;
            const waveStep = 18;
            const waveLen = 44;

            g.fillStyle(0x1db954, 0.14);
            g.beginPath();
            g.moveTo(seaLeft, DEADLINE_Y - waveAmp - 8);
            for (let x = seaLeft; x <= seaRight; x += waveStep) {
                const y = DEADLINE_Y - waveAmp + Math.sin((x - seaLeft) / waveLen) * waveAmp;
                g.lineTo(x, y);
            }
            g.lineTo(seaRight, DEADLINE_Y + waveAmp + 12);
            for (let x = seaRight; x >= seaLeft; x -= waveStep) {
                const y = DEADLINE_Y + waveAmp + Math.sin((x - seaLeft) / waveLen + 1.2) * (waveAmp * 0.7);
                g.lineTo(x, y);
            }
            g.closePath();
            g.fillPath();

            g.lineStyle(7, 0x0c7a3a, 0.7);
            g.beginPath();
            for (let x = seaLeft; x <= seaRight; x += waveStep) {
                const y = DEADLINE_Y + Math.sin((x - seaLeft) / waveLen) * waveAmp;
                if (x === seaLeft) g.moveTo(x, y);
                else g.lineTo(x, y);
            }
            g.strokePath();

            g.lineStyle(3, 0x7fffb2, 0.45);
            g.beginPath();
            for (let x = seaLeft; x <= seaRight; x += waveStep) {
                const y = DEADLINE_Y - 6 + Math.sin((x - seaLeft) / waveLen + 0.9) * (waveAmp * 0.65);
                if (x === seaLeft) g.moveTo(x, y);
                else g.lineTo(x, y);
            }
            g.strokePath();

            g.destroy();

            const noriCount = 6;
            for (let i = 0; i < noriCount; i += 1) {
                const x = seaLeft + ((i + 0.5) / noriCount) * (seaRight - seaLeft);
                this.add.text(x, DEADLINE_Y - 28, '🌿', {
                    fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
                    fontSize: '20px',
                    color: '#ffffff'
                }).setOrigin(0.5).setAlpha(0.65);
            }
        }

        createContainerBounds() {
            const thickness = 44;
            const sideOpts = { isStatic: true, restitution: 0.1, friction: 0.8, label: 'side' };
            const floorOpts = { isStatic: true, restitution: 0.05, friction: 0.9, label: 'floor' };

            this.matter.add.rectangle(CONTAINER_LEFT - thickness / 2, (CONTAINER_TOP + CONTAINER_BOTTOM) / 2, thickness, CONTAINER.height + thickness, sideOpts);
            this.matter.add.rectangle(CONTAINER_RIGHT + thickness / 2, (CONTAINER_TOP + CONTAINER_BOTTOM) / 2, thickness, CONTAINER.height + thickness, sideOpts);
            this.matter.add.rectangle((CONTAINER_LEFT + CONTAINER_RIGHT) / 2, CONTAINER_BOTTOM + thickness / 2, CONTAINER.width + thickness, thickness, floorOpts);
        }

        createUI() {
            const styleTitle = {
                fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
                fontStyle: '900',
                fontSize: '28px',
                color: '#f0f0f0'
            };

            const styleSmall = {
                fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
                fontSize: '18px',
                color: '#f0f0f0'
            };

            this.add.text(24, 26, 'SUSHI-Docking', styleTitle).setAlpha(0.95);

            this.scoreText = this.add.text(24, 68, 'Score: 0', styleSmall).setAlpha(0.95);

            const nextLabel = this.add.text(GAME_WIDTH - 24, 40, 'Next', styleSmall).setOrigin(1, 0).setAlpha(0.85);
            nextLabel.setColor('#d4af37');

            this.nextText = this.add.text(GAME_WIDTH - 24, 70, '🦐', {
                fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
                fontSize: '42px',
                color: '#ffffff'
            }).setOrigin(1, 0).setAlpha(0.95);
        }

        update(time, delta) {
            if (this.gameOver) return;
            if (!this.started) return;

            const p = this.input.activePointer;
            if (p) {
                const worldPoint = p.positionToCamera(this.cameras.main);
                this.pointerWorldX = worldPoint.x;
            }

            if (this.controlled && this.controlled.active && this.controlled.getData('controllable')) {
                const radius = this.controlled.getData('radius');
                const targetX = clamp(this.pointerWorldX, CONTAINER_LEFT + radius, CONTAINER_RIGHT - radius);
                const currentY = this.controlled.body.position.y;
                this.controlled.setPosition(targetX, currentY);
                this.controlled.setVelocity(0, CONTROLLED_FALL_SPEED);
                this.controlled.setAngularVelocity(0);
            }

            this.updateDanger(delta);
        }

        updateDanger(delta) {
            let inDanger = false;
            for (const piece of this.pieces) {
                if (!piece.active) continue;
                if (piece.getData('controllable')) continue;
                const y = piece.body.position.y;
                const radius = piece.getData('radius') || 0;
                if (y - radius < DEADLINE_Y) {
                    inDanger = true;
                    break;
                }
            }

            if (inDanger) {
                this.dangerMs += delta;
            } else {
                this.dangerMs = 0;
            }

            if (this.dangerMs >= 3000) {
                this.endGame();
            }
        }

        endGame() {
            if (this.gameOver) return;
            this.gameOver = true;
            this.matter.world.pause();
            this.saveRankingsOnce();

            const g = this.add.graphics();
            g.fillStyle(0x0f0f0f, 0.85);
            g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

            const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.35, 'GAME OVER', {
                fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
                fontSize: '54px',
                color: '#ffffff',
                fontStyle: '900'
            }).setOrigin(0.5);

            const score = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.47, `${this.score}`, {
                fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
                fontSize: '64px',
                color: '#d4af37',
                fontStyle: '900'
            }).setOrigin(0.5);

            const hint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.62, t('tap_to_retry'), {
                fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
                fontSize: '22px',
                color: '#f0f0f0'
            }).setOrigin(0.5).setAlpha(0.9);

            this.overlay = this.add.container(0, 0, [g, title, score, hint]);
            this.buildRankingsUI();
        }

        saveRankingsOnce() {
            if (this.scoreSubmitted) return;
            this.scoreSubmitted = true;

            saveRanking(STORAGE_KEY_ALL_TIME, this.score);
            saveRanking(STORAGE_KEY_DAILY, this.score);

            saveGlobalScore(this.score)
                .then(() => this.refreshGlobalRanking())
                .catch(() => {});
        }

        refreshGlobalRanking() {
            if (this.isLoadingGlobalRanking) return;
            this.isLoadingGlobalRanking = true;
            fetchGlobalRankingTop3()
                .then((rows) => {
                    this.globalRanking = Array.isArray(rows) ? rows : [];
                })
                .catch(() => {
                    this.globalRanking = [];
                })
                .finally(() => {
                    this.isLoadingGlobalRanking = false;
                    if (this.gameOver && this.overlay) {
                        this.buildRankingsUI();
                    }
                });
        }

        buildRankingsUI() {
            if (!this.overlay) return;
            if (this.rankingsContainer) {
                this.rankingsContainer.destroy();
                this.rankingsContainer = null;
            }

            const baseY = GAME_HEIGHT * 0.68;
            const columnGap = 180;
            const leftX = GAME_WIDTH / 2 - columnGap;
            const midX = GAME_WIDTH / 2;
            const rightX = GAME_WIDTH / 2 + columnGap;

            const textStyleTitle = {
                fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
                fontSize: '16px',
                color: '#f0f0f0',
                fontStyle: '700'
            };

            const textStyleRow = {
                fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
                fontSize: '16px',
                color: '#ffffff'
            };

            const allTime = getRanking(STORAGE_KEY_ALL_TIME);
            const daily = getRanking(STORAGE_KEY_DAILY);
            const global = this.globalRanking;

            const container = this.add.container(0, 0);

            const makeColumn = (x, titleText, items, isLoading = false) => {
                const title = this.add.text(x, baseY, titleText, textStyleTitle).setOrigin(0.5, 0);
                const rows = [];
                if (isLoading && (!items || items.length === 0)) {
                    rows.push(this.add.text(x, baseY + 26, t('loading'), { ...textStyleRow, color: '#999999' }).setOrigin(0.5, 0));
                } else if (!items || items.length === 0) {
                    rows.push(this.add.text(x, baseY + 26, '-', { ...textStyleRow, color: '#999999' }).setOrigin(0.5, 0));
                } else {
                    for (let i = 0; i < Math.min(3, items.length); i += 1) {
                        const scoreVal = items[i]?.score ?? items[i]?.score;
                        const line = `${i + 1}. ${scoreVal}`;
                        rows.push(this.add.text(x, baseY + 26 + i * 22, line, textStyleRow).setOrigin(0.5, 0));
                    }
                }
                return [title, ...rows];
            };

            container.add(makeColumn(leftX, t('all_time_top'), allTime));
            container.add(makeColumn(midX, t('today_top'), daily));
            container.add(makeColumn(rightX, t('community_top'), global, this.isLoadingGlobalRanking));

            this.rankingsContainer = container;
            this.overlay.add(container);
        }

        releaseControlled(piece) {
            if (!piece.active) return;
            if (!piece.getData('controllable')) return;
            if (piece.getData('spawnQueued')) {
                piece.setData('controllable', false);
                piece.setIgnoreGravity(false);
                return;
            }

            piece.setData('controllable', false);
            piece.setData('spawnQueued', true);
            piece.setIgnoreGravity(false);

            this.time.delayedCall(300, () => {
                if (this.gameOver) return;
                if (!piece.active) return;
                if (this.controlled !== piece) return;
                this.controlled = null;
                this.spawnControlledPiece();
            });
        }

        spawnControlledPiece() {
            const typeId = this.nextTypeId;
            this.nextTypeId = pickWeightedTypeId();
            const nextType = TYPE_BY_ID.get(this.nextTypeId);
            if (nextType) this.nextText.setText(nextType.emoji);

            const type = TYPE_BY_ID.get(typeId) || TYPES[0];
            const x = clamp(this.pointerWorldX, CONTAINER_LEFT + type.radius, CONTAINER_RIGHT - type.radius);
            const y = CONTAINER_TOP + 40;
            const piece = this.createPiece(type.id, x, y);
            piece.setData('controllable', true);
            piece.setIgnoreGravity(true);
            this.controlled = piece;

            this.time.delayedCall(650, () => {
                if (!piece.active) return;
                if (!piece.getData('controllable')) return;
                if (piece.body.position.y > CONTAINER_TOP + 220) {
                    this.releaseControlled(piece);
                }
            });
        }

        createPiece(typeId, x, y) {
            const def = TYPE_BY_ID.get(typeId) || TYPES[0];
            const fontSize = Math.max(18, Math.round(def.radius * 1.7));
            const obj = this.add.text(x, y, def.emoji, {
                fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
                fontSize: `${fontSize}px`,
                color: '#ffffff'
            });
            obj.setOrigin(0.5);

            this.matter.add.gameObject(obj, {
                shape: { type: 'circle', radius: def.radius },
                restitution: 0.15,
                friction: 0.8,
                frictionAir: 0.02,
                density: 0.0012
            });

            obj.setData('kind', def.id);
            obj.setData('radius', def.radius);
            obj.setData('merging', false);
            obj.setData('controllable', false);
            obj.setData('spawnQueued', false);
            obj.setIgnoreGravity(false);

            this.pieces.add(obj);
            obj.once('destroy', () => this.pieces.delete(obj));

            return obj;
        }

        tryMergeFromCollision(a, b) {
            if (this.gameOver) return;
            const kindA = a.getData('kind');
            const kindB = b.getData('kind');
            if (!kindA || !kindB) return;
            if (a.getData('merging') || b.getData('merging')) return;

            if (kindA === kindB) {
                const result = SAME_MERGE_TO[kindA];
                if (result) {
                    this.mergePieces([a, b], result);
                    return;
                }
                if (kindA === 'sushi') {
                    this.vanishSushiPair([a, b]);
                }
                return;
            }

            const makesSushi =
                (kindA === 'fish' && kindB === 'rice') ||
                (kindA === 'rice' && kindB === 'fish');
            if (makesSushi) {
                this.mergePieces([a, b], 'sushi');
            }
        }

        mergePieces(pair, resultTypeId) {
            if (this.gameOver) return;
            const [a, b] = pair;
            if (!a.active || !b.active) return;

            a.setData('merging', true);
            b.setData('merging', true);

            const mx = (a.body.position.x + b.body.position.x) / 2;
            const my = (a.body.position.y + b.body.position.y) / 2;

            this.spawnSparkles(mx, my, 18, 0xffffff);

            this.time.delayedCall(0, () => {
                if (a.active) a.destroy();
                if (b.active) b.destroy();

                const newPiece = this.createPiece(resultTypeId, mx, my);
                newPiece.setVelocity(Phaser.Math.Between(-2, 2), Phaser.Math.Between(-3, -1));
                newPiece.setAngularVelocity(Phaser.Math.FloatBetween(-0.06, 0.06));
            });

            this.addScoreForType(resultTypeId);
            this.playTone(660, 0.06, 0.04);

            if (this.controlled && (a === this.controlled || b === this.controlled)) {
                this.controlled = null;
                this.time.delayedCall(220, () => this.spawnControlledPiece());
            }
        }

        vanishSushiPair(pair) {
            if (this.gameOver) return;
            const [a, b] = pair;
            if (!a.active || !b.active) return;

            a.setData('merging', true);
            b.setData('merging', true);

            const mx = (a.body.position.x + b.body.position.x) / 2;
            const my = (a.body.position.y + b.body.position.y) / 2;

            this.spawnSmoke(mx, my);
            this.spawnSparkles(mx, my, 42, 0xd4af37);
            this.applyPopImpulse(mx, my);

            const pop = this.add.text(mx, my, '💰', {
                fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
                fontSize: '150px',
                color: '#ffffff'
            }).setOrigin(0.5);
            pop.setScale(0.7);
            pop.setAlpha(0.0);
            this.tweens.add({
                targets: pop,
                scale: 1.25,
                alpha: 1,
                duration: 140,
                yoyo: true,
                hold: 80,
                onComplete: () => pop.destroy()
            });

            this.time.delayedCall(200, () => {
                if (a.active) a.destroy();
                if (b.active) b.destroy();
            });

            this.score += SUSHI_BONUS;
            if (this.scoreText && this.scoreText.active) {
                this.scoreText.setText(`Score: ${this.score}`);
            }
            this.playTone(988, 0.07, 0.07);

            if (this.controlled && (a === this.controlled || b === this.controlled)) {
                this.controlled = null;
                this.time.delayedCall(220, () => this.spawnControlledPiece());
            }
        }

        applyPopImpulse(x, y) {
            const MatterBody = Phaser.Physics.Matter.Matter.Body;
            const radius = 190;
            const base = 0.020;

            for (const piece of this.pieces) {
                if (!piece.active || !piece.body) continue;
                const bx = piece.body.position.x;
                const by = piece.body.position.y;
                const dx = bx - x;
                const dy = by - y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= 12 || dist > radius) continue;
                const nx = dx / dist;
                const ny = dy / dist;
                const falloff = 1 - dist / radius;
                const force = base * falloff;
                MatterBody.applyForce(piece.body, piece.body.position, { x: nx * force, y: ny * force });
            }
        }

        spawnSparkles(x, y, count, color) {
            const particles = this.add.particles(0, 0, this.sparkTextureKey, {
                x,
                y,
                quantity: count,
                lifespan: 520,
                speed: { min: 40, max: 220 },
                angle: { min: 0, max: 360 },
                scale: { start: 1.0, end: 0 },
                alpha: { start: 0.9, end: 0 },
                tint: color,
                blendMode: 'ADD'
            });

            this.time.delayedCall(520, () => particles.destroy());
        }

        spawnSmoke(x, y) {
            const particles = this.add.particles(0, 0, this.sparkTextureKey, {
                x,
                y,
                quantity: 18,
                lifespan: 720,
                speed: { min: 30, max: 160 },
                angle: { min: 0, max: 360 },
                scale: { start: 3.0, end: 6.5 },
                alpha: { start: 0.22, end: 0 },
                tint: 0xffffff,
                blendMode: 'NORMAL'
            });

            this.time.delayedCall(720, () => particles.destroy());
        }

        addScoreForType(typeId) {
            if (this.gameOver) return;
            const def = TYPE_BY_ID.get(typeId);
            const add = def?.score ?? 0;
            this.score += add;
            if (this.scoreText && this.scoreText.active) {
                this.scoreText.setText(`Score: ${this.score}`);
            }
        }

        playTone(freq, durationSec, gain) {
            if (!window.AudioContext && !window.webkitAudioContext) return;
            if (!this._audioCtx) {
                this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            const ctx = this._audioCtx;
            if (ctx.state === 'suspended') {
                ctx.resume().catch(() => {});
            }
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            g.gain.setValueAtTime(0.0001, now);
            g.gain.exponentialRampToValueAtTime(gain, now + 0.01);
            g.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
            osc.connect(g);
            g.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + durationSec + 0.02);
        }
    }

    const config = {
        type: Phaser.AUTO,
        parent: 'game-container',
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        backgroundColor: '#0f0f0f',
        physics: {
            default: 'matter',
            matter: {
                gravity: { y: 0.805 },
                debug: false
            }
        },
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        scene: [MainScene]
    };

    new Phaser.Game(config);
})();
