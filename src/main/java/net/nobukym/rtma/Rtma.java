package net.nobukym.rtma;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.WorldServer;
import net.minecraftforge.common.config.Config;
import net.minecraftforge.common.config.ConfigManager;
import net.minecraftforge.fml.common.FMLCommonHandler;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.event.FMLPreInitializationEvent;
import net.minecraftforge.fml.common.event.FMLServerStartedEvent;
import net.minecraftforge.fml.common.event.FMLServerStoppingEvent;
import net.minecraftforge.fml.common.network.NetworkRegistry;
import net.nobukym.rtma.data.PathProvider;
import net.nobukym.rtma.data.PlayerPositionExporter;
import net.nobukym.rtma.time.RtmaCalendarData;
import net.nobukym.rtma.time.RtmaDateTime;
import net.nobukym.rtma.train.TrainSpecExporter;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

/**
 * RealTrainMod Automation (rtma) のエントリーポイント。
 * RealTrainMod本体の線路情報を読み取り専用で取得し、
 * 列車の速度・到達予想時間などの計算基盤を提供する。
 */
@Mod(modid = Rtma.MODID, name = Rtma.NAME, version = Rtma.VERSION, acceptableRemoteVersions = "*")
public class Rtma {

    public static final String MODID = "rtma";
    public static final String NAME = "RealTrainMod Automation";
    public static final String VERSION = "1.0.0";

    public static final Logger LOGGER = LogManager.getLogger(MODID);

    @Mod.Instance(MODID)
    public static Rtma INSTANCE;

    @Mod.EventHandler
    public void preInit(FMLPreInitializationEvent event) {
        // RtmaConfig(@Config)を読み込む。これにより設定ファイル(config/rtma.cfg)への
        // 永続化と、MOD一覧画面の「Config」ボタンからのゲーム内設定GUIが有効になる。
        ConfigManager.sync(MODID, Config.Type.INSTANCE);

    }

    static boolean isServerRunning = false;



    @Mod.EventHandler
    public void onServerStarted(FMLServerStartedEvent event) {
        MinecraftServer server = FMLCommonHandler.instance().getMinecraftServerInstance();
        WorldServer world = server.getWorld(0);
        isServerRunning = true;
        PlayerPositionExporter.exportPlayerPosition(world);

        // モデルパックの読み込みはマイクラ起動時の1回だけなので、
        // 車両性能データ(trainspecs.json)もここで1回だけ書き出す。
        TrainSpecExporter.exportAllModelPacks(world);

        if (RtmaConfig.timeMode != RtmaConfig.TimeMode.RTMA) {
            return; // バニラモードでは不要
        }



        File timeFile = PathProvider.getTimeFile(world);
        if (!timeFile.exists()) {
            LOGGER.info("[RTMA] time.jsonが見つかりません。前回のセーブデータから続行します。");
            return;
        }

        try {
            String json = new String(Files.readAllBytes(timeFile.toPath()), StandardCharsets.UTF_8);
            JsonObject obj = new JsonParser().parse(json).getAsJsonObject();

            long year      = obj.has("year")      ? obj.get("year").getAsLong()  : 1;
            int dayOfYear  = obj.has("dayOfYear") ? obj.get("dayOfYear").getAsInt() : 1;
            int hour       = obj.has("hour")      ? obj.get("hour").getAsInt()   : 0;
            int minute     = obj.has("minute")    ? obj.get("minute").getAsInt() : 0;
            int second     = obj.has("second")    ? obj.get("second").getAsInt() : 0;

            long ticks = RtmaDateTime.toTicks(year, dayOfYear, hour, minute, second);

            RtmaCalendarData calendar = RtmaCalendarData.get(world);

            calendar.setDateTime(
                    year,
                    dayOfYear,
                    hour,
                    minute,
                    second
            );

            LOGGER.info("[RTMA] time.jsonから時刻を復元しました: Year{} Day{} {:02d}:{:02d}:{:02d} ({} ticks)",
                    year, dayOfYear, hour, minute, second, ticks);

        } catch (IOException | RuntimeException e) {
            LOGGER.error("[RTMA] time.jsonの読み込みに失敗しました。前回のセーブデータから続行します。", e);
        }
    }

    @Mod.EventHandler
    public void onServerStopping(FMLServerStoppingEvent event) {
        MinecraftServer server = FMLCommonHandler.instance().getMinecraftServerInstance();
        WorldServer world = server.getWorld(0);
        isServerRunning = false;
        PlayerPositionExporter.exportPlayerPosition(world);

    }

    public static boolean getServerRunning(){
        return isServerRunning;
    }

}
