package net.nobukym.rtma.gui;

import net.minecraft.client.gui.FontRenderer;
import net.minecraft.client.gui.Gui;
import net.nobukym.rtma.time.RtmaDateTime;

import java.time.LocalDate;

/**
 * 月表示のカレンダーグリッド。
 *
 * GuiGWatch内に埋め込んで使う想定の、テクスチャを使わないシンプルな
 * 自前描画ウィジェット。前月/次月ボタンと、日付セルのクリック選択を提供する。
 */
public class CalendarGrid {

    private static final int CELL_SIZE = 12;
    private static final int GRID_COLS = 7;
    private static final int GRID_ROWS = 6;

    private static final String[] WEEKDAY_LABELS = {"日", "月", "火", "水", "木", "金", "土"};

    private static final int COLOR_SUNDAY = 0xFF5555;
    private static final int COLOR_SATURDAY = 0x5555FF;
    private static final int COLOR_NORMAL = 0x0D0D0D;
    private static final int COLOR_TEXT_DAY = 0x0D0D0D;
    private static final int COLOR_TEXT_SELECTED = 0xFFFFFF;
    private static final int COLOR_CELL_SELECTED = 0xFF6699FF;
    private static final int COLOR_CELL_HOVER = 0x66FFFFFF;

    private final int x;
    private final int y;

    /** 現在グリッドが表示している年月(選択確定した日付とは別) */
    private long viewYear;
    private int viewMonth; // 1〜12

    /** 選択中の日(その月の中での日にち)。未選択時は-1 */
    private int selectedDay;

    public CalendarGrid(int x, int y, long initialYear, int initialMonth, int initialDay) {
        this.x = x;
        this.y = y;
        this.viewYear = initialYear;
        this.viewMonth = initialMonth;
        this.selectedDay = initialDay;
    }

    /** 表示月と選択日をまとめて設定する(GUIを開き直した際などに使用) */
    public void setSelected(long year, int month, int day) {
        this.viewYear = year;
        this.viewMonth = month;
        this.selectedDay = day;
    }

    public long getViewYear() {
        return viewYear;
    }

    public int getViewMonth() {
        return viewMonth;
    }

    public void prevMonth() {
        viewMonth--;
        if (viewMonth < 1) {
            viewMonth = 12;
            viewYear--;
            if (viewYear < 1) {
                viewYear = 1;
            }
        }
        // 前月に日数が足りない場合は月末日に丸める
        selectedDay = Math.min(selectedDay, RtmaDateTime.getDaysInMonth((int) viewYear, viewMonth));
    }

    public void nextMonth() {
        viewMonth++;
        if (viewMonth > 12) {
            viewMonth = 1;
            viewYear++;
        }
        selectedDay = Math.min(selectedDay, RtmaDateTime.getDaysInMonth((int) viewYear, viewMonth));
    }

    /** その月の1日の曜日インデックス(日曜=0〜土曜=6)を返す */
    private int firstDayOfWeekIndex() {
        LocalDate first = LocalDate.of((int) viewYear, viewMonth, 1);
        int isoValue = first.getDayOfWeek().getValue(); // 月=1 〜 日=7
        return isoValue % 7; // 日=0, 月=1, ..., 土=6
    }

