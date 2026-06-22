"use client";

import {
  Button,
  DraggableSortable,
  DraggableSortableItem,
  Drawer,
  toast,
  useConfig,
  useDrawerSlug,
  useModal,
  useRouteCache,
  useTranslation,
} from "@payloadcms/ui";
import { type FC, useCallback, useEffect, useRef, useState } from "react";
import type { PermissionFeature } from "../../collections/permission-features/types.js";
import { CONSTANTS } from "../../lib/constants/index.js";
import {
  applySortOrders,
  fetchPermissionFeatures,
  getSortOrderChanges,
  moveItems,
  savePermissionFeatureSortOrders,
} from "./handlers.js";
import styles from "./reorder.module.scss";
import {
  PERMISSION_FEATURE_REORDER_I18N_PREFIX,
  type PermissionFeatureReorderTranslationKey,
} from "./types.js";

const { RBAC_PREFIX } = CONSTANTS.GENERAL;
const DRAWER_SLUG = "permission-feature-reorder";
const baseClass = `${RBAC_PREFIX}-permission-feature-reorder`;

export const PermissionFeatureReorderClient: FC = () => {
  const drawerSlug = useDrawerSlug(DRAWER_SLUG);
  const { config } = useConfig();
  const apiBase = config?.routes?.api || "/api";
  const { closeModal, openModal } = useModal();
  const { clearRouteCache } = useRouteCache();
  const { t } = useTranslation();
  const reorderT = useCallback(
    (key: PermissionFeatureReorderTranslationKey) => t(key as Parameters<typeof t>[0]),
    [t],
  );

  const [items, setItems] = useState<PermissionFeature[]>([]);
  const [originalItems, setOriginalItems] = useState<PermissionFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadControllerRef = useRef<AbortController | null>(null);

  const refreshListView = useCallback(() => {
    clearRouteCache();
  }, [clearRouteCache]);

  const loadItems = useCallback(async () => {
    loadControllerRef.current?.abort();
    const controller = new AbortController();
    loadControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const docs = await fetchPermissionFeatures({
        apiBase,
        signal: controller.signal,
      });
      const sorted = applySortOrders(docs);
      setItems(sorted);
      setOriginalItems(sorted);
    } catch (fetchError: unknown) {
      if (controller.signal.aborted) {
        return;
      }

      setError(
        fetchError instanceof Error
          ? fetchError.message
          : reorderT(`${PERMISSION_FEATURE_REORDER_I18N_PREFIX}:error:loadFailed`),
      );
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [apiBase, reorderT]);

  const openReorderDrawer = useCallback(() => {
    openModal(drawerSlug);
    void loadItems();
  }, [drawerSlug, loadItems, openModal]);

  const closeReorderDrawer = useCallback(() => {
    loadControllerRef.current?.abort();
    closeModal(drawerSlug);
    setError(null);
    setItems([]);
    setOriginalItems([]);
  }, [closeModal, drawerSlug]);

  useEffect(() => {
    return () => {
      loadControllerRef.current?.abort();
    };
  }, []);

  const onDragEnd = useCallback(
    ({ moveFromIndex, moveToIndex }: { moveFromIndex: number; moveToIndex: number }) => {
      setItems((current) => applySortOrders(moveItems(current, moveFromIndex, moveToIndex)));
    },
    [],
  );

  const onSave = useCallback(async () => {
    const changes = getSortOrderChanges(items, originalItems);

    if (!changes.length) {
      closeReorderDrawer();
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await savePermissionFeatureSortOrders({
        apiBase,
        items: changes,
      });
      toast.success(reorderT(`${PERMISSION_FEATURE_REORDER_I18N_PREFIX}:saveSuccess:message`));
      closeReorderDrawer();
      refreshListView();
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : reorderT(`${PERMISSION_FEATURE_REORDER_I18N_PREFIX}:error:saveFailed`),
      );
    } finally {
      setSaving(false);
    }
  }, [apiBase, closeReorderDrawer, items, originalItems, refreshListView, reorderT]);

  const hasChanges = getSortOrderChanges(items, originalItems).length > 0;

  return (
    <div className={styles[`${baseClass}-trigger`]}>
      <Button buttonStyle="subtle" onClick={openReorderDrawer} size="medium" type="button">
        {reorderT(`${PERMISSION_FEATURE_REORDER_I18N_PREFIX}:reorderButton:label`)}
      </Button>

      <Drawer
        className={styles[`${baseClass}-drawer`]}
        slug={drawerSlug}
        title={reorderT(`${PERMISSION_FEATURE_REORDER_I18N_PREFIX}:drawer:title`)}
      >
        <div className={styles[`${baseClass}-drawer__wrapper`]}>
          <p className={styles[`${baseClass}-drawer__description`]}>
            {reorderT(`${PERMISSION_FEATURE_REORDER_I18N_PREFIX}:drawer:description`)}
          </p>

          {loading ? (
            <p className={styles[`${baseClass}-drawer__placeholder`]}>
              {reorderT(`${PERMISSION_FEATURE_REORDER_I18N_PREFIX}:loading:placeholder`)}
            </p>
          ) : error ? (
            <p className={styles[`${baseClass}-drawer__error`]}>{error}</p>
          ) : items.length === 0 ? (
            <p className={styles[`${baseClass}-drawer__placeholder`]}>
              {reorderT(`${PERMISSION_FEATURE_REORDER_I18N_PREFIX}:empty:placeholder`)}
            </p>
          ) : (
            <DraggableSortable
              className={styles[`${baseClass}-drawer__list`]}
              ids={items.map((item) => String(item.id))}
              onDragEnd={onDragEnd}
            >
              {items.map((item) => (
                <DraggableSortableItem id={String(item.id)} key={String(item.id)}>
                  {(sortableProps) => (
                    <div
                      className={[
                        styles[`${baseClass}-drawer__item`],
                        sortableProps.isDragging
                          ? styles[`${baseClass}-drawer__item--dragging`]
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      ref={sortableProps.setNodeRef}
                      style={{
                        transform: sortableProps.transform,
                        transition: sortableProps.transition,
                      }}
                    >
                      <button
                        aria-label={`${reorderT(`${PERMISSION_FEATURE_REORDER_I18N_PREFIX}:item:dragAriaLabel`)} ${item.code ?? item.id}`}
                        className={styles[`${baseClass}-drawer__drag-handle`]}
                        type="button"
                        {...sortableProps.attributes}
                        {...sortableProps.listeners}
                      >
                        ⠿
                      </button>
                      <div className={styles[`${baseClass}-drawer__item-content`]}>
                        <span className={styles[`${baseClass}-drawer__item-code`]}>
                          {item.code ?? String(item.id)}
                        </span>
                        <span className={styles[`${baseClass}-drawer__item-meta`]}>
                          {reorderT(`${PERMISSION_FEATURE_REORDER_I18N_PREFIX}:item:statusLabel`)}{" "}
                          {item.status ?? "—"} ·{" "}
                          {reorderT(
                            `${PERMISSION_FEATURE_REORDER_I18N_PREFIX}:item:sortOrderLabel`,
                          )}{" "}
                          {item.sortOrder ?? 0}
                        </span>
                      </div>
                    </div>
                  )}
                </DraggableSortableItem>
              ))}
            </DraggableSortable>
          )}

          <div className={styles[`${baseClass}-drawer__controls`]}>
            <Button
              buttonStyle="secondary"
              disabled={saving}
              onClick={closeReorderDrawer}
              size="medium"
              type="button"
            >
              {reorderT(`${PERMISSION_FEATURE_REORDER_I18N_PREFIX}:cancelButton:label`)}
            </Button>
            <Button
              disabled={loading || saving || Boolean(error) || !hasChanges}
              onClick={() => {
                void onSave();
              }}
              size="medium"
              type="button"
            >
              {reorderT(`${PERMISSION_FEATURE_REORDER_I18N_PREFIX}:saveButton:label`)}
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
};
