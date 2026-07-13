package net.nobukym.rtma.time;

import net.minecraft.world.WorldServer;
import net.nobukym.rtma.Rtma;
import net.nobukym.rtma.RtmaConfig;
import net.nobukym.rtma.data.PathProvider;
import net.nobukym.rtma.rail.RailDataExporter;

import java.io.File;
import java.io.IOException;

public class RtmaTimeExporter {
    /** 現在のRTMA時刻(モードに関わらず、表示用にRTMA換算した値)をtime.jsonに書き出す */
    public static void exportTime(WorldServer world) {
        RtmaCalendarData calendar = RtmaCalendarData.get(world);
        RtmaDateTime dt = calendar.getCurrentDateTime();

        RtmaTime export = RtmaTime.fromDateTime(
                RtmaConfig.timeMode.name(),
                calendar.getElapsedTicks(),
                dt);

        File outputFile = PathProvider.getTimeFile(world);
        try {
            RailDataExporter.writeToFile(RailDataExporter.toJson(export), outputFile);
        } catch (IOException e) {
            Rtma.LOGGER.error("time.jsonの書き出しに失敗しました", e);
        }
    }
}
