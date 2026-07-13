package net.nobukym.rtma.rail;

import jp.ngt.rtm.rail.TileEntityLargeRailSwitchBase;
import jp.ngt.rtm.rail.TileEntityLargeRailSwitchCore;
import jp.ngt.rtm.rail.util.*;
import net.minecraft.block.BlockRailBase;
import net.minecraft.server.MinecraftServer;
import net.minecraft.tileentity.TileEntity;
import net.minecraft.world.World;
import jp.ngt.rtm.rail.TileEntityLargeRailCore;
import net.minecraft.world.WorldServer;
import net.minecraftforge.fml.common.FMLCommonHandler;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;


public class RailCollector {

    public static void test(){
        System.out.println("Testing RailCollector");

    }

    MinecraftServer server = FMLCommonHandler.instance().getMinecraftServerInstance();//サーバーを取得

    WorldServer world = server.worlds[0];;//オーバーワールドのデータを参照

    public static List<RailMap> getAllRailTileEntity(World world)
    {
        List<TileEntity> targetList = new ArrayList<>(world.loadedTileEntityList);//すべてのtileEntityを取得

        List<RailMap> gatheredRailMaps = new ArrayList<>();

        for (TileEntity tileEntity : targetList){
            if (tileEntity instanceof TileEntityLargeRailCore) {
                TileEntityLargeRailCore railCore = (TileEntityLargeRailCore) tileEntity;

                RailMap[] railMaps = railCore.getAllRailMaps();

                if (railMaps != null) { // 念のためヌルチェック（データが空っぽじゃないか）
                    // 用意しておいたリストに格納！
                    gatheredRailMaps.addAll(Arrays.asList(railMaps));
                }
            }
        }

        return gatheredRailMaps;
    }




}
