"use client";

import {
  Button,
  Drawer,
  Select,
  toast,
  useConfig,
  useDrawerSlug,
  useModal,
  useRouteCache,
  useTranslation,
} from "@payloadcms/ui";
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PermissionAction } from "../../collections/permission-actions/types.js";
import { CONSTANTS } from "../../lib/constants/index.js";
import {
  applySortOrders,
  fetchPermissionActions,
  getSortOrderChanges,
  mergePermissionActionsByType,
  moveItems,
  savePermissionActionSortOrders,
  splitPermissionActionsByType,
} from "./handlers.js";
import { ReorderTypeSection } from "./partials/reorder-type-section.js";
import styles from "./reorder.module.scss";
import {
  COLLECTIONS_PERMISSION_ACTIONS_I18N_PREFIX,
  PERMISSION_ACTION_REORDER_I18N_PREFIX,
  type PermissionActionReorderTranslationKey,
} from "./types.js";

const { RBAC_PREFIX } = CONSTANTS.GENERAL;
const DRAWER_SLUG = "permission-action-reorder";
const baseClass = `${RBAC_PREFIX}-permission-action-reorder`;
type ReorderTab =
  (typeof CONSTANTS.PERMISSION_ACTION.TYPE)[keyof typeof CONSTANTS.PERMISSION_ACTION.TYPE];

