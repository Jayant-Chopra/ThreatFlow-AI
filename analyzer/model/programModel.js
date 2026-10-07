const path = require('node:path');
const traverse = require('@babel/traverse').default;

const { extractRoutes, getRouteContext } = require('../extractors/routeExtractor');
const { extractFunctions, getFunctionContext } = require('../extractors/functionExtractor');
const { extractSources, getSourceContext } = require('../extractors/sourceExtractor');
const { extractSinks, getSinkContext } = require('../extractors/sinkExtractor');
const { extractVariables, getVariableContext } = require('../extractors/variableExtractor');

const COLLECTION_NAMES = [
  'files',
  'routes',
  'functions',
  'sources',
  'sinks',
  'variables',
  'relationships',
  'findings'
];
const modelContexts = new WeakMap();

class ProgramModel {
  constructor(project) {
    this.project = project;
    for (const collectionName of COLLECTION_NAMES) {
      this[collectionName] = [];
    }
  }

  toOutput() {
    return {
      schemaVersion: '1.0',
      project: this.project,
      files: this.files,
      routes: this.routes,
      functions: this.functions,
      sources: this.sources,
      sinks: this.sinks,
      variables: this.variables,
      relationships: this.relationships,
      findings: this.findings,
      summary: {
        filesAnalyzed: this.files.length,
        routesFound: this.routes.length,
        functionsFound: this.functions.length,
        sourcesFound: this.sources.length,
        sinksFound: this.sinks.length,
        findingsFound: this.findings.length
      }
    };
  }
}

function getProgramModelContext(programModel) {
  return modelContexts.get(programModel) ?? null;
}

function getExpressionKind(node) {
  if (
    node?.type === 'StringLiteral' ||
    node?.type === 'NumericLiteral' ||
    node?.type === 'BooleanLiteral' ||
    node?.type === 'NullLiteral'
  ) {
    return 'CONSTANT';
  }

  if (node?.type === 'BinaryExpression' && node.operator === '+') {
    return 'STRING_CONCATENATION';
  }

  if (node?.type === 'TemplateLiteral') {
    return 'TEMPLATE_LITERAL';
  }

  if (node?.type === 'ArrayExpression') {
    return 'ARRAY';
  }

  return 'EXPRESSION';
}

function describeExpression(expressionPath, sourceIdsByNode, variableIdsByBinding) {
  const sourceIds = new Set();
  const variableIds = new Set();

  function inspectPath(nodePath) {
    const sourceId = sourceIdsByNode.get(nodePath.node);
    if (sourceId) {
      sourceIds.add(sourceId);
    }

    if (nodePath.isReferencedIdentifier()) {
      const variableId = variableIdsByBinding.get(nodePath.scope.getBinding(nodePath.node.name));
      if (variableId) {
        variableIds.add(variableId);
      }
    }
  }

  inspectPath(expressionPath);
  expressionPath.traverse({ enter: inspectPath });

  return {
    kind: getExpressionKind(expressionPath.node),
    sourceIds: [...sourceIds],
    variableIds: [...variableIds]
  };
}

function getStaticPropertyName(property) {
  if (property?.computed) {
    return property.key.type === 'StringLiteral' ? property.key.value : null;
  }

  if (property?.key.type === 'Identifier') {
    return property.key.name;
  }

  return property?.key.type === 'StringLiteral' ? property.key.value : null;
}

function getRequiredModuleSpecifier(node) {
  if (
    node?.type !== 'CallExpression' ||
    node.callee.type !== 'Identifier' ||
    node.callee.name !== 'require' ||
    node.arguments.length !== 1 ||
    node.arguments[0].type !== 'StringLiteral'
  ) {
    return null;
  }

  return node.arguments[0].value;
}

function getModuleExportsFileName(left) {
  if (
    left?.type !== 'MemberExpression' ||
    left.computed ||
    left.object.type !== 'Identifier' ||
    left.object.name !== 'module' ||
    left.property.type !== 'Identifier' ||
    left.property.name !== 'exports'
  ) {
    return false;
  }

  return true;
}

function resolveRequiredFile(currentFile, moduleSpecifier, parsedFileNames) {
  if (!moduleSpecifier?.startsWith('.')) {
    return null;
  }

  const resolvedBase = path.posix.normalize(path.posix.join(
    path.posix.dirname(currentFile),
    moduleSpecifier
  ));
  const candidates = resolvedBase.endsWith('.js')
    ? [resolvedBase]
    : [`${resolvedBase}.js`, `${resolvedBase}/index.js`];

  return candidates.find((candidate) => parsedFileNames.has(candidate)) ?? null;
}

