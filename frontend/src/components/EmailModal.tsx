import React, { useState } from 'react';
import { Modal, Button as AntButton, Form, Input, message } from 'antd';

interface EmailModalProps {
  emailModalVisible: boolean;
  setEmailModalVisible: (visible: boolean) => void;
  report: string | null;
}

const EmailModal: React.FC<EmailModalProps> = ({
  emailModalVisible,
  setEmailModalVisible,
  report,
}) => {
  const [emailTo, setEmailTo] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [form] = Form.useForm();

  // Reset form when modal opens
  React.useEffect(() => {
    if (emailModalVisible) {
      form.resetFields();
      setEmailTo(''); // Also reset local state
    }
  }, [emailModalVisible, form]);

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
          subject: `舆情分析报告`,
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

  return (
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
      <Form form={form} layout="vertical">
        <Form.Item
          label="收件人邮箱"
          name="email"
          rules={[
            { required: true, message: '请输入收件人邮箱!' },
            { type: 'email', message: '请输入有效的邮箱地址!' }
          ]}
        >
          <Input
            placeholder="请输入收件人邮箱"
            value={emailTo}
            onChange={e => setEmailTo(e.target.value)}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EmailModal;