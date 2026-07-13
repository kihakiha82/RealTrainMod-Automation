package net.nobukym.rtma.data; // ※ご自身の環境に合わせて変更してください

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.mojang.authlib.GameProfile;
import com.mojang.authlib.properties.Property;
import net.minecraft.entity.player.EntityPlayer;
import net.nobukym.rtma.Rtma;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.InputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.UUID;

public class GetPlayerHead {

    /**
     * プレイヤーの顔部分だけを切り抜いて保存します。
     * スキンデータが無い場合は、デフォルト（スティーブ/アレックス）を保存します。
     *
     * @param player 対象のプレイヤー (EntityPlayer)
     * @param outputDirectory 保存先のフォルダパス
     * @param fileName 保存するファイル名
     * @return 保存に成功した場合は true
     */
    public static boolean exportHeadLocal(EntityPlayer player, String outputDirectory, String fileName) {
        if (player == null) return false;

        BufferedImage fullSkin = null;

        // 1. 公式スキンURLを取得
        String skinUrl = getOfficialSkinUrl(player.getGameProfile());

        if (skinUrl != null) {
            try {
                // Mojangからスキンをダウンロード
                URL url = new URL(skinUrl);
                fullSkin = ImageIO.read(url);
            } catch (Exception e) {
                Rtma.LOGGER.error("スキンのダウンロードに失敗しました。デフォルトスキンを使用します。");
            }
        }

        // 2. スキンが無い（オフライン）、または取得失敗時のフォールバック処理
        if (fullSkin == null) {
            UUID uuid = player.getUniqueID();
            // Minecraft内部の仕様に則り、UUIDのハッシュ値からスティーブかアレックスかを判定
            boolean isAlex = (uuid.hashCode() & 1) == 1;
            String defaultSkinPath = isAlex ? "/assets/minecraft/textures/entity/alex.png" : "/assets/minecraft/textures/entity/steve.png";

            try (InputStream is = GetPlayerHead.class.getResourceAsStream(defaultSkinPath)) {
                if (is != null) {
                    fullSkin = ImageIO.read(is);
                } else {
                    Rtma.LOGGER.error("デフォルトスキンの読み込みに失敗しました: {}", defaultSkinPath);
                    return false;
                }
            } catch (Exception e) {
                e.printStackTrace();
                return false;
            }
        }

        try {
            // 保存先のディレクトリを確保
            Path dirPath = Paths.get(outputDirectory);
            if (!Files.exists(dirPath)) {
                Files.createDirectories(dirPath);
            }

            // 3. Web表示用に64x64ピクセルの空のキャンバスを作成
            BufferedImage headImage = new BufferedImage(64, 64, BufferedImage.TYPE_INT_ARGB);
            Graphics2D g2d = headImage.createGraphics();

            // ドット絵がぼやけないように設定
            g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR);

            // 4. ベースの顔部分（X:8, Y:8 から 8x8ピクセル）を切り抜いて 64x64 に拡大描画
            BufferedImage baseHead = fullSkin.getSubimage(8, 8, 8, 8);
            g2d.drawImage(baseHead, 0, 0, 64, 64, null);

            // 5. 帽子などの第2レイヤー（X:40, Y:8 から 8x8ピクセル）を重ね書き
            // ※スティーブ/アレックスのデフォルトスキンも1.12.2では64x64なので安全に処理可能
            if (fullSkin.getHeight() >= 64) {
                BufferedImage overlay = fullSkin.getSubimage(40, 8, 8, 8);
                // レイヤーが完全に透明でない（何かしら描かれている）場合のみ描画したいですが、
                // graphics2Dは透明色を上書きしても問題ないためそのまま描画します。
                g2d.drawImage(overlay, 0, 0, 64, 64, null);
            }

            g2d.dispose();

            // 6. PNGファイルとして書き出し
            File outputFile = dirPath.resolve(fileName).toFile();
            ImageIO.write(headImage, "png", outputFile);

            Rtma.LOGGER.info("[GetPlayerHead] 顔画像を生成・保存しました: {}",outputFile.getAbsolutePath());
            return true;

        } catch (Exception e) {
            Rtma.LOGGER.error("[GetPlayerHead] 顔画像の生成に失敗しました: {}" , e.getMessage());
            e.printStackTrace();
            return false;
        }
    }

    /**
     * GameProfileの暗号化されたプロパティを解読し、Mojang公式のテクスチャURLを取得します。
     */
    private static String getOfficialSkinUrl(GameProfile profile) {
        if (profile == null || profile.getProperties() == null) return null;

        for (Property property : profile.getProperties().get("textures")) {
            try {
                // Base64でエンコードされているJSONデータをデコード
                String decodedJson = new String(Base64.getDecoder().decode(property.getValue()), StandardCharsets.UTF_8);

                // GsonでJSONをパース
                JsonObject jsonObject = new JsonParser().parse(decodedJson).getAsJsonObject();
                JsonObject textures = jsonObject.getAsJsonObject("textures");

                // SKIN要素があれば、そのURLを返す
                if (textures != null && textures.has("SKIN")) {
                    return textures.getAsJsonObject("SKIN").get("url").getAsString();
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        return null;
    }
}