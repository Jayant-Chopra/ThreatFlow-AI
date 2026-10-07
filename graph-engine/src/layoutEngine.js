/**
 * @file layoutEngine.js
 * @description Simple column layout for React Flow.
 *
 * One column per entity category (Route | Function | Source | Variable | Sink).
 * Inside a column, nodes on attack paths come first, then by file, line and ID.
 * It does not minimize edge crossings; the frontend may replace it with a
 * graph layout library (e.g. dagre) without changing anything else.
 *
 * @author Ravish Gupta <ravishgupta071@gmail.com>
 */

'use strict';

const COLUMN_ORDER = ['ROUTE', 'FUNCTION', 'SOURCE', 'VARIABLE', 'SINK'];
const COLUMN_WIDTH = 280;
const LEFT_PADDING = 50;
const TOP_PADDING = 80;
const ROW_HEIGHT = 110;

function compareNodes(a, b) {
  const pathOrder = Number(b.data.onAttackPath) - Number(a.data.onAttackPath);
  if (pathOrder !== 0) return pathOrder;
  const fileA = a.data.file || '';
  const fileB = b.data.file || '';
  if (fileA !== fileB) return fileA < fileB ? -1 : 1;
  const lineOrder = (a.data.line || 0) - (b.data.line || 0);
  if (lineOrder !== 0) return lineOrder;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Returns new nodes with `position` set. Input order of the array is kept.
 * @param {Array<Object>} nodes
 * @returns {Array<Object>}
 */
function applyColumnLayout(nodes = []) {
  const positions = new Map();

  COLUMN_ORDER.forEach((category, columnIndex) => {
    nodes
      .filter((node) => node.data.category === category)
      .sort(compareNodes)
      .forEach((node, rowIndex) => {
        positions.set(node.id, {
          x: LEFT_PADDING + columnIndex * COLUMN_WIDTH,
          y: TOP_PADDING + rowIndex * ROW_HEIGHT
        });
      });
  });

  return nodes.map((node) => ({ ...node, position: positions.get(node.id) || { x: 0, y: 0 } }));
}

module.exports = {
  COLUMN_ORDER,
  COLUMN_WIDTH,
  ROW_HEIGHT,
  applyColumnLayout
};
