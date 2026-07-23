import { STOP_ICON_SHAPES } from '../iconShapes';

/**
 * 停車位置アイコンの選択UI。9種類のアイコンをボタンとして横並びで表示し、
 * 選択中のものをハイライトする。ホバー時はnative title属性で名称を表示する
 * (「アイコンにマウスカーソルをオーバーレイすると名称を表示」の要件)。
 *
 * iconShapes.js(STOP_ICON_SHAPES)を唯一の真実源として使うので、
 * 他の編集画面(将来的な停車位置以外の用途も含め)でもこのコンポーネントを
 * そのまま呼び出せる。
 *
 * props:
 *   value: string(選択中のicon id)
 *   onChange: (id: string) => void
 *   color: string(アイコンの表示色。省略時は現在のテキスト色を使う)
 */
export default function IconPicker({ value, onChange, color }) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {STOP_ICON_SHAPES.map((shape) => (
        <button
          key={shape.id}
          type="button"
          title={shape.name}
          onClick={() => onChange(shape.id)}
          style={{
            width: 26,
            height: 26,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            lineHeight: 1,
            padding: 0,
            borderRadius: 4,
            border: value === shape.id ? '2px solid var(--amber)' : '1px solid var(--line)',
            background: value === shape.id ? 'rgba(255,183,0,0.15)' : 'transparent',
            color: color || 'inherit',
            cursor: 'pointer',
          }}
        >
          {shape.symbol}
        </button>
      ))}
    </div>
  );
}
