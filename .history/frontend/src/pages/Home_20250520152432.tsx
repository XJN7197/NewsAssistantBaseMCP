import React, { useState } from 'react'
import styles from './Home.module.css'

// 假设你有这些组件，后续可单独实现
// import NewsSearch from '../components/NewsSearch'
// import NewsCardList from '../components/NewsCardList'
// import AnalyzeButton from '../components/AnalyzeButton'
// import ReportModal from '../components/ReportModal'

const Home: React.FC = () => {
  // 搜索关键词
  const [keyword, setKeyword] = useState('')
  // 新闻列表
  const [newsList, setNewsList] = useState<any[]>([])
  // 是否正在加载
  const [loading, setLoading] = useState(false)
  // 分析报告内容
  const [report, setReport] = useState<string | null>(null)
  // 控制报告弹窗显示
  const [showReport, setShowReport] = useState(false)

  // 搜索新闻
  const handleSearch = async () => {
    setLoading(true)
    setNewsList([]); // 清空旧的新闻列表
    setReport(null); // 清空旧的报告
    setShowReport(false); // 关闭报告弹窗

    try {
      // 调用后端HTTP API获取新闻
      const response = await fetch('http://localhost:8000/search', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyword: keyword }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // 检查返回的数据结构，确保有 news_list 字段
      if (data && data.news_list) {
        console.log("获取到的新闻数据:", data.news_list);
        setNewsList(data.news_list);
      } else {
        setNewsList([{ error: '未获取到新闻数据或数据格式不正确' }]);
      }

    } catch (error) {
      console.error("搜索新闻失败:", error);
      setNewsList([{ error: `搜索新闻失败: ${error}` }]);
    } finally {
      setLoading(false);
    }
  }

  // 分析新闻
  const handleAnalyze = async () => {
    setLoading(true)
    setReport(null); // 清空旧的报告
    setShowReport(false); // 关闭报告弹窗

    if (newsList.length === 0 || (newsList.length === 1 && newsList[0].error)) {
        setReport("没有新闻内容可供分析。");
        setShowReport(true);
        setLoading(false);
        return;
    }

    try {
      // 调用后端HTTP API进行舆情分析
      const response = await fetch('http://localhost:8000/analyze', { // 假设后端运行在 localhost:8000
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ news_list: newsList }), // 将新闻列表发送给后端
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // 检查返回的数据结构，确保有 report 字段
      if (data && data.report) {
        setReport(data.report);
      } else {
        setReport("未获取到分析报告或报告格式不正确");
      }
      setShowReport(true);

    } catch (error) {
      console.error("分析新闻失败:", error);
      setReport(`分析新闻失败: ${error}`);
      setShowReport(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles['home-container']}>
      {/* 搜索栏 */}
      <div className={styles['search-bar']}>
        <input
          type="text"
          placeholder="请输入新闻关键词"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
        />
        <button onClick={handleSearch} disabled={loading || !keyword}>
          搜索新闻
        </button>
      </div>

      {/* 新闻列表 */}
      <div className={styles['news-list']}>
        {/* <NewsCardList newsList={newsList} /> */}
        {/* 这里可以用map渲染新闻卡片 */}
        {newsList.length === 0 && !loading && <div>暂无新闻，请搜索</div>}
        {loading && <div>加载中...</div>}
        {newsList.length > 0 && newsList[0].error ? (
          <div className={styles['error-message']}>{newsList[0].error}</div>
        ) : (
          newsList.map((news, index) => (
            <div key={index} className={styles['news-card']}>
              <h4 className={styles['news-title']}>{news.title}</h4>
              <p className={styles['news-desc']}>{news.desc}</p>
              <a href={news.url} target="_blank" rel="noopener noreferrer" className={styles['news-link']}>
                阅读原文
              </a>
            </div>
          ))
        )}
      </div>

      {/* 一键分析按钮 */}
      <div className={styles['analyze-btn']}>
        <button onClick={handleAnalyze} disabled={loading || newsList.length === 0}>
          一键舆情分析
        </button>
      </div>

      {/* 分析报告弹窗 */}
      {showReport && (
        <div className={styles['report-modal']}>
          {/* <ReportModal report={report} onClose={() => setShowReport(false)} /> */}
          <div>
            <h3>舆情分析报告</h3>
            <pre>{report}</pre>
            <button onClick={() => setShowReport(false)}>关闭</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Home