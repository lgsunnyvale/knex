var _    = require('underscore');
var when = require('when');

// The new migration we're performing.
// Takes a `config` object, which has the name
// of the current migration (`main` if not otherwise specified)
var Migration = function(Instance, config) {
  this.Knex   = Instance;
  this.config = _.extend({
    type:      'db',
    tableName: 'migrations',
    directory: null,
    filepath:  null
  }, config);
};

_.extend(Migration.prototype, {

  // Initializes the migration, by creating the proper migration
  // file or database table, depending on the migration config settings.
  initialize: function() {
    var self = this;
    var type = _.result(this.config, type);
    if (type === 'db') {
      var tableName = _.result(this.config, 'tableName');
      return this.Knex.Schema.hasTable(tableName, null, function() {
        return self.Knex.Schema.createTable(tableName, function(t) {
          t.increments();
          t.string('direction');
          t.string('name');
          t.dateTime('migration_time');
        });
      }).then(function() {
        return 'Migrations Initialized';
      });
    } else {
      var filepath = _.result(this.config, 'filepath');
      var fs = require('fs');
      var dfd = when.defer();
      fs.exists(filepath, function(exists) {
        if (exists) {
          dfd.resolve('Migrations Initialized');
        } else {
          fs.writeFile(filepath, '', function(err) {
            if (err) return dfd.reject(err);
            dfd.resolve('Migrations Initialized');
          });
        }
      });
      return dfd.promise;
    }
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
    require('fs').readDir(_.result(this.config, 'migrationsDir'), function(err, resp) {
      dfd.resolve(resp);
    });
    return dfd.promise;
  },

  // Lists all migrations that have been completed for the current db, as an array.
  listCompleted: function() {
    if (this.config.type === 'db') {
      return new this.Knex(this.config.table).orderBy('id').select('name');
    } else {
      var dfd = when.defer();
      require('fs').readFile(_.result(this.config, 'filename'), function(err, resp) {
        if (err) return dfd.reject(err);
        dfd.resolve(resp.toString().split('\n'));
      });
      return dfd.promise;
    }
  },

  // Migrate to a specific version
  to: function(version) {
    var self = this;
    return when.all([this.listAll(), this.listCompleted()].spread(function(all, completed) {
      if (!version) throw new Error('You must specify a version to migrate to, or "latest"');
      var going = 'up', todos;

      // If we're going to the latest version, only use what's remaining.
      if (version === 'latest') {
        todos = all.slice(_.indexOf(all, completed.pop(1)));
      } else {

        // Otherwise, check whether the migration is in one array or another
        var index = _.indexOf(completed, version);

        if (index !== -1) {
          todos = completed.slice(index + 1);
          going = 'down';
        } else {
          index = _.indexOf(all, version);
          if (index === -1) throw new Error('Invalid migration name: ' + version);
          todos = completed.slice(completed.length, index + 1);
        }
      }

      // Ensure all migrations are good to go.
      return when.all(_.map(todos, function(filename) {
        var migration = require(self.config.directory + '/' + filename);
        if (!_.isFunction(migration.up) || !_.isFunction(migration.down)) {
          throw new Error('Migration must define both an "up" and "down" method');
        }
        return migration;
      })).then(function(migrations) {

        // Then run them one by one.
        return _.reduce(migrations, function(memo, file, index) {
          return memo.then(function() {
            return file[going](self.Knex, when).then(_.bind(self._logMigration(going, todos[index]), self));
          });
        }, when(1));

      });

    }));
  },

  // Write the currently completed migration to either the filesystem or the
  // database table speficied in the configuration.
  _logMigration: function(direction, migrationName) {
    return function() {
      var Knex = this.Knex;
      if (_.result(this.config, 'type') === 'db') {
        return Knex(_.result(this.config, 'tableName')).insert({
          name: migrationName,
          direction: direction,
          migration_time: Date.now
        });
      } else {
        var dfd = when.defer();
        require('fs').writeFile(_.result(this.config, 'filepath'), data, function() {

        });
        return dfd.promise;
      }
    };
  }

});

module.exports = Migration;