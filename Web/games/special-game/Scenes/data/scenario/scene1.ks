*start
[cm]
[clearfix]
[start_keyconfig]

@showmenubutton

[position layer="message0" left=120 top=470 width=1040 height=220 page=fore visible=true]
[position layer="message0" page=fore margint="54" marginl="56" marginr="56" marginb="56"]
@layopt layer=message0 visible=true
@layopt layer=fix visible=true

[ptext name="chara_name_area" layer="message0" color="0xFFFFFF" size=28 bold=true x=150 y=484]
[chara_config ptext="chara_name_area"]
[chara_config vertical="true"]

[chara_new name="groom" storage="chara_groom_20231226.png" jname="のぞむ"]
[chara_face name="groom" face="20230520" storage="chara_groom_20230520.png"]
[chara_face name="groom" face="20231226" storage="chara_groom_20231226.png"]
[chara_face name="groom" face="20250225" storage="chara_groom_20250225.png"]
[chara_face name="groom" face="20250405" storage="chara_groom_20250405.png"]
[chara_face name="groom" face="20260517" storage="chara_groom_20260517.png"]
[chara_new name="bride" storage="chara_bride_20231226.png" jname="みさと"]
[chara_face name="bride" face="20230520" storage="chara_bride_20230520.png"]
[chara_face name="bride" face="20231226" storage="chara_bride_20231226.png"]
[chara_face name="bride" face="20250225" storage="chara_bride_20250225.png"]
[chara_face name="bride" face="20250405" storage="chara_bride_20250405.png"]
[chara_face name="bride" face="20260517" storage="chara_bride_20260517.png"]

[eval exp="f.love = 0"]
@jump target="ep1"

[s]

*date_20230520
[eval exp="f.date = '2023/05/20'"]
[ptext name="date_label" layer="fix" x="18" y="14" width="360" size="24" bold="true" color="0xFFFFFF" edge="3px 0x000000" overwrite="true" text=&f.date]
[ptext name="date_telop" layer="fix" x="0" y="270" width="1280" align="center" size="70" bold="true" color="0xFF5A8A" edge="6px 0xFFFFFF" overwrite="true" text=&f.date]
[anim name="date_telop" top="-=40" opacity="0" time="900" effect="easeOutCubic"]
[wa]
[free layer="fix" name="date_telop"]
[chara_mod name="groom" face="20230520" time="0"]
[chara_mod name="bride" face="20230520" time="0"]
[return]

[s]

*date_20231226
[eval exp="f.date = '2023/12/26'"]
[ptext name="date_label" layer="fix" x="18" y="14" width="360" size="24" bold="true" color="0xFFFFFF" edge="3px 0x000000" overwrite="true" text=&f.date]
[ptext name="date_telop" layer="fix" x="0" y="270" width="1280" align="center" size="70" bold="true" color="0xFF5A8A" edge="6px 0xFFFFFF" overwrite="true" text=&f.date]
[anim name="date_telop" top="-=40" opacity="0" time="900" effect="easeOutCubic"]
[wa]
[free layer="fix" name="date_telop"]
[chara_mod name="groom" face="20231226" time="0"]
[chara_mod name="bride" face="20231226" time="0"]
[return]

[s]

*date_20250225
[eval exp="f.date = '2025/02/25'"]
[ptext name="date_label" layer="fix" x="18" y="14" width="360" size="24" bold="true" color="0xFFFFFF" edge="3px 0x000000" overwrite="true" text=&f.date]
[ptext name="date_telop" layer="fix" x="0" y="270" width="1280" align="center" size="70" bold="true" color="0xFF5A8A" edge="6px 0xFFFFFF" overwrite="true" text=&f.date]
[anim name="date_telop" top="-=40" opacity="0" time="900" effect="easeOutCubic"]
[wa]
[free layer="fix" name="date_telop"]
[chara_mod name="groom" face="20250225" time="0"]
[chara_mod name="bride" face="20250225" time="0"]
[return]

