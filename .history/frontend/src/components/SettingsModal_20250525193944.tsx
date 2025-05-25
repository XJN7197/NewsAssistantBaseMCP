import React from 'react';
import { Modal, Button as AntButton, Spin, Form, Input, Typography, message } from 'antd';

const { Title } = Typography;

interface SettingsModalProps {
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  config: any; // 根据实际配置数据结构定义更精确的类型
  configLoading: boolean;
  fetchConfig: () => void;
  updateConfig: (values: any) => Promise<void>;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  showSettings,
  setShowSettings,
  config,
  configLoading,
  fetchConfig,
  updateConfig,
}) => {
  const [configForm] = Form.useForm();

  // 当弹窗打开时获取配置
  React.useEffect(() => {
    if (showSettings) {
      fetchConfig();
    }
  }, [showSettings, fetchConfig]);

  // 当 config 更新时设置表单值
  React.useEffect(() => {
    configForm.setFieldsValue(config);
  }, [config, configForm]);

  const handleSave = async () => {
    try {
      const values = await configForm.validateFields();
      await updateConfig(values);
    } catch (errorInfo) {
      console.error('Validate Failed:', errorInfo);
      message.error('请检查表单填写是否正确。');
    }
  };

  return (
    <Modal
      title={<Title level={3} style={{ textAlign: 'center', marginBottom: 0 }}>配置设置</Title>}
      open={showSettings}
      onCancel={() => setShowSettings(false)}
      footer={[
        <AntButton key="cancel" onClick={() => setShowSettings(false)} style={{ borderRadius: '12px' }}>
          取消
        </AntButton>,
        <AntButton key="submit" type="primary" loading={configLoading} onClick={handleSave} style={{ borderRadius: '12px' }}>
          保存
        </AntButton>,
      ]}
      width="50vw"
      styles={{ body: { maxHeight: '70vh', overflowY: 'auto', background: '#fff', padding: '24px 40px' } }}
    >
      {configLoading && Object.keys(config).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" tip="加载配置中..." />
        </div>
      ) : (
        <Form
          form={configForm}
          layout="vertical"
          initialValues={config} // 使用状态中的配置作为初始值
        >
          {Object.keys(config).map(key => {
            let inputProps = {};

            // 根据不同字段设置不同的input type
            if (key === 'BASE_URL') {
              inputProps = { type: 'url', placeholder: '请输入有效的URL地址' };
            } else if (key === 'EMAIL_USER') {
              inputProps = { type: 'email', placeholder: '请输入有效的邮箱地址' };
            } else if (key === 'SMTP_SERVER') {
              inputProps = {
                type: 'text',
                placeholder: '请输入SMTP服务器地址',
                pattern: '^[a-zA-Z0-9][a-zA-Z0-9\-\.]+[a-zA-Z0-9]$'
              };
            }

            return (
              <Form.Item
                key={key}
                label={key}
                name={key}
                rules={[{ required: true, message: `请输入 ${key}!` }]} // 添加必填规则
              >
                <Input {...inputProps} />
              </Form.Item>
            );
          })}
        </Form>
      )}
    </Modal>
  );
};

export default SettingsModal;