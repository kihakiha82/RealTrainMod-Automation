package net.nobukym.rtma.gui;

import com.mojang.realmsclient.gui.ChatFormatting;
import net.minecraft.client.gui.GuiButton;
import net.minecraft.client.gui.GuiScreen;
import net.minecraft.client.gui.GuiTextField;
import net.minecraft.client.gui.inventory.GuiContainer;
import net.minecraft.client.renderer.GlStateManager;
import net.minecraft.inventory.Container;
import net.minecraft.server.MinecraftServer;
import net.minecraft.util.ResourceLocation;
import net.minecraft.util.text.ITextComponent;
import net.minecraft.util.text.TextComponentString;
import net.minecraft.util.text.TextFormatting;
import net.minecraft.world.World;
import net.minecraft.world.WorldServer;
import net.minecraftforge.fml.common.FMLCommonHandler;
import net.nobukym.rtma.Rtma;
import net.nobukym.rtma.time.RtmaCalendarData;
import net.nobukym.rtma.time.RtmaDateTime;
import net.nobukym.rtma.time.RtmaTimeExporter;
import org.lwjgl.input.Keyboard;

import java.io.IOException;
import java.time.Month;

public class GuiGWatch extends GuiScreen {

    private SlideBar hourSlider;
    private SlideBar minuteSlider;
    private SlideBar secondSlider;

    private SlideBar focusedSlider = null;

    private int lastSliderHour = -1;
    private int lastSliderMinute = -1;
    private int lastSliderSecond = -1;


    private static final ResourceLocation GUI_TEXTURE =
            new ResourceLocation(Rtma.MODID,
                    "textures/gui/genesis_pocketwatch_gui.png");

    private static final int GUI_WIDTH = 240;
    private static final int GUI_HEIGHT = 240;

    private int guiLeft;
    private int guiTop;

    private RtmaDateTime currentDateTime;
    private RtmaDateTime editingDateTime;

    private CalendarGrid calendarGrid;

    private GuiTextField yearField;
    private GuiTextField monthField;
    private GuiTextField dayField;

    private GuiTextField hourField;
    private GuiTextField minuteField;
    private GuiTextField secondField;

    private boolean yearFieldFocused = false;
    private boolean monthFieldFocused = false;
    private boolean dayFieldFocused = false;

    private boolean hourFieldFocused = false;
    private boolean minuteFieldFocused = false;
    private boolean secondFieldFocused = false;



    public GuiGWatch() {
    }

    @Override
    public void drawScreen(int mouseX, int mouseY, float partialTicks) {

        int month = RtmaDateTime.toMonth(currentDateTime.getYear(), currentDateTime.getDayOfYear());
        int dayOfMonth = RtmaDateTime.toDayOfMonth(currentDateTime.getYear(), currentDateTime.getDayOfYear());

        drawDefaultBackground();

        mc.getTextureManager().bindTexture(GUI_TEXTURE);
        drawTexturedModalRect(
                guiLeft,
                guiTop,
                0,
                0,
                GUI_WIDTH,
                GUI_HEIGHT);

        fontRenderer.drawString(
                "RTMA Time Controller",
                guiLeft + 5,
                guiTop + 5,
                0x404040);

        //現在時刻表示
        fontRenderer.drawString(
                "Current",
                guiLeft + 15,
                guiTop + 20,
                0x404040);

        fontRenderer.drawString(
                String.format("%04d/%02d/%02d",
                        currentDateTime.getYear(),
                        month,dayOfMonth),
                guiLeft + 15,
                guiTop + 30,
                0x0D0D0D);

        fontRenderer.drawString(
                String.format("%02d:%02d:%02d",
                        currentDateTime.getHour(),
                        currentDateTime.getMinute(),
                        currentDateTime.getSecond()),
                guiLeft + 15,
                guiTop + 41,
                0x0D0D0D);
        //現在時刻表示

        //修正時刻表示
        fontRenderer.drawString(
                "Arrival",
                guiLeft + 130,
                guiTop + 20,
                0x404040);

        yearField.drawTextBox();
        monthField.drawTextBox();
        dayField.drawTextBox();
        fontRenderer.drawString("/", guiLeft + 161, guiTop + 30, 0xe0e0e0);
        fontRenderer.drawString("/", guiLeft + 189, guiTop + 30, 0xe0e0e0);

        hourField.drawTextBox();
        minuteField.drawTextBox();
        secondField.drawTextBox();
        fontRenderer.drawString(":", guiLeft + 151, guiTop + 41, 0xe0e0e0);
        fontRenderer.drawString(":", guiLeft + 179, guiTop + 41, 0xe0e0e0);
        //修正時刻表示

        updateEditingFields();
        // 現在の状態を保存

        calendarGrid.draw(fontRenderer, mouseX, mouseY);

        GlStateManager.color(1F, 1F, 1F, 1F);
        hourSlider.drawButton(
                mc,
                mouseX,
                mouseY,
                partialTicks);

        minuteSlider.drawButton(
                mc,
                mouseX,
                mouseY,
                partialTicks);

        secondSlider.drawButton(
                mc,
                mouseX,
                mouseY,
                partialTicks);

        getSliderValue();


        super.drawScreen(mouseX, mouseY, partialTicks);
    }


