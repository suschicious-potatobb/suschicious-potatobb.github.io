export async function fetchGlobalRanking({ db, firebase, collectionName, topN = 3, state } = {}) {
    if (!db || !firebase || !collectionName) return [];
    if (state?.isLoadingRanking) return state?.globalRanking || [];

    if (state) state.isLoadingRanking = true;
    try {
        const q = firebase.query(
            firebase.collection(db, collectionName),
            firebase.orderBy("score", "desc"),
            firebase.limit(topN)
        );
        const querySnapshot = await firebase.getDocs(q);
        const ranking = querySnapshot.docs.map(doc => doc.data());
        if (state) state.globalRanking = ranking;
        return ranking;
    } catch (e) {
        console.error("Error fetching ranking: ", e);
        return state?.globalRanking || [];
    } finally {
        if (state) state.isLoadingRanking = false;
    }
}

export async function saveGlobalScore({ db, firebase, collectionName, score, topN = 3, state } = {}) {
    if (!db || !firebase || !collectionName) return;
    if (typeof score !== 'number' || score <= 0) return;

    try {
        await firebase.addDoc(firebase.collection(db, collectionName), {
            score,
            timestamp: firebase.serverTimestamp(),
            userAgent: navigator.userAgent
        });
        if (state) {
            await fetchGlobalRanking({ db, firebase, collectionName, topN, state });
        }
    } catch (e) {
        console.error("Error adding document: ", e);
    }
}

export function getRanking(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

export function resizeCanvas({ canvas, maxAspectRatio = 9 / 16 } = {}) {
    if (!canvas) return { canvasWidth: 0, canvasHeight: 0 };
    const viewWidth = document.documentElement.clientWidth;
    const viewHeight = document.documentElement.clientHeight;

    let canvasWidth = viewWidth;
    let canvasHeight = viewHeight;

    if (viewWidth / viewHeight > maxAspectRatio) {
        canvasWidth = Math.floor(viewHeight * maxAspectRatio);
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';

    return { canvasWidth, canvasHeight };
}

export function drawRankList({ ctx, t, canvasWidth, title, list, yStart, isGlobal = false, isLoadingRanking = false } = {}) {
    if (!ctx) return;
    ctx.fillStyle = '#f0f0f0';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, canvasWidth / 2, yStart);

    const translate = typeof t === 'function' ? t : (key) => key;

    ctx.font = 'bold 18px monospace';
    if (isGlobal && isLoadingRanking && list.length === 0) {
        ctx.fillStyle = '#999';
        ctx.fillText(translate('loading'), canvasWidth / 2, yStart + 35);
        return;
    }
    if (list.length === 0) {
        ctx.fillStyle = '#666';
        ctx.fillText('-', canvasWidth / 2, yStart + 35);
        return;
    }

    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        ctx.fillStyle = i === 0 ? '#ffd700' : (i === 1 ? '#e0e0e0' : (i === 2 ? '#cd7f32' : '#ffffff'));
        ctx.fillText(`${i + 1}. ${item.score} ${translate('pts')}`, canvasWidth / 2, yStart + 35 + (i * 28));
    }
}

export function drawStartScreen({ ctx, canvasWidth, canvasHeight, t, globalRanking = [], isLoadingRanking = false } = {}) {
    if (!ctx) return;

    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

    const translate = typeof t === 'function' ? t : (key) => key;

    ctx.fillStyle = '#ff3e3e';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(translate('game_title'), canvasWidth / 2, canvasHeight * 0.15);

    drawRankList({
        ctx,
        t: translate,
        canvasWidth,
        title: translate('community_top'),
        list: globalRanking,
        yStart: canvasHeight * 0.35,
        isGlobal: true,
        isLoadingRanking
    });

    ctx.fillStyle = `rgba(240, 240, 240, ${0.7 + Math.sin(Date.now() / 300) * 0.3})`;
    ctx.font = '22px sans-serif';
    ctx.fillText(translate('tap_to_start'), canvasWidth / 2, canvasHeight * 0.85);
}

export function drawGameScreen({ ctx, canvasWidth, canvasHeight, t, score, drawPlayfield } = {}) {
    if (!ctx) return;
    const translate = typeof t === 'function' ? t : (key) => key;

    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    if (typeof drawPlayfield === 'function') {
        drawPlayfield({ ctx, canvasWidth, canvasHeight });
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${translate('score')}: ${score}`, 15, 45);
}

export function drawGameOverScreen({
    ctx,
    canvasWidth,
    canvasHeight,
    t,
    score,
    storageKeyAllTime,
    storageKeyDaily,
    getRanking: getRankingFn = getRanking
} = {}) {
    if (!ctx) return;
    const translate = typeof t === 'function' ? t : (key) => key;

    ctx.fillStyle = 'rgba(15, 15, 15, 0.9)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(translate('game_over'), canvasWidth / 2, canvasHeight * 0.15);

    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 54px sans-serif';
    ctx.fillText(score, canvasWidth / 2, canvasHeight * 0.28);
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(translate('score').toUpperCase(), canvasWidth / 2, canvasHeight * 0.33);

    const allTime = storageKeyAllTime ? getRankingFn(storageKeyAllTime) : [];
    const daily = storageKeyDaily ? getRankingFn(storageKeyDaily) : [];

    drawRankList({
        ctx,
        t: translate,
        canvasWidth,
        title: translate('all_time_top'),
        list: allTime,
        yStart: canvasHeight * 0.45
    });
    drawRankList({
        ctx,
        t: translate,
        canvasWidth,
        title: translate('today_top'),
        list: daily,
        yStart: canvasHeight * 0.70
    });

    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.fillText(translate('tap_to_retry'), canvasWidth / 2, canvasHeight * 0.92);
}