[s]

*date_20250405
[eval exp="f.date = '2025/04/05'"]
[ptext name="date_label" layer="fix" x="18" y="14" width="360" size="24" bold="true" color="0xFFFFFF" edge="3px 0x000000" overwrite="true" text=&f.date]
[ptext name="date_telop" layer="fix" x="0" y="270" width="1280" align="center" size="70" bold="true" color="0xFF5A8A" edge="6px 0xFFFFFF" overwrite="true" text=&f.date]
[anim name="date_telop" top="-=40" opacity="0" time="900" effect="easeOutCubic"]
[wa]
[free layer="fix" name="date_telop"]
[chara_mod name="groom" face="20250405" time="0"]
[chara_mod name="bride" face="20250405" time="0"]
[return]

[s]

*date_20260517
[eval exp="f.date = '2026/05/17'"]
[ptext name="date_label" layer="fix" x="18" y="14" width="360" size="24" bold="true" color="0xFFFFFF" edge="3px 0x000000" overwrite="true" text=&f.date]
[ptext name="date_telop" layer="fix" x="0" y="270" width="1280" align="center" size="70" bold="true" color="0xFF5A8A" edge="6px 0xFFFFFF" overwrite="true" text=&f.date]
[anim name="date_telop" top="-=40" opacity="0" time="900" effect="easeOutCubic"]
[wa]
[free layer="fix" name="date_telop"]
[chara_mod name="groom" face="20260517" time="0"]
[chara_mod name="bride" face="20260517" time="0"]
[return]

[s]

*love_up_1
[eval exp="f.love = f.love + 1"]
[ptext name="love_telop" layer="fix" x="0" y="320" width="1280" align="center" size="64" bold="true" color="0xFF5A8A" edge="6px 0xFFFFFF" overwrite="true" text="♥ +1"]
[anim name="love_telop" top="-=60" opacity="0" time="850" effect="easeOutCubic"]
[wa]
[free layer="fix" name="love_telop"]
[return]

[s]

*love_up_2
[eval exp="f.love = f.love + 2"]
[ptext name="love_telop" layer="fix" x="0" y="320" width="1280" align="center" size="64" bold="true" color="0xFF5A8A" edge="6px 0xFFFFFF" overwrite="true" text="♥ +2"]
[anim name="love_telop" top="-=60" opacity="0" time="850" effect="easeOutCubic"]
[wa]
[free layer="fix" name="love_telop"]
[return]

[s]

*love_up_3
[eval exp="f.love = f.love + 3"]
[ptext name="love_telop" layer="fix" x="0" y="320" width="1280" align="center" size="64" bold="true" color="0xFF5A8A" edge="6px 0xFFFFFF" overwrite="true" text="♥ +3"]
[anim name="love_telop" top="-=60" opacity="0" time="850" effect="easeOutCubic"]
[wa]
[free layer="fix" name="love_telop"]
[return]

[s]

*ep1
@call target="date_20230520"
[bg storage="bg_shibuya.png" time="600"]
[chara_show name="groom" left="600" width="450" top="100"]
[chara_show name="bride" left="200" width="450" top="100"]

#みさと
渋谷のホームパーティ、来てくれてありがと〜。[p]
今日の企画はね…[p]
その名も「バケツプリンを作る会」！[p]

#のぞむ
字面の圧がすごい。[p]

#みさと
え、誰もプリンの作り方知らないの！？[p]
よく完成できたね…！[p]

#のぞむ
まっ！俺にかかればこれくらい余裕だね[p]

