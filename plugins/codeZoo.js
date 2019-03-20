const Plugin = require('./Plugin.js');
const util = require('../util.js')
const childProcess = require("child_process");
const path = require('path');

class CodeZooPlugin extends Plugin{

  async onNew(levelName, previousLevel){
    const command =  `new ${this.config.class} -n ${this.config.name} -p '${JSON.stringify(this.config.plugins)}' --parent ${this.config.parent}`
    
    this.runCodeZooCommand(command);
  }

  runCodeZooCommand(command, noLog){
    return new Promise((resolve, reject) => {
      if(!noLog){
        util.logStep(`codezoo ${command}`);
      }
      const props = {"cwd" : path.resolve(__dirname, '..'), "encoding" : 'utf-8'};
      childProcess.exec(`node codezoo.js ${command}`, props, (error, stdout, stderr) => {
        if(error){
          reject(error);
        } else {
          if(!noLog)
            util.logStep(stdout);  
          resolve(stdout ? stdout : "");
        }
      })
    })

  }
}

module.exports = CodeZooPlugin;
