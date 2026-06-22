import { DraggableSortable, DraggableSortableItem } from "@payloadcms/ui";
import type { FC } from "react";
import type { PermissionAction } from "../../../collections/permission-actions/types.js";
import {
  PERMISSION_ACTION_REORDER_I18N_PREFIX,
  type PermissionActionReorderTranslationKey,
} from "../types.js";

type ReorderTypeSectionProps = {
  baseClass: string;
  items: PermissionAction[];
  label?: string;
  onDragEnd: (args: { moveFromIndex: number; moveToIndex: number }) => void;
  reorderT: (key: PermissionActionReorderTranslationKey) => string;
  styles: Record<string, string>;
};

export const ReorderTypeSection: FC<ReorderTypeSectionProps> = ({
  baseClass,
  items,
  label,
  onDragEnd,
  reorderT,
  styles,
}) => (
  <section className={styles[`${baseClass}-drawer__section`]}>
    {label ? <h3 className={styles[`${baseClass}-drawer__section-title`]}>{label}</h3> : null}
    {items.length === 0 ? (
      <p className={styles[`${baseClass}-drawer__section-empty`]}>
        {reorderT(`${PERMISSION_ACTION_REORDER_I18N_PREFIX}:empty:placeholder`)}
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
                  sortableProps.isDragging ? styles[`${baseClass}-drawer__item--dragging`] : "",
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
                  aria-label={`${reorderT(`${PERMISSION_ACTION_REORDER_I18N_PREFIX}:item:dragAriaLabel`)} ${item.code ?? item.id}`}
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
                    {reorderT(`${PERMISSION_ACTION_REORDER_I18N_PREFIX}:item:sortOrderLabel`)}{" "}
                    {item.sortOrder ?? 0}
                  </span>
                </div>
              </div>
            )}
          </DraggableSortableItem>
        ))}
      </DraggableSortable>
    )}
  </section>
);
