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
import ToDo from '../components/ToDo';

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
      } else {
        console.error("保存报告失败:", data);
        Modal.error({
          title: '保存失败',
          content: data.message,
          zIndex: 1500,
        });
      }
    } catch (error) {
      console.error('保存报告失败:', error);
      Modal.error({
        title: '保存失败',
        content: String(error),
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
  }, [newsList, selectedNews]); // 添加 newsList 和 selectedNews 作为依赖

  // 获取配置
  const fetchConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const response = await fetch('http://localhost:8000/config');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data && data.config) {
        setConfig(data.config);
        // configForm.setFieldsValue(data.config); // 移动到 SettingsModal
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
  }, []); // 无依赖

  // 更新配置
  const updateConfig = useCallback(async (values: any) => {
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
  }, []); // 无依赖

  // 处理设置按钮点击
  const handleSettingsClick = () => {
    setShowSettings(true);
    // fetchConfig(); // 移动到 SettingsModal 的 useEffect 中
  };

  // 添加获取历史报告列表函数
  const fetchHistoryReports = useCallback(async () => {
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
  }, []); // 无依赖

  // 添加查看历史报告内容函数
  const viewHistoryReport = useCallback(async (filename: string) => {
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
    <ToDo></ToDo>
  );
};

export default Home;



