package net.nobukym.rtma.rail;

import java.util.zip.CRC32;

/**
 * RailSegmentのIDを、始点・終点座標から決定的に生成する。
 *
 * 要件:
 * - 同じ物理的なレールなら、再エクスポート(ワールド再起動含む)しても同じIDになる
 *   → RTM側の内部オブジェクト参照やインデックスではなく、座標という
 *     物理的に安定した情報だけから導出する。
 * - 始点→終点で見るか終点→始点で見るかで別のIDにならないよう、
 *   2点を正規化(ソート)してから使う
 *   → 「向き」は経路構築時にRailSegment側とは別に持たせる想定で、
 *     IDはあくまで「物理的にどのレールか」だけを表す。
 * - 座標の丸め誤差でIDがブレないよう、小数点以下を一定精度に丸めてから使う。
 *
 * ハッシュ関数は既存のRailDataExporterと同じCRC32を使い、パターンを揃えている。
 */
public final class RailIdGenerator {

    /** 座標を丸める精度(小数点以下の桁数) */
    private static final int ROUND_DECIMALS = 3;

    private RailIdGenerator() {}

    public static String generate(double startX, double startY, double startZ,
                                  double endX, double endY, double endZ) {
        double[] a = { round(startX), round(startY), round(startZ) };
        double[] b = { round(endX), round(endY), round(endZ) };

        // 2点を正規化(辞書順で小さい方を先に)して、向きに依存しないIDにする
        if (compare(a, b) > 0) {
            double[] tmp = a;
            a = b;
            b = tmp;
        }

        String canonical = String.format("%.3f,%.3f,%.3f|%.3f,%.3f,%.3f",
                a[0], a[1], a[2], b[0], b[1], b[2]);

        CRC32 crc = new CRC32();
        crc.update(canonical.getBytes(java.nio.charset.StandardCharsets.UTF_8));

        return "rail_" + Long.toHexString(crc.getValue());
    }

    private static double round(double v) {
        double factor = Math.pow(10, ROUND_DECIMALS);
        return Math.round(v * factor) / factor;
    }

    /** 3要素の座標を辞書順(x→y→z)で比較する */
    private static int compare(double[] p1, double[] p2) {
        for (int i = 0; i < 3; i++) {
            int c = Double.compare(p1[i], p2[i]);
            if (c != 0) return c;
        }
        return 0;
    }
}