    @Override
    public void initGui() {

        super.initGui();

        MinecraftServer server = FMLCommonHandler.instance().getMinecraftServerInstance();
        if (server == null) return;
        // worlds[0]は配列の格納順に依存してしまうため、
        // ディメンションIDを明示してオーバーワールドを取得する
        WorldServer world = server.getWorld(0);

        RtmaCalendarData calendar = RtmaCalendarData.get(world);

        currentDateTime = calendar.getCurrentDateTime();
        editingDateTime = calendar.getCurrentDateTime();

        int month = RtmaDateTime.toMonth(currentDateTime.getYear(), currentDateTime.getDayOfYear());
        int dayOfMonth = RtmaDateTime.toDayOfMonth(currentDateTime.getYear(), currentDateTime.getDayOfYear());

        guiLeft = (width - GUI_WIDTH) / 2;
        guiTop = (height - GUI_HEIGHT) / 2;

        buttonList.clear();

        buttonList.add(new GuiButton(
                0,
                guiLeft + 10,
                guiTop + 210,
                100,
                20,
                "キャンセル"));

        buttonList.add(new GuiButton(
                1,
                guiLeft + 130,
                guiTop + 210,
                100,
                20,
                "完了"));

        yearField = new GuiTextField(
                0,
                fontRenderer,
                guiLeft + 130,
                guiTop + 29,
                38,
                10);
        yearField.setText(String.valueOf(currentDateTime.getYear()));
        yearField.setMaxStringLength(4);


        monthField = new GuiTextField(
                1,
                fontRenderer,
                guiLeft + 168,
                guiTop + 29,
                28,
                10);
        monthField.setText(String.format("%02d", month));
        monthField.setMaxStringLength(2);

        dayField = new GuiTextField(
                2,
                fontRenderer,
                guiLeft + 196,
                guiTop + 29,
                28,
                10);
        dayField.setText(String.format("%02d", dayOfMonth));
        dayField.setMaxStringLength(2);

        hourField = new GuiTextField(
                3,
                fontRenderer,
                guiLeft + 130,
                guiTop + 40,
                28,
                10);
        hourField.setText(String.format("%02d", currentDateTime.getHour()));
        hourField.setMaxStringLength(2);

        minuteField = new GuiTextField(
                4,
                fontRenderer,
                guiLeft + 158,
                guiTop + 40,
                28,
                10);
        minuteField.setText(String.format("%02d", currentDateTime.getMinute()));
        minuteField.setMaxStringLength(2);

        secondField = new GuiTextField(
                5,
                fontRenderer,
                guiLeft + 186,
                guiTop + 40,
                28,
                10);
        secondField.setText(String.format("%02d", currentDateTime.getSecond()));
        minuteField.setMaxStringLength(2);

        int sliderY = guiTop + 150;

        hourSlider = new SlideBar(
                10,
                guiLeft + 20,
                sliderY,
                200,
                24);

        minuteSlider = new SlideBar(
                13,
                guiLeft + 20,
                sliderY + 20,
                200,
                60);

        secondSlider = new SlideBar(
                15,
                guiLeft + 20,
                sliderY + 40,
                200,
                60);

        hourSlider.setValue(currentDateTime.getHour());
        minuteSlider.setValue(currentDateTime.getMinute());
        secondSlider.setValue(currentDateTime.getSecond());

        lastSliderHour = hourSlider.getValue();
        lastSliderMinute = minuteSlider.getValue();
        lastSliderSecond = secondSlider.getValue();

        hourSlider.setFocused(false);
        minuteSlider.setFocused(false);
        secondSlider.setFocused(false);

        calendarGrid = new CalendarGrid(
                guiLeft + 20,
                guiTop + 54,
                currentDateTime.getYear(),
                month,
                dayOfMonth);

    }

