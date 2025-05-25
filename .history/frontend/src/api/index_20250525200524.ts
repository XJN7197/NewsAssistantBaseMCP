import { message } from 'antd';

const BASE_URL = 'http://localhost:8000'; // 假设后端运行在 localhost:8000

interface RequestOptions extends RequestInit {
  showLoading?: boolean; // 是否显示加载状态，这里简化处理，实际项目中可能需要更复杂的loading管理
  showError?: boolean; // 是否显示错误消息
}

// 通用请求函数
async function request<T>(url: string, options: RequestOptions = {}): Promise<T | null> {
  const { showLoading = false, showError = true, ...fetchOptions } = options;

  // 实际项目中，loading状态应该由调用方管理或使用全局loading状态
  // 这里仅作为示例，不实际控制loading状态
  // if (showLoading) { /* 显示loading */ }

  try {
    const response = await fetch(`${BASE_URL}${url}`, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();

    // if (showLoading) { /* 隐藏loading */ }

    return data as T;

  } catch (error: any) {
    // if (showLoading) { /* 隐藏loading */ }
    if (showError) {
      message.error(`请求失败: ${error.message}`);
    }
    console.error(`请求 ${url} 失败:`, error);
    return null;
  }
}

// API 调用函数

// 搜索新闻
export const searchNews = (keyword: string) => {
  // 根据环境变量决定是否使用mock数据
  if (import.meta.env.VITE_USE_MOCK_NEWS === 'true') {
    // 使用mock数据
    return new Promise(resolve => setTimeout(() => resolve({ news_list: [] }), 1000)); // 模拟延迟和返回空数据
  } else {
    // 使用实际API
    return request<{ news_list: any[] }>('/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ keyword }),
    });
  }
};

// 分析新闻
export const analyzeNews = (newsList: any[]) => {
  // 根据环境变量决定是否使用mock数据
  if (import.meta.env.VITE_USE_MOCK_REPORT === 'true') {
    // 使用mock数据
    return new Promise(resolve => setTimeout(() => resolve({ report: "Mock Report Content" }), 1000)); // 模拟延迟和返回mock报告
  } else {
    // 使用实际API
    return request<{ report: string }>('/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ news_list: newsList }),
    });
  }
};

// 获取配置
export const fetchConfig = () => {
  return request<{ config: any }>('/config');
};

// 更新配置
export const updateConfig = (config: any) => {
  return request<{ status: string, config: any, error?: string }>('/config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ config }),
  });
};

// 发送邮件
export const sendEmail = (to: string, subject: string, report_content: string) => {
  return request<{ status: string, message?: string }>('/send_email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      subject,
      report_content
    }),
  });
};

// 获取历史报告列表
export const fetchHistoryReports = () => {
  return request<{ reports: any[], message?: string }>('/reports');
};

// 查看历史报告内容
export const viewHistoryReport = (filename: string) => {
  return request<{ content: string, filename: string, message?: string }>(`/reports/${filename}`);
};

// 保存报告 (下载报告实际是调用后端保存)
export const saveReport = (content: string, filename: string) => {
  return request<{ status: string, message?: string }>('/save_report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content,
      filename
    }),
  });
};