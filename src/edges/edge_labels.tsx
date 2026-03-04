import React from "react";
import {
    BaseEdge,
    EdgeLabelRenderer,
    getStraightPath,
    useReactFlow,
  } from '@xyflow/react';
   
  export function CustomEdgeLabels({ id, sourceX, sourceY, targetX, targetY }) {
    const { deleteElements } = useReactFlow();
    const [edgePath] = getStraightPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
    });
   
    return (
      <>
        <BaseEdge id={id} path={edgePath} />
        <EdgeLabelRenderer>
     
            <button style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${sourceX}px,${sourceY}px)`,
            background: '#ffcc00',
            padding: 10,
            zIndex: 1000,
            pointerEvents: 'all',
          }} className="nodrag nopan" onClick={() => deleteElements({ edges: [{ id }] })}>delete</button>
         
        </EdgeLabelRenderer>
      </>
    );
  }