import React, { useState } from 'react';
import { Card, Radio, Button, Calendar, Badge, List, Typography, Flex, Timeline, theme } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ru';

dayjs.locale('ru');

const { Title, Text } = Typography;
const { useToken } = theme;

interface ScheduleEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'lecture' | 'practice' | 'exam' | 'other';
  location: string;
}

const generateDummyEvents = (): ScheduleEvent[] => {
  const events: ScheduleEvent[] = [];
  const now = dayjs();
  
  // Create some consistent dummy events around the current date
  const subjects = ['Математика', 'Физика', 'Программирование', 'Базы данных', 'Английский язык'];
  const locations = ['Ауд. 101', 'Ауд. 202', 'Лаборатория 3', 'Онлайн', 'Ауд. 404'];
  const types: ('lecture' | 'practice' | 'exam' | 'other')[] = ['lecture', 'practice', 'practice', 'lecture', 'other'];

  // Add events for the current month
  for (let i = -15; i <= 15; i++) {
    const currentDate = now.add(i, 'day');
    // Skip sundays
    if (currentDate.day() === 0) continue;

    // 1-3 events per day
    const eventsCount = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < eventsCount; j++) {
      const hour = 9 + j * 2 + Math.floor(Math.random() * 2); // random start hour between 9 and 15
      const start = currentDate.hour(hour).minute(0).second(0).toDate();
      const end = currentDate.hour(hour + 1).minute(30).second(0).toDate();
      
      const subjectIndex = (i + j + subjects.length) % subjects.length;
      
      events.push({
        id: `evt-${i}-${j}`,
        title: subjects[subjectIndex],
        start,
        end,
        type: types[Math.abs(subjectIndex) % types.length],
        location: locations[Math.abs(subjectIndex) % locations.length]
      });
    }
  }

  // Add an exam
  events.push({
    id: 'evt-exam',
    title: 'Экзамен по Программированию',
    start: now.add(5, 'day').hour(10).minute(0).second(0).toDate(),
    end: now.add(5, 'day').hour(14).minute(0).second(0).toDate(),
    type: 'exam',
    location: 'Ауд. 505'
  });

  return events;
};

const DUMMY_EVENTS = generateDummyEvents();

