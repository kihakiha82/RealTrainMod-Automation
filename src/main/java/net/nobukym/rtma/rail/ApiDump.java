package net.nobukym.rtma.rail;

import net.nobukym.rtma.Rtma;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;

/**
 * 指定したクラス(またはインスタンス)のpublicなメソッド・フィールドの
 * 一覧をログに出力する調査用ユーティリティ。
 */
public final class ApiDump {

    private ApiDump() {}

    public static void dump(Object instance) {
        if (instance == null) {
            Rtma.LOGGER.info("ApiDump: instanceがnullです");
            return;
        }
        dump(instance.getClass());
    }

    public static void dump(Class<?> clazz) {
        Rtma.LOGGER.info("=== {} の公開API ===", clazz.getName());

        Rtma.LOGGER.info("-- フィールド --");
        for (Field f : clazz.getFields()) {
            if (Modifier.isPublic(f.getModifiers())) {
                Rtma.LOGGER.info("{} {}", f.getType().getSimpleName(), f.getName());
            }
        }

        Rtma.LOGGER.info("-- メソッド --");
        for (Method m : clazz.getMethods()) {
            if (!Modifier.isPublic(m.getModifiers())) continue;
            if (m.getDeclaringClass() == Object.class) continue; // toString等は省略

            StringBuilder params = new StringBuilder();
            Class<?>[] paramTypes = m.getParameterTypes();
            for (int i = 0; i < paramTypes.length; i++) {
                if (i > 0) params.append(", ");
                params.append(paramTypes[i].getSimpleName());
            }

            Rtma.LOGGER.info("{} {}({})  // 定義元: {}",
                    m.getReturnType().getSimpleName(),
                    m.getName(),
                    params,
                    m.getDeclaringClass().getSimpleName());
        }

        Rtma.LOGGER.info("=== {} の公開API 終了 ===", clazz.getName());
    }

    /**
     * Iterable内の各要素の実際のクラス名(完全修飾名)を集計してログに出す。
     */
    public static void dumpClassNameCounts(Iterable<?> items) {
        Rtma.LOGGER.info("=== クラス名の集計開始 ===");

        java.util.Map<String, Integer> counts = new java.util.HashMap<>();
        for (Object o : items) {
            if (o == null) continue;
            counts.merge(o.getClass().getName(), 1, Integer::sum);
        }

        for (java.util.Map.Entry<String, Integer> e : counts.entrySet()) {
            Rtma.LOGGER.info("{} : {}件", e.getKey(), e.getValue());
        }

        Rtma.LOGGER.info("=== クラス名の集計終了 ===");
    }

    /**
     * 【追加】ワールドのTileEntity一覧から SwitchCore を探し、getSwitch() の中身をダンプする
     * * 呼び出し例: ApiDump.findAndDumpSwitchType(world.loadedTileEntityList);
     */
    public static void findAndDumpSwitchType(Iterable<?> items) {
        Rtma.LOGGER.info("=== SwitchType の探索とダンプを開始します ===");
        boolean found = false;

        for (Object o : items) {
            if (o == null) continue;

            // クラス名で SwitchCore を特定
            if ("jp.ngt.rtm.rail.TileEntityLargeRailSwitchCore".equals(o.getClass().getName())) {
                found = true;
                Rtma.LOGGER.info("TileEntityLargeRailSwitchCore を発見しました。getSwitch() を実行します。");

                try {
                    // リフレクションで getSwitch() を呼び出し
                    Method getSwitchMethod = o.getClass().getMethod("getSwitch");
                    Object switchTypeObj = getSwitchMethod.invoke(o);

                    if (switchTypeObj != null) {
                        Rtma.LOGGER.info("SwitchTypeの実体クラス: {}", switchTypeObj.getClass().getName());
                        // 取得したオブジェクトを既存の dump メソッドに投げる
                        dump(switchTypeObj);
                    } else {
                        Rtma.LOGGER.info("getSwitch() の戻り値は null でした。");
                    }
                } catch (Exception e) {
                    Rtma.LOGGER.error("getSwitch() の呼び出しまたはダンプに失敗しました: ", e);
                }

                // 1件調べれば構造はわかるのでループを抜ける
                break;
            }
        }

        if (!found) {
            Rtma.LOGGER.info("ワールド内に TileEntityLargeRailSwitchCore が見つかりませんでした。");
        }
        Rtma.LOGGER.info("=== SwitchType の探索とダンプを終了しました ===");
    }
}