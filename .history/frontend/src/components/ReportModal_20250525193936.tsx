import React from 'react';
import { Modal, Button as AntButton, Spin, Typography } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const { Title, Text } = Typography;

interface ReportModalProps {
  showReport: boolean;
  setShowReport: (show: boolean) => void;
  report: string | null;
  loading: boolean;
  handleDownload: () => void;
  setEmailModalVisible: (visible: boolean) => void;
}

const ReportModal: React.FC<ReportModalProps> = ({
  showReport,
  setShowReport,
  report,
  loading,
  handleDownload,
  setEmailModalVisible,
}) => {
  return (
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
  );
};

export default ReportModal;