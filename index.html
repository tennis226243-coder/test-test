<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>VIP TRADE TERMINAL</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <style>
        body {
            background-color: #0b0f17; /* シックなダークグレーベース */
            color: #e5e7eb;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            -webkit-user-select: none;
            user-select: none;
            overflow: hidden;
        }
        .app-header {
            background: rgba(15, 23, 42, 0.9);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-bottom: 1px solid rgba(148, 163, 184, 0.15);
        }
        .luxury-card {
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.8) 100%);
            border: 1px solid rgba(148, 163, 184, 0.12);
            border-radius: 18px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);
            transition: all 0.2s ease;
        }
        .luxury-card:active {
            transform: scale(0.98);
            border-color: rgba(148, 163, 184, 0.3);
        }
        .app-nav {
            background: rgba(11, 15, 23, 0.95);
            backdrop-filter: blur(20px);
            border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
        .nav-btn.active {
            color: #94a3b8; /* グレーシルバーのアクセント */
        }
        .nav-btn.active svg {
            fill: #94a3b8;
            filter: drop-shadow(0 0 6px rgba(148, 163, 184, 0.4));
        }
        .closed-badge {
            background: rgba(100, 116, 139, 0.2);
            color: #94a3b8;
            border: 1px solid rgba(100, 116, 139, 0.3);
        }
        .mini-chart {
            width: 80px;
            height: 30px;
        }
        .no-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
    </style>
</head>
<body class="flex flex-col h-screen">

    <!-- グレー基調ヘッダー -->
    <header class="app-header px-4 py-3 flex justify-between items-center z-30">
        <div class="flex items-center space-x-3">
            <div class="w-3 h-3 rounded-full bg-gray-500 shadow-md"></div>
            <div>
                <h1 class="text-xs font-black tracking-widest text-gray-300">APEX TERMINAL</h1>
                <p class="text-[8px] text-gray-500 font-mono tracking-tighter">OFF-EXCHANGE / CLOSED</p>
            </div>
        </div>
        <div class="flex items-center space-x-2">
            <span class="text-[10px] font-mono closed-badge px-2.5 py-1 rounded-full shadow-inner tracking-wider">
                市場閉場中
            </span>
        </div>
    </header>

    <!-- メインコンテンツ領域 -->
    <main class="flex-1 overflow-y-auto p-4 space-y-3 pb-28 no-scrollbar" id="main-content-area">
        <!-- タブ1: シグナル -->
        <div id="tab-signals" class="space-y-3">
            <div class="flex justify-between items-center px-1">
                <span class="text-[11px] font-bold text-gray-400 tracking-widest uppercase">★ 最終確定・アーカイブデータ</span>
            </div>
            <div id="stock-list-container" class="space-y-3">
                <!-- 描画コンテナ -->
            </div>
        </div>

        <!-- タブ2: 設定 -->
        <div id="tab-settings" class="space-y-3 hidden">
            <div class="luxury-card p-5 space-y-4">
                <h3 class="text-xs font-bold text-gray-300 uppercase tracking-widest border-b border-gray-800 pb-2">ターミナル環境設定</h3>
                <div class="flex justify-between items-center text-xs">
                    <span class="text-gray-400">ステータス</span>
                    <span class="font-mono text-gray-300">クローズ (取引停止中)</span>
                </div>
                <div class="flex justify-between items-center text-xs">
                    <span class="text-gray-400">表示モード</span>
                    <span class="font-mono text-gray-400">モノトーン・ダーク</span>
                </div>
            </div>
        </div>
    </main>

    <!-- ボトムナビゲーション -->
    <nav class="app-nav fixed bottom-0 left-0 right-0 h-16 flex justify-around items-center px-2 z-30 shadow-2xl">
        <button onclick="switchTab('signals')" id="nav-signals" class="nav-btn active flex flex-col items-center justify-center w-1/2 text-gray-500 space-y-1 transition-all">
            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            <span class="text-[10px] font-bold tracking-wider">シグナル</span>
        </button>
        <button onclick="switchTab('settings')" id="nav-settings" class="nav-btn flex flex-col items-center justify-center w-1/2 text-gray-500 space-y-1 transition-all">
            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
            <span class="text-[10px] font-bold tracking-wider">設定</span>
        </button>
    </nav>

    <!-- JavaScript 制御 -->
    <script>
        const stockData = [
            { code: "9984", name: "ソフトバンクグループ", price: 5695.0, predicted: 5740.0, vol: "4,695万株", reason: "閉場中・最終気配値" },
            { code: "6920", name: "レーザーテック", price: 43330.0, predicted: 43800.0, vol: "276万株", reason: "半導体セクター引け" },
            { code: "7201", name: "日産自動車", price: 335.1, predicted: 338.0, vol: "2,893万株", reason: "引け味硬い展開" },
            { code: "6758", name: "ソニーグループ", price: 2840.0, predicted: 2865.0, vol: "1,200万株", reason: "米国動向待ち" },
            { code: "8306", name: "三菱UFJフィナンシャル", price: 1580.5, predicted: 1585.0, vol: "3,100万株", reason: "ディフェンシブ引け" },
            { code: "9434", name: "ソフトバンク (通信)", price: 228.6, predicted: 231.0, vol: "8,556万株", reason: "安定推移" }
        ];

        function switchTab(tabName) {
            ['signals', 'settings'].forEach(t => {
                document.getElementById(`tab-${t}`).classList.add('hidden');
                document.getElementById(`nav-${t}`).classList.remove('active');
            });
            document.getElementById(`tab-${tabName}`).classList.remove('hidden');
            document.getElementById(`nav-${tabName}`).classList.add('active');
        }

        function generateSvgChart(isUp) {
            let points = "0,20 10,18 20,22 30,19 40,21 50,15 60,17 70,12 80,10";
            const strokeColor = "#94a3b8"; // グレーに統一
            return `<svg class="mini-chart" viewBox="0 0 80 30"><polyline fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" points="${points}"/></svg>`;
        }

        function renderApp() {
            let htmlBuffer = "";
            stockData.forEach((item) => {
                let currentPrice = item.price;
                let predictedPrice = item.predicted;
                
                let divergence = +(predictedPrice - currentPrice).toFixed(1);
                let divPercent = +((divergence / currentPrice) * 100).toFixed(2);
                let isBullish = divergence >= 0;

                htmlBuffer += `
                    <div class="luxury-card p-4">
                        <div class="flex justify-between items-start mb-2.5">
                            <div>
                                <div class="flex items-center space-x-2">
                                    <span class="text-[10px] font-mono bg-gray-800 text-gray-300 border border-gray-700 px-2 py-0.5 rounded font-black">${item.code}</span>
                                    <span class="closed-badge text-[9px] px-2 py-0.5 rounded-full font-bold">CLOSED</span>
                                </div>
                                <h2 class="text-sm font-extrabold text-gray-200 mt-2 tracking-wide">${item.name}</h2>
                            </div>
                            <div class="text-right">
                                <span class="text-[9px] text-gray-500 block tracking-tight">終値 / 最終気配</span>
                                <p class="text-base font-mono font-black text-gray-300">¥${currentPrice.toLocaleString()}</p>
                            </div>
                        </div>

                        <div class="grid grid-cols-3 gap-2 bg-black/30 p-3 rounded-xl text-xs my-2.5 items-center border border-gray-800">
                            <div>
                                <span class="text-[9px] text-gray-500 block">理論予測値</span>
                                <span class="font-mono font-bold text-gray-300">¥${predictedPrice.toLocaleString()}</span>
                            </div>
                            <div>
                                <span class="text-[9px] text-gray-500 block">乖離幅</span>
                                <span class="font-mono font-bold text-gray-400">
                                    ${isBullish ? '+' : ''}${divergence} (${isBullish ? '+' : ''}${divPercent}%)
                                </span>
                            </div>
                            <div class="flex justify-end">
                                ${generateSvgChart(isBullish)}
                            </div>
                        </div>

                        <div class="flex justify-between items-center text-[10px] text-gray-500 pt-1">
                            <span>出来高: <strong class="text-gray-400 font-mono">${item.vol}</strong></span>
                            <span class="bg-gray-900 text-gray-400 border border-gray-800 px-2 py-0.5 rounded-md">${item.reason}</span>
                        </div>
                    </div>
                `;
            });
            document.getElementById('stock-list-container').innerHTML = htmlBuffer;
        }

        renderApp();
    </script>
</body>
</html>
