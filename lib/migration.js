var fs     = require('fs');
var mkdirp = require('mkdirp');
var _      = require('underscore');
var when   = require('when');
var path   = require('path');

// The new migration we're performing.
// Takes a `config` object, which has the name
// of the current migration (`main` if not otherwise specified)
var Migration = function(Instance, config) {
  this.Knex   = Instance;
  this.config = _.extend({
    timestamps: true,
    tableName: 'knex_migrations',
    directory: null
  }, config);
};

_.extend(Migration.prototype, {

  // Initializes the migration, by creating the proper migration
  // file or database table, depending on the migration config settings.
  initialize: function() {
    var directory = this.config.directory;
    if (!directory) {
      throw new Error('The directory must be specified.');
    }
    var dfd = when.defer();
    var tableName = this.config.tableName;
    var self = this;
    fs.exists(directory, function(exists) {
      if (!exists) mkdirp.sync(directory);
      return self.Knex.Schema.hasTable(tableName).then(null, function() {
        return self.Knex.Schema.createTable(tableName, function(t) {
          t.increments();
          t.string('direction');
          t.string('name');
          t.dateTime('migration_time');
        });
      }).then(function() {
        dfd.resolve('Migrations Initialized');
      }, dfd.reject);
    });
    return dfd.promise;
  },

  // Retrieves and returns the current migration version
  // we're on, as a promise.
  currentVersion: function() {
    return when.all([this.listCompleted()]).spread(function(all, completed) {
      return completed.pop();
    });
  },

  // Lists all available migration versions, as an array.
  listAll: function() {
    if (!this.config.directory) throw new Error('The directory for the migration was not specified.');
    var dfd = when.defer();
    fs.readdir(_.result(this.config, 'directory'), function(err, resp) {
      dfd.resolve(resp);
    });
    return dfd.promise;
  },

  // Lists all migrations that have been completed for the current db, as an array.
  listCompleted: function() {
    return new this.Knex(this.config.tableName).orderBy('id').select('name', 'direction');
  },

  // Migrate to a specific version
  to: function(version) {
    var self = this;
    return when.all([this.listAll(), this.listCompleted()]).spread(function(all, completed) {

      if (!version) throw new Error('You must specify a version to migrate to, "latest", or "base"');

      var going = 'up', todos;

      // If we're going to the latest version, only use what's remaining.
      if (version === 'latest') {
        todos = all.slice(_.indexOf(all, completed.pop(1)));
      } else if (version === 'base') {
        todos = all;
        going = 'down';
      } else {

        // Otherwise, check whether the migration is in one array or another
        var index = _.indexOf(completed, version);

        if (index !== -1) {
          todos = completed.slice(index + 1);
          going = 'down';
        } else {
          version = _.find(all, function(name) {
            return name.indexOf(version) === 0;
          });
          index = _.indexOf(all, version);
          if (index === -1) throw new Error('Invalid migration name: ' + version);
          todos = all.slice(completed.length, index + 1);
        }
      }

      // Ensure all migrations are good to go.
      return when.all(_.map(todos, function(filename) {
        var migration = require(path.join(process.cwd(), self.config.directory + '/' + filename));
        if (!_.isFunction(migration.up) || !_.isFunction(migration.down)) {
          throw new Error('Migration must define both an "up" and "down" method');
        }
        return migration;
      })).then(function(migrations) {

        // Then run them one by one.
        return _.reduce(migrations, function(memo, file, index) {
          return memo.then(function() {
            return file[going](self.Knex, when).then(self._logMigration(going, todos[index], self));
          });
        }, when(1));

      });

    });
  },

  // Write the currently completed migration to the database
  // table specified in the configuration.
  _logMigration: function(direction, migrationName, ctx) {
    return function() {
      var table = ctx.Knex(ctx.config.tableName);
      if (direction === 'up') {
        table.insert({
          name: migrationName,
          migration_time: Date.now
        });
      } else {
        table.where({name: migrationName}).del();
      }
    };
  }

});

module.exports = Migration;