
exports.up = function(Knex, when) {
  return Knex.Schema.createTable('test_table_two', function(t) {
    t.engine('InnoDB');
    t.increments();
    t.integer('account_id');
    t.text('details');
    t.tinyint('status');
  });
};

exports.down = function(Knex, when) {
  return Knex.Schema.dropTableIfExists('test_table_two');
};