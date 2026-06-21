import React, { useState, useContext } from 'react';
import { Form, Input, Button, Card, Typography, Layout, App, theme } from 'antd';
import { UserOutlined, LockOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { ThemeContext } from '../App';

const { Title, Text } = Typography;
const { Content } = Layout;

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const res = await authApi.login(values.username, values.password);
      message.success('Вход выполнен успешно');
      localStorage.setItem('isLoggedIn', 'true');
      if (res.data && res.data.token) {
        localStorage.setItem('moodleToken', res.data.token);
      }
      navigate('/dashboard');
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Ошибка входа. Проверьте учетные данные.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      <div style={{ position: 'absolute', top: 24, right: 24 }}>
        <Button 
          type="text" 
          icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />} 
          onClick={toggleTheme} 
          size="large"
        />
      </div>
      <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Card variant="outlined" style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', borderRadius: 12 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Title level={2} style={{ marginBottom: 8 }}>UNiVerse</Title>
            <Text type="secondary">Войдите в свой аккаунт Moodle</Text>
          </div>
          <Form
            name="login"
            onFinish={onFinish}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: 'Пожалуйста, введите имя пользователя!' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="Имя пользователя" />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Пожалуйста, введите пароль!' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Пароль" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                Войти
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Content>
    </Layout>
  );
};

export default LoginPage;
