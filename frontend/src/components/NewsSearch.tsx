import React from 'react';
import { Button as AntButton, Input } from 'antd';
import styles from '../pages/Home.module.css'; // 引入 Home.module.css 中的样式

interface NewsSearchProps {
  keyword: string;
  setKeyword: (keyword: string) => void;
  handleSearch: () => void;
  loading: boolean;
}

const NewsSearch: React.FC<NewsSearchProps> = ({
  keyword,
  setKeyword,
  handleSearch,
  loading,
}) => {
  return (
    <div className={styles['search-bar']}> {/* 使用 Home.module.css 中的样式 */} 
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
    </div>
  );
};

export default NewsSearch;