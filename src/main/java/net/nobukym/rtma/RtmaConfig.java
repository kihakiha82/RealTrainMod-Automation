package net.nobukym.rtma;

import net.minecraftforge.common.config.Config;
import net.minecraftforge.common.config.ConfigManager;
import net.minecraftforge.fml.client.event.ConfigChangedEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;

/**
 * RTMAの設定。
 *
 * Forgeの@Configシステムを使うことで、設定ファイル(config/rtma.cfg)への永続化と、
 * MOD一覧画面の「Config」ボタンから開けるゲーム内設定GUIの両方を、
 * 自前のGuiScreenを書かずに得られる。
 */
@Config(modid = Rtma.MODID, name = "rtma")
public class RtmaConfig {

    @Config.Comment({
            "時間システムの種類。",
            "VANILLA: バニラのworldTime(24000tick=1日の昼夜サイクル)をそのまま使う",
            "RTMA: 独自の24時間/365日カレンダーを使う(実時間1:1。ゲームを起動している間だけ進む)",
            "切り替えはワールドの再読み込み(再ログイン)で反映される"
    })
    @Config.RequiresWorldRestart
    public static TimeMode timeMode = TimeMode.VANILLA;

    public enum TimeMode {
        VANILLA,
        RTMA
    }

    @Mod.EventBusSubscriber(modid = Rtma.MODID)
    private static class EventHandler {
        @SubscribeEvent
        public static void onConfigChanged(ConfigChangedEvent.OnConfigChangedEvent event) {
            if (event.getModID().equals(Rtma.MODID)) {
                ConfigManager.sync(Rtma.MODID, Config.Type.INSTANCE);
            }
        }
    }
}