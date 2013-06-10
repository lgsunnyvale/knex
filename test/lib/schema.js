var when = require('when');
module.exports = function(Knex, resolver, error, dbType, regularThen) {

  var res = [];
  var overriddenThen = Knex.Builder.prototype.then;

  Knex.Builder.prototype.then = regularThen;

  Knex.Migrate.config({
    directory: './test/migrations',
    timestamps: false
  }).initialize().then(function() {
    return when.all([
      Knex.Schema.dropTableIfExists('accounts'),
      Knex.Schema.dropTableIfExists('test_table_one'),
      Knex.Schema.dropTableIfExists('test_table_two'),
      Knex.Schema.dropTableIfExists('test_table_three')
    ]);
  })
  .then(function(){
    return Knex.Migrate.to('002');
  })
  .then(function() {
    Knex.Builder.prototype.then = overriddenThen;
    return Knex.Schema.dropTableIfExists('accounts');
  })
  .then(function(resp) {
    res.push(resp);
    return Knex.Schema.createTable('test_table_three', function(table) {
      table.engine('InnoDB');
      table.integer('main').primary();
      table.text('paragraph').defaultTo('Lorem ipsum Qui quis qui in.');
    });
  })
  .then(function(resp) {
    res.push(resp);
    return Knex.Schema.table('test_table_one', function(t) {
      t.string('phone').nullable();
    });

  }).then(function(resp) {
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