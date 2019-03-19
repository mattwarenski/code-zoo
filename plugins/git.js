const childProcess = require("child_process");
const inquirer = require('inquirer');
const util = require('../util.js')
const Plugin = require('./Plugin.js');


class GitPlugin extends Plugin{

  //"validate" : function(config){
    //if(!config.projectDir){
      //throw new Error("projectDir must be defined") 
    //} 

    ////todo validate that it is a git directory
  //}

  async onEdit(levelName, previousLevel){
    await this.runGitCommand(`branch -m ${previousLevel} ${levelName}`)
  };

  async onNew(levelName, previousLevel){
    if(await this.branchExists(levelName)){
      util.logStep("Branch already exists in git");
      await this.runGitCommand(`checkout ${levelName}`)
      return;
    }
    if(this.config.parentBranch){
      util.logStep("Branching from parent branch " + this.config.parentBranch)
      const stashAnswer = await this.handleStash(previousLevel); 

      if(stashAnswer === "Abort"){
        return; 
      }

      await this.runGitCommand(`checkout ${this.config.parentBranch}`)
      try{
        if(await this.runGitCommand(`remote -v`))
          await this.runGitCommand(`pull`)
      } catch(e){
        util.logStep(`Unable to pull branch ${this.config.parentBranch}`, e) 
      }
    }
    
    await this.runGitCommand('checkout -b ' + levelName)
  }

  async onArchive(levelName){
    console.log("archive levelName", levelName) 
    //TODO: prompt remove branch 
  }

  async onSwitch(levelName, previousLevel){

    if(!await this.branchExists(levelName)){
      const answer = await util.confirmation("Branch is not currently tracked by git. Create branch?")
      if(answer.answer){
        await this.runGitCommand(`checkout -b ${levelName}`) 
      }
    }
    const stashAnswer = await this.handleStash(previousLevel);

    if(stashAnswer === "Abort"){
      return; 
    }

    util.logStep("switching to branch " + levelName); 
    await this.runGitCommand(`checkout ${levelName}`)

    if(stashAnswer === "Carry"){
      await this.runGitCommand(`stash pop`) 
    }

    await this.handleUnstash(levelName);

  }

  async branchExists(branchName)
  {
    let output = await this.runGitCommand("for-each-ref --format='%(refname)' 'refs/heads/*'", this.config, true);

      const branches = (output || "")
      .split("\n")
      .map(ref => ref.substring("refs/heads/".length))
      .filter(a => a) || [];

    return !!branches.find(branch => branch === branchName)

  }

  runGitCommand(command, noLog){
    return new Promise((resolve, reject) => {
      if(!noLog){
        util.logStep(`git ${command}`);
      }
      const props = {"cwd" : this.config.projectDir, "encoding" : 'utf-8'};
      childProcess.exec(`git ${command}`, props, (error, stdout, stderr) => {
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

  getStashKey(branch, carry){
    return `cz-stash-${branch}${carry ? "-carry" : ""}`;
  }

  async handleUnstash(branchName){
    const branchStash = new String(await this.runGitCommand("--no-pager stash list", true))
                       .split('\n')
                       .filter(p => p)
                       .map(p => p.split(":"))
                       .find(a => a[2].trim() === this.getStashKey(branchName))

    if(branchStash){
      const indexMatch = branchStash[0].match(/stash@\{([\d+])\}/);
      util.logStep("Popping previous branch changes")
      await this.runGitCommand(`stash pop --index ${indexMatch[1]}`) 
    }

  }

  async handleStash(branchName){
      const hasChanges = await this.runGitCommand("status --porcelain", true)

      if(hasChanges){
        await this.runGitCommand("status");
        const response = await inquirer.prompt([
          {
            name : 'answer', 
            type : 'list', 
            choices : ['Carry', 'Stash', 'Abort'],
            message : 'Branch has changes. What do you want to do?'
          } 
        ]);

        if(response.answer === 'Carry'){
          await this.runGitCommand(`stash push -u -m '${this.getStashKey(branchName, true)}'`);  
        } else if(response.answer === 'Stash'){
          await this.runGitCommand(`stash push -u -m '${this.getStashKey(branchName)}'`);  
        } 

        return response.answer; 
      } 

      return "nochanges";
  }

}

module.exports = GitPlugin;
