"use client";

import { useEffect, useState } from "react";
import { Button, List, Modal, Spin, message } from "antd";
import { api, ApiError, type Version } from "@/lib/apiClient";

export function VersionHistoryPanel({
  documentId,
  token,
  canRestore,
  open,
  onClose,
}: {
  documentId: string;
  token: string;
  canRestore: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    api
      .listVersions(token, documentId)
      .then((fetched) => {
        if (!cancelled) setVersions(fetched);
      })
      .catch((err) => {
        if (!cancelled) {
          message.error(err instanceof ApiError ? err.message : "Failed to load version history");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, token, documentId]);

  function confirmRestore(version: number) {
    Modal.confirm({
      title: `Restore version ${version}?`,
      content:
        "This replaces the current content for everyone viewing this document. The current content isn't lost — it stays in history as its own version.",
      okText: "Restore",
      onOk: () => handleRestore(version),
    });
  }

  async function handleRestore(version: number) {
    setRestoringVersion(version);
    try {
      // The editor updates live via the existing Yjs sync once sync-server applies
      // the restore — no need to refetch or manually update content here.
      await api.restoreVersion(token, documentId, version);
      message.success(`Restored version ${version}`);
      onClose();
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "Failed to restore version");
    } finally {
      setRestoringVersion(null);
    }
  }

  return (
    <Modal title="Version history" open={open} onCancel={onClose} footer={null}>
      {loading ? (
        <div className="flex justify-center py-6">
          <Spin />
        </div>
      ) : (
        <List
          bordered
          dataSource={versions}
          locale={{ emptyText: "No saved versions yet" }}
          renderItem={(v) => (
            <List.Item
              actions={
                canRestore
                  ? [
                      <Button
                        key="restore"
                        size="small"
                        loading={restoringVersion === v.version}
                        disabled={restoringVersion !== null && restoringVersion !== v.version}
                        onClick={() => confirmRestore(v.version)}
                      >
                        Restore
                      </Button>,
                    ]
                  : []
              }
            >
              <List.Item.Meta
                title={`Version ${v.version}`}
                description={new Date(v.savedAt).toLocaleString()}
              />
            </List.Item>
          )}
        />
      )}
    </Modal>
  );
}
