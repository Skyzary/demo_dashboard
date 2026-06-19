import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Typography, Collapse, List, Spin, App as AntdApp, Button, Breadcrumb, Empty, theme } from 'antd';
import {
  FileOutlined,
  FolderOutlined,
  FormOutlined,
  QuestionCircleOutlined,
  MessageOutlined,
  AppstoreOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { moodleApi } from '../services/api';
import type { CourseSection, CourseModule } from '../types';
import AssignmentModal from '../components/AssignmentModal';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { useToken } = theme;

const getModuleIcon = (modname: string) => {
  switch (modname) {
    case 'resource':
      return <FileOutlined />;
    case 'folder':
      return <FolderOutlined />;
    case 'assign':
      return <FormOutlined />;
    case 'quiz':
      return <QuestionCircleOutlined />;
    case 'forum':
      return <MessageOutlined />;
    default:
      return <AppstoreOutlined />;
  }
};

const CourseContents: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const { token } = useToken();
  
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedModule, setSelectedModule] = useState<CourseModule | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (!courseId) return;

    const fetchContents = async () => {
      setLoading(true);
      try {
        const response = await moodleApi.getCourseContents(parseInt(courseId, 10));
        // Filter empty sections (no name or no modules)
        const validSections = response.data.filter(
          section => section.name && section.modules && section.modules.length > 0
        );
        setSections(validSections);
      } catch (error) {
        console.error(error);
        message.error('Не удалось загрузить содержимое курса');
      } finally {
        setLoading(false);
      }
    };

    fetchContents();
  }, [courseId, message]);

  const handleModuleClick = (mod: CourseModule) => {
    if (mod.modname === 'assign') {
      setSelectedModule(mod);
      setModalVisible(true);
    } else if (mod.url) {
      window.open(mod.url, '_blank', 'noopener,noreferrer');
    }
  };

  const items = sections.map(section => ({
    key: section.id.toString(),
    label: <Title level={5} style={{ margin: 0 }}>{section.name}</Title>,
    children: (
      <List
        itemLayout="horizontal"
        dataSource={section.modules}
        renderItem={(mod: CourseModule) => (
          <List.Item 
            style={{ cursor: mod.modname === 'assign' || mod.url ? 'pointer' : 'default' }}
            onClick={() => handleModuleClick(mod)}
            className="course-module-item"
          >
            <List.Item.Meta
              avatar={<div style={{ fontSize: 24, color: token.colorPrimary, marginTop: 4 }}>{getModuleIcon(mod.modname)}</div>}
              title={
                <Text style={{ fontSize: 16, color: (mod.modname === 'assign' || mod.url) ? token.colorPrimary : 'inherit' }}>
                  {mod.name}
                </Text>
              }
              description={<Text type="secondary">Тип: {mod.modname}</Text>}
            />
          </List.Item>
        )}
      />
    ),
  }));

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: token.colorBgContainer, padding: '0 24px', display: 'flex', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard')}>
          Назад в дашборд
        </Button>
      </Header>
      <Content style={{ padding: '24px 50px', background: token.colorBgLayout }}>
        <Breadcrumb style={{ margin: '16px 0' }} items={[{ title: <a onClick={() => navigate('/dashboard')}>Дашборд</a> }, { title: 'Содержимое курса' }]} />
        <div style={{ background: token.colorBgContainer, padding: 24, minHeight: 280, borderRadius: 8 }}>
          <Title level={2}>Содержимое курса</Title>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <Spin size="large" tip="Загрузка содержимого..." />
            </div>
          ) : sections.length > 0 ? (
            <Collapse items={items} defaultActiveKey={sections.length > 0 ? [sections[0].id.toString()] : []} />
          ) : (
            <Empty description="В этом курсе пока нет доступных материалов." />
          )}
        </div>
      </Content>
      <AssignmentModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
        module={selectedModule} 
      />
    </Layout>
  );
};

export default CourseContents;
