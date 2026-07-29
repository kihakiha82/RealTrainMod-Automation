import { useState } from 'react';
import { saveTime } from '../../api.js';
import { Window } from '../Window.jsx';

/**
 * isServerRunning=false のときだけ表示する時刻編集パネル。
 */
export default function TimeEditPanel({ snapshot, onSaved, isServerRunning, onClose, zIndex, onFocus }) {

    // ベースとなるStateは「年・通算日・時・分・秒」のみ
    const [year,      setYear]      = useState(snapshot?.year      ?? 1);
    const [dayOfYear, setDayOfYear] = useState(snapshot?.dayOfYear ?? 1);
    const [hour,      setHour]      = useState(snapshot?.hour      ?? 0);
    const [minute,    setMinute]    = useState(snapshot?.minute    ?? 0);
    const [second,    setSecond]    = useState(snapshot?.second    ?? 0);

    const [saving,    setSaving]    = useState(false);
    const [error,     setError]     = useState(null);

    // ── カレンダー表示用の文字列(yyyy-mm-dd)を現在の year と dayOfYear から毎回生成 ──
    // ※ 1月1日を起点に dayOfYear を足すことで正確な日付が出る
    const d = new Date(Number(year), 0, Number(dayOfYear));
    const yStr = String(d.getFullYear()).padStart(4, '0');
    const mStr = String(d.getMonth() + 1).padStart(2, '0');
    const dStr = String(d.getDate()).padStart(2, '0');
    const dateString = `${yStr}-${mStr}-${dStr}`;

    // ── カレンダー(type="date")が変更された時の処理 ──
    const handleDateChange = (e) => {
        const val = e.target.value; // "yyyy-mm-dd"
        if (!val) return;

        const targetDate = new Date(val);
        const y = targetDate.getFullYear();
        const start = new Date(y, 0, 1);

        // ミリ秒差分から通算日を逆算してセットする
        const diffMs = targetDate - start;
        const newDoy = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

        // Stateを更新（これで上の数値入力欄もカレンダーも一瞬で連動する）
        setYear(y);
        setDayOfYear(newDoy);
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            // カレンダー由来のデータは既に year / dayOfYear に同期されているので、
            // そのまま Number 化して送るだけでOK
            await saveTime({
                year:      Number(year),
                dayOfYear: Number(dayOfYear),
                hour:      Number(hour),
                minute:    Number(minute),
                second:    Number(second),
            });
            onSaved?.();
        } catch (e) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSetCurrentTime = () => {
        const now = new Date();
        const y = now.getFullYear();

        // 今年の1月1日との差分から通算日を計算
        const start = new Date(y, 0, 1);
        const diffMs = now - start;
        const doy = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

        // すべてのStateを現在時刻で上書き
        setYear(y);
        setDayOfYear(doy);
        setHour(now.getHours());
        setMinute(now.getMinutes());
        setSecond(now.getSeconds());
    };

    return (
        <Window
            title="⏱ 起動前時刻の設定"
            defaultPos={{ x: 80, y: 80, width: 280, height: 320 }}
            onClose={onClose}
            zIndex={zIndex}
            onFocus={onFocus}
        >
            <div style={{ padding: '14px 16px', height: '100%', overflowY: 'auto' }}>
                <div className="time-editor__fields">

                    {/* カレンダー入力 */}
                    <label className="time-editor__field" style={{ marginBottom: 12 }}>
                        <span>日付指定</span>
                        <input
                            type="date"
                            value={dateString}
                            min="0001-01-01"
                            max="9999-12-31"
                            onChange={handleDateChange}
                        />
                    </label>

                    <label className="time-editor__field">
                        <span>時</span>
                        <input type="number" min="0" max="23" value={hour}
                               onChange={e => setHour(e.target.value)} />
                    </label>
                    <label className="time-editor__field">
                        <span>分</span>
                        <input type="number" min="0" max="59" value={minute}
                               onChange={e => setMinute(e.target.value)} />
                    </label>
                    <label className="time-editor__field">
                        <span>秒</span>
                        <input type="number" min="0" max="59" value={second}
                               onChange={e => setSecond(e.target.value)} />
                    </label>

                    <div>
                        <button
                            onClick={handleSetCurrentTime}
                            className="time-editor__btn"
                        >
                            現在時刻
                        </button>
                    </div>

                </div>

                {error && <div className="time-editor__error">{error}</div>}

                {!isServerRunning ? (
                    <button className="time-editor__btn" onClick={handleSave} disabled={saving} style={{ marginTop: 16 }}>
                        {saving ? '保存中...' : '次回起動時の時刻として保存'}
                    </button>
                ) : (
                    <div style={{ color: "var(--red)", marginTop: 16, fontSize: '0.9em' }}>
                        現在起動前時刻の変更はできません。
                    </div>
                )}

                <div className="time-editor__note">
                    Minecraftを起動すると、この時刻から進行を再開します。
                </div>
            </div>
        </Window>
    );
}