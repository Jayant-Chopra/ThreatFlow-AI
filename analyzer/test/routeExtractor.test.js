const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const { parseFile, parseSource } = require('../parser');
const { extractRoutes, extractRoutesFromParsedFiles } = require('../extractors/routeExtractor');

const fixturePath = path.join(__dirname, 'fixtures', 'route-project', 'routes.js');

function extractFixtureRoutes() {
  return extractRoutes(parseFile(fixturePath, 'routes/routes.js'));
}

test('extracts app.get and app.post routes with normalized HTTP methods', () => {
  const routes = extractFixtureRoutes();
  assert.deepEqual(routes.slice(0, 2), [
    {
      id: 'route_001',
      method: 'GET',
      path: '/users',
      file: 'routes/routes.js',
      line: 1,
      handler: 'getUsers'
    },
    {
      id: 'route_002',
      method: 'POST',
      path: '/users',
      file: 'routes/routes.js',
      line: 2,
      handler: 'createUser'
    }
  ]);
});

test('extracts router.get and multiple supported route methods', () => {
  const routes = extractFixtureRoutes();
  assert.deepEqual(routes.map((route) => route.method), [
    'GET', 'POST', 'GET', 'PUT', 'DELETE', 'PATCH', 'GET', 'POST', 'GET'
  ]);
  assert.equal(routes[2].path, '/health');
  assert.equal(routes[2].handler, 'healthCheck');
  assert.equal(routes[3].line, 4);
});

test('uses null for an anonymous callback handler', () => {
  const anonymousRoute = extractFixtureRoutes().find((route) => route.path === '/anonymous');
  assert.equal(anonymousRoute.handler, null);
  assert.equal(anonymousRoute.line, 7);
});

test('selects the final statically identifiable handler after middleware', () => {
  const securedRoute = extractFixtureRoutes().find((route) => route.path === '/secured');
  assert.equal(securedRoute.handler, 'createUser');
  assert.equal(securedRoute.method, 'POST');
  assert.equal(securedRoute.line, 8);
});

test('does not treat unrelated .get calls as routes', () => {
  const routes = extractFixtureRoutes();
  assert.equal(routes.some((route) => route.path === 'session-id'), false);
  assert.equal(routes.length, 9);
});

test('keeps an unresolved dynamic route path as null', () => {
  const dynamicRoute = extractFixtureRoutes().find((route) => route.line === 10);
  assert.equal(dynamicRoute.path, null);
  assert.equal(dynamicRoute.handler, 'getUsers');
});

test('creates one route per route AST node with unique scan-local IDs', () => {
  const routes = extractFixtureRoutes();
  const ids = routes.map((route) => route.id);
  assert.equal(new Set(ids).size, routes.length);
  assert.deepEqual(ids, [
    'route_001', 'route_002', 'route_003', 'route_004', 'route_005',
    'route_006', 'route_007', 'route_008', 'route_009'
  ]);
});

test('does not crash on unusual route argument syntax', () => {
  const parsedFile = parseSource(
    'unusual.js',
    "app.get('/spread', ...handlers); router.post(`/static`, function () {}); app.get?.('/optional', namedHandler);"
  );
  const routes = extractRoutes(parsedFile);
  assert.deepEqual(routes.map((route) => ({ path: route.path, handler: route.handler })), [
    { path: '/spread', handler: null },
    { path: '/static', handler: null }
  ]);
});

test('assigns unique IDs across multiple parsed files', () => {
  const parsedFiles = [
    parseSource('one.js', "app.get('/one', one);"),
    parseSource('two.js', "router.delete('/two', two);")
  ];
  assert.deepEqual(extractRoutesFromParsedFiles(parsedFiles).map((route) => route.id), [
    'route_001', 'route_002'
  ]);
});
