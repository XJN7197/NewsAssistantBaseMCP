import React, { useState, useCallback } from 'react';
import { List, Checkbox, Button as AntButton, Input, Spin, Modal, Typography, Dropdown, MenuProps } from 'antd'; // Ant Design 组件导入
import 'antd/dist/reset.css'; // 导入 Ant Design 样式
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './Home.module.css'
import { mockNewsData } from '../mock/newsData'
import { mockReportData } from '../mock/reportData'

// 假设你有这些组件，后续可单独实现
// import NewsSearch from '../components/NewsSearch'
// import NewsCardList from '../components/NewsCardList'
// import AnalyzeButton from '../components/AnalyzeButton'
// import ReportModal from '../components/ReportModal'

const { Title, Text, Link } = Typography;

  // 下载报告处理函数
  const handleDownload = (type: string) => {
    if (!report) return;
    
    let content = '';
    let fileName = '';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (type === 'markdown') {
      content = report;
      fileName = `舆情分析报告_${timestamp}.md`;
    } else if (type === 'pdf') {
      // 这里应该添加PDF转换逻辑
      // 目前仅作为示例，实际应该使用专门的PDF生成库
      content = report;
      fileName = `舆情分析报告_${timestamp}.pdf`;
    }
    
    // 创建下载链接
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

const Home: React.FC = () => {
  // 搜索关键词
  const [keyword, setKeyword] = useState('')
  // 新闻列表
  const [newsList, setNewsList] = useState<any[]>([])
  // 选中的新闻项
  const [selectedNews, setSelectedNews] = useState<Set<number>>(new Set());
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
      let data;
      
      // 根据环境变量决定是否使用mock数据
      if (import.meta.env.VITE_USE_MOCK_NEWS === 'true') {
        // 使用mock数据
        await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟延迟
        data = mockNewsData;
      } else {
        // 使用实际API
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

        data = await response.json();
      }

      // 检查返回的数据结构，确保有 news_list 字段
      if (data && data.news_list) {
        console.log("获取到的新闻数据:", data.news_list);
        // 初始化选中状态，默认全部选中
        const initialNewsList = data.news_list.map((news: any, index: number) => ({ ...news, id: index })); // selected 属性由 selectedNews Set 管理
        setNewsList(initialNewsList);
        const initialSelected = new Set<number>(initialNewsList.map((news: any) => news.id));
        setSelectedNews(initialSelected);
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
    setLoading(true);
    setReport(null); // 清空旧的报告
    setShowReport(true); // Show modal immediately

    // 过滤出选中的新闻
    const newsToAnalyze = newsList.filter(news => selectedNews.has(news.id));

    if (newsToAnalyze.length === 0) {
        setReport("没有新闻内容可供分析。");
        setLoading(false);
        return;
    }

    try {
      let data;

      // 根据环境变量决定是否使用mock数据
      if (import.meta.env.VITE_USE_MOCK_REPORT === 'true') {
        // 使用mock数据
        await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟延迟
        data = mockReportData;
      } else {
        // 使用实际API
        const response = await fetch('http://localhost:8000/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ news_list: newsToAnalyze }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        data = await response.json();
      }

      // 检查返回的数据结构，确保有 report 字段
      if (data && data.report) {
        console.log("获取到的分析报告:", data.report);
        setReport(data.report);
      } else {
        setReport("未获取到分析报告或报告格式不正确");
      }

    } catch (error) {
      console.error("分析新闻失败:", error);
      setReport(`分析新闻失败: ${error}`);
    } finally {
      setLoading(false);
    }
  }



  return (
    <div className={styles['home-container']}>
      {/* 搜索栏 - 使用 Ant Design 组件 */}
      <div className={styles['search-bar']}>
        <Input
          placeholder="请输入新闻关键词"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onPressEnter={handleSearch} // 支持回车搜索
          style={{ flex: 1, fontSize: '1.25rem', padding: '12px 0' }} // 保持原有部分样式
        />
        <AntButton 
          type="primary" 
          onClick={handleSearch} 
          loading={loading} 
          disabled={!keyword}
          style={{ borderRadius: '16px', padding: '14px 36px', fontSize: '1.1rem', fontWeight: 500 }} // 保持原有部分样式
        >
          搜索新闻
        </AntButton>
      </div>

      {/* 新闻列表 - 使用 Ant Design List 组件 */}
      <div className={styles['news-list-container']}> {/* 新增一个容器来控制 List 的宽度和间距 */} 
        {loading && newsList.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin size="large" /></div>}
        {!loading && newsList.length === 0 && <div style={{ textAlign: 'center', color: '#6c757d', fontSize: '1.1rem', padding: '40px 0' }}>暂无新闻，请搜索</div>}
        {newsList.length > 0 && newsList[0].error && (
          <div className={styles['error-message']}>{newsList[0].error}</div>
        )}
        {newsList.length > 0 && !newsList[0].error && (
          <List
            itemLayout="horizontal"
            dataSource={newsList}
            renderItem={item => {
              const onItemChange = (e: any) => {
                setSelectedNews(prevSelected => {
                  const newSelected = new Set(prevSelected);
                  if (e.target.checked) {
                    newSelected.add(item.id);
                  } else {
                    newSelected.delete(item.id);
                  }
                  return newSelected;
                });
              };
              return (
                <List.Item
                  actions={[
                    <Link href={item.url} target="_blank" rel="noopener noreferrer">阅读原文</Link>
                  ]}
                  style={{ background: '#fff', borderRadius: '12px', marginBottom: '16px', padding: '20px', boxShadow: '0 2px 12px 0 rgba(0,0,0,0.05)' }}
                >
                  <List.Item.Meta
                    avatar={<Checkbox checked={selectedNews.has(item.id)} onChange={onItemChange} style={{paddingRight: '10px'}}/>}
                    title={<Title level={5} style={{ margin: 0, fontSize: '1.3rem', fontWeight: 600, color: '#1d1d1f' }}>{item.title}</Title>}
                    description={<Text type="secondary" style={{ fontSize: '1rem', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.desc}</Text>}
                  />
                </List.Item>
              );
            }}
          />
        )}
      </div>

      {/* 一键分析按钮 - 使用 Ant Design Button */}
      <div className={styles['analyze-btn']}>
        <AntButton 
          type="primary" 
          onClick={handleAnalyze} 
          loading={loading} 
          disabled={newsList.length === 0 || selectedNews.size === 0}
          style={{ borderRadius: '16px', padding: '16px 48px', fontSize: '1.2rem', fontWeight: 600, background: 'linear-gradient(90deg, #34e89e 0%, #0f3443 100%)' }} // 保持原有部分样式
        >
          一键舆情分析
        </AntButton>
      </div>

      {/* 分析报告弹窗 - 使用 Ant Design Modal */}
      <Modal
        title={<Title level={3} style={{ textAlign: 'center', marginBottom: 0 }}>舆情分析报告</Title>}
        open={showReport}
        onCancel={() => setShowReport(false)}
        footer={[
          <Dropdown
            key="download"
            menu={{
              items: [
                {
                  key: 'markdown',
                  label: 'Markdown',
                  onClick: () => handleDownload('markdown')
                },
                {
                  key: 'pdf',
                  label: 'PDF',
                  onClick: () => handleDownload('pdf')
                }
              ]
            }}
            disabled={!report}
          >
            <AntButton style={{ borderRadius: '12px', marginRight: '8px' }}>
              下载
            </AntButton>
          </Dropdown>,
          <AntButton key="close" type="primary" onClick={() => setShowReport(false)} style={{ borderRadius: '12px' }}>
            关闭
          </AntButton>
        ]}
        width="60vw"
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto', background: '#fff', padding: '24px 40px' } }}
      >
        {loading && !report ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" tip="分析报告生成中..." />
          </div>
        ) : report ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
        ) : (
          <Text>报告生成中或无内容...</Text>
        )}
      </Modal>
    </div>
  )
}

export default Home