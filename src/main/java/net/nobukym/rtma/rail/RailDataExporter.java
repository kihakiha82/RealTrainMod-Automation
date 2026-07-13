package net.nobukym.rtma.rail;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.List;
import java.util.zip.CRC32;

/**
 * RailSegmentのリストを、他プログラムからも読みやすいJSON形式で
 * 外部ファイルに保存する。
 *
 * Gsonはマインクラフト本体が利用しているため、追加の依存関係なしで使える。
 *
 * 変化検知用に、内容からハッシュ値(CRC32)を計算できるようにしている。
 * 呼び出し側(TickHandlerServer等)で前回ハッシュと比較し、
 * 変化がない場合はwriteToFileを呼ばないことで、無駄なディスクI/Oを避ける。
 */
public final class RailDataExporter {

    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

    private RailDataExporter() {}

    /** 任意のオブジェクトをJSON文字列に変換する(RailSegmentのリストに限らず汎用的に使う) */
    public static String toJson(Object data) {
        return GSON.toJson(data);
    }

    /** JSON文字列からハッシュ値(CRC32)を計算する。変化検知に使う */
    public static long computeHash(String json) {
        CRC32 crc = new CRC32();
        crc.update(json.getBytes(StandardCharsets.UTF_8));
        return crc.getValue();
    }

    /** JSON文字列をそのままファイルに書き出す */
    public static void writeToFile(String json, File outputFile) throws IOException {
        File parent = outputFile.getParentFile();
        if (parent != null && !parent.exists()) {
            parent.mkdirs();
        }
        Files.write(outputFile.toPath(), json.getBytes(StandardCharsets.UTF_8));
    }

    /** 互換用: 変換と書き出しを一度に行う(変化検知なしで常に書き出す) */
    public static void export(List<RailSegment> segments, File outputFile) throws IOException {
        writeToFile(toJson(segments), outputFile);
    }
}