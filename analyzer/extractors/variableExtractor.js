const traverse = require('@babel/traverse').default;

const variableContexts = new WeakMap();

function formatVariableId(index) {
  return `var_${String(index).padStart(3, '0')}`;
}

function collectBindingIdentifiers(pattern, identifiers = []) {
  if (!pattern) {
    return identifiers;
  }

  if (pattern.type === 'Identifier') {
    identifiers.push(pattern);
    return identifiers;
  }

  if (pattern.type === 'ObjectPattern') {
    for (const property of pattern.properties) {
      if (property.type === 'ObjectProperty') {
        collectBindingIdentifiers(property.value, identifiers);
      } else if (property.type === 'RestElement') {
        collectBindingIdentifiers(property.argument, identifiers);
      }
    }
    return identifiers;
  }

  if (pattern.type === 'ArrayPattern') {
    for (const element of pattern.elements) {
      collectBindingIdentifiers(element, identifiers);
    }
    return identifiers;
  }

  if (pattern.type === 'AssignmentPattern' || pattern.type === 'RestElement') {
    collectBindingIdentifiers(pattern.left ?? pattern.argument, identifiers);
  }

  return identifiers;
}

function getVariableContext(variable) {
  return variableContexts.get(variable) ?? null;
}

function createVariableRecord(name, file, location, index, scope) {
  const variable = {
    id: formatVariableId(index),
    name,
    file,
    line: location?.start.line ?? null
  };
  variableContexts.set(variable, {
    assignmentNodes: [],
    binding: null,
    declarationNodes: [],
    scope
  });
  return variable;
}

function extractVariables(parsedFile, startIndex = 1) {
  if (!parsedFile?.ast) {
    return [];
  }

  const variables = [];
  const variablesByBinding = new Map();
  const unresolvedVariablesByScope = new Map();

  function getOrCreateBoundVariable(binding, name, location, scope, isDeclaration) {
    let variable = variablesByBinding.get(binding);
    if (!variable) {
      variable = createVariableRecord(name, parsedFile.file, location, startIndex + variables.length, scope);
      variablesByBinding.set(binding, variable);
      variables.push(variable);
    }

    const context = getVariableContext(variable);
    context.binding = binding;
    if (isDeclaration) {
      context.declarationNodes.push(location);
      variable.line = location.loc?.start.line ?? variable.line;
    } else {
      context.assignmentNodes.push(location);
    }
    return variable;
  }

  function getOrCreateUnresolvedVariable(scope, name, location) {
    let variablesByName = unresolvedVariablesByScope.get(scope);
    if (!variablesByName) {
      variablesByName = new Map();
      unresolvedVariablesByScope.set(scope, variablesByName);
    }

    let variable = variablesByName.get(name);
    if (!variable) {
      variable = createVariableRecord(name, parsedFile.file, location, startIndex + variables.length, scope);
      variablesByName.set(name, variable);
      variables.push(variable);
    }
    getVariableContext(variable).assignmentNodes.push(location);
    return variable;
  }

  function recordAssignment(identifier, scope) {
    const binding = scope.getBinding(identifier.name);
    if (binding) {
      getOrCreateBoundVariable(binding, identifier.name, identifier, scope, false);
    } else {
      getOrCreateUnresolvedVariable(scope, identifier.name, identifier);
    }
  }

  traverse(parsedFile.ast, {
    VariableDeclarator(variablePath) {
      for (const identifier of collectBindingIdentifiers(variablePath.node.id)) {
        const binding = variablePath.scope.getBinding(identifier.name);
        if (binding) {
          getOrCreateBoundVariable(binding, identifier.name, identifier, variablePath.scope, true);
        }
      }
    },
    AssignmentExpression(assignmentPath) {
      if (assignmentPath.node.left.type === 'Identifier') {
        recordAssignment(assignmentPath.node.left, assignmentPath.scope);
      }
    },
    UpdateExpression(updatePath) {
      if (updatePath.node.argument.type === 'Identifier') {
        recordAssignment(updatePath.node.argument, updatePath.scope);
      }
    }
  });

  return variables;
}

function extractVariablesFromParsedFiles(parsedFiles) {
  const variables = [];

  for (const parsedFile of parsedFiles) {
    variables.push(...extractVariables(parsedFile, variables.length + 1));
  }

  return variables;
}

module.exports = {
  extractVariables,
  extractVariablesFromParsedFiles,
  getVariableContext
};
