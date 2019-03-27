const Plugin = require('./Plugin.js');
const util = require('../util.js')
const childProcess = require("child_process");
const path = require('path');
const configParser = require("../util/config-parser.js")

class CodeZooPlugin extends Plugin{

  async runCommand(commandObj){
    return configParser.createNew(commandObj.class, commandObj);
  }

  async onNew(levelName, previousLevel){
    if(this.config.instances){
      for(var i = 0; i < this.config.instances.length; i++){
        const instance = this.config.instances[i];
        await this.runCommand(instance);
      }
    } else {
      await this.runCommand(this.config);
    }
  }

}

module.exports = CodeZooPlugin;
