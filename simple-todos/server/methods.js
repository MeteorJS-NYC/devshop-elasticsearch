"use strict";

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
  }

});
