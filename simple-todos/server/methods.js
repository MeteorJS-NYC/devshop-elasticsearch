"use strict";

var ES = new ElasticSearch();

Meteor.methods({

  /**
   * Anyone can create a user
   */
  addUser: function(name, phoneNo) {
    Accounts.createUser({
      username: name,
      profile: {
        phoneNo: phoneNo
      }
     });
  },

  /**
   * The world's most insecure update function.
   */
  updateUser: function(id, userData) {
    var update = {$set: userData};

    console.log("[updateUser]", id, userData, update);

    Meteor.users.update({_id: id}, update);
  },


  getUsers: function(searchText) {
    console.log("[getUsers]", searchText);

    var lastWord = searchText.trim().split(" ").splice(-1)[0];
    var query = {
      "bool": {
        "must": [
          {
            "bool": {
              "should": [
                {"match": {"username": {"query": searchText}}},
                {"prefix": {"name": lastWord}}
              ]
            }
          }
        ],
        "should": [
          {"match_phrase_prefix": {"username": {"query": searchText, slop: 5}}}
        ]
      }
    };

    var result = ES.EsClient.search({
      index: "myindex",
      type: "phonebook",
      body: {
        query: query
      }
    });

    return result.hits.hits.map(function(doc) {
      return doc._source;
    });
  }

});
