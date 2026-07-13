package net.nobukym.rtma.item;

import net.minecraft.client.Minecraft;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.util.ActionResult;
import net.minecraft.util.EnumActionResult;
import net.minecraft.util.EnumHand;
import net.minecraft.world.World;
import net.nobukym.rtma.Rtma;
import net.nobukym.rtma.gui.GuiGWatch;

public class ItemGenesisPocketWatch extends Item {
    public ItemGenesisPocketWatch(String name) {
        this.setRegistryName(name);
        this.setTranslationKey(name);
        this.setMaxStackSize(1);
    }

    @Override
    public ActionResult<ItemStack> onItemRightClick(World world,
                                                    EntityPlayer player,
                                                    EnumHand hand) {


        if (world.isRemote) {
            Minecraft.getMinecraft().displayGuiScreen(
                    new GuiGWatch());
        }


        return new ActionResult<>(EnumActionResult.SUCCESS,
                player.getHeldItem(hand));

    }


}
