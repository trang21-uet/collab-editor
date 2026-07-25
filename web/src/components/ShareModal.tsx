"use client";

import { useState } from "react";
import { Button, Form, Input, List, Modal, Select, message } from "antd";
import { api, ApiError, type Permission, type Role } from "@/lib/apiClient";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
];

export function ShareModal({
  documentId,
  token,
  permissions,
  open,
  onClose,
  onPermissionsChange,
}: {
  documentId: string;
  token: string;
  permissions: Permission[];
  open: boolean;
  onClose: () => void;
  onPermissionsChange: (next: Permission[]) => void;
}) {
  const [form] = Form.useForm<{ email: string; role: Role }>();
  const [inviting, setInviting] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  async function handleInvite(values: { email: string; role: Role }) {
    setInviting(true);
    try {
      const permission = await api.assignPermission(token, documentId, values.email, values.role);
      const next = permissions.filter((p) => p.userId !== permission.userId);
      onPermissionsChange([...next, permission]);
      form.resetFields();
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        form.setFields([
          { name: "email", errors: ["No account exists with that email — they must register first."] },
        ]);
      } else {
        message.error(err instanceof ApiError ? err.message : "Failed to share document");
      }
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(userId: string, role: Role) {
    setPendingUserId(userId);
    try {
      const permission = await api.updatePermissionRole(token, documentId, userId, role);
      onPermissionsChange(permissions.map((p) => (p.userId === userId ? permission : p)));
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "Failed to update role");
    } finally {
      setPendingUserId(null);
    }
  }

  async function handleRemove(userId: string) {
    setPendingUserId(userId);
    try {
      await api.revokePermission(token, documentId, userId);
      onPermissionsChange(permissions.filter((p) => p.userId !== userId));
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "Failed to remove collaborator");
    } finally {
      setPendingUserId(null);
    }
  }

  return (
    <Modal title="Share document" open={open} onCancel={onClose} footer={null}>
      <Form form={form} layout="inline" onFinish={handleInvite} className="mb-4">
        <Form.Item
          name="email"
          rules={[{ required: true, type: "email", message: "Enter a valid email" }]}
          style={{ flex: 1 }}
        >
          <Input placeholder="Collaborator's email" />
        </Form.Item>
        <Form.Item name="role" initialValue="editor">
          <Select options={ROLE_OPTIONS} style={{ width: 100 }} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={inviting}>
            Add
          </Button>
        </Form.Item>
      </Form>

      <List
        bordered
        dataSource={permissions}
        renderItem={(permission) => (
          <List.Item
            actions={[
              <Button
                key="remove"
                type="text"
                danger
                size="small"
                loading={pendingUserId === permission.userId}
                onClick={() => handleRemove(permission.userId)}
              >
                Remove
              </Button>,
            ]}
          >
            <List.Item.Meta
              title={permission.user.name}
              description={permission.user.email}
            />
            <Select
              value={permission.role}
              options={ROLE_OPTIONS}
              style={{ width: 100 }}
              disabled={pendingUserId === permission.userId}
              onChange={(role) => handleRoleChange(permission.userId, role)}
            />
          </List.Item>
        )}
      />
    </Modal>
  );
}
