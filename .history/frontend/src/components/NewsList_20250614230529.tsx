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

    // 创建 50 个粒子，每个粒子有随机的位置、半径和速度
    const particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width, // 粒子 x 坐标
      y: Math.random() * canvas.height, // 粒子 y 坐标
      r: Math.random() * 2 + 1, // 粒子半径，1~3 之间
      dx: (Math.random() - 0.5) * 1.5, // x 方向速度，-0.75~0.75
      dy: (Math.random() - 0.5) * 1.5, // y 方向速度，-0.75~0.75
    }));

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height); // 清空画布
      particles.forEach(p => {
        ctx.beginPath(); // 开始绘制路径
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); // 绘制圆形粒子
        ctx.fillStyle = '#3B87F8'; // 纯色 // 粒子颜色及透明度
        ctx.fill(); // 填充粒子
        // 更新粒子位置
        p.x += p.dx;
        p.y += p.dy;
        // 边界检测，碰到边缘反弹
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });
      animationId = requestAnimationFrame(draw); // 循环动画
    }

    draw(); // 启动动画

    // 组件卸载时取消动画帧
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
        pointerEvents: 'none', // 不影响鼠标事件
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