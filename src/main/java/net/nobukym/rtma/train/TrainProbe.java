package net.nobukym.rtma.train;

import jp.ngt.rtm.entity.train.EntityTrainBase;
import net.minecraft.nbt.NBTBase;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.world.World;
import net.nobukym.rtma.Rtma;
import net.nobukym.rtma.rail.ApiDump;

import java.io.File;
import java.lang.reflect.Array;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

/**
 * 車両モデル識別・性能データ取得のための調査クラス。
 *
 * 判明した経路:
 *   ModelPackManager.INSTANCE.getResourceSet(ResourceType, resourceName)
 *     -> ResourceSet(実体はModelSetTrain等)
 *       -> .getConfig() -> TrainConfig(性能データ本体)
 *
 * ResourceTypeの正確な列挙値名は不明だが、enumなら全列挙値を試して
 * resourceNameにマッチするものを探せば、名前を決め打ちせずに済む。
 */
public final class TrainProbe {

    private TrainProbe() {}

    /** 1両分のNBTタグを丸ごとログに出す */
    public static void probeVehicleNbt(EntityTrainBase train) {
        NBTTagCompound tag = new NBTTagCompound();
        train.writeToNBT(tag);

        Rtma.LOGGER.info("=== {} (customName=\"{}\") のNBT ===",
                train.getClass().getSimpleName(), train.getName());

        for (String key : tag.getKeySet()) {
            NBTBase value = tag.getTag(key);
            Rtma.LOGGER.info("  {} = {}", key, value);
        }

        Rtma.LOGGER.info("=== NBT終了 ===");
    }

    /**
     * ワールド内の全列車について、State.ResourceNameを重複なく集め、
     * それぞれについてTrainConfigを取得・値をダンプする。
     */
    public static void probeAllTrainConfigs(World world) {
        List<EntityTrainBase> allTrains = TrainCollector.getAllTrains(world);

        Set<String> resourceNames = new HashSet<>();
        for (EntityTrainBase train : allTrains) {
            String resourceName = extractResourceName(train);
            if (resourceName != null) {
                resourceNames.add(resourceName);
            }
        }

        Rtma.LOGGER.info("[TrainProbe] 対象resourceName: {}", resourceNames);

        for (String resourceName : resourceNames) {
            probeTrainConfig(resourceName);
        }
    }

    /** writeToNBT経由でState.ResourceNameだけを取り出す簡易ヘルパー */
    private static String extractResourceName(EntityTrainBase train) {
        try {
            NBTTagCompound tag = new NBTTagCompound();
            train.writeToNBT(tag);
            if (tag.hasKey("State")) {
                NBTTagCompound stateTag = tag.getCompoundTag("State");
                if (stateTag.hasKey("ResourceName")) {
                    return stateTag.getString("ResourceName");
                }
            }
        } catch (Exception e) {
            Rtma.LOGGER.error("resourceNameの取得に失敗しました", e);
        }
        return null;
    }

    /**
     * ModelPackManager.INSTANCE.getResourceSet(ResourceType, resourceName) を
     * RTMResourceクラスに公開static定数(TRAIN_EC/TRAIN_DC/TRAIN_CC/TRAIN_TC/TRAIN_TEST等)
     * として定義されていることが判明したため、それらを直接読み出して試す。
     */
    public static void probeTrainConfig(String resourceName) {
        try {
            Class<?> resourceTypeClass = Class.forName("jp.ngt.rtm.modelpack.ResourceType");
            Class<?> resourceHolderClass = Class.forName("jp.ngt.rtm.RTMResource");
            Class<?> managerClass = Class.forName("jp.ngt.rtm.modelpack.ModelPackManager");
            Object managerInstance = managerClass.getField("INSTANCE").get(null);

            Method getResourceSet = managerClass.getMethod("getResourceSet", resourceTypeClass, String.class);

            boolean found = false;
            for (Field f : resourceHolderClass.getFields()) {
                if (!resourceTypeClass.isAssignableFrom(f.getType())) continue;
                if (!f.getName().startsWith("TRAIN")) continue; // 列車系のResourceTypeだけに絞る

                Object resourceType = f.get(null);
                try {
                    Object resourceSet = getResourceSet.invoke(managerInstance, resourceType, resourceName);
                    if (resourceSet == null) continue;

                    Method getConfig = resourceSet.getClass().getMethod("getConfig");
                    Object config = getConfig.invoke(resourceSet);
                    if (config == null) continue;

                    found = true;
                    Rtma.LOGGER.info("=== resourceName=\"{}\" RTMResource.{} => {} (config実体: {}) ===",
                            resourceName, f.getName(), resourceSet.getClass().getSimpleName(), config.getClass().getName());
                    dumpFieldValues(config);
                } catch (Exception inner) {
                    Rtma.LOGGER.debug("RTMResource.{}では失敗: {}", f.getName(), inner.toString());
                }
            }

            if (!found) {
                Rtma.LOGGER.info("resourceName=\"{}\" はどのTRAIN系ResourceTypeでも見つかりませんでした", resourceName);
            }
        } catch (Exception e) {
            Rtma.LOGGER.error("probeTrainConfig(\"{}\")に失敗しました", resourceName, e);
        }
    }