export const PermissionActionReorderClient: FC = () => {
  const drawerSlug = useDrawerSlug(DRAWER_SLUG);
  const { config } = useConfig();
  const apiBase = config?.routes?.api || "/api";
  const { closeModal, openModal } = useModal();
  const { clearRouteCache } = useRouteCache();
  const { t } = useTranslation();
  const reorderT = useCallback(
    (key: PermissionActionReorderTranslationKey) => t(key as Parameters<typeof t>[0]),
    [t],
  );

  const [mainItems, setMainItems] = useState<PermissionAction[]>([]);
  const [subItems, setSubItems] = useState<PermissionAction[]>([]);
  const [originalMainItems, setOriginalMainItems] = useState<PermissionAction[]>([]);
  const [originalSubItems, setOriginalSubItems] = useState<PermissionAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ReorderTab>(CONSTANTS.PERMISSION_ACTION.TYPE.MAIN);
  const loadControllerRef = useRef<AbortController | null>(null);

  const items = useMemo(
    () => mergePermissionActionsByType(mainItems, subItems),
    [mainItems, subItems],
  );
  const originalItems = useMemo(
    () => mergePermissionActionsByType(originalMainItems, originalSubItems),
    [originalMainItems, originalSubItems],
  );

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
      const docs = await fetchPermissionActions({
        apiBase,
        signal: controller.signal,
      });
      const { mainItems: loadedMainItems, subItems: loadedSubItems } =
        splitPermissionActionsByType(docs);
      setMainItems(loadedMainItems);
      setSubItems(loadedSubItems);
      setOriginalMainItems(loadedMainItems);
      setOriginalSubItems(loadedSubItems);
    } catch (fetchError: unknown) {
      if (controller.signal.aborted) {
        return;
      }

      setError(
        fetchError instanceof Error
          ? fetchError.message
          : reorderT(`${PERMISSION_ACTION_REORDER_I18N_PREFIX}:error:loadFailed`),
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
    setMainItems([]);
    setSubItems([]);
    setOriginalMainItems([]);
    setOriginalSubItems([]);
    setActiveTab(CONSTANTS.PERMISSION_ACTION.TYPE.MAIN);
  }, [closeModal, drawerSlug]);

  useEffect(() => {
    return () => {
      loadControllerRef.current?.abort();
    };
  }, []);

  const onMainDragEnd = useCallback(
    ({ moveFromIndex, moveToIndex }: { moveFromIndex: number; moveToIndex: number }) => {
      setMainItems((current) => applySortOrders(moveItems(current, moveFromIndex, moveToIndex)));
    },
    [],
  );

  const onSubDragEnd = useCallback(
    ({ moveFromIndex, moveToIndex }: { moveFromIndex: number; moveToIndex: number }) => {
      setSubItems((current) => applySortOrders(moveItems(current, moveFromIndex, moveToIndex)));
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
      await savePermissionActionSortOrders({
        apiBase,
        items: changes,
      });
      toast.success(reorderT(`${PERMISSION_ACTION_REORDER_I18N_PREFIX}:saveSuccess:message`));
      closeReorderDrawer();
      refreshListView();
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : reorderT(`${PERMISSION_ACTION_REORDER_I18N_PREFIX}:error:saveFailed`),
      );
    } finally {
      setSaving(false);
    }
  }, [apiBase, closeReorderDrawer, items, originalItems, refreshListView, reorderT]);

  const hasChanges = getSortOrderChanges(items, originalItems).length > 0;
  const hasItems = mainItems.length > 0 || subItems.length > 0;
  const mainTabLabel = reorderT(
    `${COLLECTIONS_PERMISSION_ACTIONS_I18N_PREFIX}:fields:type:mainLabel`,
  );
  const subTabLabel = reorderT(
    `${COLLECTIONS_PERMISSION_ACTIONS_I18N_PREFIX}:fields:type:subLabel`,
  );
  const typeOptions = useMemo(
    () => [
      {
        label: `${mainTabLabel} (${mainItems.length})`,
        value: CONSTANTS.PERMISSION_ACTION.TYPE.MAIN,
      },
      {
        label: `${subTabLabel} (${subItems.length})`,
        value: CONSTANTS.PERMISSION_ACTION.TYPE.SUB,
      },
    ],
    [mainItems.length, mainTabLabel, subItems.length, subTabLabel],
  );
  const selectedTypeOption = useMemo(
    () => typeOptions.find((option) => option.value === activeTab) ?? typeOptions[0],
    [activeTab, typeOptions],
  );

  return (
    <div className={styles[`${baseClass}-trigger`]}>
      <Button buttonStyle="subtle" onClick={openReorderDrawer} size="medium" type="button">
        {reorderT(`${PERMISSION_ACTION_REORDER_I18N_PREFIX}:reorderButton:label`)}
      </Button>

      <Drawer
        className={styles[`${baseClass}-drawer`]}
        slug={drawerSlug}
        title={reorderT(`${PERMISSION_ACTION_REORDER_I18N_PREFIX}:drawer:title`)}
      >
        <div className={styles[`${baseClass}-drawer__wrapper`]}>
          <p className={styles[`${baseClass}-drawer__description`]}>
            {reorderT(`${PERMISSION_ACTION_REORDER_I18N_PREFIX}:drawer:description`)}
          </p>

          {loading ? (
            <p className={styles[`${baseClass}-drawer__placeholder`]}>
              {reorderT(`${PERMISSION_ACTION_REORDER_I18N_PREFIX}:loading:placeholder`)}
            </p>
          ) : error ? (
            <p className={styles[`${baseClass}-drawer__error`]}>{error}</p>
          ) : !hasItems ? (
            <p className={styles[`${baseClass}-drawer__placeholder`]}>
              {reorderT(`${PERMISSION_ACTION_REORDER_I18N_PREFIX}:empty:placeholder`)}
            </p>
          ) : (
            <div className={styles[`${baseClass}-drawer__tabs`]}>
              <Select
                className={styles[`${baseClass}-drawer__type-select`]}
                isClearable={false}
                isSearchable={false}
                onChange={(option) => {
                  const selected = Array.isArray(option) ? option[0] : option;

                  if (selected?.value) {
                    setActiveTab(selected.value as ReorderTab);
                  }
                }}
                options={typeOptions}
                value={selectedTypeOption}
              />
              <div className={styles[`${baseClass}-drawer__panel`]}>
                {activeTab === CONSTANTS.PERMISSION_ACTION.TYPE.MAIN ? (
                  <ReorderTypeSection
                    baseClass={baseClass}
                    items={mainItems}
                    onDragEnd={onMainDragEnd}
                    reorderT={reorderT}
                    styles={styles}
                  />
                ) : (
                  <ReorderTypeSection
                    baseClass={baseClass}
                    items={subItems}
                    onDragEnd={onSubDragEnd}
                    reorderT={reorderT}
                    styles={styles}
                  />
                )}
              </div>
            </div>
          )}

          <div className={styles[`${baseClass}-drawer__controls`]}>
            <Button
              buttonStyle="secondary"
              disabled={saving}
              onClick={closeReorderDrawer}
              size="medium"
              type="button"
            >
              {reorderT(`${PERMISSION_ACTION_REORDER_I18N_PREFIX}:cancelButton:label`)}
            </Button>
            <Button
              disabled={loading || saving || Boolean(error) || !hasChanges}
              onClick={() => {
                void onSave();
              }}
              size="medium"
              type="button"
            >
              {reorderT(`${PERMISSION_ACTION_REORDER_I18N_PREFIX}:saveButton:label`)}
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
};
