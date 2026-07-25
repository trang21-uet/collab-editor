"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Form, Input, List, Modal, Spin, Typography, message } from "antd";
import { api, ApiError, type Document } from "@/lib/apiClient";
import { useRequireAuth } from "@/lib/useRequireAuth";

export default function DashboardPage() {
  const { user, token, status, logout } = useRequireAuth();
  const router = useRouter();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm<{ title: string }>();

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    api
      .listDocuments(token)
      .then((docs) => {
        if (!cancelled) setDocuments(docs);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load documents");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleCreate(values: { title: string }) {
    if (!token) return;
    setCreating(true);
    try {
      const doc = await api.createDocument(token, values.title);
      router.push(`/documents/${doc.id}`);
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "Failed to create document");
      setCreating(false);
    }
  }

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Spin />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>
            Your documents
          </Typography.Title>
          {user && (
            <p className="mt-1 text-sm text-black/60 dark:text-white/60">
              Signed in as <span className="font-medium">{user.name}</span>{" "}
              <button type="button" onClick={logout} className="underline">
                Log out
              </button>
            </p>
          )}
        </div>
        <Button type="primary" onClick={() => setModalOpen(true)}>
          New document
        </Button>
      </div>

      {loading && <Spin />}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && (
        <List
          bordered
          dataSource={documents}
          locale={{ emptyText: "No documents yet — create your first one." }}
          renderItem={(doc) => (
            <List.Item>
              <a
                className="w-full font-medium hover:underline"
                href={`/documents/${doc.id}`}
              >
                {doc.title}
              </a>
            </List.Item>
          )}
        />
      )}

      <Modal
        title="New document"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={creating}
        okText="Create"
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: "Please enter a title" }]}
          >
            <Input autoFocus placeholder="Untitled document" />
          </Form.Item>
        </Form>
      </Modal>
    </main>
  );
}
