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
from typing import Optional # 导入 Optional 用于可选参数
from fastapi.responses import JSONResponse

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
    texts_to_analyze = "\n\n".join([
        f"### 新闻{index + 1}\n- **标题**: {item.get('title', '无标题')}\n- **描述**: {item.get('desc', '无描述')}\n- **链接**: {item.get('url', '无链接')}"
        for index, item in enumerate(news_list)
    ])

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
        markdown = f"""

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

class ConfigUpdateRequest(BaseModel):
    config: dict

# 定义 HTTP 读取配置的路由
@app.get("/config")
async def get_config_endpoint():
    """
    通过 HTTP 接口读取 .env 配置文件内容。

    返回:
        dict: 配置文件内容字典
    """
    config = {}
    try:
        with open(".env", "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    key_value = line.split('=', 1)
                    if len(key_value) == 2:
                        key, value = key_value
                        # 尝试去除值两端的引号，如果存在的话
                        if value.startswith('"') and value.endswith('"'):
                            value = value[1:-1]
                        config[key] = value
    except FileNotFoundError:
        return {"error": "❌ .env 文件未找到"}
    except Exception as e:
        return {"error": f"❌ 读取 .env 文件失败: {str(e)}"}

    return {"config": config}

# 定义 HTTP 更新配置的路由
@app.post("/config")
async def update_config_endpoint(request_body: ConfigUpdateRequest):
    """
    通过 HTTP 接口更新 .env 配置文件内容。

    参数:
        request_body (ConfigUpdateRequest): 包含新配置的请求体

    返回:
        str: 更新状态说明
    """
    new_config = request_body.config
    updated_lines = []

    # 注意：直接通过 API 修改 .env 文件存在安全风险，通常会将配置保存在更安全的位置（如数据库），或者需要手动修改 .env 并重启服务。
    # 此处仅为示例，生产环境请谨慎使用或加强安全措施。

    try:
        # 读取现有 .env 内容，保留注释和空行
        existing_lines = []
        try:
            with open(".env", "r", encoding="utf-8") as f:
                existing_lines = f.readlines()
        except FileNotFoundError:
            pass # 如果文件不存在，从空列表开始

        # 构建新的文件内容
        # 优先使用新配置中的值，如果新配置中没有，则保留旧值
        existing_config = {}
        for line in existing_lines:
            line = line.strip()
            if line and not line.startswith('#'):
                key_value = line.split('=', 1)
                if len(key_value) == 2:
                    key, value = key_value
                    existing_config[key] = value

        # 合并新旧配置，新配置优先
        merged_config = existing_config.copy()
        merged_config.update(new_config)

        # 生成新的文件内容，保留注释和空行
        new_file_content = []
        processed_keys = set()

        for line in existing_lines:
            stripped_line = line.strip()
            if stripped_line.startswith('#') or not stripped_line:
                new_file_content.append(line)
            else:
                key_value = stripped_line.split('=', 1)
                if len(key_value) == 2:
                    key = key_value[0]
                    if key in merged_config:
                        value = merged_config[key]
                        # 根据值是否包含空格或特殊字符决定是否加引号
                        if ' ' in value or '#' in value or '=' in value or '\n' in value or '\r' in value or '\t' in value or '"' in value:
                             new_file_content.append(f"{key}=\"{value}\"\n")
                        else:
                             new_file_content.append(f"{key}={value}\n")
                        processed_keys.add(key)
                    else:
                        # 如果新配置中没有这个key，保留旧行
                        new_file_content.append(line)
                else:
                     # 保留格式不正确的行
                     new_file_content.append(line)

        # 添加新配置中存在但旧配置中没有的key
        for key, value in merged_config.items():
            if key not in processed_keys:
                 if ' ' in value or '#' in value or '=' in value or '\n' in value or '\r' in value or '\t' in value or '"' in value:
                     new_file_content.append(f"{key}=\"{value}\"\n")
                 else:
                     new_file_content.append(f"{key}={value}\n")

        # 将更新后的内容写回 .env 文件
        with open(".env", "w", encoding="utf-8") as f:
            f.writelines(new_file_content)

    except Exception as e:
        return {"error": f"❌ 更新 .env 文件失败: {str(e)}"}

    return {"status": "✅ .env 文件已更新", "config": merged_config}

# 定义邮件发送请求体模型
class EmailRequest(BaseModel):
    to: str
    subject: str
    report_content: str

# 定义HTTP邮件发送接口
@app.post("/send_email")
async def send_email_endpoint(request_body: EmailRequest):
    """通过HTTP接口发送邮件"""
    try:
        # 生成文件名
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"sentiment_report_{timestamp}.md"
        
        # 保存报告到文件
        output_dir = "./sentiment_reports"
        os.makedirs(output_dir, exist_ok=True)
        file_path = os.path.join(output_dir, filename)
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(request_body.report_content)
        
        # 发送邮件
        result = await send_email_with_attachment(
            to=request_body.to,
            subject=request_body.subject,
            body="请查收附件中的舆情分析报告。",
            filename=filename
        )
        
        if result.startswith("✅"):
            return {"status": "success", "message": "邮件发送成功", "filename": filename}
        else:
            return {"status": "error", "message": result}
    except Exception as e:
        return {"status": "error", "message": f"邮件发送失败: {str(e)}"}

# 定义获取历史报告列表的接口
@app.get("/reports")
async def get_reports(keyword: str = None, page: int = 1, page_size: int = 10, start_date: str = None, end_date: str = None):
    """获取所有报告列表，支持关键词搜索和分页"""
    try:
        # 确保报告目录存在
        if not os.path.exists("./sentiment_reports"):
            os.makedirs("./sentiment_reports")
            return {"reports": [], "total": 0, "page": page, "page_size": page_size}

        # 获取所有报告文件
        reports = []
        for filename in os.listdir("./sentiment_reports"):
            if filename.endswith(".md"):
                file_path = os.path.join("./sentiment_reports", filename)
                # 获取文件创建时间
                created_time = os.path.getctime(file_path)
                created_at = datetime.fromtimestamp(created_time).strftime("%Y-%m-%d %H:%M:%S")
                
                # 读取文件前5行作为摘要
                with open(file_path, "r", encoding="utf-8") as f:
                    content = ""
                    for i, line in enumerate(f):
                        if i < 5:
                            content += line
                        else:
                            break
                
                # 转换日期字符串为datetime对象，用于日期范围比较
                report_date = datetime.strptime(created_at, "%Y-%m-%d %H:%M:%S")
                
                # 检查是否在日期范围内
                in_date_range = True
                if start_date:
                    start = datetime.strptime(start_date, "%Y-%m-%d")
                    in_date_range = in_date_range and report_date.date() >= start.date()
                if end_date:
                    end = datetime.strptime(end_date, "%Y-%m-%d")
                    in_date_range = in_date_range and report_date.date() <= end.date()
                
                # 如果在日期范围内，继续检查关键词
                if in_date_range:
                    if keyword:
                        # 如果文件名或内容中包含关键词，则添加到结果中
                        if keyword.lower() in filename.lower() or keyword.lower() in content.lower():
                            reports.append({
                                "filename": filename,
                                "created_at": created_at,
                                "summary": content
                            })
                    else:
                        # 如果没有关键词，则添加所有报告
                        reports.append({
                            "filename": filename,
                            "created_at": created_at,
                            "summary": content
                        })
        
        # 按创建时间倒序排序（最新的在前面）
        reports.sort(key=lambda x: x["created_at"], reverse=True)
        
        # 计算总数
        total = len(reports)
        
        # 分页处理
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_reports = reports[start_idx:end_idx]
        
        return {
            "reports": paginated_reports,
            "total": total,
            "page": page,
            "page_size": page_size
        }
    except Exception as e:
        return {"message": str(e)}

@app.get("/reports/{filename:path}")
async def get_report_content(filename: str):
    """Get the content of a specific report."""
    output_dir = "sentiment_reports"
    file_path = os.path.join(output_dir, filename)
    if not os.path.exists(file_path):
        return JSONResponse(content={"message": "Report not found"}, status_code=404)

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return JSONResponse(content={
            "filename": filename,
            "content": content
        })
    except Exception as e:
        print(f"Error reading report file {filename}: {e}")
        return JSONResponse(content={"message": "Error reading report file"}, status_code=500)

# 在 ConfigUpdateRequest 类后面添加新的请求体模型
class SaveReportRequest(BaseModel):
    content: str
    # filename: str # Remove filename
    keyword: str # Add keyword

# 在最后一个路由前添加新的路由
@app.post("/save_report")
async def save_report_endpoint(request_body: SaveReportRequest):
    """保存报告到指定目录"""
    try:
        output_dir = "./sentiment_reports"
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate filename using keyword and timestamp
        timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
        # Ensure keyword is safe for filename, replace potentially problematic characters
        safe_keyword = request_body.keyword.replace(' ', '_').replace('/', '_').replace('\\', '_').replace(':', '-').replace('*', '').replace('?', '').replace('"', '').replace('<', '').replace('>', '').replace('|', '')
        # filename = f"【{safe_keyword}】舆情分析报告_{timestamp}.md" # Remove "舆情分析报告"
        filename = f"【{safe_keyword}】_{timestamp}.md"
        
        file_path = os.path.join(output_dir, filename)
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(request_body.content)
        
        return {"status": "success", "message": "报告已保存", "file_path": file_path, "filename": filename} # Return filename
    except Exception as e:
        return {"status": "error", "message": f"保存报告失败: {str(e)}"}


if __name__ == "__main__":
    # mcp.run(transport='stdio')
    uvicorn.run(app, host="0.0.0.0", port=8000)