    @Override
    protected void mouseReleased(int mouseX,
                                 int mouseY,
                                 int state) {

        super.mouseReleased(mouseX, mouseY, state);

        hourSlider.mouseReleased(mouseX, mouseY);
        minuteSlider.mouseReleased(mouseX, mouseY);
        secondSlider.mouseReleased(mouseX, mouseY);

    }

    @Override
    protected void mouseClickMove(int mouseX,
                                  int mouseY,
                                  int clickedMouseButton,
                                  long timeSinceLastClick) {

        super.mouseClickMove(
                mouseX,
                mouseY,
                clickedMouseButton,
                timeSinceLastClick);

        hourSlider.mouseDragged(mouseX);
        minuteSlider.mouseDragged(mouseX);
        secondSlider.mouseDragged(mouseX);

    }

    @Override
    protected void mouseClicked(int mouseX,
                                int mouseY,
                                int mouseButton) throws IOException {

        super.mouseClicked(mouseX, mouseY, mouseButton);

        yearField.mouseClicked(mouseX, mouseY, mouseButton);
        monthField.mouseClicked(mouseX, mouseY, mouseButton);
        dayField.mouseClicked(mouseX, mouseY, mouseButton);

        hourField.mouseClicked(mouseX, mouseY, mouseButton);
        minuteField.mouseClicked(mouseX, mouseY, mouseButton);
        secondField.mouseClicked(mouseX, mouseY, mouseButton);

        int selectedDay = calendarGrid.mouseClicked(mouseX, mouseY);

        if (selectedDay > 0) {

            long year = calendarGrid.getViewYear();
            int month = calendarGrid.getViewMonth();

            yearField.setText(String.valueOf(year));
            monthField.setText(String.format("%02d", month));
            dayField.setText(String.format("%02d", selectedDay));

            updateEditingDateTime();
        }

        hourSlider.mousePressed(
                mc,
                mouseX,
                mouseY);
        minuteSlider.mousePressed(
                mc,
                mouseX,
                mouseY);
        secondSlider.mousePressed(
                mc,
                mouseX,
                mouseY);

        if (hourSlider.mousePressed(mc, mouseX, mouseY)) {
            focusedSlider = hourSlider;
            hourSlider.setFocused(true);

            minuteSlider.setFocused(false);
            secondSlider.setFocused(false);

        } else if (minuteSlider.mousePressed(mc, mouseX, mouseY)) {
            focusedSlider = minuteSlider;
            minuteSlider.setFocused(true);

            hourSlider.setFocused(false);
            secondSlider.setFocused(false);

        } else if (secondSlider.mousePressed(mc, mouseX, mouseY)) {
            focusedSlider = secondSlider;
            secondSlider.setFocused(true);

            hourSlider.setFocused(false);
            minuteSlider.setFocused(false);

        } else {
            // スライダー以外の場所をクリックしたらフォーカスを外す場合
            focusedSlider = null;
            hourSlider.setFocused(false);
            minuteSlider.setFocused(false);
            secondSlider.setFocused(false);
        }

    }

    @Override
    protected void keyTyped(char typedChar, int keyCode) throws IOException {

        if (yearField.textboxKeyTyped(typedChar, keyCode)) return;
        if (monthField.textboxKeyTyped(typedChar, keyCode)) return;
        if (dayField.textboxKeyTyped(typedChar, keyCode)) return;

        if (hourField.textboxKeyTyped(typedChar, keyCode)) return;
        if (minuteField.textboxKeyTyped(typedChar, keyCode)) return;
        if (secondField.textboxKeyTyped(typedChar, keyCode)) return;


        super.keyTyped(typedChar, keyCode);

    }

