var Entries = new ReactiveVar([]);

Template.search.events({
  "click #search-button": function(event) {
    var searchText = $('#search-box').val();
    getEntries(searchText);
  },

  "keyup #search-box": _.throttle(function(ev) {
    var searchText = $('#search-box').val();
    getEntries(searchText);
  }, 1000)
});

Template.search.helpers({
  entries: function() {
    return Entries.get();
  },

  entryCount: function() {
    return Entries.get().length;
  }
});

Template.search.rendered = function() {
  getEntries('');
};

function getEntries(searchText) {
  Meteor.call('getUsers', searchText, function(err, searchText) {
    if(err) {
      throw err;
    } else {
      Entries.set(searchText);
    }
  });
}
