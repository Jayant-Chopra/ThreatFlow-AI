function getUsers() {
  return [];
}

const createUser = function createUserHandler() {};
const updateUser = (id) => ({ id });
app.get('/anonymous', function (req, res) { return res.json({ ok: true }); });

function outer() {
  function inner() {}
  const nestedArrow = () => {};
}
