

class Plugin {

  constructor(config){
    this.onNew = this.onNew.bind(this); 
    this.onEdit = this.onEdit.bind(this); 
    this.onArchive = this.onArchive.bind(this); 
    this.onSwitch = this.onSwitch.bind(this); 
    this.onDelete = this.onDelete.bind(this); 
    this.onParentSwitch = this.onParentSwitch.bind(this); 

    this.config = config;
  }

  async onNew(levelName, previousLevel){

  }

  async onEdit(levelName, previousLevel){

  }

  async onArchive(levelName){

  }

  async onSwitch(levelName, previousLevel){

  }

  async onDelete(levelName){
  
  }

  async onParentSwitch(levelName, previousLevel){
  
  }
}


module.exports = Plugin;
