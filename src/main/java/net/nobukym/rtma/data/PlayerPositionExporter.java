package net.nobukym.rtma.data;

import com.google.gson.Gson;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.WorldServer;
import net.minecraftforge.fml.common.FMLCommonHandler;
import net.nobukym.rtma.ClientState;
import net.nobukym.rtma.Rtma;
import net.nobukym.rtma.rail.RailDataExporter;

import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.util.*;

public class PlayerPositionExporter {
    /**
     * プレイヤーの現在座標・名前をplayer.jsonに書き出す。
     * シングルプレイ想定で、ワールド内の最初の1人のみを対象にする。
     * プレイヤーが見つからない場合は何もしない(前回の内容をそのまま残す)。
     */

    private static long lastHash = -1;


    public static void exportPlayerPosition(WorldServer world) {

        List<EntityPlayer> players = world.playerEntities;
        if (players.isEmpty()) {
            return;
        }

        EntityPlayer player = players.get(0);
        PlayerPosition pos = new PlayerPosition();
        pos.x = player.posX;
        pos.y = player.posY;
        pos.z = player.posZ;
        pos.PlayerName = player.getName();
        pos.uuid = player.getGameProfile() != null && player.getGameProfile().getId() != null
                ? player.getGameProfile().getId().toString()
                : null;

        pos.isPaused = ClientState.isPaused;
        pos.isServerRunning = Rtma.getServerRunning();

        String json = RailDataExporter.toJson(pos);
        long hash = RailDataExporter.computeHash(json);

        if (hash == lastHash) {
            // 前回と内容が同じなので、ディスクへの書き出しはスキップする
            return;
        }

        File outputFile = PathProvider.getPlayerFile(world);
        try {
            RailDataExporter.writeToFile(json, outputFile);
            lastHash = hash;
        } catch (IOException e) {
            Rtma.LOGGER.error("player.jsonの書き出しに失敗しました", e);
        }

    }
}
