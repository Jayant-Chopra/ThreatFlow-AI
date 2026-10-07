const traverse = require('@babel/traverse').default;

const HTTP_INPUT_CONTAINERS = new Set(['query', 'body', 'params', 'headers', 'cookies']);
const sourceContexts = new WeakMap();

function formatSourceId(index) {
  return `source_${String(index).padStart(3, '0')}`;
}

function isMemberAccess(node) {
  return node?.type === 'MemberExpression' || node?.type === 'OptionalMemberExpression';
}

function getStaticPropertyName(member) {
  if (!member?.computed && member?.property.type === 'Identifier') {
    return member.property.name;
  }

  if (member?.computed && member.property.type === 'StringLiteral') {
    return member.property.value;
  }

  if (
    member?.computed &&
    member.property.type === 'TemplateLiteral' &&
    member.property.expressions.length === 0
  ) {
    return member.property.quasis[0].value.cooked;
  }

  return null;
}

function getHttpInputMetadata(node) {
  if (!isMemberAccess(node)) {
    return null;
  }

  const property = getStaticPropertyName(node);
  const containerAccess = node.object;
  if (!property || !isMemberAccess(containerAccess)) {
    return null;
  }

  const container = getStaticPropertyName(containerAccess);
  if (
    !HTTP_INPUT_CONTAINERS.has(container) ||
    containerAccess.object.type !== 'Identifier' ||
    containerAccess.object.name !== 'req'
  ) {
    return null;
  }

  return {
    expression: node.computed
      ? `req.${container}[${JSON.stringify(property)}]`
      : `req.${container}.${property}`
  };
}

function getContainingFunctionNode(nodePath) {
  return nodePath.findParent((parentPath) => parentPath.isFunction())?.node ?? null;
}

function getSourceContext(source) {
  return sourceContexts.get(source) ?? null;
}

function extractSources(parsedFile, startIndex = 1) {
  if (!parsedFile?.ast) {
    return [];
  }

  const sources = [];

  traverse(parsedFile.ast, {
    enter(nodePath) {
      const metadata = getHttpInputMetadata(nodePath.node);
      if (!metadata) {
        return;
      }

      const source = {
        id: formatSourceId(startIndex + sources.length),
        type: 'HTTP_INPUT',
        expression: metadata.expression,
        file: parsedFile.file,
        line: nodePath.node.loc?.start.line ?? null
      };
      sourceContexts.set(source, {
        functionNode: getContainingFunctionNode(nodePath),
        node: nodePath.node
      });
      sources.push(source);
    }
  });

  return sources;
}

function extractSourcesFromParsedFiles(parsedFiles) {
  const sources = [];

  for (const parsedFile of parsedFiles) {
    sources.push(...extractSources(parsedFile, sources.length + 1));
  }

  return sources;
}

module.exports = {
  extractSources,
  extractSourcesFromParsedFiles,
  getSourceContext
};
