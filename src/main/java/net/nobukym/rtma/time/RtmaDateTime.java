package net.nobukym.rtma.time;

import java.time.LocalDate;
import java.time.Month;
import java.time.Year;

import static com.ibm.icu.impl.Grego.isLeapYear;

/**
 * RTMA独自カレンダーの、tick数 <-> 年・日・時・分・秒 の相互変換。
 *
 * 実時間1:1ペース(20tick=1秒)を基準にしている:
 *   1秒  = 20tick
 *   1分  = 1200tick
 *   1時間 = 72000tick
 *   1日(24時間) = 1,728,000tick
 *   1年 = 365日
 *
 * 年は1から、日(dayOfYear)は1〜365で表す。
 */
public final class RtmaDateTime {

    public static final long TICKS_PER_SECOND = 20;
    public static final long TICKS_PER_MINUTE = TICKS_PER_SECOND * 60;
    public static final long TICKS_PER_HOUR = TICKS_PER_MINUTE * 60;
    public static final long TICKS_PER_DAY = TICKS_PER_HOUR * 24;
    public static final int DAYS_PER_YEAR = 365;

    public long year;
    public int dayOfYear; // 1〜365
    public int hour;      // 0〜23
    public int minute;    // 0〜59
    public int second;    // 0〜59

    private RtmaDateTime(long year, int dayOfYear, int hour, int minute, int second) {
        this.year = year;
        this.dayOfYear = dayOfYear;
        this.hour = hour;
        this.minute = minute;
        this.second = second;
    }

    /** 経過tick数(0始まり)から、現在の年月日時分秒を算出する */
    public static RtmaDateTime fromTicks(long elapsedTicks) {
        long totalSeconds = elapsedTicks / TICKS_PER_SECOND;

        int second = (int) (totalSeconds % 60);
        long totalMinutes = totalSeconds / 60;

        int minute = (int) (totalMinutes % 60);
        long totalHours = totalMinutes / 60;

        int hour = (int) (totalHours % 24);
        long totalDays = totalHours / 24;

        int dayOfYear = (int) (totalDays % DAYS_PER_YEAR) + 1;
        long year = totalDays / DAYS_PER_YEAR + 1;

        return new RtmaDateTime(year, dayOfYear, hour, minute, second);
    }

    /**
     * 年・日・時・分・秒から経過tick数を逆算する。
     * ワープ機能(任意の日時にジャンプする)で使う想定。
     */
    public static long toTicks(long year, int dayOfYear, int hour, int minute, int second) {
        long totalDays = (year - 1) * DAYS_PER_YEAR + (dayOfYear - 1);
        long totalHours = totalDays * 24 + hour;
        long totalMinutes = totalHours * 60 + minute;
        long totalSeconds = totalMinutes * 60 + second;
        return totalSeconds * TICKS_PER_SECOND;
    }

    public static int toMonth(long year, int dayOfYear) {
        LocalDate date = LocalDate.ofYearDay((int) year, dayOfYear);
        Month month = date.getMonth();
        return month.getValue();
    }
    //曜日
    public static String toDayOfWeek(long year, int dayOfYear) {
        LocalDate date = LocalDate.ofYearDay((int) year, dayOfYear);
        return date.getDayOfWeek().name();
    }
    //日付
    public static int toDayOfMonth(long year, int dayOfYear) {
        LocalDate date = LocalDate.ofYearDay((int) year, dayOfYear);
        return date.getDayOfMonth();
    }
    //逆変換
    public static int toDayOfYear(int year, int month, int dayOfMonth) {

        if (month < 1 || month > 12) {
            throw new IllegalArgumentException("month: " + month);
        }

        int maxDay = getDaysInMonth(year, month);

        if (dayOfMonth < 1 || dayOfMonth > maxDay) {
            throw new IllegalArgumentException("day: " + dayOfMonth);
        }

        int dayOfYear = 0;

        for (int m = 1; m < month; m++) {
            dayOfYear += getDaysInMonth(year, m);
        }

        return dayOfYear + dayOfMonth;
    }

    public static int getDaysInMonth(int year, int month) {

        switch (month) {
            case 1:  return 31;
            case 2:  return Year.isLeap(year) ? 29 : 28;
            case 3:  return 31;
            case 4:  return 30;
            case 5:  return 31;
            case 6:  return 30;
            case 7:  return 31;
            case 8:  return 31;
            case 9:  return 30;
            case 10: return 31;
            case 11: return 30;
            case 12: return 31;
            default:
                throw new IllegalArgumentException("Invalid month: " + month);
        }
    }

    @Override
    public String toString() {
        return String.format("Year %d, Day %d, %02d:%02d:%02d", year, dayOfYear, hour, minute, second);
    }

    public void setDateTime(long year, int dayOfYear, int hour, int minute, int second) {
        this.year = year;
        this.dayOfYear = dayOfYear;
        this.hour = hour;
        this.minute = minute;
        this.second = second;
    }

    public long getYear() {
        return year;
    }

    public int getDayOfYear() {
        return dayOfYear;
    }

    public int getHour() {
        return hour;
    }

    public int getMinute() {
        return minute;
    }

    public int getSecond() {
        return second;
    }

    @Override
    public boolean equals(Object obj) {

        if (this == obj) {
            return true;
        }

        if (!(obj instanceof RtmaDateTime)) {
            return false;
        }

        RtmaDateTime other = (RtmaDateTime) obj;

        return year == other.year
                && dayOfYear == other.dayOfYear
                && hour == other.hour
                && minute == other.minute
                && second == other.second;
    }
}