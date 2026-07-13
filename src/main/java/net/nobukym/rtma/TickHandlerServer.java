package net.nobukym.rtma;

import jp.ngt.rtm.rail.util.Point;
import jp.ngt.rtm.rail.util.RailMap;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.WorldServer;
import net.minecraftforge.fml.common.FMLCommonHandler;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;
import net.minecraftforge.fml.common.gameevent.TickEvent;
import net.nobukym.rtma.data.PlayerPositionExporter;
import net.nobukym.rtma.data.PathProvider;
import net.nobukym.rtma.rail.PointCollector;
import net.nobukym.rtma.rail.RailCollector;
import net.nobukym.rtma.rail.RailDataExporter;
import net.nobukym.rtma.rail.RailMapConverter;
import net.nobukym.rtma.rail.RailSegment;
import net.nobukym.rtma.time.RtmaCalendarData;
import net.nobukym.rtma.time.RtmaDateTime;
import net.nobukym.rtma.time.RtmaTime;
import net.nobukym.rtma.time.RtmaTimeExporter;
import jp.ngt.rtm.entity.train.EntityTrainBase;
import net.nobukym.rtma.train.TrainCollector;
import net.nobukym.rtma.train.TrainState;
import net.nobukym.rtma.train.TrainStateConverter;
import net.nobukym.rtma.train.TrainProbe;

import java.io.File;
import java.io.IOException;
import java.util.*;

import static net.nobukym.rtma.Rtma.MODID;

@Mod.EventBusSubscriber(modid = MODID)
public class TickHandlerServer {



    private static int tickCounter = 0;

    // どのくらいの頻度でチェックするか(20tick=1秒)
    private static final int EXPORT_INTERVAL_TICKS = 100; // 5秒ごと

    // 前回書き出した内容のハッシュ値。同じなら書き出しをスキップする
    private static long lastHash = -1;

    // isMainRoute/isActiveRouteの調査用。片渡り線・両渡り線の調査のため再度有効化
    private static final boolean DEBUG_POINTS = true;

    // 列車エンティティのAPI調査(TrainProbe)は目的の情報(EntityTrainBaseの
    // setNotch/getSpeed等)を取得済みなので終了。関連コードはtrainパッケージに残してある。

    // 列車データ(trains.json)の前回ハッシュ。railsとは別管理にする
    private static long lastTrainsHash = -1;

    // モデルパック識別調査(TrainProbe)は目的達成済みのため通常はfalseにしているが、
    // 今回はRailConfig(曲線速度制限の既存ロジック確認)のため一時的にtrueに戻す。
    private static final boolean TRAIN_MODEL_PROBE_ENABLED = true;
    private static final int TRAIN_MODEL_PROBE_DELAY_TICKS = 200; // 10秒後
    private static boolean trainModelProbeDone = false;


    @SubscribeEvent
    public static void onServerTick(TickEvent.ServerTickEvent event) {
        if (event.phase == TickEvent.Phase.END) { // phase ENDにすることでtickの実行後に実行される
            tickCounter++;
            MinecraftServer server = FMLCommonHandler.instance().getMinecraftServerInstance();
            if (server == null) return;
            // worlds[0]は配列の格納順に依存してしまうため、
            // ディメンションIDを明示してオーバーワールドを取得する
            WorldServer world = server.getWorld(0);

            // RTMAモードの間だけ、独自カレンダーを1tickずつ進める(実時間1:1)
            if (RtmaConfig.timeMode == RtmaConfig.TimeMode.RTMA) {
                RtmaCalendarData calendar = RtmaCalendarData.get(world);
                calendar.tick();
            }

            if (tickCounter % EXPORT_INTERVAL_TICKS == 0) {
                exportRails(world);
                exportTrains(world);
                PlayerPositionExporter.exportPlayerPosition(world);
                RtmaTimeExporter.exportTime(world);
            }

            if (TRAIN_MODEL_PROBE_ENABLED && !trainModelProbeDone && tickCounter >= TRAIN_MODEL_PROBE_DELAY_TICKS) {
                trainModelProbeDone = true;
                runTrainModelProbe(world);
            }

        }
    }

    /** モデルパック識別のための調査を1回だけ実行する */
    private static void runTrainModelProbe(WorldServer world) {
        TrainProbe.probeRailConfig();
    }

    /** ワールド内の全列車の状態(trains.json)を書き出す。railsと同じCRC32差分検知パターン */
    private static void exportTrains(WorldServer world) {
        List<EntityTrainBase> allTrains = TrainCollector.getAllTrains(world);

        List<TrainState> states = new ArrayList<>();
        for (EntityTrainBase train : allTrains) {
            states.add(TrainStateConverter.convert(train));
        }

        String json = RailDataExporter.toJson(states);
        long hash = RailDataExporter.computeHash(json);

        if (hash == lastTrainsHash) {
            return;
        }

        File outputFile = PathProvider.getTrainsFile(world);
        try {
            RailDataExporter.writeToFile(json, outputFile);
            lastTrainsHash = hash;
            Rtma.LOGGER.info("trains.jsonを書き出しました ({}件): {}",
                    states.size(), outputFile.getAbsolutePath());
        } catch (IOException e) {
            Rtma.LOGGER.error("trains.jsonの書き出しに失敗しました", e);
        }
    }

    private static void exportRails(WorldServer world) {
        List<RailMap> allRailMaps = RailCollector.getAllRailTileEntity(world);
        List<Point> allPoints = PointCollector.getAllPoints(world);
        Map<RailMap, List<Point>> railToPoints = PointCollector.buildRailToPointsMap(allPoints);

        if (DEBUG_POINTS && !allPoints.isEmpty()) {
            //PointCollector.debugDump(world, allRailMaps, allPoints);
        }

        List<RailSegment> segments = new ArrayList<>();
        for (RailMap rail : allRailMaps) {
            segments.add(RailMapConverter.convert(rail, world, railToPoints));
        }

        String json = RailDataExporter.toJson(segments);
        long hash = RailDataExporter.computeHash(json);


        if (hash == lastHash) {
            // 前回と内容が同じなので、ディスクへの書き出しはスキップする
            return;
        }

        File outputFile = PathProvider.getRailsFile(world);
        try {
            RailDataExporter.writeToFile(json, outputFile);
            lastHash = hash;
            Rtma.LOGGER.info("rails.jsonを書き出しました ({}件、ポイント{}件): {}",
                    segments.size(), allPoints.size(), outputFile.getAbsolutePath());
        } catch (IOException e) {
            Rtma.LOGGER.error("rails.jsonの書き出しに失敗しました", e);
        }
    }





}