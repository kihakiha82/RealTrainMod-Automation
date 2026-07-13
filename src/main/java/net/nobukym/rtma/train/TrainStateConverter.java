package net.nobukym.rtma.train;

import jp.ngt.rtm.entity.train.EntityTrainBase;
import net.minecraft.nbt.NBTTagCompound;
import net.nobukym.rtma.Rtma;

/**
 * EntityTrainBase(RTMの列車エンティティ)をTrainState(読みやすいデータクラス)に変換する。
 * RailMapConverterの列車版。
 *
 * resourceName / formationId / entryDir / entryPos は、EntityTrainBaseの公開APIには
 * 対応するgetterが見当たらなかったため、標準ForgeのNBT API(writeToNBT)経由で取得する。
 * TrainProbe.probeVehicleNbt()での実機確認により、以下のキー構造を確認済み:
 *
 *   State: { Version, ResourceName, Color, Name, DataMap: {...} }
 *   FormationEntry: { EntryDir(byte), FormationId(long), EntryPos(byte) }
 */
public final class TrainStateConverter {

    private TrainStateConverter() {}

    public static TrainState convert(EntityTrainBase train) {
        TrainState state = new TrainState();

        state.entityId = train.getEntityId();
        state.uuid = train.getUniqueID().toString();
        state.customName = train.getName();

        state.posX = train.posX;
        state.posY = train.posY;
        state.posZ = train.posZ;
        state.rotationYaw = train.rotationYaw;

        state.speed = train.getSpeed();
        state.notch = train.getNotch();
        state.trainDirection = train.getTrainDirection();

        state.isControlCar = train.isControlCar();
        state.onRail = train.onRail;
        state.brakeCount = train.brakeCount;
        state.atsCount = train.atsCount;

        state.connectedTrainId0 = safeGetConnectedTrainId(train, 0);
        state.connectedTrainId1 = safeGetConnectedTrainId(train, 1);

        readNbtExtras(train, state);

        return state;
    }

    /**
     * getConnectedTrain(index)は、連結相手がいない場合の挙動(null返却か例外か)が
     * まだ未検証のため、両方に対応できるよう防御的に呼び出す。
     */
    private static Integer safeGetConnectedTrainId(EntityTrainBase train, int index) {
        try {
            EntityTrainBase connected = train.getConnectedTrain(index);
            return connected != null ? connected.getEntityId() : null;
        } catch (Exception e) {
            Rtma.LOGGER.debug("getConnectedTrain({})で例外: {}", index, e.toString());
            return null;
        }
    }

    /** writeToNBT経由でState.ResourceNameとFormationEntryを読み取る */
    private static void readNbtExtras(EntityTrainBase train, TrainState state) {
        try {
            NBTTagCompound tag = new NBTTagCompound();
            train.writeToNBT(tag);

            if (tag.hasKey("State")) {
                NBTTagCompound stateTag = tag.getCompoundTag("State");
                if (stateTag.hasKey("ResourceName")) {
                    state.resourceName = stateTag.getString("ResourceName");
                }
            }

            if (tag.hasKey("FormationEntry")) {
                NBTTagCompound formationTag = tag.getCompoundTag("FormationEntry");
                if (formationTag.hasKey("FormationId")) {
                    state.formationId = formationTag.getLong("FormationId");
                }
                if (formationTag.hasKey("EntryDir")) {
                    state.entryDir = (int) formationTag.getByte("EntryDir");
                }
                if (formationTag.hasKey("EntryPos")) {
                    state.entryPos = (int) formationTag.getByte("EntryPos");
                }
            }
        } catch (Exception e) {
            Rtma.LOGGER.error("列車NBTからのresourceName/formationId取得に失敗しました", e);
        }
    }
}
