import React,{useEffect,useRef} from 'react';
import { List, Skeleton } from 'antd';

import NewsCard from './NewsCard';
import styles from '../pages/Home.module.css'; // 引入 Home.module.css 中的样式


interface NewsItem {
  id: number;
  error?: string;
  // 根据实际新闻数据结构添加其他属性
}

interface NewsListProps {
  newsList: NewsItem[];
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

    if (!ctx || !canvas) return;

    // 创建 60 个粒子，每个粒子有随机的位置、半径和速度
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width, // 粒子 x 坐标
      y: Math.random() * canvas.height, // 粒子 y 坐标
      r: Math.random() * 2 + 1, // 粒子半径，1~3 之间
      dx: (Math.random() - 0.5) * 1.2, // x 方向速度
      dy: (Math.random() - 0.5) * 1.2, // y 方向速度
    }));

    function draw() {
      if (!ctx || !canvas) return; // 修复 TS 报错，确保 ctx 和 canvas 存在
      ctx.clearRect(0, 0, canvas.width, canvas.height); // 清空画布
      // 画粒子间连线
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          if (dist < 80) { // 距离阈值
            ctx.save();
            ctx.globalAlpha = 1 - dist / 80; // 距离越近越不透明
            const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
            grad.addColorStop(0, '#3B87F8');
            grad.addColorStop(1, '#00FFE7');
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
      // 画粒子
      particles.forEach(p => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        // 发光效果
        ctx.shadowColor = '#00FFE7';
        ctx.shadowBlur = 12;
        // 渐变填充
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, '#00FFE7');
        g.addColorStop(1, '#3B87F8');
        ctx.fillStyle = g;
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.restore();
        // 更新粒子位置
        p.x += p.dx;
        p.y += p.dy;
        // 边界检测，碰到边缘反弹
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
    <div className={styles['news-list-container']} style={{ position: 'relative', minHeight: 500 }}>
      {loading && newsList.length === 0 && (
        <div className={styles['skeleton-container']}>
          {[1, 2, 3].map((item) => (
            <div key={item} className={styles['skeleton-item']}>
              <Skeleton
                active
                avatar
                paragraph={{ rows: 3 }}
                className={styles['news-skeleton']}
              />
            </div>
          ))}
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