#みさと
はいっ！いただきま～す！[p]
[cm]
[glink color="gs_choice" font_color="0xFFFFFF" edge="3px 0xFF5A8A" storage="scene1.ks" target="ep1_a" size="26" x="340" y="210" width="600" text="美味しそう！いただきます！"]
[glink color="gs_choice" font_color="0xFFFFFF" edge="3px 0xFF5A8A" storage="scene1.ks" target="ep1_b" size="26" x="340" y="290" width="600" text="一口だけもらってもいい？"]
[glink color="gs_choice" font_color="0xFFFFFF" edge="3px 0xFF5A8A" storage="scene1.ks" target="ep1_c" size="26" x="340" y="370" width="600" text="俺はいいかな...笑"]
[s]

*ep1_a
[cm]
#のぞむ
思ったより美味しい[p]
#みさと
（危な～、レシピ間違ったのバレてなさそ～）[p]
ねー、おいしー[p]
@call target="love_up_2"
@jump target="ep1_after"

*ep1_b
[cm]
#のぞむ
一口だけ…もらっていい？[p]
#みさと
こんなにあるのに一口だけ！？[p]
もっと食べてほしいんだけど！！[p]
@call target="love_up_1"
@jump target="ep1_after"

*ep1_c
[cm]
#のぞむ
俺はこっちのカレーもらおうかな♪[p]
#みさと
バケツプリンを作る会でプリンを遠慮する..だと！？[p]
この人もしかしてやばい人？[p]
@call target="love_up_3"
@jump target="ep1_after"

*ep1_after
[cm]
#ナレーション
こうして、衝撃のバケツプリンが、ふたりの物語のスタートになったのでした。[p]
@jump target="ep2"

[s]

*ep2
@call target="date_20231226"
[bg storage="bg_enoshima.png" time="600"]
[chara_show name="groom" left="600" width="450" top="100"]
[chara_show name="bride" left="200" width="450" top="100"]

#のぞむ
冬の江の島といえばイルミネーションでしょ！。[p]
#みさと
江島神社でお参りも忘れずにね[p]

#のぞむ
外も大分暗くなってきたね[p]
#みさと
この後どうする？[p]
[cm]
[glink color="gs_choice" font_color="0xFFFFFF" edge="3px 0xFF5A8A" storage="scene1.ks" target="ep2_a" size="26" x="340" y="210" width="600" text="江の島シーキャンドルに登る"]
[glink color="gs_choice" font_color="0xFFFFFF" edge="3px 0xFF5A8A" storage="scene1.ks" target="ep2_b" size="26" x="340" y="290" width="600" text="温かい飲み物を買う"]
[glink color="gs_choice" font_color="0xFFFFFF" edge="3px 0xFF5A8A" storage="scene1.ks" target="ep2_c" size="26" x="340" y="370" width="600" text="暗いのは怖いので帰る"]
[s]

*ep2_a
[cm]
#のぞむ
折角だから展望台登ろうよ！[p]
#みさと
いいね、そうしよう！[p]
#のぞむ & みさと
...[p]
#のぞむ
え！やば！風強すぎ！寒すぎ！！爆笑[p]
#みさと
ねぇ！風強すぎてわたしの前髪ないんだけど！！[p]
@call target="love_up_3"
@jump target="ep2_after"

*ep2_b
[cm]
#のぞむ
温かいの飲も。あったまろ。[p]
#みさと
あったか～い、生き返った～！[p]
#のぞむ
ゾンビって…こと！？[p]
@call target="love_up_2"
@jump target="ep2_after"

*ep2_c
[cm]
#のぞむ
暗くなると怖いからもう帰ろーよー[p]
#みさと
おまえが言うんかい！[p]
@call target="love_up_1"
@jump target="ep2_after"

*ep2_after
[cm]
#ナレーション
冬の海風も、ふたりだと不思議と寒くない(そんなことない)。[p]
@jump target="ep3"

[s]

*ep3
@call target="date_20250225"
[bg storage="bg_ikebukuro.png" time="600"]
[chara_show name="groom" left="600" width="350" bottom="500"]
[chara_show name="bride" left="200" width="350" bottom="500"]

