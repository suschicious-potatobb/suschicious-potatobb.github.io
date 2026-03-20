import os
import datetime
import json
import re
import tweepy
from google import genai

# Google Gemini APIを使用してトレンド情報を生成する
def get_latest_trends():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY is not set.")
        return get_mock_trends()

    client = genai.Client(api_key=api_key)
    today = datetime.date.today().strftime("%Y年%m月%d日")

    prompt = f"""
あなたは「Sushicious Games」の専属トレンドリサーチャーです。
「ゲーム業界」と「AI業界」と「寿司」の最新トレンド（本日{today}時点）を調査し、以下のJSON形式で出力してください。

# Rules
- 言語は日本語。
- summaryは今日のトレンド全体を2~5文で。
- titleは15文字以内、descは100文字以内。
- 実在するニュースのURLを含めること。
- 出力は純粋なJSONのみ。マークダウンのバッククォートなどは含めないでください。

# Output Format (JSON)
{{
  "date": "{today}",
  "summary": "...",
  "ai": [{{ "title": "...", "desc": "...", "url": "..." }}],
  "game": [{{ "title": "...", "desc": "...", "url": "..." }}]
}}
"""

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash-lite',
            contents=prompt,
            config={'response_mime_type': 'application/json'}
        )
        
        trends_json = response.text
        return json.loads(trends_json)
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return get_mock_trends()

def get_mock_trends():
    today = datetime.date.today().strftime("%Y年%m月%d日")
    return {
        "date": today,
        "summary": "APIエラーが発生したため、サンプルデータを表示しています。",
        "ai": [{"title": "AIトレンド調査中", "desc": "最新のAI情報を収集しています。", "url": "#"}],
        "game": [{"title": "ゲームトレンド調査中", "desc": "最新のゲーム情報を収集しています。", "url": "#"}]
    }

# X (Twitter) への投稿
def post_to_x(trends):
    consumer_key = os.environ.get("X_CONSUMER_KEY")
    consumer_secret = os.environ.get("X_CONSUMER_SECRET")
    access_token = os.environ.get("X_ACCESS_TOKEN")
    access_token_secret = os.environ.get("X_ACCESS_TOKEN_SECRET")

    if not all([consumer_key, consumer_secret, access_token, access_token_secret]):
        print("Error: X API credentials are not set. Skipping X post.")
        return

    try:
        client = tweepy.Client(
            consumer_key=consumer_key, consumer_secret=consumer_secret,
            access_token=access_token, access_token_secret=access_token_secret
        )

        tweet_text = f"【{trends['date']} トレンド情報】\n\n{trends['summary']}\n\n最新のゲーム・AIトレンドはこちら🍣\nhttps://sushicious-games.web.app/trends.html\n\n#SushiciousGames #AI #Gaming"
        
        response = client.create_tweet(text=tweet_text)
        print(f"Successfully posted to X: {response.data['id']}")
    except Exception as e:
        print(f"Error posting to X: {e}")

def update_html(trends):
    today_str = datetime.date.today().strftime("%Y%m%d")
    today_href = f"archives/trend-{today_str}.html"
    today_file = f"Web/{today_href}"
    
    # 1. アーカイブ個別ファイルの作成
    if not os.path.exists("Web/archives"):
        os.makedirs("Web/archives")
        
    template_path = "Tools/TrendsUpdater/Templates/template_archive.html"
    if os.path.exists(template_path):
        with open(template_path, "r", encoding="utf-8") as f:
            template = f.read()
        
        ai_list_html = ""
        for item in trends['ai']:
            ai_list_html += f'<li><h4>{item["title"]}</h4><p>{item["desc"]}<br><a href="{item["url"]}" target="_blank">参照元</a></p></li>\n'
            
        game_list_html = ""
        for item in trends['game']:
            game_list_html += f'<li><h4>{item["title"]}</h4><p>{item["desc"]}<br><a href="{item["url"]}" target="_blank">参照元</a></p></li>\n'
            
        archive_content = template.replace("{{DATE}}", trends['date'])
        archive_content = archive_content.replace("{{SUMMARY}}", trends['summary'])
        archive_content = archive_content.replace("{{AI_LIST}}", ai_list_html)
        archive_content = archive_content.replace("{{GAME_LIST}}", game_list_html)
        
        with open(today_file, "w", encoding="utf-8") as f:
            f.write(archive_content)
        print(f"Created archive file: {today_file}")

    # 2. trends.html の更新（最新記事の差し替え + サイドバーの更新）
    trends_file = "Web/trends.html"
    if os.path.exists(trends_file):
        with open(trends_file, "r", encoding="utf-8") as f:
            content = f.read()

        # 最新記事セクションの置換
        latest_article_html = f"""
            <article class="trend-article" id="trend-{today_str}">
                <h2>{trends['date']}のトレンド</h2>
                <p class="summary">{trends['summary']}</p>
                
                <section class="trend-category">
                    <h3>AI トレンド</h3>
                    <ul>
"""
        for item in trends['ai']:
            latest_article_html += f"""                        <li>
                            <h4>{item['title']}</h4>
                            <p>{item['desc']}<br><a href="{item['url']}" target="_blank">参照元</a></p>
                        </li>
"""
        latest_article_html += """                    </ul>
                </section>

                <section class="trend-category">
                    <h3>ゲーム トレンド</h3>
                    <ul>
"""
        for item in trends['game']:
            latest_article_html += f"""                        <li>
                            <h4>{item['title']}</h4>
                            <p>{item['desc']}<br><a href="{item['url']}" target="_blank">参照元</a></p>
                        </li>
"""
        latest_article_html += """                    </ul>
                </section>
            </article>
"""
        # trends-container の中身を最新のもの1件に置き換える（肥大化防止）
        container_start = '<div id="trends-container">'
        sidebar_start = '<aside class="archive">'
        
        parts = content.split(container_start)
        if len(parts) > 1:
            rest = parts[1].split(sidebar_start)
            if len(rest) > 1:
                # container_start + 最新記事 + sidebar_start + rest[1]
                new_content = parts[0] + container_start + latest_article_html + sidebar_start + rest[1]
                
                # サイドバーにアーカイブリンクを追加（重複チェック）
                archive_link = f'<li><a href="{today_href}">{trends["date"]}</a></li>'
                if archive_link not in new_content:
                    archive_tag = '<!-- 過去記事へのリンクが追加されていきます -->'
                    new_content = new_content.replace(archive_tag, archive_link + "\n                    " + archive_tag)
                
                with open(trends_file, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Successfully updated {trends_file} (kept only latest in main)")

    # 3. index.html の更新
    index_file = "Web/index.html"
    if os.path.exists(index_file):
        with open(index_file, "r", encoding="utf-8") as f:
            index_content = f.read()
        
        pattern = r'(<div id="trends-summary-container">)\s*<p class="trends-summary">.*?</p>'
        replacement = f'\\1\n                <p class="trends-summary">{trends["summary"]}</p>'
        new_index_content = re.sub(pattern, replacement, index_content, flags=re.DOTALL)
        
        with open(index_file, "w", encoding="utf-8") as f:
            f.write(new_index_content)
        print(f"Successfully updated {index_file} summary")

if __name__ == "__main__":
    latest_trends = get_latest_trends()
    update_html(latest_trends)
    # post_to_x(latest_trends)
