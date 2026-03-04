function normalizeRelationType(rawType) {
  if (!rawType) return "unknown";

  const value = String(rawType).toLowerCase();

  if (value === "manytoone" || value === "many_to_one") return "manyToOne";
  if (value === "onetomany" || value === "one_to_many") return "oneToMany";
  if (value === "onetoone" || value === "one_to_one") return "oneToOne";
  if (value === "manytomany" || value === "many_to_many") return "manyToMany";

  return rawType;
}

function toLookupKey(value) {
  return String(value).toLowerCase();
}

function chooseBestTarget(candidates, sourceTable) {
  if (!candidates || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const sameDatabase = candidates.find(
    (candidate) => candidate.databaseId === sourceTable.databaseId,
  );

  return sameDatabase ?? candidates[0];
}

function buildTableLookup(tables) {
  const byUniqueId = new Map();
  const byOriginalId = new Map();
  const byName = new Map();

  for (const table of tables) {
    byUniqueId.set(table.id, table);

    const originalKey = toLookupKey(table.originalId);
    const nameKey = toLookupKey(table.name);

    if (!byOriginalId.has(originalKey)) byOriginalId.set(originalKey, []);
    if (!byName.has(nameKey)) byName.set(nameKey, []);

    byOriginalId.get(originalKey).push(table);
    byName.get(nameKey).push(table);
  }

  return {
    byUniqueId,
    byOriginalId,
    byName,
  };
}

function resolveTableRef(lookup, sourceTable, tableRef) {
  if (!tableRef) return null;

  const raw = String(tableRef);
  const lower = toLookupKey(raw);

  const unique = lookup.byUniqueId.get(raw);
  if (unique) return unique;

  const originalIdCandidates = lookup.byOriginalId.get(lower);
  if (originalIdCandidates) {
    return chooseBestTarget(originalIdCandidates, sourceTable);
  }

  const nameCandidates = lookup.byName.get(lower);
  if (nameCandidates) {
    return chooseBestTarget(nameCandidates, sourceTable);
  }

  return null;
}

function resolveTableRefWithoutSource(lookup, tableRef) {
  if (!tableRef) return null;

  const raw = String(tableRef);
  const lower = toLookupKey(raw);

  const unique = lookup.byUniqueId.get(raw);
  if (unique) return unique;

  const originalIdCandidates = lookup.byOriginalId.get(lower);
  if (originalIdCandidates && originalIdCandidates.length > 0) {
    return originalIdCandidates[0];
  }

  const nameCandidates = lookup.byName.get(lower);
  if (nameCandidates && nameCandidates.length > 0) {
    return nameCandidates[0];
  }

  return null;
}

function extractColumns(rawColumns) {
  if (!Array.isArray(rawColumns)) return [];

  return rawColumns.map((column) => ({
    key: column?.key ? String(column.key) : "unknown",
    type: column?.type ? String(column.type) : "unknown",
    required: Boolean(column?.required),
    array: Boolean(column?.array),
    relatedTable: column?.relatedTable ? String(column.relatedTable) : null,
    relation: column?.relation ? String(column.relation) : null,
    relationId: column?.relationId ? String(column.relationId) : null,
    relationType: normalizeRelationType(column?.relationType ?? column?.relation),
    onDelete: column?.onDelete ? String(column.onDelete) : null,
    twoWay: Boolean(column?.twoWay),
    twoWayKey: column?.twoWayKey ? String(column.twoWayKey) : null,
  }));
}

function extractPosition(rawPosition) {
  const x = Number(rawPosition?.x);
  const y = Number(rawPosition?.y);

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  return { x, y };
}

function extractRelations(tables) {
  const relations = [];

  for (const table of tables) {
    for (const column of table.columns) {
      const isRelationship = column.type === "relationship";
      const hasLegacyRelation = Boolean(column.relation && column.relationId);

      if (!isRelationship && !hasLegacyRelation) continue;

      const targetTableRef = isRelationship
        ? column.relatedTable
        : String(column.relationId);

      if (!targetTableRef) continue;

      relations.push({
        id: `${table.id}:${column.key}:${targetTableRef}`,
        sourceTableId: table.id,
        sourceTableName: table.name,
        sourceColumnKey: column.key,
        targetTableRef,
        relationType: normalizeRelationType(
          column.relationType ?? column.relation ?? "unknown",
        ),
        onDelete: column.onDelete ?? null,
        twoWay: Boolean(column.twoWay),
        twoWayKey: column.twoWayKey ? String(column.twoWayKey) : null,
      });
    }
  }

  const dedup = new Map();
  for (const relation of relations) {
    dedup.set(relation.id, relation);
  }

  return [...dedup.values()];
}

function extractDocumentRelations(rawRelations, lookup) {
  if (!Array.isArray(rawRelations)) return [];

  return rawRelations.map((relation, index) => {
    const sourceTableRef =
      relation?.sourceTableId ??
      relation?.sourceTableRef ??
      relation?.sourceTableName ??
      null;
    const fallbackSource = resolveTableRefWithoutSource(lookup, sourceTableRef);
    const sourceTable = fallbackSource
      ? resolveTableRef(lookup, fallbackSource, sourceTableRef)
      : null;

    const targetTableRef =
      relation?.targetTableId ??
      relation?.targetTableRef ??
      relation?.targetTableName ??
      null;
    const targetTable = sourceTable
      ? resolveTableRef(lookup, sourceTable, targetTableRef)
      : resolveTableRefWithoutSource(lookup, targetTableRef);

    const relationType = normalizeRelationType(relation?.relationType ?? relation?.relation);
    const sourceColumnKey = relation?.sourceColumnKey
      ? String(relation.sourceColumnKey)
      : null;
    const id =
      relation?.id
        ? String(relation.id)
        : `${sourceTable?.id ?? sourceTableRef ?? "unknown"}:${sourceColumnKey ?? "rel"}:${targetTable?.id ?? targetTableRef ?? "unknown"}:${index}`;

    return {
      id,
      sourceTableId: sourceTable?.id ?? null,
      sourceTableName: sourceTable?.name ?? null,
      sourceColumnKey,
      targetTableRef: targetTableRef ? String(targetTableRef) : null,
      targetTableId: targetTable?.id ?? null,
      targetTableName: targetTable?.name ?? null,
      relationType,
      onDelete: relation?.onDelete ? String(relation.onDelete) : null,
      twoWay: Boolean(relation?.twoWay),
      twoWayKey: relation?.twoWayKey ? String(relation.twoWayKey) : null,
      broken: !sourceTable || !targetTable,
    };
  });
}

export function parseFlowJson(raw) {
  const rawTables = Array.isArray(raw?.tables) ? raw.tables : [];
  const idCounts = new Map();

  for (const table of rawTables) {
    const originalId = String(table?.$id ?? table?.name ?? "unknown_table");
    idCounts.set(originalId, (idCounts.get(originalId) ?? 0) + 1);
  }

  const tables = rawTables.map((table) => ({
    originalId: table?.$id ? String(table.$id) : String(table?.name ?? "unknown_table"),
    name: table?.name ? String(table.name) : String(table?.$id ?? "unknown_table"),
    databaseId: table?.databaseId ? String(table.databaseId) : "unknown",
    enabled: table?.enabled !== false,
    position: extractPosition(table?.position),
    columns: extractColumns(table?.columns),
  }))
    .map((table) => {
      const duplicateId = (idCounts.get(table.originalId) ?? 0) > 1;

      return {
        ...table,
        id: duplicateId ? `${table.databaseId}::${table.originalId}` : table.originalId,
      };
    });

  const lookup = buildTableLookup(tables);
  const hasDocumentRelations = Array.isArray(raw?.relations);
  const relations = hasDocumentRelations
    ? extractDocumentRelations(raw.relations, lookup)
    : extractRelations(tables).map((relation) => {
      const sourceTable = lookup.byUniqueId.get(relation.sourceTableId);
      const target = sourceTable
        ? resolveTableRef(lookup, sourceTable, relation.targetTableRef)
        : null;

      return {
        ...relation,
        targetTableId: target ? target.id : null,
        targetTableName: target ? target.name : null,
        broken: !sourceTable || !target,
      };
    });

  return {
    tables,
    relations,
    stats: {
      tableCount: tables.length,
      relationCount: relations.length,
      brokenRelationCount: relations.filter((relation) => relation.broken).length,
    },
  };
}
