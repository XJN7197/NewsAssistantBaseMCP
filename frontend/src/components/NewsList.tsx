import React from 'react';
import { List, Spin, Typography } from 'antd';
import NewsCard from './NewsCard';
import styles from '../pages/Home.module.css'; // 引入 Home.module.css 中的样式

const { Text } = Typography;

interface NewsListProps {
  newsList: any[]; // 根据实际新闻数据结构定义更精确的类型
  selectedNews: Set<number>;
  onItemChange: (id: number, checked: boolean) => void;
  loading: boolean;
}

const NewsList: React.FC<NewsListProps> = ({
  newsList,
  selectedNews,
  onItemChange,
  loading,
}) => {
  return (
    <div className={styles['news-list-container']}> {/* 使用 Home.module.css 中的样式 */} 
      {loading && newsList.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
        </div>
      )}
      {!loading && newsList.length === 0 && (
        <div style={{ textAlign: 'center', color: '#6c757d', fontSize: '1.1rem', padding: '40px 0' }}>
          暂无新闻，请搜索
        </div>
      )}
      {newsList.length > 0 && newsList[0].error && (
        <div className={styles['error-message']}>{newsList[0].error}</div>
      )}
      {newsList.length > 0 && !newsList[0].error && (
        <List
          itemLayout="horizontal"
          dataSource={newsList}
          renderItem={item => (
            <NewsCard
              key={item.id}
              item={item}
              selectedNews={selectedNews}
              onItemChange={onItemChange}
            />
          )}
        />
      )}
    </div>
  );
};

export default NewsList;