#のぞむ
今日みさちゃん誕生日だからご飯予約してあるよ！！[p]
#みさと
え、そうなの！？(知ってたけどね☆)[p]
#のぞむ
みさちゃん、[p]
[cm]
[glink color="gs_choice" font_color="0xFFFFFF" edge="3px 0xFF5A8A" storage="scene1.ks" target="ep3_a" size="26" x="340" y="210" width="600" text="君の瞳に乾杯！"]
[glink color="gs_choice" font_color="0xFFFFFF" edge="3px 0xFF5A8A" storage="scene1.ks" target="ep3_b" size="26" x="340" y="290" width="600" text="誕生日おめでとう！"]
[glink color="gs_choice" font_color="0xFFFFFF" edge="3px 0xFF5A8A" storage="scene1.ks" target="ep3_c" size="26" x="340" y="370" width="600" text="結婚してください！"]
[s]

*ep3_a
[cm]
#のぞむ
Here’s looking at you, kid.[p]
#みさと
は？なに？なんて？[p]
#のぞむ
「君の瞳に乾杯」って言ったのさッ[p]
#みさと
へー面白いね(棒)[p]
@call target="love_up_1"
@jump target="ep3_after"

*ep3_b
[cm]
#のぞむ
誕生日おめでとう！！[p]
新しい一年も素晴らしい年にしようね！[p]
#みさと
ありがとう！[p]
27歳はのぞと出会えて楽しかったから、28歳はそれを超えようね！[p]
@call target="love_up_2"
@jump target="ep3_after"

*ep3_c
[cm]
#スタッフ
「失礼します」[p]
「お誕生日おめでとうございます！」[p]
#みさと
え、すごい！
なになに！？[p]
#のぞむ
結婚してください！[p]
#みさと
っ！！[p]
はい、よろしくお願いします！[p]
@call target="love_up_3"
@jump target="ep3_after"

*ep3_after
[cm]
#ナレーション
こうして、ふたりは未来への約束を交わしました。[p]
この日の花束は、押し花となり今も2人を見守ってくれています。[p]
@jump target="ep4"

[s]

*ep4
@call target="date_20250405"
[bg storage="bg_inokashira.png" time="600"]
[chara_show name="groom" left="600" width="450" top="100"]
[chara_show name="bride" left="200" width="450" top="100"]

#のぞむ
今日はみさちゃん企画でデート！天気めっちゃいいし楽しみ！[p]
#みさと
井の頭公園からのボールペン作り！[p]
桜もめっちゃ綺麗だったね！[p]
#のぞむ
だらけた猿もよかったし、うさぎカフェも可愛かった！[p]
#みさと
実はこの後...[p]

[cm]
[glink color="gs_choice" font_color="0xFFFFFF" edge="3px 0xFF5A8A" storage="scene1.ks" target="ep4_a" size="26" x="340" y="210" width="600" text="おしゃれなバー予約してるんだ！"]
[glink color="gs_choice" font_color="0xFFFFFF" edge="3px 0xFF5A8A" storage="scene1.ks" target="ep4_b" size="26" x="340" y="290" width="600" text="クルージングの予約してるんだ！"]
[glink color="gs_choice" font_color="0xFFFFFF" edge="3px 0xFF5A8A" storage="scene1.ks" target="ep4_c" size="26" x="340" y="370" width="600" text="サプライズプレゼントがあるんだ！"]
[s]

*ep4_a
[cm]
#みさと
前から一緒に行きたいと思ってたバーがあるんだ！[p]
#のぞむ
うわぁ、おしゃれ！[p]
まだ飲んでないのに雰囲気に酔いそう～[p]
#みさと
へへ、たまにはこういうのもいいでしょ！[p]
@call target="love_up_1"
@jump target="ep4_after"

