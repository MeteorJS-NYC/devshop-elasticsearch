var faker = Meteor.npmRequire('faker');
var noOfDocs = 10000;

/*
if(!Entries.findOne()) {
  console.log("Inserting %d dummy phone book entries. Please wait....", noOfDocs);
  for(var lc=0; lc<noOfDocs; lc++) {
    if(lc > 0 && lc % 1000 == 0) {
      console.log("  added %d entries.", lc);
    }
    Meteor.call('addEntry', faker.Name.findName(), faker.PhoneNumber.phoneNumber());
  }
  console.log("Completed!");
}
*/