import { useState } from "react";
import { Handle, Position } from "@xyflow/react";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import KeyOutlinedIcon from "@mui/icons-material/KeyOutlined";
import TextFieldsOutlinedIcon from "@mui/icons-material/TextFieldsOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import ToggleOnOutlinedIcon from "@mui/icons-material/ToggleOnOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import DataObjectOutlinedIcon from "@mui/icons-material/DataObjectOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import NumbersOutlinedIcon from "@mui/icons-material/NumbersOutlined";

function createEmptyTableNodeData(overrides = {}) {
  return {
    tableName: "new_table",
    databaseId: "",
    columnCount: 0,
    columns: [],
    ...overrides,
  };
}

function isPrimaryKey(column) {
  return String(column?.key ?? "").toLowerCase() === "id";
}

function isNumericType(type) {
  return /^(smallint|integer|bigint|int|int2|int4|int8|serial|bigserial|numeric|decimal|float|double|real)$/i.test(
    String(type ?? ""),
  );
}

function getColumnKind(column) {
  const type = String(column?.type ?? "").toLowerCase();
  const key = String(column?.key ?? "").toLowerCase();

  if (key.includes("email") || type.includes("email")) return "email";
  if (key.includes("url") || type.includes("url")) return "url";
  if (type.includes("json")) return "json";
  if (
    type.includes("timestamp") ||
    type.includes("datetime") ||
    type === "date" ||
    type.includes("time")
  ) {
    return "datetime";
  }
  if (type.includes("bool")) return "boolean";
  if (type.includes("point") || type.includes("geometry") || type.includes("geography")) {
    return "point";
  }
  if (isNumericType(type)) return "number";
  return "string";
}

function ColumnTypeIcon({ kind }) {
  switch (kind) {
    case "email":
      return <EmailOutlinedIcon className="table-node__column-type-icon" />;
    case "url":
      return <LinkOutlinedIcon className="table-node__column-type-icon" />;
    case "json":
      return <DataObjectOutlinedIcon className="table-node__column-type-icon" />;
    case "datetime":
      return <CalendarMonthOutlinedIcon className="table-node__column-type-icon" />;
    case "boolean":
      return <ToggleOnOutlinedIcon className="table-node__column-type-icon" />;
    case "point":
      return <LocationOnOutlinedIcon className="table-node__column-type-icon" />;
    case "number":
      return <NumbersOutlinedIcon className="table-node__column-type-icon" />;
    case "string":
    default:
      return <TextFieldsOutlinedIcon className="table-node__column-type-icon" />;
  }
}

export function TableNode({ data }) {
  const [titleDraft, setTitleDraft] = useState(() => data.tableName ?? "Untitled table");
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const tableName = data.tableName ?? "Untitled table";

  function onTitleInputKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      const nextTitle = titleDraft.trim();
      data.onRenameTable?.(nextTitle || "new_table");
      setIsEditingTitle(false);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setTitleDraft(tableName);
      setIsEditingTitle(false);
    }
  }

  function onStartEditTitle() {
    setTitleDraft(tableName);
    setIsEditingTitle(true);
  }

  function onBlurTitleInput() {
    const nextTitle = titleDraft.trim();
    data.onRenameTable?.(nextTitle || "new_table");
    setIsEditingTitle(false);
  }

  const columns = data.columns ?? [];
  const onOpenEditColumnPanel = data.onOpenEditColumnPanel;
  const onDeleteTable = data.onDeleteTable;

  function onDeleteClick(event) {
    event.stopPropagation();
    const isConfirmed = window.confirm(`Are you sure you want to delete "${tableName}"?`);
    if (!isConfirmed) return;
    onDeleteTable?.();
  }

  return (
    <div className="table-node">
      <Handle type="target" position={Position.Left} />
      <div className="table-node__header">
        <div className="table-node__title">
          <span className="table-node__header-icon" aria-hidden>
            <TableChartOutlinedIcon />
          </span>
          {isEditingTitle ? (
            <input
              autoFocus
              type="text"
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              onBlur={onBlurTitleInput}
              onKeyDown={onTitleInputKeyDown}
              className="table-node__title-input"
            />
          ) : (
            <span
              className="table-node__header-text"
              onDoubleClick={onStartEditTitle}
              title="Double click to edit"
            >
              {tableName}
            </span>
          )}
        </div>
        <button
          type="button"
          className="table-node__header-icon-btn"
          onClick={onDeleteClick}
          aria-label={`Delete ${tableName}`}
          title="Delete table"
        >
          <span className="table-node__header-icon" aria-hidden>
            <DeleteOutlineOutlinedIcon />
          </span>
        </button>
      </div>
      <div className="table-node__columns">
        {columns.length === 0 ? (
          <div className="table-node__column table-node__column--empty">No columns</div>
        ) : (
          columns.map((column, index) => {
            const primary = isPrimaryKey(column);
            const kind = getColumnKind(column);

            return (
              <button
                key={`${column.key}-${index}`}
                type="button"
                className="table-node__column table-node__column-button"
                onClick={() => onOpenEditColumnPanel?.(index)}
                title={`Edit ${column.key}`}
              >
                <div className="table-node__column-left">
                  {primary ? (
                    <span className="table-node__column-key" aria-hidden>
                      <KeyOutlinedIcon />
                    </span>
                  ) : null}
                  <span
                    className={`table-node__column-dot ${column.required ? "table-node__column-dot--filled" : ""}`}
                    aria-hidden
                  />
                  <ColumnTypeIcon kind={kind} />
                  <span className="table-node__column-name">{column.key}</span>
                </div>
                <span className="table-node__column-type">{column.type}</span>
              </button>
            );
          })
        )}
      </div>
      <div className="table-node__footer">
        <button
          type="button"
          className="table-node__add-column-btn"
          onClick={() => data.onOpenAddColumnPanel?.()}
        >
          <AddOutlinedIcon />
        </button>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

TableNode.createEmptyData = createEmptyTableNodeData;