function buildImportedFunctionIds(parsedFiles, functionIdsByBinding) {
  const parsedFileNames = new Set(parsedFiles.filter(Boolean).map((parsedFile) => parsedFile.file));
  const exportedFunctionIdsByFile = new Map();

  for (const parsedFile of parsedFiles) {
    if (!parsedFile?.ast) {
      continue;
    }

    const exportedFunctionIds = new Map();
    traverse(parsedFile.ast, {
      AssignmentExpression(assignmentPath) {
        if (!getModuleExportsFileName(assignmentPath.node.left) || assignmentPath.node.right.type !== 'ObjectExpression') {
          return;
        }

        for (const property of assignmentPath.node.right.properties) {
          if (property.type !== 'ObjectProperty' || property.value.type !== 'Identifier') {
            continue;
          }

          const exportName = getStaticPropertyName(property);
          const functionId = functionIdsByBinding.get(
            assignmentPath.scope.getBinding(property.value.name)
          );
          if (exportName && functionId) {
            exportedFunctionIds.set(exportName, functionId);
          }
        }
      }
    });
    exportedFunctionIdsByFile.set(parsedFile.file, exportedFunctionIds);
  }

  const importedFunctionIdsByBinding = new Map();
  for (const parsedFile of parsedFiles) {
    if (!parsedFile?.ast) {
      continue;
    }

    traverse(parsedFile.ast, {
      VariableDeclarator(variablePath) {
        if (variablePath.node.id.type !== 'ObjectPattern') {
          return;
        }

        const moduleSpecifier = getRequiredModuleSpecifier(variablePath.node.init);
        const requiredFile = resolveRequiredFile(parsedFile.file, moduleSpecifier, parsedFileNames);
        const exportedFunctionIds = requiredFile ? exportedFunctionIdsByFile.get(requiredFile) : null;
        if (!exportedFunctionIds) {
          return;
        }

        for (const property of variablePath.node.id.properties) {
          if (property.type !== 'ObjectProperty' || property.value.type !== 'Identifier') {
            continue;
          }

          const importedName = getStaticPropertyName(property);
          const functionId = exportedFunctionIds.get(importedName);
          const binding = variablePath.scope.getBinding(property.value.name);
          if (functionId && binding) {
            importedFunctionIdsByBinding.set(binding, functionId);
          }
        }
      }
    });
  }

  return importedFunctionIdsByBinding;
}