    @Override
    public void updateScreen() {
        super.updateScreen();

        if (Keyboard.isKeyDown(Keyboard.KEY_LEFT)) {

            if (this.focusedSlider == this.hourSlider) {

                int currentHour = hourSlider.getValue();
                hourSlider.setValue(currentHour - 1);
            }

            if (this.focusedSlider == this.minuteSlider) {

                int currentHour = minuteSlider.getValue();
                minuteSlider.setValue(currentHour - 1);
            }

            if (this.focusedSlider == this.secondSlider) {

                int currentHour = secondSlider.getValue();
                secondSlider.setValue(currentHour - 1);
            }

        }

        if (Keyboard.isKeyDown(Keyboard.KEY_RIGHT)) {
            if (this.focusedSlider == this.hourSlider) {

                int currentHour = hourSlider.getValue();
                hourSlider.setValue(currentHour + 1);
            }
            if (this.focusedSlider == this.minuteSlider) {

                int currentHour = minuteSlider.getValue();
                minuteSlider.setValue(currentHour + 1);
            }
            if (this.focusedSlider == this.secondSlider) {
                
                int currentHour = secondSlider.getValue();
                secondSlider.setValue(currentHour + 1);
            }
        }


    }


    private void getSliderValue() {
        int sliderHour = hourSlider.getValue();
        int sliderMinute = minuteSlider.getValue();
        int sliderSecond = secondSlider.getValue();
        if (sliderHour != lastSliderHour || sliderMinute != lastSliderMinute || sliderSecond != lastSliderSecond) {
            lastSliderHour = sliderHour;
            lastSliderMinute = sliderMinute;
            lastSliderSecond = sliderSecond;
            applyToFieldsHMS(sliderHour,sliderMinute,sliderSecond);
        }


    }

    private void applyToFieldsHMS(int hour, int minute, int second) {

        editingDateTime.setDateTime(
                editingDateTime.getYear(),
                editingDateTime.getDayOfYear(),
                hour,
                minute,
                second
        );

        hourField.setText(String.format("%02d", hour));
        minuteField.setText(String.format("%02d", minute));
        secondField.setText(String.format("%02d", second));
    }

    private void updateEditingFields() {
        if (yearFieldFocused && !yearField.isFocused()) {
            updateEditingDateTime();
        }
        yearFieldFocused = yearField.isFocused();

        if (monthFieldFocused && !monthField.isFocused()) {
            updateEditingDateTime();
        }
        monthFieldFocused = monthField.isFocused();

        if (dayFieldFocused && !dayField.isFocused()) {
            updateEditingDateTime();
        }
        dayFieldFocused = dayField.isFocused();

        if (hourFieldFocused && !hourField.isFocused()) {
            updateEditingDateTime();
        }
        hourFieldFocused = hourField.isFocused();

        if (minuteFieldFocused && !minuteField.isFocused()) {
            updateEditingDateTime();
        }
        minuteFieldFocused = minuteField.isFocused();

        if (secondFieldFocused && !secondField.isFocused()) {
            updateEditingDateTime();
        }
        secondFieldFocused = secondField.isFocused();

    }

    private void updateEditingDateTime() {

        try {
            int year = Integer.parseInt(yearField.getText());
            int month = Integer.parseInt(monthField.getText());
            int day = Integer.parseInt(dayField.getText());
            int hour = Integer.parseInt(hourField.getText());
            int minute = Integer.parseInt(minuteField.getText());
            int second = Integer.parseInt(secondField.getText());


            // editingDateTimeへ反映
            editingDateTime.setDateTime(
                    year,
                    RtmaDateTime.toDayOfYear(year, month, day),
                    hour,
                    minute,
                    second
            );

            hourSlider.setValue(hour);
            minuteSlider.setValue(minute);
            secondSlider.setValue(second);

        } catch (NumberFormatException e) {

            // 数値でなければ元の値に戻す
            yearField.setText(String.valueOf(currentDateTime.getYear()));
            monthField.setText(String.format("%02d",RtmaDateTime.toMonth(currentDateTime.getYear(), currentDateTime.getDayOfYear())));
            minuteField.setText(String.format("%02d",RtmaDateTime.toDayOfMonth(currentDateTime.getYear(), currentDateTime.getDayOfYear())));
            hourField.setText(String.format("%02d",currentDateTime.getHour()));
            minuteField.setText(String.format("%02d",currentDateTime.getMinute()));
            secondField.setText(String.format("%02d",currentDateTime.getSecond()));

        }
    }

