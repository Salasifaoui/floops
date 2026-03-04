import { Position } from "@xyflow/react";
import dagre from "dagre";

const GRID_COLUMNS = 4;
const NODE_HORIZONTAL_GAP = 340;
const NODE_VERTICAL_GAP = 250;
const DAGRE_NODE_WIDTH = 260;
const DAGRE_NODE_HEIGHT = 210;

function relationTypeLabel(relationType) {
  switch (relationType) {
    case "manyToOne":
      return "N:1";
    case "oneToMany":
      return "1:N";
    case "oneToOne":
      return "1:1";
    case "manyToMany":
      return "N:N";
    default:
      return "rel";
  }
}

function isEdgeConnected(edge, nodeId) {
  return edge.source === nodeId || edge.target === nodeId;
}

export function getRelationEdgeId(relation) {
  if (relation?.id) return String(relation.id);

  const sourceTableId = String(relation?.sourceTableId ?? "unknown");
  const targetTableId = String(relation?.targetTableId ?? "unknown");
  const sourceColumnKey = String(relation?.sourceColumnKey ?? "rel");

  return `rel-${sourceTableId}-${sourceColumnKey}-${targetTableId}`;
}

export function buildNodes(tables) {
  return tables.map((table, index) => {
    const row = Math.floor(index / GRID_COLUMNS);
    const column = index % GRID_COLUMNS;

    const fallbackPosition = {
      x: column * NODE_HORIZONTAL_GAP,
      y: row * NODE_VERTICAL_GAP,
    };

    return {
      id: table.id,
      type: "tableNode",
      position: table.position ?? fallbackPosition,
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
      data: {
        tableName: table.name,
        originalId: table.originalId,
        databaseId: table.databaseId,
        enabled: table.enabled,
        columnCount: table.columns.length,
        columns: table.columns,
      },
    };
  });
}

export function buildEdges(relations, highlightedNodeId = null) {
  const edges = relations
    .filter((relation) => relation.sourceTableId && relation.targetTableId)
    .map((relation) => ({
      id: getRelationEdgeId(relation),
      source: relation.sourceTableId,
      target: relation.targetTableId,
      type: "custom-edge",
      data: {
        sourceColumnKey: relation.sourceColumnKey ?? null,
        relationType: relation.relationType ?? "manyToOne",
        relationLabel: relationTypeLabel(relation.relationType ?? "manyToOne"),
        onDelete: relation.onDelete,
      },
      animated: relation.twoWay,
    }));

  if (!highlightedNodeId) {
    return edges;
  }

  return edges.map((edge) => {
    const connected = isEdgeConnected(edge, highlightedNodeId);

    return {
      ...edge,
      style: {
        opacity: connected ? 1 : 0.15,
        strokeWidth: connected ? 2 : 1,
      },
      zIndex: connected ? 10 : 1,
    };
  });
}

export function layoutNodesWithDagre(
  nodes,
  edges,
  direction = "LR",
  spacing = { nodeSep: 50, rankSep: 90 },
) {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: direction,
    nodesep: spacing.nodeSep,
    ranksep: spacing.rankSep,
    marginx: 20,
    marginy: 20,
  });

  for (const node of nodes) {
    const width = node.width ?? node.measured?.width ?? DAGRE_NODE_WIDTH;
    const height = node.height ?? node.measured?.height ?? DAGRE_NODE_HEIGHT;

    graph.setNode(node.id, { width, height });
  }

  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  return nodes.map((node) => {
    const point = graph.node(node.id);

    if (!point) {
      return node;
    }

    const width = node.width ?? node.measured?.width ?? DAGRE_NODE_WIDTH;
    const height = node.height ?? node.measured?.height ?? DAGRE_NODE_HEIGHT;

    return {
      ...node,
      position: {
        x: point.x - width / 2,
        y: point.y - height / 2,
      },
    };
  });
}
