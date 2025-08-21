import React, { useState } from 'react';
import { Card, Input, Button, Form, Typography, Space } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const [form] = Form.useForm();
  const { login, loading } = useAuth();
  const [pin, setPin] = useState('');

  const handleSubmit = async (values: { pin: string }) => {
    const success = await login(values.pin);
    if (success) {
      form.resetFields();
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(value);
    form.setFieldsValue({ pin: value });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          borderRadius: '12px'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <LockOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
          <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
            KANPUR
          </Title>
          <Text type="secondary">
            Enter your PIN to access the dashboard
          </Text>
        </div>

        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="pin"
            rules={[
              { required: true, message: 'Please enter your PIN' },
              { min: 4, message: 'PIN must be 4 digits' },
              { max: 4, message: 'PIN must be 4 digits' }
            ]}
          >
            <Input
              type="password"
              placeholder="Enter 4-digit PIN"
              value={pin}
              onChange={handlePinChange}
              style={{
                height: '50px',
                fontSize: '18px',
                textAlign: 'center',
                letterSpacing: '8px',
                fontFamily: 'monospace'
              }}
              maxLength={4}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{
                width: '100%',
                height: '50px',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              {loading ? 'Authenticating...' : 'Login'}
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            🔒 Secure PIN-based authentication
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default Login;
