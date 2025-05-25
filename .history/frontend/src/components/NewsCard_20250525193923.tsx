import React from 'react';
import { List, Checkbox, Typography } from 'antd';

const { Title, Text, Link } = Typography;

interface NewsCardProps {
  item: any; // 根据实际新闻数据结构定义更精确的类型
  selectedNews: Set<number>;
  onItemChange: (id: number, checked: boolean) => void;
}

const NewsCard: React.FC<NewsCardProps> = ({
  item,
  selectedNews,
  onItemChange,
}) => {
  return (
    <List.Item
      actions={[
        <Link href={item.url} target="_blank" rel="noopener noreferrer">阅读原文</Link>
      ]}
      style={{ background: '#fff', borderRadius: '12px', marginBottom: '16px', padding: '20px', boxShadow: '0 2px 12px 0 rgba(0,0,0,0.05)' }}
    >
      <List.Item.Meta
        avatar={<Checkbox checked={selectedNews.has(item.id)} onChange={e => onItemChange(item.id, e.target.checked)} style={{paddingRight: '10px'}}/>}
        title={<Title level={5} style={{ margin: 0, fontSize: '1.3rem', fontWeight: 600, color: '#1d1d1f' }}>{item.title}</Title>}
        description={<Text type="secondary" style={{ fontSize: '1rem', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.desc}</Text>}
      />
    </List.Item>
  );
};

export default NewsCard;