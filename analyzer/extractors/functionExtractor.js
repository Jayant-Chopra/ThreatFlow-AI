const traverse = require('@babel/traverse').default;
const functionContexts = new WeakMap();

function formatFunctionId(index) {
  return `func_${String(index).padStart(3, '0')}`;
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

function getObjectPropertyName(property) {
  if (property.computed) {
    return null;
  }

  if (property.key.type === 'Identifier') {
    return property.key.name;
  }

  if (property.key.type === 'StringLiteral') {
    return property.key.value;
  }

  return null;
}

function getFunctionName(functionPath) {
  if (functionPath.node.id?.type === 'Identifier') {
    return functionPath.node.id.name;
  }

  if (functionPath.node.type === 'ObjectMethod') {
    return getObjectPropertyName(functionPath.node);
  }

  const parent = functionPath.parentPath?.node;
  if (parent?.type === 'VariableDeclarator' && parent.init === functionPath.node) {
    return parent.id.type === 'Identifier' ? parent.id.name : null;
  }

  if (parent?.type === 'AssignmentExpression' && parent.right === functionPath.node) {
    return getStaticMemberName(parent.left);
  }

  if (parent?.type === 'ObjectProperty' && parent.value === functionPath.node) {
    return getObjectPropertyName(parent);
  }

  return null;
}

function getFunctionBinding(functionPath) {
  const parent = functionPath.parentPath;

  if (functionPath.node.type === 'FunctionDeclaration' && functionPath.node.id?.type === 'Identifier') {
    return parent?.scope.getBinding(functionPath.node.id.name) ?? null;
  }

  if (parent?.node.type === 'VariableDeclarator' && parent.node.id.type === 'Identifier') {
    return parent.scope.getBinding(parent.node.id.name) ?? null;
  }

  if (parent?.node.type === 'AssignmentExpression' && parent.node.left.type === 'Identifier') {
    return parent.scope.getBinding(parent.node.left.name) ?? null;
  }

  return null;
}

function getFunctionContext(functionRecord) {
  return functionContexts.get(functionRecord) ?? null;
}

function extractFunctions(parsedFile, startIndex = 1) {
  if (!parsedFile?.ast) {
    return [];
  }

  const functions = [];

  traverse(parsedFile.ast, {
    Function(functionPath) {
      const functionRecord = {
        id: formatFunctionId(startIndex + functions.length),
        name: getFunctionName(functionPath),
        file: parsedFile.file,
        line: functionPath.node.loc?.start.line ?? null
      };
      functionContexts.set(functionRecord, {
        binding: getFunctionBinding(functionPath),
        node: functionPath.node
      });
      functions.push(functionRecord);
    }
  });

  return functions;
}

function extractFunctionsFromParsedFiles(parsedFiles) {
  const functions = [];

  for (const parsedFile of parsedFiles) {
    functions.push(...extractFunctions(parsedFile, functions.length + 1));
  }

  return functions;
}

module.exports = {
  extractFunctions,
  extractFunctionsFromParsedFiles,
  getFunctionContext
};
