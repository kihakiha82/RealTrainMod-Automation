package net.nobukym.rtma;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiScreen;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.WorldServer;
import net.minecraftforge.client.event.GuiOpenEvent;
import net.minecraftforge.fml.common.FMLCommonHandler;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;
import net.minecraftforge.fml.relauncher.Side;
import net.minecraftforge.fml.relauncher.SideOnly;
import net.nobukym.rtma.data.PlayerPositionExporter;


import static net.nobukym.rtma.Rtma.MODID;

@SideOnly(Side.CLIENT)
@Mod.EventBusSubscriber(modid = MODID)
public class OpenGuiHandler {



    @SubscribeEvent
    public static void onGuiOpen(GuiOpenEvent event) {
        MinecraftServer server = FMLCommonHandler.instance().getMinecraftServerInstance();
        if (server == null) return;

        GuiScreen oldScreen = Minecraft.getMinecraft().currentScreen;
        GuiScreen newScreen = event.getGui();

        WorldServer world = server.getWorld(0);

        if (newScreen != null && newScreen.doesGuiPauseGame()) {
            ClientState.isPaused = true;
            PlayerPositionExporter.exportPlayerPosition(world);
        }
        else if (oldScreen != null && newScreen == null) {
            ClientState.isPaused = false;
            PlayerPositionExporter.exportPlayerPosition(world);
        }

    }

}