    public void draw(FontRenderer fontRenderer, int mouseX, int mouseY) {

        int headerY = y;

        String header = String.format("%04d/%02d", viewYear, viewMonth);
        int gridWidth = GRID_COLS * CELL_SIZE;
        int headerWidth = fontRenderer.getStringWidth(header);
        fontRenderer.drawString(header, x + (gridWidth - headerWidth) / 2, headerY, COLOR_NORMAL);

        // 前月「<」
        boolean prevHover = isInBounds(mouseX, mouseY, x, headerY, 8, 8);
        fontRenderer.drawString("<", x, headerY, prevHover ? 0xFFFFFF : COLOR_NORMAL);

        // 次月「>」
        int nextX = x + gridWidth - 6;
        boolean nextHover = isInBounds(mouseX, mouseY, nextX, headerY, 8, 8);
        fontRenderer.drawString(">", nextX, headerY, nextHover ? 0xFFFFFF : COLOR_NORMAL);

        int weekdayY = headerY + 10;

        for (int col = 0; col < GRID_COLS; col++) {
            String label = WEEKDAY_LABELS[col];
            int labelWidth = fontRenderer.getStringWidth(label);
            int labelX = x + col * CELL_SIZE + (CELL_SIZE - labelWidth) / 2;
            int color = (col == 0) ? COLOR_SUNDAY : (col == 6 ? COLOR_SATURDAY : COLOR_NORMAL);
            fontRenderer.drawString(label, labelX, weekdayY, color);
        }

        int daysTop = weekdayY + 10;
        int firstOffset = firstDayOfWeekIndex();
        int daysInMonth = RtmaDateTime.getDaysInMonth((int) viewYear, viewMonth);

        int day = 1;
        for (int row = 0; row < GRID_ROWS && day <= daysInMonth; row++) {
            for (int col = 0; col < GRID_COLS; col++) {
                int cellIndex = row * GRID_COLS + col;
                if (cellIndex < firstOffset) {
                    continue;
                }
                if (day > daysInMonth) {
                    break;
                }

                int cellX = x + col * CELL_SIZE;
                int cellY = daysTop + row * CELL_SIZE;

                boolean isSelected = (day == selectedDay);
                boolean hover = isInBounds(mouseX, mouseY, cellX, cellY, CELL_SIZE, CELL_SIZE);

                if (isSelected) {
                    Gui.drawRect(cellX, cellY, cellX + CELL_SIZE - 1, cellY + CELL_SIZE - 1, COLOR_CELL_SELECTED);
                } else if (hover) {
                    Gui.drawRect(cellX, cellY, cellX + CELL_SIZE - 1, cellY + CELL_SIZE - 1, COLOR_CELL_HOVER);
                }

                String dayStr = String.valueOf(day);
                int textX = cellX + (CELL_SIZE - fontRenderer.getStringWidth(dayStr)) / 2;
                int textY = cellY + (CELL_SIZE - fontRenderer.FONT_HEIGHT) / 2;
                fontRenderer.drawString(dayStr, textX, textY, isSelected ? COLOR_TEXT_SELECTED : COLOR_TEXT_DAY);

                day++;
            }
        }
    }

    /**
     * クリック処理。
     *
     * @return 日付セルがクリックされた場合はその日(1〜31)を返す。
     *         前月/次月ボタンやグリッド外のクリックの場合は-1を返す。
     */
    public int mouseClicked(int mouseX, int mouseY) {

        int headerY = y;
        int gridWidth = GRID_COLS * CELL_SIZE;

        if (isInBounds(mouseX, mouseY, x, headerY, 8, 8)) {
            prevMonth();
            return -1;
        }

        int nextX = x + gridWidth - 6;
        if (isInBounds(mouseX, mouseY, nextX, headerY, 8, 8)) {
            nextMonth();
            return -1;
        }

        int weekdayY = headerY + 10;
        int daysTop = weekdayY + 10;
        int firstOffset = firstDayOfWeekIndex();
        int daysInMonth = RtmaDateTime.getDaysInMonth((int) viewYear, viewMonth);

        int day = 1;
        for (int row = 0; row < GRID_ROWS && day <= daysInMonth; row++) {
            for (int col = 0; col < GRID_COLS; col++) {
                int cellIndex = row * GRID_COLS + col;
                if (cellIndex < firstOffset) {
                    continue;
                }
                if (day > daysInMonth) {
                    break;
                }

                int cellX = x + col * CELL_SIZE;
                int cellY = daysTop + row * CELL_SIZE;

                if (isInBounds(mouseX, mouseY, cellX, cellY, CELL_SIZE, CELL_SIZE)) {
                    selectedDay = day;
                    return day;
                }

                day++;
            }
        }

        return -1;
    }

    /** グリッド全体の高さ(px)。GUI側でのレイアウト計算に使う */
    public static int totalHeight() {
        // ヘッダー(10) + 曜日ラベル(10) + 日付6行分
        return 10 + 10 + GRID_ROWS * CELL_SIZE;
    }

    /** グリッド全体の幅(px) */
    public static int totalWidth() {
        return GRID_COLS * CELL_SIZE;
    }

    private boolean isInBounds(int mouseX, int mouseY, int rectX, int rectY, int w, int h) {
        return mouseX >= rectX && mouseX < rectX + w && mouseY >= rectY && mouseY < rectY + h;
    }
}
