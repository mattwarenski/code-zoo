const fs = require('fs');
const util = require('../util.js');
const path = require('path');
const Plugin = require('./Plugin.js');

class SymlinkPlugin extends Plugin {

  constructor(config){
    super(config);
    this.switchLink = this.switchLink.bind(this);
  }

  switchLink(levelName){
    const levelDir = path.join(this.config.containerDir, levelName.replace(" ", "_"))    
    //todo at some point this will have to check the archives as well
    if(!fs.existsSync(levelDir)) {
      util.logStep("Directory does not exist. Creating: " + levelDir)
      fs.mkdirSync(levelDir)
    }

    if(fs.existsSync(this.config.link)) {
      const stat = fs.lstatSync(this.config.link);
      if(!stat.isSymbolicLink()){
        throw new Error(this.config.link + " exists and is not a symlink. Not touchin' that.")
      }
      fs.unlinkSync(this.config.link);
      util.logStep("Symlink " + this.config.link + " updated to " + levelDir)
    }

    fs.symlinkSync(levelDir, this.config.link)
  }

  async onSwitch(levelName, previousLevel){
    this.switchLink(levelName) 
  }
  

  async onNew(levelName, previousLevel){
    this.switchLink(levelName)
  }

}

module.exports = SymlinkPlugin;
