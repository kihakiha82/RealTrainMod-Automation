package net.nobukym.rtma.train;

import jp.ngt.rtm.entity.train.EntityTrainBase;
import net.minecraft.world.World;

import java.util.ArrayList;
import java.util.List;

/**
 * ワールド内にロードされている列車本体(EntityTrainBase)を収集する。
 *
 * TrainProbeでの調査により、列車エンティティはjp.ngt.rtm.entity.train.EntityTrainBase
 * を継承していることが確認できたため、パッケージ名によるゆるい絞り込みではなく
 * 型で直接絞り込む(RailCollectorがRailMap型で絞り込むのと同じ考え方)。
 *
 * 座席判定用のEntityFloorや、台車のEntityBogieはこのメソッドの対象外。
 * 台車が必要な場合は EntityTrainBase#getBogie(int) 経由で個別に取得する。
 */
public final class TrainCollector {

    private TrainCollector() {}

    /** ワールド内の全ロード済み列車本体(EntityTrainBase)を返す */
    public static List<EntityTrainBase> getAllTrains(World world) {
        List<EntityTrainBase> result = new ArrayList<>();

        for (Object obj : world.loadedEntityList) {
            if (obj instanceof EntityTrainBase) {
                result.add((EntityTrainBase) obj);
            }
        }

        return result;
    }
}

