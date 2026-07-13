package net.nobukym.rtma.time;

/**
 * Web側に現在のRTMA時刻を伝えるためのtime.json書き出し用データ。
 */
public class RtmaTime {
    public String mode; // "VANILLA" or "RTMA"
    public long elapsedTicks; // Web側でのクライアントサイド補間(滑らかな表示)用に生の値も渡す
    public long year;
    public int dayOfYear;
    public int hour;
    public int minute;
    public int second;

    public static RtmaTime fromDateTime(String mode, long elapsedTicks, RtmaDateTime dt) {
        RtmaTime export = new RtmaTime();
        export.mode = mode;
        export.elapsedTicks = elapsedTicks;
        export.year = dt.year;
        export.dayOfYear = dt.dayOfYear;
        export.hour = dt.hour;
        export.minute = dt.minute;
        export.second = dt.second;
        return export;
    }
}