# RTMA Web

RTMA(RealTrainMod Automation Mod)が書き出すレールデータ(`rails.json`)・
時刻表データ(`timetables/*.json`)を表示・編集するWebアプリ。

**Minecraft本体・Forge Modとは完全に独立したプロジェクト**です。
Minecraftを起動していなくても、このアプリ単体で時刻表の閲覧・編集ができます。

## 構成

```
rtma-web/
├── server/
│   └── server.js        # APIサーバー(Express)。/api/rails, /api/timetables/:name
├── client/               # フロントエンド(Vite + React)
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── api.js
│       ├── components/
│       │   └── Map2D.jsx        # 2D地図のReactラッパー
│       └── mapEngine/
│           └── map2dController.js  # 実際のcanvas描画ロジック(ドラッグ/ズーム/グリッド)
├── sample-data/
│   └── rails.json        # 動作確認用のダミーデータ
└── package.json           # APIサーバー側の依存(express)
```

## 開発時の起動方法(2つのプロセスを動かす)

ターミナル1: APIサーバー

```bash
npm install
npm start
```

ターミナル2: フロントエンド(Vite開発サーバー、ホットリロード付き)

```bash
cd client
npm install
npm run dev
```

ブラウザで `http://localhost:5173` を開いてください
(Viteの開発サーバーが `/api/*` をAPIサーバー(4500番)にプロキシします)。

## 本番運用時(1プロセスで動かす)

フロントエンドをビルドしてから、APIサーバーだけ起動すれば、
1つのプロセス・1つのポートでUIとAPIの両方が動きます。

```bash
cd client
npm run build
cd ..
npm start
```

`http://localhost:4500` を開いてください。

## 実際のワールドデータを見る

`RTMA_DATA_DIR` 環境変数で、Modが書き出している
`saves/<ワールド名>/rtma/` フォルダの絶対パスを指定します(APIサーバー側)。

```bash
# 例 (Windows)
set RTMA_DATA_DIR=C:\Users\you\AppData\Roaming\.minecraft\saves\YourWorld\rtma
npm start

# 例 (macOS/Linux)
RTMA_DATA_DIR=/home/you/.minecraft/saves/YourWorld/rtma npm start
```

## 操作方法(2D地図)

- **左クリックドラッグ**: パン(移動)
- **マウスホイール**: カーソル位置を中心にズーム
- **⟳ 全体表示ボタン**: 現在のデータ全体が収まるように視点をリセット

グリッドは1,2,4,8,16(1チャンク),32,64...ブロックの間隔から、ズームレベルに
応じて自動的に見やすい間隔を選びます。ズームアウトを続けるとさらに広い間隔
まで拡張されます。チャンク境界(16ブロックごと)の線は少し強調して表示されます。
上端にX軸、左端にZ軸の座標ルーラーが付いています。

## データの流れ

```
Mod(Forge)  --書き出し-->  rails.json         --読み込み-->  Web(このアプリ)
Web(このアプリ)  --保存-->  timetables/*.json  --読み込み-->  Mod(Forge、実行時)
```

この分離により、時刻表編集はMinecraftを終了していても継続して行えます。

## 今後の予定

- ポイントのアニメーション中(movementが0/1以外)の見た目の表現
- 列車の現在位置表示(Mod側がtrains.jsonを書き出すようになったら)
- 時刻表エディタのUI(Reactコンポーネントとして追加。APIは用意済み)
- 3Dレンダラー(`react-three-fiber`で`components/Map3D.jsx`を追加する想定)
