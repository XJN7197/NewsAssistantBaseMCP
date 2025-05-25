import React, { useState  } from 'react';
import { List, Checkbox, Button as AntButton, Input, Spin, Modal, Typography, Form, message } from 'antd';
import 'antd/dist/reset.css'; // 导入 Ant Design 样式
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './Home.module.css'
import { mockNewsData } from '../mock/newsData'
import { mockReportData } from '../mock/reportData'
import { SettingOutlined, HistoryOutlined } from '@ant-design/icons'; // 导入设置图标

// 假设你有这些组件，后续可单独实现
// import NewsSearch from '../components/NewsSearch'
// import NewsCardList from '../components/NewsCardList'
// import AnalyzeButton from '../components/AnalyzeButton'
// import ReportModal from '../components/ReportModal'

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
  const [configForm] = Form.useForm();
  // 配置加载状态
  const [configLoading, setConfigLoading] = useState(false);
  // 在现有的状态声明下添加
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyReports, setHistoryReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  // 下载报告处理函数
  const handleDownload = async () => {
    if (!report) return;
    


    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `舆情分析报告_${timestamp}.md`;
    
    try {
      const response = await fetch('http://localhost:8000/save_report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: report,
          filename: fileName
        }),
      });

      const data = await response.json();
      if (data.status === 'success') {
        console.log("报告保存成功:", data);
        Modal.success({
          title: '保存成功',
          content: `报告已保存到指定目录：${fileName}`,
        });
      } else {
        console.error("保存报告失败:", data);
        Modal.error({
          title: '保存失败',
          content: data.message,
        });
      }
    } catch (error) {
      console.error('保存报告失败:', error);
      Modal.error({
        title: '保存失败',
        content: String(error),
      });
    }
    setShowReport(false);
  };

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
        // console.log("获取到的新闻数据:", data.news_list);
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
        // console.log("获取到的分析报告:", data.report);
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



  // 获取配置
  const fetchConfig = async () => {
    setConfigLoading(true);
    try {
      const response = await fetch('http://localhost:8000/config');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data && data.config) {
        setConfig(data.config);
        configForm.setFieldsValue(data.config); // 设置表单初始值
      } else if (data && data.error) {
        message.error(`获取配置失败: ${data.error}`);
      } else {
        message.error('获取配置失败: 未知错误');
      }
    } catch (error) {
      console.error("获取配置失败:", error);
      message.error(`获取配置失败: ${error}`);
    } finally {
      setConfigLoading(false);
    }
  };

  // 更新配置
  const updateConfig = async (values: any) => {
    setConfigLoading(true);
    try {
      const response = await fetch('http://localhost:8000/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config: values }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data && data.status === '✅ .env 文件已更新') {
        message.success('配置更新成功！');
        setConfig(data.config); // 更新本地配置状态
        setShowSettings(false); // 关闭弹窗
      } else if (data && data.error) {
        message.error(`更新配置失败: ${data.error}`);
      } else {
        message.error('更新配置失败: 未知错误');
      }

    } catch (error) {
      console.error("更新配置失败:", error);
      message.error(`更新配置失败: ${error}`);
    } finally {
      setConfigLoading(false);
    }
  };

  // 处理设置按钮点击
  const handleSettingsClick = () => {
    setShowSettings(true);
    fetchConfig(); // 打开弹窗时获取最新配置
  };
    // 添加邮件发送函数
  const handleSendEmail = async () => {
    if (!report || !emailTo) return;
    
    setEmailSending(true);
    try {
      const response = await fetch('http://localhost:8000/send_email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: emailTo,
          subject: `舆情分析报告 - ${keyword}`,
          report_content: report
        }),
      });

      const data = await response.json();
      if (data.status === 'success') {
        message.success('邮件发送成功！');
        setEmailModalVisible(false);
      } else {
        message.error(`邮件发送失败: ${data.message}`);
      }
    } catch (error) {
      console.error("邮件发送失败:", error);
      message.error(`邮件发送失败: ${error}`);
    } finally {
      setEmailSending(false);
    }
  };

  // 添加获取历史报告列表函数
  const fetchHistoryReports = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/reports');
      const data = await response.json();
      if (data.reports) {
        setHistoryReports(data.reports);
      } else if (data.message) {
        message.error(`获取历史报告失败: ${data.message}`);
      }
    } catch (error) {
      console.error("获取历史报告失败:", error);
      message.error(`获取历史报告失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 添加查看历史报告内容函数
  const viewHistoryReport = async (filename: string) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/reports/${filename}`);
      const data = await response.json();
      if (data.content) {
        setReport(data.content);
        setSelectedReport({
          filename: data.filename
        });
        setShowReport(true);
        setShowHistory(false);
      } else if (data.message) {
        message.error(`获取报告内容失败: ${data.message}`);
      }
    } catch (error) {
      console.error("获取报告内容失败:", error);
      message.error(`获取报告内容失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles['home-container']}>
      {/* 搜索栏 - 使用 Ant Design 组件 */}
      {/* 在搜索栏中添加历史记录按钮 */}
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
          style={{ borderRadius: '16px', padding: '14px', fontSize: '1.1rem', fontWeight: 500 }} // 保持原有部分样式，并添加右边距
        >
          搜索新闻
        </AntButton>
        {/* 历史记录按钮 */}
        <AntButton
          icon={<HistoryOutlined />}
          onClick={() => {
            setShowHistory(true);
            fetchHistoryReports();
          }}
          style={{ width:'50px',borderRadius: '16px', padding: '14px', fontSize: '1.1rem', fontWeight: 500}}
        >
        </AntButton>
        {/* 设置按钮 */}
        <AntButton
          icon={<SettingOutlined />}
          onClick={handleSettingsClick}
          style={{ width:'50px',borderRadius: '16px', padding: '14px', fontSize: '1.1rem', fontWeight: 500 }}
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
                  title={<Title level={5} style={{ margin: 0, fontSize: '1.3rem', fontWeight: 600, color: '#1d1d1f' }}>{item.keyword || '未知关键词'}</Title>}
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
      {newsList.length > 0 && !newsList[0].error && (
        <div className={styles['analyze-btn']}>
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

      {/* 分析报告弹窗 - 使用 Ant Design Modal */}
      <Modal
        title={<Title level={3} style={{ textAlign: 'center', marginBottom: 0 }}>舆情分析报告</Title>}
        open={showReport}
        onCancel={() => setShowReport(false)}
        footer={[
          <AntButton
            key="download"
            onClick={handleDownload}
            disabled={!report}
            style={{ borderRadius: '12px', marginRight: '8px' }}
          >
            下载报告
          </AntButton>,
          <AntButton
            key="email"
            onClick={() => setEmailModalVisible(true)}
            disabled={!report}
            style={{ borderRadius: '12px', marginRight: '8px' }}
          >
            发送邮件
          </AntButton>,
          <AntButton key="close" type="primary" onClick={() => setShowReport(false)} style={{ borderRadius: '12px' }}>
            关闭
          </AntButton>
        ]}
        width="60vw"
        styles={{ 
          body: { maxHeight: '70vh', overflowY: 'auto', background: '#fff', padding: '24px 40px' },
          content: { zIndex: 1000 }
        }}
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

      {/* 邮件发送弹窗 */}
      <Modal
        title="发送分析报告到邮箱"
        open={emailModalVisible}
        onCancel={() => setEmailModalVisible(false)}
        footer={[
          <AntButton key="cancel" onClick={() => setEmailModalVisible(false)} style={{ borderRadius: '12px' }}>
            取消
          </AntButton>,
          <AntButton 
            key="send" 
            type="primary" 
            loading={emailSending} 
            onClick={handleSendEmail} 
            disabled={!emailTo}
            style={{ borderRadius: '12px' }}
          >
            发送
          </AntButton>,
        ]}
      >
        <Form layout="vertical">
          <Form.Item 
            label="收件人邮箱" 
            rules={[{ required: true, message: '请输入收件人邮箱!' }]}
          >
            <Input 
              placeholder="请输入收件人邮箱" 
              value={emailTo} 
              onChange={e => setEmailTo(e.target.value)} 
            />
          </Form.Item>
        </Form>
      </Modal>
      {/* 设置弹窗 */}
      <Modal
        title={<Title level={3} style={{ textAlign: 'center', marginBottom: 0 }}>配置设置</Title>}
        open={showSettings}
        onCancel={() => setShowSettings(false)}
        footer={[
          <AntButton key="cancel" onClick={() => setShowSettings(false)} style={{ borderRadius: '12px' }}>
            取消
          </AntButton>,
          <AntButton key="submit" type="primary" loading={configLoading} onClick={() => configForm.submit()} style={{ borderRadius: '12px' }}>
            保存
          </AntButton>,
        ]}
        width="50vw"
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto', background: '#fff', padding: '24px 40px' } }}
      >
        {configLoading && Object.keys(config).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" tip="加载配置中..." />
          </div>
        ) : (
          <Form
            form={configForm}
            layout="vertical"
            onFinish={updateConfig}
            initialValues={config} // 使用状态中的配置作为初始值
          >
            {Object.keys(config).map(key => (
              <Form.Item
                key={key}
                label={key}
                name={key}
                rules={[{ required: true, message: `请输入 ${key}!` }]} // 简单的必填校验
              >
                <Input />
              </Form.Item>
            ))}
          </Form>
        )}
      </Modal>
    </div>
  )
}

export default Home