const exportToICS = (events: ScheduleEvent[]) => {
  const formatDateICS = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//UNiVerse//Schedule//EN\n";
  events.forEach(event => {
    icsContent += "BEGIN:VEVENT\n";
    icsContent += `UID:${event.id}@universe.com\n`;
    icsContent += `DTSTAMP:${formatDateICS(new Date())}\n`;
    icsContent += `DTSTART:${formatDateICS(event.start)}\n`;
    icsContent += `DTEND:${formatDateICS(event.end)}\n`;
    icsContent += `SUMMARY:${event.title}\n`;
    icsContent += `LOCATION:${event.location}\n`;
    icsContent += "END:VEVENT\n";
  });
  icsContent += "END:VCALENDAR";

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'schedule.ics');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const ScheduleView: React.FC = () => {
  const { token } = useToken();
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());

  const getEventsForDate = (date: Dayjs) => {
    return DUMMY_EVENTS.filter(e => dayjs(e.start).isSame(date, 'day')).sort((a, b) => a.start.getTime() - b.start.getTime());
  };

  const getBadgeStatus = (type: string) => {
    switch (type) {
      case 'lecture': return 'processing';
      case 'practice': return 'success';
      case 'exam': return 'error';
      default: return 'default';
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'lecture': return 'Лекция';
      case 'practice': return 'Практика';
      case 'exam': return 'Экзамен';
      default: return 'Другое';
    }
  };

  const dateCellRender = (value: Dayjs) => {
    const listData = getEventsForDate(value);
    return (
      <ul className="events" style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
        {listData.map((item) => (
          <li key={item.id}>
            <Badge 
              status={getBadgeStatus(item.type) as any} 
              text={<span style={{ fontSize: '11px' }}>{item.title}</span>} 
            />
          </li>
        ))}
      </ul>
    );
  };

  const cellRender = (current: Dayjs, info: any) => {
    if (info.type === 'date') return dateCellRender(current);
    return info.originNode;
  };

  const renderDayView = () => {
    const events = getEventsForDate(selectedDate);
    return (
      <Card title={`Расписание на ${selectedDate.format('DD MMMM YYYY')}`} variant="outlined">
        {events.length > 0 ? (
          <Timeline
            items={events.map(event => ({
              color: event.type === 'exam' ? 'red' : event.type === 'practice' ? 'green' : 'blue',
              children: (
                <div style={{ marginBottom: 16 }}>
                  <Text strong>{dayjs(event.start).format('HH:mm')} - {dayjs(event.end).format('HH:mm')}</Text>
                  <div><Text strong style={{ fontSize: 16 }}>{event.title}</Text></div>
                  <Flex gap="small" align="center" style={{ marginTop: 4 }}>
                    <Badge status={getBadgeStatus(event.type) as any} text={getTypeName(event.type)} />
                    <Text type="secondary">| {event.location}</Text>
                  </Flex>
                </div>
              )
            }))}
          />
        ) : (
          <Text type="secondary">На этот день нет занятий</Text>
        )}
      </Card>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = selectedDate.startOf('week');
    const days = Array.from({ length: 7 }).map((_, i) => startOfWeek.add(i, 'day'));

    return (
      <Flex vertical gap="middle">
        <Flex justify="space-between" align="center">
          <Button onClick={() => setSelectedDate(prev => prev.subtract(1, 'week'))}>Предыдущая неделя</Button>
          <Title level={4} style={{ margin: 0 }}>
            {startOfWeek.format('DD MMM')} - {startOfWeek.add(6, 'day').format('DD MMM YYYY')}
          </Title>
          <Button onClick={() => setSelectedDate(prev => prev.add(1, 'week'))}>Следующая неделя</Button>
        </Flex>
        
        <Flex gap="middle" style={{ overflowX: 'auto', paddingBottom: 16 }}>
          {days.map(day => {
            const events = getEventsForDate(day);
            const isToday = day.isSame(dayjs(), 'day');
            return (
              <Card 
                key={day.format('YYYY-MM-DD')} 
                size="small" 
                title={
                  <Flex justify="space-between">
                    <span style={{ textTransform: 'capitalize' }}>{day.format('dddd')}</span>
                    <span style={{ color: isToday ? token.colorPrimary : 'inherit' }}>{day.format('DD.MM')}</span>
                  </Flex>
                }
                style={{ 
                  flex: '1 0 250px', 
                  minWidth: 250, 
                  borderColor: isToday ? token.colorPrimary : undefined,
                  borderWidth: isToday ? 2 : 1
                }}
              >
                {events.length > 0 ? (
                  <List
                    size="small"
                    dataSource={events}
                    renderItem={event => (
                      <List.Item>
                        <div style={{ width: '100%' }}>
                          <Text strong style={{ display: 'block' }}>{dayjs(event.start).format('HH:mm')} {event.title}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>{getTypeName(event.type)} • {event.location}</Text>
                        </div>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Text type="secondary" style={{ textAlign: 'center', display: 'block', padding: '20px 0' }}>Свободный день</Text>
                )}
              </Card>
            );
          })}
        </Flex>
      </Flex>
    );
  };

  return (
    <Flex vertical gap="middle" style={{ height: '100%' }}>
      <Flex justify="space-between" align="center">
        <Radio.Group 
          value={viewMode} 
          onChange={(e) => setViewMode(e.target.value)}
          buttonStyle="solid"
        >
          <Radio.Button value="month">Месяц</Radio.Button>
          <Radio.Button value="week">Неделя</Radio.Button>
          <Radio.Button value="day">День</Radio.Button>
        </Radio.Group>

        <Button 
          type="primary" 
          icon={<DownloadOutlined />} 
          onClick={() => exportToICS(DUMMY_EVENTS)}
        >
          Экспорт в iCal
        </Button>
      </Flex>

      <Card variant="borderless" style={{ flex: 1, overflow: 'auto' }} styles={{ body: { padding: viewMode === 'month' ? 0 : 24 } }}>
        {viewMode === 'month' && (
          <Calendar 
            cellRender={cellRender} 
            value={selectedDate}
            onChange={(date) => {
              setSelectedDate(date);
              setViewMode('day'); // Switch to day view when a date is clicked
            }}
          />
        )}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
      </Card>
    </Flex>
  );
};

export default ScheduleView;
