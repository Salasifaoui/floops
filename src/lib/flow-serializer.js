function serializeColumn(column) {
  return {
    key: String(column?.key ?? "unknown"),
    type: String(column?.type ?? "unknown"),
    required: Boolean(column?.required),
    array: Boolean(column?.array),
    ...(column?.relatedTable ? { relatedTable: String(column.relatedTable) } : {}),
    ...(column?.relation ? { relation: String(column.relation) } : {}),
    ...(column?.relationId ? { relationId: String(column.relationId) } : {}),
    ...(column?.relationType ? { relationType: String(column.relationType) } : {}),
    ...(column?.onDelete ? { onDelete: String(column.onDelete) } : {}),
    ...(column?.twoWay ? { twoWay: Boolean(column.twoWay) } : {}),
    ...(column?.twoWayKey ? { twoWayKey: String(column.twoWayKey) } : {}),
    ...(column?.side ? { side: String(column.side) } : {}),
  };
}

function serializeTableNode(node) {
  const tableName = String(node?.data?.tableName ?? "new_table");
  const fallbackId = String(node?.id ?? tableName);
  const originalId = String(node?.data?.originalId ?? fallbackId);
  const columns = Array.isArray(node?.data?.columns) ? node.data.columns : [];

  return {
    $id: originalId,
    name: tableName,
    databaseId: String(node?.data?.databaseId ?? "unknown"),
    enabled: node?.data?.enabled !== false,
    columns: columns.map(serializeColumn),
    position: node?.position ?? { x: 0, y: 0 },
  };
}

function serializeRelation(relation, index) {
  const sourceTableId = relation?.sourceTableId ? String(relation.sourceTableId) : null;
  const targetTableId = relation?.targetTableId ? String(relation.targetTableId) : null;
  const sourceColumnKey = relation?.sourceColumnKey
    ? String(relation.sourceColumnKey)
    : null;
  const id =
    relation?.id
      ? String(relation.id)
      : `rel-${sourceTableId ?? "unknown"}-${sourceColumnKey ?? "rel"}-${targetTableId ?? "unknown"}-${index}`;

  return {
    id,
    sourceTableId,
    targetTableId,
    relationType: relation?.relationType ? String(relation.relationType) : "manyToOne",
    ...(sourceColumnKey ? { sourceColumnKey } : {}),
    ...(relation?.onDelete ? { onDelete: String(relation.onDelete) } : {}),
    ...(relation?.twoWay ? { twoWay: Boolean(relation.twoWay) } : {}),
    ...(relation?.twoWayKey ? { twoWayKey: String(relation.twoWayKey) } : {}),
  };
}

function sanitizeColumnKey(value) {
  const sanitized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  return sanitized || "relation";
}

function ensureRelationColumns(tables, nodes, relations) {
  const tableByNodeId = new Map();
  const relationColumnsByTable = new Map();

  nodes.forEach((node, index) => {
    tableByNodeId.set(String(node?.id ?? ""), tables[index]);
  });

  for (const relation of relations) {
    if (!relation?.sourceTableId || !relation?.targetTableId) continue;

    const sourceTable = tableByNodeId.get(String(relation.sourceTableId));
    const targetTable = tableByNodeId.get(String(relation.targetTableId));
    if (!sourceTable) continue;

    const relatedTable = String(
      targetTable?.name ?? relation?.targetTableName ?? relation?.targetTableId,
    );
    const baseKey = sanitizeColumnKey(
      relation?.sourceColumnKey || `${relatedTable}_id`,
    );
    const usedInTable = relationColumnsByTable.get(sourceTable.$id) ?? new Set();
    const existingKeys = new Set(
      (sourceTable.columns ?? []).map((column) => String(column?.key ?? "").toLowerCase()),
    );

    let columnKey = baseKey;
    let suffix = 2;
    while (
      usedInTable.has(columnKey.toLowerCase()) ||
      (
        existingKeys.has(columnKey.toLowerCase()) &&
        !(sourceTable.columns ?? []).some(
          (column) =>
            String(column?.key ?? "").toLowerCase() === columnKey.toLowerCase() &&
            String(column?.type ?? "").toLowerCase() === "relationship",
        )
      )
    ) {
      columnKey = `${baseKey}_${suffix}`;
      suffix += 1;
    }

    usedInTable.add(columnKey.toLowerCase());
    relationColumnsByTable.set(sourceTable.$id, usedInTable);

    const relationColumn = {
      key: columnKey,
      type: "relationship",
      required: false,
      array: false,
      relatedTable,
      relationType: relation?.relationType ? String(relation.relationType) : "manyToOne",
      twoWay: Boolean(relation?.twoWay),
      ...(relation?.twoWay ? { twoWayKey: String(relation?.twoWayKey ?? "") } : {}),
      ...(relation?.onDelete ? { onDelete: String(relation.onDelete) } : {}),
      side: "parent",
    };

    const relationColumnIndex = (sourceTable.columns ?? []).findIndex(
      (column) =>
        String(column?.key ?? "").toLowerCase() === columnKey.toLowerCase() ||
        (
          String(column?.type ?? "").toLowerCase() === "relationship" &&
          String(column?.relatedTable ?? "").toLowerCase() === relatedTable.toLowerCase()
        ),
    );

    if (relationColumnIndex >= 0) {
      sourceTable.columns[relationColumnIndex] = {
        ...sourceTable.columns[relationColumnIndex],
        ...relationColumn,
      };
    } else {
      sourceTable.columns.push(relationColumn);
    }
  }
}

export function serializeFlowDocument(baseFlow, nodes, relations = []) {
  const safeBase = baseFlow && typeof baseFlow === "object" ? baseFlow : {};
  const safeNodes = Array.isArray(nodes) ? nodes : [];
  const safeRelations = Array.isArray(relations) ? relations : [];
  const serializedTables = safeNodes.map(serializeTableNode);
  const serializedRelations = safeRelations
    .filter((relation) => relation?.sourceTableId && relation?.targetTableId)
    .map(serializeRelation);

  ensureRelationColumns(serializedTables, safeNodes, serializedRelations);

  return {
    ...safeBase,
    tables: serializedTables,
    relations: serializedRelations,
  };
}
