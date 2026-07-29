import { useState } from 'react';
import { saveTime } from '../../api.js';

/**
 * isServerRunning=false のときだけ表示する時刻編集パネル。
 * 年・通算日・時・分・秒を指定してtime.jsonに書き込む。
 * 次回Minecraft起動時にこの値が読み込まれてRtmaCalendarDataが初期化される。
 *
 * props:
 *   snapshot: 現在のtimeSnapshot({ year, dayOfYear, hour, minute, second })
 *   onSaved: 保存成功後のコールバック(timeSnapshotの再取得などに使う)
 */

import { Window } from '../Window.jsx'; // ◀︎ 追加

/**
 * isServerRunning=false のときだけ表示する時刻編集パネル。
 */
export default function TimeEditPanel({ snapshot, onSaved ,isServerRunning ,onClose, zIndex, onFocus }) {

    const [year,      setYear]      = useState(snapshot?.year      ?? 1);
    const [dayOfYear, setDayOfYear] = useState(snapshot?.dayOfYear ?? 1);
    const [hour,      setHour]      = useState(snapshot?.hour      ?? 0);
    const [minute,    setMinute]    = useState(snapshot?.minute    ?? 0);
    const [second,    setSecond]    = useState(snapshot?.second    ?? 0);
    const [saving,    setSaving]    = useState(false);
    const [error,     setError]     = useState(null);


    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
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


    return (
        <Window
            title="⏱ 起動前時刻の設定"
            defaultPos={{ x: 80, y: 80, width: 280, height: 320 }}
            onClose={onClose}
            zIndex={zIndex}
            onFocus={onFocus}

        >
            {/* ウィンドウ内コンテンツ (スクロールと余白の設定) */}
            <div style={{ padding: '14px 16px', height: '100%', overflowY: 'auto' }}>
                <div className="time-editor__fields">
                    <label className="time-editor__field">
                        <span>年</span>
                        <input type="number" min="1" value={year}
                               onChange={e => setYear(e.target.value)} />
                    </label>
                    <label className="time-editor__field">
                        <span>通算日</span>
                        <input type="number" min="1" max="365" value={dayOfYear}
                               onChange={e => setDayOfYear(e.target.value)} />
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
                </div>
                {error && <div className="time-editor__error">{error}</div>}
                {isServerRunning ? (
                <button className="time-editor__btn" onClick={handleSave} disabled={saving}>
                    {saving ? '保存中...' : '次回起動時の時刻として保存'}
                </button>
                ) : (
                    <label style={{color: "var(--red)"}}>
                    現在起動前時刻の変更はできません。
                    </label>
                    )}
                <div className="time-editor__note">
                    Minecraftを起動すると、この時刻から進行を再開します。
                </div>
            </div>
        </Window>
    );
}