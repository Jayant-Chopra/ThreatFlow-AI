const traverse = require('@babel/traverse').default;

const DATABASE_RECEIVERS = new Set(['db', 'connection', 'pool', 'client']);
const DATABASE_METHODS = new Set(['query', 'execute']);
const COMMAND_FUNCTIONS = new Set(['exec', 'execSync', 'spawn', 'spawnSync']);
const CHILD_PROCESS_RECEIVERS = new Set(['child_process', 'childProcess']);
const sinkContexts = new WeakMap();

function formatSinkId(index) {
  return `sink_${String(index).padStart(3, '0')}`;
}

function getStaticMemberName(expression) {
  if (expression?.type === 'Identifier') {
    return expression.name;
  }

  if (
    expression?.type === 'MemberExpression' &&
    !expression.computed &&
    expression.property.type === 'Identifier'
  ) {
    const objectName = getStaticMemberName(expression.object);
    return objectName ? `${objectName}.${expression.property.name}` : null;
  }

  return null;
}

function getMemberSinkMetadata(callee) {
  if (
    callee.type !== 'MemberExpression' ||
    callee.computed ||
    callee.object.type !== 'Identifier' ||
    callee.property.type !== 'Identifier'
  ) {
    return null;
  }

  const receiver = callee.object.name;
  const method = callee.property.name;
  const name = getStaticMemberName(callee);

  if (DATABASE_RECEIVERS.has(receiver) && DATABASE_METHODS.has(method)) {
    return { type: 'DATABASE', name };
  }

  if (CHILD_PROCESS_RECEIVERS.has(receiver) && COMMAND_FUNCTIONS.has(method)) {
    return { type: 'COMMAND_EXECUTION', name };
  }

  return null;
}

function getSinkMetadata(node) {
  if (node.type === 'NewExpression' && node.callee.type === 'Identifier' && node.callee.name === 'Function') {
    return { type: 'DANGEROUS_CODE_EXECUTION', name: 'Function' };
  }

  if (node.type !== 'CallExpression') {
    return null;
  }

  if (node.callee.type === 'Identifier') {
    if (COMMAND_FUNCTIONS.has(node.callee.name)) {
      return { type: 'COMMAND_EXECUTION', name: node.callee.name };
    }

    if (node.callee.name === 'eval' || node.callee.name === 'Function') {
      return { type: 'DANGEROUS_CODE_EXECUTION', name: node.callee.name };
    }
  }

  return getMemberSinkMetadata(node.callee);
}

function getContainingFunctionNode(nodePath) {
  return nodePath.findParent((parentPath) => parentPath.isFunction())?.node ?? null;
}

function getSinkContext(sink) {
  return sinkContexts.get(sink) ?? null;
}

function extractSinks(parsedFile, startIndex = 1) {
  if (!parsedFile?.ast) {
    return [];
  }

  const sinks = [];

  traverse(parsedFile.ast, {
    enter(nodePath) {
      const metadata = getSinkMetadata(nodePath.node);
      if (!metadata) {
        return;
      }

      const sink = {
        id: formatSinkId(startIndex + sinks.length),
        type: metadata.type,
        name: metadata.name,
        file: parsedFile.file,
        line: nodePath.node.loc?.start.line ?? null
      };
      sinkContexts.set(sink, {
        arguments: nodePath.node.arguments,
        callee: nodePath.node.callee,
        functionNode: getContainingFunctionNode(nodePath),
        node: nodePath.node
      });
      sinks.push(sink);
    }
  });

  return sinks;
}

function extractSinksFromParsedFiles(parsedFiles) {
  const sinks = [];

  for (const parsedFile of parsedFiles) {
    sinks.push(...extractSinks(parsedFile, sinks.length + 1));
  }

  return sinks;
}

module.exports = {
  extractSinks,
  extractSinksFromParsedFiles,
  getSinkContext
};
