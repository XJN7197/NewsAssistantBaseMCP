import os
import json
import smtplib
from datetime import datetime
from email.message import EmailMessage
import uvicorn
import httpx
from mcp.server.fastmcp import FastMCP
from dotenv import load_dotenv
from openai import OpenAI

from fastapi import FastAPI, Request # 导入 FastAPI 和 Request
from fastapi.middleware.cors import CORSMiddleware # 导入 CORS 中间件
from pydantic import BaseModel # 导入 BaseModel 用于请求体定义

# 加载环境变量
load_dotenv()

# 初始化 MCP 服务器
mcp = FastMCP("NewsServer")

# 创建 FastAPI 应用实例
app = FastAPI()

# 添加 CORS 中间件，允许前端跨域请求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 允许所有来源，生产环境请限制
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 将 MCP 服务器作为子应用挂载到 FastAPI 应用上
# 这样可以通过 /mcp 路径访问 MCP 的内置接口（如 /mcp/tools）
# app.mount("/mcp", mcp.app)

# 定义请求体模型
class SearchRequest(BaseModel):
    keyword: str

class AnalyzeRequest(BaseModel):
    news_list: list # 假设前端发送新闻列表进行分析

# @mcp.tool() 是 MCP 框架的装饰器，表明这是一个 MCP 工具。之后是对这个工具功能的描述
@mcp.tool()
async def search_google_news(keyword: str) -> str:
    """
    使用 Serper API（Google Search 封装）根据关键词搜索新闻内容，返回前5条标题、描述和链接。

    参数:
        keyword (str): 关键词，如 "小米汽车"

    返回:
        str: JSON 字符串，包含新闻标题、描述、链接
    """

    # 从环境中获取 API 密钥并进行检查
    api_key = os.getenv("SERPER_API_KEY")
    if not api_key:
        return "❌ 未配置 SERPER_API_KEY，请在 .env 文件中设置"

    # 设置请求参数并发送请求
    url = "https://google.serper.dev/news"
    headers = {
        "X-API-KEY": api_key,
        "Content-Type": "application/json"
    }
    payload = {"q": keyword}

    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=payload)
        data = response.json()

    # 检查数据，并按照格式提取新闻，返回前五条新闻
    if "news" not in data:
        return "❌ 未获取到搜索结果"

    articles = [
        {
            "title": item.get("title"),
            "desc": item.get("snippet"),
            "url": item.get("link")
        } for item in data["news"][:5]
    ]

    # 将新闻结果以带有时间戳命名后的 JSON 格式文件的形式保存在本地指定的路径
    output_dir = "./google_news"
    os.makedirs(output_dir, exist_ok=True)
    filename = f"google_news_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    file_path = os.path.join(output_dir, filename)

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)

    return (
        f"✅ 已获取与 [{keyword}] 相关的前5条 Google 新闻：\n"
        f"{json.dumps(articles, ensure_ascii=False, indent=2)}\n"
        f"📄 已保存到：{file_path}"
    )

# TODO: 新增一个用于 HTTP 通信的工具方法
# 这个工具方法可以直接通过 HTTP 访问，也可以被其他 MCP 工具调用
@mcp.tool()
async def http_search_news(keyword: str) -> list:
    """
    通过 HTTP 接口根据关键词搜索新闻内容，返回新闻列表。

    参数:
        keyword (str): 关键词，如 "小米汽车"

    返回:
        list: 新闻列表，每个元素包含 title, desc, url
    """
    api_key = os.getenv("SERPER_API_KEY")
    if not api_key:
        # 返回一个包含错误信息的列表或空列表，前端需要处理
        return [{"error": "❌ 未配置 SERPER_API_KEY"}]

    url = "https://google.serper.dev/news"
    headers = {
        "X-API-KEY": api_key,
        "Content-Type": "application/json"
    }
    payload = {"q": keyword}

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status() # 检查HTTP响应状态码
            data = response.json()
        except httpx.HTTPStatusError as e:
            return [{"error": f"❌ HTTP 错误: {e}"}]
        except httpx.RequestError as e:
            return [{"error": f"❌ 请求错误: {e}"}]
        except Exception as e:
            return [{"error": f"❌ 发生未知错误: {e}"}]


    if "news" not in data:
        return [{"error": "❌ 未获取到搜索结果"}]

    articles = [
        {
            "title": item.get("title"),
            "desc": item.get("snippet"),
            "url": item.get("link")
        } for item in data["news"][:5]
    ]

    # 注意：这里不再保存到本地文件，直接返回数据给前端
    return articles


