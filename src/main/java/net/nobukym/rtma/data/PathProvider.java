package net.nobukym.rtma.data;

import net.minecraft.world.World;

import java.io.File;

/**
 * rtma関連の外部ファイルの保存先パスを一元管理する。
 *
 * レールデータ・時刻表は saves/<world>/rtma/ 配下に保存する。
 * これによりMinecraftを終了してもファイルとして残り、
 * 外部プログラム(Webサーバーや時刻表編集ツール等)からも参照できる。
 */
public final class PathProvider {

    private static final String ROOT_DIR_NAME = "rtma";

    private PathProvider() {}

    /** 指定ワールドの rtma ルートディレクトリ（saves/<world>/rtma/） */
    public static File getWorldRtmaDir(World world) {
        File worldDir = world.getSaveHandler().getWorldDirectory();
        File rtmaDir = new File(worldDir, ROOT_DIR_NAME);
        if (!rtmaDir.exists()) {
            rtmaDir.mkdirs();
        }
        return rtmaDir;
    }

    public static File getRailsFile(World world) {
        return new File(getWorldRtmaDir(world), "rails.json");
    }

    /** Web側の初期表示(プレイヤー位置を中心にする)用に書き出すプレイヤー座標ファイル */
    public static File getPlayerFile(World world) {
        return new File(getWorldRtmaDir(world), "player.json");
    }

    /** 現在のRTMA時刻(年・日・時・分・秒)を書き出すファイル */
    public static File getTimeFile(World world) {
        return new File(getWorldRtmaDir(world), "time.json");
    }

    public static File getTrainsFile(World world) {
        return new File(getWorldRtmaDir(world), "trains.json");
    }

    public static File getTrainSpecsFile(World world) {
        return new File(getWorldRtmaDir(world), "trainspecs.json");
    }

    public static File getTimetableDir(World world) {
        File dir = new File(getWorldRtmaDir(world), "timetables");
        if (!dir.exists()) {
            dir.mkdirs();
        }
        return dir;
    }

    /**
     * Web側(UI)が書き込み、Mod側(AssignmentReader)が読む紐付けファイル。
     * Web→Mod方向の唯一のデータ経路として使う(trains.jsonはMod→Web専用の逆方向)。
     * フォーマット: { "<uuid>": { "timetableName": string, "assignedAt": {...} }, ... }
     */
    public static File getAssignmentFile(World world) {
        return new File(getWorldRtmaDir(world), "train-assignments.json");
    }
}