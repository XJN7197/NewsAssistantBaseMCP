import React, { useState, useCallback } from 'react';
import { List, Checkbox, Button as AntButton, Input, Spin, Modal, Typography, Form, message } from 'antd';
import 'antd/dist/reset.css'; // 导入 Ant Design 样式
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './Home.module.css'
import { mockNewsData } from '../mock/newsData'
import { mockReportData } from '../mock/reportData'
import { SettingOutlined, HistoryOutlined } from '@ant-design/icons'; // 导入设置图标

// 导入新创建的组件
import NewsSearch from '../components/NewsSearch';
import NewsList from '../components/NewsList';
import ReportModal from '../components/ReportModal';
import SettingsModal from '../components/SettingsModal';
import EmailModal from '../components/EmailModal';

// 导入 API 函数
import { searchNews, analyzeNews, fetchHistoryReports, viewHistoryReport, saveReport } from '../api';

const { Title, Text, Link } = Typography;

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
  // 控制设置弹窗显示
  const [showSettings, setShowSettings] = useState(false);
  // 配置数据
  const [config, setConfig] = useState<any>({});
  // 配置表单实例
  // const [configForm] = Form.useForm(); // 移动到 SettingsModal
  // 配置加载状态
  const [configLoading, setConfigLoading] = useState(false);
  // 在现有的状态声明下添加
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  // const [emailTo, setEmailTo] = useState(''); // 移动到 EmailModal
  // const [emailSending, setEmailSending] = useState(false); // 移动到 EmailModal
  const [showHistory, setShowHistory] = useState(false);
  const [historyReports, setHistoryReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  // 下载报告处理函数
  const handleDownload = useCallback(async () => {
    if (!report) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `舆情分析报告_${timestamp}.md`;

    // 使用封装的 saveReport API
    const data = await saveReport(report, fileName);

    if (data && data.status === 'success') {
      console.log("报告保存成功:", data);
      // 先关闭舆情分析报告弹窗
      setShowReport(false);

      // 使用setTimeout确保在Modal关闭后再显示成功弹窗
      setTimeout(() => {
        message.success({
          content: `报告已保存到指定目录：${fileName}`,
          duration: 3, // 显示3秒
          style: {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1500, // 确保在其他组件之上
          }, // 调整位置
        });
      }, 300); // 给Modal关闭动画足够的时间
    } else if (data && data.message) {
      console.error("保存报告失败:", data);
      Modal.error({
        title: '保存失败',
        content: data.message,
        zIndex: 1500,
      });
    } else {
       Modal.error({
        title: '保存失败',
        content: '未知错误',
        zIndex: 1500,
      });
    }
  }, [report]); // 添加 report 作为依赖

  // 搜索新闻
  const handleSearch = useCallback(async () => {
    setLoading(true)
    setNewsList([]); // 清空旧的新闻列表
    setReport(null); // 清空旧的报告
    setShowReport(false); // 关闭报告弹窗

    // 使用封装的 searchNews API
    const data = await searchNews(keyword);

    if (data && data.news_list) {
      // console.log("获取到的新闻数据:", data.news_list);
      // 初始化选中状态，默认全部选中
      const initialNewsList = data.news_list.map((news: any, index: number) => ({ ...news, id: index })); // selected 属性由 selectedNews Set 管理
      setNewsList(initialNewsList);
      const initialSelected = new Set<number>(initialNewsList.map((news: any) => news.id));
      setSelectedNews(initialSelected);
    } else if (data && data.error) {
       setNewsList([{ error: `搜索新闻失败: ${data.error}` }]);
    } else if (data === null) {
       setNewsList([{ error: '搜索新闻失败: 未知错误' }]);
    }

    setLoading(false);
  }, [keyword]); // 添加 keyword 作为依赖

  // 分析新闻
  const handleAnalyze = useCallback(async () => {
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

    // 使用封装的 analyzeNews API
    const data = await analyzeNews(newsToAnalyze);

    if (data && data.report) {
      // console.log("获取到的分析报告:", data.report);
      setReport(data.report);
    } else if (data && data.error) {
      setReport(`分析新闻失败: ${data.error}`);
    } else if (data === null) {
      setReport('分析新闻失败: 未知错误');
    }

    setLoading(false);
  }, [newsList, selectedNews]); // 添加 newsList 和 selectedNews 作为依赖

  // 获取配置 (此函数将移动到 SettingsModal)
  const fetchConfig = useCallback(async () => {
    setConfigLoading(true);
    // 使用封装的 fetchConfig API
    const data = await fetchConfig();
    if (data && data.config) {
      setConfig(data.config);
    } else if (data && data.error) {
      message.error(`获取配置失败: ${data.error}`);
    } else if (data === null) {
      message.error('获取配置失败: 未知错误');
    }
    setConfigLoading(false);
  }, []); // 无依赖

  // 更新配置 (此函数将移动到 SettingsModal)
  const updateConfig = useCallback(async (values: any) => {
    setConfigLoading(true);
    // 使用封装的 updateConfig API
    const data = await updateConfig(values);
    if (data && data.status === '✅ .env 文件已更新') {
      message.success('配置更新成功！');
      setConfig(data.config); // 更新本地配置状态
      setShowSettings(false); // 关闭弹窗
    } else if (data && data.error) {
      message.error(`更新配置失败: ${data.error}`);
    } else if (data === null) {
      message.error('更新配置失败: 未知错误');
    }
    setConfigLoading(false);
  }, []); // 无依赖

  // 处理设置按钮点击
  const handleSettingsClick = () => {
    setShowSettings(true);
    // fetchConfig(); // 移动到 SettingsModal 的 useEffect 中
  };

  // 添加获取历史报告列表函数
  const fetchHistoryReports = useCallback(async () => {
    setLoading(true);
    // 使用封装的 fetchHistoryReports API
    const data = await fetchHistoryReports();
    if (data && data.reports) {
      setHistoryReports(data.reports);
    } else if (data && data.message) {
      message.error(`获取历史报告失败: ${data.message}`);
    } else if (data === null) {
      message.error('获取历史报告失败: 未知错误');
    }
    setLoading(false);
  }, []); // 无依赖

  // 添加查看历史报告内容函数
  const viewHistoryReport = useCallback(async (filename: string) => {
    setLoading(true);
    // 使用封装的 viewHistoryReport API
    const data = await viewHistoryReport(filename);
    if (data && data.content) {
      setReport(data.content);
      setSelectedReport({
        filename: data.filename
      });
      setShowReport(true);
      setShowHistory(false);
    } else if (data && data.message) {
      message.error(`获取报告内容失败: ${data.message}`);
    } else if (data === null) {
      message.error('获取报告内容失败: 未知错误');
    }
    setLoading(false);
  }, []); // 无依赖

  // 处理新闻选中状态变化
  const handleNewsItemChange = useCallback((id: number, checked: boolean) => {
    setSelectedNews(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (checked) {
        newSelected.add(id);
      } else {
        newSelected.delete(id);
      }
      return newSelected;
    });
  }, []); // 无依赖

  return (
    <div className={styles['home-container']}>
      {/* 搜索栏 */} 
      <div className={styles['search-bar']}>
        <NewsSearch
          keyword={keyword}
          setKeyword={setKeyword}
          handleSearch={handleSearch}
          loading={loading}
        />
        {/* 历史记录按钮 */}
        <AntButton
          icon={<HistoryOutlined />}
          onClick={() => {
            setShowHistory(true);
            fetchHistoryReports();
          }}
          style={{ width:'50px',borderRadius: '16px', padding: '14px', fontSize: '1.1rem', fontWeight: 500}} // 保持原有部分样式
        >
        </AntButton>
        {/* 设置按钮 */}
        <AntButton
          icon={<SettingOutlined />}
          onClick={handleSettingsClick}
          style={{ width:'50px',borderRadius: '16px', padding: '14px', fontSize: '1.1rem', fontWeight: 500 }} // 保持原有部分样式
        />
      </div>

      {/* 历史记录弹窗 */}
      <Modal
        title={<Title level={3} style={{ textAlign: 'center', marginBottom: 0 }}>历史分析报告</Title>}
        open={showHistory}
        onCancel={() => setShowHistory(false)}
        footer={[
          <AntButton key="close" type="primary" onClick={() => setShowHistory(false)} style={{ borderRadius: '12px' }}>
            关闭
          </AntButton>
        ]}
        width="60vw"
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto', background: '#fff', padding: '24px 40px' } }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" tip="加载历史报告中..." />
          </div>
        ) : historyReports.length > 0 ? (
          <List
            itemLayout="horizontal"
            dataSource={historyReports}
            renderItem={item => (
              <List.Item
                actions={[
                  <AntButton type="link" onClick={() => viewHistoryReport(item.filename)}>查看</AntButton>,
                  <AntButton
                    type="link"
                    onClick={() => {
                      viewHistoryReport(item.filename).then(() => {
                        setEmailModalVisible(true);
                      });
                    }}
                  >
                    发送邮件
                  </AntButton>
                ]}
                style={{ background: '#fff', borderRadius: '12px', marginBottom: '16px', padding: '20px', boxShadow: '0 2px 12px 0 rgba(0,0,0,0.05)' }}
              >
                <List.Item.Meta
                  title={<Title level={5} style={{ margin: 0, fontSize: '1.3rem', fontWeight: 600, color: '#1d1d1f' }}>{item.filename}</Title>}
                  description={
                    <div>
                      <Text type="secondary" style={{ fontSize: '1rem', display: 'block', marginBottom: '8px' }}>
                        创建时间: {item.created_at}
                      </Text>
                      <Text type="secondary" style={{ fontSize: '1rem', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.summary}
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <div style={{ textAlign: 'center', color: '#6c757d', fontSize: '1.1rem', padding: '40px 0' }}>暂无历史报告</div>
        )}
      </Modal>

      {/* 新闻列表 */}
      <NewsList
        newsList={newsList}
        selectedNews={selectedNews}
        onItemChange={handleNewsItemChange}
        loading={loading}
      />

      {/* 一键分析按钮 */}
      {newsList.length > 0 && !newsList[0].error && ( // 仅在有新闻且无错误时显示
        <div className={styles['analyze-btn']}> {/* 使用 Home.module.css 中的样式 */} 
          <AntButton
            type="primary"
            onClick={handleAnalyze}
            loading={loading}
            disabled={selectedNews.size === 0}
            style={{ borderRadius: '16px', padding: '16px 48px', fontSize: '1.2rem', fontWeight: 600, background: 'linear-gradient(90deg, #34e89e 0%, #0f3443 100%)' }} // 保持原有部分样式
          >
            一键舆情分析
          </AntButton>
        </div>
      )}

      {/* 分析报告弹窗 */}
      <ReportModal
        showReport={showReport}
        setShowReport={setShowReport}
        report={report}
        loading={loading}
        handleDownload={handleDownload}
        setEmailModalVisible={setEmailModalVisible}
      />

      {/* 邮件发送弹窗 */}
      <EmailModal
        emailModalVisible={emailModalVisible}
        setEmailModalVisible={setEmailModalVisible}
        report={report}
      />

      {/* 设置弹窗 */}
      <SettingsModal
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        config={config}
        configLoading={configLoading}
        fetchConfig={fetchConfig}
        updateConfig={updateConfig}
      />
    </div>
  );
};

export default Home;