function buildProgramModel(parsedFiles, project = { name: 'unknown', path: '' }) {
  const programModel = new ProgramModel(project);
  const modelContext = {
    entityFunctionIds: new Map(),
    routeIdsByFunctionId: new Map(),
    sinkDetails: new Map(),
    variableValues: new Map()
  };
  const sourceIdsByNode = new Map();
  const sinkByNode = new Map();
  const variableIdsByBinding = new Map();
  const functionIdsByBinding = new Map();
  const functionIdsByNode = new Map();

  for (const parsedFile of parsedFiles) {
    if (parsedFile?.file) {
      programModel.files.push({ path: parsedFile.file, language: 'JavaScript' });
    }

    const routes = extractRoutes(parsedFile, programModel.routes.length + 1);
    const functions = extractFunctions(parsedFile, programModel.functions.length + 1);
    const variables = extractVariables(parsedFile, programModel.variables.length + 1);
    const sources = extractSources(parsedFile, programModel.sources.length + 1);
    const sinks = extractSinks(parsedFile, programModel.sinks.length + 1);

    programModel.routes.push(...routes);
    programModel.functions.push(...functions);
    programModel.variables.push(...variables);
    programModel.sources.push(...sources);
    programModel.sinks.push(...sinks);

    for (const functionRecord of functions) {
      const functionContext = getFunctionContext(functionRecord);
      if (functionContext?.binding) {
        functionIdsByBinding.set(functionContext.binding, functionRecord.id);
      }
      if (functionContext?.node) {
        functionIdsByNode.set(functionContext.node, functionRecord.id);
      }
    }

    for (const source of sources) {
      const sourceContext = getSourceContext(source);
      if (sourceContext?.node) {
        sourceIdsByNode.set(sourceContext.node, source.id);
      }
      const functionId = functionIdsByNode.get(sourceContext?.functionNode);
      if (functionId) {
        modelContext.entityFunctionIds.set(source.id, functionId);
      }
    }

    for (const sink of sinks) {
      const sinkContext = getSinkContext(sink);
      if (sinkContext?.node) {
        sinkByNode.set(sinkContext.node, sink);
      }
      const functionId = functionIdsByNode.get(sinkContext?.functionNode);
      if (functionId) {
        modelContext.entityFunctionIds.set(sink.id, functionId);
      }
    }

    for (const variable of variables) {
      const variableContext = getVariableContext(variable);
      if (variableContext?.binding) {
        variableIdsByBinding.set(variableContext.binding, variable.id);
      }
    }

  }

  const importedFunctionIdsByBinding = buildImportedFunctionIds(parsedFiles, functionIdsByBinding);

  const entityIds = new Set([
    ...programModel.routes,
    ...programModel.functions,
    ...programModel.variables,
    ...programModel.sources,
    ...programModel.sinks
  ].map((entity) => entity.id));
  const relationshipKeys = new Set();

  function addRelationship(from, to, type) {
    if (!from || !to || from === to || !entityIds.has(from) || !entityIds.has(to)) {
      return;
    }

    const key = `${from}\u0000${to}\u0000${type}`;
    if (!relationshipKeys.has(key)) {
      relationshipKeys.add(key);
      programModel.relationships.push({ from, to, type });
    }
  }

  function connectExpressionToVariable(expression, variableId, kind) {
    for (const sourceId of expression.sourceIds) {
      addRelationship(sourceId, variableId, 'ASSIGNMENT');
    }
    for (const referencedVariableId of expression.variableIds) {
      addRelationship(referencedVariableId, variableId, 'VARIABLE_TO_VARIABLE');
    }

    const values = modelContext.variableValues.get(variableId) ?? [];
    values.push({ kind, expression });
    modelContext.variableValues.set(variableId, values);
  }

  function connectExpressionToSink(expression, sinkId) {
    for (const sourceId of expression.sourceIds) {
      addRelationship(sourceId, sinkId, 'DATA_FLOW');
    }
    for (const variableId of expression.variableIds) {
      addRelationship(variableId, sinkId, 'DATA_FLOW');
    }
  }

  for (const parsedFile of parsedFiles) {
    if (!parsedFile?.ast) {
      continue;
    }

    traverse(parsedFile.ast, {
      VariableDeclarator(variablePath) {
        if (variablePath.node.id.type !== 'Identifier' || !variablePath.node.init) {
          return;
        }

        const binding = variablePath.scope.getBinding(variablePath.node.id.name);
        const variableId = variableIdsByBinding.get(binding);
        if (variableId) {
          connectExpressionToVariable(
            describeExpression(variablePath.get('init'), sourceIdsByNode, variableIdsByBinding),
            variableId,
            'DECLARATION'
          );
        }
      },
      AssignmentExpression(assignmentPath) {
        if (assignmentPath.node.left.type !== 'Identifier') {
          return;
        }

        const binding = assignmentPath.scope.getBinding(assignmentPath.node.left.name);
        const variableId = variableIdsByBinding.get(binding);
        if (variableId) {
          connectExpressionToVariable(
            describeExpression(assignmentPath.get('right'), sourceIdsByNode, variableIdsByBinding),
            variableId,
            'ASSIGNMENT'
          );
        }
      },
      enter(nodePath) {
        const sink = sinkByNode.get(nodePath.node);
        if (!sink) {
          return;
        }

        const argumentsDetails = nodePath.get('arguments').map((argumentPath) => (
          describeExpression(argumentPath, sourceIdsByNode, variableIdsByBinding)
        ));
        modelContext.sinkDetails.set(sink.id, {
          arguments: argumentsDetails,
          isParameterized: sink.type === 'DATABASE' && argumentsDetails.length > 1
        });
        for (const argument of argumentsDetails) {
          connectExpressionToSink(argument, sink.id);
        }
      }
    });
  }

  for (const route of programModel.routes) {
    const routeContext = getRouteContext(route);
    const functionId = functionIdsByBinding.get(routeContext?.handlerBinding)
      ?? importedFunctionIdsByBinding.get(routeContext?.handlerBinding)
      ?? functionIdsByNode.get(routeContext?.handlerNode);
    addRelationship(route.id, functionId, 'ROUTE_TO_FUNCTION');

    if (functionId) {
      const routeIds = modelContext.routeIdsByFunctionId.get(functionId) ?? [];
      routeIds.push(route.id);
      modelContext.routeIdsByFunctionId.set(functionId, routeIds);
    }
  }

  modelContexts.set(programModel, modelContext);
  return programModel;
}

function resolveRouteIdForFlow(programModel, sourceId, sinkId) {
  const modelContext = getProgramModelContext(programModel);
  const sinkFunctionId = modelContext?.entityFunctionIds.get(sinkId);
  if (!sinkFunctionId) {
    return null;
  }

  const sourceFunctionId = modelContext.entityFunctionIds.get(sourceId);
  if (sourceFunctionId) {
    const sourceRouteIds = modelContext.routeIdsByFunctionId.get(sourceFunctionId) ?? [];
    const sinkRouteIds = modelContext.routeIdsByFunctionId.get(sinkFunctionId) ?? [];
    const matchingRouteId = sinkRouteIds.find((routeId) => sourceRouteIds.includes(routeId));
    if (!matchingRouteId) {
      return null;
    }
    return matchingRouteId;
  }

  return modelContext.routeIdsByFunctionId.get(sinkFunctionId)?.[0] ?? null;
}

module.exports = {
  ProgramModel,
  buildProgramModel,
  getProgramModelContext,
  resolveRouteIdForFlow
};
