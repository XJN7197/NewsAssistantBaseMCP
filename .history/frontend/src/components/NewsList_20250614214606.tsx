import React, { useRef, useEffect } from 'react';
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

const DynamicBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    let animationId: number;

    if (!ctx) return;

    // 动态粒子效果示例
    const particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 1,
      dx: (Math.random() - 0.5) * 1.5,
      dy: (Math.random() - 0.5) * 1.5,
    }));

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,150,255,0.5)';
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });
      animationId = requestAnimationFrame(draw);
    }

    draw();

    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={200}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
};

const NewsList: React.FC<NewsListProps> = ({
  newsList,
  selectedNews,
  onItemChange,
  loading,
}) => {
  const hasNews = newsList && newsList.length > 0;

  return (
    <div className={styles['news-list-container']} style={{ position: 'relative', minHeight: 200 }}>
      {loading && newsList.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
        </div>
      )}
      {!loading && !hasNews && (
        <>
          <DynamicBackground />
          <div style={{
            position: 'relative',
            zIndex: 1,
            textAlign: 'center',
            color: '#888',
            fontSize: 18,
            paddingTop: 80,
          }}>
            暂无新闻，请搜索
          </div>
        </>
      )}
      {hasNews && newsList[0].error && (
        <div className={styles['error-message']}>{newsList[0].error}</div>
      )}
      {hasNews && !newsList[0].error && (
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