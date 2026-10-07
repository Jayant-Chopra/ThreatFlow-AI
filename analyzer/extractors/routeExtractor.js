const traverse = require('@babel/traverse').default;

const ROUTE_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch']);
const ROUTE_RECEIVERS = new Set(['app', 'router']);
const routeContexts = new WeakMap();

function formatRouteId(index) {
  return `route_${String(index).padStart(3, '0')}`;
}

function getStaticPath(argument) {
  if (argument?.type === 'StringLiteral') {
    return argument.value;
  }

  if (argument?.type === 'TemplateLiteral' && argument.expressions.length === 0) {
    return argument.quasis[0].value.cooked;
  }

  return null;
}

function getExpressionName(expression) {
  if (expression?.type === 'Identifier') {
    return expression.name;
  }

  if (
    expression?.type === 'MemberExpression' &&
    !expression.computed &&
    expression.property.type === 'Identifier'
  ) {
    const objectName = getExpressionName(expression.object);
    return objectName ? `${objectName}.${expression.property.name}` : null;
  }

  return null;
}

function getHandlerMetadata(argumentsList) {
  for (let index = argumentsList.length - 1; index > 0; index -= 1) {
    const handlerNode = argumentsList[index];
    const handlerName = getExpressionName(handlerNode);
    if (handlerName) {
      return { name: handlerName, node: handlerNode };
    }

    if (handlerNode?.type !== 'SpreadElement') {
      return { name: null, node: handlerNode };
    }
  }

  return { name: null, node: null };
}

function getRouteMetadata(node) {
  if (
    node.callee.type !== 'MemberExpression' ||
    node.callee.computed ||
    node.callee.object.type !== 'Identifier' ||
    node.callee.property.type !== 'Identifier' ||
    !ROUTE_RECEIVERS.has(node.callee.object.name) ||
    !ROUTE_METHODS.has(node.callee.property.name)
  ) {
    return null;
  }

  const handler = getHandlerMetadata(node.arguments);
  return {
    method: node.callee.property.name.toUpperCase(),
    path: getStaticPath(node.arguments[0]),
    handler: handler.name,
    handlerNode: handler.node
  };
}

function getRouteContext(route) {
  return routeContexts.get(route) ?? null;
}

function extractRoutes(parsedFile, startIndex = 1) {
  if (!parsedFile?.ast) {
    return [];
  }

  const routes = [];

  traverse(parsedFile.ast, {
    CallExpression(callPath) {
      const metadata = getRouteMetadata(callPath.node);
      if (!metadata) {
        return;
      }

      const route = {
        id: formatRouteId(startIndex + routes.length),
        method: metadata.method,
        path: metadata.path,
        file: parsedFile.file,
        line: callPath.node.loc?.start.line ?? null,
        handler: metadata.handler
      };
      routeContexts.set(route, {
        handlerBinding: metadata.handlerNode?.type === 'Identifier'
          ? callPath.scope.getBinding(metadata.handlerNode.name)
          : null,
        handlerNode: metadata.handlerNode,
        node: callPath.node
      });
      routes.push(route);
    }
  });

  return routes;
}

function extractRoutesFromParsedFiles(parsedFiles) {
  const routes = [];

  for (const parsedFile of parsedFiles) {
    routes.push(...extractRoutes(parsedFile, routes.length + 1));
  }

  return routes;
}

module.exports = {
  extractRoutes,
  extractRoutesFromParsedFiles,
  getRouteContext
};