# @mcp.tool() 是 MCP 框架的装饰器，标记该函数为一个可调用的工具
@mcp.tool()
async def analyze_sentiment(text: str, filename: str) -> str:
    """
    对传入的一段文本内容进行情感分析，并保存为指定名称的 Markdown 文件。

    参数:
        text (str): 新闻描述或文本内容
        filename (str): 保存的 Markdown 文件名（不含路径）

    返回:
        str: 完整文件路径（用于邮件发送）
    """

    # 这里的情感分析功能需要去调用 LLM，所以从环境中获取 LLM 的一些相应配置
    openai_key = os.getenv("DASHSCOPE_API_KEY")
    model = os.getenv("MODEL")
    client = OpenAI(api_key=openai_key, base_url=os.getenv("BASE_URL"))

    # 构造情感分析的提示词
    prompt = f"请对以下新闻内容进行情绪倾向分析，并说明原因：\n\n{text}"

    # 向模型发送请求，并处理返回的结果
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}]
    )
    result = response.choices[0].message.content.strip()

    # 生成 Markdown 格式的舆情分析报告，并存放进设置好的输出目录
    markdown = f"""# 舆情分析报告

**分析时间：** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

---

## 📥 原始文本

{text}

---

## 📊 分析结果

{result}
"""

    output_dir = "./sentiment_reports"
    os.makedirs(output_dir, exist_ok=True)

    if not filename:
        filename = f"sentiment_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"

    file_path = os.path.join(output_dir, filename)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(markdown)

    return file_path

# 新增一个用于 HTTP 通信的舆情分析工具方法
@mcp.tool()
async def http_analyze_sentiment(news_list: list) -> str:
    """
    通过 HTTP 接口对新闻列表进行情感分析，返回分析报告。

    参数:
        news_list (list): 新闻列表，每个元素包含 title, desc, url

    返回:
        str: 舆情分析报告内容
    """
    if not news_list:
        return "没有新闻内容可供分析。"

    # 提取新闻描述进行分析
    texts_to_analyze = "\n---\n".join([f"标题: {item.get('title', '无标题')}\n描述: {item.get('desc', '无描述')}" for item in news_list])

    # 这里的情感分析功能需要去调用 LLM，所以从环境中获取 LLM 的一些相应配置
    openai_key = os.getenv("DASHSCOPE_API_KEY")
    model = os.getenv("MODEL")
    base_url = os.getenv("BASE_URL")

    if not openai_key or not model or not base_url:
         return "❌ LLM 配置不完整，请检查 .env 文件中的 DASHSCOPE_API_KEY, MODEL, BASE_URL"

    try:
        client = OpenAI(api_key=openai_key, base_url=base_url)

        # 构造情感分析的提示词
        prompt = f"请对以下新闻内容进行情绪倾向分析，并说明原因，生成一份简洁的舆情分析报告：\n\n{texts_to_analyze}"

        # 向模型发送请求，并处理返回的结果
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}]
        )
        result = response.choices[0].message.content.strip()

        # 生成 Markdown 格式的舆情分析报告
        markdown = f"""# 舆情分析报告

**分析时间：** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

---

## 📥 原始新闻内容

{texts_to_analyze}

---

## 📊 分析结果

{result}
"""
        # 注意：这里不再保存到本地文件，直接返回报告内容给前端
        return markdown

    except Exception as e:
        return f"❌ LLM 调用失败: {str(e)}"


@mcp.tool()
async def send_email_with_attachment(to: str, subject: str, body: str, filename: str) -> str:
    """
    发送带附件的邮件。

    参数:
        to: 收件人邮箱地址
        subject: 邮件标题
        body: 邮件正文
        filename (str): 保存的 Markdown 文件名（不含路径）

    返回:
        邮件发送状态说明
    """

    # 获取并配置 SMTP 相关信息
    smtp_server = os.getenv("SMTP_SERVER")  # 例如 smtp.qq.com
    smtp_port = int(os.getenv("SMTP_PORT", 465))
    sender_email = os.getenv("EMAIL_USER")
    sender_pass = os.getenv("EMAIL_PASS")

    # 获取附件文件的路径，并进行检查是否存在
    full_path = os.path.abspath(os.path.join("./sentiment_reports", filename))
    if not os.path.exists(full_path):
        return f"❌ 附件路径无效，未找到文件: {full_path}"

    # 创建邮件并设置内容
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = sender_email
    msg["To"] = to
    msg.set_content(body)

    # 添加附件并发送邮件
    try:
        with open(full_path, "rb") as f:
            file_data = f.read()
            file_name = os.path.basename(full_path)
            msg.add_attachment(file_data, maintype="application", subtype="octet-stream", filename=file_name)
    except Exception as e:
        return f"❌ 附件读取失败: {str(e)}"

    try:
        with smtplib.SMTP_SSL(smtp_server, smtp_port) as server:
            server.login(sender_email, sender_pass)
            server.send_message(msg)
        return f"✅ 邮件已成功发送给 {to}，附件路径: {full_path}"
    except Exception as e:
        return f"❌ 邮件发送失败: {str(e)}"


# 定义 HTTP 搜索新闻的路由
@app.post("/search")
async def search_news_endpoint(request_body: SearchRequest):
    # 调用 MCP 工具进行搜索
    # 注意：这里直接调用了上面新增的 http_search_news 工具
    news_list = await http_search_news(keyword=request_body.keyword)
    return {"news_list": news_list}

# 定义 HTTP 分析新闻的路由
@app.post("/analyze")
async def analyze_news_endpoint(request_body: AnalyzeRequest):
    # 调用 MCP 工具进行分析
    # 注意：这里直接调用了上面新增的 http_analyze_sentiment 工具
    report_content = await http_analyze_sentiment(news_list=request_body.news_list)
    return {"report": report_content}

if __name__ == "__main__":
    # mcp.run(transport='stdio')
    uvicorn.run(app, host="0.0.0.0", port=8000)


