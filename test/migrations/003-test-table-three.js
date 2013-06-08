
exports.up = function(Knex, when) {

  return Knex.Schema.createTable('test_table_three', function(table) {
    table.engine('InnoDB');
    table.integer('main').primary();
    table.text('paragraph').defaultTo('Lorem ipsum Qui quis qui in.');
  });

};

exports.down = function(Knex, when) {
  return Knex.Schema.dropTableIfExists('test_table_three');
};