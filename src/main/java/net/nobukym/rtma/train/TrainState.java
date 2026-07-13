package net.nobukym.rtma.train;

/**
 * 列車1両(EntityTrainBase 1体)分の状態を、他プログラムからも読みやすい形で表すクラス。
 * RailSegmentの列車版。JSONへのシリアライズを想定しているため、
 * RTM独自の型(Formation, VehicleNGTO等)は含めず、プリミティブ型のみで構成する。
 *
 * 【検証済みの知見】
 * - customName(旧modelName)はgetName()/NBTの"State.Name"の値で、ユーザーが
 *   個別に付けるカスタム名。モデル識別には使えない。
 * - resourceNameがNBTの"State.ResourceName"の値で、こちらがモデル識別子の本命候補。
 *   (例: フレートカーで"minecart"だった。車種によって値が変わるかは要追加確認)
 * - formationId/entryDir/entryPosはNBTの"FormationEntry"タグから取得。
 *   同じ編成に属する車両は同じformationIdを持つと思われるため、
 *   connectedTrainId0/1をグラフとして辿るより、こちらの方が確実な
 *   編成グループ化の手がかりになりそう。entryPosが編成内の並び順を
 *   表している可能性が高い(要検証)。
 * - speedの単位はブロック/tick。km/h換算は speed * 72
 *   (blocks/tick * 20tick/s * 3.6(m/s→km/h, 1ブロック=1m換算) = *72)。
 *   実測値0.40011197 → 28.8km/h ≒ ゲーム内表示の29km/hとほぼ一致し検証済み。
 * - notchは編成全体で共有されない。isControlCar=trueの車両のnotchだけが
 *   実際の走行制御に効く。自動運転で notchを操作する際は、対象車両ではなく
 *   同じ編成内のisControlCar=true車両に対してsetNotch()を呼ぶ必要がある。
 * - connectedTrainId0/1は列車全体の前後ではなく、その車両自身のボギー
 *   (台車)ごとのindexなので、両端の車両同士で対称にならないことがある
 *   (146の"1"側が203、203の"0"側が146、203の"1"側が229、229の"1"側が203、
 *   という非対称な組み合わせを実測で確認済み)。編成のグループ化には
 *   formationIdの方を優先して使う。
 */
public final class TrainState {

    /** ワールド内で一意なMinecraftのEntity ID。connectedTrainId0/1との突き合わせに使う */
    public int entityId;

    /** ワールドを跨いでも一意なUUID文字列。Web側で列車を識別するキーとして使う想定 */
    public String uuid;

    /** State.Name(=getName())。ユーザーが個別に付けるカスタム名。モデル識別には使えない */
    public String customName;

    /** State.ResourceName。モデル識別子の候補(要追加検証) */
    public String resourceName;

    public double posX;
    public double posY;
    public double posZ;
    public float rotationYaw;

    /** 現在速度。単位はブロック/tick。km/h換算は speed * 72 (検証済み) */
    public float speed;

    /** 現在ノッチ。正が力行(加速)側、負がブレーキ側(検証済み)。編成全体では共有されない点に注意 */
    public int notch;

    /** getTrainDirection()の戻り値。列車の向き(進行方向)を表すと思われる */
    public int trainDirection;

    public boolean isControlCar;
    public boolean onRail;
    public int brakeCount;
    public int atsCount;

    /** getConnectedTrain(0)の相手のentityId。連結相手がいなければnull */
    public Integer connectedTrainId0;

    /** getConnectedTrain(1)の相手のentityId。連結相手がいなければnull */
    public Integer connectedTrainId1;

    /** FormationEntry.FormationId。同じ編成の車両は同じ値を持つと推測(要検証) */
    public Long formationId;

    /** FormationEntry.EntryDir */
    public Integer entryDir;

    /** FormationEntry.EntryPos。編成内での並び順を表す可能性が高い(要検証) */
    public Integer entryPos;
}
