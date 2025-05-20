import React, { useState } from 'react'
import styles from './Home.module.css'
import axios from 'axios'
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
    // TODO: 调用后端API获取新闻
    // setNewsList(result)
    setLoading(false)
  }

  // 分析新闻
  const handleAnalyze = async () => {
    setLoading(true)
    // TODO: 调用后端API进行舆情分析
    // setReport(reportContent)
    setShowReport(true)
    setLoading(false)
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
        {newsList.length === 0 && <div>暂无新闻，请搜索</div>}
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