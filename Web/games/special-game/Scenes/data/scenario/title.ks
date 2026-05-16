*start
[cm]
[clearfix]
@clearstack
@hidemenubutton
@layopt layer=message visible=false
@layopt layer=message0 visible=false
@layopt layer=message1 visible=false
@layopt layer=fix visible=true
@bg storage="bg_aoyama.png" time=300
@wait time=150
@layopt layer=fix visible=true
[ptext name="title_logo" layer="fix" x="0" y="160" width="1280" align="center" size="76" bold="true" color="0xFFFFFF" edge="8px 0xFF5A8A" text="のぞみさメモリアル"]
[ptext name="title_sub" layer="fix" x="0" y="260" width="1280" align="center" size="22" bold="true" color="0xFFFFFF" edge="3px 0x000000" text="5つの記念日を、あなたの選択で振り返る"]

[glink text="はじめる" size="34" width="520" x="380" y="360" color="gs_choice" font_color="0xFFFFFF" edge="3px 0xFF5A8A" target="gamestart"]
[glink text="クレジット" size="26" width="520" x="380" y="480" color="gs_choice" font_color="0xFFFFFF" edge="3px 0xFF5A8A" target="credits"]

[s]

*credits
[cm]
[clearfix]
@bg storage="bg_aoyama.png" time=0
@layopt layer=fix visible=true
[ptext name="credits_text_1" layer="fix" x="0" y="290" width="1280" align="center" size="22" bold="true" color="0xFFFFFF" edge="3px 0x000000" text="制作：新郎新婦"]
[ptext name="credits_text_1" layer="fix" x="0" y="320" width="1280" align="center" size="22" bold="true" color="0xFFFFFF" edge="3px 0x000000" text="Special Thanks：本日のゲストのみなさま"]
[ptext name="credits_text_2" layer="fix" x="0" y="350" width="1280" align="center" size="22" bold="true" color="0xFFFFFF" edge="3px 0x000000" text="エンジン：TyranoScript"]
[glink text="戻る" size="26" width="520" x="380" y="520" color="gs_choice" font_color="0xFFFFFF" edge="3px 0xFF5A8A" target="back_to_title"]
[s]

*back_to_title
[free layer="fix" name="credits_text"]
@jump target="start"

[s]

*gamestart
[cm]
[clearfix]
@layopt layer=fix visible=false
@jump storage="scene1.ks" target="start"
