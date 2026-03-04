import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  Position,
} from "@xyflow/react";
import { CustomEdge } from "../edges/custom_edge";
import { TableNode } from "../nodes/table_node";
import flowJson from "../json/flow.json";
import { parseFlowJson } from "../lib/flow-parser";
import {
  buildEdges,
  buildNodes,
  getRelationEdgeId,
  layoutNodesWithDagre,
} from "../lib/graph-builder";
import { serializeFlowDocument } from "../lib/flow-serializer";
import "../App.css";
import "@xyflow/react/dist/style.css";

const nodeTypes = {
  tableNode: TableNode,
};

const edgeTypes = {
  "custom-edge": CustomEdge,
};

const FLOW_STORAGE_KEY = "sufax-flow:flow-document";

function getDefaultColumnForm() {
  return {
    title: "",
    type: "int",
    required: false,
  };
}

function getDefaultRelationForm() {
  return {
    relatedTableId: "",
    relationType: "manyToOne",
    onDelete: "cascade",
    twoWay: false,
    twoWayKey: "",
  };
}

function toColumnKey(value) {
  const sanitized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  return sanitized || "relation";
}

function loadSavedFlowDocument() {
  try {
    const raw = window.localStorage.getItem(FLOW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.tables)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function validateFlowDocumentShape(candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return "JSON root must be an object.";
  }
  if (!Array.isArray(candidate.tables)) {
    return "JSON must include a top-level tables array.";
  }
  if ("relations" in candidate && !Array.isArray(candidate.relations)) {
    return "relations must be an array when provided.";
  }
  return "";
}

function downloadJsonDocument(json, filename) {
  const payload = JSON.stringify(json, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

function decorateNodes(nodes, selectedNodeId) {
  if (!selectedNodeId) return nodes;

  return nodes.map((node) => ({
    ...node,
    style: {
      opacity: node.id === selectedNodeId ? 1 : 0.2,
      borderWidth: node.id === selectedNodeId ? 2 : 1,
    },
    zIndex: node.id === selectedNodeId ? 10 : 1,
  }));
}

export default function WorkflowPage() {
  const [initialFlowContext] = useState(() => {
    const saved = loadSavedFlowDocument();

    if (saved) {
      return {
        document: saved,
        mode: "saved",
      };
    }

    return {
      document: flowJson,
      mode: "file",
    };
  });
  const [sourceFlowDocument, setSourceFlowDocument] = useState(initialFlowContext.document);
  const [sourceMode, setSourceMode] = useState(initialFlowContext.mode);
  const initialParsedFlow = useMemo(() => parseFlowJson(sourceFlowDocument), [sourceFlowDocument]);
  const [nodes, setNodes] = useState(() => buildNodes(initialParsedFlow.tables));
  const [relations, setRelations] = useState(() => initialParsedFlow.relations);
  const [searchTerm, setSearchTerm] = useState("");
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const [selectedDatabaseId, setSelectedDatabaseId] = useState(
    () => initialParsedFlow.tables[0]?.databaseId ?? "",
  );
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [columnPanelNodeId, setColumnPanelNodeId] = useState(null);
  const [columnPanelMode, setColumnPanelMode] = useState("add");
  const [editingColumnIndex, setEditingColumnIndex] = useState(null);
  const [newColumnForm, setNewColumnForm] = useState(() => getDefaultColumnForm());
  const [pendingRelationConnection, setPendingRelationConnection] = useState(null);
  const [editingRelationId, setEditingRelationId] = useState(null);
  const [relationForm, setRelationForm] = useState(() => getDefaultRelationForm());
  const [jsonDraft, setJsonDraft] = useState(() =>
    JSON.stringify(initialFlowContext.document, null, 2),
  );
  const [jsonError, setJsonError] = useState("");
  const [jsonStatus, setJsonStatus] = useState("");
  const columnTypes = useMemo(
    () => ["int", "float", "string", "boolean", "date", "datetime", "json"],
    [],
  );
  const relationTypeOptions = useMemo(
    () => ["manyToOne", "oneToOne", "oneToMany", "manyToMany"],
    [],
  );
  const relationDeleteOptions = useMemo(() => ["cascade", "setNull", "none"], []);

  const runtimeFlowDocument = useMemo(
    () => serializeFlowDocument(sourceFlowDocument, nodes, relations),
    [sourceFlowDocument, nodes, relations],
  );
  const runtimeParsedFlow = useMemo(
    () => parseFlowJson(runtimeFlowDocument),
    [runtimeFlowDocument],
  );

  useEffect(() => {
    window.localStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(runtimeFlowDocument));
  }, [runtimeFlowDocument]);

  const applyFlowDocument = useCallback((nextDocument, mode) => {
    const parsed = parseFlowJson(nextDocument);
    const nextNodes = buildNodes(parsed.tables);

    setSourceFlowDocument(nextDocument);
    setSourceMode(mode);
    setNodes(nextNodes);
    setRelations(parsed.relations);
    setSearchTerm("");
    setSelectedDatabaseId(parsed.tables[0]?.databaseId ?? "");
    setSelectedNodeId(null);
    setColumnPanelNodeId(null);
    setColumnPanelMode("add");
    setEditingColumnIndex(null);
    setNewColumnForm(getDefaultColumnForm());
    setPendingRelationConnection(null);
    setEditingRelationId(null);
    setRelationForm(getDefaultRelationForm());
  }, []);

  const onNodesChange = useCallback((changes) => {
    setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot));
  }, []);

  const onEdgesChange = useCallback((changes) => {
    const removedEdgeIds = new Set(
      changes.filter((change) => change.type === "remove").map((change) => change.id),
    );

    if (removedEdgeIds.size === 0) return;

    setRelations((snapshot) =>
      snapshot.filter((relation) => !removedEdgeIds.has(getRelationEdgeId(relation))),
    );
  }, []);

  const onConnect = useCallback((connection) => {
    const source = connection.source ? String(connection.source) : "";
    const target = connection.target ? String(connection.target) : "";
    if (!source || !target || source === target) return;

    const sourceNode = nodes.find((node) => node.id === source);
    const defaultTwoWayKey = sourceNode?.data?.tableName
      ? toColumnKey(sourceNode.data.tableName)
      : "";

    setColumnPanelNodeId(null);
    setColumnPanelMode("add");
    setEditingColumnIndex(null);
    setEditingRelationId(null);
    setPendingRelationConnection({
      sourceTableId: source,
      targetTableId: target,
    });
    setRelationForm({
      ...getDefaultRelationForm(),
      relatedTableId: target,
      twoWayKey: defaultTwoWayKey,
    });
  }, [nodes]);

  const onEdgeClick = useCallback((event, edge) => {
    event.preventDefault();
    event.stopPropagation();

    const relation = relations.find((item) => getRelationEdgeId(item) === edge.id);
    if (!relation) return;

    const sourceTableId = String(relation.sourceTableId ?? edge.source ?? "");
    const targetTableId = String(relation.targetTableId ?? edge.target ?? "");
    if (!sourceTableId || !targetTableId) return;

    const sourceNode = nodes.find((node) => node.id === sourceTableId);
    const defaultTwoWayKey = sourceNode?.data?.tableName
      ? toColumnKey(sourceNode.data.tableName)
      : "";

    setColumnPanelNodeId(null);
    setColumnPanelMode("add");
    setEditingColumnIndex(null);
    setEditingRelationId(String(relation.id ?? edge.id));
    setPendingRelationConnection({
      sourceTableId,
      targetTableId,
    });
    setRelationForm({
      relatedTableId: targetTableId,
      relationType: String(relation.relationType ?? "manyToOne"),
      onDelete: relation.onDelete ? String(relation.onDelete) : "none",
      twoWay: Boolean(relation.twoWay),
      twoWayKey: relation.twoWayKey
        ? String(relation.twoWayKey)
        : defaultTwoWayKey,
    });
  }, [nodes, relations]);

  const databaseOptions = useMemo(() => {
    const options = new Set(nodes.map((node) => String(node.data?.databaseId ?? "unknown")));
    return [...options];
  }, [nodes]);
  const activeDatabaseId = useMemo(() => {
    if (databaseOptions.length === 0) return "";
    if (databaseOptions.includes(selectedDatabaseId)) return selectedDatabaseId;
    return databaseOptions[0];
  }, [databaseOptions, selectedDatabaseId]);

  const filteredTables = useMemo(() => {
    return nodes.filter((node) => {
      const tableName = String(node.data?.tableName ?? "");
      const databaseId = String(node.data?.databaseId ?? "unknown");
      const matchDatabase = databaseId === activeDatabaseId;
      const matchSearch =
        normalizedSearchTerm.length === 0 ||
        tableName.toLowerCase().includes(normalizedSearchTerm);

      return matchDatabase && matchSearch;
    });
  }, [nodes, normalizedSearchTerm, activeDatabaseId]);

  const visibleTableIds = useMemo(
    () => new Set(filteredTables.map((tableNode) => tableNode.id)),
    [filteredTables],
  );
  const activeSelectedNodeId =
    selectedNodeId && visibleTableIds.has(selectedNodeId) ? selectedNodeId : null;

  const filteredRelationsCount = useMemo(
    () =>
      relations.filter(
        (relation) =>
          relation.targetTableId &&
          visibleTableIds.has(relation.sourceTableId) &&
          visibleTableIds.has(relation.targetTableId),
      ).length,
    [relations, visibleTableIds],
  );

  const relationPanelSourceNode = useMemo(
    () =>
      pendingRelationConnection
        ? nodes.find((node) => node.id === pendingRelationConnection.sourceTableId) ?? null
        : null,
    [nodes, pendingRelationConnection],
  );
  const relationPanelRelatedTableOptions = useMemo(() => {
    if (!pendingRelationConnection) return [];

    return nodes
      .filter((node) => node.id !== pendingRelationConnection.sourceTableId)
      .map((node) => ({
        id: node.id,
        name: String(node.data?.tableName ?? node.id),
      }));
  }, [nodes, pendingRelationConnection]);

  const closeRelationPanel = useCallback(() => {
    setPendingRelationConnection(null);
    setEditingRelationId(null);
    setRelationForm(getDefaultRelationForm());
  }, []);

  const onSaveRelation = useCallback(
    (event) => {
      event.preventDefault();
      if (!pendingRelationConnection) return;

      const sourceTableId = pendingRelationConnection.sourceTableId;
      const targetTableId = relationForm.relatedTableId || pendingRelationConnection.targetTableId;
      if (!sourceTableId || !targetTableId || sourceTableId === targetTableId) return;

      const targetNode = nodes.find((node) => node.id === targetTableId);
      const sourceNode = nodes.find((node) => node.id === sourceTableId);
      const targetTableName = targetNode?.data?.tableName ?? targetTableId;
      const baseColumnKey = toColumnKey(targetTableName);
      const relationType = relationForm.relationType || "manyToOne";
      const onDeleteValue = relationForm.onDelete === "none" ? null : relationForm.onDelete;
      const twoWay = Boolean(relationForm.twoWay);
      const twoWayKey = twoWay
        ? toColumnKey(
          relationForm.twoWayKey ||
            sourceNode?.data?.tableName ||
            "reverse_relation",
        )
        : null;

      setRelations((snapshot) => {
        const duplicate = snapshot.some(
          (relation) =>
            relation.sourceTableId === sourceTableId &&
            relation.targetTableId === targetTableId &&
            String(relation.id) !== String(editingRelationId),
        );
        if (duplicate) return snapshot;

        const existingColumnKeys = new Set(
          snapshot
            .filter((relation) => relation.sourceTableId === sourceTableId)
            .map((relation) => String(relation.sourceColumnKey ?? "").toLowerCase()),
        );
        const sourceColumns = Array.isArray(sourceNode?.data?.columns)
          ? sourceNode.data.columns
          : [];
        for (const column of sourceColumns) {
          existingColumnKeys.add(String(column?.key ?? "").toLowerCase());
        }

        let sourceColumnKey = baseColumnKey;
        let suffix = 2;
        while (existingColumnKeys.has(sourceColumnKey.toLowerCase())) {
          sourceColumnKey = `${baseColumnKey}_${suffix}`;
          suffix += 1;
        }

        if (editingRelationId) {
          return snapshot.map((relation) =>
            String(relation.id) === String(editingRelationId)
              ? {
                ...relation,
                sourceTableId,
                targetTableId,
                sourceColumnKey: relation.sourceColumnKey ?? sourceColumnKey,
                relationType,
                onDelete: onDeleteValue,
                twoWay,
                twoWayKey,
                broken: false,
              }
              : relation,
          );
        }

        return [
          ...snapshot,
          {
            id: `rel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            sourceTableId,
            targetTableId,
            sourceColumnKey,
            relationType,
            onDelete: onDeleteValue,
            twoWay,
            twoWayKey,
            broken: false,
          },
        ];
      });

      closeRelationPanel();
    },
    [closeRelationPanel, editingRelationId, nodes, pendingRelationConnection, relationForm],
  );

  const closeAddColumnPanel = useCallback(() => {
    setColumnPanelNodeId(null);
    setColumnPanelMode("add");
    setEditingColumnIndex(null);
    setNewColumnForm(getDefaultColumnForm());
  }, []);

  const openAddColumnPanel = useCallback((nodeId) => {
    closeRelationPanel();
    setSelectedNodeId(nodeId);
    setColumnPanelNodeId(nodeId);
    setColumnPanelMode("add");
    setEditingColumnIndex(null);
    setNewColumnForm(getDefaultColumnForm());
  }, [closeRelationPanel]);

  const openEditColumnPanel = useCallback((nodeId, columnIndex) => {
    closeRelationPanel();
    const node = nodes.find((item) => item.id === nodeId);
    const column = node?.data?.columns?.[columnIndex];
    if (!column) return;

    setSelectedNodeId(nodeId);
    setColumnPanelNodeId(nodeId);
    setColumnPanelMode("edit");
    setEditingColumnIndex(columnIndex);
    setNewColumnForm({
      title: String(column.key ?? ""),
      type: String(column.type ?? "int"),
      required: Boolean(column.required),
    });
  }, [closeRelationPanel, nodes]);

  const onRenameTable = useCallback((nodeId, tableName) => {
    const nextName = String(tableName ?? "").trim() || "new_table";

    setNodes((snapshot) =>
      snapshot.map((node) =>
        node.id === nodeId
          ? {
            ...node,
            data: {
              ...node.data,
              tableName: nextName,
            },
          }
          : node,
      ),
    );
  }, []);

  const onDeleteTable = useCallback((nodeId) => {
    setNodes((snapshot) => {
      const deletedNode = snapshot.find((node) => node.id === nodeId);
      const deletedTableRefs = new Set([
        String(nodeId),
        String(deletedNode?.data?.originalId ?? ""),
        String(deletedNode?.data?.tableName ?? ""),
      ]);

      return snapshot
        .filter((node) => node.id !== nodeId)
        .map((node) => {
          const columns = Array.isArray(node?.data?.columns) ? node.data.columns : [];
          const filteredColumns = columns.filter((column) => {
            const isRelationship = String(column?.type ?? "").toLowerCase() === "relationship";
            if (!isRelationship) return true;

            const relatedTable = String(column?.relatedTable ?? "");
            const relationId = String(column?.relationId ?? "");
            const relationRef = String(column?.relation ?? "");

            const pointsToDeletedTable =
              deletedTableRefs.has(relatedTable) ||
              deletedTableRefs.has(relationId) ||
              deletedTableRefs.has(relationRef);

            return !pointsToDeletedTable;
          });

          if (filteredColumns.length === columns.length) return node;

          return {
            ...node,
            data: {
              ...node.data,
              columns: filteredColumns,
              columnCount: filteredColumns.length,
            },
          };
        });
    });
    setRelations((snapshot) =>
      snapshot.filter(
        (relation) => relation.sourceTableId !== nodeId && relation.targetTableId !== nodeId,
      ),
    );
    setSelectedNodeId((snapshot) => (snapshot === nodeId ? null : snapshot));
    setColumnPanelNodeId((snapshot) => (snapshot === nodeId ? null : snapshot));
    setPendingRelationConnection((snapshot) =>
      snapshot &&
      (snapshot.sourceTableId === nodeId || snapshot.targetTableId === nodeId)
        ? null
        : snapshot,
    );
    setEditingRelationId((snapshot) => {
      if (!snapshot) return snapshot;
      const relation = relations.find((item) => String(item.id) === String(snapshot));
      if (!relation) return null;
      return relation.sourceTableId === nodeId || relation.targetTableId === nodeId
        ? null
        : snapshot;
    });
    setColumnPanelMode("add");
    setEditingColumnIndex(null);
    setNewColumnForm(getDefaultColumnForm());
  }, [relations]);

  const onSaveColumn = useCallback(
    (event) => {
      event.preventDefault();
      const title = newColumnForm.title.trim();

      if (!title || !columnPanelNodeId) return;

      setNodes((snapshot) =>
        snapshot.map((node) => {
          if (node.id !== columnPanelNodeId) return node;

          const columns = node.data.columns ?? [];
          const baseKey = title.toLowerCase().replace(/\s+/g, "_");
          const fallbackKey = `column_${columns.length + 1}`;
          const key = baseKey.length > 0 ? baseKey : fallbackKey;

          if (columnPanelMode === "edit" && editingColumnIndex !== null) {
            return {
              ...node,
              data: {
                ...node.data,
                columns: columns.map((column, index) =>
                  index === editingColumnIndex
                    ? {
                      ...column,
                      key,
                      type: newColumnForm.type,
                      required: newColumnForm.required,
                    }
                    : column,
                ),
              },
            };
          }

          return {
            ...node,
            data: {
              ...node.data,
              columnCount: columns.length + 1,
              columns: [
                ...columns,
                {
                  key,
                  type: newColumnForm.type,
                  required: newColumnForm.required,
                },
              ],
            },
          };
        }),
      );

      closeAddColumnPanel();
    },
    [closeAddColumnPanel, columnPanelMode, columnPanelNodeId, editingColumnIndex, newColumnForm],
  );

  const graphNodes = useMemo(
    () =>
      decorateNodes(
        nodes.map((node) => ({
          ...node,
          hidden: !visibleTableIds.has(node.id),
          data: {
            ...node.data,
            onOpenAddColumnPanel: () => openAddColumnPanel(node.id),
            onOpenEditColumnPanel: (columnIndex) => openEditColumnPanel(node.id, columnIndex),
            onRenameTable: (tableName) => onRenameTable(node.id, tableName),
            onDeleteTable: () => onDeleteTable(node.id),
          },
        })),
        activeSelectedNodeId,
      ),
    [
      nodes,
      visibleTableIds,
      activeSelectedNodeId,
      openAddColumnPanel,
      openEditColumnPanel,
      onRenameTable,
      onDeleteTable,
    ],
  );

  const graphEdges = useMemo(
    () =>
      buildEdges(relations, activeSelectedNodeId).map((edge) => {
        const isVisible =
          visibleTableIds.has(edge.source) && visibleTableIds.has(edge.target);

        return {
          ...edge,
          hidden: !isVisible,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 18,
            height: 18,
          },
        };
      }),
    [relations, visibleTableIds, activeSelectedNodeId],
  );

  const onAutoLayout = useCallback(() => {
    const visibleEdges = buildEdges(relations).filter(
      (edge) => visibleTableIds.has(edge.source) && visibleTableIds.has(edge.target),
    );

    setNodes((snapshot) => {
      const visibleNodes = snapshot.filter((node) => visibleTableIds.has(node.id));
      const hiddenNodes = snapshot.filter((node) => !visibleTableIds.has(node.id));
      const layoutedVisibleNodes = layoutNodesWithDagre(visibleNodes, visibleEdges, "LR");

      return [...layoutedVisibleNodes, ...hiddenNodes];
    });
  }, [relations, visibleTableIds]);

  const columnPanelNode = useMemo(
    () => nodes.find((node) => node.id === columnPanelNodeId) ?? null,
    [nodes, columnPanelNodeId],
  );

  const onExportJson = useCallback(() => {
    downloadJsonDocument(runtimeFlowDocument, "flow.updated.json");
  }, [runtimeFlowDocument]);

  const onPlayJson = useCallback(() => {
    setJsonError("");
    setJsonStatus("");

    let parsedDraft;
    try {
      parsedDraft = JSON.parse(jsonDraft);
    } catch (error) {
      setJsonError(`Invalid JSON: ${error instanceof Error ? error.message : "Unknown parse error."}`);
      return;
    }

    const shapeError = validateFlowDocumentShape(parsedDraft);
    if (shapeError) {
      setJsonError(shapeError);
      return;
    }

    window.localStorage.removeItem(FLOW_STORAGE_KEY);
    applyFlowDocument(parsedDraft, "manual");
    setJsonDraft(JSON.stringify(parsedDraft, null, 2));
    setJsonStatus("JSON loaded successfully. Started a new flow session.");
  }, [applyFlowDocument, jsonDraft]);

  const onResetToSourceJson = useCallback(() => {
    window.localStorage.removeItem(FLOW_STORAGE_KEY);
    applyFlowDocument(flowJson, "file");
    setJsonDraft(JSON.stringify(flowJson, null, 2));
    setJsonError("");
    setJsonStatus("Reset to src/json/flow.json.");
  }, [applyFlowDocument]);

  const onLoadCurrentJson = useCallback(() => {
    setJsonDraft(JSON.stringify(runtimeFlowDocument, null, 2));
    setJsonError("");
    setJsonStatus("Loaded current in-memory flow into editor.");
  }, [runtimeFlowDocument]);

  const onNodeTemplateDragStart = useCallback((event) => {
    event.dataTransfer.setData(
      "application/reactflow",
      JSON.stringify({
        nodeType: "tableNode",
      }),
    );
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const onCanvasDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onCanvasDrop = useCallback(
    (event) => {
      event.preventDefault();

      if (!reactFlowInstance) return;

      const rawPayload = event.dataTransfer.getData("application/reactflow");
      if (!rawPayload) return;

      let template;
      try {
        template = JSON.parse(rawPayload);
      } catch {
        return;
      }

      if (template.nodeType !== "tableNode") return;
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const nodeId = `manual-${Date.now()}`;

      setNodes((snapshot) => [
        ...snapshot,
        {
          id: nodeId,
          type: "tableNode",
          position,
          targetPosition: Position.Left,
          sourcePosition: Position.Right,
          data: TableNode.createEmptyData({
            databaseId: activeDatabaseId || "unknown",
            originalId: nodeId,
            enabled: true,
          }),
        },
      ]);
      setSelectedNodeId(nodeId);
    },
    [reactFlowInstance, activeDatabaseId],
  );

  return (
    <div className="app-shell">
      <aside className="app-node-sidebar">
        <div className="app-node-sidebar__title">Nodes</div>
        <div
          className="app-node-sidebar__item"
          draggable
          onDragStart={onNodeTemplateDragStart}
        >
          New Table node
        </div>
        <div className="app-node-sidebar__json">
          <div className="app-node-sidebar__json-title">Flow JSON</div>
          <div className="app-node-sidebar__json-source">
            Source:{" "}
            {sourceMode === "file" ? "src/json/flow.json" : sourceMode === "saved" ? "local draft" : "manual"}
          </div>
          <textarea
            className="app-node-sidebar__json-input"
            value={jsonDraft}
            onChange={(event) => setJsonDraft(event.target.value)}
            spellCheck={false}
            placeholder='{"tables":[...]}'
          />
          <div className="app-node-sidebar__json-actions">
            <button type="button" onClick={onPlayJson}>
              Play
            </button>
            <button type="button" onClick={onResetToSourceJson}>
              Reset
            </button>
            <button type="button" onClick={onLoadCurrentJson}>
              Use current
            </button>
          </div>
          {jsonError ? <div className="app-node-sidebar__json-error">{jsonError}</div> : null}
          {!jsonError && jsonStatus ? (
            <div className="app-node-sidebar__json-status">{jsonStatus}</div>
          ) : null}
        </div>
      </aside>
      <div className="app-canvas" onDragOver={onCanvasDragOver} onDrop={onCanvasDrop}>
        <div className="app-toolbar">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search table name..."
          />
          <select
            value={activeDatabaseId}
            onChange={(event) => setSelectedDatabaseId(event.target.value)}
          >
            {databaseOptions.map((databaseId) => (
              <option key={databaseId} value={databaseId}>
                {databaseId}
              </option>
            ))}
          </select>
          <button type="button" onClick={onAutoLayout}>
            Auto layout
          </button>
          <button type="button" onClick={onExportJson}>
            Export JSON
          </button>
          <span className="app-toolbar__stats">
            {filteredTables.length} tables | {filteredRelationsCount} relations |{" "}
            {runtimeParsedFlow.stats.brokenRelationCount} broken refs
          </span>
        </div>
        <ReactFlow
          nodes={graphNodes}
          edges={graphEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable
          fitView
          fitViewOptions={{ padding: 0.15 }}
        >
          <Background color="red" Background={"#cbd5e1"} variant={BackgroundVariant.Dots} />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
        {pendingRelationConnection ? (
          <div className="app-side-panel" role="dialog" aria-label="Add relation">
            <div className="app-side-panel__header">
              {editingRelationId ? "Edit relation" : "Add relation"}:{" "}
              {relationPanelSourceNode?.data?.tableName ?? pendingRelationConnection.sourceTableId}
            </div>
            <form onSubmit={onSaveRelation} className="app-side-panel__form">
              <label className="app-side-panel__field">
                <span>relatedTable</span>
                <select
                  value={relationForm.relatedTableId}
                  onChange={(event) =>
                    setRelationForm((snapshot) => ({
                      ...snapshot,
                      relatedTableId: event.target.value,
                    }))
                  }
                >
                  {relationPanelRelatedTableOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="app-side-panel__field">
                <span>relationType</span>
                <select
                  value={relationForm.relationType}
                  onChange={(event) =>
                    setRelationForm((snapshot) => ({
                      ...snapshot,
                      relationType: event.target.value,
                    }))
                  }
                >
                  {relationTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="app-side-panel__field">
                <span>onDelete</span>
                <select
                  value={relationForm.onDelete}
                  onChange={(event) =>
                    setRelationForm((snapshot) => ({
                      ...snapshot,
                      onDelete: event.target.value,
                    }))
                  }
                >
                  {relationDeleteOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="app-side-panel__checkbox">
                <input
                  type="checkbox"
                  checked={relationForm.twoWay}
                  onChange={(event) =>
                    setRelationForm((snapshot) => ({
                      ...snapshot,
                      twoWay: event.target.checked,
                    }))
                  }
                />
                <span>twoWay</span>
              </label>
              {relationForm.twoWay ? (
                <label className="app-side-panel__field">
                  <span>twoWayKey</span>
                  <input
                    autoFocus
                    type="text"
                    value={relationForm.twoWayKey}
                    onChange={(event) =>
                      setRelationForm((snapshot) => ({
                        ...snapshot,
                        twoWayKey: event.target.value,
                      }))
                    }
                    placeholder="reverse_relation_key"
                  />
                </label>
              ) : null}
              <div className="app-side-panel__actions">
                <button
                  type="button"
                  className="app-side-panel__btn app-side-panel__btn--ghost"
                  onClick={closeRelationPanel}
                >
                  Cancel
                </button>
                <button type="submit" className="app-side-panel__btn app-side-panel__btn--primary">
                  {editingRelationId ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        ) : null}
        {!pendingRelationConnection && columnPanelNode ? (
          <div className="app-side-panel" role="dialog" aria-label="Add column">
            <div className="app-side-panel__header">
              {columnPanelMode === "edit" ? "Edit column" : "Add column"}:{" "}
              {columnPanelNode.data.tableName}
            </div>
            <form onSubmit={onSaveColumn} className="app-side-panel__form">
              <label className="app-side-panel__field">
                <span>Title</span>
                <input
                  autoFocus
                  type="text"
                  value={newColumnForm.title}
                  onChange={(event) =>
                    setNewColumnForm((snapshot) => ({
                      ...snapshot,
                      title: event.target.value,
                    }))
                  }
                  placeholder="column_name"
                />
              </label>
              <label className="app-side-panel__field">
                <span>Type</span>
                <select
                  value={newColumnForm.type}
                  onChange={(event) =>
                    setNewColumnForm((snapshot) => ({
                      ...snapshot,
                      type: event.target.value,
                    }))
                  }
                >
                  {columnTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="app-side-panel__checkbox">
                <input
                  type="checkbox"
                  checked={newColumnForm.required}
                  onChange={(event) =>
                    setNewColumnForm((snapshot) => ({
                      ...snapshot,
                      required: event.target.checked,
                    }))
                  }
                />
                <span>Required</span>
              </label>
              <div className="app-side-panel__actions">
                <button
                  type="button"
                  className="app-side-panel__btn app-side-panel__btn--ghost"
                  onClick={closeAddColumnPanel}
                >
                  Cancel
                </button>
                <button type="submit" className="app-side-panel__btn app-side-panel__btn--primary">
                  {columnPanelMode === "edit" ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