    /** インスタンスの全publicフィールドの「値」をログに出す(ApiDump.dumpは名前のみだったので値版) */
    private static void dumpFieldValues(Object instance) {
        if (instance == null) {
            Rtma.LOGGER.info("dumpFieldValues: instanceがnullです");
            return;
        }

        Class<?> clazz = instance.getClass();
        Rtma.LOGGER.info("--- {} のフィールド値 ---", clazz.getName());

        for (Field f : clazz.getFields()) {
            try {
                Object value = f.get(instance);
                String valueStr = (value != null && value.getClass().isArray())
                        ? arrayToString(value)
                        : String.valueOf(value);
                Rtma.LOGGER.info("  {} = {}", f.getName(), valueStr);
            } catch (Exception e) {
                Rtma.LOGGER.info("  {} = <取得失敗: {}>", f.getName(), e.toString());
            }
        }
    }

    private static String arrayToString(Object array) {
        int length = Array.getLength(array);
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < length; i++) {
            if (i > 0) sb.append(", ");
            Object element = Array.get(array, i);
            sb.append(element != null && element.getClass().isArray() ? arrayToString(element) : String.valueOf(element));
        }
        sb.append("]");
        return sb.toString();
    }

    /**
     * RailConfig(レールのモデルパック設定)に、曲線速度制限のような
     * 既存ロジック/フィールドが無いか確認する。
     * あれば、RTMA独自のK・Cd較正式を使わずに流用できる可能性がある
     * (設計ドキュメント5章「RTM側に既存の曲線減速ロジックがあれば流用」に対応)。
     */
    public static void probeRailConfig() {
        String[] targetClassNames = {
                "jp.ngt.rtm.modelpack.cfg.RailConfig",
                "jp.ngt.rtm.modelpack.cfg.RailConfig$BallastSet",
                "jp.ngt.rtm.modelpack.modelset.ModelSetRail",
        };

        for (String className : targetClassNames) {
            try {
                Class<?> clazz = Class.forName(className);
                ApiDump.dump(clazz);
            } catch (ClassNotFoundException e) {
                Rtma.LOGGER.info("{} は見つかりませんでした", className);
            } catch (Exception e) {
                Rtma.LOGGER.error("{} のダンプに失敗しました", className, e);
            }
        }
    }

    /**
     * probeRtmJarClasses()で見つかった候補の中から、モデルパック管理・性能設定に
     * 直結しそうなクラスを絞り込んで、そのpublic API(staticメソッド含む)を
     * ApiDump.dump(Class)で覗く。importせずClass.forName()で動的に読み込むため、
     * これらのクラスがコンパイル時に存在しなくてもビルドは通る。
     *
     * これはpublicなメソッド・フィールドのシグネチャ一覧を見ているだけであり、
     * 実装(バイトコード本体)の復元・逆コンパイルではない。
     */
    public static void probeModelPackApi() {
        String[] targetClassNames = {
                "jp.ngt.rtm.RTMResource",
                "jp.ngt.rtm.RTM",
                "jp.ngt.rtm.modelpack.ModelPackManager",
                "jp.ngt.rtm.modelpack.RTMResourceManager",
                "jp.ngt.rtm.modelpack.ResourceType",
                "jp.ngt.rtm.modelpack.cfg.TrainConfig",
                "jp.ngt.rtm.modelpack.cfg.VehicleBaseConfig",
                "jp.ngt.rtm.modelpack.cfg.VehicleConfig",
                "jp.ngt.rtm.modelpack.cfg.ModelConfig",
                "jp.ngt.rtm.entity.train.util.FormationManager",
                "jp.ngt.rtm.modelpack.modelset.ModelSetTrain",
        };

        for (String className : targetClassNames) {
            try {
                Class<?> clazz = Class.forName(className);
                ApiDump.dump(clazz);
            } catch (ClassNotFoundException e) {
                Rtma.LOGGER.info("{} は見つかりませんでした", className);
            } catch (Exception e) {
                Rtma.LOGGER.error("{} のダンプに失敗しました", className, e);
            }
        }
    }

    /**
     * RTM本体のjar(またはdev環境ならクラスディレクトリ)から、jp.ngt.rtm配下の
     * クラス名一覧を集め、モデルパック管理っぽいキーワードを含むものだけ表示する。
     */
    public static void probeRtmJarClasses() {
        String[] keywords = {
                "pack", "manager", "registry", "loader", "vehicle", "model", "info", "resource"
        };

        try {
            URL location = EntityTrainBase.class.getProtectionDomain().getCodeSource().getLocation();
            File file = resolveLocationFile(location);

            Rtma.LOGGER.info("RTM由来クラスの取得元: {}", file.getAbsolutePath());

            List<String> candidates = new ArrayList<>();
            int totalScanned;

            if (file.isDirectory()) {
                totalScanned = collectFromDirectory(file, file, candidates, keywords);
            } else {
                totalScanned = collectFromJar(file, candidates, keywords);
            }

            Collections.sort(candidates);
            Rtma.LOGGER.info("=== jp.ngt.rtm 配下 総クラス数(概算)={} / モデルパック関連候補={}件 ===",
                    totalScanned, candidates.size());
            for (String c : candidates) {
                Rtma.LOGGER.info("  {}", c);
            }
            Rtma.LOGGER.info("=== 候補クラス一覧 終了 ===");
        } catch (Exception e) {
            Rtma.LOGGER.error("RTM jarのクラス一覧取得に失敗しました", e);
        }
    }

    /**
     * CodeSource#getLocation()の結果をFileに変換する。
     * 通常は new File(location.toURI()) で十分だが、Forge/LaunchWrapperの
     * union:形式URI(複数jarを仮想的に1つに見せる、%23や!/を含む非階層URI)では
     * IllegalArgumentException("URI is not hierarchical")になることがあるため、
     * その場合は文字列としてパースし直す。
     */
    private static File resolveLocationFile(URL location) throws Exception {
        try {
            return new File(location.toURI());
        } catch (Exception e) {
            String path = java.net.URLDecoder.decode(location.getPath(), "UTF-8");

            int bangIdx = path.indexOf('!');
            if (bangIdx >= 0) {
                path = path.substring(0, bangIdx);
            }
            int hashIdx = path.indexOf('#');
            if (hashIdx >= 0) {
                path = path.substring(0, hashIdx);
            }
            while (path.startsWith("file:")) {
                path = path.substring("file:".length());
            }
            while (path.startsWith("//")) {
                path = path.substring(1);
            }
            if (path.matches("^/[A-Za-z]:.*")) {
                path = path.substring(1);
            }

            Rtma.LOGGER.info("通常のURI変換に失敗したためフォールバックでパース: {}", path);
            return new File(path);
        }
    }

    private static int collectFromJar(File jarFile, List<String> candidates, String[] keywords) throws Exception {
        int total = 0;
        try (ZipFile zip = new ZipFile(jarFile)) {
            java.util.Enumeration<? extends ZipEntry> entries = zip.entries();
            while (entries.hasMoreElements()) {
                ZipEntry entry = entries.nextElement();
                String name = entry.getName();
                if (!name.endsWith(".class")) continue;
                if (!name.startsWith("jp/ngt/rtm")) continue;

                total++;
                String className = name.replace('/', '.');
                className = className.substring(0, className.length() - ".class".length());
                addIfMatches(className, candidates, keywords);
            }
        }
        return total;
    }

    private static int collectFromDirectory(File root, File current, List<String> candidates, String[] keywords) {
        File[] children = current.listFiles();
        if (children == null) return 0;

        int total = 0;
        for (File child : children) {
            if (child.isDirectory()) {
                total += collectFromDirectory(root, child, candidates, keywords);
            } else if (child.getName().endsWith(".class")) {
                String relPath = root.toPath().relativize(child.toPath()).toString();
                String className = relPath.replace(File.separatorChar, '.');
                className = className.substring(0, className.length() - ".class".length());
                if (!className.startsWith("jp.ngt.rtm")) continue;

                total++;
                addIfMatches(className, candidates, keywords);
            }
        }
        return total;
    }

    private static void addIfMatches(String className, List<String> candidates, String[] keywords) {
        String lower = className.toLowerCase();
        for (String kw : keywords) {
            if (lower.contains(kw)) {
                candidates.add(className);
                return;
            }
        }
    }
}
