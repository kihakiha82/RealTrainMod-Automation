package net.nobukym.rtma.train;

import jp.ngt.rtm.RTMResource;
import jp.ngt.rtm.modelpack.ModelPackManager;
import jp.ngt.rtm.modelpack.ResourceType;
import jp.ngt.rtm.modelpack.cfg.TrainConfig;
import jp.ngt.rtm.modelpack.cfg.VehicleBaseConfig;
import jp.ngt.rtm.modelpack.modelset.ModelSetVehicleBase;
import jp.ngt.rtm.modelpack.modelset.ResourceSet;
import net.nobukym.rtma.Rtma;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * モデルパックからTrainSpec(車両性能データ)を読み込む本番用クラス。
 *
 * TrainProbeでの調査により、以下の経路でTrainConfigが取得できることが確認済み:
 *   ModelPackManager.INSTANCE.getResourceSet(ResourceType, resourceName)
 *     -> ResourceSet(実体はModelSetTrain。ModelSetVehicleBaseのgetConfig()経由でアクセス)
 *       -> getConfig() -> VehicleBaseConfig(実体はTrainConfig)
 *
 * ResourceType(TRAIN_EC/TRAIN_DC/TRAIN_CC/TRAIN_TC/TRAIN_TEST)は実測では
 * どれで引いても同じ結果が返ってきたため、実質resourceName単独のグローバルな
 * 辞書のようだが、念のため全種類を試す。
 */
public final class TrainSpecLoader {

    // RTMResource.TRAIN_DCを先頭にしているのは、確認済みのkiha600(ディーゼルカー)が
    // 一致した実績があるため。他のカテゴリでも同じ結果が返る想定だが、
    // 万一カテゴリで挙動が変わった場合に備えて全種類を順に試す。
    private static final ResourceType[] TRAIN_TYPES = {
            RTMResource.TRAIN_DC,
            RTMResource.TRAIN_EC,
            RTMResource.TRAIN_CC,
            RTMResource.TRAIN_TC,
            RTMResource.TRAIN_TEST,
    };

    private TrainSpecLoader() {}

    /** resourceName(例: "kiha600")からTrainSpecを読み込む。見つからなければnull */
    public static TrainSpec load(String resourceName) {
        for (ResourceType type : TRAIN_TYPES) {
            try {
                ResourceSet resourceSet = ModelPackManager.INSTANCE.getResourceSet(type, resourceName);
                if (resourceSet == null) continue;
                if (!(resourceSet instanceof ModelSetVehicleBase)) continue;

                VehicleBaseConfig baseConfig = ((ModelSetVehicleBase) resourceSet).getConfig();
                if (!(baseConfig instanceof TrainConfig)) continue;

                return toSpec(resourceName, (TrainConfig) baseConfig);
            } catch (Exception e) {
                Rtma.LOGGER.error("TrainSpecLoader: resourceName=\"{}\" type={} の読み込みに失敗しました",
                        resourceName, type, e);
            }
        }

        Rtma.LOGGER.warn("TrainSpecLoader: resourceName=\"{}\" のTrainConfigが見つかりませんでした", resourceName);
        return null;
    }

    /**
     * 複数のresourceNameをまとめて読み込む。
     * 見つからなかったものはMapに含めない(呼び出し側でnullチェック不要にするため)。
     */
    public static Map<String, TrainSpec> loadAll(Set<String> resourceNames) {
        Map<String, TrainSpec> result = new HashMap<>();
        for (String resourceName : resourceNames) {
            TrainSpec spec = load(resourceName);
            if (spec != null) {
                result.put(resourceName, spec);
            }
        }
        return result;
    }

    private static TrainSpec toSpec(String resourceName, TrainConfig config) {
        TrainSpec spec = new TrainSpec();
        spec.resourceName = resourceName;
        spec.acceleration = config.accelerateion;
        spec.maxSpeedStages = (config.maxSpeed != null) ? config.maxSpeed.clone() : new float[0];
        spec.trainDistance = config.trainDistance;
        spec.rolling = config.rolling;
        spec.tags = config.tags;
        return spec;
    }
}
