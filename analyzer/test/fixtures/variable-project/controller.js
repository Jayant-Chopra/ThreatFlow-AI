const id = req.query.id;
let name = 'initial';
var count = 0;
name = req.body.name;
count += 1;
const user = { id: 1, name: 'Ada' };
function first() {
  const id = 1;
  return id;
}
function second() {
  const id = 2;
  return id;
}
function nested() {
  const outer = true;
  if (outer) {
    const outer = false;
  }
}
const { id: userId, role = 'user' } = payload;
const [firstItem, , ...remaining] = values;
metadata.id = userId;
