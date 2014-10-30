"use strict";

module.exports = {
  up: function(migration, DataTypes, done) {
  	migration.addColumn(
  		'Posts',
  		'UserId',
  		DataTypes.INTEGER
		)
 
    done();
  },

  down: function(migration, DataTypes, done) {
    migration.removeColumn('Posts', 'UserId')
    done();
  }
};
