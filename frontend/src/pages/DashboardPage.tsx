import React, { useState, useEffect, useContext } from 'react';
import { 
  Layout, Menu, Typography, Card, Row, Col, Statistic, 
  Table, Tag, Badge, Spin, Avatar,
  Button, App, Flex, Dropdown, List, Empty,
  DatePicker, Select, Checkbox, theme
} from 'antd';
import type { Dayjs } from 'dayjs';
import {
  DashboardOutlined as DashboardIcon,
  BookOutlined as BookIcon,
  SolutionOutlined as GradeIcon,
  FormOutlined as AssignIcon,
  CalendarOutlined as CalendarIcon,
  BellOutlined as NotificationIcon,
  LogoutOutlined as LogoutIcon,
  UserOutlined as UserIcon,
  SunOutlined,
  MoonOutlined,
  ScheduleOutlined as ScheduleIcon
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { moodleApi } from '../services/api';
import type { Course, Grade, Assignment, MoodleEvent, Notification, CourseStatistics, CourseModule } from '../types';
import AssignmentModal from '../components/AssignmentModal';
import ScheduleView from '../components/ScheduleView';
import { ThemeContext } from '../App';

const { Header, Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;
const { useToken } = theme;

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const { token } = useToken();
  
  const [collapsed, setCollapsed] = useState(false);
  const [activeKey, setActiveKey] = useState('overview');
  const [loading, setLoading] = useState(true);
  
  const [data, setData] = useState<{
    courses: Course[];
    grades: Grade[];
    assignments: Assignment[];
    events: MoodleEvent[];
    notifications: Notification[];
    unreadCount: number;
    statistics: CourseStatistics | null;
  }>({
    courses: [],
    grades: [],
    assignments: [],
    events: [],
    notifications: [],
    unreadCount: 0,
    statistics: null,
  });

  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [hideCompleted, setHideCompleted] = useState<boolean>(false);

  const [isAssignmentModalVisible, setIsAssignmentModalVisible] = useState(false);
  const [selectedAssignmentModule, setSelectedAssignmentModule] = useState<CourseModule | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = { sortByDate: sortOrder };
      if (dateRange[0]) params.dateFrom = dateRange[0].unix();
      if (dateRange[1]) params.dateTo = dateRange[1].unix();
      if (hideCompleted) params.status = 'not_completed';

      const [coursesRes, gradesRes, assignmentsRes, eventsRes, notificationsRes, statsRes] = await Promise.all([
        moodleApi.getCourses(),
        moodleApi.getGrades(),
        moodleApi.getAssignments(params),
        moodleApi.getEvents(),
        moodleApi.getNotifications(),
        moodleApi.getStatistics(),
      ]);

      setData({
        courses: coursesRes.data,
        grades: gradesRes.data.grades,
        assignments: assignmentsRes.data,
        events: eventsRes.data,
        notifications: notificationsRes.data.notifications,
        unreadCount: notificationsRes.data.unreadCount,
        statistics: statsRes.data,
      });
    } catch (error) {
      console.error(error);
      message.error('Ошибка загрузки данных. Пожалуйста, убедитесь, что бэкенд запущен.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem('isLoggedIn')) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [navigate, sortOrder, dateRange, hideCompleted]);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    navigate('/login');
  };

  const menuItems = [
    { key: 'overview', icon: <DashboardIcon />, label: 'Обзор' },
    { key: 'courses', icon: <BookIcon />, label: 'Курсы' },
    { key: 'grades', icon: <GradeIcon />, label: 'Оценки' },
    { key: 'assignments', icon: <AssignIcon />, label: 'Задания' },
    { key: 'schedule', icon: <ScheduleIcon />, label: 'Расписание' },
    { key: 'events', icon: <CalendarIcon />, label: 'События' },
  ];

  const renderOverview = () => (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card variant="borderless" className="stat-card">
            <Statistic title="Всего курсов" value={data.statistics?.total || 0} prefix={<BookIcon />} />
          </Card>
        </Col>
        <Col span={12}>
          <Card variant="borderless" className="stat-card">
            <Statistic 
              title="Заданий" 
              value={data.assignments.length} 
              prefix={<AssignIcon />} 
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col span={16}>
          <Card variant="outlined" title="Последние курсы" extra={<Button type="link" onClick={() => setActiveKey('courses')}>Все</Button>}>
            <Flex vertical gap="middle">
              {data.courses.length > 0 ? (
                data.courses.slice(0, 3).map(course => (
                  <div 
                    key={course.id} 
                    style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px', borderRadius: 8 }}
                    className="course-list-item"
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold' }}>{course.fullname}</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>{course.shortname}</Text>
                    </div>
                  </div>
                ))
              ) : (
                <Empty description="Курсы не найдены" />
              )}
            </Flex>
          </Card>
        </Col>
        <Col span={8}>
          <Card variant="outlined" title="Ближайшие события" extra={<Button type="link" onClick={() => setActiveKey('events')}>Все</Button>}>
            <Flex vertical gap="small">
              {data.events.slice(0, 4).map(event => (
                <div key={event.id} style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, paddingBottom: 8 }}>
                  <div style={{ fontWeight: 500 }}>
                    {event.url ? (
                      <a href={event.url} target="_blank" rel="noopener noreferrer">{event.name}</a>
                    ) : (
                      event.name
                    )}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <span dangerouslySetInnerHTML={{ __html: event.formattedtime }} />
                  </Text>
                </div>
              ))}
            </Flex>
          </Card>
        </Col>
      </Row>
    </div>
  );

  const renderCourses = () => (
    <Row gutter={[16, 16]}>
      {data.courses.length > 0 ? (
        data.courses.map(course => (
          <Col span={8} key={course.id}>
            <Card 
              hoverable 
              variant="outlined"
              title={course.fullname}
              extra={<Tag color="blue" style={{ margin: 0 }}>{course.shortname}</Tag>}
              style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              styles={{ body: { flex: 1 } }}
              actions={[
                <Button 
                  type="link" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    navigate(`/courses/${course.id}/contents`); 
                  }}
                >
                  Просмотр контента
                </Button>
              ]}
            >
              <Paragraph ellipsis={{ rows: 2 }}>{course.summary || 'Нет описания'}</Paragraph>
            </Card>
          </Col>
        ))
      ) : (
        <Col span={24}>
          <Empty description="Курсы не найдены" />
        </Col>
      )}
    </Row>
  );

  const renderGrades = () => {
    const validGrades = data.grades.filter(g => {
      const isZero = g.grade === '0' || g.grade === '0.00' || g.rawgrade === 0;
      const isEmpty = !g.grade || g.grade === '-';
      return !isZero && !isEmpty;
    });

    const columns = [
      { 
        title: 'Курс', 
        dataIndex: 'course_name', 
        key: 'course_name',
        sorter: (a: Grade, b: Grade) => a.course_name.localeCompare(b.course_name)
      },
      { 
        title: 'Оценка', 
        dataIndex: 'grade', 
        key: 'grade', 
        render: (grade: string) => <Tag color="green">{grade}</Tag>,
        sorter: (a: Grade, b: Grade) => {
          const valA = a.rawgrade != null ? a.rawgrade : parseFloat(a.grade);
          const valB = b.rawgrade != null ? b.rawgrade : parseFloat(b.grade);
          
          if (!isNaN(valA) && !isNaN(valB)) {
            return valA - valB;
          }
          return String(a.grade || '').localeCompare(String(b.grade || ''));
        }
      },
    ];
    return <Table dataSource={validGrades} columns={columns} rowKey="course_name" pagination={false} locale={{ emptyText: 'Оценки не найдены' }} />;
  };

  const renderAssignments = () => (
    <Flex vertical gap="middle">
      <Flex gap="middle" align="center" style={{ marginBottom: 16 }}>
        <DatePicker.RangePicker 
          onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null])} 
        />
        <Select 
          value={sortOrder} 
          onChange={(value) => setSortOrder(value)}
          options={[
            { value: 'asc', label: 'Сначала старые' },
            { value: 'desc', label: 'Сначала новые' }
          ]}
        />
        <Checkbox 
          checked={hideCompleted} 
          onChange={(e) => setHideCompleted(e.target.checked)}
        >
          Скрыть выполненные
        </Checkbox>
      </Flex>
      {data.assignments.length > 0 ? (
        data.assignments.map(item => (
          <Card 
            variant="outlined" 
            key={item.id} 
            hoverable
            onClick={() => {
              setSelectedAssignmentModule({
                id: item.id,
                instance: item.id,
                name: item.name,
                modname: 'assign',
                description: item.description,
                contents: []
              });
              setIsAssignmentModalVisible(true);
            }}
          >
            <Flex justify="space-between" align="start">
              <div>
                <div style={{ fontSize: 16, fontWeight: 'bold' }}>{item.name}</div>
                <div style={{ color: token.colorTextDescription, marginBottom: 8 }}>{item.courseName}</div>
              </div>
              <Tag color="orange">Срок: {new Date(item.duedate * 1000).toLocaleDateString()}</Tag>
            </Flex>
            <div dangerouslySetInnerHTML={{ __html: item.description.length > 200 ? item.description.substring(0, 200) + '...' : item.description }} />
          </Card>
        ))
      ) : (
        <Empty description="Задания не найдены" />
      )}
    </Flex>
  );

  const renderEvents = () => (
    <Table 
      dataSource={data.events} 
      columns={[
        { 
          title: 'Событие', 
          dataIndex: 'name', 
          key: 'name',
          render: (text: string, record: MoodleEvent) => record.url ? (
            <a href={record.url} target="_blank" rel="noopener noreferrer">{text}</a>
          ) : text
        },
        { title: 'Курс', dataIndex: 'courseName', key: 'courseName' },
        { 
          title: 'Время', 
          dataIndex: 'formattedtime', 
          key: 'formattedtime',
          render: (text: string) => <span dangerouslySetInnerHTML={{ __html: text }} />
        },
        { title: 'Тип', dataIndex: 'eventtype', key: 'eventtype', render: (type: string) => <Tag>{type}</Tag> },
      ]} 
      rowKey="id" 
    />
  );

  const notificationMenu = (
    <Card 
      variant="outlined"
      style={{ width: 400, boxShadow: token.boxShadowSecondary }}
      styles={{ body: { padding: 0 } }}
      title={<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Уведомления</span>
        {data.unreadCount > 0 && <Tag color="blue">{data.unreadCount} новых</Tag>}
      </div>}
    >
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        <List
          itemLayout="horizontal"
          dataSource={data.notifications}
          locale={{ emptyText: <Empty description="Нет уведомлений" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          renderItem={(item) => (
            <List.Item style={{ padding: '12px 16px', cursor: 'pointer', backgroundColor: item.read ? 'transparent' : token.controlItemBgActive }}>
              <List.Item.Meta
                avatar={<Avatar icon={<NotificationIcon />} style={{ backgroundColor: item.read ? token.colorFillAlter : token.colorPrimary }} />}
                title={<div style={{ fontWeight: item.read ? 'normal' : 'bold', fontSize: 14 }}>{item.subject}</div>}
                description={
                  <div style={{ fontSize: 12 }}>
                    <div 
                      dangerouslySetInnerHTML={{ __html: item.message.length > 100 ? item.message.substring(0, 100) + '...' : item.message }} 
                      style={{ color: token.colorTextSecondary, marginBottom: 4 }}
                    />
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {new Date(item.timecreated * 1000).toLocaleString()}
                    </Text>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </div>
      <div style={{ padding: '8px 16px', textAlign: 'center', borderTop: `1px solid ${token.colorBorderSecondary}` }}>
        <Button type="link" size="small">Показать все</Button>
      </div>
    </Card>
  );

  const contentMap: Record<string, React.ReactNode> = {
    overview: renderOverview(),
    courses: renderCourses(),
    grades: renderGrades(),
    assignments: renderAssignments(),
    events: renderEvents(),
    schedule: <ScheduleView />,
  };

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={(value) => setCollapsed(value)} 
        theme={isDarkMode ? "dark" : "light"}
        style={{ 
          boxShadow: '2px 0 8px rgba(0,0,0,0.05)',
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
          zIndex: 10
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ height: 64, margin: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>
              {collapsed ? 'U' : 'UNiVerse'}
            </Title>
          </div>
          <Menu 
            theme={isDarkMode ? "dark" : "light"}
            selectedKeys={[activeKey]} 
            mode="inline" 
            items={menuItems} 
            onClick={({ key }) => setActiveKey(key)}
            style={{ flex: 1, borderRight: 0 }}
          />
          <div style={{ padding: '16px' }}>
            <Button 
              type="text" 
              icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />} 
              onClick={toggleTheme} 
              block 
              style={{ textAlign: 'left', display: collapsed ? 'flex' : 'block', justifyContent: 'center', marginBottom: 8 }}
            >
              {!collapsed && (isDarkMode ? 'Светлая тема' : 'Темная тема')}
            </Button>
            <Button 
              type="text" 
              icon={<LogoutIcon />} 
              onClick={handleLogout} 
              block 
              style={{ textAlign: 'left', display: collapsed ? 'flex' : 'block', justifyContent: 'center' }}
            >
              {!collapsed && 'Выйти'}
            </Button>
          </div>
        </div>
      </Sider>
      <Layout style={{ overflow: 'hidden' }}>
        <Header style={{ 
          background: token.colorBgContainer, 
          padding: '0 24px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'flex-end', 
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          zIndex: 9,
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Dropdown dropdownRender={() => notificationMenu} trigger={['click']} placement="bottomRight">
              <Badge count={data.unreadCount} size="small" offset={[-2, 4]}>
                <Button type="text" icon={<NotificationIcon />} />
              </Badge>
            </Dropdown>
             <Avatar style={{ backgroundColor: token.colorPrimary }} icon={<UserIcon />} />
            <Text strong>Студент</Text>
          </div>
        </Header>
        <Content style={{ 
          padding: '24px', 
          background: token.colorBgLayout, 
          overflow: 'auto',
          height: 'calc(100vh - 64px)'
        }}>
          <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
            <Title level={2} style={{ margin: 0 }}>{menuItems.find(i => i.key === activeKey)?.label}</Title>
          </Flex>
          
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Spin size="large" tip="Загрузка данных..." />
            </div>
          ) : (
            contentMap[activeKey]
          )}

          <AssignmentModal 
            visible={isAssignmentModalVisible}
            onClose={() => {
              setIsAssignmentModalVisible(false);
              setSelectedAssignmentModule(null);
            }}
            module={selectedAssignmentModule}
          />
        </Content>
      </Layout>
    </Layout>
  );
};

export default DashboardPage;
