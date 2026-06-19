import React, { useState, useEffect } from 'react';
import { Modal, Typography, Button, Spin, Tag, Input, Form, App as AntdApp, List, Upload, theme } from 'antd';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { moodleApi } from '../services/api';
import type { CourseModule } from '../types';

const { Title, Text } = Typography;
const { useToken } = theme;

interface AssignmentModalProps {
  visible: boolean;
  onClose: () => void;
  module: CourseModule | null;
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({ visible, onClose, module }) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm();
  const { token } = useToken();

  useEffect(() => {
    if (visible && module?.instance) {
      fetchStatus();
    } else {
      setStatus(null);
      form.resetFields();
      setFileList([]);
    }
  }, [visible, module]);

  const fetchStatus = async () => {
    if (!module?.instance) return;
    setLoading(true);
    try {
      const response = await moodleApi.getAssignmentStatus(module.instance);
      setStatus(response.data);
    } catch (error) {
      console.error(error);
      message.error('Не удалось загрузить статус задания');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: { text?: string }) => {
    if (!module?.instance) return;
    setSubmitting(true);
    let fileItemId: number | undefined;

    try {
      if (fileList.length > 0) {
        setUploadingFile(true);
        const file = fileList[0] as any;
        const actualFile = file.originFileObj || file;
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(actualFile);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
        
        const uploadRes = await moodleApi.uploadFile(actualFile.name, base64);
        if (uploadRes.data && uploadRes.data.length > 0) {
          fileItemId = uploadRes.data[0].itemid;
        }
      }

      await moodleApi.submitAssignment(module.instance, values.text, fileItemId);
      message.success('Решение успешно отправлено');
      fetchStatus();
      form.resetFields();
      setFileList([]);
    } catch (error) {
      console.error(error);
      message.error('Ошибка при отправке решения');
    } finally {
      setUploadingFile(false);
      setSubmitting(false);
    }
  };

  const uploadProps: UploadProps = {
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    beforeUpload: (file) => {
      setFileList([file as unknown as UploadFile]);
      return false;
    },
    fileList,
    maxCount: 1,
  };

  const tokenStr = localStorage.getItem('moodleToken');

  return (
    <Modal
      title={<Title level={4} style={{ margin: 0 }}>{module?.name || 'Задание'}</Title>}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={700}
      destroyOnClose
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin tip="Загрузка статуса..." />
        </div>
      ) : (
        <div style={{ marginTop: 16 }}>
          {module?.description && (
            <div style={{ marginBottom: 24 }}>
              <Title level={5}>Описание</Title>
              <div 
                dangerouslySetInnerHTML={{ __html: module.description }} 
                style={{ background: token.colorFillAlter, padding: 16, borderRadius: 8, border: `1px solid ${token.colorBorderSecondary}` }}
              />
            </div>
          )}

          {module?.contents && module.contents.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <Title level={5}>Прикрепленные файлы</Title>
              <List
                size="small"
                bordered
                dataSource={module.contents}
                renderItem={(file: any) => {
                  const url = file.fileurl + (tokenStr ? `?token=${tokenStr}` : '');
                  return (
                    <List.Item
                      actions={[
                        <Button
                          key="download"
                          type="primary"
                          icon={<DownloadOutlined />}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Скачать
                        </Button>
                      ]}
                    >
                      <List.Item.Meta title={file.filename} />
                    </List.Item>
                  );
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <Title level={5}>Статус сдачи</Title>
            {status ? (
              <div style={{ background: token.colorFillAlter, padding: 16, borderRadius: 8 }}>
                <div style={{ marginBottom: 8 }}>
                  <Text strong>Статус: </Text>
                  <Tag color={status.status === 'submitted' || status.status === 'graded' ? 'green' : 'orange'}>
                    {status.status === 'submitted' ? 'Сдано на проверку' : 
                     status.status === 'graded' ? 'Оценено' : 
                     status.status === 'new' ? 'Нет попытки' : status.status}
                  </Tag>
                </div>
                {status.grade && (
                  <div>
                    <Text strong>Оценка: </Text>
                    <Text>{status.grade}</Text>
                  </div>
                )}
              </div>
            ) : (
              <Text type="secondary">Нет данных о статусе</Text>
            )}
          </div>

          {(!status || status.status === 'new' || status.status === 'draft') && (
            <div>
              <Title level={5}>Отправить решение</Title>
              <Form form={form} onFinish={handleSubmit} layout="vertical">
                <Form.Item
                  name="text"
                  label="Текст ответа"
                  rules={[{ required: fileList.length === 0, message: 'Пожалуйста, введите текст решения или прикрепите файл' }]}
                >
                  <Input.TextArea rows={6} placeholder="Введите ваш ответ здесь..." />
                </Form.Item>
                <Form.Item label="Прикрепить файл">
                  <Upload {...uploadProps}>
                    <Button icon={<UploadOutlined />}>Выбрать файл</Button>
                  </Upload>
                </Form.Item>
                <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                  <Button onClick={onClose} style={{ marginRight: 8 }} disabled={submitting}>Отмена</Button>
                  <Button type="primary" htmlType="submit" loading={submitting || uploadingFile}>
                    {uploadingFile ? 'Загрузка файла...' : 'Отправить'}
                  </Button>
                </Form.Item>
              </Form>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default AssignmentModal;
