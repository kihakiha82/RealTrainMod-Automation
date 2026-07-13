package net.nobukym.rtma.train;

import jp.ngt.rtm.RTMResource;
import jp.ngt.rtm.modelpack.ModelPackManager;
import jp.ngt.rtm.modelpack.ResourceType;
import jp.ngt.rtm.modelpack.cfg.VehicleBaseConfig;
import jp.ngt.rtm.modelpack.modelset.ModelSetVehicleBase;
import net.minecraft.world.WorldServer;
import net.nobukym.rtma.Rtma;
import net.nobukym.rtma.data.PathProvider;
import net.nobukym.rtma.rail.RailDataExporter;

import java.io.File;
import java.io.IOException;
import java.lang.reflect.Method;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * サーバー起動時に一度だけ、読み込み済み全モデルパックの列車性能データ(trainspecs.json)を
 * 書き出すクラス。
 *
 * モデルパックの読み込みはマイクラ起動時の1回だけであり、ワールド内に実際に
 * スポーンしている列車から逆算する必要はないため、
 * ModelPackManager.getModelList(ResourceType) で登録済み全モデル名を直接列挙する。
 */
public final class TrainSpecExporter {

    private static final ResourceType[] TRAIN_TYPES = {
            RTMResource.TRAIN_DC,
            RTMResource.TRAIN_EC,
            RTMResource.TRAIN_CC,
            RTMResource.TRAIN_TC,
            RTMResource.TRAIN_TEST,
    };

    private TrainSpecExporter() {}

    /** サーバー起動時に1回だけ呼ぶ想定。差分検知はせず毎回上書きする(1回しか呼ばれないため) */
    public static void exportAllModelPacks(WorldServer world) {
        Set<String> resourceNames = collectAllResourceNames();
        Rtma.LOGGER.info("[TrainSpecExporter] 登録済み列車モデル数: {} ({})",
                resourceNames.size(), resourceNames);

        Map<String, TrainSpec> specs = TrainSpecLoader.loadAll(resourceNames);

        String json = RailDataExporter.toJson(specs);
        File outputFile = PathProvider.getTrainSpecsFile(world);
        try {
            RailDataExporter.writeToFile(json, outputFile);
            Rtma.LOGGER.info("trainspecs.jsonを書き出しました ({}件): {}",
                    specs.size(), outputFile.getAbsolutePath());
        } catch (IOException e) {
            Rtma.LOGGER.error("trainspecs.jsonの書き出しに失敗しました", e);
        }
    }

    /** RTMResourceのTRAIN_*全種類について、登録済みモデル名を集めて重複排除する */
    private static Set<String> collectAllResourceNames() {
        Set<String> resourceNames = new HashSet<>();

        for (ResourceType type : TRAIN_TYPES) {
            try {
                List<?> modelList = ModelPackManager.INSTANCE.getModelList(type);
                if (modelList == null) continue;

                for (Object item : modelList) {
                    String name = extractName(item);
                    if (name != null) {
                        resourceNames.add(name);
                    }
                }
            } catch (Exception e) {
                Rtma.LOGGER.error("[TrainSpecExporter] getModelList({})の取得に失敗しました", type, e);
            }
        }

        return resourceNames;
    }

    /**
     * getModelList()の要素はResourceSet(実体はModelSetTrain等)であり、
     * ModelSetTrain自体にgetName()は無いことが判明した。
     * ModelSetVehicleBase#getConfig() -> ResourceConfig#getName() 経由でモデル名を取得する。
     * 万一Stringが直接返るケースや未知の型にも対応できるよう、フォールバックも残す。
     */
    private static String extractName(Object item) {
        if (item == null) return null;
        if (item instanceof String) return (String) item;

        if (item instanceof ModelSetVehicleBase) {
            try {
                VehicleBaseConfig config = ((ModelSetVehicleBase) item).getConfig();
                return (config != null) ? config.getName() : null;
            } catch (Exception e) {
                Rtma.LOGGER.debug("[TrainSpecExporter] {} のgetConfig().getName()に失敗しました: {}",
                        item.getClass().getName(), e.toString());
                return null;
            }
        }

        // フォールバック: 未知の型でもgetName()を持っていれば拾う
        try {
            Method getName = item.getClass().getMethod("getName");
            Object result = getName.invoke(item);
            return (result instanceof String) ? (String) result : null;
        } catch (Exception e) {
            Rtma.LOGGER.debug("[TrainSpecExporter] {} からモデル名を取得できませんでした: {}",
                    item.getClass().getName(), e.toString());
            return null;
        }
    }
}
