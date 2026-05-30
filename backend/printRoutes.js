const router = require('./routes/user.js');
const routes = [];
router.stack.forEach(layer => {
  if (layer.route) {
    routes.push({
      path: layer.route.path,
      methods: Object.keys(layer.route.methods)
    });
  }
});
console.log(JSON.stringify(routes, null, 2));
