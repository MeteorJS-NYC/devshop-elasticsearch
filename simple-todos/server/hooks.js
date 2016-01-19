"use strict";

// remember the original collection functions
var _update = Meteor.users.update,
    _insert = Meteor.users.insert;

var FIELDS_TO_INCLUDE = ['username', 'profile'];

var ES = new ElasticSearch({
  index: "myindex",
  type:  "phonebook"
});


//////////////////////////////////////////////////////////////////////
// insert
//
Meteor.users.insert = function (doc) {
  console.log("[Meteor.users.insert.hook]", doc)

  _insert.call(this, doc)

  ES.insert(doc, {fieldsToInclude: FIELDS_TO_INCLUDE});

  console.log("[Meteor.users.insert.hook] ...important third-party REST call");
};



//////////////////////////////////////////////////////////////////////
// update
//
Meteor.users.update = function (selector, mutator, options) {
  console.log("[Meteor.users.update.hook]", selector, mutator, options)

  _update.call(this, selector, mutator, options)

  updateUsersInElasticSearch(selector, mutator, options)

  console.log("[Meteor.users.update.hook] ...important third-party REST call");
};

function updateUsersInElasticSearch (selector, mutator, options) {
  options = options || {}

  options.fieldsToInclude = FIELDS_TO_INCLUDE;
  options.sourceCollection = Meteor.users;

  ES.partialUpdate (selector, mutator, options);
}
