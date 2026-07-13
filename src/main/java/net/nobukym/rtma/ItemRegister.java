package net.nobukym.rtma;

import net.minecraft.client.renderer.block.model.ModelResourceLocation;
import net.minecraft.item.Item;
import net.minecraftforge.client.event.ModelRegistryEvent;
import net.minecraftforge.client.model.ModelLoader;
import net.minecraftforge.event.RegistryEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;
import net.nobukym.rtma.item.ItemGenesisPocketWatch;

import java.util.ArrayList;
import java.util.List;

@Mod.EventBusSubscriber
public class ItemRegister {

    // 登録するすべてのアイテムをまとめて管理するリスト
    public static final List<Item> ITEMS = new ArrayList<>();

    // 各アイテムのインスタンスを定義（先ほどの ItemGeneral を使用）
    public static final Item G_WATCH = new ItemGenesisPocketWatch("genesis_pocketwatch");

    /**
     * 1. アイテム本体をゲームに登録するイベント
     */
    @SubscribeEvent
    public static void registerItems(RegistryEvent.Register<Item> event) {
        // リストにアイテムを追加していく
        ITEMS.add(G_WATCH);

        // registerAll を使って、リスト内のアイテムを一括で Forge に登録
        event.getRegistry().registerAll(ITEMS.toArray(new Item[0]));
    }

    @SubscribeEvent
    public static void registerModels(ModelRegistryEvent event) {

        for (Item item : ITEMS) {
            ModelLoader.setCustomModelResourceLocation(
                    item,
                    0,
                    new ModelResourceLocation(item.getRegistryName(), "inventory")
            );
        }
    }
}

