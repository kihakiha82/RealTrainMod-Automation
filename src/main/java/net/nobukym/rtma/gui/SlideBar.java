package net.nobukym.rtma.gui;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Gui;
import net.minecraft.client.gui.GuiButton;
import net.minecraft.client.renderer.GlStateManager;
import net.minecraft.util.ResourceLocation;
import net.nobukym.rtma.Rtma;

import javax.swing.*;

public class SlideBar extends GuiButton {
    private double value;      // 0.0～1.0
    private boolean dragging;
    private boolean focusedSlider = false;


    private static final float TEX_SIZE = 256.0F; // 実際のpng全体サイズに合わせて変更
    private int STEP_COUNT = 0;


    private static final ResourceLocation KNOB_TEXTURE =
            new ResourceLocation(Rtma.MODID,
                    "textures/gui/genesis_pocketwatch_gui_slider_1.png");

    public SlideBar(int id,
                    int x,
                    int y,
                    int width,
                    int stepcount
                    ) {

        super(id, x, y, width, 20, "");

        value = 0.0;
        dragging = false;
        this.STEP_COUNT = stepcount;
    }


    @Override
    public void drawButton(Minecraft mc, int mouseX, int mouseY, float partialTicks) {

        if (!visible) {
            return;
        }



        mc.getTextureManager().bindTexture(KNOB_TEXTURE);
        drawTrack();


        int knobX = x + (int)(value * (width - 8));

        int knobTexX = dragging ? 8 : 0;

        mc.getTextureManager().bindTexture(KNOB_TEXTURE);
        drawTexturedModalRect(
                knobX,
                y,
                knobTexX,
                0,
                8,
                16);

        if (focusedSlider) {
            drawFocusLine();
        }


    }

    private void drawTrack() {

        int CAP_WIDTH = 4;      // 端キャップの幅(テクスチャ上のpx)
        int TRACK_HEIGHT = 8;

        int trackY = y + 4;

        // 左端キャップ(固定サイズ、そのまま描画)
        Gui.drawScaledCustomSizeModalRect(
                x, trackY,
                0, 16,                 // テクスチャ内の左端キャップの位置(u, v)
                CAP_WIDTH, TRACK_HEIGHT,
                CAP_WIDTH, TRACK_HEIGHT,
                TEX_SIZE, TEX_SIZE);

        // 中央部分(可変幅、中央1pxを引き伸ばす)
        int middleWidth = width - CAP_WIDTH * 2;
        if (middleWidth > 0) {
            Gui.drawScaledCustomSizeModalRect(
                    x + CAP_WIDTH, trackY,
                    CAP_WIDTH, 16,      // テクスチャ内の中央部分の開始位置
                    1, TRACK_HEIGHT,    // 元テクスチャからは1px分だけ切り出す
                    middleWidth, TRACK_HEIGHT, // それを必要な幅に引き伸ばす
                    TEX_SIZE, TEX_SIZE);
        }

        // 右端キャップ(固定サイズ、そのまま描画)
        Gui.drawScaledCustomSizeModalRect(
                x + width - CAP_WIDTH, trackY,
                CAP_WIDTH + 1, 16,      // テクスチャ内の右端キャップの位置
                CAP_WIDTH, TRACK_HEIGHT,
                CAP_WIDTH, TRACK_HEIGHT,
                TEX_SIZE, TEX_SIZE);
    }

    private void drawFocusLine() {

        int CAP_WIDTH = 1;      // 端キャップの幅(テクスチャ上のpx)
        int TRACK_HEIGHT = 18;

        int trackY = y - 1;
        int trackX = x - 2;

        // 左端キャップ(固定サイズ、そのまま描画)
        Gui.drawScaledCustomSizeModalRect(
                trackX, trackY,
                0, 24,                 // テクスチャ内の左端キャップの位置(u, v)
                0, TRACK_HEIGHT,
                CAP_WIDTH, TRACK_HEIGHT,
                TEX_SIZE, TEX_SIZE);

        // 中央部分(可変幅、真ん中の2pxパターンをループさせる)
        int middleWidth = width + 2;
        if (middleWidth > 0) {
            // ★ i += 2 で2pxずつ進める
            for (int i = 0; i < middleWidth; i += 2) {

                // 残りの幅が1pxだった場合の端数処理（ハミ出し防止）
                int drawWidth = Math.min(2, middleWidth - i);

                Gui.drawScaledCustomSizeModalRect(
                        trackX + CAP_WIDTH + i, trackY,
                        1, 24,      // テクスチャ内の中央部分（2pxパターンの開始位置）
                        drawWidth, TRACK_HEIGHT,    // ★テクスチャからdrawWidth(最大2px)分切り出す
                        drawWidth, TRACK_HEIGHT,    // ★そのままの幅で描画する
                        TEX_SIZE, TEX_SIZE);
            }
        }

        // 右端キャップ(固定サイズ、そのまま描画)
        Gui.drawScaledCustomSizeModalRect(
                trackX + width + 3, trackY,
                7, 24,      // テクスチャ内の右端キャップの位置
                0, TRACK_HEIGHT,
                CAP_WIDTH, TRACK_HEIGHT,
                TEX_SIZE, TEX_SIZE);
    }


    /**
     * 押された
     */
    @Override
    public boolean mousePressed(Minecraft mc, int mouseX, int mouseY) {

        boolean result = super.mousePressed(mc, mouseX, mouseY);

        if (result) {

            dragging = true;

            updateValue(mouseX);

        }

        return result;
    }

    /**
     * 離した
     */
    @Override
    public void mouseReleased(int mouseX, int mouseY) {

        dragging = false;
    }

    /**
     * ドラッグ
     */
    public void mouseDragged(int mouseX) {

        if (!dragging) {
            return;
        }

        updateValue(mouseX);
    }

    public void setFocused(boolean focused) {
        this.focusedSlider = focused;
    }

    /**
     * 値更新
     */
    private void updateValue(int mouseX) {

        double raw = (mouseX - x) / (double)(width - 8);

        if (raw < 0.0) raw = 0.0;
        if (raw > 1.0) raw = 1.0;

        // 24段階にスナップ
        value = snapToStep(raw);
    }

    private double snapToStep(double raw) {
        int step = (int)Math.round(raw * (STEP_COUNT - 1));
        return step / (double)(STEP_COUNT - 1);
    }


    public int getValue() {
        return (int)Math.round(value * (STEP_COUNT - 1));
    }

    public void setValue(int raw) {
        if (raw < 0) raw = 0;
        if (raw > STEP_COUNT - 1) raw = STEP_COUNT - 1;
        value = raw / (double)(STEP_COUNT - 1);
    }





}