    @Override
    protected void actionPerformed(GuiButton button) {

        switch (button.id) {

            case 0:

                mc.player.closeScreen();

                break;

            case 1:

                updateEditingDateTime();

                if(!currentDateTime.equals(editingDateTime)) {

                    MinecraftServer server = FMLCommonHandler.instance().getMinecraftServerInstance();
                    if (server == null) return;
                    // worlds[0]は配列の格納順に依存してしまうため、
                    // ディメンションIDを明示してオーバーワールドを取得する
                    WorldServer world = server.getWorld(0);

                    RtmaCalendarData calendar = RtmaCalendarData.get(world);

                    calendar.setDateTime(
                            editingDateTime.getYear(),
                            editingDateTime.getDayOfYear(),
                            editingDateTime.getHour(),
                            editingDateTime.getMinute(),
                            editingDateTime.getSecond()
                    );

                    RtmaTimeExporter.exportTime(world);

                    ITextComponent GwatchMs = new TextComponentString("[Genesis Pocket Watch]");
                    GwatchMs.getStyle().setBold(true);

                    ITextComponent GwatchMsInfo = new TextComponentString(" ...Timeline Transition Completed.");
                    GwatchMsInfo.getStyle().setBold(false).setItalic(true);

                    GwatchMs.appendSibling(GwatchMsInfo);
                    server.getPlayerList().sendMessage(GwatchMs);


                    ITextComponent PreviousTime = new TextComponentString(String.format("Previous: %04d/%02d/%02d(%s) %02d:%02d:%02d =>",
                            currentDateTime.getYear(),
                            RtmaDateTime.toMonth(currentDateTime.getYear(), currentDateTime.getDayOfYear()),
                            RtmaDateTime.toDayOfMonth(currentDateTime.getYear(), currentDateTime.getDayOfYear()),
                            RtmaDateTime.toDayOfWeek(currentDateTime.getYear(), currentDateTime.getDayOfYear()),
                            currentDateTime.getHour(),
                            currentDateTime.getMinute(),
                            currentDateTime.getSecond()));
                    PreviousTime.getStyle().setColor(TextFormatting.AQUA);
                    server.getPlayerList().sendMessage(PreviousTime);

                    ITextComponent ArrivalTime = new TextComponentString(String.format("Arrival: %04d/%02d/%02d(%s) %02d:%02d:%02d",
                            editingDateTime.getYear(),
                            RtmaDateTime.toMonth(editingDateTime.getYear(), editingDateTime.getDayOfYear()),
                            RtmaDateTime.toDayOfMonth(editingDateTime.getYear(), editingDateTime.getDayOfYear()),
                            RtmaDateTime.toDayOfWeek(editingDateTime.getYear(), editingDateTime.getDayOfYear()),
                            editingDateTime.getHour(),
                            editingDateTime.getMinute(),
                            editingDateTime.getSecond()));
                    ArrivalTime.getStyle().setColor(TextFormatting.LIGHT_PURPLE);
                    server.getPlayerList().sendMessage(ArrivalTime);


                } else {

                    MinecraftServer server = FMLCommonHandler.instance().getMinecraftServerInstance();
                    if (server == null) return;

                    ITextComponent GwatchMs = new TextComponentString("[Genesis Pocket Watch]");
                    GwatchMs.getStyle().setBold(true);

                    ITextComponent GwatchMsInfo = new TextComponentString(" ...You are already here.");
                    GwatchMsInfo.getStyle().setColor(TextFormatting.RED).setBold(false).setItalic(true);

                    GwatchMs.appendSibling(GwatchMsInfo);
                    server.getPlayerList().sendMessage(GwatchMs);

                }

                mc.player.closeScreen();

                break;
        }

    }



    @Override
    public boolean doesGuiPauseGame() {
        return super.doesGuiPauseGame();
    }

}
