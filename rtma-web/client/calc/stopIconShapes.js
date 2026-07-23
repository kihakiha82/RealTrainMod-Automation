/**
 * 停車位置(StopVariant)アイコンの共通定義。
 * サーバー側(server.js、バリデーション用)がrequire()するCommonJS版。
 *
 * 【重要】client/src/iconShapes.js に、これと同じ内容のESM版(ブラウザ/React側で
 * importするため)が複製として存在する。calc/package.json が
 * "type": "commonjs" を明示しているため、ここに `export` 構文を書くと
 * server.jsのrequire()が壊れてしまう(calc/railGraph.jsで実際に踏んだ問題と同じ)。
 * 内容を変更する場合は、必ず両方のファイルに同じ変更を反映すること。
 *
 * 実装上の工夫: これらは全て標準Unicode文字なので、canvas描画側は
 * ctx.fillText(symbol, x, y) するだけでよく、円・四角・三角・ひし形を
 * 個別にパス描画するコードを書く必要がない(色はctx.fillStyleで指定できる)。
 */

const STOP_ICON_SHAPES = [
  { id: 'circle-filled', symbol: '●', name: '塗りつぶし丸' },
  { id: 'circle', symbol: '○', name: '丸(枠のみ)' },
  { id: 'square-filled', symbol: '■', name: '塗りつぶし四角' },
  { id: 'square', symbol: '□', name: '四角(枠のみ)' },
  { id: 'diamond', symbol: '◇', name: 'ひし形(枠のみ)' },
  { id: 'triangle-right-filled', symbol: '▶', name: '塗りつぶし三角(右向き)' },
  { id: 'triangle-right', symbol: '▷', name: '三角(右向き・枠のみ)' },
  { id: 'triangle-left-filled', symbol: '◀', name: '塗りつぶし三角(左向き)' },
  { id: 'triangle-left', symbol: '◁', name: '三角(左向き・枠のみ)' },
];

const DEFAULT_STOP_ICON_ID = 'circle-filled';

const STOP_ICON_IDS = STOP_ICON_SHAPES.map((s) => s.id);

function findStopIcon(id) {
  return STOP_ICON_SHAPES.find((s) => s.id === id) ?? STOP_ICON_SHAPES[0];
}

// server.js用(CommonJS)
module.exports = { STOP_ICON_SHAPES, DEFAULT_STOP_ICON_ID, STOP_ICON_IDS, findStopIcon };
