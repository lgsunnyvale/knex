var when = require('when');
module.exports = function(Knex, resolver, error) {

  var res = [];

  Knex.Migrate.to('base').then(function() {
    return Knex.Migrate.to('003-test-table-three');
  })
  .then(function() {
    return Knex.Schema.dropTableIfExists('accounts');
  })
  .then(function(resp) {
    // Edit test table one
    res = res.push(resp);
    return Knex.Schema.table('test_table_one', function(t) {
      t.string('phone').nullable();
    });

  }).then(function(resp) {
    // conditionally drops tables with `dropTableIfExists`
    res.push(resp);
    return Knex.Schema.dropTableIfExists('items');
  })
  .then(function(resp) {
    res.push(resp);
    return Knex.Schema.hasTable('test_table_two');
  })
  .then(function(resp) {
    res.push(resp);
    return Knex.Schema.renameTable('test_table_one', 'accounts');
  })
  .then(function(resp) {
    res.push(resp);
    return Knex.Schema.dropTable('test_table_three');
  })
  .then(function(resp) {
    res.push(resp);
    return res;
  })
  .then(resolver, error);

};