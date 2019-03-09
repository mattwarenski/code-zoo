

module.exports =  {

  "onEdit" : function(levelName, config){
    console.log("edit got levelName", levelName, config) 
  },

  "onNew" : function(levelName, config){
    console.log("new got levelName", levelName, config) 
  },

  "onArchive" : function(levelName, config){
    console.log("archive levelName", levelName, config) 
  },

  "onSwitch" : function(levelName, config){
    console.log("switch levelName", levelName, config) 
  }
  
}
