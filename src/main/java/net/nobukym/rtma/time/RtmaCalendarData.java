package net.nobukym.rtma.time;

import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.world.World;
import net.minecraft.world.storage.MapStorage;
import net.minecraft.world.storage.WorldSavedData;

public class RtmaCalendarData extends WorldSavedData {

    private static final String DATA_NAME = "rtma_calendar";

    /** 経過Tick数（唯一の時間管理データ） */
    private long elapsedTicks = 0;

    public RtmaCalendarData(String name) {
        super(name);
    }

    @Override
    public void readFromNBT(NBTTagCompound nbt) {
        elapsedTicks = nbt.getLong("elapsedTicks");
    }

    @Override
    public NBTTagCompound writeToNBT(NBTTagCompound compound) {
        compound.setLong("elapsedTicks", elapsedTicks);
        return compound;
    }

    public static RtmaCalendarData get(World world) {
        MapStorage storage = world.getMapStorage();
        RtmaCalendarData instance =
                (RtmaCalendarData) storage.getOrLoadData(RtmaCalendarData.class, DATA_NAME);

        if (instance == null) {
            instance = new RtmaCalendarData(DATA_NAME);
            storage.setData(DATA_NAME, instance);
        }

        return instance;
    }

    //========================================================
    // API
    //========================================================

    /** 現在の経過Tick数 */
    public long getElapsedTicks() {
        return elapsedTicks;
    }

    /** 経過Tick数を直接設定 */
    public void setElapsedTicks(long ticks) {
        this.elapsedTicks = Math.max(0, ticks);
        markDirty();
    }

    /** 1Tick進める */
    public void tick() {
        addTicks(1);
    }

    public void addTicks(long ticks) {
        if (ticks == 0) {
            return;
        }

        setElapsedTicks(elapsedTicks + ticks);
    }

    /** 秒加算 */
    public void addSeconds(long seconds) {
        setElapsedTicks(elapsedTicks + seconds * RtmaDateTime.TICKS_PER_SECOND);
    }

    /** 分加算 */
    public void addMinutes(long minutes) {
        setElapsedTicks(elapsedTicks + minutes * RtmaDateTime.TICKS_PER_MINUTE);
    }

    /** 時間加算 */
    public void addHours(long hours) {
        setElapsedTicks(elapsedTicks + hours * RtmaDateTime.TICKS_PER_HOUR);
    }

    /** 日加算 */
    public void addDays(long days) {
        setElapsedTicks(elapsedTicks + days * RtmaDateTime.TICKS_PER_DAY);
    }

    /** 現在日時取得 */
    public RtmaDateTime getCurrentDateTime() {
        return RtmaDateTime.fromTicks(elapsedTicks);
    }

    /** 指定日時へワープ */
    //time.json読み込み時初期化にもつかう
    public void setDateTime(long year,
                                   int dayOfYear,
                                   int hour,
                                   int minute,
                                   int second) {

        setElapsedTicks(
                RtmaDateTime.toTicks(
                        year,
                        dayOfYear,
                        hour,
                        minute,
                        second
                )
        );
    }


}