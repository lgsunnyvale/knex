
exports.up = function(Knex, when) {
  return Knex.Schema.createTable('test_table_one', function(table) {
    table.engine('InnoDB');
    table.increments('id');
    table.string('first_name');
    table.string('last_name');
    table.string('email').unique().nullable();
    table.integer('logins').defaultTo(1).index();
    table.text('about');
    table.timestamps();
  });
};

exports.down = function(Knex, when) {
  return Knex.Schema.dropTableIfExists('test_table_one');
};