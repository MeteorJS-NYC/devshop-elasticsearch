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
  console.log("[Meteor.users.insert.hook]", doc);

  try {
    _insert.call(this, doc);

    try {
      ES.insert(doc, {fieldsToInclude: FIELDS_TO_INCLUDE});
    } catch (ex) {
      console.log("[Meteor.users.insert.hook] ElasticSearch Error: ", ex);
    }

    console.log("[Meteor.users.insert.hook] ...important third-party REST call");

  } catch (ex) {
    console.log("[Meteor.users.insert.hook] MongoDB Error: ", ex);
    throw ex;
  }
};



//////////////////////////////////////////////////////////////////////
// update
//
Meteor.users.update = function (selector, mutator, options) {
  console.log("[Meteor.users.update.hook]", selector, mutator, options);

  try {
    _update.call(this, selector, mutator, options);

    try {
      updateUsersInElasticSearch(selector, mutator, options);
    } catch (ex) {
      console.log("[Meteor.users.update.hook] ElasticSearch Error: ", ex);
    }

    console.log("[Meteor.users.update.hook] ...important third-party REST call");

  } catch (ex) {
    console.log("[Meteor.users.update.hook] MongoDB Error: ", ex);
    throw ex;
  }
};

function updateUsersInElasticSearch (selector, mutator, options) {
  options = options || {};

  options.fieldsToInclude = FIELDS_TO_INCLUDE;
  options.sourceCollection = Meteor.users;

  ES.partialUpdate (selector, mutator, options);
}
