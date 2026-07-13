package net.nobukym.rtma;

import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.WorldServer;
import net.minecraftforge.fml.common.FMLCommonHandler;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;
import net.minecraftforge.fml.common.gameevent.PlayerEvent.PlayerLoggedInEvent;
import net.nobukym.rtma.data.GetPlayerHead;
import net.nobukym.rtma.data.PathProvider;
import net.nobukym.rtma.data.PlayerPosition;
import net.nobukym.rtma.rail.RailDataExporter;

import java.io.File;
import java.io.IOException;
import java.util.List;

import static net.nobukym.rtma.Rtma.MODID;
import static net.nobukym.rtma.data.PathProvider.getWorldRtmaDir;

@Mod.EventBusSubscriber(modid = MODID)
public class PlayerLoginHandler {

    @SubscribeEvent
    public static void onPlayerLogin(PlayerLoggedInEvent event) {

        MinecraftServer server = FMLCommonHandler.instance().getMinecraftServerInstance();
        if (server == null) return;

        // worlds[0]は配列の格納順に依存してしまうため、
        // ディメンションIDを明示してオーバーワールドを取得する
        WorldServer world = server.getWorld(0);

        List<EntityPlayer> players = world.playerEntities;
        if (players.isEmpty()) {
            return;
        }

        // 対象のプレイヤー
        EntityPlayer player = players.get(0);

        File worldpass = PathProvider.getWorldRtmaDir(world);

        String outputDir = worldpass + "/images/players";

        String fileName = player.getName() + ".png";

        GetPlayerHead.exportHeadLocal(player, outputDir, fileName);
    }
}