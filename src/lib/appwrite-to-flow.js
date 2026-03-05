import { buildEdges, buildNodes, layoutNodesWithDagre } from "./graph-builder";
import { parseFlowJson } from "./flow-parser";
import { serializeFlowDocument } from "./flow-serializer";

function normalizeRelationType(rawType) {
  const value = String(rawType ?? "").toLowerCase();
  if (value === "manytoone" || value === "many_to_one") return "manyToOne";
  if (value === "onetomany" || value === "one_to_many") return "oneToMany";
  if (value === "onetoone" || value === "one_to_one") return "oneToOne";
  if (value === "manytomany" || value === "many_to_many") return "manyToMany";
  return value ? rawType : "manyToOne";
}

function normalizeColumn(rawColumn, index) {
  const key = String(
    rawColumn?.key ??
      rawColumn?.$id ??
      rawColumn?.id ??
      rawColumn?.name ??
      `column_${index + 1}`,
  );
  const type = String(rawColumn?.type ?? "string");
  const relatedTable = rawColumn?.relatedTable ?? rawColumn?.relatedCollection ?? null;

  const column = {
    key,
    type,
    required: Boolean(rawColumn?.required),
    array: Boolean(rawColumn?.array),
  };

  if (relatedTable) column.relatedTable = String(relatedTable);
  if (rawColumn?.relation) column.relation = String(rawColumn.relation);
  if (rawColumn?.relationId) column.relationId = String(rawColumn.relationId);
  if (rawColumn?.relationType) column.relationType = String(normalizeRelationType(rawColumn.relationType));
  if (rawColumn?.twoWay !== undefined) column.twoWay = Boolean(rawColumn.twoWay);
  if (rawColumn?.twoWayKey) column.twoWayKey = String(rawColumn.twoWayKey);
  if (rawColumn?.onDelete) column.onDelete = String(rawColumn.onDelete);
  if (rawColumn?.default !== undefined) column.default = rawColumn.default;

  return column;
}

function buildTableFlowModel(rawTable, databaseId, tableIndex) {
  const tableId = String(rawTable?.$id ?? rawTable?.id ?? rawTable?.name ?? `table_${tableIndex + 1}`);
  const tableName = String(rawTable?.name ?? tableId);
  const columns = Array.isArray(rawTable?.columns) ? rawTable.columns : [];

  return {
    $id: tableId,
    name: tableName,
    databaseId: String(databaseId),
    enabled: rawTable?.enabled !== false,
    columns: columns.map((column, index) => normalizeColumn(column, index)),
  };
}

function buildRelations(databases) {
  const relations = [];

  for (const database of databases) {
    const databaseTables = Array.isArray(database?.tables) ? database.tables : [];

    for (const table of databaseTables) {
      const sourceTableId = String(table?.$id ?? table?.id ?? "");
      if (!sourceTableId) continue;

      const relationships = Array.isArray(table?.relationships) ? table.relationships : [];
      for (const relation of relationships) {
        const targetRaw =
          relation?.relatedTable ??
          relation?.relatedTableId ??
          relation?.relatedCollection ??
          relation?.relatedCollectionId ??
          relation?.targetTableId ??
          null;
        if (!targetRaw) continue;

        const relationId = String(
          relation?.$id ??
            relation?.id ??
            `${sourceTableId}:${relation?.key ?? relation?.attribute ?? "rel"}:${targetRaw}`,
        );

        relations.push({
          id: relationId,
          sourceTableId,
          targetTableId: String(targetRaw),
          relationType: normalizeRelationType(relation?.relationType ?? relation?.type),
          sourceColumnKey: relation?.key ? String(relation.key) : null,
          onDelete: relation?.onDelete ? String(relation.onDelete) : null,
          twoWay: Boolean(relation?.twoWay),
          twoWayKey: relation?.twoWayKey ? String(relation.twoWayKey) : null,
        });
      }
    }
  }

  const unique = new Map();
  for (const relation of relations) {
    unique.set(String(relation.id), relation);
  }

  return [...unique.values()];
}

export function mapAppwriteSchemaToFlowDocument(schema) {
  const databases = Array.isArray(schema?.databases) ? schema.databases : [];
  const tables = [];

  for (const database of databases) {
    const databaseId = String(database?.$id ?? database?.id ?? "unknown");
    const databaseTables = Array.isArray(database?.tables) ? database.tables : [];

    databaseTables.forEach((table, index) => {
      tables.push(buildTableFlowModel(table, databaseId, index));
    });
  }

  const relations = buildRelations(databases);
  const draftFlowDocument = {
    projectId: schema?.projectId ? String(schema.projectId) : null,
    projectName: schema?.projectName ? String(schema.projectName) : null,
    importedAt: new Date().toISOString(),
    source: "appwrite",
    tables,
  };
  if (relations.length > 0) {
    draftFlowDocument.relations = relations;
  }

  const parsed = parseFlowJson(draftFlowDocument);
  const nodes = buildNodes(parsed.tables);
  const edges = buildEdges(parsed.relations);
  const laidOutNodes = layoutNodesWithDagre(nodes, edges);

  return serializeFlowDocument(draftFlowDocument, laidOutNodes, parsed.relations);
}

export function summarizeFlowDocument(flowDocument) {
  const tables = Array.isArray(flowDocument?.tables) ? flowDocument.tables : [];
  const relations = Array.isArray(flowDocument?.relations) ? flowDocument.relations : [];

  return {
    tableCount: tables.length,
    relationCount: relations.length,
    databases: [...new Set(tables.map((table) => String(table?.databaseId ?? "unknown")))].length,
  };
}
