package net.nobukym.rtma.command;

import net.minecraft.command.CommandBase;
import net.minecraft.command.CommandException;
import net.minecraft.command.ICommandSender;
import net.minecraft.server.MinecraftServer;
import net.minecraft.util.text.TextComponentString;
import net.minecraft.world.WorldServer;
import net.nobukym.rtma.rail.RailWorldScanner;

/**
 * 未ロードチャンク領域のレールをディスクから直接スキャンし、rails.jsonに
 * 初回登録するための運用者向けコマンド。
 *
 * ワールド規模によっては数秒〜数十秒かかる可能性があるため、tick処理には
 * 組み込まず、明示的にオペレーターが叩く運用にしている。
 *
 * 使い方: /rtmarescan
 */
public class CommandRescanRails extends CommandBase {

    @Override
    public String getName() {
        return "rtmarescan";
    }

    @Override
    public String getUsage(ICommandSender sender) {
        return "/rtmarescan - 未ロードチャンクのレールをディスクから再スキャンし、rails.jsonに初回登録します";
    }

    @Override
    public int getRequiredPermissionLevel() {
        return 2; // OP専用
    }

    @Override
    public void execute(MinecraftServer server, ICommandSender sender, String[] args) throws CommandException {
        sender.sendMessage(new TextComponentString(
                "RTMA: 未ロードチャンクのスキャンを開始します(ワールド規模によっては時間がかかります)..."));

        WorldServer world = server.getWorld(0);
        RailWorldScanner.ScanResult result = RailWorldScanner.scanAndSeed(world);

        sender.sendMessage(new TextComponentString(String.format(
                "RTMA: 完了。%dチャンクを走査し、%d件のレールを新規登録しました。",
                result.scannedChunks, result.addedSegments)));
    }
}