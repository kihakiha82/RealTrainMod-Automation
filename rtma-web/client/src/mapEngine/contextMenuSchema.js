/**
 * レール右クリックメニューの中身を定義するスキーマ。
 *
 * ここにデータとして項目を足すだけでメニューが増える設計にしている
 * (ContextMenu.jsx側は汎用的な再帰描画ロジックのみを持ち、項目の中身は一切知らない)。
 *
 * 各項目の形:
 *   { id: string, label: string }                    … 実行可能な末端項目
 *   { id: string, label: string, children: [...] }   … サブメニューを持つ項目(クリックでは実行されない)
 *
 * idはonContextMenuAction(id, targetIds)に渡され、実際の処理内容はApp.jsx側で振り分ける想定。
 * (現時点では機能未実装のため、App.jsx側はプレースホルダーの処理のみ)
 *
 * 将来項目を追加する場合は、このファイルに項目を足すだけでよい。
 * 例: 「速度制限を設定」「レールを削除」などを足す場合は、この配列にオブジェクトを追加する。
 */
export const RAIL_CONTEXT_MENU_SCHEMA = [
  {
    id: 'simple-operation',
    label: '簡易運行',
    children: [
      { id: 'simple-operation:set-start-point', label: '始点を設定' },
      { id: 'simple-operation:set-middle-point', label: '中間点を設定' },
      { id: 'simple-operation:set-end-point', label: '終点を設定' },
      { id: 'simple-operation:edit-point', label: '点の編集' },
    ],
  },
  { id: 'show-rail-info', label: 'レール情報の表示' },
];
