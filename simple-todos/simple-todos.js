Tasks = new Mongo.Collection("tasks");
var Entries = new ReactiveVar([]);

Entries = new Meteor.Collection('entries');

// loading the npm module
ElasticSearch = Meteor.npmRequire('elasticsearch');

// create the client
EsClientSource = new ElasticSearch.Client({
  host: 'localhost:9200'
});

// make it fiber aware
EsClient = Async.wrap(EsClientSource, ['index', 'search']);





if (Meteor.isServer) {
  // This code only runs on the server
  // Only publish tasks that are public or belong to the current user
  Meteor.publish("tasks", function () {
    return Tasks.find({
      $or: [
        { private: {$ne: true} },
        { owner: this.userId }
      ]
    });
  });
}

if (Meteor.isClient) {
  // This code only runs on the client
  Meteor.subscribe("tasks");
  AddEntry = function(name, phoneNo) {
    Meteor.call('addEntry', name, phoneNo);
  };

  Template.app.events({
    "click #search-button": function(event) {
      var searchText = $('#search-box').val();
      getEntries(searchText);
    },

    "keyup #search-box": _.throttle(function(ev) {
      var searchText = $('#search-box').val();
      getEntries(searchText);
    }, 1000)
  });

  Template.app.helpers({
    entries: function() {
      return Entries.get();
    },

    entryCount: function() {
      return Entries.get().length;
    }
  });

  Template.app.rendered = function() {
    getEntries('');
  };


  Template.body.helpers({
    tasks: function () {
      if (Session.get("hideCompleted")) {
        // If hide completed is checked, filter tasks
        return Tasks.find({checked: {$ne: true}}, {sort: {createdAt: -1}});
      } else {
        // Otherwise, return all of the tasks
        return Tasks.find({}, {sort: {createdAt: -1}});
      }
    },
    hideCompleted: function () {
      return Session.get("hideCompleted");
    },
    incompleteCount: function () {
      return Tasks.find({checked: {$ne: true}}).count();
    }
  });

  Template.body.events({
    "submit .new-task": function (event) {
      // Prevent default browser form submit
      event.preventDefault();

      // Get value from form element
      var text = event.target.text.value;

      // Insert a task into the collection
      Meteor.call("addTask", text);

      // Clear form
      event.target.text.value = "";
    },
    "change .hide-completed input": function (event) {
      Session.set("hideCompleted", event.target.checked);
    }
  });

  Template.task.helpers({
    isOwner: function () {
      return this.owner === Meteor.userId();
    }
  });

  Template.task.events({
    "click .toggle-checked": function () {
      // Set the checked property to the opposite of its current value
      Meteor.call("setChecked", this._id, ! this.checked);
    },
    "click .delete": function () {
      Meteor.call("deleteTask", this._id);
    },
    "click .toggle-private": function () {
      Meteor.call("setPrivate", this._id, ! this.private);
    }
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });

  function getEntries(searchText) { 
    Meteor.call('getEntries', searchText, function(err, searchText) {
      if(err) {
        throw err;
      } else {
        Entries.set(searchText);
      }
    }); 
  }
}

Meteor.methods({
  addTask: function (text) {
    // Make sure the user is logged in before inserting a task
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Tasks.insert({
      text: text,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username
    });
  },
  deleteTask: function (taskId) {
    var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can delete it
      throw new Meteor.Error("not-authorized");
    }

    Tasks.remove(taskId);
  },
  setChecked: function (taskId, setChecked) {
    var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can check it off
      throw new Meteor.Error("not-authorized");
    }

    Tasks.update(taskId, { $set: { checked: setChecked} });
  },
  setPrivate: function (taskId, setToPrivate) {
    var task = Tasks.findOne(taskId);

    // Make sure only the task owner can make a task private
    if (task.owner !== Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Tasks.update(taskId, { $set: { private: setToPrivate } });
  }
});

// For ElasticSearch
Meteor.methods({
  addEntry: function(name, phoneNo) {
//    Entries.insert({name: name, phoneNo: phoneNo});
      var id = Entries.insert({name: name, phoneNo: phoneNo});

      // create a document Index Elastic Search
      EsClient.index({
        index: "myindex",
        type: "phonebook",
        id: id,
        body: {
          name: name,
          phoneNo: phoneNo
        }
      });
  }
});

/* Uses Mongo DB for search
Meteor.methods({
  getEntries: function(searchText) {
    var regExp = new RegExp(searchText, 'i');
    return Entries.find({
      name: regExp
    }, {sort: {name: 1}, limit:20}).fetch();
  }
});
**/

Meteor.methods({
  getEntries: function(searchText) {
/** No partial Matching
    // the the result from Elastic Search
    var result =  EsClient.search({
      index: "myindex",
      type: "phonebook",
      body: {
        query: {
          match: {
            name: searchText
          }
        }
      }
    });
**/

    var lastWord = searchText.trim().split(" ").splice(-1)[0];
    var query = {
      "bool": {
        "must": [
          {
            "bool": {
              "should": [
                {"match": {"name": {"query": searchText}}},
                {"prefix": {"name": lastWord}}
              ]
            }
          }
        ],
        "should": [
          {"match_phrase_prefix": {"name": {"query": searchText, slop: 5}}}
        ]
      }
    };

    var result =  EsClient.search({
      index: "myindex",
      type: "phonebook",
      body: {
        query: query
      }
    });

    // pick actual set of data we need to send
    return result.hits.hits.map(function(doc) {
      return doc._source;
    });
  }
});