*ep4_b
[cm]
#みさと
前からクルージングしたいって言ってたから予約したよ！[p]
#のぞむ
えっ！？嬉しい！！[p]
景色がきれいだし、風も気持ちいい！[p]
#みさと
さらに！はい！！[p]
私と結婚してくれますね？[p]
#のぞむ
え！なに！？花束まで！？！？[p]
#みさと
プロポーズされてみたかったって言ってたでしょ？[p]
#のぞむ
言ってた！ありがとう！大好き！結婚する！[p]
@call target="love_up_3"
@jump target="ep4_after"

*ep4_c
[cm]
#みさと
じゃーん、婚姻届を自作したよ！
#のぞむ
え！？婚姻届けって自作できるの！？[p]
#みさと
いっぱい調べたんだから！[p]
作ったボールペンで一緒に書こうね[p]
@call target="love_up_2"
@jump target="ep4_after"

*ep4_after
[cm]
#ナレーション
サプライズ大成功！ふたりの伝説が増えました。[p]
この日の花束は、ドライ加工され今もドームの中で輝いています。[p]
@jump target="ep5"

[s]

*ep5
@call target="date_20260517"
[bg storage="bg_aoyama.png" time="600"]
[chara_show name="groom" left="600" width="450" top="100"]
[chara_show name="bride" left="200" width="450" top="100"]

#のぞむ
ついに来たね、この日が[p]
カサ・デ・アンジェラ青山。めっちゃ緊張する～[p]
#みさと
うん。今日までたくさん準備頑張った。[p]
ドキドキとわくわくで胸いっぱいだよ～[p]
#のぞむ & みさと
それではみなさん、[p]
[cm]
[glink color="gs_choice" font_color="0xFFFFFF" edge="3px 0xFF5A8A" storage="scene1.ks" target="ep5_a" size="26" x="340" y="210" width="600" text="感謝を伝える"]
[glink color="gs_choice" font_color="0xFFFFFF" edge="3px 0xFF5A8A" storage="scene1.ks" target="ep5_b" size="26" x="340" y="290" width="600" text="誓いを立てる"]
[glink color="gs_choice" font_color="0xFFFFFF" edge="3px 0xFF5A8A" storage="scene1.ks" target="ep5_c" size="26" x="340" y="370" width="600" text="深呼吸する"]
[s]

*ep5_a
[cm]
#のぞむ & みさと
本日はお越しいただきありがとうございます。[p]
#みさと
オープニングムービーは楽しんで頂けたでしょうか？[p]
編みぐるみも席札もエスコートカードも手作りで頑張りました[p]
#のぞむ
色々な所に2人らしいこだわりが詰め込まれていますので、たくさん楽しんでいってください![p]
@call target="love_up_2"
@jump target="ending"

*ep5_b
[cm]
#のぞむ & みさと
私たち結婚しました。[p]
#のぞむ
これから幸せいっぱい、笑顔いっぱいの家庭を気付いていきます[p]
#みさと
辛い時も家族で支えあっていきます[p]
今日はそんな二人の式を楽しんでいってください[p]
@call target="love_up_3"
@jump target="ending"

*ep5_c
[cm]
#のぞむ & みさと
深呼吸しましょう。せーの[p]
#みさと
すぅ…はぁ…！[p]
緊張してるの、私たちだけじゃないかもしれないからね！[p]
@call target="love_up_1"
@jump target="ending"

*ending
[cm]
#結果
好感度（ふたりのときめきメモリー）：[font color="0x222222" size=42 bold=true][emb exp="f.love"][resetfont][p]

[if exp="f.love >= 12"]
#のぞむ
好感度MAX！[p]
今日の主役は…ふたりと、ここにいる全員です。[p]
[elsif exp="f.love >= 8"]
#のぞむ
ときめき充分！[p]
ここから先は、毎日が新章だね。[p]
[else]
#のぞむ
ときめきは、これからどんどん育つタイプ。[p]
伸びしろしかない！[p]
[endif]

#みさと
『のぞみさメモリアル』を遊んでくれてありがとう。[p]
それでは披露宴、最後まで楽しんでね！[p]

@jump storage="title.ks" target="start"

[s]
